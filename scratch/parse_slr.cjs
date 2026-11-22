const fs = require('fs');

const path = 'C:\\Users\\msai\\Downloads\\livrrison slr.MHTML';
let content = fs.readFileSync(path, 'utf8');

// The HTML section is encoded in quoted-printable or UTF-8. Let's extract <table>...</table>
const tableMatch = content.match(/<table[\s\S]*?<\/table>/i);

if (!tableMatch) {
  console.log('No <table> tag found!');
  process.exit(1);
}

const tableHtml = tableMatch[0];

// Extract rows
const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
const rows = tableHtml.match(rowRegex) || [];

console.log(`Found ${rows.length} rows.`);

const parsedRows = [];

rows.forEach((r, idx) => {
  // Extract td or th content
  const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  const cells = [];
  let m;
  while ((m = cellRegex.exec(r)) !== null) {
    let val = m[1]
      .replace(/<[^>]+>/g, '') // remove inner HTML tags
      .replace(/&#\d+;/g, '') // remove html entities
      .replace(/&nbsp;/gi, ' ')
      .replace(/=\r?\n/g, '') // quoted printable lines
      .replace(/=20/g, ' ')
      .replace(/=3D/g, '=')
      .trim();
    cells.push(val);
  }
  if (cells.length > 0) {
    parsedRows.push(cells);
  }
});

console.log('First 5 rows (Headers/Sample):');
console.log(JSON.stringify(parsedRows.slice(0, 5), null, 2));

console.log('\nTotal parsed rows:', parsedRows.length);

fs.writeFileSync('c:\\Users\\msai\\antigravity\\Procurement-Order-Tracker\\scratch\\parsed_slr.json', JSON.stringify(parsedRows, null, 2));
console.log('Saved parsed_slr.json');
