const sql = require('mssql/msnodesqlv8');
const fs = require('fs');
const path = require('path');

async function resetImportance() {
  const pool = await new sql.ConnectionPool({
    connectionString: 'Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=ProcurementDB;Trusted_Connection=yes;'
  }).connect();

  await pool.request().query('UPDATE dbo.Stock_Item SET Is_Important = 0');
  console.log('✅ All items in SQL Server have Is_Important reset to 0 (ready for manual user tagging).');
  await pool.close();

  const storePath = path.join(__dirname, '..', '.data_store.json');
  if (fs.existsSync(storePath)) {
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    if (store.stockItems) {
      store.stockItems.forEach(i => i.is_important = false);
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
      console.log('✅ JSON store mirror reset as well.');
    }
  }
}

resetImportance().catch(console.error);
