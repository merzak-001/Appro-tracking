const fs = require('fs');

const rows = JSON.parse(fs.readFileSync('c:\\Users\\msai\\antigravity\\Procurement-Order-Tracker\\scratch\\parsed_slr.json', 'utf8'));

const dataRows = rows.slice(1);

const validRows = [];

dataRows.forEach((r, idx) => {
  const article = r[0];
  const designation = (r[1] || '').replace(/^"|"$/g, '').trim();
  const qtyStr = r[4];
  const codeMvt = r[5];
  const date = r[9];
  const orderNum = r[10];
  const unite = r[11] || 'piece';
  const amountStr = r[14];
  const docNum = r[15];

  if (!orderNum && !article) return; // Skip summary / empty rows

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
    amount,
    docNum,
  });
});

// Group by Order Number (Commande d'achat)
const orderGroups = {};

validRows.forEach((row) => {
  if (!orderGroups[row.orderNum]) {
    orderGroups[row.orderNum] = [];
  }
  orderGroups[row.orderNum].push(row);
});

console.log(`Total Unique Purchase Orders: ${Object.keys(orderGroups).length}`);

// Inspect each order
const orderSummary = [];

Object.keys(orderGroups).forEach((ordNum) => {
  const items = orderGroups[ordNum];
  const mvt105Count = items.filter((i) => i.codeMvt === '105').length;
  const mvt106Count = items.filter((i) => i.codeMvt === '106').length;

  // Let's group items by article code to check net quantities and unit prices
  const articleMap = {};

  items.forEach((item) => {
    if (item.codeMvt === '106') return; // Ignore movement code 106 as user specified!

    if (!articleMap[item.article]) {
      articleMap[item.article] = {
        article: item.article,
        designation: item.designation,
        unite: item.unite,
        totalQty: 0,
        totalAmount: 0,
        minDate: item.date,
        maxDate: item.date,
        entriesCount: 0,
      };
    }

    const art = articleMap[item.article];
    art.totalQty += item.qty;
    art.totalAmount += item.amount;
    art.entriesCount += 1;
    if (item.date < art.minDate) art.minDate = item.date;
    if (item.date > art.maxDate) art.maxDate = item.date;
  });

  const articlesList = Object.values(articleMap).map((a) => {
    const unitPrice = a.totalQty > 0 ? Number((a.totalAmount / a.totalQty).toFixed(2)) : 0;
    return {
      article: a.article,
      designation: a.designation,
      unite: a.unite,
      qty: a.totalQty,
      unitPrice,
      totalHT: a.totalAmount,
      totalTTC: Number((a.totalAmount * 1.19).toFixed(2)),
      minDate: a.minDate,
      maxDate: a.maxDate,
    };
  });

  const orderTotalHT = articlesList.reduce((sum, a) => sum + a.totalHT, 0);
  const orderTotalTTC = articlesList.reduce((sum, a) => sum + a.totalTTC, 0);

  orderSummary.push({
    orderNum: ordNum,
    mvt105Count,
    mvt106Count,
    articlesCount: articlesList.length,
    articles: articlesList,
    totalHT: Number(orderTotalHT.toFixed(2)),
    totalTTC: Number(orderTotalTTC.toFixed(2)),
    orderDate: articlesList[0]?.minDate || '2026-01-01',
  });
});

console.log('Sample Order Summary (First 3):');
console.log(JSON.stringify(orderSummary.slice(0, 3), null, 2));

console.log('\nList of all Purchase Orders:');
orderSummary.forEach((o) => {
  console.log(`Order: ${o.orderNum} | Date: ${o.orderDate} | Articles: ${o.articlesCount} | Total TTC: ${o.totalTTC.toLocaleString()} DA`);
});
