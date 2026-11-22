/**
 * Utilities for copying rich HTML tables and charts to clipboard
 * for seamless, fully editable pasting into Microsoft Word, Excel, PowerPoint, and Outlook.
 * Formatted specifically to expand to 100% full width of A4 pages in VERTICAL (PORTRAIT) mode
 * with compact, non-wrapping typography so dense 18+ column tables fit across the vertical page.
 */

export interface WordTableCell {
  text: string;
  align?: 'left' | 'center' | 'right';
  bg?: string;
  color?: string;
  bold?: boolean;
  colSpan?: number;
  rowSpan?: number;
  width?: string;
  nowrap?: boolean;
  excelFormula?: string;
  rawNum?: number;
}

export interface WordTableRow {
  cells: WordTableCell[];
  bg?: string;
  bold?: boolean;
}

export interface WordTableData {
  title?: string;
  subtitle?: string;
  orientation?: 'landscape' | 'portrait';
  fontSize?: string; // e.g. '5.6pt', '6pt', '7pt'
  colWidths?: string[]; // e.g. ['16%', '3.2%', '4.8%', ...]
  headerRows: WordTableRow[];
  bodyRows: WordTableRow[];
  footerRows?: WordTableRow[];
}

/**
 * Sanitizes cell text for Microsoft Word:
 * - Converts numeric and percentage spaces into non-breaking spaces &nbsp;
 * - Keeps negative dashes and symbols intact without breaking into multi-line vertical stacks.
 */
function sanitizeForWord(text: string, isNumeric: boolean): string {
  if (!text) return '&nbsp;';
  let clean = text.trim();
  if (clean === '-' || clean === '0' || clean === '0 kDA' || clean === '0.00') {
    return clean;
  }
  // If numeric or percentage (e.g. "52 15", "104.0 %", "78.90", "1 956", "33.0 %")
  if (isNumeric || /\d/.test(clean)) {
    // Replace internal spaces with non-breaking spaces so Word will never wrap digits
    clean = clean.replace(/(\d)\s+(\d)/g, '$1&nbsp;$2');
    clean = clean.replace(/(\d)\s+%/g, '$1%');
    clean = clean.replace(/kDA/g, 'kDA');
  }
  return clean;
}

/**
 * Generates clean, Microsoft Word-compatible HTML with full A4 page width styling,
 * optimized for VERTICAL (PORTRAIT) A4 pages, writing 'text/html' and 'text/plain' to clipboard.
 */
export async function copyTableDataToWord(data: WordTableData): Promise<boolean> {
  const {
    title,
    subtitle,
    orientation = 'portrait', // Default to Portrait / Vertical A4 page
    headerRows,
    bodyRows,
    footerRows,
  } = data;

  // Calculate maximum number of columns across all rows
  let maxCols = 0;
  if (bodyRows.length > 0) {
    bodyRows.forEach((r) => {
      let count = 0;
      r.cells.forEach((c) => {
        count += c.colSpan || 1;
      });
      if (count > maxCols) maxCols = count;
    });
  } else if (headerRows.length > 0) {
    headerRows.forEach((r) => {
      let count = 0;
      r.cells.forEach((c) => {
        count += c.colSpan || 1;
      });
      if (count > maxCols) maxCols = count;
    });
  }

  const isPortrait = orientation === 'portrait';
  const isLandscape = orientation === 'landscape';

  // Auto-tune font size based on column density and page orientation
  let effectiveFontSize = data.fontSize;
  if (!effectiveFontSize) {
    if (isPortrait) {
      if (maxCols >= 16) {
        effectiveFontSize = '5.6pt';
      } else if (maxCols >= 11) {
        effectiveFontSize = '6.5pt';
      } else {
        effectiveFontSize = '7.5pt';
      }
    } else {
      if (maxCols >= 16) {
        effectiveFontSize = '6.8pt';
      } else if (maxCols >= 11) {
        effectiveFontSize = '7.5pt';
      } else {
        effectiveFontSize = '8.5pt';
      }
    }
  }

  const pageSizeStr = isLandscape ? '841.95pt 595.35pt' : '595.35pt 841.95pt';
  const pageMarginStr = isLandscape ? '18.0pt 18.0pt 18.0pt 18.0pt' : '14.17pt 14.17pt 14.17pt 14.17pt'; // 0.5cm margins for portrait

  // Build explicit proportional colgroup for Word if not provided
  let colgroupHtml = '';
  if (maxCols > 0) {
    colgroupHtml += '  <colgroup>\n';
    if (data.colWidths && data.colWidths.length === maxCols) {
      data.colWidths.forEach((w) => {
        colgroupHtml += `    <col style="width:${w};" width="${w}">\n`;
      });
    } else if (maxCols >= 16) {
      // 18-column standard production dashboard in A4 Portrait
      const firstColPct = 16.0;
      const secondColPct = 3.2;
      const thirdColPct = 4.8;
      const fourthColPct = 5.6;
      const remainingCols = maxCols - 4;
      const eachRemainingPct = Number(((100 - firstColPct - secondColPct - thirdColPct - fourthColPct) / remainingCols).toFixed(2));
      colgroupHtml += `    <col style="width:${firstColPct}%;" width="${firstColPct}%">\n`;
      colgroupHtml += `    <col style="width:${secondColPct}%;" width="${secondColPct}%">\n`;
      colgroupHtml += `    <col style="width:${thirdColPct}%;" width="${thirdColPct}%">\n`;
      colgroupHtml += `    <col style="width:${fourthColPct}%;" width="${fourthColPct}%">\n`;
      for (let i = 0; i < remainingCols; i++) {
        colgroupHtml += `    <col style="width:${eachRemainingPct}%;" width="${eachRemainingPct}%">\n`;
      }
    } else {
      const colPct = Number((100 / maxCols).toFixed(2));
      for (let i = 0; i < maxCols; i++) {
        colgroupHtml += `    <col style="width:${colPct}%;" width="${colPct}%">\n`;
      }
    }
    colgroupHtml += '  </colgroup>\n';
  }

  let html = `<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]>
<xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
    margin: ${isLandscape ? '0.8cm 0.8cm 0.8cm 0.8cm' : '0.5cm 0.5cm 0.5cm 0.5cm'};
    mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
  }
  @page Section1 {
    size: ${pageSizeStr};
    mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
    margin: ${pageMarginStr};
    mso-header-margin: 10.0pt;
    mso-footer-margin: 10.0pt;
    mso-paper-source: 0;
  }
  div.Section1 {
    page: Section1;
    width: 100.0%;
    mso-element: section;
  }
  body {
    font-family: 'Arial Narrow', Calibri, Arial, sans-serif;
    font-size: ${effectiveFontSize};
    color: #0f172a;
    margin: 0;
    padding: 0;
  }
  h2.table-title {
    font-family: 'Arial Narrow', Calibri, Arial, sans-serif;
    font-size: 9.5pt;
    font-weight: bold;
    color: #0f172a;
    margin-top: 0;
    margin-bottom: 1.5pt;
  }
  p.table-subtitle {
    font-family: 'Arial Narrow', Calibri, Arial, sans-serif;
    font-size: 6.5pt;
    color: #475569;
    margin-top: 0;
    margin-bottom: 4pt;
  }
  table.word-a4-table {
    width: 100.0% !important;
    width: 100% !important;
    min-width: 100% !important;
    border-collapse: collapse !important;
    table-layout: fixed !important;
    mso-table-layout-alt: fixed !important;
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
    mso-padding-alt: 1.0pt 1.2pt 1.0pt 1.2pt;
    font-family: 'Arial Narrow', Calibri, Arial, sans-serif;
    font-size: ${effectiveFontSize};
    border: 1pt solid #0f172a;
    line-height: 1.05;
  }
  table.word-a4-table th {
    border: 0.5pt solid #94a3b8;
    padding: 2.0pt 1.0pt;
    font-weight: bold;
    text-align: center;
    mso-border-alt: solid #94a3b8 .5pt;
    mso-hyphenate: none;
  }
  table.word-a4-table td {
    border: 0.5pt solid #cbd5e1;
    padding: 1.0pt 1.0pt;
    vertical-align: middle;
    mso-border-alt: solid #cbd5e1 .5pt;
    mso-hyphenate: none;
  }
</style>
</head>
<body>
<div class="Section1">
`;

  if (title) {
    html += `  <h2 class="table-title">${title}</h2>\n`;
  }
  if (subtitle) {
    html += `  <p class="table-subtitle">${subtitle}</p>\n`;
  }

  html += `  <table class="word-a4-table" width="100%" border="1" cellpadding="1" cellspacing="0" style="width:100.0%; min-width:100%; border-collapse:collapse; table-layout:fixed; mso-table-layout-alt:fixed; mso-table-lspace:0pt; mso-table-rspace:0pt; font-family:'Arial Narrow',Calibri,Arial,sans-serif; font-size:${effectiveFontSize}; border:1pt solid #0f172a; line-height:1.05;">\n`;
  html += colgroupHtml;

  // Headers
  if (headerRows && headerRows.length > 0) {
    html += `    <thead>\n`;
    headerRows.forEach((row) => {
      const rowBg = row.bg || '#1e3a8a';
      html += `      <tr style="background-color:${rowBg};">\n`;
      row.cells.forEach((c) => {
        const bg = c.bg || rowBg;
        const color = c.color || '#ffffff';
        const align = c.align || 'center';
        const colSpan = c.colSpan ? ` colspan="${c.colSpan}"` : '';
        const rowSpan = c.rowSpan ? ` rowspan="${c.rowSpan}"` : '';
        const width = c.width ? ` width="${c.width}"` : '';
        const isHeaderNowrap = c.nowrap !== false;
        const nowrapAttr = isHeaderNowrap ? ' nowrap="nowrap"' : '';
        const nowrapStyle = isHeaderNowrap ? ' white-space:nowrap; mso-hyphenate:none; word-break:keep-all;' : '';
        const sanitizedText = sanitizeForWord(c.text, align === 'right' || align === 'center');
        html += `        <th${colSpan}${rowSpan}${width}${nowrapAttr} style="border:0.5pt solid #94a3b8; background-color:${bg}; color:${color}; padding:2.0pt 1.0pt; text-align:${align}; font-weight:bold; font-size:${effectiveFontSize};${nowrapStyle}">${sanitizedText}</th>\n`;
      });
      html += `      </tr>\n`;
    });
    html += `    </thead>\n`;
  }

  // Body
  html += `    <tbody>\n`;
  let plainTextRows: string[] = [];

  bodyRows.forEach((row, rIdx) => {
    const defaultBg = rIdx % 2 === 1 ? '#f8fafc' : '#ffffff';
    const rowBg = row.bg || defaultBg;
    html += `      <tr style="background-color:${rowBg};">\n`;
    const plainCells: string[] = [];

    row.cells.forEach((c) => {
      const bg = c.bg || rowBg;
      const color = c.color || '#0f172a';
      const align = c.align || 'left';
      const boldStyle = c.bold || row.bold ? ' font-weight:bold;' : '';
      const colSpan = c.colSpan ? ` colspan="${c.colSpan}"` : '';
      const rowSpan = c.rowSpan ? ` rowspan="${c.rowSpan}"` : '';
      const width = c.width ? ` width="${c.width}"` : '';
      const isNumeric = align === 'right' || align === 'center';
      const shouldNowrap = c.nowrap ?? isNumeric;
      const nowrapAttr = shouldNowrap ? ' nowrap="nowrap"' : '';
      const nowrapStyle = shouldNowrap ? ' white-space:nowrap; mso-hyphenate:none; word-break:keep-all;' : '';
      const formulaAttr = c.excelFormula ? ` x:f="${c.excelFormula}"` : '';
      const numAttr = c.rawNum !== undefined ? ` x:num="${c.rawNum}"` : '';
      const sanitizedText = sanitizeForWord(c.text, isNumeric);

      html += `        <td${colSpan}${rowSpan}${width}${nowrapAttr}${formulaAttr}${numAttr} style="border:0.5pt solid #cbd5e1; background-color:${bg}; color:${color}; padding:1.0pt 1.2pt; text-align:${align}; font-size:${effectiveFontSize};${boldStyle}${nowrapStyle}">${sanitizedText}</td>\n`;
      plainCells.push(c.text);
    });

    html += `      </tr>\n`;
    plainTextRows.push(plainCells.join('\t'));
  });
  html += `    </tbody>\n`;

  // Footers
  if (footerRows && footerRows.length > 0) {
    html += `    <tfoot>\n`;
    footerRows.forEach((row) => {
      const rowBg = row.bg || '#0f172a';
      html += `      <tr style="background-color:${rowBg}; font-weight:bold; border-top:1.5pt solid #0f172a;">\n`;
      const plainCells: string[] = [];

      row.cells.forEach((c) => {
        const bg = c.bg || rowBg;
        const color = c.color || '#ffffff';
        const align = c.align || 'left';
        const colSpan = c.colSpan ? ` colspan="${c.colSpan}"` : '';
        const rowSpan = c.rowSpan ? ` rowspan="${c.rowSpan}"` : '';
        const width = c.width ? ` width="${c.width}"` : '';
        const isNumeric = align === 'right' || align === 'center';
        const shouldNowrap = c.nowrap ?? isNumeric;
        const nowrapAttr = shouldNowrap ? ' nowrap="nowrap"' : '';
        const nowrapStyle = shouldNowrap ? ' white-space:nowrap; mso-hyphenate:none; word-break:keep-all;' : '';
        const formulaAttr = c.excelFormula ? ` x:f="${c.excelFormula}"` : '';
        const numAttr = c.rawNum !== undefined ? ` x:num="${c.rawNum}"` : '';
        const sanitizedText = sanitizeForWord(c.text, isNumeric);

        html += `        <td${colSpan}${rowSpan}${width}${nowrapAttr}${formulaAttr}${numAttr} style="border:0.5pt solid #475569; background-color:${bg}; color:${color}; padding:2.0pt 1.2pt; text-align:${align}; font-weight:bold; font-size:${effectiveFontSize};${nowrapStyle}">${sanitizedText}</td>\n`;
        plainCells.push(c.text);
      });

      html += `      </tr>\n`;
      plainTextRows.push(plainCells.join('\t'));
    });
    html += `    </tfoot>\n`;
  }

  html += `  </table>\n</div>\n</body>\n</html>`;

  const plainText = (title ? `${title}\n\n` : '') + plainTextRows.join('\n');

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        }),
      ]);
      return true;
    } else {
      // Fallback
      const listener = (e: ClipboardEvent) => {
        e.clipboardData?.setData('text/html', html);
        e.clipboardData?.setData('text/plain', plainText);
        e.preventDefault();
      };
      document.addEventListener('copy', listener);
      document.execCommand('copy');
      document.removeEventListener('copy', listener);
      return true;
    }
  } catch (err) {
    console.error('Failed to copy HTML table to clipboard:', err);
    return false;
  }
}

/**
 * Copies a DOM table element directly into the clipboard with Word A4 page full-width styles.
 */
export async function copyDomTableToWord(
  elementId: string,
  title?: string,
  orientation: 'landscape' | 'portrait' = 'portrait'
): Promise<boolean> {
  const el = document.getElementById(elementId);
  if (!el) return false;

  const clone = el.cloneNode(true) as HTMLElement;
  const isLandscape = orientation === 'landscape';
  const pageSizeStr = isLandscape ? '841.95pt 595.35pt' : '595.35pt 841.95pt';

  clone.setAttribute('width', '100%');
  clone.setAttribute('border', '1');
  clone.setAttribute('cellpadding', '1');
  clone.setAttribute('cellspacing', '0');
  clone.style.borderCollapse = 'collapse';
  clone.style.width = '100.0%';
  clone.style.minWidth = '100%';
  clone.style.tableLayout = 'fixed';
  clone.style.fontFamily = 'Arial Narrow, Calibri, Arial, sans-serif';
  clone.style.fontSize = isLandscape ? '6.8pt' : '5.6pt';
  clone.style.border = '1pt solid #0f172a';

  const cells = clone.querySelectorAll('th, td');
  cells.forEach((cell) => {
    const htmlCell = cell as HTMLElement;
    htmlCell.style.border = '0.5pt solid #cbd5e1';
    htmlCell.style.padding = '1.0pt 1.2pt';
    htmlCell.setAttribute('nowrap', 'nowrap');
    htmlCell.style.whiteSpace = 'nowrap';
    htmlCell.style.wordBreak = 'keep-all';
  });

  const fullHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<style>
  @page {
    size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
    margin: 0.5cm;
    mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
  }
  @page Section1 {
    size: ${pageSizeStr};
    mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
    margin: 14.17pt;
  }
  div.Section1 { page: Section1; width: 100.0%; }
  body { font-family: Arial Narrow, Calibri, Arial, sans-serif; font-size: ${isLandscape ? '6.8pt' : '5.6pt'}; color: #0f172a; margin: 0; padding: 0; }
  h2 { font-size: 9.5pt; color: #0f172a; margin-bottom: 2pt; font-family: Arial Narrow, Calibri, Arial, sans-serif; font-weight: bold; }
  table { width: 100.0% !important; border-collapse: collapse !important; table-layout: fixed; mso-table-layout-alt: fixed; }
</style>
</head>
<body>
<div class="Section1">
${title ? `<h2 style="font-family:Arial Narrow,Calibri,Arial,sans-serif;font-size:9.5pt;color:#0f172a;">${title}</h2>` : ''}
${clone.outerHTML}
</div>
</body>
</html>`;

  const plainText = clone.innerText || '';

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const blobHtml = new Blob([fullHtml], { type: 'text/html' });
      const blobText = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        }),
      ]);
      return true;
    }
    return false;
  } catch (err) {
    console.error('copyDomTableToWord error:', err);
    return false;
  }
}
