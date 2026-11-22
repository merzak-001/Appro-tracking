const fs = require('fs');

const rows = JSON.parse(fs.readFileSync('c:\\Users\\msai\\antigravity\\Procurement-Order-Tracker\\scratch\\parsed_slr.json', 'utf8'));

const headers = rows[0];
console.log('Headers:', headers);

const dataRows = rows.slice(1);

// Find unique Code mouvement
const movements = {};
dataRows.forEach((r) => {
  const code = r[5];
  const text = r[6];
  if (code) {
    movements[code] = text;
  }
});

console.log('Unique Movement Codes:', movements);

// Analyze rows
let totalQty = 0;
const validRows = [];

dataRows.forEach((r, idx) => {
  const article = r[0];
  const designation = r[1];
  const qtyStr = r[4];
  const codeMvt = r[5];
  const date = r[9];
  const orderNum = r[10];
  const unite = r[11] || 'piece';
  const supplierCode = r[12];
  const amountStr = r[14];
  const docNum = r[15];

  if (!orderNum && !article) return; // Summary row or blank

  const qty = parseFloat(qtyStr || '0');
  const amount = parseFloat(amountStr || '0');

  validRows.push({
    rowIdx: idx + 1,
    article,
    designation,
    qty,
    codeMvt,
    date,
    orderNum,
    unite,
    supplierCode,
    amount,
    docNum,
  });
});

console.log(`Extracted ${validRows.length} valid data rows.`);

// Inspect code movement distribution
const mvtCounts = {};
validRows.forEach((r) => {
  mvtCounts[r.codeMvt] = (mvtCounts[r.codeMvt] || 0) + 1;
});
console.log('Movement code frequency:', mvtCounts);

// Let's print rows with negative or canceling movement codes
const cancels = validRows.filter((r) => r.qty < 0 || r.codeMvt === '106' || r.codeMvt === '102');
console.log(`Found ${cancels.length} canceling/negative rows.`);
console.log('Sample cancel rows:', cancels.slice(0, 5));
