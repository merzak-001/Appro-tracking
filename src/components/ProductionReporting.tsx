import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import {
  TrendingUp,
  Factory,
  Boxes,
  PieChart,
  Calendar,
  Layers,
  Award,
  Zap,
  DollarSign,
  PackageCheck,
  Percent,
  Activity,
  CheckSquare,
  Square,
} from 'lucide-react';
import { ProductionMonthlyRecord } from '../types';
import {
  extractDiameter,
  formatNumber,
  formatKDA,
  toKDA,
  DIAMETER_ORDER,
  FRENCH_MONTHS,
} from '../utils/productionUtils';
import { copyTableDataToWord } from '../utils/wordExportUtils';
import { copyElementAsImage } from '../utils/imageExportUtils';

interface ProductionReportingProps {
  records: ProductionMonthlyRecord[];
  allAvailableYears?: number[];
}

export type MetricType =
  | 'QTE_PROD'
  | 'VAL_PROD'
  | 'QTE_VENTE'
  | 'VAL_VENTE'
  | 'QTE_STOCK'
  | 'VAL_STOCK';

const METRIC_CONFIG: Record<
  MetricType,
  { label: string; unit: string; isCurrency: boolean; icon: React.ReactNode; color: string }
> = {
  QTE_PROD: {
    label: 'Quantité Produite',
    unit: 'Pièces',
    isCurrency: false,
    icon: <Factory size={16} />,
    color: '#059669', // Emerald 600
  },
  VAL_PROD: {
    label: 'Valeur de Production',
    unit: 'kDA',
    isCurrency: true,
    icon: <DollarSign size={16} />,
    color: '#047857', // Emerald 700
  },
  QTE_VENTE: {
    label: 'Quantité Vendue',
    unit: 'Pièces',
    isCurrency: false,
    icon: <TrendingUp size={16} />,
    color: '#2563eb', // Blue 600
  },
  VAL_VENTE: {
    label: 'Valeur des Ventes',
    unit: 'kDA',
    isCurrency: true,
    icon: <DollarSign size={16} />,
    color: '#1d4ed8', // Blue 700
  },
  QTE_STOCK: {
    label: 'Quantité en Stock',
    unit: 'Pièces',
    isCurrency: false,
    icon: <Boxes size={16} />,
    color: '#7c3aed', // Purple 600
  },
  VAL_STOCK: {
    label: 'Valeur du Stock',
    unit: 'kDA',
    isCurrency: true,
    icon: <DollarSign size={16} />,
    color: '#6d28d9', // Purple 700
  },
};

const YEAR_COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#0284c7'];

// Color map for Multi-Line Chart series
const LINE_METRIC_COLORS: Record<MetricType, { primary: string; secondary: string; tertiary: string }> = {
  QTE_PROD: { primary: '#059669', secondary: '#34d399', tertiary: '#a7f3d0' },
  VAL_PROD: { primary: '#0d9488', secondary: '#2dd4bf', tertiary: '#99f6e4' },
  QTE_VENTE: { primary: '#2563eb', secondary: '#60a5fa', tertiary: '#bfdbfe' },
  VAL_VENTE: { primary: '#4f46e5', secondary: '#818cf8', tertiary: '#c7d2fe' },
  QTE_STOCK: { primary: '#9333ea', secondary: '#c084fc', tertiary: '#e9d5ff' },
  VAL_STOCK: { primary: '#db2777', secondary: '#f472b6', tertiary: '#fbcfe8' },
};

export const ProductionReporting: React.FC<ProductionReportingProps> = ({ records }) => {
  const actualYear = new Date().getFullYear();
  // 1. Sliding Window of the 3 latest years: e.g. actualYear -> [actualYear, actualYear - 1, actualYear - 2]
  const dynamicThreeYears = useMemo(() => {
    let maxYear = actualYear;
    records.forEach((r) => {
      const yr = Number(r.annee);
      if (yr && yr > maxYear) maxYear = yr;
    });
    return [maxYear, maxYear - 1, maxYear - 2];
  }, [records, actualYear]);

  // Selected comparison years for bar chart (defaults to the 3 sliding window years)
  const [selectedYears, setSelectedYears] = useState<number[]>(() => dynamicThreeYears);

  // Sync selected years when sliding window shifts (e.g. new year data added)
  useEffect(() => {
    setSelectedYears((prev) => {
      const valid = prev.filter((y) => dynamicThreeYears.includes(y));
      return valid.length > 0 ? valid : dynamicThreeYears;
    });
  }, [dynamicThreeYears]);

  // Selected metric for single-metric charts
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('QTE_PROD');
  const [copyTableSuccess, setCopyTableSuccess] = useState(false);
  const [copyTableImageSuccess, setCopyTableImageSuccess] = useState(false);
  const [copyChartImageSuccess, setCopyChartImageSuccess] = useState(false);
  const [isCapturingTableImage, setIsCapturingTableImage] = useState(false);
  const [isCapturingChartImage, setIsCapturingChartImage] = useState(false);

  // Chart View: 'MONTH_BY_MONTH' vs 'YEAR_OVER_YEAR' vs 'DIAMETER_BREAKDOWN' vs 'MULTI_LINE'
  const [chartView, setChartView] = useState<
    'MONTH_BY_MONTH' | 'YEAR_OVER_YEAR' | 'DIAMETER_BREAKDOWN' | 'MULTI_LINE'
  >('MONTH_BY_MONTH');

  // Multi-Line Chart configurations
  const [selectedLineMetrics, setSelectedLineMetrics] = useState<MetricType[]>(['QTE_PROD', 'VAL_PROD']);
  const [selectedLineYears, setSelectedLineYears] = useState<number[]>([dynamicThreeYears[0]]);

  // Build standard article prices lookup for accurate historical valuations
  const articlePrices = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((r) => {
      const code = (r.code_article || '').trim();
      if (r.qte_entree > 0 && r.val_entree > 0 && !map[code]) {
        map[code] = Number(r.val_entree) / Number(r.qte_entree);
      }
      if (r.qte_stock > 0 && r.val_stock > 0 && !map[code]) {
        map[code] = Number(r.val_stock) / Number(r.qte_stock);
      }
      if (r.qte_sortie > 0 && r.val_sortie > 0 && !map[code]) {
        map[code] = Number(r.val_sortie) / Number(r.qte_sortie);
      }
    });
    return map;
  }, [records]);

  // Toggle year selection in sliding window (max 3)
  const toggleYear = (year: number) => {
    if (selectedYears.includes(year)) {
      if (selectedYears.length > 1) {
        setSelectedYears(selectedYears.filter((y) => y !== year));
      }
    } else {
      if (selectedYears.length < 3) {
        setSelectedYears([...selectedYears, year].sort((a, b) => b - a));
      } else {
        setSelectedYears([selectedYears[0], selectedYears[1], year].sort((a, b) => b - a));
      }
    }
  };

  // Toggle multi-line metric
  const toggleLineMetric = (m: MetricType) => {
    if (selectedLineMetrics.includes(m)) {
      if (selectedLineMetrics.length > 1) {
        setSelectedLineMetrics(selectedLineMetrics.filter((item) => item !== m));
      }
    } else {
      setSelectedLineMetrics([...selectedLineMetrics, m]);
    }
  };

  // Toggle multi-line year
  const toggleLineYear = (yr: number) => {
    if (selectedLineYears.includes(yr)) {
      if (selectedLineYears.length > 1) {
        setSelectedLineYears(selectedLineYears.filter((y) => y !== yr));
      }
    } else {
      setSelectedLineYears([...selectedLineYears, yr].sort((a, b) => b - a));
    }
  };

  // Helper to extract metric value with standard cost backfill fallback
  const getMetricValue = (r: ProductionMonthlyRecord, metric: MetricType): number => {
    const code = (r.code_article || '').trim();
    const unitPrice = articlePrices[code] || (r.famille_diametre === 'DN 15' || r.famille_diametre === 'DN 15 (Export)' ? 2960.18 : 3100);

    switch (metric) {
      case 'QTE_PROD':
        return Number(r.qte_entree) || 0;
      case 'VAL_PROD': {
        const val = Number(r.val_entree) || 0;
        if (val > 0) return toKDA(val);
        const qte = Number(r.qte_entree) || 0;
        return toKDA(qte * unitPrice);
      }
      case 'QTE_VENTE':
        return Number(r.qte_sortie) || 0;
      case 'VAL_VENTE': {
        const val = Number(r.val_sortie) || 0;
        if (val > 0) return toKDA(val);
        const qte = Number(r.qte_sortie) || 0;
        return toKDA(qte * unitPrice);
      }
      case 'QTE_STOCK':
        return Number(r.qte_stock) || 0;
      case 'VAL_STOCK': {
        const val = Number(r.val_stock) || 0;
        if (val > 0) return toKDA(val);
        const qte = Number(r.qte_stock) || 0;
        return toKDA(qte * unitPrice);
      }
      default:
        return 0;
    }
  };

  // 2. Prepare Month-by-Month Dataset (Comparing each month to SAME MONTH of PREVIOUS YEAR N-1)
  const monthByMonthData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthName = FRENCH_MONTHS[i];
      const entry: any = {
        monthIndex: monthNum,
        monthName: monthName,
        monthShort: monthName.substring(0, 4) + '.',
      };

      selectedYears.forEach((yr) => {
        const monthRecs = records.filter((r) => r.annee === yr && r.mois_num === monthNum);
        const val = monthRecs.reduce((sum, r) => sum + getMetricValue(r, selectedMetric), 0);
        entry[`year_${yr}`] = val;

        // Evolution % compared to SAME MONTH OF PREVIOUS YEAR (yr - 1)
        const prevYearRecs = records.filter((r) => r.annee === yr - 1 && r.mois_num === monthNum);
        const prevYearVal = prevYearRecs.reduce((sum, r) => sum + getMetricValue(r, selectedMetric), 0);

        if (prevYearVal > 0 && val > 0) {
          const pct = ((val - prevYearVal) / prevYearVal) * 100;
          entry[`pct_${yr}`] = pct;
          entry[`label_${yr}`] = `${formatNumber(val)} (${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%)`;
        } else {
          entry[`pct_${yr}`] = null;
          entry[`label_${yr}`] = val > 0 ? formatNumber(val) : '';
        }
      });

      return entry;
    });
  }, [records, selectedYears, selectedMetric, articlePrices]);

  // 3. Prepare Year-over-Year Annual Totals with YoY Evolution %
  const yearOverYearData = useMemo(() => {
    const sortedYears = [...selectedYears].sort((a, b) => a - b);
    return sortedYears.map((yr, idx) => {
      const yearRecs = records.filter((r) => r.annee === yr);
      const totalVal = yearRecs.reduce((sum, r) => sum + getMetricValue(r, selectedMetric), 0);

      // YoY Evolution compared to previous year in sequence
      let yoyPct: number | null = null;
      if (idx > 0) {
        const prevYr = sortedYears[idx - 1];
        const prevYearRecs = records.filter((r) => r.annee === prevYr);
        const prevTotal = prevYearRecs.reduce((sum, r) => sum + getMetricValue(r, selectedMetric), 0);
        if (prevTotal > 0) {
          yoyPct = ((totalVal - prevTotal) / prevTotal) * 100;
        }
      }

      const valLabel = METRIC_CONFIG[selectedMetric].isCurrency
        ? `${formatNumber(totalVal)} kDA`
        : formatNumber(totalVal);
      const fullLabel =
        yoyPct !== null
          ? `${valLabel} (${yoyPct >= 0 ? '+' : ''}${yoyPct.toFixed(1)}%)`
          : valLabel;

      return {
        year: yr,
        total: totalVal,
        yoyPct,
        label: fullLabel,
        formattedTotal: METRIC_CONFIG[selectedMetric].isCurrency
          ? formatKDA(totalVal * 1000)
          : `${formatNumber(totalVal)} ${METRIC_CONFIG[selectedMetric].unit}`,
      };
    });
  }, [selectedYears, selectedMetric, records, articlePrices]);

  // 4. Prepare Diameter Breakdown Dataset for the primary year
  const primaryYear = selectedYears[0] || dynamicThreeYears[0];
  const diameterBreakdownData = useMemo(() => {
    const yearRecs = records.filter((r) => r.annee === primaryYear);
    const diamMap: Record<string, number> = {};

    yearRecs.forEach((r) => {
      const fam = r.famille_diametre || extractDiameter(`${r.code_article} ${r.designation}`, r.code_article);
      const val = getMetricValue(r, selectedMetric);
      diamMap[fam] = (diamMap[fam] || 0) + val;
    });

    const totalSum = Object.values(diamMap).reduce((a, b) => a + b, 0);

    return Object.entries(diamMap)
      .map(([name, value]) => {
        const rounded = Math.round(value);
        const sharePct = totalSum > 0 ? (value / totalSum) * 100 : 0;
        const valStr = METRIC_CONFIG[selectedMetric].isCurrency
          ? `${formatNumber(rounded)} kDA`
          : formatNumber(rounded);
        const labelWithPct = `${valStr} (${sharePct.toFixed(1)}%)`;

        return {
          diameter: name,
          value: rounded,
          sharePct,
          label: labelWithPct,
          formatted: METRIC_CONFIG[selectedMetric].isCurrency
            ? formatKDA(value * 1000)
            : `${formatNumber(value)} ${METRIC_CONFIG[selectedMetric].unit}`,
        };
      })
      .sort((a, b) => (DIAMETER_ORDER[a.diameter] || 50) - (DIAMETER_ORDER[b.diameter] || 50));
  }, [records, primaryYear, selectedMetric, articlePrices]);

  // 5. Prepare Multi-Line Dataset (12 Months x Selected Metrics x Selected Years)
  const multiLineData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthName = FRENCH_MONTHS[i];
      const entry: any = {
        monthIndex: monthNum,
        monthName: monthName,
        monthShort: monthName.substring(0, 4) + '.',
      };

      selectedLineYears.forEach((yr) => {
        selectedLineMetrics.forEach((mKey) => {
          const recs = records.filter((r) => r.annee === yr && r.mois_num === monthNum);
          const val = recs.reduce((sum, r) => sum + getMetricValue(r, mKey), 0);
          entry[`${mKey}_${yr}`] = val;
        });
      });

      return entry;
    });
  }, [records, selectedLineYears, selectedLineMetrics, articlePrices]);

  // 6. Calculate High-Value Strategic Insights & KPIs for Primary Year
  const insights = useMemo(() => {
    const yearRecs = records.filter((r) => r.annee === primaryYear);

    const totalProdQty = yearRecs.reduce((sum, r) => sum + Number(r.qte_entree || 0), 0);
    const totalProdVal = yearRecs.reduce((sum, r) => sum + getMetricValue(r, 'VAL_PROD') * 1000, 0);
    const totalVenteQty = yearRecs.reduce((sum, r) => sum + Number(r.qte_sortie || 0), 0);
    const totalVenteVal = yearRecs.reduce((sum, r) => sum + getMetricValue(r, 'VAL_VENTE') * 1000, 0);

    // Latest month stock
    const distinctMonths = Array.from(
      new Set<number>(yearRecs.map((r) => Number(r.mois_num || 0)).filter((m) => m > 0))
    ).sort((a: number, b: number) => b - a);
    const latestMonthNum = distinctMonths.length > 0 ? distinctMonths[0] : 1;

    const latestStockQty = yearRecs
      .filter((r) => r.mois_num === latestMonthNum)
      .reduce((sum, r) => sum + Number(r.qte_stock || 0), 0);
    const latestStockVal = yearRecs
      .filter((r) => r.mois_num === latestMonthNum)
      .reduce((sum, r) => sum + getMetricValue(r, 'VAL_STOCK') * 1000, 0);

    // Best production month
    const monthlyProdMap: Record<number, number> = {};
    yearRecs.forEach((r) => {
      monthlyProdMap[r.mois_num] = (monthlyProdMap[r.mois_num] || 0) + Number(r.qte_entree || 0);
    });

    let bestMonthNum = 1;
    let maxMonthQty = 0;
    Object.entries(monthlyProdMap).forEach(([mNum, qty]) => {
      if (qty > maxMonthQty) {
        maxMonthQty = qty;
        bestMonthNum = Number(mNum);
      }
    });

    // Top diameter by production volume
    const diamProdMap: Record<string, number> = {};
    yearRecs.forEach((r) => {
      const fam = r.famille_diametre || 'Autres';
      diamProdMap[fam] = (diamProdMap[fam] || 0) + Number(r.qte_entree || 0);
    });

    let topDiam = 'DN 15';
    let topDiamQty = 0;
    Object.entries(diamProdMap).forEach(([d, qty]) => {
      if (qty > topDiamQty) {
        topDiamQty = qty;
        topDiam = d;
      }
    });

    const topDiamPct = totalProdQty > 0 ? ((topDiamQty / totalProdQty) * 100).toFixed(1) : '0';

    return {
      totalProdQty,
      totalProdVal,
      totalVenteQty,
      totalVenteVal,
      latestStockQty,
      latestStockVal,
      bestMonthName: FRENCH_MONTHS[bestMonthNum - 1] || 'Janvier',
      maxMonthQty,
      topDiam,
      topDiamQty,
    };
  }, [records, primaryYear, articlePrices]);

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* 1. TOP CONTROLS: METRIC SELECTOR, YEAR COMPARISON PILLS & CHART VIEW */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Metric Selector Pills (active when not in multi-line mode) */}
        {chartView !== 'MULTI_LINE' ? (
          <div>
            <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-wider">
              Indicateur à Analyser :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {(Object.keys(METRIC_CONFIG) as MetricType[]).map((mKey) => {
                const cfg = METRIC_CONFIG[mKey];
                const isSelected = selectedMetric === mKey;
                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => setSelectedMetric(mKey)}
                    className={`px-3 py-2.5 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-[1.02]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className={isSelected ? 'text-amber-300' : 'text-slate-500'}>{cfg.icon}</span>
                    <span className="truncate">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Multi-Line Specific Controls: Select multiple metrics & years */
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black uppercase text-slate-600 tracking-wider">
                Indicateurs à Superposer sur la Courbe (Axe Gauche = Pièces | Axe Droit = kDA) :
              </label>
              <span className="text-[11px] font-bold text-slate-500">
                {selectedLineMetrics.length} indicateurs sélectionnés
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {(Object.keys(METRIC_CONFIG) as MetricType[]).map((mKey) => {
                const cfg = METRIC_CONFIG[mKey];
                const isSelected = selectedLineMetrics.includes(mKey);
                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => toggleLineMetric(mKey)}
                    className={`px-3 py-2 rounded-xl border-2 text-xs font-black flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={isSelected ? 'text-amber-300' : 'text-slate-500'}>{cfg.icon}</span>
                      <span className="truncate">{cfg.label}</span>
                    </div>
                    {isSelected ? <CheckSquare size={14} className="text-emerald-400 shrink-0" /> : <Square size={14} className="text-slate-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Second Row: Multi-Year Selector (Sliding Window of Last 3 Years) & Chart View Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Year Comparison Pills (Last 3 Years Window) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 mr-1">
              <Calendar size={15} className="text-blue-600" />
              <span>Fenêtre des 3 Dernières Années :</span>
            </span>
            {dynamicThreeYears.map((yr) => {
              const isSelected = chartView === 'MULTI_LINE' ? selectedLineYears.includes(yr) : selectedYears.includes(yr);
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => (chartView === 'MULTI_LINE' ? toggleLineYear(yr) : toggleYear(yr))}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border-2 ${
                    isSelected
                      ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>Exercice {yr}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>

          {/* Chart View Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setChartView('MONTH_BY_MONTH')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                chartView === 'MONTH_BY_MONTH'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={14} className="text-blue-600" />
              <span>Barres Mensuelles</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView('MULTI_LINE')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                chartView === 'MULTI_LINE'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity size={14} className="text-indigo-600" />
              <span>Courbes Multi-Lignes</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView('YEAR_OVER_YEAR')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                chartView === 'YEAR_OVER_YEAR'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp size={14} className="text-emerald-600" />
              <span>Cumul Annuel (YoY)</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView('DIAMETER_BREAKDOWN')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                chartView === 'DIAMETER_BREAKDOWN'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart size={14} className="text-purple-600" />
              <span>Répartition Calibre</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. STRATEGIC EXECUTIVE KPIS (PRIMARY YEAR) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Record Month */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
              Mois Record de Production
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Award size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-slate-900">{insights.bestMonthName} {primaryYear}</h4>
            <p className="text-xs font-bold text-emerald-700 mt-1 font-mono">
              {formatNumber(insights.maxMonthQty)} Pièces produites
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Meilleure performance mensuelle de l'exercice</p>
          </div>
        </div>

        {/* Top Diameter Leader */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
              Calibre Leader
            </span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Zap size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h4 className="text-2xl font-black text-slate-900">{insights.topDiam}</h4>
              <span className="text-sm font-black text-blue-700">({insights.topDiamPct}%)</span>
            </div>
            <p className="text-xs font-bold text-slate-600 mt-1 font-mono">
              {formatNumber(insights.topDiamQty)} Pièces fabriquées
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Part dominante du volume de production</p>
          </div>
        </div>

        {/* Sell-Through */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
              Taux d'Écoulement Global
            </span>
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Percent size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-slate-900">
              {insights.totalProdQty > 0
                ? `${((insights.totalVenteQty / insights.totalProdQty) * 100).toFixed(1)}%`
                : '0%'}
            </h4>
            <p className="text-xs font-bold text-indigo-700 mt-1 font-mono">
              {formatNumber(insights.totalVenteQty)} / {formatNumber(insights.totalProdQty)} PCE
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Ratio Ventes vs Production annuelle</p>
          </div>
        </div>

        {/* Stock Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
              Stock de Produits Finis
            </span>
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <PackageCheck size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-slate-900 font-mono">{formatKDA(insights.latestStockVal)}</h4>
            <p className="text-xs font-bold text-purple-700 mt-1 font-mono">
              {formatNumber(insights.latestStockQty)} Pièces disponibles
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Valorisation au dernier mois connu</p>
          </div>
        </div>
      </div>

      {/* 3. MAIN INTERACTIVE CHARTS SECTION */}
      <div id="production-reporting-chart-card" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              <span>
                {chartView === 'MONTH_BY_MONTH' &&
                  `Comparaison Mensuelle : ${METRIC_CONFIG[selectedMetric].label} (${METRIC_CONFIG[selectedMetric].unit})`}
                {chartView === 'MULTI_LINE' &&
                  `Évolution Chronologique Multi-Lignes (Double Axe Pièces & kDA)`}
                {chartView === 'YEAR_OVER_YEAR' &&
                  `Comparaison Annuelle (YoY) : ${METRIC_CONFIG[selectedMetric].label}`}
                {chartView === 'DIAMETER_BREAKDOWN' &&
                  `Répartition par Calibre en ${primaryYear} : ${METRIC_CONFIG[selectedMetric].label}`}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {chartView === 'MONTH_BY_MONTH' &&
                `Évolution mensuelle avec comparaison en % par rapport au MÊME MOIS DE L'ANNÉE PRÉCÉDENTE (N-1)`}
              {chartView === 'MULTI_LINE' &&
                `Superposition multi-indicateurs & multi-années : Quantités à gauche (PCE), Valorisations financières à droite (kDA)`}
              {chartView === 'YEAR_OVER_YEAR' &&
                `Cumuls totaux consolidés avec pourcentage d'évolution annuelle entre parenthèses`}
              {chartView === 'DIAMETER_BREAKDOWN' &&
                `Volume et part relative de chaque famille de compteurs avec pourcentage du total`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
              {chartView === 'MULTI_LINE' ? 'Axes : Pièces & kDA' : `Unité : ${METRIC_CONFIG[selectedMetric].unit}`}
            </span>
          </div>
        </div>

        {/* Dynamic Chart Container */}
        <div className="h-[420px] w-full">
          {/* A. Bar Chart: Month by Month with SAME-MONTH N-1 EVOLUTION % */}
          {chartView === 'MONTH_BY_MONTH' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthByMonthData} margin={{ top: 28, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="monthShort"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                />
                <Tooltip
                  formatter={(value: any, name: any, item: any) => {
                    const yr = Number(String(name).replace('year_', ''));
                    const formatted = METRIC_CONFIG[selectedMetric].isCurrency
                      ? `${formatNumber(Number(value))} kDA`
                      : `${formatNumber(Number(value))} Pièces`;
                    const pct = item.payload[`pct_${yr}`];
                    const evolution =
                      pct !== null && pct !== undefined
                        ? ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs même mois ${yr - 1})`
                        : '';
                    return [`${formatted}${evolution}`, `Exercice ${yr}`];
                  }}
                  labelFormatter={(label) => `Mois : ${label}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Legend
                  formatter={(value) => `Année ${String(value).replace('year_', '')}`}
                  wrapperStyle={{ paddingTop: '10px' }}
                />
                {selectedYears.map((yr, idx) => (
                  <Bar
                    key={yr}
                    dataKey={`year_${yr}`}
                    name={`year_${yr}`}
                    fill={YEAR_COLORS[idx % YEAR_COLORS.length]}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={45}
                  >
                    <LabelList
                      dataKey={`label_${yr}`}
                      position="top"
                      style={{ fontSize: '10px', fontWeight: 'bold', fill: '#334155' }}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* B. Multi-Line Chart with Dual Y-Axes (Quantities on Left in PCE, Valuations on Right in kDA) */}
          {chartView === 'MULTI_LINE' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={multiLineData} margin={{ top: 25, right: 35, left: 15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="monthShort"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                {/* Left Y-Axis: Quantities in PCE */}
                <YAxis
                  yAxisId="qty"
                  orientation="left"
                  stroke="#2563eb"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#93c5fd' }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k PCE` : `${val} PCE`)}
                />
                {/* Right Y-Axis: Values in kDA */}
                <YAxis
                  yAxisId="val"
                  orientation="right"
                  stroke="#059669"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#6ee7b7' }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k kDA` : `${val} kDA`)}
                />
                <Tooltip
                  formatter={(value: any, name: any) => {
                    const [mKey, yr] = String(name).split('_') as [MetricType, string];
                    const cfg = METRIC_CONFIG[mKey];
                    const formatted = cfg?.isCurrency
                      ? `${formatNumber(Number(value))} kDA`
                      : `${formatNumber(Number(value))} Pièces`;
                    return [formatted, `${cfg?.label || mKey} (${yr})`];
                  }}
                  labelFormatter={(label) => `Mois : ${label}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Legend
                  formatter={(value) => {
                    const [mKey, yr] = String(value).split('_') as [MetricType, string];
                    const cfg = METRIC_CONFIG[mKey];
                    return `${cfg?.label || mKey} (${yr})`;
                  }}
                  wrapperStyle={{ paddingTop: '10px' }}
                />
                {selectedLineYears.map((yr, yrIdx) =>
                  selectedLineMetrics.map((mKey) => {
                    const cfg = METRIC_CONFIG[mKey];
                    const colorVariants = LINE_METRIC_COLORS[mKey] || {
                      primary: '#4f46e5',
                      secondary: '#818cf8',
                      tertiary: '#c7d2fe',
                    };
                    const color =
                      yrIdx === 0
                        ? colorVariants.primary
                        : yrIdx === 1
                        ? colorVariants.secondary
                        : colorVariants.tertiary;

                    return (
                      <Line
                        key={`${mKey}_${yr}`}
                        yAxisId={cfg.isCurrency ? 'val' : 'qty'}
                        type="monotone"
                        dataKey={`${mKey}_${yr}`}
                        name={`${mKey}_${yr}`}
                        stroke={color}
                        strokeWidth={yrIdx === 0 ? 3 : 2}
                        strokeDasharray={yrIdx === 1 ? '5 5' : yrIdx === 2 ? '3 3' : undefined}
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 7 }}
                      />
                    );
                  })
                )}
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* C. Year-over-Year Totals */}
          {chartView === 'YEAR_OVER_YEAR' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearOverYearData} margin={{ top: 30, right: 30, left: 20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="year"
                  stroke="#64748b"
                  fontSize={13}
                  fontWeight="bold"
                  tickFormatter={(yr) => `Année ${yr}`}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                />
                <Tooltip
                  formatter={(value: any, _, item: any) => {
                    const formatted = METRIC_CONFIG[selectedMetric].isCurrency
                      ? `${formatNumber(Number(value))} kDA`
                      : `${formatNumber(Number(value))} Pièces`;
                    const pct = item.payload.yoyPct;
                    const evolution =
                      pct !== null ? ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs N-1)` : '';
                    return [`${formatted}${evolution}`, METRIC_CONFIG[selectedMetric].label];
                  }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="#4f46e5"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={80}
                >
                  <LabelList
                    dataKey="label"
                    position="top"
                    style={{ fontSize: '12px', fontWeight: 'bold', fill: '#0f172a' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* D. Diameter Breakdown */}
          {chartView === 'DIAMETER_BREAKDOWN' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={diameterBreakdownData}
                layout="vertical"
                margin={{ top: 15, right: 60, left: 30, bottom: 15 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                />
                <YAxis
                  dataKey="diameter"
                  type="category"
                  stroke="#1e293b"
                  fontSize={12}
                  fontWeight="bold"
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any, _, item: any) => {
                    const formatted = METRIC_CONFIG[selectedMetric].isCurrency
                      ? `${formatNumber(Number(value))} kDA`
                      : `${formatNumber(Number(value))} Pièces`;
                    return [
                      `${formatted} (${item.payload.sharePct?.toFixed(1)}% du total)`,
                      METRIC_CONFIG[selectedMetric].label,
                    ];
                  }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#059669"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={28}
                >
                  <LabelList
                    dataKey="label"
                    position="right"
                    style={{ fontSize: '11px', fontWeight: 'bold', fill: '#0f172a' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. EXECUTIVE MULTI-YEAR COMPARISON TABLE */}
      <div id="production-reporting-table-container" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <PieChart size={16} className="text-indigo-600" />
              <span>Tableau Récapitulatif Comparatif Multi-Années</span>
            </h4>
            <span className="text-xs text-slate-500 font-semibold">
              Synthèse consolidée des exercices réels : {dynamicThreeYears.join(' vs ')}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-black text-xs border-b border-slate-300">
                <th className="py-3 px-4">Indicateur Clé de Performance</th>
                {dynamicThreeYears.map((yr) => (
                  <th key={yr} className="py-3 px-4 text-right border-l border-slate-200">
                    Exercice {yr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-semibold">
              {/* Production Quantity */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-900 font-bold flex items-center gap-2">
                  <Factory size={15} className="text-emerald-600" />
                  <span>Production Totale Annuelle (Pièces)</span>
                </td>
                {dynamicThreeYears.map((yr) => {
                  const qty = records
                    .filter((r) => r.annee === yr)
                    .reduce((sum, r) => sum + Number(r.qte_entree || 0), 0);
                  return (
                    <td
                      key={yr}
                      className="py-3 px-4 text-right font-mono text-emerald-950 font-bold border-l border-slate-200"
                    >
                      {formatNumber(qty)} Pièces
                    </td>
                  );
                })}
              </tr>

              {/* Production Value */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-900 font-bold flex items-center gap-2">
                  <DollarSign size={15} className="text-emerald-700" />
                  <span>Valeur de Production (kDA)</span>
                </td>
                {dynamicThreeYears.map((yr) => {
                  const val = records
                    .filter((r) => r.annee === yr)
                    .reduce((sum, r) => sum + getMetricValue(r, 'VAL_PROD') * 1000, 0);
                  return (
                    <td
                      key={yr}
                      className="py-3 px-4 text-right font-mono text-emerald-950 font-bold border-l border-slate-200"
                    >
                      {formatKDA(val)}
                    </td>
                  );
                })}
              </tr>

              {/* Sales Quantity */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-900 font-bold flex items-center gap-2">
                  <TrendingUp size={15} className="text-blue-600" />
                  <span>Ventes Annuelles (Pièces)</span>
                </td>
                {dynamicThreeYears.map((yr) => {
                  const qty = records
                    .filter((r) => r.annee === yr)
                    .reduce((sum, r) => sum + Number(r.qte_sortie || 0), 0);
                  return (
                    <td
                      key={yr}
                      className="py-3 px-4 text-right font-mono text-blue-950 font-bold border-l border-slate-200"
                    >
                      {formatNumber(qty)} Pièces
                    </td>
                  );
                })}
              </tr>

              {/* Sales Value */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-900 font-bold flex items-center gap-2">
                  <DollarSign size={15} className="text-blue-700" />
                  <span>Valeur des Ventes (kDA)</span>
                </td>
                {dynamicThreeYears.map((yr) => {
                  const val = records
                    .filter((r) => r.annee === yr)
                    .reduce((sum, r) => sum + getMetricValue(r, 'VAL_VENTE') * 1000, 0);
                  return (
                    <td
                      key={yr}
                      className="py-3 px-4 text-right font-mono text-blue-950 font-bold border-l border-slate-200"
                    >
                      {formatKDA(val)}
                    </td>
                  );
                })}
              </tr>

              {/* Stock Quantity */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-900 font-bold flex items-center gap-2">
                  <Boxes size={15} className="text-purple-600" />
                  <span>Quantité en Stock (Pièces)</span>
                </td>
                {dynamicThreeYears.map((yr) => {
                  const yrMonths = Array.from(
                    new Set<number>(
                      records
                        .filter((r) => r.annee === yr)
                        .map((r) => Number(r.mois_num || 0))
                        .filter((m) => m > 0)
                    )
                  ).sort((a: number, b: number) => b - a);
                  const lastMonth = yrMonths[0] || 1;
                  const qty = records
                    .filter((r) => r.annee === yr && r.mois_num === lastMonth)
                    .reduce((sum, r) => sum + Number(r.qte_stock || 0), 0);
                  return (
                    <td
                      key={yr}
                      className="py-3 px-4 text-right font-mono text-purple-950 font-bold border-l border-slate-200"
                    >
                      {formatNumber(qty)} Pièces
                    </td>
                  );
                })}
              </tr>

              {/* Stock Value */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-900 font-bold flex items-center gap-2">
                  <DollarSign size={15} className="text-purple-700" />
                  <span>Valeur du Stock (kDA)</span>
                </td>
                {dynamicThreeYears.map((yr) => {
                  const yrMonths = Array.from(
                    new Set<number>(
                      records
                        .filter((r) => r.annee === yr)
                        .map((r) => Number(r.mois_num || 0))
                        .filter((m) => m > 0)
                    )
                  ).sort((a: number, b: number) => b - a);
                  const lastMonth = yrMonths[0] || 1;
                  const val = records
                    .filter((r) => r.annee === yr && r.mois_num === lastMonth)
                    .reduce((sum, r) => sum + getMetricValue(r, 'VAL_STOCK') * 1000, 0);
                  return (
                    <td
                      key={yr}
                      className="py-3 px-4 text-right font-mono text-purple-950 font-bold border-l border-slate-200"
                    >
                      {formatKDA(val)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
