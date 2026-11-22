const fs = require('fs');
const cheerio = require('cheerio'); // if available or regex

const filePath = 'C:\\Users\\msai\\Downloads\\slr livraison.MHTML';
const content = fs.readFileSync(filePath, 'utf-8');

console.log('File size in bytes:', fs.statSync(filePath).size);
console.log('Snippet:\n', content.slice(0, 2000));
