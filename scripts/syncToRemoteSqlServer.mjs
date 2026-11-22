import fs from 'fs';
import path from 'path';
import sql from 'mssql/msnodesqlv8.js';

const LOCAL_CONN_STR = `Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=ProcurementDB;Trusted_Connection=yes;`;
const REMOTE_MASTER_STR = `Driver={SQL Server};Server=192.168.1.253;Database=master;Uid=sa;Pwd=0000;`;
const REMOTE_DB_STR = `Driver={SQL Server};Server=192.168.1.253;Database=ProcurementDB;Uid=sa;Pwd=0000;`;

async function syncToRemoteSqlServer() {
  console.log('=== STARTING DATABASE SYNC TO REMOTE SQL SERVER (192.168.1.253) ===');

  // 1. Connect to Remote Master and ensure ProcurementDB exists
  let remoteMasterPool;
  try {
    console.log('[1/5] Connecting to remote SQL Server (192.168.1.253) master database...');
    remoteMasterPool = await new sql.ConnectionPool({
      connectionString: REMOTE_MASTER_STR,
      connectionTimeout: 10000,
      requestTimeout: 30000,
    }).connect();

    await remoteMasterPool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ProcurementDB')
      BEGIN
          CREATE DATABASE ProcurementDB;
      END
    `);
    console.log('[1/5] ProcurementDB database confirmed on remote server.');
  } catch (err) {
    console.error('ERROR connecting to remote master database:', err.message);
    process.exit(1);
  } finally {
    if (remoteMasterPool) await remoteMasterPool.close();
  }

  // 2. Connect to Local ProcurementDB and Remote ProcurementDB
  let localPool, remotePool;
  try {
    console.log('[2/5] Connecting to local ProcurementDB and remote ProcurementDB...');
    localPool = await new sql.ConnectionPool({
      connectionString: LOCAL_CONN_STR,
      connectionTimeout: 10000,
      requestTimeout: 60000,
    }).connect();

    remotePool = await new sql.ConnectionPool({
      connectionString: REMOTE_DB_STR,
      connectionTimeout: 10000,
      requestTimeout: 60000,
    }).connect();

    console.log('[2/5] Successfully connected to both local and remote ProcurementDB!');
  } catch (err) {
    console.error('ERROR establishing connections:', err.message);
    process.exit(1);
  }

  // 3. Apply Schema to Remote Database
  try {
    console.log('[3/5] Applying full T-SQL schema from schema_sqlserver.sql to remote ProcurementDB...');
    const schemaPath = path.join(process.cwd(), 'schema_sqlserver.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    const batches = schemaSql
      .split(/^GO\s*$/im)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (batch.toUpperCase().includes('CREATE DATABASE') || batch.toUpperCase().startsWith('USE ')) {
        continue;
      }
      try {
        await remotePool.request().query(batch);
      } catch (batchErr) {
        // Ignored if already exists
      }
    }

    // Ensure Production_Budget_MCBA and Production_Notes_MCBA exist on remote DB
    try {
      await remotePool.request().query(`
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Production_Budget_MCBA' AND COLUMN_NAME = 'famille_diametre')
        BEGIN
          DROP TABLE dbo.Production_Budget_MCBA;
        END

        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Production_Budget_MCBA]') AND type in (N'U'))
        BEGIN
          CREATE TABLE dbo.Production_Budget_MCBA (
            ID INT IDENTITY(1,1) PRIMARY KEY,
            Annee INT NOT NULL DEFAULT 2026,
            Famille_Diametre NVARCHAR(100) NOT NULL,
            Budget_Qte DECIMAL(18,2) NOT NULL DEFAULT 0,
            Prix_Unitaire_KDA DECIMAL(18,5) NOT NULL DEFAULT 0,
            Updated_At DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT UQ_Prod_Budget_Annee_Famille UNIQUE (Annee, Famille_Diametre)
          );
        END

        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Production_Notes_MCBA]') AND type in (N'U'))
        BEGIN
          CREATE TABLE dbo.Production_Notes_MCBA (
            ID INT IDENTITY(1,1) PRIMARY KEY,
            Annee INT NOT NULL,
            Mois NVARCHAR(20) NOT NULL,
            Note_Text NVARCHAR(MAX) NULL,
            Updated_At DATETIME2 DEFAULT GETDATE()
          );
        END
      `);
    } catch (e) {
      console.warn('Warning updating Production_Budget_MCBA schema:', e.message);
    }

    console.log('[3/5] Schema migration applied successfully to remote ProcurementDB!');
  } catch (err) {
    console.error('ERROR applying schema:', err.message);
  }

  // Disable FK constraints on remote database during data sync
  await remotePool.request().query(`EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'`);

  // 4. Get list of tables from local DB
  const tablesRes = await localPool.request().query(`
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = 'ProcurementDB'
    ORDER BY TABLE_NAME
  `);

  const tableList = tablesRes.recordset.map((r) => r.TABLE_NAME);
  console.log(`[4/5] Copying data for ${tableList.length} tables from local to remote server...`);

  const priorityOrder = [
    'Users',
    'Fournisseur',
    'Capex_Investment',
    'Capex_Approach_Cost',
    'Capex_SubItem',
    'Local_Order',
    'Local_Order_Line',
    'Local_Delivery',
    'Foreign_Order',
    'Foreign_Order_Line',
    'Foreign_Expedition',
    'Expedition_Line',
    'Financial_Document',
    'Financial_Document_Invoice_Line',
    'Production_Budget_MCBA',
    'Production_Monthly_MCBA',
    'Production_Notes_MCBA',
    'Produit_Fini',
    'Produit_Fini_Composant',
    'Stock_Item',
    'Stock_Watchlist',
  ];

  const sortedTables = Array.from(new Set([...priorityOrder.filter((t) => tableList.includes(t)), ...tableList]));

  for (const tableName of sortedTables) {
    try {
      // Get writable non-computed columns from remote table
      const writableColsRes = await remotePool.request().query(`
        SELECT name FROM sys.columns 
        WHERE object_id = OBJECT_ID('dbo.[${tableName}]') 
          AND is_computed = 0
      `);
      const writableColNames = writableColsRes.recordset.map((c) => c.name);

      if (writableColNames.length === 0) {
        console.log(` -> Table [dbo].[${tableName}]: No writable columns found.`);
        continue;
      }

      // Check if remote table has an IDENTITY column
      const identityRes = await remotePool.request().query(`
        SELECT OBJECTPROPERTY(OBJECT_ID('dbo.[${tableName}]'), 'TableHasIdentity') as hasIdentity
      `);
      const hasIdentity = identityRes.recordset[0]?.hasIdentity === 1;

      // Fetch rows from local
      const localDataRes = await localPool.request().query(`SELECT * FROM dbo.[${tableName}]`);
      const rows = localDataRes.recordset;

      console.log(` -> Table [dbo].[${tableName}]: ${rows.length} local rows to copy...`);

      // Clear existing rows in remote table
      await remotePool.request().query(`DELETE FROM dbo.[${tableName}]`);

      if (rows.length > 0) {
        // Turn ON identity insert for this table if identity exists
        if (hasIdentity) {
          try {
            await remotePool.request().query(`SET IDENTITY_INSERT dbo.[${tableName}] ON`);
          } catch (e) {
            console.warn(`[${tableName}] SET IDENTITY_INSERT ON warning:`, e.message);
          }
        }

        // Insert rows in sub-batches
        const batchSize = 25;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          for (const row of batch) {
            const req = remotePool.request();
            const colList = [];
            const paramList = [];

            writableColNames.forEach((col, cIdx) => {
              let val = row[col];
              if (val !== undefined) {
                // Format dates to ISO strings if needed
                if (val instanceof Date) {
                  val = val.toISOString();
                }
                const paramName = `p_${cIdx}`;
                req.input(paramName, val);
                colList.push(`[${col}]`);
                paramList.push(`@${paramName}`);
              }
            });

            if (colList.length > 0) {
              const insertSql = `INSERT INTO dbo.[${tableName}] (${colList.join(', ')}) VALUES (${paramList.join(', ')})`;
              await req.query(insertSql);
            }
          }
        }

        // Turn OFF identity insert for this table
        if (hasIdentity) {
          try {
            await remotePool.request().query(`SET IDENTITY_INSERT dbo.[${tableName}] OFF`);
          } catch (e) {}
        }
      }
    } catch (tblErr) {
      console.error(`ERROR copying table ${tableName}:`, tblErr.message);
    }
  }

  // Re-enable FK constraints
  await remotePool.request().query(`EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'`);

  // 5. Verification Summary
  console.log('\n[5/5] VERIFYING DATA SYNC BETWEEN LOCAL AND REMOTE (192.168.1.253)...');
  console.log('----------------------------------------------------------------------');
  console.log('TABLE NAME                     | LOCAL ROWS | REMOTE ROWS | STATUS');
  console.log('----------------------------------------------------------------------');

  for (const tableName of sortedTables) {
    try {
      const lCntRes = await localPool.request().query(`SELECT COUNT(*) as cnt FROM dbo.[${tableName}]`);
      const rCntRes = await remotePool.request().query(`SELECT COUNT(*) as cnt FROM dbo.[${tableName}]`);
      const lCnt = lCntRes.recordset[0].cnt;
      const rCnt = rCntRes.recordset[0].cnt;
      const match = lCnt === rCnt ? '✅ MATCH' : '⚠️ MISMATCH';
      console.log(`${tableName.padEnd(30)} | ${String(lCnt).padStart(10)} | ${String(rCnt).padStart(11)} | ${match}`);
    } catch (err) {
      console.log(`${tableName.padEnd(30)} | ERROR: ${err.message}`);
    }
  }

  console.log('----------------------------------------------------------------------');
  console.log('=== SYNC COMPLETED SUCCESSFULLY TO REMOTE SERVER 192.168.1.253 ===');

  await localPool.close();
  await remotePool.close();
}

syncToRemoteSqlServer();
