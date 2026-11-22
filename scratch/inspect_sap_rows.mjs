import fs from 'fs';

const filePath = 'C:\\Users\\msai\\Downloads\\slr livraison.MHTML';
const content = fs.readFileSync(filePath, 'utf-8');

const tableMatch = content.match(/<table[\s\S]*?<\/table>/i);
const tableHtml = tableMatch[0];
const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
const rows = tableHtml.match(rowRegex) || [];

function extractCells(rowHtml) {
  const cellRegex = /<t[dh][\s\S]*?>(.*?)<\/t[dh]>/gi;
  const cells = [];
  let m;
  while ((m = cellRegex.exec(rowHtml)) !== null) {
    let val = m[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#xD;&#xA;/g, '')
      .trim();
    cells.push(val);
  }
  return cells;
}

const headers = extractCells(rows[0]);
console.log('Headers:', headers);

const parsedData = [];
const moveCodes = new Set();
const sapOrders = new Set();

for (let i = 1; i < rows.length; i++) {
  const cells = extractCells(rows[i]);
  if (cells.length < 10) continue;
  const itemCode = cells[0];
  const designation = cells[1];
  const qty = parseFloat(cells[4].replace(/\s/g, '').replace(',', '.'));
  const moveCode = cells[5];
  const date = cells[9];
  const poNum = cells[10];
  const uom = cells[11];
  const supplier = cells[12];
  const matDoc = cells[15];
  const ref = cells[21];
  const headerText = cells[22];

  if (!poNum && !designation && isNaN(qty)) continue; // skip subtotal lines

  if (moveCode) moveCodes.add(moveCode);
  if (poNum) sapOrders.add(poNum);

  parsedData.push({
    itemCode,
    designation,
    qty,
    moveCode,
    date,
    poNum,
    uom,
    supplier,
    matDoc,
    ref,
    headerText,
  });
}

console.log('Total valid records parsed:', parsedData.length);
console.log('Unique Movement Codes:', Array.from(moveCodes));
console.log('Unique SAP Orders count:', sapOrders.size);
console.log('Unique SAP Orders list:', Array.from(sapOrders));

const count103 = parsedData.filter(d => d.moveCode === '103').length;
const count104 = parsedData.filter(d => d.moveCode === '104').length;
console.log('Count 103 (Receptions):', count103);
console.log('Count 104 (Cancellations):', count104);

console.log('\nSample 104 records:');
console.log(parsedData.filter(d => d.moveCode === '104').slice(0, 5));

console.log('\nSample 103 records:');
console.log(parsedData.filter(d => d.moveCode === '103').slice(0, 5));
