import fs from 'fs';

const filePath = 'C:\\Users\\msai\\Downloads\\slr livraison.MHTML';
const content = fs.readFileSync(filePath, 'utf-8');

console.log('File size in bytes:', fs.statSync(filePath).size);
console.log('--- START 3000 CHARS ---');
console.log(content.slice(0, 3000));
console.log('--- END 3000 CHARS ---');
