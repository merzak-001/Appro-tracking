const fs = require('fs');
const path = require('path');

let filePath = 'C:\\Users\\msai\\Downloads\\Tableau_Production_Octobre_2026 31.10.2026.xlsx';
if (!fs.existsSync(filePath)) {
  console.log('File not found at:', filePath);
  process.exit(1);
}

const XLSX = require('xlsx');
const wb = XLSX.readFile(filePath);
console.log('Sheet names:', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  console.log('=== SHEET:', sheetName, '===');
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log('Total rows:', data.length);
  for (let i = 0; i < Math.min(25, data.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i]));
  }
});

