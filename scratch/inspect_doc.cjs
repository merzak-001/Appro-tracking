const fs = require('fs');
const path = 'C:\\Users\\msai\\Downloads\\Revue de processus appros juin 2026.doc';

const buffer = fs.readFileSync(path);
console.log('File size:', buffer.length);
console.log('Hex signature:', buffer.subarray(0, 16).toString('hex'));

// Check if it's UTF-16, UTF-8, RTF, or binary Word format
const textPreview = buffer.toString('utf-8');
console.log('Text preview first 200 chars:');
console.log(textPreview.slice(0, 200));
