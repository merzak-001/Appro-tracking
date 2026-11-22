import * as XLSX from 'xlsx';
import { ProductionComparativeSummary } from '../types';
import { toKDA } from './productionUtils';

/**
 * Generates and downloads a native Excel (.xlsx) file with live Excel formulas for:
 * - Differences (=B3-C3)
 * - Percentage Growth (=(B3-C3)/C3)
 * - Total Rows (=SUM(B3:B15))
 * - Stock Valuations and Multi-Year Comparisons.
 */
export function exportComparativeProductionToExcel(
  summary: ProductionComparativeSummary,
  metricMode: 'QTE' | 'VAL' | 'BOTH' = 'BOTH',
  filename?: string
): void {
  const { yearN, yearN1, cutoffMonthNum, cutoffMonthStr, groups, totals } = summary;
  const actualFilename = filename || `Comparatif_Production_${yearN}_vs_${yearN1}_${cutoffMonthStr}.xlsx`;

  const wb = XLSX.utils.book_new();

  // Create worksheet data rows
  const wsData: any[][] = [];

  // Title block
  wsData.push([`SUIVI COMPARATIF DE PRODUCTION - EXERCICE ${yearN} VS ${yearN1}`]);
  wsData.push([`Arrêté au mois de : ${cutoffMonthStr} (Mois ${cutoffMonthNum})`]);
  wsData.push([]); // blank row

  // Headers
  const headerRow1 = [
    'Calibre / Désignation',
    'Code Article',
    'Unité',
    // Month Section
    `Mois ${cutoffMonthStr} ${yearN}`,
    `Mois ${cutoffMonthStr} ${yearN1}`,
    `Écart Mois (Δ)`,
    `Évolution Mois (%)`,
    // Cumul Section
    `Cumul YTD ${yearN}`,
    `Cumul YTD ${yearN1}`,
    `Écart Cumul (Δ)`,
    `Évolution Cumul (%)`,
    // Stock Section
    `Stock Fin ${cutoffMonthStr} ${yearN}`,
  ];
  wsData.push(headerRow1);

  const startDataRowIdx = wsData.length + 1; // 1-indexed for Excel formulas
  let currentRowIdx = startDataRowIdx;

  const calibreRowIndices: number[] = [];

  groups.forEach((grp) => {
    calibreRowIndices.push(currentRowIdx);

    // Group Row (e.g. DN 15)
    const isVal = metricMode === 'VAL';
    const monthN = isVal ? toKDA(grp.val.month_val_N) : grp.qte.month_val_N;
    const monthN1 = isVal ? toKDA(grp.val.month_val_N1) : grp.qte.month_val_N1;
    const cumulN = isVal ? toKDA(grp.val.cumul_val_N) : grp.qte.cumul_val_N;
    const cumulN1 = isVal ? toKDA(grp.val.cumul_val_N1) : grp.qte.cumul_val_N1;
    const stockN = isVal ? toKDA(grp.stock_val_N) : grp.stock_qte_N;

    const row: any[] = [
      grp.famille_diametre,
      '',
      isVal ? 'kDA' : 'PCE',
      monthN,
      monthN1,
      { f: `D${currentRowIdx}-E${currentRowIdx}` }, // Diff Month formula
      { f: `IF(E${currentRowIdx}>0, (D${currentRowIdx}-E${currentRowIdx})/E${currentRowIdx}, IF(D${currentRowIdx}>0, 1, 0))` }, // % Month formula
      cumulN,
      cumulN1,
      { f: `H${currentRowIdx}-I${currentRowIdx}` }, // Diff Cumul formula
      { f: `IF(I${currentRowIdx}>0, (H${currentRowIdx}-I${currentRowIdx})/I${currentRowIdx}, IF(H${currentRowIdx}>0, 1, 0))` }, // % Cumul formula
      stockN,
    ];

    wsData.push(row);
    currentRowIdx++;

    // Sub-articles if any
    grp.articles.forEach((art) => {
      const artMonthN = isVal ? toKDA(art.val.month_val_N) : art.qte.month_val_N;
      const artMonthN1 = isVal ? toKDA(art.val.month_val_N1) : art.qte.month_val_N1;
      const artCumulN = isVal ? toKDA(art.val.cumul_val_N) : art.qte.cumul_val_N;
      const artCumulN1 = isVal ? toKDA(art.val.cumul_val_N1) : art.qte.cumul_val_N1;
      const artStockN = isVal ? toKDA(art.stock_val_N) : art.stock_qte_N;

      const artRow: any[] = [
        `   ${art.designation}`,
        art.code_article,
        art.unite || (isVal ? 'kDA' : 'PCE'),
        artMonthN,
        artMonthN1,
        { f: `D${currentRowIdx}-E${currentRowIdx}` },
        { f: `IF(E${currentRowIdx}>0, (D${currentRowIdx}-E${currentRowIdx})/E${currentRowIdx}, IF(D${currentRowIdx}>0, 1, 0))` },
        artCumulN,
        artCumulN1,
        { f: `H${currentRowIdx}-I${currentRowIdx}` },
        { f: `IF(I${currentRowIdx}>0, (H${currentRowIdx}-I${currentRowIdx})/I${currentRowIdx}, IF(H${currentRowIdx}>0, 1, 0))` },
        artStockN,
      ];
      wsData.push(artRow);
      currentRowIdx++;
    });
  });

  // Grand Total Row with SUM formulas over the Calibre rows
  const calibresSumFormula = (colLetter: string) => {
    if (calibreRowIndices.length === 0) return '0';
    return calibreRowIndices.map((idx) => `${colLetter}${idx}`).join('+');
  };

  const totalRowIdx = currentRowIdx;
  const totalRow: any[] = [
    'TOTAL GÉNÉRAL',
    '',
    metricMode === 'VAL' ? 'kDA' : 'PCE',
    { f: calibresSumFormula('D') },
    { f: calibresSumFormula('E') },
    { f: `D${totalRowIdx}-E${totalRowIdx}` },
    { f: `IF(E${totalRowIdx}>0, (D${totalRowIdx}-E${totalRowIdx})/E${totalRowIdx}, IF(D${totalRowIdx}>0, 1, 0))` },
    { f: calibresSumFormula('H') },
    { f: calibresSumFormula('I') },
    { f: `H${totalRowIdx}-I${totalRowIdx}` },
    { f: `IF(I${totalRowIdx}>0, (H${totalRowIdx}-I${totalRowIdx})/I${totalRowIdx}, IF(H${totalRowIdx}>0, 1, 0))` },
    { f: calibresSumFormula('L') },
  ];

  wsData.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 38 }, // Calibre / Designation
    { wch: 14 }, // Code Article
    { wch: 8 },  // Unite
    { wch: 16 }, // Month N
    { wch: 16 }, // Month N-1
    { wch: 14 }, // Ecart Month
    { wch: 14 }, // Evol % Month
    { wch: 16 }, // Cumul N
    { wch: 16 }, // Cumul N-1
    { wch: 14 }, // Ecart Cumul
    { wch: 14 }, // Evol % Cumul
    { wch: 16 }, // Stock N
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Comparatif ${yearN} vs ${yearN1}`);
  XLSX.writeFile(wb, actualFilename);
}
