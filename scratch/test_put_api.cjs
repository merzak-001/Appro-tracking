const http = require('http');

const data = JSON.stringify({
  n_order: '4500784551',
  etablir_par: 'SARL SLR',
  objet_de_commande: 'Commande SLR N° 4500784551 - Updated',
  fournisseur_id: 105,
  date: '2026-04-21',
  observation: 'Updated via API',
  status: 'Livraison Partielle',
  delai_livraison_jours: 30,
  lines: [
    {
      id: 1,
      designation: 'Tete Laiton XTTI 704.01 - TEST',
      qty: 100,
      unite: 'PCE',
      unit_price: 50,
      tva_percentage: 19
    }
  ]
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/local-orders/20',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', body);
  });
});

req.on('error', console.error);
req.write(data);
req.end();
