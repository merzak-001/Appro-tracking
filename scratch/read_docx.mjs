import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const docPath = path.join(process.env.USERPROFILE || '', 'Downloads', 'Procedure_Reevaluation_Fournisseurs.docx');
const zipTemp = path.join(process.cwd(), 'scratch', 'temp_doc.zip');
const outDir = path.join(process.cwd(), 'scratch', 'docx_temp');

fs.copyFileSync(docPath, zipTemp);
if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

execSync(`powershell -Command "Expand-Archive -Path '${zipTemp}' -DestinationPath '${outDir}' -Force"`);

const xmlContent = fs.readFileSync(path.join(outDir, 'word', 'document.xml'), 'utf-8');
const text = xmlContent.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();
console.log(text);
