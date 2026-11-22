const sql = require('mssql/msnodesqlv8');

async function test() {
  try {
    const connectionString = 'Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=ProcurementDB;Trusted_Connection=yes;';
    const pool = await new sql.ConnectionPool({ connectionString }).connect();
    const res = await pool.request().query("SELECT Mois, Annee, Qte_Entree, Qte_Sortie, Qte_Stock, Val_Entree, Val_Stock FROM dbo.Production_Monthly_MCBA WHERE Code_Article = '01021167' OR Designation LIKE '%L170%' ORDER BY Annee, Mois_Num");
    console.log('Records for 01021167 / L170:', res.recordset.length);
    console.log(JSON.stringify(res.recordset, null, 2));
    await pool.close();
  } catch (err) {
    console.error('SQL Error:', err);
  }
}

test();
