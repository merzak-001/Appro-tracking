import { getPool } from '../src/db/connection.js';

async function checkOrders() {
  const pool = await getPool();
  const ordersResult = await pool.request().query(`
    SELECT ID, N_Order, Supplier_Name, Etablir_Par, Objet_De_Commande, Status, Date_BC, Created_At 
    FROM dbo.Local_Order
  `);
  console.log('Total Local Orders in DB:', ordersResult.recordset.length);
  console.log('\nOrders with status containing partiel / livraison:');
  ordersResult.recordset.forEach(o => {
    console.log(`- ID: ${o.ID} | N_Order: "${o.N_Order}" | Status: "${o.Status}" | Supplier: "${o.Supplier_Name || o.Etablir_Par}" | Objet: "${o.Objet_De_Commande}"`);
  });

  const linesResult = await pool.request().query(`
    SELECT ID, Order_ID, Designation, Qty, Unit_Price, Unite
    FROM dbo.Local_Order_Line
  `);
  console.log('\nTotal Order Lines in DB:', linesResult.recordset.length);
  console.log('Sample Lines:');
  linesResult.recordset.slice(0, 10).forEach(l => {
    console.log(`- Line ID: ${l.ID} | Order_ID: ${l.Order_ID} | Designation: "${l.Designation}" | Qty: ${l.Qty} | Unite: ${l.Unite}`);
  });

  process.exit(0);
}

checkOrders().catch(err => {
  console.error(err);
  process.exit(1);
});
