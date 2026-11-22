const sql = require('mssql/msnodesqlv8');

async function updateDb() {
  try {
    const connectionString = 'Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=ProcurementDB;Trusted_Connection=yes;';
    const pool = await new sql.ConnectionPool({ connectionString }).connect();
    
    // Update Famille_Diametre to 'DN 15 (Export)' for Compteur d'eau 420 015 L170 / 01021167
    const res = await pool.request().query(`
      UPDATE dbo.Production_Monthly_MCBA 
      SET Famille_Diametre = 'DN 15 (Export)' 
      WHERE Code_Article = '01021167' OR Designation LIKE '%L170%'
    `);
    console.log(`Updated ${res.rowsAffected[0]} records in dbo.Production_Monthly_MCBA to Famille_Diametre = 'DN 15 (Export)'`);

    // Also check if any existing budget row needs update or insertion
    const budgetRes = await pool.request().query(`
      SELECT * FROM dbo.Production_Budget_MCBA WHERE Famille_Diametre LIKE '%DN 15%' OR Famille_Diametre LIKE '%Export%'
    `);
    console.log('Current budget rows:', budgetRes.recordset);

    await pool.close();
  } catch (err) {
    console.error('Update SQL Error:', err);
  }
}

updateDb();
