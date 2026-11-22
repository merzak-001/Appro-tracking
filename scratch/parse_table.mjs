import fs from 'fs';

const filePath = 'C:\\Users\\msai\\Downloads\\slr livraison.MHTML';
const content = fs.readFileSync(filePath, 'utf-8');

// Extract the <table>...</table> part
const tableMatch = content.match(/<table[\s\S]*?<\/table>/i);
if (!tableMatch) {
  console.log('No table found');
  process.exit(1);
}

const tableHtml = tableMatch[0];

// Extract rows
const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
const rows = tableHtml.match(rowRegex) || [];

console.log('Total rows in table:', rows.length);

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

if (rows.length > 0) {
  console.log('Headers (Row 0):', extractCells(rows[0]));
  if (rows.length > 1) {
    console.log('Row 1:', extractCells(rows[1]));
  }
  if (rows.length > 2) {
    console.log('Row 2:', extractCells(rows[2]));
  }
  if (rows.length > 3) {
    console.log('Row 3:', extractCells(rows[3]));
  }
  if (rows.length > 4) {
    console.log('Row 4:', extractCells(rows[4]));
  }
}
