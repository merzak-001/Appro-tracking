import * as XLSX from 'xlsx';

export interface ParsedSAPRow {
  itemCode: string;
  designation: string;
  qty: number;
  moveCode: '103' | '104' | string;
  date: string;
  poNum: string;
  uom: string;
  supplier: string;
  matDoc: string;
  ref: string;
  headerText: string;
  raw?: any;
}

export function parseSAPFileContent(fileContent: string | ArrayBuffer): ParsedSAPRow[] {
  if (typeof fileContent === 'string' && (fileContent.includes('<table') || fileContent.includes('MIME-Version') || fileContent.includes('<html'))) {
    return parseSAPHTML(fileContent);
  }

  try {
    const workbook = XLSX.read(fileContent, { type: typeof fileContent === 'string' ? 'string' : 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    return parseSAPSheetRows(jsonData);
  } catch (e) {
    if (typeof fileContent === 'string') {
      return parseSAPHTML(fileContent);
    }
    throw e;
  }
}

function parseSAPHTML(htmlText: string): ParsedSAPRow[] {
  const tableMatch = htmlText.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return [];

  const tableHtml = tableMatch[0];
  const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
  const rows = tableHtml.match(rowRegex) || [];

  function extractCells(rowHtml: string): string[] {
    const cellRegex = /<t[dh][\s\S]*?>(.*?)<\/t[dh]>/gi;
    const cells: string[] = [];
    let m;
    while ((m = cellRegex.exec(rowHtml)) !== null) {
      let val = m[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#xD;&#xA;/g, '')
        .trim();
      cells.push(val);
    }
    return cells;
  }

  if (rows.length < 2) return [];

  const headerCells = extractCells(rows[0]).map(h => h.toLowerCase());
  
  // Find column indices
  let itemCodeIdx = headerCells.findIndex(h => h.includes('article') && !h.includes('désignation') && !h.includes('doc'));
  let desigIdx = headerCells.findIndex(h => h.includes('désignation') || h.includes('designation'));
  let qtyIdx = headerCells.findIndex(h => h.includes('qté') || h.includes('qte') || h.includes('quantit'));
  let moveCodeIdx = headerCells.findIndex(h => h.includes('code mouvement') || h.includes('mouvement'));
  let dateIdx = headerCells.findIndex(h => h.includes('date comptable') || h.includes('date'));
  let poNumIdx = headerCells.findIndex(h => h.includes("commande d'achat") || h.includes('commande') || h.includes('achat'));
  let uomIdx = headerCells.findIndex(h => h.includes('uq') || h.includes('unité') || h.includes('unite'));
  let supIdx = headerCells.findIndex(h => h.includes('fournisseur'));
  let matDocIdx = headerCells.findIndex(h => h.includes('document article') || h.includes('doc. article'));
  let refIdx = headerCells.findIndex(h => h.includes('référence') || h.includes('reference'));
  let headTxtIdx = headerCells.findIndex(h => h.includes('texte'));

  if (itemCodeIdx === -1) itemCodeIdx = 0;
  if (desigIdx === -1) desigIdx = 1;
  if (qtyIdx === -1) qtyIdx = 4;
  if (moveCodeIdx === -1) moveCodeIdx = 5;
  if (dateIdx === -1) dateIdx = 9;
  if (poNumIdx === -1) poNumIdx = 10;
  if (uomIdx === -1) uomIdx = 11;
  if (supIdx === -1) supIdx = 12;
  if (matDocIdx === -1) matDocIdx = 15;
  if (refIdx === -1) refIdx = 21;
  if (headTxtIdx === -1) headTxtIdx = 22;

  const results: ParsedSAPRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = extractCells(rows[i]);
    if (cells.length < 10) continue;

    const poNum = (cells[poNumIdx] || '').trim();
    const designation = (cells[desigIdx] || '').trim();
    const rawQty = cells[qtyIdx] ? cells[qtyIdx].replace(/\s/g, '').replace(',', '.') : '';
    const parsedQty = parseFloat(rawQty);

    // Skip empty lines, summary rows, or rows without PO / designation
    if (!poNum || !designation || isNaN(parsedQty) || parsedQty === 0) {
      continue;
    }

    const itemCode = (cells[itemCodeIdx] || '').trim();
    let moveCode = (cells[moveCodeIdx] || '').trim();
    if (!moveCode) {
      moveCode = parsedQty < 0 ? '104' : '103';
    } else if (moveCode.includes('104')) {
      moveCode = '104';
    } else {
      moveCode = '103';
    }

    let dateVal = (cells[dateIdx] || '').trim();
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateVal)) {
      const p = dateVal.split('.');
      dateVal = `${p[2]}-${p[1]}-${p[0]}`;
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateVal)) {
      const p = dateVal.split('/');
      dateVal = `${p[2]}-${p[1]}-${p[0]}`;
    }

    results.push({
      itemCode,
      designation,
      qty: parsedQty,
      moveCode: moveCode as '103' | '104',
      date: dateVal || new Date().toISOString().split('T')[0],
      poNum,
      uom: (cells[uomIdx] || 'PCE').trim(),
      supplier: (cells[supIdx] || '').trim(),
      matDoc: (cells[matDocIdx] || '').trim(),
      ref: (cells[refIdx] || '').trim(),
      headerText: (cells[headTxtIdx] || '').trim(),
    });
  }

  return results;
}

function parseSAPSheetRows(rows: any[][]): ParsedSAPRow[] {
  if (rows.length < 2) return [];

  const headers = (rows[0] || []).map(h => String(h || '').toLowerCase());
  let itemCodeIdx = headers.findIndex(h => h.includes('article') && !h.includes('désignation') && !h.includes('doc'));
  let desigIdx = headers.findIndex(h => h.includes('désignation') || h.includes('designation'));
  let qtyIdx = headers.findIndex(h => h.includes('qté') || h.includes('qte') || h.includes('quantit'));
  let moveCodeIdx = headers.findIndex(h => h.includes('code mouvement') || h.includes('mouvement'));
  let dateIdx = headers.findIndex(h => h.includes('date comptable') || h.includes('date'));
  let poNumIdx = headers.findIndex(h => h.includes("commande d'achat") || h.includes('commande') || h.includes('achat'));
  let uomIdx = headers.findIndex(h => h.includes('uq') || h.includes('unité') || h.includes('unite'));
  let supIdx = headers.findIndex(h => h.includes('fournisseur'));
  let matDocIdx = headers.findIndex(h => h.includes('document article') || h.includes('doc. article'));
  let refIdx = headers.findIndex(h => h.includes('référence') || h.includes('reference'));
  let headTxtIdx = headers.findIndex(h => h.includes('texte'));

  if (itemCodeIdx === -1) itemCodeIdx = 0;
  if (desigIdx === -1) desigIdx = 1;
  if (qtyIdx === -1) qtyIdx = 4;
  if (moveCodeIdx === -1) moveCodeIdx = 5;
  if (dateIdx === -1) dateIdx = 9;
  if (poNumIdx === -1) poNumIdx = 10;
  if (uomIdx === -1) uomIdx = 11;
  if (supIdx === -1) supIdx = 12;
  if (matDocIdx === -1) matDocIdx = 15;
  if (refIdx === -1) refIdx = 21;
  if (headTxtIdx === -1) headTxtIdx = 22;

  const results: ParsedSAPRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    const poNum = String(row[poNumIdx] || '').trim();
    const designation = String(row[desigIdx] || '').trim();
    const rawQty = row[qtyIdx] !== undefined ? String(row[qtyIdx]).replace(/\s/g, '').replace(',', '.') : '';
    const parsedQty = parseFloat(rawQty);

    if (!poNum || !designation || isNaN(parsedQty) || parsedQty === 0) {
      continue;
    }

    const itemCode = String(row[itemCodeIdx] || '').trim();
    let moveCode = String(row[moveCodeIdx] || '').trim();
    if (!moveCode) {
      moveCode = parsedQty < 0 ? '104' : '103';
    } else if (moveCode.includes('104')) {
      moveCode = '104';
    } else {
      moveCode = '103';
    }

    let dateVal = String(row[dateIdx] || '').trim();
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateVal)) {
      const p = dateVal.split('.');
      dateVal = `${p[2]}-${p[1]}-${p[0]}`;
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateVal)) {
      const p = dateVal.split('/');
      dateVal = `${p[2]}-${p[1]}-${p[0]}`;
    }

    results.push({
      itemCode,
      designation,
      qty: parsedQty,
      moveCode: moveCode as '103' | '104',
      date: dateVal || new Date().toISOString().split('T')[0],
      poNum,
      uom: String(row[uomIdx] || 'PCE').trim(),
      supplier: String(row[supIdx] || '').trim(),
      matDoc: String(row[matDocIdx] || '').trim(),
      ref: String(row[refIdx] || '').trim(),
      headerText: String(row[headTxtIdx] || '').trim(),
    });
  }

  return results;
}
