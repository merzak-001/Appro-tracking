import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Factory,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Search,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Package,
  DollarSign,
  Calendar,
  Check,
  CheckCircle2,
  Filter,
  Eye,
  EyeOff,
  SlidersHorizontal,
  X,
  AlertTriangle,
  FileText,
  Download,
  Info,
  Boxes,
  PieChart,
  Trash2,
  Clock,
  Copy,
  Camera,
} from 'lucide-react';
import { User, ProductionMonthlyRecord, ProductionDiameterGroup, ProductionArticleAggregation } from '../types';
import {
  extractDiameter,
  isExportMeterArticle,
  formatNumber,
  formatKDA,
  toKDA,
  sortMonthsChronologically,
  aggregateProductionData,
  DIAMETER_ORDER,
  formatMonthString,
  getMonthName,
  getLatestProductionUpdateTime,
  getLatestRecordPeriod,
} from '../utils/productionUtils';
import { copyTableDataToWord } from '../utils/wordExportUtils';
import { copyElementAsImage } from '../utils/imageExportUtils';
import { ProductionReporting } from './ProductionReporting';
import { ProductionTableauDeBord } from './ProductionTableauDeBord';

interface SuiviProductionProps {
  currentUser?: User | null;
}

export const SuiviProduction: React.FC<SuiviProductionProps> = ({ currentUser }) => {
  // State - Default to PRODUCT_MOIS (Tableau de Bord & Budget) as requested
  const [activeTab, setActiveTab] = useState<'PRODUCT_MOIS' | 'TABLE' | 'CHARTS'>('PRODUCT_MOIS');
  const [records, setRecords] = useState<ProductionMonthlyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const actualYear = new Date().getFullYear();
  const latestDbPeriod = useMemo(() => getLatestRecordPeriod(records), [records]);
  const lastAutoYearRef = useRef<number>(actualYear);
  const [selectedYear, setSelectedYear] = useState<number>(() => latestDbPeriod.year);

  // Auto-sync selectedYear to latest year present in records whenever data loads or updates
  useEffect(() => {
    if (records && records.length > 0) {
      if (lastAutoYearRef.current !== latestDbPeriod.year) {
        lastAutoYearRef.current = latestDbPeriod.year;
        setSelectedYear(latestDbPeriod.year);
      }
    }
  }, [records, latestDbPeriod]);
  const [upToMonthCutoff, setUpToMonthCutoff] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'DIAMETER' | 'ARTICLE'>('DIAMETER');
  
  // Display Mode: 'SENIOR' (Grands Caractères & Fort Contraste) vs 'STANDARD' (Design Épuré Moderne)
  const [displayMode, setDisplayMode] = useState<'SENIOR' | 'STANDARD'>(() => {
    try {
      const saved = localStorage.getItem('suivi_prod_display_mode');
      return saved === 'STANDARD' ? 'STANDARD' : 'SENIOR';
    } catch {
      return 'SENIOR';
    }
  });

  const handleSetDisplayMode = (mode: 'SENIOR' | 'STANDARD') => {
    setDisplayMode(mode);
    try {
      localStorage.setItem('suivi_prod_display_mode', mode);
    } catch (e) {
      console.error(e);
    }
  };

  // Expanded diameter groups (e.g. 'DN 15')
  const [expandedDiameters, setExpandedDiameters] = useState<Record<string, boolean>>({
    'DN 15': false,
  });

  // Selected visible months (default: latest month only)
  const [visibleMonths, setVisibleMonths] = useState<string[]>([]);
  const [monthSelectionMode, setMonthSelectionMode] = useState<'LAST_1' | 'LAST_2' | 'ALL' | 'CUSTOM'>('LAST_1');
  const [showMonthFilterDropdown, setShowMonthFilterDropdown] = useState<boolean>(false);
  const [copyWordSuccess, setCopyWordSuccess] = useState<boolean>(false);
  const [copyImageSuccess, setCopyImageSuccess] = useState<boolean>(false);
  const [isCapturingImage, setIsCapturingImage] = useState<boolean>(false);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importFileName, setImportFileName] = useState<string>('');
  const [parsedImportRows, setParsedImportRows] = useState<ProductionMonthlyRecord[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Distinct months detected in current imported file
  const detectedImportMonths = useMemo(() => {
    const set = new Set<string>();
    parsedImportRows.forEach((r) => {
      if (r.mois) set.add(r.mois);
    });
    return sortMonthsChronologically(Array.from(set));
  }, [parsedImportRows]);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteScope, setDeleteScope] = useState<'MONTH' | 'YEAR' | 'ALL'>('MONTH');
  const [deleteSelectedYear, setDeleteSelectedYear] = useState<number>(actualYear);
  const [deleteSelectedMonth, setDeleteSelectedMonth] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  // Fetch production records from server
  const fetchProductionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/production-mcba');
      if (!res.ok) throw new Error('Erreur lors du chargement des données de production');
      const data: ProductionMonthlyRecord[] = await res.json();
      setRecords(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductionData();
  }, []);

  // Aggregated data with optional point-in-time cutoff
  const aggregated = useMemo(() => {
    return aggregateProductionData(records, selectedYear, upToMonthCutoff || undefined);
  }, [records, selectedYear, upToMonthCutoff]);

  // Available years: always includes the actual current year
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    set.add(actualYear);
    aggregated.distinctYears.forEach((y) => set.add(y));
    return Array.from(set).sort((a, b) => b - a);
  }, [aggregated.distinctYears, actualYear]);

  // Set default visible months whenever allMonths change or on initial load
  useEffect(() => {
    if (aggregated.allMonths.length > 0) {
      if (monthSelectionMode === 'LAST_1') {
        const lastOne = aggregated.allMonths.slice(-1);
        setVisibleMonths(lastOne);
      } else if (monthSelectionMode === 'LAST_2') {
        const lastTwo = aggregated.allMonths.slice(-2);
        setVisibleMonths(lastTwo);
      } else if (monthSelectionMode === 'ALL') {
        setVisibleMonths(aggregated.allMonths);
      }
    }
  }, [aggregated.allMonths, monthSelectionMode]);

  // Toggle accordion for a diameter group
  const toggleDiameterExpand = (diam: string) => {
    setExpandedDiameters((prev) => ({
      ...prev,
      [diam]: !prev[diam],
    }));
  };

  // Toggle month visibility
  const toggleMonthVisibility = (m: string) => {
    setMonthSelectionMode('CUSTOM');
    setVisibleMonths((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : sortMonthsChronologically([...prev, m])
    );
  };

  // Filter groups / articles by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return aggregated.groups;
    const q = searchQuery.toLowerCase().trim();
    return aggregated.groups
      .map((grp) => {
        const matchesGrp = grp.famille_diametre.toLowerCase().includes(q);
        const filteredArticles = grp.articles.filter(
          (a) =>
            a.code_article.toLowerCase().includes(q) ||
            a.designation.toLowerCase().includes(q) ||
            a.famille_diametre.toLowerCase().includes(q)
        );
        if (matchesGrp || filteredArticles.length > 0) {
          return {
            ...grp,
            articles: filteredArticles.length > 0 ? filteredArticles : grp.articles,
          };
        }
        return null;
      })
      .filter(Boolean) as ProductionDiameterGroup[];
  }, [aggregated.groups, searchQuery]);

  // Expand / Collapse All Diameters Helper
  const allGroupsExpanded = useMemo(() => {
    return (
      aggregated.groups.length > 0 &&
      aggregated.groups.every((g) => expandedDiameters[g.famille_diametre])
    );
  }, [aggregated.groups, expandedDiameters]);

  const toggleExpandAll = () => {
    if (allGroupsExpanded) {
      setExpandedDiameters({});
    } else {
      const next: Record<string, boolean> = {};
      aggregated.groups.forEach((g) => {
        next[g.famille_diametre] = true;
      });
      setExpandedDiameters(next);
    }
  };

  // Export Specific Metrics (Compteur 420 015 L170)
  const exportMetrics = useMemo(() => {
    let qty = 0;
    let val = 0;
    let stockQty = 0;
    let stockVal = 0;
    let sortiesQty = 0;
    let sortiesVal = 0;

    aggregated.groups.forEach((g) => {
      g.articles.forEach((a) => {
        if (
          g.famille_diametre.includes('Export') ||
          isExportMeterArticle(`${a.code_article} ${a.designation}`, a.code_article)
        ) {
          qty += a.cumul_qte_entree;
          val += a.cumul_val_entree;
          stockQty += a.dernier_stock_qte;
          stockVal += a.dernier_stock_val;
          sortiesQty += a.cumul_qte_sortie;
          sortiesVal += a.cumul_val_sortie;
        }
      });
    });

    const sharePct =
      aggregated.totals.cumul_qte_entree > 0
        ? ((qty / aggregated.totals.cumul_qte_entree) * 100).toFixed(1)
        : '0';

    return {
      qty,
      val,
      stockQty,
      stockVal,
      sortiesQty,
      sortiesVal,
      sharePct,
    };
  }, [aggregated.groups, aggregated.totals.cumul_qte_entree]);

  // Flat articles list for 'ARTICLE' view
  const allArticlesList = useMemo(() => {
    const list: ProductionArticleAggregation[] = aggregated.articles || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (a) =>
        a.code_article.toLowerCase().includes(q) ||
        a.designation.toLowerCase().includes(q) ||
        a.famille_diametre.toLowerCase().includes(q)
    );
  }, [aggregated.articles, searchQuery]);

  // Handle Excel File Selection & Client-Side Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          throw new Error('Le fichier Excel est vide ou illisible.');
        }

        const parsed: ProductionMonthlyRecord[] = [];

        // Helper to find column value by searching candidates ignoring case, spaces, and punctuation
        const getColVal = (row: any, candidates: string[], defaultValue: any = ''): any => {
          const keys = Object.keys(row);
          for (const cand of candidates) {
            const candNorm = cand.toLowerCase().replace(/[\s._-]/g, '');
            for (const key of keys) {
              const keyNorm = key.toLowerCase().replace(/[\s._-]/g, '');
              if (keyNorm === candNorm || keyNorm.startsWith(candNorm) || keyNorm.includes(candNorm)) {
                const val = row[key];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                  return val;
                }
              }
            }
          }
          return defaultValue;
        };

        rawJson.forEach((row) => {
          const rawArt = String(getColVal(row, ['Article', 'code_article', 'designation', 'matnr', 'material'], '')).trim();
          if (!rawArt) return;

          // Split code and designation if merged
          const firstSpace = rawArt.indexOf(' ');
          let code = rawArt;
          let des = rawArt;
          if (firstSpace > 0) {
            code = rawArt.substring(0, firstSpace).trim();
            des = rawArt.substring(firstSpace + 1).trim();
          }

          const mois = String(getColVal(row, ['Mois', 'period', 'periode', 'month'], '')).trim();
          let annee = 2026;
          let moisNum = 1;
          if (mois.includes('.')) {
            const parts = mois.split('.');
            moisNum = Number(parts[0]) || 1;
            annee = Number(parts[1]) || 2026;
          }

          const entreeRaw = getColVal(row, ['QtéEnt.SV', 'qte_entree', 'qteentree', 'entree', 'entrees', 'produced'], 0);
          const sortieRaw = getColVal(row, ['Sortie', 'qte_sortie', 'qtesortie', 'sorties', 'ventes', 'sold'], 0);
          const stockRaw = getColVal(row, ['Stock', 'qte_stock', 'qtestock', 'stockfinal', 'stock_final'], 0);
          const valEntreeRaw = getColVal(row, ['Val entrée', 'val_entree', 'valentree', 'valeur_entree', 'val.ent.'], 0);
          const valSortieRaw = getColVal(row, ['Val.sort.', 'Val.sort', 'val_sortie', 'valsortie', 'valeur_sortie'], 0);
          const valStockRaw = getColVal(row, ['Val.stk va', 'Val.stk', 'val_stock', 'valstock', 'valeur_stock'], 0);

          const entree = Number(entreeRaw) || 0;
          const sortie = Number(sortieRaw) || 0;
          const stock = Number(stockRaw) || 0;
          const valEntree = Number(valEntreeRaw) || 0;
          const valSortie = Number(valSortieRaw) || 0;
          const valStock = Number(valStockRaw) || 0;

          parsed.push({
            code_article: code,
            designation: des,
            famille_diametre: extractDiameter(`${code} ${des}`),
            mois,
            annee,
            mois_num: moisNum,
            qte_entree: isNaN(entree) ? 0 : entree,
            qte_sortie: isNaN(sortie) ? 0 : sortie,
            qte_stock: isNaN(stock) ? 0 : stock,
            val_entree: isNaN(valEntree) ? 0 : valEntree,
            val_sortie: isNaN(valSortie) ? 0 : valSortie,
            val_stock: isNaN(valStock) ? 0 : valStock,
            unite: String(getColVal(row, ['Unite', 'unit', 'meins'], 'PCE')),
            magasin: String(getColVal(row, ['Magasin', 'lgort', 'storage'], '866034')),
            division: String(getColVal(row, ['Division', 'werks', 'plant'], '8660')),
            type_article: String(getColVal(row, ["Type d'article", 'type_article', 'mtart'], 'FERT')),
            groupe_marchandises: String(getColVal(row, ['Groupe marchandises', 'groupe_marchandises', 'matkl'], '')),
          });
        });

        setParsedImportRows(parsed);
        setIsImportModalOpen(true);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Erreur lors du traitement du fichier Excel');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit parsed import to server
  const handleConfirmImport = async () => {
    if (parsedImportRows.length === 0) return;
    setIsImporting(true);
    setError(null);
    try {
      const res = await fetch('/api/production-mcba/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: parsedImportRows, replace: true }),
      });

      if (!res.ok) throw new Error("Échec de l'enregistrement en base de données.");
      const data = await res.json();

      setIsImportModalOpen(false);
      setParsedImportRows([]);
      setImportFileName('');
      const monthLabels =
        Array.isArray(data.months) && data.months.length > 0
          ? data.months.map((m: string) => formatMonthString(m, true)).join(', ')
          : detectedImportMonths.map((m) => formatMonthString(m, true)).join(', ');
      setImportSuccessMsg(
        `Importation réussie : ${data.count} lignes enregistrées pour le(s) mois [${monthLabels}]. Tous les autres mois en base ont été conservés intacts.`
      );
      setTimeout(() => setImportSuccessMsg(null), 8000);
      await fetchProductionData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsImporting(false);
    }
  };

  // Export Table Data to Excel
  const handleExportExcel = () => {
    try {
      const exportData: any[] = [];
      filteredGroups.forEach((grp) => {
        const row: any = {
          'Diamètre / Calibre': grp.famille_diametre,
          'Nombre Modèles': grp.modelCount,
        };

        // Monthly columns
        visibleMonths.forEach((m) => {
          const pt = grp.monthsData[m];
          row[`Qté Prod (${m})`] = pt ? pt.qte_entree : 0;
          row[`Val Prod kDA (${m})`] = pt ? Math.round(toKDA(pt.val_entree)) : 0;
          row[`Qté Vente (${m})`] = pt ? pt.qte_sortie : 0;
          row[`Val Vente kDA (${m})`] = pt ? Math.round(toKDA(pt.val_sortie)) : 0;
        });

        // Cumul & Stock
        row['Cumul Prod Qté (YTD)'] = grp.cumul_qte_entree;
        row['Cumul Prod Val (kDA)'] = Math.round(toKDA(grp.cumul_val_entree));
        row['Cumul Vente Qté (YTD)'] = grp.cumul_qte_sortie;
        row['Cumul Vente Val (kDA)'] = Math.round(toKDA(grp.cumul_val_sortie));
        row['Stock Final (PCE)'] = grp.dernier_stock_qte;
        row['Valeur Stock (kDA)'] = Math.round(toKDA(grp.dernier_stock_val));

        exportData.push(row);
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Suivi_Production');
      XLSX.writeFile(wb, `Sensus_Suivi_Production_${selectedYear || 2026}.xlsx`);
    } catch (err) {
      console.error(err);
    }
  };

  // Copy Table Data for Microsoft Word / Excel (Native Editable Format)
  const handleCopyForWord = async () => {
    if (viewMode === 'DIAMETER') {
      const headerCells1: any[] = [
        { text: 'DIAMÈTRE / CALIBRE', rowSpan: 2, bg: '#0f172a', color: '#ffffff', bold: true, align: 'left' },
        { text: 'MODÈLES', rowSpan: 2, bg: '#0f172a', color: '#ffffff', bold: true, align: 'center' },
      ];

      visibleMonths.forEach((m) => {
        headerCells1.push({
          text: `MOIS ${m}`,
          colSpan: 4,
          bg: '#1e3a8a',
          color: '#ffffff',
          bold: true,
          align: 'center',
        });
      });

      headerCells1.push(
        { text: 'CUMUL PRODUCTION (YTD)', colSpan: 2, bg: '#065f46', color: '#ffffff', bold: true, align: 'center' },
        { text: 'CUMUL VENTES (YTD)', colSpan: 2, bg: '#1e40af', color: '#ffffff', bold: true, align: 'center' },
        { text: 'STOCK DE PRODUITS FINIS', colSpan: 2, bg: '#0369a1', color: '#ffffff', bold: true, align: 'center' }
      );

      const headerCells2: any[] = [];
      visibleMonths.forEach(() => {
        headerCells2.push(
          { text: 'Prod (Pcs)', bg: '#1e3a8a', color: '#ffffff', bold: true, align: 'right' },
          { text: 'Prod (kDA)', bg: '#1e3a8a', color: '#ffffff', bold: true, align: 'right' },
          { text: 'Ventes (Pcs)', bg: '#1e3a8a', color: '#ffffff', bold: true, align: 'right' },
          { text: 'Ventes (kDA)', bg: '#1e3a8a', color: '#ffffff', bold: true, align: 'right' }
        );
      });

      headerCells2.push(
        { text: 'Pièces', bg: '#065f46', color: '#ffffff', bold: true, align: 'right' },
        { text: 'kDA', bg: '#065f46', color: '#ffffff', bold: true, align: 'right' },
        { text: 'Pièces', bg: '#1e40af', color: '#ffffff', bold: true, align: 'right' },
        { text: 'kDA', bg: '#1e40af', color: '#ffffff', bold: true, align: 'right' },
        { text: 'Pièces', bg: '#0369a1', color: '#ffffff', bold: true, align: 'right' },
        { text: 'kDA', bg: '#0369a1', color: '#ffffff', bold: true, align: 'right' }
      );

      const bodyRows: any[] = [];
      filteredGroups.forEach((grp, idx) => {
        const cells: any[] = [
          { text: grp.famille_diametre, bold: true, align: 'left', bg: idx % 2 === 1 ? '#f8fafc' : '#ffffff' },
          { text: String(grp.modelCount), align: 'center' },
        ];

        visibleMonths.forEach((m) => {
          const pt = grp.monthsData[m];
          cells.push(
            { text: pt ? formatNumber(pt.qte_entree) : '0', align: 'right' },
            { text: pt ? formatKDA(pt.val_entree) : '0', align: 'right' },
            { text: pt ? formatNumber(pt.qte_sortie) : '0', align: 'right' },
            { text: pt ? formatKDA(pt.val_sortie) : '0', align: 'right' }
          );
        });

        cells.push(
          { text: formatNumber(grp.cumul_qte_entree), bold: true, align: 'right', bg: '#f0fdf4', color: '#166534' },
          { text: formatKDA(grp.cumul_val_entree), bold: true, align: 'right', bg: '#f0fdf4', color: '#166534' },
          { text: formatNumber(grp.cumul_qte_sortie), bold: true, align: 'right', bg: '#eff6ff', color: '#1e40af' },
          { text: formatKDA(grp.cumul_val_sortie), bold: true, align: 'right', bg: '#eff6ff', color: '#1e40af' },
          { text: formatNumber(grp.dernier_stock_qte), bold: true, align: 'right', bg: '#f0f9ff', color: '#0369a1' },
          { text: formatKDA(grp.dernier_stock_val), bold: true, align: 'right', bg: '#f0f9ff', color: '#0369a1' }
        );

        bodyRows.push({ cells });
      });

      const footerCells: any[] = [
        { text: 'TOTAL CONSOLIDÉ', bold: true, align: 'left' },
        { text: String(aggregated.articleCount), align: 'center', bold: true },
      ];

      visibleMonths.forEach((m) => {
        const mTot = aggregated.monthsTotals[m];
        footerCells.push(
          { text: mTot ? formatNumber(mTot.qte_entree) : '0', align: 'right', bold: true },
          { text: mTot ? formatKDA(mTot.val_entree) : '0', align: 'right', bold: true },
          { text: mTot ? formatNumber(mTot.qte_sortie) : '0', align: 'right', bold: true },
          { text: mTot ? formatKDA(mTot.val_sortie) : '0', align: 'right', bold: true }
        );
      });

      footerCells.push(
        { text: formatNumber(aggregated.totals.cumul_qte_entree), align: 'right', bold: true },
        { text: formatKDA(aggregated.totals.cumul_val_entree), align: 'right', bold: true },
        { text: formatNumber(aggregated.totals.cumul_qte_sortie), align: 'right', bold: true },
        { text: formatKDA(aggregated.totals.cumul_val_sortie), align: 'right', bold: true },
        { text: formatNumber(aggregated.totals.dernier_stock_qte), align: 'right', bold: true },
        { text: formatKDA(aggregated.totals.dernier_stock_val), align: 'right', bold: true }
      );

      const ok = await copyTableDataToWord({
        title: `Sensus SPA - Suivi de Production Mensuelle (${selectedYear || 2026})`,
        subtitle: `Situation par diamètre - Cumuls arrêtés ${upToMonthCutoff ? `au ${formatMonthString(upToMonthCutoff)}` : `à l'année ${selectedYear || 2026}`}`,
        orientation: 'portrait',
        fontSize: '6.2pt',
        headerRows: [{ cells: headerCells1, bg: '#0f172a' }, { cells: headerCells2, bg: '#1e293b' }],
        bodyRows,
        footerRows: [{ cells: footerCells, bg: '#0f172a' }],
      });

      if (ok) {
        setCopyWordSuccess(true);
        setTimeout(() => setCopyWordSuccess(false), 3500);
      }
    } else {
      // ARTICLE view
      const headerCells1: any[] = [
        { text: 'CODE ARTICLE', bg: '#0f172a', color: '#ffffff', bold: true, align: 'left' },
        { text: 'DÉSIGNATION', bg: '#0f172a', color: '#ffffff', bold: true, align: 'left' },
        { text: 'CALIBRE', bg: '#0f172a', color: '#ffffff', bold: true, align: 'center' },
        { text: 'PROD. YTD (PCS)', bg: '#065f46', color: '#ffffff', bold: true, align: 'right' },
        { text: 'PROD. YTD (kDA)', bg: '#065f46', color: '#ffffff', bold: true, align: 'right' },
        { text: 'VENTES YTD (PCS)', bg: '#1e40af', color: '#ffffff', bold: true, align: 'right' },
        { text: 'VENTES YTD (kDA)', bg: '#1e40af', color: '#ffffff', bold: true, align: 'right' },
        { text: 'STOCK FINAL (PCS)', bg: '#0369a1', color: '#ffffff', bold: true, align: 'right' },
        { text: 'VALEUR STOCK (kDA)', bg: '#0369a1', color: '#ffffff', bold: true, align: 'right' },
      ];

      const bodyRows = aggregated.articles.map((art, idx) => ({
        cells: [
          { text: art.code_article, bold: true, align: 'left', bg: idx % 2 === 1 ? '#f8fafc' : '#ffffff' },
          { text: art.designation, align: 'left' },
          { text: art.famille_diametre, align: 'center' },
          { text: formatNumber(art.cumul_qte_entree), align: 'right', bold: true, color: '#166534' },
          { text: formatKDA(art.cumul_val_entree), align: 'right', bold: true, color: '#166534' },
          { text: formatNumber(art.cumul_qte_sortie), align: 'right', bold: true, color: '#1e40af' },
          { text: formatKDA(art.cumul_val_sortie), align: 'right', bold: true, color: '#1e40af' },
          { text: formatNumber(art.dernier_stock_qte), align: 'right', bold: true, color: '#0369a1' },
          { text: formatKDA(art.dernier_stock_val), align: 'right', bold: true, color: '#0369a1' },
        ],
      }));

      const footerCells: any[] = [
        { text: 'TOTAL CONSOLIDÉ', bold: true, align: 'left' },
        { text: `${aggregated.articles.length} articles`, align: 'left', bold: true },
        { text: '-', align: 'center' },
        { text: formatNumber(aggregated.totals.cumul_qte_entree), align: 'right', bold: true },
        { text: formatKDA(aggregated.totals.cumul_val_entree), align: 'right', bold: true },
        { text: formatNumber(aggregated.totals.cumul_qte_sortie), align: 'right', bold: true },
        { text: formatKDA(aggregated.totals.cumul_val_sortie), align: 'right', bold: true },
        { text: formatNumber(aggregated.totals.dernier_stock_qte), align: 'right', bold: true },
        { text: formatKDA(aggregated.totals.dernier_stock_val), align: 'right', bold: true },
      ];

      const ok = await copyTableDataToWord({
        title: `Sensus SPA - Vue Détaillée par Article (${selectedYear || 2026})`,
        subtitle: `Situation détaillée de la production et valorisation des stocks`,
        orientation: 'portrait',
        fontSize: '6.8pt',
        headerRows: [{ cells: headerCells1, bg: '#0f172a' }],
        bodyRows,
        footerRows: [{ cells: footerCells, bg: '#0f172a' }],
      });

      if (ok) {
        setCopyWordSuccess(true);
        setTimeout(() => setCopyWordSuccess(false), 3500);
      }
    }
  };

  const handleCopyAsImage = async () => {
    setIsCapturingImage(true);
    const ok = await copyElementAsImage('suivi-production-table-container');
    setIsCapturingImage(false);
    if (ok) {
      setCopyImageSuccess(true);
      setTimeout(() => setCopyImageSuccess(false), 3500);
    }
  };

  // Delete helpers & impact calculations
  const availableDeleteYears = useMemo(() => {
    return Array.from(new Set<number>(records.map((r) => r.annee))).sort((a: number, b: number) => b - a);
  }, [records]);

  const availableDeleteMonths = useMemo(() => {
    if (!deleteSelectedYear) return [];
    return sortMonthsChronologically(
      Array.from(new Set<string>(records.filter((r) => r.annee === deleteSelectedYear).map((r) => r.mois)))
    );
  }, [records, deleteSelectedYear]);

  const deleteImpact = useMemo(() => {
    let target = records;
    if (deleteScope === 'MONTH') {
      target = records.filter((r) => r.annee === deleteSelectedYear && r.mois === deleteSelectedMonth);
    } else if (deleteScope === 'YEAR') {
      target = records.filter((r) => r.annee === deleteSelectedYear);
    }
    const articles = new Set(target.map((r) => r.code_article)).size;
    const totEntree = target.reduce((sum, r) => sum + r.qte_entree, 0);
    const totSortie = target.reduce((sum, r) => sum + r.qte_sortie, 0);
    return { count: target.length, articles, totEntree, totSortie };
  }, [records, deleteScope, deleteSelectedYear, deleteSelectedMonth]);

  const handleOpenDeleteModal = () => {
    setDeleteScope('MONTH');
    const yr = selectedYear || availableDeleteYears[0] || 2026;
    setDeleteSelectedYear(yr);
    const monthsForYear = sortMonthsChronologically(
      Array.from(new Set<string>(records.filter((r) => r.annee === yr).map((r) => r.mois)))
    );
    setDeleteSelectedMonth(monthsForYear[monthsForYear.length - 1] || '');
    setDeleteErrorMsg(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteErrorMsg(null);
    try {
      let url = '/api/production-mcba';
      const params = new URLSearchParams();

      if (deleteScope === 'MONTH') {
        if (!deleteSelectedYear || !deleteSelectedMonth) {
          throw new Error('Veuillez sélectionner une année et un mois à supprimer.');
        }
        params.append('year', String(deleteSelectedYear));
        params.append('mois', deleteSelectedMonth);
      } else if (deleteScope === 'YEAR') {
        if (!deleteSelectedYear) {
          throw new Error('Veuillez sélectionner une année à supprimer.');
        }
        params.append('year', String(deleteSelectedYear));
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la suppression des données');
      }

      setImportSuccessMsg(data.message || 'Données supprimées avec succès.');
      setTimeout(() => setImportSuccessMsg(null), 6000);
      setIsDeleteModalOpen(false);
      await fetchProductionData();
    } catch (err: any) {
      console.error(err);
      setDeleteErrorMsg(err.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & PRIMARY ACTIONS */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-linear-to-br from-indigo-600 to-blue-700 text-white rounded-2xl shadow-md shadow-indigo-100 flex items-center justify-center">
            <Factory size={26} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Suivi de Production
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                SAP MCBA Produits Finis
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1">
                <Clock size={11} className="text-blue-600" />
                <span>Mise à jour données ({new Date().getFullYear()}) : {getLatestProductionUpdateTime(records, new Date().getFullYear())}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilotage de la fabrication, suivi des ventes, cumuls annuels (YTD) et valorisation des stocks en kDA.
            </p>
          </div>
        </div>

        {/* Action Controls & Top Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Display Mode: Senior (High Visibility) vs Standard */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSetDisplayMode('STANDARD')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'STANDARD'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Mode Standard : Tableau Simple & Épuré"
            >
              <Layers size={14} className="text-blue-600" />
              <span>Mode Standard</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetDisplayMode('SENIOR')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'SENIOR'
                  ? 'bg-emerald-700 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Mode Haute Visibilité : Grands Caractères & Bandes de Couleurs Contrastées"
            >
              <Eye size={14} />
              <span>Grands Caractères & Couleurs</span>
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Import Excel Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs hover:shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            title="Importer le fichier Excel SAP MCBA Produits Finis"
          >
            <Upload size={15} />
            <span>Importer Excel MCBA</span>
          </button>

          {/* Delete Data Button */}
          <button
            type="button"
            onClick={handleOpenDeleteModal}
            disabled={records.length === 0}
            className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold shadow-xs hover:shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            title="Supprimer des données erronées (par mois, par année ou réinitialisation)"
          >
            <Trash2 size={15} className="text-rose-600" />
            <span>Supprimer des données</span>
          </button>

          {/* Copy Table to Image / Word Buttons (Active for Table tab) */}
          {activeTab === 'TABLE' && (
            <>
              {/* Copy as Image Button */}
              <button
                type="button"
                onClick={handleCopyAsImage}
                disabled={records.length === 0 || isCapturingImage}
                className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Copier le tableau complet comme une Image Haute Définition (Ctrl+V dans Word, PowerPoint ou Email)"
              >
                {copyImageSuccess ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Image Copiée (Ctrl+V) !</span>
                  </>
                ) : (
                  <>
                    <Camera size={14} className="text-purple-700" />
                    <span>{isCapturingImage ? 'Capture...' : 'Copier Image HD'}</span>
                  </>
                )}
              </button>

              {/* Copy Table to Word Button */}
              <button
                type="button"
                onClick={handleCopyForWord}
                disabled={records.length === 0}
                className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Copier le tableau complet au format Word / Excel éditable"
              >
                {copyWordSuccess ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copié pour Word !</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} className="text-indigo-700" />
                    <span>Copier Texte Word</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={records.length === 0}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Exporter le tableau actuel vers Excel"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exporter</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchProductionData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Actualiser les données"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {importSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <Check size={16} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">{importSuccessMsg}</span>
        </div>
      )}
      {/* 2. SUB-PAGE NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('PRODUCT_MOIS')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'PRODUCT_MOIS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>Tableau de Bord & Budget</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('TABLE')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'TABLE'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Layers size={16} />
          <span>Tableau de Suivi Mensuel</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CHARTS')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'CHARTS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <TrendingUp size={16} />
          <span>Graphiques & Analyses Multi-Années</span>
        </button>
      </div>

      {activeTab === 'PRODUCT_MOIS' ? (
        <ProductionTableauDeBord records={records} allAvailableYears={availableYears} displayMode={displayMode} />
      ) : activeTab === 'CHARTS' ? (
        <ProductionReporting records={records} allAvailableYears={availableYears} />
      ) : (
        <>
          {/* 3. KPI SUMMARY CARDS (CLEAN STANDARD CORPORATE DESIGN) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Total Production YTD */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Production Totale {upToMonthCutoff ? `(${formatMonthString(upToMonthCutoff, true)})` : 'Annuelle'}
                </span>
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <Factory size={18} />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                    {formatNumber(aggregated.totals.cumul_qte_entree)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">Pièces</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                    {formatKDA(aggregated.totals.cumul_val_entree)}
                  </span>
                  <span className="text-slate-500">valeur produite</span>
                </div>
              </div>
            </div>

            {/* Total Sold YTD */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ventes & Sorties {upToMonthCutoff ? `(${formatMonthString(upToMonthCutoff, true)})` : 'Annuelles'}
                </span>
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                    {formatNumber(aggregated.totals.cumul_qte_sortie)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">Pièces</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                    {formatKDA(aggregated.totals.cumul_val_sortie)}
                  </span>
                  <span className="text-slate-500">valeur vendue</span>
                </div>
              </div>
            </div>

            {/* Stock Status End of Period */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Stock Produits Finis {upToMonthCutoff ? `(${formatMonthString(upToMonthCutoff, true)})` : ''}
                </span>
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <Boxes size={18} />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                    {formatNumber(aggregated.totals.dernier_stock_qte)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">Pièces</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                    {formatKDA(aggregated.totals.dernier_stock_val)}
                  </span>
                  <span className="text-slate-500">valeur stock arrêté</span>
                </div>
              </div>
            </div>

            {/* Focus Export & Sell-Through */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  Modèle Export (L170)
                </span>
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <PieChart size={18} />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                    {formatNumber(exportMetrics.qty)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">Pièces</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs flex-wrap">
                  <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                    {formatKDA(exportMetrics.val)}
                  </span>
                  <span className="text-slate-600 font-medium">
                    {exportMetrics.sharePct}% de la prod
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. CONTROLS BAR: CLEAN NEUTRAL DESIGN */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Year selector */}
              {availableYears.length > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <Calendar size={14} className="text-slate-500" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        Année {yr}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Point-in-time Cumulative Cutoff Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <Clock size={14} className="text-slate-500 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-500">Cumul arrêté à :</span>
                <select
                  value={upToMonthCutoff}
                  onChange={(e) => setUpToMonthCutoff(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
                  title="Calcule le cumul production, ventes et stock arrêté au mois sélectionné"
                >
                  <option value="">Année Complète ({aggregated.allMonths[aggregated.allMonths.length - 1] || 'Dernier mois'})</option>
                  {aggregated.allMonths.map((m) => {
                    const mNum = parseInt(m.split('.')[0], 10);
                    return (
                      <option key={m} value={m}>
                        {getMonthName(mNum)} ({m})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('DIAMETER')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    viewMode === 'DIAMETER'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Vue par Diamètre
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('ARTICLE')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    viewMode === 'ARTICLE'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Vue Détaillée par Article
                </button>
              </div>

              {/* Expand / Collapse All Button (Visible in Diameter view) */}
              {viewMode === 'DIAMETER' && (
                <button
                  type="button"
                  onClick={toggleExpandAll}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title={allGroupsExpanded ? 'Replier tous les calibres' : 'Déplier tous les calibres pour voir les articles'}
                >
                  {allGroupsExpanded ? (
                    <>
                      <ChevronDown size={14} className="text-slate-700" />
                      <span>Tout Replier</span>
                    </>
                  ) : (
                    <>
                      <ChevronRight size={14} className="text-slate-700" />
                      <span>Tout Déplier</span>
                    </>
                  )}
                </button>
              )}

              {/* Month Selector Dropdown / Shortcuts */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMonthFilterDropdown(!showMonthFilterDropdown)}
                  className="px-3.5 py-2 rounded-xl border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 text-slate-900 text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <SlidersHorizontal size={15} className="text-blue-700" />
                  <span>
                    Mois affichés :{' '}
                    <strong className="text-blue-900 font-black">
                      {visibleMonths.length === aggregated.allMonths.length
                        ? 'Tous (' + visibleMonths.length + ' mois)'
                        : visibleMonths.map((m) => formatMonthString(m, true)).join(', ') || 'Aucun'}
                    </strong>
                  </span>
                  <ChevronDown size={16} />
                </button>

                {/* Dropdown Menu */}
                {showMonthFilterDropdown && (
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border-2 border-slate-300 p-4 z-30 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-sm font-black text-slate-900">Sélection des Mois</span>
                      <button
                        onClick={() => setShowMonthFilterDropdown(false)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Quick Shortcuts */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMonthSelectionMode('LAST_1');
                          setVisibleMonths(aggregated.allMonths.slice(-1));
                        }}
                        className={`px-3 py-2 text-xs font-black rounded-xl border-2 text-center transition-all cursor-pointer ${
                          visibleMonths.length === 1 && visibleMonths[0] === aggregated.allMonths[aggregated.allMonths.length - 1]
                            ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                            : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        ⭐ Mois en Cours
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMonthSelectionMode('ALL');
                          setVisibleMonths(aggregated.allMonths);
                        }}
                        className={`px-3 py-2 text-xs font-black rounded-xl border-2 text-center transition-all cursor-pointer ${
                          visibleMonths.length === aggregated.allMonths.length
                            ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                            : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Tous ({aggregated.allMonths.length})
                      </button>
                    </div>

                    {/* Checkboxes for each month */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pt-1">
                      <p className="text-[11px] uppercase font-black text-slate-500 tracking-wider">
                        Mois individuels :
                      </p>
                      {aggregated.allMonths.map((m) => {
                        const isChecked = visibleMonths.includes(m);
                        return (
                          <label
                            key={m}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-xs sm:text-sm font-bold text-slate-800 cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <span>{formatMonthString(m, true)}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleMonthVisibility(m)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full lg:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher calibre, code, modèle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 5. MAIN DATA TABLE (SUPPORTING SENIOR & STANDARD MODES) */}
          <div id="suivi-production-table-container" className={`bg-white rounded-2xl shadow-md overflow-hidden ${
            displayMode === 'SENIOR' ? 'border-2 border-slate-400' : 'border border-slate-200'
          }`}>
            {loading ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <RefreshCw size={28} className="animate-spin text-blue-600 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Chargement des données de production...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Factory size={32} />
                </div>
                <div className="max-w-sm mx-auto space-y-1.5">
                  <h3 className="text-base font-black text-slate-900">Aucune donnée de production importée</h3>
                  <p className="text-xs text-slate-600 font-semibold">
                    Cliquez sur <strong>"Importer Excel MCBA"</strong> pour charger votre fichier SAP MCBA Produits Finis (ex: <code>mcba produit fini.xlsx</code>).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-black shadow-md hover:bg-indigo-500 cursor-pointer"
                >
                  Sélectionner le fichier Excel
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[750px] relative">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                {/* STICKY HEADER */}
                <thead className="sticky top-0 z-20 shadow-xs">
                  {/* Level 1: Category Super-Headers */}
                  <tr className="bg-slate-900 text-white font-bold text-xs border-b border-slate-800">
                    <th className="py-3 px-4 min-w-[240px] sticky left-0 z-30 bg-slate-900 text-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] border-r border-slate-700" rowSpan={2}>
                      {viewMode === 'DIAMETER' ? 'Diamètre / Famille' : 'Article SAP (Code & Libellé)'}
                    </th>

                    {/* Stock Initial N-1 Super Header */}
                    <th
                      colSpan={2}
                      className="py-2.5 px-2 text-center uppercase tracking-wider text-xs border-l border-slate-700 bg-slate-900 text-slate-200 font-bold"
                    >
                      Report N-1 ({aggregated.previousYear})
                    </th>

                    {/* Monthly Super Headers */}
                    {visibleMonths.map((m) => (
                      <th
                        key={m}
                        colSpan={4}
                        className="py-2.5 px-2 text-center uppercase tracking-wider text-xs border-l border-slate-700 bg-slate-900 text-slate-200 font-bold"
                      >
                        {formatMonthString(m, false).toUpperCase()}
                      </th>
                    ))}

                    {/* Cumul Annuel Super Header */}
                    <th
                      colSpan={4}
                      className="py-2.5 px-2 text-center uppercase tracking-wider text-xs border-l border-slate-700 bg-slate-900 text-slate-200 font-bold"
                    >
                      Cumul Annuel ({selectedYear || 2026})
                    </th>

                    {/* Situation Stock Super Header */}
                    <th
                      colSpan={2}
                      className="py-2.5 px-2 text-center uppercase tracking-wider text-xs border-l border-slate-700 bg-slate-900 text-slate-200 font-bold"
                    >
                      Stock Final
                    </th>
                  </tr>

                  {/* Level 2: Sub-Headers */}
                  <tr className="border-b border-slate-300 text-xs font-semibold bg-slate-100 text-slate-700">
                    {/* Stock Initial N-1 Sub Headers */}
                    <th className="py-2 px-2 text-right border-l-2 border-slate-300 min-w-[105px]">
                      Stock Initial (U)
                    </th>
                    <th className="py-2 px-2 text-right border-l border-slate-200 min-w-[110px]">
                      Valeur Init. (kDA)
                    </th>

                    {/* For each visible month */}
                    {visibleMonths.map((m) => (
                      <React.Fragment key={`sub-${m}`}>
                        <th className="py-2 px-2 text-right border-l-2 border-slate-300 min-w-[100px]">
                          Production (U)
                        </th>
                        <th className="py-2 px-2 text-right border-l border-slate-200 min-w-[110px]">
                          Valeur Prod (kDA)
                        </th>
                        <th className="py-2 px-2 text-right border-l-2 border-slate-300 min-w-[100px]">
                          Ventes (U)
                        </th>
                        <th className="py-2 px-2 text-right border-l border-slate-200 min-w-[110px]">
                          Valeur Ventes (kDA)
                        </th>
                      </React.Fragment>
                    ))}

                    {/* Paired Cumul Sub Headers */}
                    <th className="py-2 px-2 text-right border-l-2 border-slate-300 min-w-[110px]">
                      Cumul Prod (U)
                    </th>
                    <th className="py-2 px-2 text-right border-l border-slate-200 min-w-[115px]">
                      Val. Cum. Prod (kDA)
                    </th>
                    <th className="py-2 px-2 text-right border-l-2 border-slate-300 min-w-[110px]">
                      Cumul Ventes (U)
                    </th>
                    <th className="py-2 px-2 text-right border-l border-slate-200 min-w-[115px]">
                      Val. Cum. Ventes (kDA)
                    </th>

                    {/* Paired Stock Sub Headers */}
                    <th className="py-2 px-2 text-right border-l-2 border-slate-300 min-w-[105px]">
                      Stock (U)
                    </th>
                    <th className="py-2 px-2 text-right border-l border-slate-200 min-w-[115px]">
                      Valeur Stock (kDA)
                    </th>
                  </tr>
              </thead>

              {/* Table Body */}
              <tbody className={`divide-y ${displayMode === 'SENIOR' ? 'divide-slate-300' : 'divide-slate-200'}`}>
                {viewMode === 'DIAMETER' ? (
                  /* DIAMETER GROUP VIEW (WITH EXPANDABLE DETAILS FOR DN 15 AND OTHERS) */
                  filteredGroups.map((grp) => {
                    const isExpanded = Boolean(expandedDiameters[grp.famille_diametre]);
                    const hasMultipleModels = grp.articles.length > 1;

                    return (
                      <React.Fragment key={grp.famille_diametre}>
                        {/* Parent Diameter Row */}
                        <tr className={`transition-colors border-b ${
                          displayMode === 'SENIOR'
                            ? 'border-slate-300 hover:brightness-95'
                            : 'border-slate-200 hover:bg-slate-50/80'
                        }`}>
                          {/* Col: Name */}
                          <td className="py-2.5 px-4 sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                            <div className="flex items-center gap-2">
                              {hasMultipleModels ? (
                                <button
                                  type="button"
                                  onClick={() => toggleDiameterExpand(grp.famille_diametre)}
                                  className="p-1 rounded-md transition-all cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                                  title={isExpanded ? 'Replier le détail' : 'Déplier les modèles'}
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                              ) : (
                                <div className="w-6" />
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">
                                  {grp.famille_diametre === 'DN 15' ? 'DN 15 (National)' : grp.famille_diametre}
                                </span>
                                {grp.famille_diametre.includes('Export') && (
                                  <span className="text-[10px] font-bold uppercase tracking-tight bg-slate-800 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                    Modèle Export (420 015 L170)
                                  </span>
                                )}
                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200">
                                  {grp.modelCount} mod.
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Stock Initial N-1 for Group */}
                          <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l-2 border-slate-300 bg-white">
                            {aggregated.hasPreviousYearData && grp.stock_initial_qte !== null ? (
                              grp.stock_initial_qte > 0 ? formatNumber(grp.stock_initial_qte) : '-'
                            ) : (
                              <span className="text-slate-300 font-normal">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l border-slate-200 bg-white">
                            {aggregated.hasPreviousYearData && grp.stock_initial_val !== null ? (
                              grp.stock_initial_val > 0 ? formatKDA(grp.stock_initial_val) : '-'
                            ) : (
                              <span className="text-slate-300 font-normal">-</span>
                            )}
                          </td>

                          {/* Monthly Columns for Group */}
                          {visibleMonths.map((m) => {
                            const pt = grp.monthsData[m];
                            const qProd = pt ? pt.qte_entree : 0;
                            const vProd = pt ? pt.val_entree : 0;
                            const qVent = pt ? pt.qte_sortie : 0;
                            const vVent = pt ? pt.val_sortie : 0;

                            return (
                              <React.Fragment key={`grp-${grp.famille_diametre}-${m}`}>
                                {/* Prod Qty */}
                                <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l-2 border-slate-300 bg-white">
                                  {qProd > 0 ? formatNumber(qProd) : <span className="text-slate-300 font-normal">-</span>}
                                </td>
                                {/* Prod Val */}
                                <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l border-slate-200 bg-white">
                                  {vProd > 0 ? formatKDA(vProd) : <span className="text-slate-300 font-normal">-</span>}
                                </td>

                                {/* Ventes Qty */}
                                <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l-2 border-slate-300 bg-white">
                                  {qVent > 0 ? formatNumber(qVent) : <span className="text-slate-300 font-normal">-</span>}
                                </td>
                                {/* Ventes Val */}
                                <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l border-slate-200 bg-white">
                                  {vVent > 0 ? formatKDA(vVent) : <span className="text-slate-300 font-normal">-</span>}
                                </td>
                              </React.Fragment>
                            );
                          })}

                          {/* Cumul Columns for Group */}
                          <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm text-slate-800 font-semibold border-l-2 border-slate-300 bg-white">
                            {formatNumber(grp.cumul_qte_entree)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm text-slate-800 font-semibold border-l border-slate-200 bg-white">
                            {formatKDA(grp.cumul_val_entree)}
                          </td>

                          <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm text-slate-800 font-semibold border-l-2 border-slate-300 bg-white">
                            {formatNumber(grp.cumul_qte_sortie)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm text-slate-800 font-semibold border-l border-slate-200 bg-white">
                            {formatKDA(grp.cumul_val_sortie)}
                          </td>

                          {/* Stock Columns for Group */}
                          <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm text-slate-800 font-semibold border-l-2 border-slate-300 bg-white">
                            {formatNumber(grp.dernier_stock_qte)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm text-slate-800 font-semibold border-l border-slate-200 bg-white">
                            {formatKDA(grp.dernier_stock_val)}
                          </td>
                        </tr>

                        {/* Expandable Sub-Rows */}
                        {isExpanded &&
                          grp.articles.map((art) => (
                            <tr
                              key={art.code_article}
                              className="transition-colors border-b border-slate-100 hover:bg-slate-50/80 text-xs bg-slate-50/40"
                            >
                              <td className="py-2 px-4 pl-9 sticky left-0 z-10 bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="truncate font-semibold text-slate-800 text-xs" title={art.designation}>
                                      {art.designation}
                                    </span>
                                    {(art.code_article === '01021167' || art.designation.includes('L170') || art.famille_diametre.includes('Export')) && (
                                      <span className="text-[9px] font-bold uppercase tracking-tight bg-slate-700 text-white px-1.5 py-0.2 rounded">
                                        Export
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    SAP : {art.code_article}
                                  </span>
                                </div>
                              </td>

                              {/* Stock Initial N-1 for Article */}
                              <td className="py-2 px-2 text-right font-mono text-xs text-slate-600 border-l-2 border-slate-200">
                                {aggregated.hasPreviousYearData && art.stock_initial_qte !== null ? (
                                  art.stock_initial_qte > 0 ? formatNumber(art.stock_initial_qte) : '-'
                                ) : (
                                  <span className="text-slate-300 font-normal">-</span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-xs text-slate-600 border-l border-slate-100">
                                {aggregated.hasPreviousYearData && art.stock_initial_val !== null ? (
                                  art.stock_initial_val > 0 ? formatKDA(art.stock_initial_val) : '-'
                                ) : (
                                  <span className="text-slate-300 font-normal">-</span>
                                )}
                              </td>

                              {/* Monthly Data for Article */}
                              {visibleMonths.map((m) => {
                                const pt = art.monthsData[m];
                                const qProd = pt ? pt.qte_entree : 0;
                                const vProd = pt ? pt.val_entree : 0;
                                const qVent = pt ? pt.qte_sortie : 0;
                                const vVent = pt ? pt.val_sortie : 0;

                                return (
                                  <React.Fragment key={`art-${art.code_article}-${m}`}>
                                    <td className="py-2 px-2 text-right font-mono text-xs text-slate-600 border-l-2 border-slate-200">
                                      {qProd > 0 ? formatNumber(qProd) : <span className="text-slate-300 font-normal">-</span>}
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono text-xs text-slate-600 border-l border-slate-100">
                                      {vProd > 0 ? formatKDA(vProd) : <span className="text-slate-300 font-normal">-</span>}
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono text-xs text-slate-600 border-l-2 border-slate-200">
                                      {qVent > 0 ? formatNumber(qVent) : <span className="text-slate-300 font-normal">-</span>}
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono text-xs text-slate-600 border-l border-slate-100">
                                      {vVent > 0 ? formatKDA(vVent) : <span className="text-slate-300 font-normal">-</span>}
                                    </td>
                                  </React.Fragment>
                                );
                              })}

                              {/* Cumul Data for Article */}
                              <td className="py-2 px-2 text-right font-mono text-xs text-slate-600 border-l-2 border-slate-200">
                                {formatNumber(art.cumul_qte_entree)}
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-xs text-slate-600 border-l border-slate-100">
                                {formatKDA(art.cumul_val_entree)}
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-xs text-slate-600 border-l-2 border-slate-200">
                                {formatNumber(art.cumul_qte_sortie)}
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-xs text-slate-600 border-l border-slate-100">
                                {formatKDA(art.cumul_val_sortie)}
                              </td>

                              {/* Stock Data for Article */}
                              <td className="py-2 px-2 text-right font-mono text-xs text-slate-600 border-l-2 border-slate-200">
                                {formatNumber(art.dernier_stock_qte)}
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-xs text-slate-600 border-l border-slate-100">
                                {formatKDA(art.dernier_stock_val)}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })
                ) : (
                  /* FLAT ARTICLE DETAILED VIEW */
                  allArticlesList.map((art) => (
                    <tr key={art.code_article} className="transition-colors border-b border-slate-200 hover:bg-slate-50 text-xs sm:text-sm">
                      <td className="py-2.5 px-4 sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                            {art.famille_diametre}
                          </span>
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-slate-900 text-xs sm:text-sm" title={art.designation}>
                              {art.designation}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              SAP : {art.code_article}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Stock Initial N-1 for Article */}
                      <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l-2 border-slate-300 bg-white">
                        {aggregated.hasPreviousYearData && art.stock_initial_qte !== null ? (
                          art.stock_initial_qte > 0 ? formatNumber(art.stock_initial_qte) : '-'
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l border-slate-200 bg-white">
                        {aggregated.hasPreviousYearData && art.stock_initial_val !== null ? (
                          art.stock_initial_val > 0 ? formatKDA(art.stock_initial_val) : '-'
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>

                      {/* Monthly data */}
                      {visibleMonths.map((m) => {
                        const pt = art.monthsData[m];
                        const qProd = pt ? pt.qte_entree : 0;
                        const vProd = pt ? pt.val_entree : 0;
                        const qVent = pt ? pt.qte_sortie : 0;
                        const vVent = pt ? pt.val_sortie : 0;

                        return (
                          <React.Fragment key={`flat-${art.code_article}-${m}`}>
                            <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l-2 border-slate-300 bg-white">
                              {qProd > 0 ? formatNumber(qProd) : <span className="text-slate-300 font-normal">-</span>}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l border-slate-200 bg-white">
                              {vProd > 0 ? formatKDA(vProd) : <span className="text-slate-300 font-normal">-</span>}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l-2 border-slate-300 bg-white">
                              {qVent > 0 ? formatNumber(qVent) : <span className="text-slate-300 font-normal">-</span>}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l border-slate-200 bg-white">
                              {vVent > 0 ? formatKDA(vVent) : <span className="text-slate-300 font-normal">-</span>}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* Cumul */}
                      <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l-2 border-slate-300 bg-white">
                        {formatNumber(art.cumul_qte_entree)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l border-slate-200 bg-white">
                        {formatKDA(art.cumul_val_entree)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l-2 border-slate-300 bg-white">
                        {formatNumber(art.cumul_qte_sortie)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l border-slate-200 bg-white">
                        {formatKDA(art.cumul_val_sortie)}
                      </td>

                      {/* Stock */}
                      <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l-2 border-slate-300 bg-white">
                        {formatNumber(art.dernier_stock_qte)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 border-l border-slate-200 bg-white">
                        {formatKDA(art.dernier_stock_val)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Table Footer: TOTAL GÉNÉRAL (Solid Corporate Dark Navy/Slate) */}
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-800 text-xs">
                  <td className="py-3 px-4 uppercase tracking-wider sticky left-0 z-20 text-white font-bold bg-slate-900 border-r border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                    TOTAL GÉNÉRAL ({aggregated.articleCount} articles)
                  </td>

                  {/* Stock Initial Totals */}
                  <td className="py-3 px-2 text-right font-mono text-slate-100 font-bold border-l-2 border-slate-700 bg-slate-900">
                    {aggregated.hasPreviousYearData && aggregated.totals.stock_initial_qte !== null ? (
                      formatNumber(aggregated.totals.stock_initial_qte)
                    ) : (
                      <span className="text-slate-500 font-normal">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-100 font-bold border-l border-slate-700 bg-slate-900">
                    {aggregated.hasPreviousYearData && aggregated.totals.stock_initial_val !== null ? (
                      formatKDA(aggregated.totals.stock_initial_val)
                    ) : (
                      <span className="text-slate-500 font-normal">-</span>
                    )}
                  </td>

                  {/* Monthly Totals */}
                  {visibleMonths.map((m) => {
                    const pt = aggregated.totals.monthsTotals[m];
                    const qProd = pt ? pt.qte_entree : 0;
                    const vProd = pt ? pt.val_entree : 0;
                    const qVent = pt ? pt.qte_sortie : 0;
                    const vVent = pt ? pt.val_sortie : 0;

                    return (
                      <React.Fragment key={`tot-${m}`}>
                        {/* Paired Prod Totals */}
                        <td className="py-3 px-2 text-right font-mono text-slate-100 font-bold border-l-2 border-slate-700 bg-slate-900">
                          {formatNumber(qProd)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-100 font-bold border-l border-slate-700 bg-slate-900">
                          {formatKDA(vProd)}
                        </td>

                        {/* Paired Ventes Totals */}
                        <td className="py-3 px-2 text-right font-mono text-slate-100 font-bold border-l-2 border-slate-700 bg-slate-900">
                          {formatNumber(qVent)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-100 font-bold border-l border-slate-700 bg-slate-900">
                          {formatKDA(vVent)}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* Cumul Totals */}
                  <td className="py-3 px-2 text-right font-mono text-slate-100 font-bold border-l-2 border-slate-700 bg-slate-900">
                    {formatNumber(aggregated.totals.cumul_qte_entree)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-100 font-bold border-l border-slate-700 bg-slate-900">
                    {formatKDA(aggregated.totals.cumul_val_entree)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-100 font-bold border-l-2 border-slate-700 bg-slate-900">
                    {formatNumber(aggregated.totals.cumul_qte_sortie)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-100 font-bold border-l border-slate-700 bg-slate-900">
                    {formatKDA(aggregated.totals.cumul_val_sortie)}
                  </td>

                  {/* Stock Totals */}
                  <td className="py-3 px-2 text-right font-mono text-slate-100 font-bold border-l-2 border-slate-700 bg-slate-900">
                    {formatNumber(aggregated.totals.dernier_stock_qte)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-100 font-bold border-l border-slate-700 bg-slate-900">
                    {formatKDA(aggregated.totals.dernier_stock_val)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      </>
      )}


      {/* 5. MODAL: EXCEL IMPORT PREVIEW & CONFIRMATION */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-linear-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Importation SAP MCBA Produits Finis ({parsedImportRows.length} lignes détectées)
                  </h2>
                  <p className="text-[11px] text-emerald-200/80">Fichier : {importFileName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Targeted Preservation Alert */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 flex items-start gap-3">
                <CheckCircle2 size={20} className="text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-blue-950 text-xs">
                    Mise à jour ciblée — Mois détecté(s) dans le fichier ({detectedImportMonths.length}) :{' '}
                    <span className="text-blue-700 font-mono font-black">
                      {detectedImportMonths.map((m) => formatMonthString(m, true)).join(', ') || 'N/A'}
                    </span>
                  </p>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    <strong>Règle de conservation :</strong> Seul(s) ce(s) mois détecté(s) ser(ont) mis à jour / remplacé(s). Tous les autres mois déjà existants dans la base de données (ex: Janvier à Août) restent intacts et ne seront pas effacés.
                  </p>
                </div>
              </div>

              {/* Import Summary Alert */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-start gap-3">
                <Info size={20} className="text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-900">
                    Structure SAP MCBA validée avec succès :
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Les colonnes de production (<code>QtéEnt.SV</code>), ventes/sorties (<code>Sortie</code>), stocks et valeurs en DZD ont été détectées et converties automatiquement par calibre (DN 15, DN 20, WPD...).
                  </p>
                </div>
              </div>

              {/* Sample Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                  Aperçu des 10 premières lignes extraites :
                </div>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2">Mois</th>
                        <th className="p-2">Code</th>
                        <th className="p-2">Désignation</th>
                        <th className="p-2">Diamètre</th>
                        <th className="p-2 text-right">Prod (PCE)</th>
                        <th className="p-2 text-right">Ventes (PCE)</th>
                        <th className="p-2 text-right">Stock</th>
                        <th className="p-2 text-right">Val Stock (kDA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedImportRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-2 font-mono font-bold text-slate-900">{row.mois}</td>
                          <td className="p-2 font-mono">{row.code_article}</td>
                          <td className="p-2 truncate max-w-xs">{row.designation}</td>
                          <td className="p-2 font-bold text-indigo-700">{row.famille_diametre}</td>
                          <td className="p-2 text-right font-mono text-emerald-700 font-bold">{formatNumber(row.qte_entree)}</td>
                          <td className="p-2 text-right font-mono text-indigo-700 font-bold">{formatNumber(row.qte_sortie)}</td>
                          <td className="p-2 text-right font-mono font-bold">{formatNumber(row.qte_stock)}</td>
                          <td className="p-2 text-right font-mono text-rose-700">{formatKDA(row.val_stock)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isImporting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Confirmer et Enregistrer ({parsedImportRows.length} lignes)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: DELETE PRODUCTION DATA CONFIRMATION */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 bg-linear-to-r from-rose-900 via-rose-800 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/20 text-rose-300 rounded-xl">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    Suppression des Données de Production
                  </h2>
                  <p className="text-[11px] text-rose-200/80">
                    Suppression ciblée par mois ou par année pour réimportation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
              {deleteErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                  <span className="font-bold">{deleteErrorMsg}</span>
                </div>
              )}

              {/* Scope Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">
                  Sélectionnez le niveau de suppression :
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteScope('MONTH')}
                    className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black text-center transition-all cursor-pointer ${
                      deleteScope === 'MONTH'
                        ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🗓️ Par Mois
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteScope('YEAR')}
                    className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black text-center transition-all cursor-pointer ${
                      deleteScope === 'YEAR'
                        ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    📅 Toute une Année
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteScope('ALL')}
                    className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black text-center transition-all cursor-pointer ${
                      deleteScope === 'ALL'
                        ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⚠️ Tout Effacer
                  </button>
                </div>
              </div>

              {/* Filters based on scope */}
              {deleteScope === 'MONTH' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                      1. Exercice (Année)
                    </label>
                    <select
                      value={deleteSelectedYear}
                      onChange={(e) => {
                        const yr = Number(e.target.value);
                        setDeleteSelectedYear(yr);
                        const mList = sortMonthsChronologically(
                          Array.from(new Set<string>(records.filter((r) => r.annee === yr).map((r) => r.mois)))
                        );
                        setDeleteSelectedMonth(mList[mList.length - 1] || '');
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer"
                    >
                      {availableDeleteYears.map((yr) => (
                        <option key={yr} value={yr}>
                          Année {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                      2. Mois à supprimer
                    </label>
                    <select
                      value={deleteSelectedMonth}
                      onChange={(e) => setDeleteSelectedMonth(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer"
                    >
                      {availableDeleteMonths.map((m) => (
                        <option key={m} value={m}>
                          {formatMonthString(m, true)} ({m})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {deleteScope === 'YEAR' && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                    Sélectionner l'Année à supprimer intégralement
                  </label>
                  <select
                    value={deleteSelectedYear}
                    onChange={(e) => setDeleteSelectedYear(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer"
                  >
                    {availableDeleteYears.map((yr) => (
                      <option key={yr} value={yr}>
                        Toutes les données de l'exercice {yr}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {deleteScope === 'ALL' && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                  <p className="font-black flex items-center gap-1.5 text-xs text-rose-800">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    Attention : Réinitialisation Totale
                  </p>
                  <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                    Cette action va effacer <strong>l'ensemble des données de production de toutes les années</strong> enregistrées dans la base de données.
                  </p>
                </div>
              )}

              {/* Impact Card */}
              <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 space-y-2">
                <p className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  📊 Données concernées par la suppression :
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="block text-[11px] font-bold text-slate-500">Lignes</span>
                    <span className="text-base font-black text-rose-700 font-mono">
                      {deleteImpact.count}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="block text-[11px] font-bold text-slate-500">Articles</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      {deleteImpact.articles}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="block text-[11px] font-bold text-slate-500">Prod (PCE)</span>
                    <span className="text-base font-black text-emerald-700 font-mono">
                      {formatNumber(deleteImpact.totEntree)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="block text-[11px] font-bold text-slate-500">Ventes (PCE)</span>
                    <span className="text-base font-black text-indigo-700 font-mono">
                      {formatNumber(deleteImpact.totSortie)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || deleteImpact.count === 0}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>
                  {isDeleting
                    ? 'Suppression en cours...'
                    : `Confirmer la Suppression (${deleteImpact.count} lignes)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
