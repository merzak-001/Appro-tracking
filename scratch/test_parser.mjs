import fs from 'fs';
import { parseSAPFileContent } from '../src/utils/sapParser.ts';

const content = fs.readFileSync('C:\\Users\\msai\\Downloads\\slr livraison.MHTML', 'utf-8');
const parsed = parseSAPFileContent(content);
console.log('Successfully parsed rows count:', parsed.length);
console.log('Unique SAP orders:', Array.from(new Set(parsed.map(p => p.poNum))));
console.log('Sample 103 row:', parsed.find(p => p.moveCode === '103'));
console.log('Sample 104 row:', parsed.find(p => p.moveCode === '104'));
