import sql from 'mssql/msnodesqlv8.js';

async function checkLocalTables() {
  const localConnStr = `Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=ProcurementDB;Trusted_Connection=yes;`;
  try {
    const pool = await new sql.ConnectionPool({
      connectionString: localConnStr,
      connectionTimeout: 8000,
      requestTimeout: 10000,
    }).connect();
    
    console.log('Connected to local ProcurementDB!');
    const tablesRes = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = 'ProcurementDB'
      ORDER BY TABLE_NAME
    `);
    
    console.log('Local Tables Found:');
    for (const row of tablesRes.recordset) {
      const tableName = row.TABLE_NAME;
      const countRes = await pool.request().query(`SELECT COUNT(*) as cnt FROM dbo.[${tableName}]`);
      console.log(` - ${tableName}: ${countRes.recordset[0].cnt} rows`);
    }
    
    await pool.close();
  } catch (err) {
    console.error('Error inspecting local DB:', err.message);
  }
}

checkLocalTables();
