import sql from 'mssql/msnodesqlv8.js';

const config = {
  connectionString: 'Driver={SQL Server Native Client 11.0};Server=localhost\\SQLEXPRESS;Database=ProcurementDB;Trusted_Connection=yes;',
  driver: 'msnodesqlv8'
};

async function run() {
  try {
    const pool = await new sql.ConnectionPool(config).connect();
    console.log('Connected to DB');

    // 1. Check columns of Local_Order
    const cols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Local_Order'");
    console.log('Local_Order columns:', cols.recordset.map(r => r.COLUMN_NAME));

    // 2. Check check constraints on Local_Delivery
    const constraints = await pool.request().query("SELECT name, definition FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.Local_Delivery')");
    console.log('Local_Delivery check constraints:', constraints.recordset);

    for (const c of constraints.recordset) {
      console.log(`Dropping check constraint: ${c.name}`);
      await pool.request().query(`ALTER TABLE dbo.Local_Delivery DROP CONSTRAINT [${c.name}]`);
    }

    console.log('Done fixing constraints!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
