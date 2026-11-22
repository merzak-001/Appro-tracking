async function getOrders() {
  const res = await fetch('http://localhost:5173/api/local-orders');
  const data = await res.json();
  console.log('Total Local Orders:', data.length);
  data.forEach(o => {
    console.log(`Order ID: ${o.id} | N_Order: "${o.n_order}" | Status: "${o.status}" | Supplier: "${o.supplier_name || o.etablir_par}" | Lines: ${o.lines ? o.lines.length : 0}`);
    if (o.lines) {
      o.lines.forEach(l => console.log(`   - Line: "${l.designation}" | Qty: ${l.qty} | Price: ${l.unit_price} ${l.unite}`));
    }
  });
}

getOrders().catch(console.error);
