import React, { useState, useMemo, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Download,
  Copy,
  Camera,
  Check,
  Calendar,
  Layers,
  Factory,
  Boxes,
  Percent,
  DollarSign,
  Package,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ProductionMonthlyRecord,
  ProductionComparativeSummary,
  ProductionComparativeGroup,
  ProductionComparativeArticle,
} from '../types';
import {
  formatNumber,
  formatKDA,
  toKDA,
  getMonthName,
  getAvailableYears,
  getAvailableMonthsForYear,
  aggregateComparativeProduction,
} from '../utils/productionUtils';
import { copyTableDataToWord, WordTableData, WordTableRow, WordTableCell } from '../utils/wordExportUtils';
import { copyElementAsImage } from '../utils/imageExportUtils';
import { exportComparativeProductionToExcel } from '../utils/excelProductionExport';

interface ProductionComparativeTableProps {
  records: ProductionMonthlyRecord[];
  displayMode?: 'SENIOR' | 'STANDARD';
}

export const ProductionComparativeTable: React.FC<ProductionComparativeTableProps> = ({
  records,
  displayMode = 'SENIOR',
}) => {
  const isSenior = displayMode === 'SENIOR';
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic available years
  const availableYears = useMemo(() => getAvailableYears(records), [records]);

  // Active Year N and Compare Year N-1
  const [selectedYearN, setSelectedYearN] = useState<number>(() => {
    return availableYears[0] || new Date().getFullYear();
  });

  const [selectedYearN1, setSelectedYearN1] = useState<number>(() => {
    return availableYears.length > 1 ? availableYears[1] : (availableYears[0] ? availableYears[0] - 1 : new Date().getFullYear() - 1);
  });

  // Available months for Year N
  const availableMonthsN = useMemo(() => {
    return getAvailableMonthsForYear(records, selectedYearN);
  }, [records, selectedYearN]);

  // Selected cutoff month (defaults to latest available in Year N)
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(() => {
    if (availableMonthsN.length > 0) {
      return availableMonthsN[availableMonthsN.length - 1].monthNum;
    }
    return new Date().getMonth() + 1;
  });

  // Sync cutoff month when Year N changes if current selection has no data
  React.useEffect(() => {
    if (availableMonthsN.length > 0) {
      const exists = availableMonthsN.some((m) => m.monthNum === selectedMonthNum);
      if (!exists) {
        setSelectedMonthNum(availableMonthsN[availableMonthsN.length - 1].monthNum);
      }
    }
  }, [availableMonthsN, selectedMonthNum]);

  // Metric Mode: 'QTE' (Pièces) vs 'VAL' (kDA) vs 'BOTH' (Mixed)
  const [metricMode, setMetricMode] = useState<'QTE' | 'VAL' | 'BOTH'>('QTE');

  // Search filter & expanded groups
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'DN 15': false,
    'DN 15 (Export)': false,
  });

  // Copy success states
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [imageSuccess, setImageSuccess] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Toggle group expansion
  const toggleGroup = (diam: string) => {
    setExpandedGroups((prev) => ({ ...prev, [diam]: !prev[diam] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    summary.groups.forEach((g) => {
      all[g.famille_diametre] = true;
    });
    setExpandedGroups(all);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  // Comparative Aggregated Summary
  const summary: ProductionComparativeSummary = useMemo(() => {
    return aggregateComparativeProduction(records, selectedYearN, selectedYearN1, selectedMonthNum);
  }, [records, selectedYearN, selectedYearN1, selectedMonthNum]);

  // Filter groups according to search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return summary.groups;
    const q = searchQuery.toLowerCase().trim();
    return summary.groups
      .map((g) => {
        const matchesGroup = g.famille_diametre.toLowerCase().includes(q);
        const matchedArticles = g.articles.filter(
          (a) =>
            a.code_article.toLowerCase().includes(q) ||
            a.designation.toLowerCase().includes(q) ||
            a.famille_diametre.toLowerCase().includes(q)
        );
        if (matchesGroup) return g;
        if (matchedArticles.length > 0) {
          return { ...g, articles: matchedArticles };
        }
        return null;
      })
      .filter((g): g is ProductionComparativeGroup => g !== null);
  }, [summary.groups, searchQuery]);

  // Copy to Word / Excel with relative formulas
  const handleCopyWordExcel = async () => {
    const monthName = getMonthName(selectedMonthNum);
    const title = `SUIVI COMPARATIF DE PRODUCTION : EXERCICE ${selectedYearN} VS ${selectedYearN1}`;
    const subtitle = `Arrêté au mois de ${monthName} (Mois ${selectedMonthNum}) - Unités : ${metricMode === 'VAL' ? 'kDA' : 'Pièces'}`;

    const isVal = metricMode === 'VAL';

    const headerRows: WordTableRow[] = [
      {
        bg: '#0f172a',
        cells: [
          { text: 'Désignation & Calibre', colSpan: 2, align: 'left', bg: '#0f172a', color: '#ffffff', bold: true },
          { text: `MOIS DE ${monthName.toUpperCase()} (${selectedYearN} VS ${selectedYearN1})`, colSpan: 4, align: 'center', bg: '#1e3a8a', color: '#ffffff', bold: true },
          { text: `CUMUL ANNUEL YTD (${selectedYearN} VS ${selectedYearN1})`, colSpan: 4, align: 'center', bg: '#065f46', color: '#ffffff', bold: true },
          { text: `STOCK CLÔTURE`, colSpan: 1, align: 'center', bg: '#334155', color: '#ffffff', bold: true },
        ],
      },
      {
        bg: '#1e293b',
        cells: [
          { text: 'Calibre / Modèle', align: 'left', bg: '#1e293b', color: '#ffffff', bold: true },
          { text: 'Unité', align: 'center', bg: '#1e293b', color: '#ffffff', bold: true },
          // Month
          { text: `${monthName} ${selectedYearN}`, align: 'right', bg: '#1e3a8a', color: '#ffffff', bold: true },
          { text: `${monthName} ${selectedYearN1}`, align: 'right', bg: '#1e3a8a', color: '#ffffff', bold: true },
          { text: 'Écart (Δ)', align: 'right', bg: '#1e3a8a', color: '#ffffff', bold: true },
          { text: 'Évol. %', align: 'right', bg: '#1e3a8a', color: '#ffffff', bold: true },
          // Cumul
          { text: `Cumul ${selectedYearN}`, align: 'right', bg: '#065f46', color: '#ffffff', bold: true },
          { text: `Cumul ${selectedYearN1}`, align: 'right', bg: '#065f46', color: '#ffffff', bold: true },
          { text: 'Écart (Δ)', align: 'right', bg: '#065f46', color: '#ffffff', bold: true },
          { text: 'Évol. %', align: 'right', bg: '#065f46', color: '#ffffff', bold: true },
          // Stock
          { text: `Stock ${selectedYearN}`, align: 'right', bg: '#334155', color: '#ffffff', bold: true },
        ],
      },
    ];

    const bodyRows: WordTableRow[] = [];

    summary.groups.forEach((grp, gIdx) => {
      const gMonthN = isVal ? toKDA(grp.val.month_val_N) : grp.qte.month_val_N;
      const gMonthN1 = isVal ? toKDA(grp.val.month_val_N1) : grp.qte.month_val_N1;
      const gMonthDiff = isVal ? toKDA(grp.val.month_diff) : grp.qte.month_diff;
      const gMonthPct = isVal ? grp.val.month_growth_pct : grp.qte.month_growth_pct;

      const gCumulN = isVal ? toKDA(grp.val.cumul_val_N) : grp.qte.cumul_val_N;
      const gCumulN1 = isVal ? toKDA(grp.val.cumul_val_N1) : grp.qte.cumul_val_N1;
      const gCumulDiff = isVal ? toKDA(grp.val.cumul_diff) : grp.qte.cumul_diff;
      const gCumulPct = isVal ? grp.val.cumul_growth_pct : grp.qte.cumul_growth_pct;

      const gStockN = isVal ? toKDA(grp.stock_val_N) : grp.stock_qte_N;

      const groupRowBg = gIdx % 2 === 0 ? '#f1f5f9' : '#ffffff';

      bodyRows.push({
        bg: groupRowBg,
        bold: true,
        cells: [
          { text: grp.famille_diametre, align: 'left', bold: true },
          { text: isVal ? 'kDA' : 'PCE', align: 'center' },
          // Month
          { text: isVal ? formatKDA(grp.val.month_val_N) : formatNumber(gMonthN), align: 'right', bold: true, rawNum: gMonthN },
          { text: isVal ? formatKDA(grp.val.month_val_N1) : formatNumber(gMonthN1), align: 'right', rawNum: gMonthN1 },
          { text: (gMonthDiff > 0 ? '+' : '') + (isVal ? formatKDA(grp.val.month_diff) : formatNumber(gMonthDiff)), align: 'right', bold: true, rawNum: gMonthDiff, excelFormula: '=RC[-2]-RC[-1]' },
          { text: `${gMonthPct > 0 ? '+' : ''}${gMonthPct.toFixed(1)} %`, align: 'right', bold: true, rawNum: gMonthPct / 100, excelFormula: '=IF(RC[-2]>0, (RC[-3]-RC[-2])/RC[-2], IF(RC[-3]>0, 1, 0))' },
          // Cumul
          { text: isVal ? formatKDA(grp.val.cumul_val_N) : formatNumber(gCumulN), align: 'right', bold: true, rawNum: gCumulN },
          { text: isVal ? formatKDA(grp.val.cumul_val_N1) : formatNumber(gCumulN1), align: 'right', rawNum: gCumulN1 },
          { text: (gCumulDiff > 0 ? '+' : '') + (isVal ? formatKDA(grp.val.cumul_diff) : formatNumber(gCumulDiff)), align: 'right', bold: true, rawNum: gCumulDiff, excelFormula: '=RC[-2]-RC[-1]' },
          { text: `${gCumulPct > 0 ? '+' : ''}${gCumulPct.toFixed(1)} %`, align: 'right', bold: true, rawNum: gCumulPct / 100, excelFormula: '=IF(RC[-2]>0, (RC[-3]-RC[-2])/RC[-2], IF(RC[-3]>0, 1, 0))' },
          // Stock
          { text: isVal ? formatKDA(grp.stock_val_N) : formatNumber(gStockN), align: 'right', bold: true, rawNum: gStockN },
        ],
      });

      // Include sub articles if expanded
      if (expandedGroups[grp.famille_diametre]) {
        grp.articles.forEach((art) => {
          const aMonthN = isVal ? toKDA(art.val.month_val_N) : art.qte.month_val_N;
          const aMonthN1 = isVal ? toKDA(art.val.month_val_N1) : art.qte.month_val_N1;
          const aMonthDiff = isVal ? toKDA(art.val.month_diff) : art.qte.month_diff;
          const aMonthPct = isVal ? art.val.month_growth_pct : art.qte.month_growth_pct;

          const aCumulN = isVal ? toKDA(art.val.cumul_val_N) : art.qte.cumul_val_N;
          const aCumulN1 = isVal ? toKDA(art.val.cumul_val_N1) : art.qte.cumul_val_N1;
          const aCumulDiff = isVal ? toKDA(art.val.cumul_diff) : art.qte.cumul_diff;
          const aCumulPct = isVal ? art.val.cumul_growth_pct : art.qte.cumul_growth_pct;

          const aStockN = isVal ? toKDA(art.stock_val_N) : art.stock_qte_N;

          bodyRows.push({
            bg: '#ffffff',
            cells: [
              { text: `  ↳ ${art.designation} (${art.code_article})`, align: 'left', color: '#475569' },
              { text: art.unite || (isVal ? 'kDA' : 'PCE'), align: 'center', color: '#64748b' },
              // Month
              { text: isVal ? formatKDA(art.val.month_val_N) : formatNumber(aMonthN), align: 'right', rawNum: aMonthN },
              { text: isVal ? formatKDA(art.val.month_val_N1) : formatNumber(aMonthN1), align: 'right', color: '#64748b', rawNum: aMonthN1 },
              { text: (aMonthDiff > 0 ? '+' : '') + (isVal ? formatKDA(art.val.month_diff) : formatNumber(aMonthDiff)), align: 'right', rawNum: aMonthDiff, excelFormula: '=RC[-2]-RC[-1]' },
              { text: `${aMonthPct > 0 ? '+' : ''}${aMonthPct.toFixed(1)} %`, align: 'right', rawNum: aMonthPct / 100, excelFormula: '=IF(RC[-2]>0, (RC[-3]-RC[-2])/RC[-2], IF(RC[-3]>0, 1, 0))' },
              // Cumul
              { text: isVal ? formatKDA(art.val.cumul_val_N) : formatNumber(aCumulN), align: 'right', rawNum: aCumulN },
              { text: isVal ? formatKDA(art.val.cumul_val_N1) : formatNumber(aCumulN1), align: 'right', color: '#64748b', rawNum: aCumulN1 },
              { text: (aCumulDiff > 0 ? '+' : '') + (isVal ? formatKDA(art.val.cumul_diff) : formatNumber(aCumulDiff)), align: 'right', rawNum: aCumulDiff, excelFormula: '=RC[-2]-RC[-1]' },
              { text: `${aCumulPct > 0 ? '+' : ''}${aCumulPct.toFixed(1)} %`, align: 'right', rawNum: aCumulPct / 100, excelFormula: '=IF(RC[-2]>0, (RC[-3]-RC[-2])/RC[-2], IF(RC[-3]>0, 1, 0))' },
              // Stock
              { text: isVal ? formatKDA(art.stock_val_N) : formatNumber(aStockN), align: 'right', color: '#64748b', rawNum: aStockN },
            ],
          });
        });
      }
    });

    // Grand Totals
    const tMonthN = isVal ? toKDA(summary.totals.val.month_val_N) : summary.totals.qte.month_val_N;
    const tMonthN1 = isVal ? toKDA(summary.totals.val.month_val_N1) : summary.totals.qte.month_val_N1;
    const tMonthDiff = isVal ? toKDA(summary.totals.val.month_diff) : summary.totals.qte.month_diff;
    const tMonthPct = isVal ? summary.totals.val.month_growth_pct : summary.totals.qte.month_growth_pct;

    const tCumulN = isVal ? toKDA(summary.totals.val.cumul_val_N) : summary.totals.qte.cumul_val_N;
    const tCumulN1 = isVal ? toKDA(summary.totals.val.cumul_val_N1) : summary.totals.qte.cumul_val_N1;
    const tCumulDiff = isVal ? toKDA(summary.totals.val.cumul_diff) : summary.totals.qte.cumul_diff;
    const tCumulPct = isVal ? summary.totals.val.cumul_growth_pct : summary.totals.qte.cumul_growth_pct;

    const tStockN = isVal ? toKDA(summary.totals.stock_val_N) : summary.totals.stock_qte_N;

    const footerRows: WordTableRow[] = [
      {
        bg: '#0f172a',
        cells: [
          { text: 'TOTAL GÉNÉRAL', align: 'left', bg: '#0f172a', color: '#ffffff', bold: true },
          { text: isVal ? 'kDA' : 'PCE', align: 'center', bg: '#0f172a', color: '#94a3b8', bold: true },
          // Month
          { text: isVal ? formatKDA(summary.totals.val.month_val_N) : formatNumber(tMonthN), align: 'right', bg: '#0f172a', color: '#38bdf8', bold: true, rawNum: tMonthN },
          { text: isVal ? formatKDA(summary.totals.val.month_val_N1) : formatNumber(tMonthN1), align: 'right', bg: '#0f172a', color: '#cbd5e1', bold: true, rawNum: tMonthN1 },
          { text: (tMonthDiff > 0 ? '+' : '') + (isVal ? formatKDA(summary.totals.val.month_diff) : formatNumber(tMonthDiff)), align: 'right', bg: '#0f172a', color: tMonthDiff >= 0 ? '#4ade80' : '#f87171', bold: true, rawNum: tMonthDiff, excelFormula: '=RC[-2]-RC[-1]' },
          { text: `${tMonthPct > 0 ? '+' : ''}${tMonthPct.toFixed(1)} %`, align: 'right', bg: '#0f172a', color: tMonthPct >= 0 ? '#4ade80' : '#f87171', bold: true, rawNum: tMonthPct / 100, excelFormula: '=IF(RC[-2]>0, (RC[-3]-RC[-2])/RC[-2], IF(RC[-3]>0, 1, 0))' },
          // Cumul
          { text: isVal ? formatKDA(summary.totals.val.cumul_val_N) : formatNumber(tCumulN), align: 'right', bg: '#0f172a', color: '#34d399', bold: true, rawNum: tCumulN },
          { text: isVal ? formatKDA(summary.totals.val.cumul_val_N1) : formatNumber(tCumulN1), align: 'right', bg: '#0f172a', color: '#cbd5e1', bold: true, rawNum: tCumulN1 },
          { text: (tCumulDiff > 0 ? '+' : '') + (isVal ? formatKDA(summary.totals.val.cumul_diff) : formatNumber(tCumulDiff)), align: 'right', bg: '#0f172a', color: tCumulDiff >= 0 ? '#4ade80' : '#f87171', bold: true, rawNum: tCumulDiff, excelFormula: '=RC[-2]-RC[-1]' },
          { text: `${tCumulPct > 0 ? '+' : ''}${tCumulPct.toFixed(1)} %`, align: 'right', bg: '#0f172a', color: tCumulPct >= 0 ? '#4ade80' : '#f87171', bold: true, rawNum: tCumulPct / 100, excelFormula: '=IF(RC[-2]>0, (RC[-3]-RC[-2])/RC[-2], IF(RC[-3]>0, 1, 0))' },
          // Stock
          { text: isVal ? formatKDA(summary.totals.stock_val_N) : formatNumber(tStockN), align: 'right', bg: '#0f172a', color: '#fcd34d', bold: true, rawNum: tStockN },
        ],
      },
    ];

    const tableData: WordTableData = {
      title,
      subtitle,
      orientation: 'portrait',
      headerRows,
      bodyRows,
      footerRows,
    };

    const ok = await copyTableDataToWord(tableData);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  // Copy Image snapshot
  const handleCopyImage = async () => {
    if (!tableContainerRef.current) return;
    setIsCapturing(true);
    const ok = await copyElementAsImage(tableContainerRef.current);
    setIsCapturing(false);
    if (ok) {
      setImageSuccess(true);
      setTimeout(() => setImageSuccess(false), 3000);
    }
  };

  // Export native Excel file
  const handleExportExcel = () => {
    exportComparativeProductionToExcel(summary, metricMode);
  };

  const monthName = getMonthName(selectedMonthNum);

  return (
    <div className="space-y-6">
      {/* Control Bar & Filter Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Year & Month Selection Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Year N */}
            <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <Calendar size={16} className="text-sky-400" />
              <span className="text-xs font-semibold text-slate-400">Année (N) :</span>
              <select
                value={selectedYearN}
                onChange={(e) => setSelectedYearN(Number(e.target.value))}
                className="bg-slate-900 text-white font-bold text-sm px-2 py-1 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Compare Year N-1 */}
            <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <TrendingUp size={16} className="text-emerald-400" />
              <span className="text-xs font-semibold text-slate-400">Comparer à (N-1) :</span>
              <select
                value={selectedYearN1}
                onChange={(e) => setSelectedYearN1(Number(e.target.value))}
                className="bg-slate-900 text-white font-bold text-sm px-2 py-1 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
                {!availableYears.includes(selectedYearN - 1) && (
                  <option value={selectedYearN - 1}>{selectedYearN - 1} (Théorique)</option>
                )}
              </select>
            </div>

            {/* Reference Cutoff Month */}
            <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-xs font-semibold text-slate-400">Mois d'Arrêté :</span>
              <select
                value={selectedMonthNum}
                onChange={(e) => setSelectedMonthNum(Number(e.target.value))}
                className="bg-slate-900 text-white font-bold text-sm px-2 py-1 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {availableMonthsN.length > 0 ? (
                  availableMonthsN.map((m) => (
                    <option key={m.monthNum} value={m.monthNum}>
                      {m.label}
                    </option>
                  ))
                ) : (
                  Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)} ({String(m).padStart(2, '0')})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Metric Selector & Expand Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Metric Mode buttons */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setMetricMode('QTE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  metricMode === 'QTE'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package size={14} />
                <span>Quantités (Pièces)</span>
              </button>
              <button
                onClick={() => setMetricMode('VAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  metricMode === 'VAL'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign size={14} />
                <span>Valeurs (kDA)</span>
              </button>
            </div>

            {/* Expand / Collapse all */}
            <div className="flex items-center space-x-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={expandAll}
                className="px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
                title="Déplier tous les calibres"
              >
                Tout Déplier
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
                title="Replier tous les calibres"
              >
                Tout Replier
              </button>
            </div>

            {/* Export Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyWordExcel}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg transition"
                title="Copier avec formules actives pour Word & Excel"
              >
                {copySuccess ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                <span>{copySuccess ? 'Copié avec Formules !' : 'Copier Word / Excel'}</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg transition"
                title="Télécharger fichier Excel .xlsx avec formules actives"
              >
                <Download size={14} />
                <span>Excel (.xlsx)</span>
              </button>

              <button
                onClick={handleCopyImage}
                disabled={isCapturing}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-600/90 hover:bg-purple-600 text-white rounded-xl text-xs font-bold shadow-lg transition"
                title="Capturer le tableau en image HD"
              >
                {imageSuccess ? <Check size={14} className="text-emerald-300" /> : <Camera size={14} />}
                <span>{imageSuccess ? 'Image Copiée !' : 'Capture Image'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un calibre (ex: DN 15, DN 50) ou article..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <span className="font-semibold text-slate-300">Formules Excel :</span>
            <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-md font-mono text-[11px]">
              Active R1C1 & Diff/Sum Live
            </span>
          </div>
        </div>
      </div>

      {/* Top Comparative KPI Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Month N vs N-1 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Mois {monthName}</span>
            <span className="text-xs px-2 py-0.5 bg-sky-950 text-sky-300 rounded-full font-mono font-bold">
              {selectedYearN} vs {selectedYearN1}
            </span>
          </div>
          <div className="my-1">
            <div className="text-2xl font-black text-white">
              {metricMode === 'VAL'
                ? formatKDA(summary.totals.val.month_val_N)
                : formatNumber(summary.totals.qte.month_val_N) + ' PCE'}
            </div>
            <div className="text-xs text-slate-400">
              vs {metricMode === 'VAL' ? formatKDA(summary.totals.val.month_val_N1) : formatNumber(summary.totals.qte.month_val_N1) + ' PCE'} ({selectedYearN1})
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Évolution Mensuelle :</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${
                (metricMode === 'VAL' ? summary.totals.val.month_growth_pct : summary.totals.qte.month_growth_pct) >= 0
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                  : 'bg-rose-950 text-rose-400 border border-rose-800/80'
              }`}
            >
              {(metricMode === 'VAL' ? summary.totals.val.month_growth_pct : summary.totals.qte.month_growth_pct) >= 0 ? (
                <TrendingUp size={12} className="mr-1" />
              ) : (
                <TrendingDown size={12} className="mr-1" />
              )}
              {((metricMode === 'VAL' ? summary.totals.val.month_growth_pct : summary.totals.qte.month_growth_pct) >= 0 ? '+' : '') +
                (metricMode === 'VAL' ? summary.totals.val.month_growth_pct : summary.totals.qte.month_growth_pct).toFixed(1)} %
            </span>
          </div>
        </div>

        {/* Cumul YTD N vs N-1 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Cumul YTD (Jan-{monthName})</span>
            <span className="text-xs px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded-full font-mono font-bold">
              {selectedYearN} vs {selectedYearN1}
            </span>
          </div>
          <div className="my-1">
            <div className="text-2xl font-black text-white">
              {metricMode === 'VAL'
                ? formatKDA(summary.totals.val.cumul_val_N)
                : formatNumber(summary.totals.qte.cumul_val_N) + ' PCE'}
            </div>
            <div className="text-xs text-slate-400">
              vs {metricMode === 'VAL' ? formatKDA(summary.totals.val.cumul_val_N1) : formatNumber(summary.totals.qte.cumul_val_N1) + ' PCE'} ({selectedYearN1})
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Évolution Cumulée :</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${
                (metricMode === 'VAL' ? summary.totals.val.cumul_growth_pct : summary.totals.qte.cumul_growth_pct) >= 0
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                  : 'bg-rose-950 text-rose-400 border border-rose-800/80'
              }`}
            >
              {(metricMode === 'VAL' ? summary.totals.val.cumul_growth_pct : summary.totals.qte.cumul_growth_pct) >= 0 ? (
                <TrendingUp size={12} className="mr-1" />
              ) : (
                <TrendingDown size={12} className="mr-1" />
              )}
              {((metricMode === 'VAL' ? summary.totals.val.cumul_growth_pct : summary.totals.qte.cumul_growth_pct) >= 0 ? '+' : '') +
                (metricMode === 'VAL' ? summary.totals.val.cumul_growth_pct : summary.totals.qte.cumul_growth_pct).toFixed(1)} %
            </span>
          </div>
        </div>

        {/* Écart Volume / Valeur Absolu */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Écart YTD Net (Δ)</span>
            <span className="text-xs px-2 py-0.5 bg-purple-950 text-purple-300 rounded-full font-mono font-bold">
              Gain / Perte
            </span>
          </div>
          <div className="my-1">
            <div
              className={`text-2xl font-black ${
                (metricMode === 'VAL' ? summary.totals.val.cumul_diff : summary.totals.qte.cumul_diff) >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {((metricMode === 'VAL' ? summary.totals.val.cumul_diff : summary.totals.qte.cumul_diff) >= 0 ? '+' : '') +
                (metricMode === 'VAL'
                  ? formatKDA(summary.totals.val.cumul_diff)
                  : formatNumber(summary.totals.qte.cumul_diff) + ' PCE')}
            </div>
            <div className="text-xs text-slate-400">
              Différence brute de production cumulée
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Écart Mois Net :</span>
            <span className="font-bold text-slate-200">
              {((metricMode === 'VAL' ? summary.totals.val.month_diff : summary.totals.qte.month_diff) >= 0 ? '+' : '') +
                (metricMode === 'VAL'
                  ? formatKDA(summary.totals.val.month_diff)
                  : formatNumber(summary.totals.qte.month_diff) + ' PCE')}
            </span>
          </div>
        </div>

        {/* Closing Inventory N */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Stock Fin {monthName} {selectedYearN}</span>
            <Boxes size={16} className="text-amber-400" />
          </div>
          <div className="my-1">
            <div className="text-2xl font-black text-amber-300">
              {metricMode === 'VAL'
                ? formatKDA(summary.totals.stock_val_N)
                : formatNumber(summary.totals.stock_qte_N) + ' PCE'}
            </div>
            <div className="text-xs text-slate-400">
              Valorisation : {formatKDA(summary.totals.stock_val_N)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Articles Actifs :</span>
            <span className="font-bold text-slate-200">{summary.groups.reduce((acc, g) => acc + g.modelCount, 0)} modèles</span>
          </div>
        </div>
      </div>

      {/* Main Comparative Data Table Container */}
      <div
        ref={tableContainerRef}
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
              <Factory size={20} />
            </div>
            <div>
              <h3 className={`font-black text-white ${isSenior ? 'text-lg' : 'text-base'}`}>
                Comparatif de Production : {selectedYearN} vs {selectedYearN1} (Mois & Cumul)
              </h3>
              <p className="text-xs text-slate-400">
                Arrêté au mois de <strong className="text-sky-300">{monthName}</strong> • Données regroupées par Calibre et décomposables par Article
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-400">Affichage :</span>
            <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg font-mono font-semibold border border-slate-700">
              {metricMode === 'VAL' ? 'Valeurs en kDA' : 'Quantités en Pièces (PCE)'}
            </span>
          </div>
        </div>

        {/* Table Overflow Wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {/* Super Header Row */}
              <tr className="bg-slate-950 text-white text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-4 font-black w-72" colSpan={2}>
                  Calibre & Désignation des Compteurs
                </th>
                <th
                  className="py-3 px-3 text-center font-black bg-blue-950/60 text-blue-300 border-l border-r border-blue-900/50"
                  colSpan={4}
                >
                  Mois de {monthName.toUpperCase()} ({selectedYearN} vs {selectedYearN1})
                </th>
                <th
                  className="py-3 px-3 text-center font-black bg-emerald-950/60 text-emerald-300 border-r border-emerald-900/50"
                  colSpan={4}
                >
                  Cumul Annuel YTD ({selectedYearN} vs {selectedYearN1})
                </th>
                <th className="py-3 px-3 text-right font-black bg-slate-800/60 text-amber-300">
                  Stock Clôture
                </th>
              </tr>

              {/* Sub-Header Row */}
              <tr className="bg-slate-900/90 text-slate-300 text-xs font-bold border-b border-slate-700">
                <th className="py-2.5 px-4">Calibre / Article</th>
                <th className="py-2.5 px-2 text-center w-16 text-slate-400">Unité</th>

                {/* Month columns */}
                <th className="py-2.5 px-3 text-right bg-blue-950/30 text-sky-300 border-l border-slate-800">
                  {monthName} {selectedYearN}
                </th>
                <th className="py-2.5 px-3 text-right bg-blue-950/30 text-slate-400">
                  {monthName} {selectedYearN1}
                </th>
                <th className="py-2.5 px-3 text-right bg-blue-950/30 text-slate-300">
                  Écart (Δ)
                </th>
                <th className="py-2.5 px-3 text-right bg-blue-950/30 text-sky-200 border-r border-slate-800">
                  Évol. (%)
                </th>

                {/* Cumul columns */}
                <th className="py-2.5 px-3 text-right bg-emerald-950/30 text-emerald-300">
                  Cumul {selectedYearN}
                </th>
                <th className="py-2.5 px-3 text-right bg-emerald-950/30 text-slate-400">
                  Cumul {selectedYearN1}
                </th>
                <th className="py-2.5 px-3 text-right bg-emerald-950/30 text-slate-300">
                  Écart (Δ)
                </th>
                <th className="py-2.5 px-3 text-right bg-emerald-950/30 text-emerald-200 border-r border-slate-800">
                  Évol. (%)
                </th>

                {/* Stock column */}
                <th className="py-2.5 px-4 text-right bg-slate-800/40 text-amber-300">
                  Stock {selectedYearN}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 text-slate-200 text-xs">
              {filteredGroups.map((grp, gIdx) => {
                const isExpanded = !!expandedGroups[grp.famille_diametre];
                const isVal = metricMode === 'VAL';

                const gMonthN = isVal ? toKDA(grp.val.month_val_N) : grp.qte.month_val_N;
                const gMonthN1 = isVal ? toKDA(grp.val.month_val_N1) : grp.qte.month_val_N1;
                const gMonthDiff = isVal ? toKDA(grp.val.month_diff) : grp.qte.month_diff;
                const gMonthPct = isVal ? grp.val.month_growth_pct : grp.qte.month_growth_pct;

                const gCumulN = isVal ? toKDA(grp.val.cumul_val_N) : grp.qte.cumul_val_N;
                const gCumulN1 = isVal ? toKDA(grp.val.cumul_val_N1) : grp.qte.cumul_val_N1;
                const gCumulDiff = isVal ? toKDA(grp.val.cumul_diff) : grp.qte.cumul_diff;
                const gCumulPct = isVal ? grp.val.cumul_growth_pct : grp.qte.cumul_growth_pct;

                const gStockN = isVal ? toKDA(grp.stock_val_N) : grp.stock_qte_N;

                return (
                  <React.Fragment key={grp.famille_diametre}>
                    {/* Calibre Group Row */}
                    <tr
                      onClick={() => toggleGroup(grp.famille_diametre)}
                      className={`cursor-pointer transition-colors ${
                        gIdx % 2 === 0 ? 'bg-slate-900/70 hover:bg-slate-800/80' : 'bg-slate-850/50 hover:bg-slate-800/80'
                      }`}
                    >
                      {/* Name with expander */}
                      <td className="py-3 px-4 font-black text-white flex items-center space-x-2">
                        <span className="text-sky-400">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                        <span className={`${isSenior ? 'text-sm' : 'text-xs'} tracking-wide`}>
                          {grp.famille_diametre}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5 px-1.5 py-0.5 bg-slate-800 rounded">
                          {grp.modelCount} mod.
                        </span>
                      </td>

                      <td className="py-3 px-2 text-center text-slate-400 font-mono text-[11px]">
                        {isVal ? 'kDA' : 'PCE'}
                      </td>

                      {/* Month N */}
                      <td className="py-3 px-3 text-right font-black text-sky-300 border-l border-slate-800/80">
                        {isVal ? formatKDA(grp.val.month_val_N) : formatNumber(gMonthN)}
                      </td>
                      {/* Month N-1 */}
                      <td className="py-3 px-3 text-right text-slate-400">
                        {isVal ? formatKDA(grp.val.month_val_N1) : formatNumber(gMonthN1)}
                      </td>
                      {/* Month Diff */}
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={gMonthDiff > 0 ? 'text-emerald-400' : gMonthDiff < 0 ? 'text-rose-400' : 'text-slate-400'}>
                          {(gMonthDiff > 0 ? '+' : '') + (isVal ? formatKDA(grp.val.month_diff) : formatNumber(gMonthDiff))}
                        </span>
                      </td>
                      {/* Month % */}
                      <td className="py-3 px-3 text-right border-r border-slate-800/80">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-black ${
                            gMonthPct > 0
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                              : gMonthPct < 0
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {gMonthPct > 0 ? '+' : ''}{gMonthPct.toFixed(1)} %
                        </span>
                      </td>

                      {/* Cumul N */}
                      <td className="py-3 px-3 text-right font-black text-emerald-300">
                        {isVal ? formatKDA(grp.val.cumul_val_N) : formatNumber(gCumulN)}
                      </td>
                      {/* Cumul N-1 */}
                      <td className="py-3 px-3 text-right text-slate-400">
                        {isVal ? formatKDA(grp.val.cumul_val_N1) : formatNumber(gCumulN1)}
                      </td>
                      {/* Cumul Diff */}
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={gCumulDiff > 0 ? 'text-emerald-400' : gCumulDiff < 0 ? 'text-rose-400' : 'text-slate-400'}>
                          {(gCumulDiff > 0 ? '+' : '') + (isVal ? formatKDA(grp.val.cumul_diff) : formatNumber(gCumulDiff))}
                        </span>
                      </td>
                      {/* Cumul % */}
                      <td className="py-3 px-3 text-right border-r border-slate-800/80">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-black ${
                            gCumulPct > 0
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                              : gCumulPct < 0
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {gCumulPct > 0 ? '+' : ''}{gCumulPct.toFixed(1)} %
                        </span>
                      </td>

                      {/* Stock N */}
                      <td className="py-3 px-4 text-right font-black text-amber-300 bg-slate-900/40">
                        {isVal ? formatKDA(grp.stock_val_N) : formatNumber(gStockN)}
                      </td>
                    </tr>

                    {/* Sub-Articles (Drill-down rows) */}
                    {isExpanded &&
                      grp.articles.map((art) => {
                        const aMonthN = isVal ? toKDA(art.val.month_val_N) : art.qte.month_val_N;
                        const aMonthN1 = isVal ? toKDA(art.val.month_val_N1) : art.qte.month_val_N1;
                        const aMonthDiff = isVal ? toKDA(art.val.month_diff) : art.qte.month_diff;
                        const aMonthPct = isVal ? art.val.month_growth_pct : art.qte.month_growth_pct;

                        const aCumulN = isVal ? toKDA(art.val.cumul_val_N) : art.qte.cumul_val_N;
                        const aCumulN1 = isVal ? toKDA(art.val.cumul_val_N1) : art.qte.cumul_val_N1;
                        const aCumulDiff = isVal ? toKDA(art.val.cumul_diff) : art.qte.cumul_diff;
                        const aCumulPct = isVal ? art.val.cumul_growth_pct : art.qte.cumul_growth_pct;

                        const aStockN = isVal ? toKDA(art.stock_val_N) : art.stock_qte_N;

                        return (
                          <tr
                            key={art.code_article}
                            className="bg-slate-950/70 hover:bg-slate-900/90 text-slate-300 text-[11px] border-b border-slate-850"
                          >
                            <td className="py-2 pl-9 pr-3 text-slate-300">
                              <div className="font-semibold text-white/90">{art.designation}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{art.code_article}</div>
                            </td>

                            <td className="py-2 px-2 text-center text-slate-500 font-mono">
                              {art.unite || (isVal ? 'kDA' : 'PCE')}
                            </td>

                            {/* Month N */}
                            <td className="py-2 px-3 text-right text-sky-200/90 border-l border-slate-800">
                              {isVal ? formatKDA(art.val.month_val_N) : formatNumber(aMonthN)}
                            </td>
                            {/* Month N-1 */}
                            <td className="py-2 px-3 text-right text-slate-500">
                              {isVal ? formatKDA(art.val.month_val_N1) : formatNumber(aMonthN1)}
                            </td>
                            {/* Month Diff */}
                            <td className="py-2 px-3 text-right">
                              <span className={aMonthDiff > 0 ? 'text-emerald-400/90' : aMonthDiff < 0 ? 'text-rose-400/90' : 'text-slate-500'}>
                                {(aMonthDiff > 0 ? '+' : '') + (isVal ? formatKDA(art.val.month_diff) : formatNumber(aMonthDiff))}
                              </span>
                            </td>
                            {/* Month % */}
                            <td className="py-2 px-3 text-right border-r border-slate-800">
                              <span className={`text-[10px] font-bold ${aMonthPct > 0 ? 'text-emerald-400' : aMonthPct < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                {aMonthPct > 0 ? '+' : ''}{aMonthPct.toFixed(1)} %
                              </span>
                            </td>

                            {/* Cumul N */}
                            <td className="py-2 px-3 text-right text-emerald-200/90">
                              {isVal ? formatKDA(art.val.cumul_val_N) : formatNumber(aCumulN)}
                            </td>
                            {/* Cumul N-1 */}
                            <td className="py-2 px-3 text-right text-slate-500">
                              {isVal ? formatKDA(art.val.cumul_val_N1) : formatNumber(aCumulN1)}
                            </td>
                            {/* Cumul Diff */}
                            <td className="py-2 px-3 text-right">
                              <span className={aCumulDiff > 0 ? 'text-emerald-400/90' : aCumulDiff < 0 ? 'text-rose-400/90' : 'text-slate-500'}>
                                {(aCumulDiff > 0 ? '+' : '') + (isVal ? formatKDA(art.val.cumul_diff) : formatNumber(aCumulDiff))}
                              </span>
                            </td>
                            {/* Cumul % */}
                            <td className="py-2 px-3 text-right border-r border-slate-800">
                              <span className={`text-[10px] font-bold ${aCumulPct > 0 ? 'text-emerald-400' : aCumulPct < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                {aCumulPct > 0 ? '+' : ''}{aCumulPct.toFixed(1)} %
                              </span>
                            </td>

                            {/* Stock N */}
                            <td className="py-2 px-4 text-right text-amber-200/80">
                              {isVal ? formatKDA(art.stock_val_N) : formatNumber(aStockN)}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Grand Totals Footer Row */}
            <tfoot>
              <tr className="bg-slate-950 text-white font-black text-xs border-t-2 border-slate-700">
                <td className="py-3.5 px-4 text-white uppercase tracking-wider">
                  TOTAL GÉNÉRAL
                </td>
                <td className="py-3.5 px-2 text-center text-slate-400 font-mono">
                  {metricMode === 'VAL' ? 'kDA' : 'PCE'}
                </td>

                {/* Month Totals */}
                <td className="py-3.5 px-3 text-right text-sky-400 border-l border-slate-800 font-black text-sm">
                  {metricMode === 'VAL'
                    ? formatKDA(summary.totals.val.month_val_N)
                    : formatNumber(summary.totals.qte.month_val_N)}
                </td>
                <td className="py-3.5 px-3 text-right text-slate-400 font-bold">
                  {metricMode === 'VAL'
                    ? formatKDA(summary.totals.val.month_val_N1)
                    : formatNumber(summary.totals.qte.month_val_N1)}
                </td>
                <td className="py-3.5 px-3 text-right font-black">
                  <span
                    className={
                      (metricMode === 'VAL' ? summary.totals.val.month_diff : summary.totals.qte.month_diff) >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }
                  >
                    {((metricMode === 'VAL' ? summary.totals.val.month_diff : summary.totals.qte.month_diff) >= 0 ? '+' : '') +
                      (metricMode === 'VAL'
                        ? formatKDA(summary.totals.val.month_diff)
                        : formatNumber(summary.totals.qte.month_diff))}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right border-r border-slate-800">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-black ${
                      (metricMode === 'VAL' ? summary.totals.val.month_growth_pct : summary.totals.qte.month_growth_pct) >= 0
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {((metricMode === 'VAL' ? summary.totals.val.month_growth_pct : summary.totals.qte.month_growth_pct) >= 0 ? '+' : '') +
                      (metricMode === 'VAL' ? summary.totals.val.month_growth_pct : summary.totals.qte.month_growth_pct).toFixed(1)} %
                  </span>
                </td>

                {/* Cumul Totals */}
                <td className="py-3.5 px-3 text-right text-emerald-400 font-black text-sm">
                  {metricMode === 'VAL'
                    ? formatKDA(summary.totals.val.cumul_val_N)
                    : formatNumber(summary.totals.qte.cumul_val_N)}
                </td>
                <td className="py-3.5 px-3 text-right text-slate-400 font-bold">
                  {metricMode === 'VAL'
                    ? formatKDA(summary.totals.val.cumul_val_N1)
                    : formatNumber(summary.totals.qte.cumul_val_N1)}
                </td>
                <td className="py-3.5 px-3 text-right font-black">
                  <span
                    className={
                      (metricMode === 'VAL' ? summary.totals.val.cumul_diff : summary.totals.qte.cumul_diff) >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }
                  >
                    {((metricMode === 'VAL' ? summary.totals.val.cumul_diff : summary.totals.qte.cumul_diff) >= 0 ? '+' : '') +
                      (metricMode === 'VAL'
                        ? formatKDA(summary.totals.val.cumul_diff)
                        : formatNumber(summary.totals.qte.cumul_diff))}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right border-r border-slate-800">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-black ${
                      (metricMode === 'VAL' ? summary.totals.val.cumul_growth_pct : summary.totals.qte.cumul_growth_pct) >= 0
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {((metricMode === 'VAL' ? summary.totals.val.cumul_growth_pct : summary.totals.qte.cumul_growth_pct) >= 0 ? '+' : '') +
                      (metricMode === 'VAL' ? summary.totals.val.cumul_growth_pct : summary.totals.qte.cumul_growth_pct).toFixed(1)} %
                  </span>
                </td>

                {/* Stock Totals */}
                <td className="py-3.5 px-4 text-right text-amber-300 font-black text-sm bg-slate-900/60">
                  {metricMode === 'VAL'
                    ? formatKDA(summary.totals.stock_val_N)
                    : formatNumber(summary.totals.stock_qte_N)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
