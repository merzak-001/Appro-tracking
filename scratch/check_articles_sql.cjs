const sql = require('mssql/msnodesqlv8');

async function test() {
  try {
    const connectionString = 'Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=ProcurementDB;Trusted_Connection=yes;';
    const pool = await new sql.ConnectionPool({ connectionString }).connect();
    const res = await pool.request().query('SELECT DISTINCT Code_Article, Designation, Famille_Diametre FROM dbo.Production_Monthly_MCBA ORDER BY Famille_Diametre, Designation');
    console.log('Production Articles in SQL DB:', res.recordset.length);
    res.recordset.forEach(r => {
      console.log(`- [${r.Famille_Diametre}] [${r.Code_Article}] ${r.Designation}`);
    });
    await pool.close();
  } catch (err) {
    console.error('SQL Error:', err);
  }
}

test();
