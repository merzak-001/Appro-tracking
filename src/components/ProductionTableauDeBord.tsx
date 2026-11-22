import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  Target,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Download,
  Save,
  RefreshCw,
  Edit3,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Eye,
  Clock,
  Check,
  Camera,
  Copy,
  Filter,
  Hand,
  MoveHorizontal,
} from 'lucide-react';
import { ProductionMonthlyRecord, ProductionBudgetItem } from '../types';
import {
  formatNumber,
  formatKDA,
  toKDA,
  getMonthName,
  formatMonthString,
  sortMonthsChronologically,
  extractDiameter,
  isExportMeterArticle,
  DIAMETER_ORDER,
  getLatestProductionUpdateTime,
  getLatestRecordPeriod,
} from '../utils/productionUtils';
import { copyTableDataToWord } from '../utils/wordExportUtils';
import { copyElementAsImage } from '../utils/imageExportUtils';

interface ProductionTableauDeBordProps {
  records: ProductionMonthlyRecord[];
  allAvailableYears: number[];
  displayMode?: 'SENIOR' | 'STANDARD';
}

const DISPLAY_CALIBRES = [
  { key: 'DN 15', label: '420PC DN15' },
  { key: 'DN 20', label: '420PC DN20' },
  { key: 'DN 30', label: '420PC DN30' },
  { key: 'DN 40', label: '420PC DN40' },
  { key: 'DN 50', label: 'WPDN50' },
  { key: 'DN 65', label: 'WPDN65' },
  { key: 'DN 80', label: 'WPDN80' },
  { key: 'DN 100', label: 'WPDN100' },
  { key: 'DN 125', label: 'WPDN125' },
  { key: 'DN 150', label: 'WPDN150' },
];

const DEFAULT_BUDGET_MAP: Record<
  string,
  { label: string; budget_qte: number; prix_unitaire_kda: number; prevision_cloture_qte: number }
> = {
  'DN 15': { label: '420PC DN15', budget_qte: 465000, prix_unitaire_kda: 4.38066, prevision_cloture_qte: 470062 },
  'DN 20': { label: '420PC DN20', budget_qte: 10000, prix_unitaire_kda: 5.00000, prevision_cloture_qte: 7807 },
  'DN 30': { label: '420PC DN30', budget_qte: 950, prix_unitaire_kda: 14.30000, prevision_cloture_qte: 970 },
  'DN 40': { label: '420PC DN40', budget_qte: 1100, prix_unitaire_kda: 21.00000, prevision_cloture_qte: 1231 },
  'DN 50': { label: 'WPDN50', budget_qte: 600, prix_unitaire_kda: 29.18000, prevision_cloture_qte: 600 },
  'DN 65': { label: 'WPDN65', budget_qte: 300, prix_unitaire_kda: 31.39000, prevision_cloture_qte: 300 },
  'DN 80': { label: 'WPDN80', budget_qte: 250, prix_unitaire_kda: 36.80000, prevision_cloture_qte: 250 },
  'DN 100': { label: 'WPDN100', budget_qte: 200, prix_unitaire_kda: 44.00000, prevision_cloture_qte: 200 },
  'DN 125': { label: 'WPDN125', budget_qte: 150, prix_unitaire_kda: 52.15000, prevision_cloture_qte: 150 },
  'DN 150': { label: 'WPDN150', budget_qte: 125, prix_unitaire_kda: 78.90000, prevision_cloture_qte: 125 },
  'DN 25': { label: '420PC DN25', budget_qte: 0, prix_unitaire_kda: 0.00000, prevision_cloture_qte: 0 },
  'DN 200': { label: 'WPDN200', budget_qte: 0, prix_unitaire_kda: 0.00000, prevision_cloture_qte: 0 },
  'Autres': { label: 'Autres', budget_qte: 0, prix_unitaire_kda: 0.00000, prevision_cloture_qte: 0 },
};

function formatPercent(val: any): string {
  if (val === null || val === undefined) return '-';
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return '-';
  if (num === 0) return '0%';
  return Math.round(num * 100) + '%';
}

function formatPricePU(val: any): string {
  if (val === undefined || val === null) return '-';
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return '-';
  if (num === 0) return '0,00';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatNumVal(val: any, _maxDec: number = 0): string {
  if (val === undefined || val === null) return '-';
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return '-';
  if (num === 0) return '0';
  const rounded = Math.round(num);
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(rounded);
}

function getPercentColorClass(
  val: number | null | undefined,
  _mode: string = 'SENIOR'
): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val) || val === 0) {
    return 'text-slate-500 font-normal';
  }
  return 'text-slate-900 font-bold';
}

export const ProductionTableauDeBord: React.FC<ProductionTableauDeBordProps> = ({
  records,
  allAvailableYears,
  displayMode = 'SENIOR',
}) => {
  const [copyWordSuccess, setCopyWordSuccess] = useState(false);
  const [copyImageSuccess, setCopyImageSuccess] = useState(false);
  const [isCapturingImage, setIsCapturingImage] = useState(false);

  // Grab-and-Slide Horizontal Scroll State & Refs (Pointer-based)
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isGrabScrollActive, setIsGrabScrollActive] = useState<boolean>(true);
  const [isDraggingTable, setIsDraggingTable] = useState<boolean>(false);
  const dragStartXRef = React.useRef<number>(0);
  const dragScrollLeftRef = React.useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isGrabScrollActive || !tableContainerRef.current) return;
    const target = e.target as HTMLElement;
    if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(target.tagName)) return;

    setIsDraggingTable(true);
    dragStartXRef.current = e.clientX;
    dragScrollLeftRef.current = tableContainerRef.current.scrollLeft;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTable || !tableContainerRef.current) return;
    e.preventDefault();
    const walk = (e.clientX - dragStartXRef.current) * 1.4;
    tableContainerRef.current.scrollLeft = dragScrollLeftRef.current - walk;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingTable) {
      setIsDraggingTable(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleScrollTableLeft = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const handleScrollTableRight = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

  const actualYear = new Date().getFullYear();
  const latestDbPeriod = useMemo(() => getLatestRecordPeriod(records), [records]);
  const lastAutoPeriodKeyRef = React.useRef<string>('');

  // 1. Year and Month State
  const distinctYears = useMemo(() => {
    const set = new Set<number>();
    set.add(actualYear);
    if (allAvailableYears && allAvailableYears.length > 0) {
      allAvailableYears.forEach((y) => set.add(Number(y)));
    } else {
      records.forEach((r) => {
        if (r.annee) set.add(Number(r.annee));
      });
    }
    return Array.from(set).sort((a: number, b: number) => b - a);
  }, [allAvailableYears, records, actualYear]);

  const [selectedYear, setSelectedYear] = useState<number>(() => latestDbPeriod.year);
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(() => latestDbPeriod.monthStr);

  // Auto-sync filter to latest year & month whenever new records are loaded or imported
  useEffect(() => {
    if (records && records.length > 0) {
      const currentPeriodKey = `${latestDbPeriod.year}-${latestDbPeriod.monthStr}`;
      if (lastAutoPeriodKeyRef.current !== currentPeriodKey) {
        lastAutoPeriodKeyRef.current = currentPeriodKey;
        setSelectedYear(latestDbPeriod.year);
        setSelectedMonthStr(latestDbPeriod.monthStr);
      }
    }
  }, [records, latestDbPeriod]);

  const [compareYear, setCompareYear] = useState<number>(() => {
    if (distinctYears.includes(actualYear - 1)) return actualYear - 1;
    const prev = distinctYears.find((y) => y < actualYear);
    return prev || actualYear - 1;
  });

  useEffect(() => {
    if (distinctYears.includes(selectedYear - 1)) {
      setCompareYear(selectedYear - 1);
    } else if (distinctYears.length > 1) {
      const prev = distinctYears.find((y) => y < selectedYear);
      setCompareYear(prev || selectedYear - 1);
    } else {
      setCompareYear(selectedYear - 1);
    }
  }, [selectedYear, distinctYears]);

  // Available months for selected year
  const availableMonthsForYear = useMemo(() => {
    const list = Array.from(
      new Set<string>(records.filter((r) => Number(r.annee) === selectedYear).map((r) => r.mois))
    );
    return sortMonthsChronologically(list);
  }, [records, selectedYear]);

  useEffect(() => {
    if (availableMonthsForYear.length > 0) {
      // If currently selected month is not valid for this year, default to the latest available month of the year
      if (!selectedMonthStr || !availableMonthsForYear.includes(selectedMonthStr)) {
        setSelectedMonthStr(availableMonthsForYear[availableMonthsForYear.length - 1]);
      }
    } else {
      const mNum = parseInt((selectedMonthStr || '').split('.')[0], 10) || latestDbPeriod.monthNum || 1;
      setSelectedMonthStr(`${String(mNum).padStart(2, '0')}.${selectedYear}`);
    }
  }, [selectedYear, availableMonthsForYear, selectedMonthStr, latestDbPeriod.monthNum]);

  const selectedMonthNum = useMemo(() => {
    if (!selectedMonthStr) return latestDbPeriod.monthNum || 1;
    const parts = (selectedMonthStr || '').split('.');
    return parseInt(parts[0], 10) || latestDbPeriod.monthNum || 1;
  }, [selectedMonthStr, latestDbPeriod.monthNum]);

  const quarter = useMemo(() => Math.ceil(selectedMonthNum / 3), [selectedMonthNum]);
  const quarterMonths = useMemo(() => {
    const start = (quarter - 1) * 3 + 1;
    return [start, start + 1, start + 2];
  }, [quarter]);

  const prevMonthNum = useMemo(() => (selectedMonthNum === 1 ? 12 : selectedMonthNum - 1), [selectedMonthNum]);
  const prevMonthYear = useMemo(() => (selectedMonthNum === 1 ? selectedYear - 1 : selectedYear), [selectedMonthNum, selectedYear]);
  const prevMonthLabel = useMemo(
    () => `mois precedent ${String(prevMonthNum).padStart(2, '0')}/${prevMonthYear}`,
    [prevMonthNum, prevMonthYear]
  );

  // 2. DN15 Code Selection State (Requirement: calculate DN15 by code from dropdown)
  const [selectedDn15Code, setSelectedDn15Code] = useState<string>('ALL');

  // Helper: extract standardized calibre for a record
  const getRecordFamille = (r: ProductionMonthlyRecord): string => {
    if (isExportMeterArticle(`${r.code_article} ${r.designation}`, r.code_article)) {
      return 'DN 15 (Export)';
    }
    if (r.famille_diametre && r.famille_diametre !== 'Autres') {
      const fam = r.famille_diametre.trim();
      const match = fam.match(/^DN\s*(\d+)$/i);
      if (match) {
        return `DN ${match[1]}`;
      }
      return fam;
    }
    return extractDiameter(`${r.code_article} ${r.designation}`, r.code_article);
  };

  // Helper: check if a record matches calibre
  const matchesFamille = (r: ProductionMonthlyRecord, famKey: string): boolean => {
    const recFam = getRecordFamille(r);
    if (famKey === 'DN 15') {
      return recFam === 'DN 15' || recFam === 'DN 15 (Export)';
    }
    return recFam.toUpperCase() === famKey.toUpperCase();
  };

  // Extract distinct DN15 article codes and designations from records
  const dn15Articles = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => {
      const recFam = getRecordFamille(r);
      const isDn15 =
        recFam === 'DN 15' ||
        recFam === 'DN 15 (Export)' ||
        (r.code_article && (r.code_article.startsWith('010211') || r.code_article.startsWith('420')) &&
          (r.designation?.includes('15') || r.designation?.includes('015')));
      if (isDn15 && r.code_article) {
        const code = r.code_article.trim();
        if (!map.has(code)) {
          map.set(code, r.designation ? r.designation.trim() : code);
        }
      }
    });
    return Array.from(map.entries())
      .map(([code, des]) => ({ code, des }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [records]);

  // 3. Budget and PU State
  const [budgetItems, setBudgetItems] = useState<ProductionBudgetItem[]>(() => {
    return Object.entries(DEFAULT_BUDGET_MAP).map(([fam, cfg], idx) => ({
      id: idx + 1,
      annee: actualYear,
      famille_diametre: fam,
      budget_qte: cfg.budget_qte,
      prix_unitaire_kda: cfg.prix_unitaire_kda,
      prevision_cloture_qte: cfg.prevision_cloture_qte,
    }));
  });
  const [loadingBudgets, setLoadingBudgets] = useState<boolean>(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [editBudgetItems, setEditBudgetItems] = useState<ProductionBudgetItem[]>([]);
  const [savingBudgets, setSavingBudgets] = useState<boolean>(false);
  const [budgetSaveStatus, setBudgetSaveStatus] = useState<string | null>(null);

  // 4. Operational Note (NB) State
  const [operationalNote, setOperationalNote] = useState<string>('');
  const [loadingNote, setLoadingNote] = useState<boolean>(false);
  const [savingNote, setSavingNote] = useState<boolean>(false);
  const [noteSaveStatus, setNoteSaveStatus] = useState<string | null>(null);

  const fetchBudgets = async (year: number) => {
    setLoadingBudgets(true);
    try {
      const res = await fetch(`/api/production-mcba/budget?year=${year}`);
      if (res.ok) {
        const data: ProductionBudgetItem[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setBudgetItems(data);
        }
      }
    } catch (err) {
      console.error('Failed to load budgets:', err);
    } finally {
      setLoadingBudgets(false);
    }
  };

  const fetchNote = async (year: number, mois: string) => {
    setLoadingNote(true);
    try {
      const res = await fetch(
        `/api/production-mcba/notes?year=${year}&mois=${encodeURIComponent(mois)}`
      );
      if (res.ok) {
        const data = await res.json();
        setOperationalNote(data.note || '');
      }
    } catch (err) {
      console.error('Failed to load operational note:', err);
    } finally {
      setLoadingNote(false);
    }
  };

  useEffect(() => {
    fetchBudgets(selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    if (selectedMonthStr) {
      fetchNote(selectedYear, selectedMonthStr);
    }
  }, [selectedYear, selectedMonthStr]);

  // Save Budgets
  const handleSaveBudgets = async () => {
    setSavingBudgets(true);
    setBudgetSaveStatus(null);
    try {
      setBudgetItems([...editBudgetItems]);

      const res = await fetch('/api/production-mcba/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear, items: editBudgetItems }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.budgets && Array.isArray(data.budgets)) {
          setBudgetItems(data.budgets);
        }
        setBudgetSaveStatus('Budgets et prix unitaires enregistrés avec succès !');
        setTimeout(() => {
          setBudgetSaveStatus(null);
          setIsBudgetModalOpen(false);
        }, 1200);
      } else {
        setBudgetSaveStatus('Enregistré localement.');
        setTimeout(() => {
          setBudgetSaveStatus(null);
          setIsBudgetModalOpen(false);
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to save budgets:', err);
      setIsBudgetModalOpen(false);
    } finally {
      setSavingBudgets(false);
    }
  };

  // Save Note
  const handleSaveNote = async () => {
    setSavingNote(true);
    setNoteSaveStatus(null);
    try {
      const res = await fetch('/api/production-mcba/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          mois: selectedMonthStr,
          note: operationalNote,
        }),
      });
      if (res.ok) {
        setNoteSaveStatus('Note enregistrée avec succès !');
        setTimeout(() => setNoteSaveStatus(null), 4000);
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const getBudgetConfig = (familleKey: string) => {
    const match = budgetItems.find(
      (b) =>
        b.famille_diametre === familleKey ||
        b.famille_diametre === DEFAULT_BUDGET_MAP[familleKey]?.label
    );
    const def = DEFAULT_BUDGET_MAP[familleKey] || { budget_qte: 0, prix_unitaire_kda: 0, prevision_cloture_qte: 0 };
    return {
      budget_qte:
        match && match.budget_qte !== undefined && match.budget_qte !== null
          ? Number(match.budget_qte)
          : def.budget_qte,
      prix_unitaire_kda:
        match && match.prix_unitaire_kda !== undefined && match.prix_unitaire_kda !== null
          ? Number(match.prix_unitaire_kda)
          : def.prix_unitaire_kda,
      prevision_cloture_qte:
        match && match.prevision_cloture_qte !== undefined && match.prevision_cloture_qte !== null
          ? Number(match.prevision_cloture_qte)
          : def.prevision_cloture_qte,
    };
  };

  const getRYear = (r: ProductionMonthlyRecord) => Number(r.annee) || actualYear;
  const getRMoisNum = (r: ProductionMonthlyRecord) =>
    Number(r.mois_num) || (r.mois ? parseInt(r.mois.split('.')[0], 10) : 0);

  // Matches a record for a specific calibre, taking into account DN15 by-code filter
  const matchesCalibre = (r: ProductionMonthlyRecord, calKey: string): boolean => {
    if (calKey === 'DN 15') {
      if (selectedDn15Code !== 'ALL') {
        return (r.code_article || '').trim() === selectedDn15Code;
      }
      return matchesFamille(r, 'DN 15');
    }
    return matchesFamille(r, calKey);
  };

  // Compute table rows
  const tableRows = useMemo(() => {
    return DISPLAY_CALIBRES.map((cal) => {
      const cfg = getBudgetConfig(cal.key);
      const pu = cfg.prix_unitaire_kda;
      const budgetU = cfg.budget_qte;
      const budgetKDA = budgetU * pu;

      const previsionClotureU = cfg.prevision_cloture_qte !== undefined ? cfg.prevision_cloture_qte : budgetU;
      const previsionClotureKDA = previsionClotureU * pu;

      const txPrevisionVsBudgetU = budgetU > 0 ? previsionClotureU / budgetU : null;
      const txPrevisionVsBudgetKDA = budgetKDA > 0 ? previsionClotureKDA / budgetKDA : null;

      const prevuMoisU = budgetU / 12;
      const prevuMoisKDA = budgetKDA / 12;

      // Real Mois N
      const realMoisRecords = records.filter(
        (r) => getRYear(r) === selectedYear && getRMoisNum(r) === selectedMonthNum && matchesCalibre(r, cal.key)
      );
      const realMoisU = realMoisRecords.reduce((sum, r) => sum + Number(r.qte_entree || 0), 0);
      const realMoisKDA = realMoisU * pu;

      const txRealMoisU = prevuMoisU > 0 ? realMoisU / prevuMoisU : null;
      const txRealMoisKDA = prevuMoisKDA > 0 ? realMoisKDA / prevuMoisKDA : null;

      // Quarterly Indicators (Prev T, Real T, % = Real T / Prev T)
      const prevQuarterU = prevuMoisU * 3;
      const prevQuarterKDA = prevuMoisKDA * 3;

      const realQuarterRecords = records.filter(
        (r) =>
          getRYear(r) === selectedYear &&
          quarterMonths.includes(getRMoisNum(r)) &&
          matchesCalibre(r, cal.key)
      );
      const realQuarterU = realQuarterRecords.reduce((sum, r) => sum + Number(r.qte_entree || 0), 0);
      const realQuarterKDA = realQuarterU * pu;

      const txQuarterRealVsPrevuU = prevQuarterU > 0 ? realQuarterU / prevQuarterU : null;
      const txQuarterRealVsPrevuKDA = prevQuarterKDA > 0 ? realQuarterKDA / prevQuarterKDA : null;

      // Prévu Cumul & Real Cumul
      const prevuCumU = prevuMoisU * selectedMonthNum;
      const prevuCumKDA = prevuMoisKDA * selectedMonthNum;

      const realCumRecords = records.filter(
        (r) => getRYear(r) === selectedYear && getRMoisNum(r) <= selectedMonthNum && matchesCalibre(r, cal.key)
      );
      const realCumU = realCumRecords.reduce((sum, r) => sum + Number(r.qte_entree || 0), 0);
      const realCumKDA = realCumU * pu;

      const txRealCumU = prevuCumU > 0 ? realCumU / prevuCumU : null;
      const txRealCumKDA = prevuCumKDA > 0 ? realCumKDA / prevuCumKDA : null;

      // Quantité restante à la clôture et % réalisation annuelle vs clôture
      const quantiteRestanteU = Math.max(0, previsionClotureU - realCumU);
      const quantiteRestanteKDA = quantiteRestanteU * pu;

      const txRealAnnuelleVsPrevisionU = previsionClotureU > 0 ? realCumU / previsionClotureU : null;
      const txRealAnnuelleVsPrevisionKDA = previsionClotureKDA > 0 ? realCumKDA / previsionClotureKDA : null;

      const txRealAnnuelleU = budgetU > 0 ? realCumU / budgetU : null;
      const txRealAnnuelleKDA = budgetKDA > 0 ? realCumKDA / budgetKDA : null;

      // Real Mois n-1 (previous month of current year)
      const prevMonthNum = selectedMonthNum - 1;
      const realMoisNMinus1Records =
        prevMonthNum > 0
          ? records.filter(
              (r) => getRYear(r) === selectedYear && getRMoisNum(r) === prevMonthNum && matchesCalibre(r, cal.key)
            )
          : [];
      const realMoisNMinus1U = realMoisNMinus1Records.reduce(
        (sum, r) => sum + Number(r.qte_entree || 0),
        0
      );
      const realMoisNMinus1KDA = realMoisNMinus1U * pu;

      // Real Mois comparison year (Mois N-1)
      const realMoisPrevYearRecords = records.filter(
        (r) => getRYear(r) === compareYear && getRMoisNum(r) === selectedMonthNum && matchesCalibre(r, cal.key)
      );
      const realMoisPrevYearU = realMoisPrevYearRecords.reduce(
        (sum, r) => sum + Number(r.qte_entree || 0),
        0
      );
      const realMoisPrevYearKDA = realMoisPrevYearU * pu;

      const txRealMoisYoYU = realMoisPrevYearU > 0 ? realMoisU / realMoisPrevYearU : null;
      const txRealMoisYoYKDA = realMoisPrevYearKDA > 0 ? realMoisKDA / realMoisPrevYearKDA : null;

      // Real Cum comparison year (Cum N-1)
      const realCumPrevYearRecords = records.filter(
        (r) => getRYear(r) === compareYear && getRMoisNum(r) <= selectedMonthNum && matchesCalibre(r, cal.key)
      );
      const realCumPrevYearU = realCumPrevYearRecords.reduce(
        (sum, r) => sum + Number(r.qte_entree || 0),
        0
      );
      const realCumPrevYearKDA = realCumPrevYearU * pu;

      const txRealCumYoYU = realCumPrevYearU > 0 ? realCumU / realCumPrevYearU : null;
      const txRealCumYoYKDA = realCumPrevYearKDA > 0 ? realCumKDA / realCumPrevYearKDA : null;

      // Display Label
      let label = cal.label;
      let sublabel = '';
      if (cal.key === 'DN 15' && selectedDn15Code !== 'ALL') {
        const selectedArt = dn15Articles.find((a) => a.code === selectedDn15Code);
        sublabel = `${selectedDn15Code} - ${selectedArt?.des || ''}`;
      }

      return {
        key: cal.key,
        label,
        sublabel,
        pu,
        // Units (U)
        budgetU,
        previsionClotureU,
        txPrevisionVsBudgetU,
        prevuMoisU,
        realMoisU,
        txRealMoisU,
        prevQuarterU,
        realQuarterU,
        txQuarterRealVsPrevuU,
        prevuCumU,
        realCumU,
        txRealCumU,
        quantiteRestanteU,
        txRealAnnuelleVsPrevisionU,
        txRealAnnuelleU,
        realMoisNMinus1U,
        realMoisPrevYearU,
        txRealMoisYoYU,
        realCumPrevYearU,
        txRealCumYoYU,
        // Values (kDA)
        budgetKDA,
        previsionClotureKDA,
        txPrevisionVsBudgetKDA,
        prevuMoisKDA,
        realMoisKDA,
        txRealMoisKDA,
        prevQuarterKDA,
        realQuarterKDA,
        txQuarterRealVsPrevuKDA,
        prevuCumKDA,
        realCumKDA,
        txRealCumKDA,
        quantiteRestanteKDA,
        txRealAnnuelleVsPrevisionKDA,
        txRealAnnuelleKDA,
        realMoisNMinus1KDA,
        realMoisPrevYearKDA,
        txRealMoisYoYKDA,
        realCumPrevYearKDA,
        txRealCumYoYKDA,
      };
    });
  }, [records, selectedYear, compareYear, selectedMonthNum, quarterMonths, budgetItems, selectedDn15Code, dn15Articles]);

  // Total Row (Consolidated sum based on table rows, including DN15 filter selection)
  const totals = useMemo(() => {
    const budgetU = tableRows.reduce((sum, r) => sum + r.budgetU, 0);
    const budgetKDA = tableRows.reduce((sum, r) => sum + r.budgetKDA, 0);

    const previsionClotureU = tableRows.reduce((sum, r) => sum + r.previsionClotureU, 0);
    const previsionClotureKDA = tableRows.reduce((sum, r) => sum + r.previsionClotureKDA, 0);

    const txPrevisionVsBudgetU = budgetU > 0 ? previsionClotureU / budgetU : null;
    const txPrevisionVsBudgetKDA = budgetKDA > 0 ? previsionClotureKDA / budgetKDA : null;

    const prevuMoisU = tableRows.reduce((sum, r) => sum + r.prevuMoisU, 0);
    const prevuMoisKDA = tableRows.reduce((sum, r) => sum + r.prevuMoisKDA, 0);

    const realMoisU = tableRows.reduce((sum, r) => sum + r.realMoisU, 0);
    const realMoisKDA = tableRows.reduce((sum, r) => sum + r.realMoisKDA, 0);

    const txRealMoisU = prevuMoisU > 0 ? realMoisU / prevuMoisU : null;
    const txRealMoisKDA = prevuMoisKDA > 0 ? realMoisKDA / prevuMoisKDA : null;

    const prevQuarterU = tableRows.reduce((sum, r) => sum + r.prevQuarterU, 0);
    const prevQuarterKDA = tableRows.reduce((sum, r) => sum + r.prevQuarterKDA, 0);

    const realQuarterU = tableRows.reduce((sum, r) => sum + r.realQuarterU, 0);
    const realQuarterKDA = tableRows.reduce((sum, r) => sum + r.realQuarterKDA, 0);

    const txQuarterRealVsPrevuU = prevQuarterU > 0 ? realQuarterU / prevQuarterU : null;
    const txQuarterRealVsPrevuKDA = prevQuarterKDA > 0 ? realQuarterKDA / prevQuarterKDA : null;

    const prevuCumU = tableRows.reduce((sum, r) => sum + r.prevuCumU, 0);
    const prevuCumKDA = tableRows.reduce((sum, r) => sum + r.prevuCumKDA, 0);

    const realCumU = tableRows.reduce((sum, r) => sum + r.realCumU, 0);
    const realCumKDA = tableRows.reduce((sum, r) => sum + r.realCumKDA, 0);

    const txRealCumU = prevuCumU > 0 ? realCumU / prevuCumU : null;
    const txRealCumKDA = prevuCumKDA > 0 ? realCumKDA / prevuCumKDA : null;

    const quantiteRestanteU = tableRows.reduce((sum, r) => sum + r.quantiteRestanteU, 0);
    const quantiteRestanteKDA = tableRows.reduce((sum, r) => sum + r.quantiteRestanteKDA, 0);

    const txRealAnnuelleVsPrevisionU = previsionClotureU > 0 ? realCumU / previsionClotureU : null;
    const txRealAnnuelleVsPrevisionKDA = previsionClotureKDA > 0 ? realCumKDA / previsionClotureKDA : null;

    const txRealAnnuelleU = budgetU > 0 ? realCumU / budgetU : null;
    const txRealAnnuelleKDA = budgetKDA > 0 ? realCumKDA / budgetKDA : null;

    const realMoisNMinus1U = tableRows.reduce((sum, r) => sum + r.realMoisNMinus1U, 0);
    const realMoisNMinus1KDA = tableRows.reduce((sum, r) => sum + r.realMoisNMinus1KDA, 0);

    const realMoisPrevYearU = tableRows.reduce((sum, r) => sum + r.realMoisPrevYearU, 0);
    const realMoisPrevYearKDA = tableRows.reduce((sum, r) => sum + r.realMoisPrevYearKDA, 0);

    const txRealMoisYoYU = realMoisPrevYearU > 0 ? realMoisU / realMoisPrevYearU : null;
    const txRealMoisYoYKDA = realMoisPrevYearKDA > 0 ? realMoisKDA / realMoisPrevYearKDA : null;

    const realCumPrevYearU = tableRows.reduce((sum, r) => sum + r.realCumPrevYearU, 0);
    const realCumPrevYearKDA = tableRows.reduce((sum, r) => sum + r.realCumPrevYearKDA, 0);

    const txRealCumYoYU = realCumPrevYearU > 0 ? realCumU / realCumPrevYearU : null;
    const txRealCumYoYKDA = realCumPrevYearKDA > 0 ? realCumKDA / realCumPrevYearKDA : null;

    return {
      budgetU,
      budgetKDA,
      previsionClotureU,
      previsionClotureKDA,
      txPrevisionVsBudgetU,
      txPrevisionVsBudgetKDA,
      prevuMoisU,
      prevuMoisKDA,
      realMoisU,
      realMoisKDA,
      txRealMoisU,
      txRealMoisKDA,
      prevQuarterU,
      prevQuarterKDA,
      realQuarterU,
      realQuarterKDA,
      txQuarterRealVsPrevuU,
      txQuarterRealVsPrevuKDA,
      prevuCumU,
      prevuCumKDA,
      realCumU,
      realCumKDA,
      txRealCumU,
      txRealCumKDA,
      quantiteRestanteU,
      quantiteRestanteKDA,
      txRealAnnuelleVsPrevisionU,
      txRealAnnuelleVsPrevisionKDA,
      txRealAnnuelleU,
      txRealAnnuelleKDA,
      realMoisNMinus1U,
      realMoisNMinus1KDA,
      realMoisPrevYearU,
      realMoisPrevYearKDA,
      txRealMoisYoYU,
      txRealMoisYoYKDA,
      realCumPrevYearU,
      realCumPrevYearKDA,
      txRealCumYoYU,
      txRealCumYoYKDA,
    };
  }, [tableRows]);

  // Open Budget Edit Modal
  const handleOpenBudgetModal = () => {
    const list: ProductionBudgetItem[] = DISPLAY_CALIBRES.map((cal) => {
      const cfg = getBudgetConfig(cal.key);
      return {
        annee: selectedYear,
        famille_diametre: cal.key,
        budget_qte: cfg.budget_qte,
        prix_unitaire_kda: cfg.prix_unitaire_kda,
        prevision_cloture_qte: cfg.prevision_cloture_qte,
      };
    });
    setEditBudgetItems(list);
    setBudgetSaveStatus(null);
    setIsBudgetModalOpen(true);
  };

  // Copy Table as Image
  const handleCopyAsImage = async () => {
    setIsCapturingImage(true);
    const ok = await copyElementAsImage('production-dashboard-table-container');
    setIsCapturingImage(false);
    if (ok) {
      setCopyImageSuccess(true);
      setTimeout(() => setCopyImageSuccess(false), 3500);
    }
  };

  // Copy Table Data for Word / Excel with live formulas matching the exact screenshot layout (22 columns)
  const handleCopyForWord = async () => {
    const headerCells1: any[] = [
      { text: 'PRODUITS', rowSpan: 2, bg: '#0f172a', color: '#ffffff', bold: true, align: 'left' },
      { text: 'UM', rowSpan: 2, bg: '#0f172a', color: '#ffffff', bold: true, align: 'center' },
      { text: 'PU (kDA)', rowSpan: 2, bg: '#0f172a', color: '#ffffff', bold: true, align: 'right' },
      { text: `Budget & Clôture ${selectedYear}`, colSpan: 3, bg: '#0f766e', color: '#ffffff', bold: true, align: 'center' },
      { text: 'Mois', colSpan: 3, bg: '#d97706', color: '#ffffff', bold: true, align: 'center' },
      { text: 'Trimestre', colSpan: 3, bg: '#2563eb', color: '#ffffff', bold: true, align: 'center' },
      { text: `Année ${selectedYear}`, colSpan: 5, bg: '#059669', color: '#ffffff', bold: true, align: 'center' },
      { text: 'mois précédent', colSpan: 1, bg: '#475569', color: '#ffffff', bold: true, align: 'center' },
      { text: `Comparaison ${compareYear} / ${selectedYear}`, colSpan: 4, bg: '#4f46e5', color: '#ffffff', bold: true, align: 'center' },
    ];

    const headerCells2: any[] = [
      { text: `Budget ${selectedYear}`, bg: '#115e59', color: '#ffffff', bold: true, align: 'right' },
      { text: `Prévision de clôture ${selectedYear}`, bg: '#115e59', color: '#ffffff', bold: true, align: 'right' },
      { text: '%', bg: '#115e59', color: '#ffffff', bold: true, align: 'center' },
      { text: `Prévu Mois ${selectedYear} ❶`, bg: '#b45309', color: '#ffffff', bold: true, align: 'right' },
      { text: `Real Mois ${selectedYear} ❷`, bg: '#b45309', color: '#ffffff', bold: true, align: 'right' },
      { text: '% réalisation mois ❷/❶', bg: '#b45309', color: '#ffffff', bold: true, align: 'center' },
      { text: `Prev T${quarter}`, bg: '#1d4ed8', color: '#ffffff', bold: true, align: 'right' },
      { text: `Real T${quarter}`, bg: '#1d4ed8', color: '#ffffff', bold: true, align: 'right' },
      { text: '%', bg: '#1d4ed8', color: '#ffffff', bold: true, align: 'center' },
      { text: `Prévu Cum ${selectedYear} ❹`, bg: '#047857', color: '#ffffff', bold: true, align: 'right' },
      { text: `Real Cum ${selectedYear} ❺`, bg: '#047857', color: '#ffffff', bold: true, align: 'right' },
      { text: '% réalisation cumul / prévu cumul ❺/❹', bg: '#047857', color: '#ffffff', bold: true, align: 'center' },
      { text: `Quantité restante à la clôture ${selectedYear}`, bg: '#047857', color: '#ffffff', bold: true, align: 'right' },
      { text: '% réalisation annuelle ❺ / Prévision de clôture', bg: '#047857', color: '#ffffff', bold: true, align: 'center' },
      { text: 'Real mois n-1', bg: '#334155', color: '#ffffff', bold: true, align: 'right' },
      { text: `Real Mois ${compareYear} ❸`, bg: '#4338ca', color: '#ffffff', bold: true, align: 'right' },
      { text: `% réalisation du mois ${String(selectedYear).slice(-2)}/${String(compareYear).slice(-2)} ❷/❸`, bg: '#4338ca', color: '#ffffff', bold: true, align: 'center' },
      { text: `Real Cum ${compareYear} ❻`, bg: '#4338ca', color: '#ffffff', bold: true, align: 'right' },
      { text: `% réalisation cumul ${String(selectedYear).slice(-2)}/${String(compareYear).slice(-2)} ❺/❻`, bg: '#4338ca', color: '#ffffff', bold: true, align: 'center' },
    ];

    const bodyRows: any[] = [];
    tableRows.forEach((r) => {
      // Row 1: Quantities (U)
      bodyRows.push({
        cells: [
          { text: r.sublabel ? `${r.label} (${r.sublabel})` : r.label, rowSpan: 2, bold: true, align: 'left', bg: '#ffffff', color: '#000000' },
          { text: 'U', align: 'center', bg: '#f1f5f9', color: '#000000' },
          { text: formatPricePU(r.pu), rowSpan: 2, align: 'right', bg: '#f8fafc', color: '#000000' },
          { text: formatNumber(r.budgetU), align: 'right', rawNum: Math.round(r.budgetU), bg: '#ecfeff', color: '#000000' },
          { text: formatNumber(r.previsionClotureU), align: 'right', rawNum: Math.round(r.previsionClotureU), bg: '#cffafe', color: '#000000' },
          { text: formatPercent(r.txPrevisionVsBudgetU), align: 'center', rawNum: Math.round((r.txPrevisionVsBudgetU || 0) * 100), bg: '#ecfeff', color: '#000000' },
          { text: formatNumber(r.prevuMoisU), align: 'right', rawNum: Math.round(r.prevuMoisU), bg: '#fffbeb', color: '#000000' },
          { text: formatNumber(r.realMoisU), align: 'right', bold: true, rawNum: Math.round(r.realMoisU), bg: '#fef3c7', color: '#000000' },
          { text: formatPercent(r.txRealMoisU), align: 'center', bold: true, rawNum: Math.round((r.txRealMoisU || 0) * 100), bg: '#fffbeb', color: '#000000' },
          { text: formatNumVal(r.prevQuarterU), align: 'right', rawNum: Math.round(r.prevQuarterU), bg: '#eff6ff', color: '#000000' },
          { text: formatNumber(r.realQuarterU), align: 'right', bold: true, rawNum: Math.round(r.realQuarterU), bg: '#dbeafe', color: '#000000' },
          { text: formatPercent(r.txQuarterRealVsPrevuU), align: 'center', bold: true, rawNum: Math.round((r.txQuarterRealVsPrevuU || 0) * 100), bg: '#eff6ff', color: '#000000' },
          { text: formatNumber(r.prevuCumU), align: 'right', rawNum: Math.round(r.prevuCumU), bg: '#f0fdf4', color: '#000000' },
          { text: formatNumber(r.realCumU), align: 'right', bold: true, rawNum: Math.round(r.realCumU), bg: '#dcfce7', color: '#000000' },
          { text: formatPercent(r.txRealCumU), align: 'center', bold: true, rawNum: Math.round((r.txRealCumU || 0) * 100), bg: '#f0fdf4', color: '#000000' },
          { text: formatNumber(r.quantiteRestanteU), align: 'right', rawNum: Math.round(r.quantiteRestanteU), bg: '#f0fdf4', color: '#000000' },
          { text: formatPercent(r.txRealAnnuelleVsPrevisionU), align: 'center', bold: true, rawNum: Math.round((r.txRealAnnuelleVsPrevisionU || 0) * 100), bg: '#dcfce7', color: '#000000' },
          { text: formatNumber(r.realMoisNMinus1U), align: 'right', rawNum: Math.round(r.realMoisNMinus1U), bg: '#f1f5f9', color: '#000000' },
          { text: formatNumber(r.realMoisPrevYearU), align: 'right', rawNum: Math.round(r.realMoisPrevYearU), bg: '#eef2ff', color: '#000000' },
          { text: formatPercent(r.txRealMoisYoYU), align: 'center', rawNum: Math.round((r.txRealMoisYoYU || 0) * 100), bg: '#eef2ff', color: '#000000' },
          { text: formatNumber(r.realCumPrevYearU), align: 'right', rawNum: Math.round(r.realCumPrevYearU), bg: '#eef2ff', color: '#000000' },
          { text: formatPercent(r.txRealCumYoYU), align: 'center', rawNum: Math.round((r.txRealCumYoYU || 0) * 100), bg: '#eef2ff', color: '#000000' },
        ],
      });

      // Row 2: Values (kDA)
      bodyRows.push({
        cells: [
          { text: 'kDA', align: 'center', bg: '#e2e8f0', color: '#000000' },
          { text: formatNumVal(r.budgetKDA), align: 'right', rawNum: Math.round(r.budgetKDA), bg: '#f0fdfa', color: '#000000' },
          { text: formatNumVal(r.previsionClotureKDA), align: 'right', rawNum: Math.round(r.previsionClotureKDA), bg: '#e6fffa', color: '#000000' },
          { text: formatPercent(r.txPrevisionVsBudgetKDA), align: 'center', rawNum: Math.round((r.txPrevisionVsBudgetKDA || 0) * 100), bg: '#f0fdfa', color: '#000000' },
          { text: formatNumVal(r.prevuMoisKDA), align: 'right', rawNum: Math.round(r.prevuMoisKDA), bg: '#fffdf5', color: '#000000' },
          { text: formatNumVal(r.realMoisKDA), align: 'right', bold: true, rawNum: Math.round(r.realMoisKDA), bg: '#fef9c3', color: '#000000' },
          { text: formatPercent(r.txRealMoisKDA), align: 'center', bold: true, rawNum: Math.round((r.txRealMoisKDA || 0) * 100), bg: '#fffdf5', color: '#000000' },
          { text: formatNumVal(r.prevQuarterKDA), align: 'right', rawNum: Math.round(r.prevQuarterKDA), bg: '#f8faff', color: '#000000' },
          { text: formatNumVal(r.realQuarterKDA), align: 'right', bold: true, rawNum: Math.round(r.realQuarterKDA), bg: '#e0f2fe', color: '#000000' },
          { text: formatPercent(r.txQuarterRealVsPrevuKDA), align: 'center', bold: true, rawNum: Math.round((r.txQuarterRealVsPrevuKDA || 0) * 100), bg: '#f8faff', color: '#000000' },
          { text: formatNumVal(r.prevuCumKDA), align: 'right', rawNum: Math.round(r.prevuCumKDA), bg: '#f6fef9', color: '#000000' },
          { text: formatNumVal(r.realCumKDA), align: 'right', bold: true, rawNum: Math.round(r.realCumKDA), bg: '#ecfdf5', color: '#000000' },
          { text: formatPercent(r.txRealCumKDA), align: 'center', bold: true, rawNum: Math.round((r.txRealCumKDA || 0) * 100), bg: '#f6fef9', color: '#000000' },
          { text: formatNumVal(r.quantiteRestanteKDA), align: 'right', rawNum: Math.round(r.quantiteRestanteKDA), bg: '#f6fef9', color: '#000000' },
          { text: formatPercent(r.txRealAnnuelleVsPrevisionKDA), align: 'center', bold: true, rawNum: Math.round((r.txRealAnnuelleVsPrevisionKDA || 0) * 100), bg: '#ecfdf5', color: '#000000' },
          { text: formatNumVal(r.realMoisNMinus1KDA), align: 'right', rawNum: Math.round(r.realMoisNMinus1KDA), bg: '#f8fafc', color: '#000000' },
          { text: formatNumVal(r.realMoisPrevYearKDA), align: 'right', rawNum: Math.round(r.realMoisPrevYearKDA), bg: '#f5f3ff', color: '#000000' },
          { text: formatPercent(r.txRealMoisYoYKDA), align: 'center', rawNum: Math.round((r.txRealMoisYoYKDA || 0) * 100), bg: '#f5f3ff', color: '#000000' },
          { text: formatNumVal(r.realCumPrevYearKDA), align: 'right', rawNum: Math.round(r.realCumPrevYearKDA), bg: '#f5f3ff', color: '#000000' },
          { text: formatPercent(r.txRealCumYoYKDA), align: 'center', rawNum: Math.round((r.txRealCumYoYKDA || 0) * 100), bg: '#f5f3ff', color: '#000000' },
        ],
      });
    });

    const footerRows: any[] = [
      {
        cells: [
          { text: 'TOTAL', rowSpan: 2, bold: true, align: 'center', bg: '#facc15', color: '#000000' },
          { text: 'U', align: 'center', bold: true, bg: '#fde047', color: '#000000' },
          { text: '-', rowSpan: 2, align: 'center', bold: true, bg: '#fde68a', color: '#000000' },
          { text: formatNumber(totals.budgetU), align: 'right', bold: true, rawNum: Math.round(totals.budgetU), bg: '#fef08a', color: '#000000' },
          { text: formatNumber(totals.previsionClotureU), align: 'right', bold: true, rawNum: Math.round(totals.previsionClotureU), bg: '#fef08a', color: '#000000' },
          { text: formatPercent(totals.txPrevisionVsBudgetU), align: 'center', bold: true, rawNum: Math.round((totals.txPrevisionVsBudgetU || 0) * 100), bg: '#fef08a', color: '#000000' },
          { text: formatNumber(totals.prevuMoisU), align: 'right', bold: true, rawNum: Math.round(totals.prevuMoisU), bg: '#fef08a', color: '#000000' },
          { text: formatNumber(totals.realMoisU), align: 'right', bold: true, rawNum: Math.round(totals.realMoisU), bg: '#fef08a', color: '#000000' },
          { text: formatPercent(totals.txRealMoisU), align: 'center', bold: true, rawNum: Math.round((totals.txRealMoisU || 0) * 100), bg: '#fef08a', color: '#000000' },
          { text: formatNumVal(totals.prevQuarterU), align: 'right', bold: true, rawNum: Math.round(totals.prevQuarterU), bg: '#fef08a', color: '#000000' },
          { text: formatNumber(totals.realQuarterU), align: 'right', bold: true, rawNum: Math.round(totals.realQuarterU), bg: '#fef08a', color: '#000000' },
          { text: formatPercent(totals.txQuarterRealVsPrevuU), align: 'center', bold: true, rawNum: Math.round((totals.txQuarterRealVsPrevuU || 0) * 100), bg: '#fef08a', color: '#000000' },
          { text: formatNumber(totals.prevuCumU), align: 'right', bold: true, rawNum: Math.round(totals.prevuCumU), bg: '#fef08a', color: '#000000' },
          { text: formatNumber(totals.realCumU), align: 'right', bold: true, rawNum: Math.round(totals.realCumU), bg: '#fef08a', color: '#000000' },
          { text: formatPercent(totals.txRealCumU), align: 'center', bold: true, rawNum: Math.round((totals.txRealCumU || 0) * 100), bg: '#fef08a', color: '#000000' },
          { text: formatNumber(totals.quantiteRestanteU), align: 'right', bold: true, rawNum: Math.round(totals.quantiteRestanteU), bg: '#fef08a', color: '#000000' },
          { text: formatPercent(totals.txRealAnnuelleVsPrevisionU), align: 'center', bold: true, rawNum: Math.round((totals.txRealAnnuelleVsPrevisionU || 0) * 100), bg: '#fef08a', color: '#000000' },
          { text: formatNumber(totals.realMoisNMinus1U), align: 'right', bold: true, rawNum: Math.round(totals.realMoisNMinus1U), bg: '#fef08a', color: '#000000' },
          { text: formatNumber(totals.realMoisPrevYearU), align: 'right', bold: true, rawNum: Math.round(totals.realMoisPrevYearU), bg: '#fef08a', color: '#000000' },
          { text: formatPercent(totals.txRealMoisYoYU), align: 'center', bold: true, rawNum: Math.round((totals.txRealMoisYoYU || 0) * 100), bg: '#fef08a', color: '#000000' },
          { text: formatNumber(totals.realCumPrevYearU), align: 'right', bold: true, rawNum: Math.round(totals.realCumPrevYearU), bg: '#fef08a', color: '#000000' },
          { text: formatPercent(totals.txRealCumYoYU), align: 'center', bold: true, rawNum: Math.round((totals.txRealCumYoYU || 0) * 100), bg: '#fef08a', color: '#000000' },
        ],
      },
      {
        cells: [
          { text: 'kDA', align: 'center', bold: true, bg: '#fde047', color: '#000000' },
          { text: formatNumVal(totals.budgetKDA), align: 'right', bold: true, rawNum: Math.round(totals.budgetKDA), bg: '#fef9c3', color: '#000000' },
          { text: formatNumVal(totals.previsionClotureKDA), align: 'right', bold: true, rawNum: Math.round(totals.previsionClotureKDA), bg: '#fef9c3', color: '#000000' },
          { text: formatPercent(totals.txPrevisionVsBudgetKDA), align: 'center', bold: true, rawNum: Math.round((totals.txPrevisionVsBudgetKDA || 0) * 100), bg: '#fef9c3', color: '#000000' },
          { text: formatNumVal(totals.prevuMoisKDA), align: 'right', bold: true, rawNum: Math.round(totals.prevuMoisKDA), bg: '#fef9c3', color: '#000000' },
          { text: formatNumVal(totals.realMoisKDA), align: 'right', bold: true, rawNum: Math.round(totals.realMoisKDA), bg: '#fef9c3', color: '#000000' },
          { text: formatPercent(totals.txRealMoisKDA), align: 'center', bold: true, rawNum: Math.round((totals.txRealMoisKDA || 0) * 100), bg: '#fef9c3', color: '#000000' },
          { text: formatNumVal(totals.prevQuarterKDA), align: 'right', bold: true, rawNum: Math.round(totals.prevQuarterKDA), bg: '#fef9c3', color: '#000000' },
          { text: formatNumVal(totals.realQuarterKDA), align: 'right', bold: true, rawNum: Math.round(totals.realQuarterKDA), bg: '#fef9c3', color: '#000000' },
          { text: formatPercent(totals.txQuarterRealVsPrevuKDA), align: 'center', bold: true, rawNum: Math.round((totals.txQuarterRealVsPrevuKDA || 0) * 100), bg: '#fef9c3', color: '#000000' },
          { text: formatNumVal(totals.prevuCumKDA), align: 'right', bold: true, rawNum: Math.round(totals.prevuCumKDA), bg: '#fef9c3', color: '#000000' },
          { text: formatNumVal(totals.realCumKDA), align: 'right', bold: true, rawNum: Math.round(totals.realCumKDA), bg: '#fef9c3', color: '#000000' },
          { text: formatPercent(totals.txRealCumKDA), align: 'center', bold: true, rawNum: Math.round((totals.txRealCumKDA || 0) * 100), bg: '#fef9c3', color: '#000000' },
          { text: formatNumVal(totals.quantiteRestanteKDA), align: 'right', bold: true, rawNum: Math.round(totals.quantiteRestanteKDA), bg: '#fef9c3', color: '#000000' },
          { text: formatPercent(totals.txRealAnnuelleVsPrevisionKDA), align: 'center', bold: true, rawNum: Math.round((totals.txRealAnnuelleVsPrevisionKDA || 0) * 100), bg: '#fef9c3', color: '#000000' },
          { text: formatNumVal(totals.realMoisNMinus1KDA), align: 'right', bold: true, rawNum: Math.round(totals.realMoisNMinus1KDA), bg: '#fef9c3', color: '#000000' },
          { text: formatNumVal(totals.realMoisPrevYearKDA), align: 'right', bold: true, rawNum: Math.round(totals.realMoisPrevYearKDA), bg: '#fef9c3', color: '#000000' },
          { text: formatPercent(totals.txRealMoisYoYKDA), align: 'center', bold: true, rawNum: Math.round((totals.txRealMoisYoYKDA || 0) * 100), bg: '#fef9c3', color: '#000000' },
          { text: formatNumVal(totals.realCumPrevYearKDA), align: 'right', bold: true, rawNum: Math.round(totals.realCumPrevYearKDA), bg: '#fef9c3', color: '#000000' },
          { text: formatPercent(totals.txRealCumYoYKDA), align: 'center', bold: true, rawNum: Math.round((totals.txRealCumYoYKDA || 0) * 100), bg: '#fef9c3', color: '#000000' },
        ],
      },
    ];

    const ok = await copyTableDataToWord({
      title: `Tableau de Suivi de Production - Exercice ${selectedYear} (${getMonthName(selectedMonthNum)})`,
      subtitle: `Comparatif mensuel, trimestriel (T${quarter}), annuel et historique vs ${compareYear}`,
      orientation: 'landscape',
      headerRows: [{ cells: headerCells1 }, { cells: headerCells2 }],
      bodyRows,
      footerRows,
    });

    if (ok) {
      setCopyWordSuccess(true);
      setTimeout(() => setCopyWordSuccess(false), 3500);
    }
  };

  // Export Table Data to Excel
  const handleExportExcel = () => {
    try {
      const exportData: any[] = [];
      tableRows.forEach((r) => {
        exportData.push({
          PRODUITS: r.sublabel ? `${r.label} (${r.sublabel})` : r.label,
          UM: 'U',
          'PU (kDA)': Number(r.pu.toFixed(2)),
          [`Budget ${selectedYear}`]: Math.round(r.budgetU),
          [`Prévision de clôture ${selectedYear}`]: Math.round(r.previsionClotureU),
          '% (Prévision / Budget)': formatPercent(r.txPrevisionVsBudgetU),
          [`Prévu Mois ${selectedYear} ❶`]: Math.round(r.prevuMoisU),
          [`Real Mois ${selectedYear} ❷`]: Math.round(r.realMoisU),
          '% réalisation mois ❷/❶': formatPercent(r.txRealMoisU),
          [`Prev T${quarter}`]: Math.round(r.prevQuarterU),
          [`Real T${quarter}`]: Math.round(r.realQuarterU),
          '% Trimestre': formatPercent(r.txQuarterRealVsPrevuU),
          [`Prévu Cum ${selectedYear} ❹`]: Math.round(r.prevuCumU),
          [`Real Cum ${selectedYear} ❺`]: Math.round(r.realCumU),
          '% réalisation cumul / prévu cumul ❺/❹': formatPercent(r.txRealCumU),
          [`Quantité restante à la clôture ${selectedYear}`]: Math.round(r.quantiteRestanteU),
          '% réalisation annuelle ❺ / Prévision de clôture': formatPercent(r.txRealAnnuelleVsPrevisionU),
          'Real mois n-1': Math.round(r.realMoisNMinus1U),
          [`Real Mois ${compareYear} ❸`]: Math.round(r.realMoisPrevYearU),
          [`% réalisation du mois ${String(selectedYear).slice(-2)}/${String(compareYear).slice(-2)} ❷/❸`]: formatPercent(r.txRealMoisYoYU),
          [`Real Cum ${compareYear} ❻`]: Math.round(r.realCumPrevYearU),
          [`% réalisation cumul ${String(selectedYear).slice(-2)}/${String(compareYear).slice(-2)} ❺/❻`]: formatPercent(r.txRealCumYoYU),
        });

        exportData.push({
          PRODUITS: r.sublabel ? `${r.label} (${r.sublabel})` : r.label,
          UM: 'kDA',
          'PU (kDA)': '',
          [`Budget ${selectedYear}`]: Math.round(r.budgetKDA),
          [`Prévision de clôture ${selectedYear}`]: Math.round(r.previsionClotureKDA),
          '% (Prévision / Budget)': formatPercent(r.txPrevisionVsBudgetKDA),
          [`Prévu Mois ${selectedYear} ❶`]: Math.round(r.prevuMoisKDA),
          [`Real Mois ${selectedYear} ❷`]: Math.round(r.realMoisKDA),
          '% réalisation mois ❷/❶': formatPercent(r.txRealMoisKDA),
          [`Prev T${quarter}`]: Math.round(r.prevQuarterKDA),
          [`Real T${quarter}`]: Math.round(r.realQuarterKDA),
          '% Trimestre': formatPercent(r.txQuarterRealVsPrevuKDA),
          [`Prévu Cum ${selectedYear} ❹`]: Math.round(r.prevuCumKDA),
          [`Real Cum ${selectedYear} ❺`]: Math.round(r.realCumKDA),
          '% réalisation cumul / prévu cumul ❺/❹': formatPercent(r.txRealCumKDA),
          [`Quantité restante à la clôture ${selectedYear}`]: Math.round(r.quantiteRestanteKDA),
          '% réalisation annuelle ❺ / Prévision de clôture': formatPercent(r.txRealAnnuelleVsPrevisionKDA),
          'Real mois n-1': Math.round(r.realMoisNMinus1KDA),
          [`Real Mois ${compareYear} ❸`]: Math.round(r.realMoisPrevYearKDA),
          [`% réalisation du mois ${String(selectedYear).slice(-2)}/${String(compareYear).slice(-2)} ❷/❸`]: formatPercent(r.txRealMoisYoYKDA),
          [`Real Cum ${compareYear} ❻`]: Math.round(r.realCumPrevYearKDA),
          [`% réalisation cumul ${String(selectedYear).slice(-2)}/${String(compareYear).slice(-2)} ❺/❻`]: formatPercent(r.txRealCumYoYKDA),
        });
      });

      // Totals
      exportData.push({
        PRODUITS: 'Total',
        UM: 'U',
        'PU (kDA)': '',
        [`Budget ${selectedYear}`]: Math.round(totals.budgetU),
        [`Prévision de clôture ${selectedYear}`]: Math.round(totals.previsionClotureU),
        '% (Prévision / Budget)': formatPercent(totals.txPrevisionVsBudgetU),
        [`Prévu Mois ${selectedYear} ❶`]: Math.round(totals.prevuMoisU),
        [`Real Mois ${selectedYear} ❷`]: Math.round(totals.realMoisU),
        '% réalisation mois ❷/❶': formatPercent(totals.txRealMoisU),
        [`Prev T${quarter}`]: Math.round(totals.prevQuarterU),
        [`Real T${quarter}`]: Math.round(totals.realQuarterU),
        '% Trimestre': formatPercent(totals.txQuarterRealVsPrevuU),
        [`Prévu Cum ${selectedYear} ❹`]: Math.round(totals.prevuCumU),
        [`Real Cum ${selectedYear} ❺`]: Math.round(totals.realCumU),
        '% réalisation cumul / prévu cumul ❺/❹': formatPercent(totals.txRealCumU),
        [`Quantité restante à la clôture ${selectedYear}`]: Math.round(totals.quantiteRestanteU),
        '% réalisation annuelle ❺ / Prévision de clôture': formatPercent(totals.txRealAnnuelleVsPrevisionU),
        'Real mois n-1': Math.round(totals.realMoisNMinus1U),
        [`Real Mois ${compareYear} ❸`]: Math.round(totals.realMoisPrevYearU),
        [`% réalisation du mois ${String(selectedYear).slice(-2)}/${String(compareYear).slice(-2)} ❷/❸`]: formatPercent(totals.txRealMoisYoYU),
        [`Real Cum ${compareYear} ❻`]: Math.round(totals.realCumPrevYearU),
        [`% réalisation cumul ${String(selectedYear).slice(-2)}/${String(compareYear).slice(-2)} ❺/❻`]: formatPercent(totals.txRealCumYoYU),
      });

      exportData.push({
        PRODUITS: 'Total',
        UM: 'kDA',
        'PU (kDA)': '',
        [`Budget ${selectedYear}`]: Math.round(totals.budgetKDA),
        [`Prévision de clôture ${selectedYear}`]: Math.round(totals.previsionClotureKDA),
        '% (Prévision / Budget)': formatPercent(totals.txPrevisionVsBudgetKDA),
        [`Prévu Mois ${selectedYear} ❶`]: Math.round(totals.prevuMoisKDA),
        [`Real Mois ${selectedYear} ❷`]: Math.round(totals.realMoisKDA),
        '% réalisation mois ❷/❶': formatPercent(totals.txRealMoisKDA),
        [`Prev T${quarter}`]: Math.round(totals.prevQuarterKDA),
        [`Real T${quarter}`]: Math.round(totals.realQuarterKDA),
        '% Trimestre': formatPercent(totals.txQuarterRealVsPrevuKDA),
        [`Prévu Cum ${selectedYear} ❹`]: Math.round(totals.prevuCumKDA),
        [`Real Cum ${selectedYear} ❺`]: Math.round(totals.realCumKDA),
        '% réalisation cumul / prévu cumul ❺/❹': formatPercent(totals.txRealCumKDA),
        [`Quantité restante à la clôture ${selectedYear}`]: Math.round(totals.quantiteRestanteKDA),
        '% réalisation annuelle ❺ / Prévision de clôture': formatPercent(totals.txRealAnnuelleVsPrevisionKDA),
        'Real mois n-1': Math.round(totals.realMoisNMinus1KDA),
        [`Real Mois ${compareYear} ❸`]: Math.round(totals.realMoisPrevYearKDA),
        [`% réalisation du mois ${String(selectedYear).slice(-2)}/${String(compareYear).slice(-2)} ❷/❸`]: formatPercent(totals.txRealMoisYoYKDA),
        [`Real Cum ${compareYear} ❻`]: Math.round(totals.realCumPrevYearKDA),
        [`% réalisation cumul ${String(selectedYear).slice(-2)}/${String(compareYear).slice(-2)} ❺/❻`]: formatPercent(totals.txRealCumYoYKDA),
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Suivi_Production');
      XLSX.writeFile(
        wb,
        `Tableau_Production_${getMonthName(selectedMonthNum)}_${selectedYear}.xlsx`
      );
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP CONTROL BAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-linear-to-br from-emerald-700 to-teal-800 text-white rounded-xl shadow-md flex items-center justify-center shrink-0">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
              <span>Tableau de Suivi & Comparatif de Production</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                <Clock size={11} className="text-amber-700" />
                Mois : {getMonthName(selectedMonthNum)} {selectedYear}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-900 border border-emerald-300">
                <Clock size={11} className="text-emerald-600" />
                MàJ : {getLatestProductionUpdateTime(records, selectedYear)}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculé à partir des données réelles du fichier MCBA en base de données.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* DN15 by Code Filter Dropdown (Requirement) */}
          <div className="flex items-center gap-1.5 bg-amber-50 border-2 border-amber-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Filter size={14} className="text-amber-700 shrink-0" />
            <span className="text-[11px] font-black text-amber-900 whitespace-nowrap">Calcul DN15 :</span>
            <select
              value={selectedDn15Code}
              onChange={(e) => setSelectedDn15Code(e.target.value)}
              className="bg-transparent font-black text-amber-950 text-xs focus:outline-none cursor-pointer max-w-[210px] truncate"
              title="Sélectionnez un code article DN15 spécifique ou tous les DN15"
            >
              <option value="ALL">Tous les codes DN15 (Global)</option>
              {dn15Articles.map((art) => (
                <option key={art.code} value={art.code}>
                  {art.code} - {art.des}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-black text-indigo-700">Mois :</span>
            <select
              value={selectedMonthStr}
              onChange={(e) => setSelectedMonthStr(e.target.value)}
              className="bg-transparent font-black text-indigo-950 text-xs focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const mNum = i + 1;
                const mStr = `${String(mNum).padStart(2, '0')}.${selectedYear}`;
                return (
                  <option key={mStr} value={mStr}>
                    {getMonthName(mNum)} ({mStr})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Calendar size={14} className="text-slate-700" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-black text-slate-900 text-xs focus:outline-none cursor-pointer"
            >
              {distinctYears.map((yr) => (
                <option key={yr} value={yr}>
                  Année {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Compare Year Selector (N-1) */}
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <span className="text-[11px] font-black text-emerald-800">Vs :</span>
            <select
              value={compareYear}
              onChange={(e) => setCompareYear(Number(e.target.value))}
              className="bg-transparent font-black text-emerald-950 text-xs focus:outline-none cursor-pointer"
            >
              {distinctYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
              {!distinctYears.includes(selectedYear - 1) && (
                <option value={selectedYear - 1}>{selectedYear - 1}</option>
              )}
            </select>
          </div>

          {/* Edit Budget & PU Button */}
          <button
            type="button"
            onClick={handleOpenBudgetModal}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Consulter et modifier les budgets et prix unitaires"
          >
            <Sliders size={14} />
            <span>Budget & Prix</span>
          </button>

          {/* Copy as Image Button */}
          <button
            type="button"
            onClick={handleCopyAsImage}
            disabled={tableRows.length === 0 || isCapturingImage}
            className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Copier le tableau complet comme une Image Haute Définition"
          >
            {copyImageSuccess ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span className="text-emerald-700 font-bold">Image Copiée !</span>
              </>
            ) : (
              <>
                <Camera size={14} className="text-purple-700" />
                <span>{isCapturingImage ? 'Capture...' : 'Image HD'}</span>
              </>
            )}
          </button>

          {/* Copy Table to Word Button */}
          <button
            type="button"
            onClick={handleCopyForWord}
            disabled={tableRows.length === 0}
            className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Copier le tableau au format Word / Excel éditable"
          >
            {copyWordSuccess ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copié pour Word !</span>
              </>
            ) : (
              <>
                <Copy size={14} className="text-indigo-700" />
                <span>Word / Excel</span>
              </>
            )}
          </button>

          {/* Grab & Slide Toggle Button */}
          <button
            type="button"
            onClick={() => setIsGrabScrollActive((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isGrabScrollActive
                ? 'bg-amber-100 hover:bg-amber-200/80 text-amber-950 border-amber-300 shadow-2xs ring-1 ring-amber-400/50'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Activer ou désactiver le mode saisie et glisser (Grab & Slide)"
          >
            <Hand size={14} className={isGrabScrollActive ? 'text-amber-700' : 'text-slate-600'} />
            <span className="hidden sm:inline">{isGrabScrollActive ? 'Glisser : Activé' : 'Mode Glisser'}</span>
            <span className="sm:hidden">Glisser</span>
          </button>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
            title="Exporter vers Excel"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* Active Filter Notice if DN15 filter is active */}
      {selectedDn15Code !== 'ALL' && (
        <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-amber-700" />
            <span>
              Filtrage actif pour DN15 sur le code article : <strong className="font-mono">{selectedDn15Code}</strong>
              {dn15Articles.find((a) => a.code === selectedDn15Code)
                ? ` (${dn15Articles.find((a) => a.code === selectedDn15Code)?.des})`
                : ''}
              . Le calcul du <strong className="font-mono">Total</strong> est basé sur cette sélection.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDn15Code('ALL')}
            className="text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
          >
            Réinitialiser (Tous les DN15)
          </button>
        </div>
      )}

      {/* 2. MAIN PRODUCTION TABLE (MATCHING USER SCREENSHOT COLUMNS & EXECUTIVE COLORS) */}
      <div id="production-dashboard-table-container" className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
        {/* Table Title Banner - Matching Excel Feuil1 Row 0 & 1 */}
        <div className="bg-slate-900 text-white px-4 py-2.5 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black tracking-wide uppercase text-amber-300">
              Tableau de Suivi de Production - Exercice {selectedYear} ({getMonthName(selectedMonthNum)})
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              Comparatif mensuel ,trimestriel (T{quarter}), annuel et historique vs {compareYear}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <span className="inline-flex items-center gap-1.5 bg-slate-800 text-amber-300 px-3 py-1 rounded-lg border border-slate-700 font-medium">
              <Hand size={14} className="text-amber-400" />
              <span>Maintenez le clic et glissez horizontalement</span>
            </span>
          </div>
        </div>

        {/* Horizontal Navigation & Drag-to-Slide Controls */}
        <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-1.5 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <Hand size={13} className="text-amber-600" />
              <span>
                <strong className="text-slate-900 font-semibold">Mode Glisser actif :</strong> Cliquez n'importe où sur le tableau et déplacez la souris horizontalement pour naviguer.
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleScrollTableLeft}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
              title="Faire défiler vers la gauche"
            >
              <ChevronLeft size={13} />
              <span className="hidden md:inline">Gauche</span>
            </button>
            <button
              type="button"
              onClick={handleScrollTableRight}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
              title="Faire défiler vers la droite"
            >
              <span className="hidden md:inline">Droite</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div
          ref={tableContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`overflow-x-auto max-h-[820px] relative transition-shadow touch-pan-x ${
            isDraggingTable
              ? 'cursor-grabbing select-none'
              : 'cursor-grab'
          }`}
        >
          <table className="w-full text-left border-collapse text-xs sm:text-sm border border-slate-400">
            {/* MULTI-LEVEL HEADER */}
            <thead className="sticky top-0 z-20 shadow-xs border-b border-slate-400">
              {/* Level 1: Category Groups */}
              <tr className="border-b border-slate-400 font-bold text-xs uppercase tracking-wider text-center">
                <th
                  rowSpan={2}
                  className="bg-[#0f172a] text-white font-black py-3 px-3 text-left sticky left-0 z-30 border-r border-slate-700 min-w-[170px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.25)]"
                >
                  PRODUITS
                </th>
                <th
                  rowSpan={2}
                  className="bg-[#0f172a] text-white font-bold py-3 px-2 text-center border-r border-slate-700 min-w-[45px]"
                >
                  UM
                </th>
                <th
                  rowSpan={2}
                  className="bg-[#0f172a] text-white font-black py-3 px-2.5 text-right border-r border-slate-700 min-w-[70px]"
                >
                  PU (kDA)
                </th>
                <th
                  colSpan={3}
                  className="bg-[#0f766e] text-white font-black py-2.5 px-2 text-center border-r border-teal-600"
                >
                  Budget & Clôture {selectedYear}
                </th>
                <th
                  colSpan={3}
                  className="bg-[#d97706] text-white font-black py-2.5 px-2 text-center border-r border-amber-600"
                >
                  Mois
                </th>
                <th
                  colSpan={3}
                  className="bg-[#2563eb] text-white font-black py-2.5 px-2 text-center border-r border-blue-600"
                >
                  Trimestre
                </th>
                <th
                  colSpan={5}
                  className="bg-[#059669] text-white font-black py-2.5 px-2 text-center border-r border-emerald-600"
                >
                  Année {selectedYear}
                </th>
                <th
                  colSpan={1}
                  className="bg-[#475569] text-white font-black py-2.5 px-2 text-center border-r border-slate-600 min-w-[95px] text-[11px]"
                >
                  {prevMonthLabel}
                </th>
                <th
                  colSpan={4}
                  className="bg-[#4f46e5] text-white font-black py-2.5 px-2 text-center border-r border-indigo-600"
                >
                  Comparaison {compareYear} / {selectedYear}
                </th>
              </tr>

              {/* Level 2: Specific Columns */}
              <tr className="border-b border-slate-400 text-[11px] sm:text-xs font-bold text-center">
                {/* Under Budget & Clôture */}
                <th className="bg-[#115e59] text-white font-bold text-right py-2 px-2 border-r border-teal-500 min-w-[85px]">
                  Budget {selectedYear}
                </th>
                <th className="bg-[#115e59] text-white font-bold text-right py-2 px-2 border-r border-teal-500 min-w-[90px]">
                  Prévision de clôture {selectedYear}
                </th>
                <th className="bg-[#115e59] text-white font-bold text-center py-2 px-1.5 border-r border-teal-500 min-w-[60px]">
                  %
                </th>

                {/* Under Mois */}
                <th className="bg-[#b45309] text-white font-bold text-right py-2 px-2 border-r border-amber-500 min-w-[85px]">
                  Prévu Mois {selectedYear} ❶
                </th>
                <th className="bg-[#b45309] text-white font-black text-right py-2 px-2 border-r border-amber-500 min-w-[85px]">
                  Real Mois {selectedYear} ❷
                </th>
                <th className="bg-[#b45309] text-white font-bold text-center py-2 px-1.5 border-r border-amber-500 min-w-[80px]">
                  % réalisation mois ❷/❶
                </th>

                {/* Under Trimestre */}
                <th className="bg-[#1d4ed8] text-white font-bold text-right py-2 px-2 border-r border-blue-500 min-w-[80px]">
                  Prev T{quarter}
                </th>
                <th className="bg-[#1d4ed8] text-white font-black text-right py-2 px-2 border-r border-blue-500 min-w-[80px]">
                  Real T{quarter}
                </th>
                <th className="bg-[#1d4ed8] text-white font-bold text-center py-2 px-1.5 border-r border-blue-500 min-w-[65px]">
                  %
                </th>

                {/* Under Année */}
                <th className="bg-[#047857] text-white font-bold text-right py-2 px-2 border-r border-emerald-500 min-w-[85px]">
                  Prévu Cum {selectedYear} ❹
                </th>
                <th className="bg-[#047857] text-white font-black text-right py-2 px-2 border-r border-emerald-500 min-w-[85px]">
                  Real Cum {selectedYear} ❺
                </th>
                <th className="bg-[#047857] text-white font-bold text-center py-2 px-1.5 border-r border-emerald-500 min-w-[95px]">
                  % réalisation cumul / prévu cumul ❺/❹
                </th>
                <th className="bg-[#047857] text-white font-bold text-right py-2 px-2 border-r border-emerald-500 min-w-[95px]">
                  Quantité restante à la clôture {selectedYear}
                </th>
                <th className="bg-[#047857] text-white font-bold text-center py-2 px-1.5 border-r border-emerald-500 min-w-[95px]">
                  % réalisation annuelle ❺ / Prévision de clôture
                </th>

                {/* Under mois précédent */}
                <th className="bg-[#334155] text-white font-bold text-right py-2 px-2 border-r border-slate-500 min-w-[85px]">
                  Real mois n-1
                </th>

                {/* Under Comparaison */}
                <th className="bg-[#4338ca] text-white font-bold text-right py-2 px-2 border-r border-indigo-500 min-w-[85px]">
                  Real Mois {compareYear} ❸
                </th>
                <th className="bg-[#4338ca] text-white font-bold text-center py-2 px-1.5 border-r border-indigo-500 min-w-[80px]">
                  % réalisation du mois {String(selectedYear).slice(-2)}/{String(compareYear).slice(-2)} ❷/❸
                </th>
                <th className="bg-[#4338ca] text-white font-bold text-right py-2 px-2 border-r border-indigo-500 min-w-[85px]">
                  Real Cum {compareYear} ❻
                </th>
                <th className="bg-[#4338ca] text-white font-bold text-center py-2 px-1.5 border-r border-indigo-500 min-w-[80px]">
                  % réalisation cumul {String(selectedYear).slice(-2)}/{String(compareYear).slice(-2)} ❺/❻
                </th>
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody className="divide-y divide-slate-300">
              {tableRows.map((r) => (
                <React.Fragment key={r.key}>
                  {/* Sub-row 1: Quantities (U) */}
                  <tr className="hover:opacity-95 transition-colors bg-white font-mono text-xs sm:text-sm">
                    {/* Calibre Name */}
                    <td
                      className="font-sans font-bold text-slate-900 sticky left-0 z-10 bg-white border-r border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] py-1.5 px-3"
                      rowSpan={2}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{r.label}</span>
                        {r.sublabel && (
                          <span className="text-[10px] font-mono text-slate-700 font-semibold truncate max-w-[160px]" title={r.sublabel}>
                            {r.sublabel}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Unit: U */}
                    <td className="text-center font-bold text-slate-900 bg-slate-100 border-r border-slate-300 py-1.5 px-1 text-xs">
                      U
                    </td>

                    {/* PU (kDA) spanning 2 rows */}
                    <td
                      className="text-right text-slate-900 font-mono font-bold bg-slate-50 border-r border-slate-300 py-1.5 px-2"
                      rowSpan={2}
                    >
                      {formatPricePU(r.pu)}
                    </td>

                    {/* Budget & Clôture */}
                    <td className="text-right text-slate-900 bg-[#ecfeff] border-r border-teal-200/70 py-1.5 px-2 font-bold">
                      {formatNumber(r.budgetU)}
                    </td>
                    <td className="text-right text-slate-900 bg-[#cffafe] border-r border-teal-200/70 py-1.5 px-2 font-bold">
                      {formatNumber(r.previsionClotureU)}
                    </td>
                    <td className="text-center bg-[#ecfeff] border-r border-teal-300/80 py-1.5 px-1 font-bold text-slate-900">
                      {formatPercent(r.txPrevisionVsBudgetU)}
                    </td>

                    {/* 1. Mois N (U) */}
                    <td className="text-right text-slate-900 bg-[#fffbeb] border-r border-amber-200/60 py-1.5 px-2 font-medium">
                      {formatNumber(r.prevuMoisU)}
                    </td>
                    <td className="text-right text-slate-950 font-black bg-[#fef3c7] border-r border-amber-200/80 py-1.5 px-2">
                      {formatNumber(r.realMoisU)}
                    </td>
                    <td className="text-center bg-[#fffbeb] border-r border-amber-300/80 py-1.5 px-1 font-bold text-slate-900">
                      {formatPercent(r.txRealMoisU)}
                    </td>

                    {/* 2. Trimestre (U) */}
                    <td className="text-right text-slate-900 bg-[#eff6ff] border-r border-blue-200/60 py-1.5 px-2 font-medium">
                      {formatNumVal(r.prevQuarterU)}
                    </td>
                    <td className="text-right text-slate-950 font-black bg-[#dbeafe] border-r border-blue-200/80 py-1.5 px-2">
                      {formatNumber(r.realQuarterU)}
                    </td>
                    <td className="text-center bg-[#eff6ff] border-r border-blue-300/80 py-1.5 px-1 font-bold text-slate-900">
                      {formatPercent(r.txQuarterRealVsPrevuU)}
                    </td>

                    {/* 3. Année (U) */}
                    <td className="text-right text-slate-900 bg-[#f0fdf4] border-r border-emerald-200/60 py-1.5 px-2 font-medium">
                      {formatNumber(r.prevuCumU)}
                    </td>
                    <td className="text-right text-slate-950 font-black bg-[#dcfce7] border-r border-emerald-200/80 py-1.5 px-2">
                      {formatNumber(r.realCumU)}
                    </td>
                    <td className="text-center bg-[#f0fdf4] border-r border-emerald-200/60 py-1.5 px-1 font-bold text-slate-900">
                      {formatPercent(r.txRealCumU)}
                    </td>
                    <td className="text-right text-slate-900 bg-[#f0fdf4] border-r border-emerald-200/70 py-1.5 px-2 font-bold">
                      {formatNumber(r.quantiteRestanteU)}
                    </td>
                    <td className="text-center bg-[#dcfce7] border-r border-emerald-300/80 py-1.5 px-1 font-bold text-slate-900">
                      {formatPercent(r.txRealAnnuelleVsPrevisionU)}
                    </td>

                    {/* 4. Mois Precedent (U) */}
                    <td className="text-right text-slate-900 bg-[#f1f5f9] border-r border-slate-300 py-1.5 px-2 font-semibold">
                      {formatNumber(r.realMoisNMinus1U)}
                    </td>

                    {/* 5. Comparaison (U) */}
                    <td className="text-right text-slate-900 bg-[#eef2ff] border-r border-indigo-200/60 py-1.5 px-2 font-medium">
                      {formatNumber(r.realMoisPrevYearU)}
                    </td>
                    <td className="text-center bg-[#eef2ff] border-r border-indigo-200/60 py-1.5 px-1 font-bold text-slate-900">
                      {formatPercent(r.txRealMoisYoYU)}
                    </td>
                    <td className="text-right text-slate-900 bg-[#eef2ff] border-r border-indigo-200/60 py-1.5 px-2 font-medium">
                      {formatNumber(r.realCumPrevYearU)}
                    </td>
                    <td className="text-center bg-[#eef2ff] border-r border-indigo-300/80 py-1.5 px-1 font-bold text-slate-900">
                      {formatPercent(r.txRealCumYoYU)}
                    </td>
                  </tr>

                  {/* Sub-row 2: Values (kDA) */}
                  <tr className="hover:opacity-95 transition-colors font-mono text-xs text-slate-900 border-b border-slate-300">
                    {/* Unit: kDA */}
                    <td className="text-center font-bold text-slate-900 bg-slate-200 border-r border-slate-300 py-1 px-1 text-[11px]">
                      KDA
                    </td>

                    {/* Budget & Clôture (kDA) */}
                    <td className="text-right text-slate-900 bg-[#f0fdfa] border-r border-teal-200/70 py-1 px-2 font-medium">
                      {formatNumVal(r.budgetKDA)}
                    </td>
                    <td className="text-right text-slate-900 bg-[#e6fffa] border-r border-teal-200/70 py-1 px-2 font-medium">
                      {formatNumVal(r.previsionClotureKDA)}
                    </td>
                    <td className="text-center bg-[#f0fdfa] border-r border-teal-300/80 py-1 px-1 font-bold text-slate-900">
                      {formatPercent(r.txPrevisionVsBudgetKDA)}
                    </td>

                    {/* 1. Mois N (KDA) */}
                    <td className="text-right text-slate-900 bg-[#fffdf5] border-r border-amber-200/60 py-1 px-2">
                      {formatNumVal(r.prevuMoisKDA)}
                    </td>
                    <td className="text-right text-slate-950 font-black bg-[#fef9c3] border-r border-amber-200/80 py-1 px-2">
                      {formatNumVal(r.realMoisKDA)}
                    </td>
                    <td className="text-center bg-[#fffdf5] border-r border-amber-300/80 py-1 px-1 font-bold text-slate-900">
                      {formatPercent(r.txRealMoisKDA)}
                    </td>

                    {/* 2. Trimestre (KDA) */}
                    <td className="text-right text-slate-900 bg-[#f8faff] border-r border-blue-200/60 py-1 px-2">
                      {formatNumVal(r.prevQuarterKDA)}
                    </td>
                    <td className="text-right text-slate-950 font-black bg-[#e0f2fe] border-r border-blue-200/80 py-1 px-2">
                      {formatNumVal(r.realQuarterKDA)}
                    </td>
                    <td className="text-center bg-[#f8faff] border-r border-blue-300/80 py-1 px-1 font-bold text-slate-900">
                      {formatPercent(r.txQuarterRealVsPrevuKDA)}
                    </td>

                    {/* 3. Année (KDA) */}
                    <td className="text-right text-slate-900 bg-[#f6fef9] border-r border-emerald-200/60 py-1 px-2">
                      {formatNumVal(r.prevuCumKDA)}
                    </td>
                    <td className="text-right text-slate-950 font-black bg-[#ecfdf5] border-r border-emerald-200/80 py-1 px-2">
                      {formatNumVal(r.realCumKDA)}
                    </td>
                    <td className="text-center bg-[#f6fef9] border-r border-emerald-200/60 py-1 px-1 font-bold text-slate-900">
                      {formatPercent(r.txRealCumKDA)}
                    </td>
                    <td className="text-right text-slate-900 bg-[#f6fef9] border-r border-emerald-200/70 py-1 px-2 font-medium">
                      {formatNumVal(r.quantiteRestanteKDA)}
                    </td>
                    <td className="text-center bg-[#ecfdf5] border-r border-emerald-300/80 py-1 px-1 font-bold text-slate-900">
                      {formatPercent(r.txRealAnnuelleVsPrevisionKDA)}
                    </td>

                    {/* 4. Mois Precedent (KDA) */}
                    <td className="text-right text-slate-900 bg-[#f8fafc] border-r border-slate-300 py-1 px-2 font-medium">
                      {formatNumVal(r.realMoisNMinus1KDA)}
                    </td>

                    {/* 5. Comparaison (KDA) */}
                    <td className="text-right text-slate-900 bg-[#f5f3ff] border-r border-indigo-200/60 py-1 px-2">
                      {formatNumVal(r.realMoisPrevYearKDA)}
                    </td>
                    <td className="text-center bg-[#f5f3ff] border-r border-indigo-200/60 py-1 px-1 font-bold text-slate-900">
                      {formatPercent(r.txRealMoisYoYKDA)}
                    </td>
                    <td className="text-right text-slate-900 bg-[#f5f3ff] border-r border-indigo-200/60 py-1 px-2">
                      {formatNumVal(r.realCumPrevYearKDA)}
                    </td>
                    <td className="text-center bg-[#f5f3ff] border-r border-indigo-300/80 py-1 px-1 font-bold text-slate-900">
                      {formatPercent(r.txRealCumYoYKDA)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>

            {/* TOTAL FOOTER (DISTINCT EXECUTIVE GOLD ACCENT ACROSS ALL 22 COLUMNS) */}
            <tfoot className="sticky bottom-0 z-20 font-mono shadow-md border-t-2 border-amber-500 bg-white">
              {/* Total Row 1: Units (U) */}
              <tr className="text-xs sm:text-sm font-black border-b border-amber-300 bg-white">
                <td
                  className="py-2.5 px-3 font-sans font-black text-xs text-center sticky left-0 z-20 bg-[#facc15] border-r border-amber-400 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-slate-950 uppercase"
                  rowSpan={2}
                >
                  TOTAL
                </td>
                <td className="py-2 px-1 text-center font-black text-xs text-slate-950 bg-[#fde047] border-r border-amber-300">
                  U
                </td>
                <td
                  className="py-2 px-2 text-center font-black text-xs text-slate-950 bg-[#fde68a] border-r border-amber-300"
                  rowSpan={2}
                >
                  -
                </td>
                <td className="py-2 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef08a]">
                  {formatNumber(totals.budgetU)}
                </td>
                <td className="py-2 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef08a]">
                  {formatNumber(totals.previsionClotureU)}
                </td>
                <td className="py-2 px-1 text-center border-r border-amber-300/80 bg-[#fef08a] font-black text-slate-950">
                  {formatPercent(totals.txPrevisionVsBudgetU)}
                </td>

                {/* 1. Mois N (U) */}
                <td className="py-2 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef08a]">
                  {formatNumber(totals.prevuMoisU)}
                </td>
                <td className="py-2 px-2 text-right font-black border-r border-amber-300/80 text-slate-950 bg-[#fef08a]">
                  {formatNumber(totals.realMoisU)}
                </td>
                <td className="py-2 px-1 text-center border-r border-amber-300/80 bg-[#fef08a] font-black text-slate-950">
                  {formatPercent(totals.txRealMoisU)}
                </td>

                {/* 2. Trimestre (U) */}
                <td className="py-2 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef08a]">
                  {formatNumVal(totals.prevQuarterU)}
                </td>
                <td className="py-2 px-2 text-right font-black border-r border-amber-300/80 text-slate-950 bg-[#fef08a]">
                  {formatNumber(totals.realQuarterU)}
                </td>
                <td className="py-2 px-1 text-center border-r border-amber-300/80 bg-[#fef08a] font-black text-slate-950">
                  {formatPercent(totals.txQuarterRealVsPrevuU)}
                </td>

                {/* 3. Année (U) */}
                <td className="py-2 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef08a]">
                  {formatNumber(totals.prevuCumU)}
                </td>
                <td className="py-2 px-2 text-right font-black border-r border-amber-300/80 text-slate-950 bg-[#fef08a]">
                  {formatNumber(totals.realCumU)}
                </td>
                <td className="py-2 px-1 text-center border-r border-amber-300/80 bg-[#fef08a] font-black text-slate-950">
                  {formatPercent(totals.txRealCumU)}
                </td>
                <td className="py-2 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef08a]">
                  {formatNumber(totals.quantiteRestanteU)}
                </td>
                <td className="py-2 px-1 text-center border-r border-amber-300/80 bg-[#fef08a] font-black text-slate-950">
                  {formatPercent(totals.txRealAnnuelleVsPrevisionU)}
                </td>

                {/* 4. Mois Precedent (U) */}
                <td className="py-2 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef08a]">
                  {formatNumber(totals.realMoisNMinus1U)}
                </td>

                {/* 5. Comparaison (U) */}
                <td className="py-2 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef08a]">
                  {formatNumber(totals.realMoisPrevYearU)}
                </td>
                <td className="py-2 px-1 text-center border-r border-amber-300/80 bg-[#fef08a] font-black text-slate-950">
                  {formatPercent(totals.txRealMoisYoYU)}
                </td>
                <td className="py-2 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef08a]">
                  {formatNumber(totals.realCumPrevYearU)}
                </td>
                <td className="py-2 px-1 text-center border-r border-amber-300/80 bg-[#fef08a] font-black text-slate-950">
                  {formatPercent(totals.txRealCumYoYU)}
                </td>
              </tr>

              {/* Total Row 2: Values (kDA) */}
              <tr className="text-xs font-black text-slate-950 bg-white">
                <td className="py-1.5 px-1 text-center font-black text-xs text-slate-950 bg-[#fde047] border-r border-amber-300">
                  KDA
                </td>
                <td className="py-1.5 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef9c3]">
                  {formatNumVal(totals.budgetKDA)}
                </td>
                <td className="py-1.5 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef9c3]">
                  {formatNumVal(totals.previsionClotureKDA)}
                </td>
                <td className="py-1.5 px-1 text-center border-r border-amber-300/80 bg-[#fef9c3] font-black text-slate-950">
                  {formatPercent(totals.txPrevisionVsBudgetKDA)}
                </td>

                {/* 1. Mois N (KDA) */}
                <td className="py-1.5 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef9c3]">
                  {formatNumVal(totals.prevuMoisKDA)}
                </td>
                <td className="py-1.5 px-2 text-right font-black border-r border-amber-300/80 text-slate-950 bg-[#fef9c3]">
                  {formatNumVal(totals.realMoisKDA)}
                </td>
                <td className="py-1.5 px-1 text-center border-r border-amber-300/80 bg-[#fef9c3] font-black text-slate-950">
                  {formatPercent(totals.txRealMoisKDA)}
                </td>

                {/* 2. Trimestre (KDA) */}
                <td className="py-1.5 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef9c3]">
                  {formatNumVal(totals.prevQuarterKDA)}
                </td>
                <td className="py-1.5 px-2 text-right font-black border-r border-amber-300/80 text-slate-950 bg-[#fef9c3]">
                  {formatNumVal(totals.realQuarterKDA)}
                </td>
                <td className="py-1.5 px-1 text-center border-r border-amber-300/80 bg-[#fef9c3] font-black text-slate-950">
                  {formatPercent(totals.txQuarterRealVsPrevuKDA)}
                </td>

                {/* 3. Année (KDA) */}
                <td className="py-1.5 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef9c3]">
                  {formatNumVal(totals.prevuCumKDA)}
                </td>
                <td className="py-1.5 px-2 text-right font-black border-r border-amber-300/80 text-slate-950 bg-[#fef9c3]">
                  {formatNumVal(totals.realCumKDA)}
                </td>
                <td className="py-1.5 px-1 text-center border-r border-amber-300/80 bg-[#fef9c3] font-black text-slate-950">
                  {formatPercent(totals.txRealCumKDA)}
                </td>
                <td className="py-1.5 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef9c3]">
                  {formatNumVal(totals.quantiteRestanteKDA)}
                </td>
                <td className="py-1.5 px-1 text-center border-r border-amber-300/80 bg-[#fef9c3] font-black text-slate-950">
                  {formatPercent(totals.txRealAnnuelleVsPrevisionKDA)}
                </td>

                {/* 4. Mois Precedent (KDA) */}
                <td className="py-1.5 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef9c3]">
                  {formatNumVal(totals.realMoisNMinus1KDA)}
                </td>

                {/* 5. Comparaison (KDA) */}
                <td className="py-1.5 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef9c3]">
                  {formatNumVal(totals.realMoisPrevYearKDA)}
                </td>
                <td className="py-1.5 px-1 text-center border-r border-amber-300/80 bg-[#fef9c3] font-black text-slate-950">
                  {formatPercent(totals.txRealMoisYoYKDA)}
                </td>
                <td className="py-1.5 px-2 text-right border-r border-amber-300/80 text-slate-950 font-black bg-[#fef9c3]">
                  {formatNumVal(totals.realCumPrevYearKDA)}
                </td>
                <td className="py-1.5 px-1 text-center border-r border-amber-300/80 bg-[#fef9c3] font-black text-slate-950">
                  {formatPercent(totals.txRealCumYoYKDA)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3. BILAN DE LA PRODUCTION - EXACT MATCH TO EXCEL ROWS 27-34 */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500 text-slate-950 rounded-lg font-black">
              <Award size={16} />
            </span>
            <h3 className="text-sm font-black tracking-wide uppercase text-amber-300">
              Bilan de la production {getMonthName(selectedMonthNum).toLowerCase()} {selectedYear}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Arrêté à fin {getMonthName(selectedMonthNum)} {selectedYear}
          </span>
        </div>

        {/* Executive 4-Card Overview */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/70 border-b border-slate-200">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Production Réalisée (Mois)</span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-xl font-black text-slate-900 font-mono">{formatNumber(totals.realMoisU)}</span>
              <span className="text-xs text-slate-500 font-semibold">pcs</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Prévu mois : <span className="font-bold text-slate-700 font-mono">{formatNumber(totals.prevuMoisU)}</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Taux de Réalisation (Mois)</span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-xl font-black text-amber-600 font-mono">{formatPercent(totals.txRealMoisU)}</span>
              <span className="text-xs text-slate-500 font-semibold">❷/❶</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Écart : <span className="font-bold text-slate-700 font-mono">{formatNumber(totals.realMoisU - totals.prevuMoisU)} pcs</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Production Cumul Réalisée</span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-xl font-black text-emerald-700 font-mono">{formatNumber(totals.realCumU)}</span>
              <span className="text-xs text-slate-500 font-semibold">pcs (YTD)</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Prévision cumul : <span className="font-bold text-slate-700 font-mono">{formatNumber(totals.prevuCumU)}</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Taux Réalisation Cumul & Annuel</span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-xl font-black text-blue-700 font-mono">{formatPercent(totals.txRealCumU)}</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Annuel : {formatPercent(totals.txRealAnnuelleVsPrevisionU)}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Quantité restante : <span className="font-bold text-slate-700 font-mono">{formatNumber(totals.quantiteRestanteU)} pcs</span>
            </div>
          </div>
        </div>

        {/* Line-by-Line KPI Table matching Excel Rows 28-34 */}
        <div className="px-5 py-3.5 bg-white">
          <table className="w-full text-xs font-medium">
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-1.5 text-slate-700 font-bold">Production réalisée :</td>
                <td className="py-1.5 text-right font-mono font-black text-slate-900">{formatNumber(totals.realMoisU)} pièces</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-1.5 text-slate-700 font-bold">Production du mois :</td>
                <td className="py-1.5 text-right font-mono font-bold text-slate-800">{formatNumber(totals.prevuMoisU)} pièces</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-1.5 text-slate-700 font-bold">Taux de réalisation :</td>
                <td className="py-1.5 text-right font-mono font-black text-amber-700">{formatPercent(totals.txRealMoisU)}</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-1.5 text-slate-700 font-bold">Production cumul réalisée :</td>
                <td className="py-1.5 text-right font-mono font-black text-emerald-700">{formatNumber(totals.realCumU)} pièces</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-1.5 text-slate-700 font-bold">Prévision cumul :</td>
                <td className="py-1.5 text-right font-mono font-bold text-slate-800">{formatNumber(totals.prevuCumU)} pièces</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-1.5 text-slate-700 font-bold">Taux de réalisation cumul :</td>
                <td className="py-1.5 text-right font-mono font-black text-blue-700">{formatPercent(totals.txRealCumU)}</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-1.5 text-slate-700 font-bold">Taux de realisation annuel :</td>
                <td className="py-1.5 text-right font-mono font-black text-indigo-700">{formatPercent(totals.txRealAnnuelleVsPrevisionU)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. SYNTHESIS CARDS & OPERATIONAL NOTES (NB) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Synthesis 1: Monthly Target vs Realized */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Atteinte Objectif Mois
              </span>
              <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                <Target size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
                  {formatNumber(totals.realMoisU)} / {formatNumber(totals.prevuMoisU)}
                </span>
                <span className={`text-sm sm:text-base font-bold ${getPercentColorClass(totals.txRealMoisU, displayMode)}`}>
                  {formatPercent(totals.txRealMoisU)}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Pièces produites vs objectif mensuel ({getMonthName(selectedMonthNum)} {selectedYear})
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Valorisation Réalisée :</span>
            <span className="text-slate-900 font-mono font-bold">{formatNumVal(totals.realMoisKDA)} kDA</span>
          </div>
        </div>

        {/* Synthesis 2: Annual Cumulative vs Budget */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Avancement Cumulé YTD
              </span>
              <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                <Award size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
                  {formatNumber(totals.realCumU)} / {formatNumber(totals.prevuCumU)}
                </span>
                <span className={`text-sm sm:text-base font-bold ${getPercentColorClass(totals.txRealCumU, displayMode)}`}>
                  {formatPercent(totals.txRealCumU)}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Progression : {formatPercent(totals.txRealAnnuelleU)} du budget annuel ({formatNumber(totals.budgetU)} pcs)
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Valeur Cumulée Réalisée :</span>
            <span className="text-slate-900 font-mono font-bold">{formatNumVal(totals.realCumKDA)} kDA</span>
          </div>
        </div>

        {/* Synthesis 3: Operational Notes (NB) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Notes & Remarques Opérationnelles (NB)
              </span>
              <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                <Edit3 size={18} />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1.5">
              Observations mensuelles pour le rapport de gestion ({getMonthName(selectedMonthNum)} {selectedYear})
            </p>
          </div>

          <div className="mt-3 space-y-3">
            <textarea
              rows={3}
              value={operationalNote}
              onChange={(e) => setOperationalNote(e.target.value)}
              placeholder="Ex: L'objectif mensuel n'a pas été atteint en raison de l'absence de livraison..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
            />

            <div className="flex items-center justify-between">
              {noteSaveStatus ? (
                <span className="text-xs font-bold text-emerald-700 animate-in fade-in flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  {noteSaveStatus}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Sauvegardé pour {selectedMonthStr}.
                </span>
              )}

              <button
                type="button"
                onClick={handleSaveNote}
                disabled={savingNote}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {savingNote ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                <span>Enregistrer Note</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODAL: BUDGET & PRIX UNITAIRES (PU) SETTINGS */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl">
                  <Sliders size={20} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    Paramétrage du Budget & Prix Unitaires ({selectedYear})
                  </h2>
                  <p className="text-[11px] text-emerald-200/80">
                    Définissez les objectifs en pièces (annuels) et les prix unitaires standards (kDA) par calibre
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <Info size={16} className="text-emerald-700 shrink-0" />
                <span>
                  Ces paramètres calculent les colonnes <strong>Budget {selectedYear}</strong>, <strong>Prévu Mois</strong>, <strong>Prévu Trimestre</strong>, et les valorisations en <strong>kDA</strong>.
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Calibre / Famille</th>
                      <th className="py-2.5 px-3 text-right">Budget Annuel (Pièces)</th>
                      <th className="py-2.5 px-3 text-right">Prévision de clôture (Pièces)</th>
                      <th className="py-2.5 px-3 text-right">Prix Unitaire (kDA / pce)</th>
                      <th className="py-2.5 px-3 text-right">Budget Valorisé (kDA)</th>
                      <th className="py-2.5 px-3 text-right">Clôture Valorisée (kDA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {editBudgetItems.map((item, idx) => {
                      const qte = Number(item.budget_qte) || 0;
                      const prevCloture =
                        item.prevision_cloture_qte !== undefined && item.prevision_cloture_qte !== null
                          ? Number(item.prevision_cloture_qte)
                          : qte;
                      const pu = Number(item.prix_unitaire_kda) || 0;
                      const totalKda = qte * pu;
                      const totalClotureKda = prevCloture * pu;

                      return (
                        <tr key={item.famille_diametre} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-sans font-bold text-slate-900">
                            {item.famille_diametre}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min={0}
                              value={item.budget_qte}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setEditBudgetItems((prev) =>
                                  prev.map((b, i) => (i === idx ? { ...b, budget_qte: val } : b))
                                );
                              }}
                              className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min={0}
                              value={
                                item.prevision_cloture_qte !== undefined && item.prevision_cloture_qte !== null
                                  ? item.prevision_cloture_qte
                                  : item.budget_qte
                              }
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setEditBudgetItems((prev) =>
                                  prev.map((b, i) =>
                                    i === idx ? { ...b, prevision_cloture_qte: val } : b
                                  )
                                );
                              }}
                              className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-bold text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.00001"
                              min={0}
                              value={item.prix_unitaire_kda}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setEditBudgetItems((prev) =>
                                  prev.map((b, i) =>
                                    i === idx ? { ...b, prix_unitaire_kda: val } : b
                                  )
                                );
                              }}
                              className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-900">
                            {formatNumVal(totalKda, 1)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-teal-900">
                            {formatNumVal(totalClotureKda, 1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              {budgetSaveStatus ? (
                <span className="text-xs font-bold text-emerald-700 animate-in fade-in flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  {budgetSaveStatus}
                </span>
              ) : (
                <span className="text-xs text-slate-500">
                  Total Budget Prévu :{' '}
                  <strong className="text-slate-900">
                    {formatNumber(editBudgetItems.reduce((sum, b) => sum + (Number(b.budget_qte) || 0), 0))} pcs
                  </strong>
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveBudgets}
                  disabled={savingBudgets}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingBudgets ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>Enregistrer Budgets</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
