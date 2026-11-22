import sql from 'mssql/msnodesqlv8.js';

async function testRemoteConnection() {
  const configs = [
    // Driver={SQL Server}
    `Driver={SQL Server};Server=192.168.1.253;Database=master;Uid=sa;Pwd=0000;`,
    // Driver={ODBC Driver 17 for SQL Server}
    `Driver={ODBC Driver 17 for SQL Server};Server=192.168.1.253;Database=master;Uid=sa;Pwd=0000;TrustServerCertificate=yes;`,
    // Driver={SQL Server Native Client 11.0}
    `Driver={SQL Server Native Client 11.0};Server=192.168.1.253;Database=master;Uid=sa;Pwd=0000;`,
  ];

  for (const connStr of configs) {
    console.log('Testing connection string:', connStr);
    try {
      const pool = await new sql.ConnectionPool({
        connectionString: connStr,
        connectionTimeout: 8000,
        requestTimeout: 10000,
      }).connect();
      console.log('SUCCESS! Connected to remote SQL Server 192.168.1.253!');
      const res = await pool.request().query('SELECT @@VERSION as version, DB_NAME() as db');
      console.log('Remote SQL Server Info:', res.recordset[0]);
      await pool.close();
      return connStr;
    } catch (err) {
      console.error('Connection failed:', err.message);
    }
  }
  return null;
}

testRemoteConnection();
