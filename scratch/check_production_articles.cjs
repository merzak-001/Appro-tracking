const dotenv = require('dotenv');
dotenv.config();
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
  database: process.env.DB_NAME || 'ProcurementDB',
  options: {
    trustServerCertificate: true,
    trustedConnection: true,
  },
  driver: 'msnodesqlv8',
};

async function test() {
  try {
    const pool = await new sql.ConnectionPool(config).connect();
    const res = await pool.request().query('SELECT DISTINCT code_article, designation, famille_diametre FROM ProductionMonthlyRecords ORDER BY designation');
    console.log('Production Articles Count:', res.recordset.length);
    console.log(JSON.stringify(res.recordset, null, 2));
    pool.close();
  } catch (err) {
    console.error('SQL Error:', err);
  }
}

test();
