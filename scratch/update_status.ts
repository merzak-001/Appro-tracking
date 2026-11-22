import { initSqlServer, getPool } from '../src/db/connection.ts';

async function main() {
  try {
    await initSqlServer();
    const pool = getPool();
    if (pool) {
      const result = await pool.request().query(`UPDATE dbo.Local_Order SET Status = 'En cours' WHERE Status = 'En cours de livraison'`);
      console.log('Rows updated in SQL Server:', result.rowsAffected);
    }
  } catch (err) {
    console.error('Error updating:', err);
  }
  process.exit(0);
}

main();
