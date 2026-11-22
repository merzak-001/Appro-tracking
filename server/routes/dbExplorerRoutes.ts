import { Router } from 'express';
import { getPool, isSqlServerConnected } from '../../src/db/connection';
import { getStore } from '../config/store';

export const dbExplorerRoutes = Router();

// GET /api/db-explorer/tables -> Returns list of tables and row counts
dbExplorerRoutes.get('/tables', async (req, res) => {
  try {
    const isSql = isSqlServerConnected();
    const pool = getPool();

    if (isSql && pool) {
      const result = await pool.request().query(`
        SELECT 
          t.name AS table_name,
          s.name AS schema_name,
          p.rows AS row_count
        FROM sys.tables t
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        INNER JOIN sys.indexes i ON t.object_id = i.object_id
        INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
        WHERE i.index_id < 2 AND t.is_ms_shipped = 0
        ORDER BY t.name
      `);

      return res.json({
        engine: 'Microsoft SQL Server (localhost\\SQLEXPRESS)',
        database: 'ProcurementDB',
        isConnected: true,
        tables: result.recordset,
      });
    }

    // JSON Store fallback counts
    const store = getStore();
    const tables = [
      { schema_name: 'dbo', table_name: 'Capex_Investment', row_count: store.capexInvestments?.length || 0 },
      { schema_name: 'dbo', table_name: 'Fournisseur', row_count: store.suppliers?.length || 0 },
      { schema_name: 'dbo', table_name: 'Local_Order', row_count: store.localOrders?.length || 0 },
      { schema_name: 'dbo', table_name: 'Local_Delivery', row_count: store.localDeliveries?.length || 0 },
      { schema_name: 'dbo', table_name: 'Foreign_Order', row_count: store.foreignOrders?.length || 0 },
      { schema_name: 'dbo', table_name: 'Foreign_Expedition', row_count: store.foreignExpeditions?.length || 0 },
      { schema_name: 'dbo', table_name: 'Financial_Document', row_count: store.financialDocuments?.length || 0 },
      { schema_name: 'dbo', table_name: 'Users', row_count: store.users?.length || 0 },
    ];

    return res.json({
      engine: 'JSON Data Store (.data_store.json)',
      database: 'LocalStore',
      isConnected: false,
      tables,
    });
  } catch (err) {
    console.error('DB Explorer tables error:', err);
    return res.status(500).json({ error: 'Erreur lors de l\'exploration des tables SQL.' });
  }
});

// GET /api/db-explorer/data?table=Capex_Investment -> Returns table columns and rows
dbExplorerRoutes.get('/data', async (req, res) => {
  try {
    const tableName = (req.query.table as string) || 'Capex_Investment';
    const isSql = isSqlServerConnected();
    const pool = getPool();

    // Whitelist valid tables to prevent SQL injection
    const validTables: { [key: string]: string } = {
      'Capex_Investment': 'dbo.Capex_Investment',
      'Fournisseur': 'dbo.Fournisseur',
      'Local_Order': 'dbo.Local_Order',
      'Local_Order_Line': 'dbo.Local_Order_Line',
      'Local_Delivery': 'dbo.Local_Delivery',
      'Foreign_Order': 'dbo.Foreign_Order',
      'Foreign_Order_Line': 'dbo.Foreign_Order_Line',
      'Foreign_Expedition': 'dbo.Foreign_Expedition',
      'Financial_Document': 'dbo.Financial_Document',
      'Users': 'dbo.Users',
    };

    const targetTable = validTables[tableName] || 'dbo.Capex_Investment';

    if (isSql && pool) {
      // Get Columns Metadata
      const colResult = await pool.request().query(`
        SELECT 
          COLUMN_NAME as name,
          DATA_TYPE as type,
          IS_NULLABLE as nullable
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
        ORDER BY ORDINAL_POSITION
      `);

      // Get Table Rows
      const rowResult = await pool.request().query(`
        SELECT TOP 100 * FROM ${targetTable} ORDER BY 1 DESC
      `);

      return res.json({
        table_name: tableName,
        full_table_name: targetTable,
        columns: colResult.recordset,
        rows: rowResult.recordset,
        total_rows: rowResult.recordset.length,
        engine: 'Microsoft SQL Server',
      });
    }

    // Store Fallback
    const store = getStore();
    let rows: any[] = [];
    if (tableName === 'Capex_Investment') rows = store.capexInvestments || [];
    else if (tableName === 'Fournisseur') rows = store.suppliers || [];
    else if (tableName === 'Local_Order') rows = store.localOrders || [];
    else if (tableName === 'Local_Delivery') rows = store.localDeliveries || [];
    else if (tableName === 'Foreign_Order') rows = store.foreignOrders || [];
    else if (tableName === 'Foreign_Expedition') rows = store.foreignExpeditions || [];
    else if (tableName === 'Financial_Document') rows = store.financialDocuments || [];
    else if (tableName === 'Users') rows = store.users || [];

    const columns = rows.length > 0
      ? Object.keys(rows[0]).map((key) => ({ name: key, type: typeof rows[0][key], nullable: 'YES' }))
      : [];

    return res.json({
      table_name: tableName,
      full_table_name: targetTable,
      columns,
      rows,
      total_rows: rows.length,
      engine: 'JSON Data Store',
    });
  } catch (err) {
    console.error('DB Explorer data error:', err);
    return res.status(500).json({ error: 'Erreur lors de la lecture des données SQL.' });
  }
});
