import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Boxes, 
  Search, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  FileSpreadsheet, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Eye,
  EyeOff,
  TrendingDown,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  Info,
  Clock,
  ArrowRight,
  ShieldAlert,
  BarChart2,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  SlidersHorizontal,
  PackageCheck,
  PackageX,
  Gauge,
  Sparkles,
  ArrowUpRight,
  Zap,
  Tag,
  Link2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StockItem, StockStatusType, StockCategory } from '../types';

interface StockSituationProps {
  mode?: 'components' | 'finished_goods' | 'purchased' | 'all';
  onNavigateToAppro?: () => void;
}

type TabFilter = 'ALL' | 'RUPTURE' | 'CRITIQUE' | 'BAS' | 'DISPONIBLE' | 'HIDDEN';
type ViewTab = 'TRACKED' | 'SELLING_CODES';

export const StockSituation: React.FC<StockSituationProps> = ({ mode = 'components', onNavigateToAppro }) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Top-level view tab: Active Production Tracking vs Selling Codes (78...) / Untracked
  const [viewTab, setViewTab] = useState<ViewTab>('TRACKED');
  const [sellingSearch, setSellingSearch] = useState('');
  const [sellingStockFilter, setSellingStockFilter] = useState<'ALL' | 'IN_STOCK' | 'ZERO'>('ALL');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'hide' | 'restore' } | null>(null);

  // Tab filter: ALL / RUPTURE / CRITIQUE / BAS / DISPONIBLE / HIDDEN
  const [activeTabFilter, setActiveTabFilter] = useState<TabFilter>('ALL');

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    ruptures: true,
    rupturesLow: true,
    critiques: true,
    bas: true,
    disponibles: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL'); // 'ALL' | 'MP' | 'PF' | 'PD' | 'AUX'
  const [selectedTrend, setSelectedTrend] = useState<string>('ALL'); // 'ALL' | 'SORTIE_PLUS' | 'ENTREE_PLUS'
  const [selectedMagasin, setSelectedMagasin] = useState<string>('ALL');

  // Sorting: Default to MB51 frequency descending for purchased mode
  const [sortField, setSortField] = useState<keyof StockItem>(
    mode === 'purchased' ? 'mb51_frequency' : 'stock_actuel'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (mode === 'purchased') {
      setSortField('mb51_frequency');
      setSortDirection('desc');
      setActiveTabFilter('ALL');
    }
  }, [mode]);

  // Detail Modal for Article History
  const [selectedArticle, setSelectedArticle] = useState<StockItem | null>(null);

  // Upload Modal State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    updatedCount: number;
    ignoredCount: number;
    latestMonth: string;
    alerts: { ruptures: number; critiques: number; bas: number; disponibles: number };
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Stock Situation from backend
  const fetchStockSituation = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stock/situation');
      if (res.ok) {
        const data = await res.json();
        setStockItems(data.items || []);
      } else {
        const fallbackRes = await fetch('/api/stock');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setStockItems(fallbackData);
        }
      }
    } catch (err) {
      console.error('Failed to load stock situation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockSituation();
  }, []);

  // Distinct Magasins
  const magasinsList = useMemo(() => {
    const set = new Set<string>();
    stockItems.forEach((i) => {
      if (i.magasin) set.add(String(i.magasin).trim());
    });
    return Array.from(set).sort();
  }, [stockItems]);

  // Filtered & Scoped items based on Mode
  const scopedItems = useMemo(() => {
    if (mode === 'components') {
      return stockItems.filter(i => (i.categorie || '').toUpperCase() !== 'PF' && i.is_purchased !== true);
    } else if (mode === 'finished_goods') {
      return stockItems.filter(i => (i.categorie || '').toUpperCase() === 'PF');
    } else if (mode === 'purchased') {
      return stockItems.filter(i => i.is_purchased === true);
    }
    return stockItems;
  }, [stockItems, mode]);

  // Separate actively tracked production items from selling codes (78...) / untracked items
  const activeTrackedItems = useMemo(() => {
    return scopedItems.filter(i => i.is_tracked !== false);
  }, [scopedItems]);

  const untrackedItems = useMemo(() => {
    return scopedItems.filter(i => i.is_tracked === false);
  }, [scopedItems]);

  // Overall KPIs (strictly computed from actively tracked items)
  const kpis = useMemo(() => {
    const total = activeTrackedItems.length;
    let ruptures = 0;
    let critiques = 0;
    let bas = 0;
    let disponibles = 0;
    let totalStockVolume = 0;
    let latestMonth = '11.2026';

    activeTrackedItems.forEach((i) => {
      const status = i.health_status || i.statut || (Number(i.stock_actuel) <= 0 ? 'RUPTURE' : 'DISPONIBLE');
      const stVal = Number(i.stock_actuel) || 0;
      totalStockVolume += stVal;

      if (i.latest_month && i.latest_month !== 'Non trouvé dans MCBA') {
        latestMonth = i.latest_month;
      }

      if (status === 'RUPTURE' || stVal <= 0) ruptures++;
      else if (status === 'CRITIQUE') critiques++;
      else if (status === 'BAS') bas++;
      else disponibles++;
    });

    const healthRate = total > 0 ? Math.round((disponibles / total) * 100) : 100;

    return {
      total,
      ruptures,
      critiques,
      bas,
      disponibles,
      problems: ruptures + critiques,
      totalStockVolume,
      latestMonth,
      healthRate,
    };
  }, [activeTrackedItems]);

  // Find potential matching 010* / active production code for a 78* selling code
  const findProductionEquivalent = (sellingItem: StockItem): StockItem | null => {
    const desig = (sellingItem.designation || '').trim().toLowerCase();
    if (!desig || desig.length < 4) return null;
    // 1. Exact designation match in activeTrackedItems (preferring 010... codes)
    const exactMatches = activeTrackedItems.filter(
      a => (a.designation || '').trim().toLowerCase() === desig
    );
    if (exactMatches.length > 0) {
      return exactMatches.find(m => m.code_article.startsWith('010')) || exactMatches[0];
    }
    // 2. Partial/prefix match for 010... codes
    const prodMatch = activeTrackedItems.find(a => {
      if (!a.code_article.startsWith('010')) return false;
      const da = (a.designation || '').trim().toLowerCase();
      return da.length >= 5 && (desig.includes(da) || da.includes(desig));
    });
    return prodMatch || null;
  };

  // Toggle tracking status (move between Tracked and Hors Suivi / Masqués)
  const handleToggleTracking = async (item: StockItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetId = item.id ? String(item.id) : item.code_article;
    const wasTracked = item.is_tracked !== false;
    setTogglingId(item.code_article);
    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(targetId)}/toggle-tracking`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const data = await res.json();
        setStockItems(prev =>
          prev.map(i =>
            i.code_article.trim().toUpperCase() === item.code_article.trim().toUpperCase()
              ? { ...i, is_tracked: data.is_tracked }
              : i
          )
        );
        if (wasTracked) {
          setFeedbackToast({
            message: `Article ${item.code_article} masqué. Retrouvez-le dans l'onglet "Articles Masqués" pour le restaurer à tout moment.`,
            type: 'hide',
          });
        } else {
          setFeedbackToast({
            message: `Article ${item.code_article} restauré avec succès dans le suivi actif.`,
            type: 'restore',
          });
        }
        setTimeout(() => {
          setFeedbackToast(null);
        }, 4000);
      }
    } catch (err) {
      console.error('Failed to toggle tracking:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredHiddenItems = useMemo(() => {
    return untrackedItems
      .filter((item) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesQ =
          !q ||
          item.code_article.toLowerCase().includes(q) ||
          item.designation.toLowerCase().includes(q) ||
          (item.magasin && String(item.magasin).toLowerCase().includes(q));

        let matchesCategory = true;
        if (selectedCategory !== 'ALL') {
          matchesCategory = item.categorie === selectedCategory;
        }

        return matchesQ && matchesCategory;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'mb51_frequency') {
          valA = Number(a.mb51_frequency) || Number(a.mb51_purchased_count) || 0;
          valB = Number(b.mb51_frequency) || Number(b.mb51_purchased_count) || 0;
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          if (valA !== valB) {
            return sortDirection === 'asc' ? valA - valB : valB - valA;
          }
          if (sortField === 'mb51_frequency') {
            const stockA = Number(a.stock_actuel) || 0;
            const stockB = Number(b.stock_actuel) || 0;
            return stockA - stockB;
          }
          const freqA = Number(a.mb51_frequency) || Number(a.mb51_purchased_count) || 0;
          const freqB = Number(b.mb51_frequency) || Number(b.mb51_purchased_count) || 0;
          return freqB - freqA;
        }
        return sortDirection === 'asc'
          ? String(valA ?? '').localeCompare(String(valB ?? ''))
          : String(valB ?? '').localeCompare(String(valA ?? ''));
      });
  }, [untrackedItems, searchQuery, selectedCategory, sortField, sortDirection]);

  const filteredUntrackedItems = useMemo(() => {
    return untrackedItems
      .filter(item => {
        const q = sellingSearch.toLowerCase().trim();
        const matchesQ =
          !q ||
          item.code_article.toLowerCase().includes(q) ||
          item.designation.toLowerCase().includes(q) ||
          (item.magasin && String(item.magasin).toLowerCase().includes(q));
        const st = Number(item.stock_actuel) || 0;
        const matchesStock =
          sellingStockFilter === 'ALL' ||
          (sellingStockFilter === 'IN_STOCK' && st > 0) ||
          (sellingStockFilter === 'ZERO' && st <= 0);
        return matchesQ && matchesStock;
      })
      .sort((a, b) => a.code_article.localeCompare(b.code_article));
  }, [untrackedItems, sellingSearch, sellingStockFilter]);

  const filteredItems = useMemo(() => {
    return activeTrackedItems
      .filter((item) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.code_article.toLowerCase().includes(q) ||
          item.designation.toLowerCase().includes(q) ||
          (item.magasin && String(item.magasin).toLowerCase().includes(q)) ||
          (item.alert_reason && item.alert_reason.toLowerCase().includes(q));

        let matchesCategory = true;
        if (selectedCategory !== 'ALL') {
          matchesCategory = item.categorie === selectedCategory;
        }

        let matchesTrend = true;
        if (selectedTrend === 'SORTIE_PLUS') {
          matchesTrend = item.mb51_trend === 'SORTIE_PLUS' || (Number(item.mb51_total_sorties) > Number(item.mb51_total_entrees));
        } else if (selectedTrend === 'ENTREE_PLUS') {
          matchesTrend = item.mb51_trend === 'ENTREE_PLUS' || (Number(item.mb51_total_entrees) >= Number(item.mb51_total_sorties));
        }

        const matchesMagasin = selectedMagasin === 'ALL' || String(item.magasin) === selectedMagasin;

        // Tab status filter
        let matchesTab = true;
        const status = item.health_status || (Number(item.stock_actuel) <= 0 ? 'RUPTURE' : 'DISPONIBLE');
        if (activeTabFilter === 'RUPTURE') matchesTab = status === 'RUPTURE' || Number(item.stock_actuel) <= 0;
        else if (activeTabFilter === 'CRITIQUE') matchesTab = status === 'CRITIQUE' && Number(item.stock_actuel) > 0;
        else if (activeTabFilter === 'BAS') matchesTab = status === 'BAS' && Number(item.stock_actuel) > 0;
        else if (activeTabFilter === 'DISPONIBLE') matchesTab = status === 'DISPONIBLE' && Number(item.stock_actuel) > 0;
        else if (activeTabFilter === 'HIDDEN') matchesTab = false; // Hidden items handled separately via filteredHiddenItems

        return matchesSearch && matchesCategory && matchesTrend && matchesMagasin && matchesTab;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'mb51_frequency') {
          valA = Number(a.mb51_frequency) || Number(a.mb51_purchased_count) || 0;
          valB = Number(b.mb51_frequency) || Number(b.mb51_purchased_count) || 0;
        } else if (sortField === 'health_status' || sortField === 'statut') {
          const rank = { RUPTURE: 0, CRITIQUE: 1, BAS: 2, DISPONIBLE: 3, SURSTOCK: 4 };
          valA = rank[a.health_status || 'DISPONIBLE'] ?? 5;
          valB = rank[b.health_status || 'DISPONIBLE'] ?? 5;
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          if (valA !== valB) {
            return sortDirection === 'asc' ? valA - valB : valB - valA;
          }
          if (sortField === 'mb51_frequency') {
            const stockA = Number(a.stock_actuel) || 0;
            const stockB = Number(b.stock_actuel) || 0;
            return stockA - stockB;
          }
          const freqA = Number(a.mb51_frequency) || Number(a.mb51_purchased_count) || 0;
          const freqB = Number(b.mb51_frequency) || Number(b.mb51_purchased_count) || 0;
          return freqB - freqA;
        }
        return sortDirection === 'asc'
          ? String(valA ?? '').localeCompare(String(valB ?? ''))
          : String(valB ?? '').localeCompare(String(valA ?? ''));
      });
  }, [activeTrackedItems, searchQuery, selectedCategory, selectedTrend, selectedMagasin, activeTabFilter, sortField, sortDirection]);

  // Grouped sections
  const groupedSections = useMemo(() => {
    // 1. Ruptures de série / fortes conso
    const rupturesHigh = filteredItems.filter((i) => {
      const stock = Number(i.stock_actuel) || 0;
      const history = i.history_records || [];
      const totalOut = history.reduce((s, h) => s + (Number(h.sortie) || 0), 0);
      const isRupture = stock <= 0 || i.health_status === 'RUPTURE';
      if (mode === 'finished_goods') return isRupture;
      return isRupture && totalOut >= 500;
    });

    // 2. Ruptures faible rotation / maintenance
    const rupturesLow = filteredItems.filter((i) => {
      if (mode === 'finished_goods') return false;
      const stock = Number(i.stock_actuel) || 0;
      const history = i.history_records || [];
      const totalOut = history.reduce((s, h) => s + (Number(h.sortie) || 0), 0);
      const isRupture = stock <= 0 || i.health_status === 'RUPTURE';
      return isRupture && totalOut < 500;
    });

    // 3. Critiques (< 1 month)
    const critiques = filteredItems.filter((i) => Number(i.stock_actuel) > 0 && i.health_status === 'CRITIQUE');

    // 4. Stocks Bas (1-2 months)
    const bas = filteredItems.filter((i) => Number(i.stock_actuel) > 0 && i.health_status === 'BAS');

    // 5. Disponibles (> 2 months)
    const disponibles = filteredItems.filter((i) => Number(i.stock_actuel) > 0 && (i.health_status === 'DISPONIBLE' || !i.health_status));

    return { rupturesHigh, rupturesLow, critiques, bas, disponibles };
  }, [filteredItems, mode]);

  // Sorting Handler
  const handleSort = (field: keyof StockItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Upload MCBA File Handler
  const handleUploadMcbaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          alert('Le fichier Excel MCBA est vide ou non reconnu.');
          setIsUploading(false);
          return;
        }

        const res = await fetch('/api/stock/upload-mcba', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: rawRows,
            fileName: file.name,
          }),
        });

        if (res.ok) {
          const result = await res.json();
          setUploadResult({
            updatedCount: result.updatedCount,
            ignoredCount: result.ignoredCount,
            latestMonth: result.latestMonth,
            alerts: result.alerts || kpis,
          });
          await fetchStockSituation();
        } else {
          const errorData = await res.json().catch(() => ({}));
          alert(`Erreur lors de la mise à jour : ${errorData.error || res.statusText}`);
        }
      } catch (err: any) {
        console.error('Error uploading MCBA file:', err);
        alert('Erreur lors du traitement du fichier MCBA.');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      alert('Aucune donnée à exporter.');
      return;
    }

    const exportData = filteredItems.map((item) => ({
      'Code SAP': item.code_article,
      'Désignation': item.designation,
      'Catégorie': item.categorie || 'MP',
      'Magasin': item.magasin || '33',
      'Stock Actuel': item.stock_actuel,
      'Unité': item.unite || 'PCE',
      'Dernier Mois MCBA': item.latest_month || kpis.latestMonth,
      'Statut Santé': item.health_status || item.statut,
      'Diagnostic / Motif': item.alert_reason || '',
      'Couverture (Mois)': item.coverage_months !== undefined ? item.coverage_months : '',
      'Sorties Moy. / Mois': Math.round(item.avg_monthly_sortie || 0),
      'Conso Estimée / An': Math.round((item.avg_monthly_sortie || 0) * 12),
      'Point Commande (ROP)': item.point_reorder || '',
      'Stock Sécurité': item.stock_securite || '',
      'MB51 Total Entrées': item.mb51_total_entrees || 0,
      'MB51 Total Sorties': item.mb51_total_sorties || 0,
      'MB51 Flux Net': item.mb51_net_flow || 0,
      'Tendance Flux': item.mb51_trend === 'SORTIE_PLUS' ? 'Consommation dominante' : 'Approvisionnement dominant',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Situation Stock');
    XLSX.writeFile(wb, `Situation_Stock_${mode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Modern Badges
  const renderHealthBadge = (status?: string, reason?: string) => {
    const s = status || 'DISPONIBLE';
    if (s === 'RUPTURE') {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            RUPTURE
          </span>
          {reason && <span className="text-[10px] text-rose-600/90 font-medium truncate max-w-[200px]" title={reason}>{reason}</span>}
        </div>
      );
    }
    if (s === 'CRITIQUE') {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            CRITIQUE (&lt; 1 m)
          </span>
          {reason && <span className="text-[10px] text-amber-700/90 font-medium truncate max-w-[200px]" title={reason}>{reason}</span>}
        </div>
      );
    }
    if (s === 'BAS') {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-yellow-50 text-yellow-800 border border-yellow-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            STOCK BAS (&lt; 2 m)
          </span>
          {reason && <span className="text-[10px] text-yellow-700 font-medium truncate max-w-[200px]" title={reason}>{reason}</span>}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          DISPONIBLE
        </span>
        {reason && <span className="text-[10px] text-emerald-700 font-medium truncate max-w-[200px]" title={reason}>{reason}</span>}
      </div>
    );
  };

  const renderCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'MP':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">MP</span>;
      case 'PF':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">PF</span>;
      case 'PD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-violet-50 text-violet-700 border border-violet-200">PD</span>;
      case 'AUX':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">AUX</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">AUTRE</span>;
    }
  };

  // Reusable High-Precision Table Component
  const renderSectionTable = (items: StockItem[], emptyMsg: string, emptyIcon: React.ReactNode) => {
    if (items.length === 0) {
      return (
        <div className="py-10 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 my-1">
          <div className="flex flex-col items-center justify-center gap-2">
            {emptyIcon}
            <span className="text-xs font-semibold text-slate-600">{emptyMsg}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              <th className="py-3 px-3.5 w-[130px]">Code SAP</th>
              <th className="py-3 px-3.5 min-w-[280px]">Désignation Article</th>
              <th className="py-3 px-2 text-center w-[90px]">Cat. / Mag</th>
              <th className="py-3 px-3.5 text-right w-[130px]">Stock Actuel</th>
              <th className="py-3 px-3 text-right w-[110px]">Conso / An</th>
              <th className="py-3 px-3.5 text-center w-[120px]">Couverture</th>
              <th className="py-3 px-3.5 text-right w-[120px]">Point ROP</th>
              <th className="py-3 px-3.5 min-w-[200px]">Diagnostic & Santé</th>
              <th className="py-3 px-3 text-center w-[60px]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {items.map((item) => {
              const stockNum = Number(item.stock_actuel) || 0;
              const isZero = stockNum <= 0;
              const coverage = item.coverage_months;
              
              return (
                <tr
                  key={item.code_article}
                  onClick={() => setSelectedArticle(item)}
                  className="hover:bg-sky-50/60 transition-colors cursor-pointer group"
                >
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 group-hover:bg-white group-hover:border-sky-300 px-2 py-1 rounded text-xs border border-slate-200 shadow-2xs transition-colors">
                      {item.code_article}
                    </span>
                  </td>

                  <td className="py-2.5 px-3.5">
                    <div className="font-bold text-slate-900 line-clamp-1 group-hover:text-sky-700 transition-colors" title={item.designation}>
                      {item.designation}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="font-medium text-slate-500">{item.type_article || 'ROH'}</span>
                      <span>•</span>
                      <span>Unité: <strong className="text-slate-600">{item.unite || 'PCE'}</strong></span>
                      {item.emplacement && (
                        <>
                          <span>•</span>
                          <span>Empl: {item.emplacement}</span>
                        </>
                      )}
                    </div>
                  </td>

                  <td className="py-2.5 px-2 text-center whitespace-nowrap">
                    <div className="flex flex-col items-center gap-0.5">
                      {renderCategoryBadge(item.categorie as string)}
                      <span className="text-[10px] text-slate-500 font-semibold">Mag {item.magasin || '33'}</span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-mono">
                    <span className={`text-sm font-black ${isZero ? 'text-rose-600' : 'text-slate-900'}`}>
                      {stockNum.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold ml-1">{item.unite || 'PCE'}</span>
                  </td>

                  <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                    <span className="font-semibold text-slate-700">
                      {Math.round((item.avg_monthly_sortie || 0) * 12).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">{item.unite || 'PCE'}</span>
                  </td>

                  <td className="py-2.5 px-3.5 text-center whitespace-nowrap font-mono">
                    {coverage !== undefined ? (
                      coverage > 99 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          &gt; 24 m
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black ${
                          coverage <= 0
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : coverage < 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : coverage < 2
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {coverage.toFixed(1)} m
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-mono">
                    <span className="bg-indigo-50 border border-indigo-100/80 text-indigo-800 font-bold px-2 py-0.5 rounded text-xs">
                      {item.point_reorder !== undefined ? Number(item.point_reorder).toLocaleString() : '-'}
                    </span>
                  </td>

                  <td className="py-2.5 px-3.5">
                    {renderHealthBadge(item.health_status || item.statut, item.alert_reason)}
                  </td>

                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={(e) => handleToggleTracking(item, e)}
                        disabled={togglingId === item.code_article}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-40"
                        title="Retirer du suivi (déplacer vers l'onglet Hors Suivi)"
                      >
                        <EyeOff size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArticle(item);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 group-hover:text-sky-600 group-hover:bg-sky-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                        title="Ouvrir la fiche d'analyse complète"
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Dedicated Single Table View for Purchased Articles (Tabs instead of multiple sections)
  const renderPurchasedActiveTable = () => {
    const currentTabName = 
      activeTabFilter === 'ALL' ? 'Tous les Articles Achetés' :
      activeTabFilter === 'RUPTURE' ? 'Articles en Rupture (Stock = 0)' :
      activeTabFilter === 'CRITIQUE' ? 'Articles en Situation Critique (< 1 mois)' :
      activeTabFilter === 'BAS' ? 'Articles en Stock Bas (Sous Point ROP)' :
      'Articles Disponibles & Conformes (> 2 mois)';

    if (filteredItems.length === 0) {
      return (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="flex flex-col items-center justify-center gap-2.5 max-w-md mx-auto">
            <PackageX size={32} className="text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700">Aucun article dans cette vue</h4>
            <p className="text-xs text-slate-500">
              {searchQuery
                ? `Aucun article ne correspond à votre recherche "${searchQuery}".`
                : `Aucun article acheté ne se trouve actuellement sous l'onglet "${currentTabName}".`}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
              {currentTabName}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-600 text-white shadow-2xs">
              {filteredItems.length} article{filteredItems.length > 1 ? 's' : ''}
            </span>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              (Triés par fréquence décroissante d'apparition dans MB51)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
            <Info size={13} className="text-slate-400" />
            <span>Cliquez sur l'entête d'une colonne pour modifier le tri</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider select-none">
                <th onClick={() => handleSort('code_article')} className="py-3 px-3.5 w-[125px] cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Code SAP</span>
                    {sortField === 'code_article' && (sortDirection === 'desc' ? <ArrowDown size={11} className="text-sky-600" /> : <ArrowUp size={11} className="text-sky-600" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('designation')} className="py-3 px-3.5 min-w-[280px] cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Désignation Article</span>
                    {sortField === 'designation' && (sortDirection === 'desc' ? <ArrowDown size={11} className="text-sky-600" /> : <ArrowUp size={11} className="text-sky-600" />)}
                  </div>
                </th>
                <th className="py-3 px-2 text-center w-[90px]">Cat. / Mag</th>
                <th 
                  onClick={() => handleSort('mb51_frequency')} 
                  className={`py-3 px-3 text-center w-[135px] cursor-pointer hover:bg-sky-100/60 transition-colors ${
                    sortField === 'mb51_frequency' ? 'bg-sky-100/50 text-sky-900 font-extrabold' : 'text-slate-600'
                  }`}
                  title="Nombre d'apparitions et de mouvements dans les données SAP MB51 (cliquer pour trier)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <Activity size={12} className={sortField === 'mb51_frequency' ? 'text-sky-700' : 'text-slate-400'} />
                    <span>Fréq. MB51</span>
                    {sortField === 'mb51_frequency' && (
                      sortDirection === 'desc' ? <ArrowDown size={12} className="text-sky-700 font-black" /> : <ArrowUp size={12} className="text-sky-700 font-black" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('stock_actuel')} className="py-3 px-3.5 text-right w-[125px] cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-end gap-1">
                    <span>Stock Actuel</span>
                    {sortField === 'stock_actuel' && (sortDirection === 'desc' ? <ArrowDown size={11} className="text-sky-600" /> : <ArrowUp size={11} className="text-sky-600" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('avg_monthly_sortie')} className="py-3 px-3 text-right w-[110px] cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-end gap-1">
                    <span>Conso / An</span>
                    {sortField === 'avg_monthly_sortie' && (sortDirection === 'desc' ? <ArrowDown size={11} className="text-sky-600" /> : <ArrowUp size={11} className="text-sky-600" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('coverage_months')} className="py-3 px-3.5 text-center w-[115px] cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span>Couverture</span>
                    {sortField === 'coverage_months' && (sortDirection === 'desc' ? <ArrowDown size={11} className="text-sky-600" /> : <ArrowUp size={11} className="text-sky-600" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('point_reorder')} className="py-3 px-3.5 text-right w-[115px] cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-end gap-1">
                    <span>Point ROP</span>
                    {sortField === 'point_reorder' && (sortDirection === 'desc' ? <ArrowDown size={11} className="text-sky-600" /> : <ArrowUp size={11} className="text-sky-600" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('health_status')} className="py-3 px-3.5 min-w-[195px] cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Diagnostic & Santé</span>
                    {sortField === 'health_status' && (sortDirection === 'desc' ? <ArrowDown size={11} className="text-sky-600" /> : <ArrowUp size={11} className="text-sky-600" />)}
                  </div>
                </th>
                <th className="py-3 px-3 text-center w-[75px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.map((item) => {
                const stockNum = Number(item.stock_actuel) || 0;
                const isZero = stockNum <= 0;
                const coverage = item.coverage_months;
                const freq = Number(item.mb51_frequency) || Number(item.mb51_purchased_count) || 0;

                return (
                  <tr
                    key={item.code_article}
                    onClick={() => setSelectedArticle(item)}
                    className="hover:bg-sky-50/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 group-hover:bg-white group-hover:border-sky-300 px-2 py-1 rounded text-xs border border-slate-200 shadow-2xs transition-colors">
                        {item.code_article}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-slate-900 line-clamp-1 group-hover:text-sky-700 transition-colors" title={item.designation}>
                        {item.designation}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-slate-500">{item.type_article || 'ROH'}</span>
                        <span>•</span>
                        <span>Unité: <strong className="text-slate-600">{item.unite || 'PCE'}</strong></span>
                        {item.emplacement && (
                          <>
                            <span>•</span>
                            <span>Empl: {item.emplacement}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-0.5">
                        {renderCategoryBadge(item.categorie as string)}
                        <span className="text-[10px] text-slate-500 font-semibold">Mag {item.magasin || '33'}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap bg-sky-50/30">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1 shadow-2xs">
                          <Activity size={11} className="text-sky-600" />
                          <span>{freq}</span>
                          <span className="text-[10px] text-sky-600 font-semibold">mvts</span>
                        </span>
                        {item.mb51_purchased_count !== undefined && item.mb51_purchased_count > 0 && (
                          <span className="text-[9px] text-slate-500 font-medium mt-0.5">
                            {item.mb51_purchased_count} réceptions 103/105
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-mono">
                      <span className={`text-sm font-black ${isZero ? 'text-rose-600' : 'text-slate-900'}`}>
                        {stockNum.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold ml-1">{item.unite || 'PCE'}</span>
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                      <span className="font-semibold text-slate-700">
                        {Math.round((item.avg_monthly_sortie || 0) * 12).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">{item.unite || 'PCE'}</span>
                    </td>

                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap font-mono">
                      {coverage !== undefined ? (
                        coverage > 99 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            &gt; 24 m
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black ${
                            coverage <= 0
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : coverage < 1
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : coverage < 2
                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {coverage.toFixed(1)} m
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-mono">
                      <span className="bg-indigo-50 border border-indigo-100/80 text-indigo-800 font-bold px-2 py-0.5 rounded text-xs">
                        {item.point_reorder !== undefined ? Number(item.point_reorder).toLocaleString() : '-'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5">
                      {renderHealthBadge(item.health_status || item.statut, item.alert_reason)}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={(e) => handleToggleTracking(item, e)}
                          disabled={togglingId === item.code_article}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-40"
                          title="Masquer cet article (déplacer vers l'onglet Articles Masqués)"
                        >
                          <EyeOff size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedArticle(item);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 group-hover:text-sky-600 group-hover:bg-sky-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Ouvrir la fiche d'analyse complète"
                        >
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Dedicated Table View for Hidden Purchased Articles (with Restore Action)
  const renderHiddenItemsTable = () => {
    if (filteredHiddenItems.length === 0) {
      return (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
            <Eye size={32} className="text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700">Aucun article masqué</h4>
            <p className="text-xs text-slate-500">
              {searchQuery
                ? `Aucun article masqué ne correspond à "${searchQuery}".`
                : "Tous les articles achetés sont actuellement actifs dans le suivi. Pour masquer un article, cliquez sur l'icône œil barré dans l'un des onglets actifs."}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-slate-100 via-slate-50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-800 text-white rounded-xl shadow-xs">
              <EyeOff size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Articles Masqués / Retirés du Suivi
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-700 text-white shadow-2xs">
                  {filteredHiddenItems.length} article{filteredHiddenItems.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ces articles ont été masqués et n'apparaissent plus dans les onglets de suivi actif. Vous pouvez les réintégrer à tout moment en cliquant sur "Restaurer".
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider select-none">
                <th onClick={() => handleSort('code_article')} className="py-3 px-3.5 w-[130px] cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Code SAP</span>
                    {sortField === 'code_article' && (sortDirection === 'desc' ? <ArrowDown size={11} className="text-sky-600" /> : <ArrowUp size={11} className="text-sky-600" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('designation')} className="py-3 px-3.5 min-w-[280px] cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Désignation Article</span>
                    {sortField === 'designation' && (sortDirection === 'desc' ? <ArrowDown size={11} className="text-sky-600" /> : <ArrowUp size={11} className="text-sky-600" />)}
                  </div>
                </th>
                <th className="py-3 px-2 text-center w-[90px]">Cat. / Mag</th>
                <th 
                  onClick={() => handleSort('mb51_frequency')} 
                  className="py-3 px-3 text-center w-[130px] cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <Activity size={12} className="text-sky-600" />
                    <span>Fréq. MB51</span>
                    {sortField === 'mb51_frequency' && (sortDirection === 'desc' ? <ArrowDown size={12} className="text-sky-600" /> : <ArrowUp size={12} className="text-sky-600" />)}
                  </div>
                </th>
                <th onClick={() => handleSort('stock_actuel')} className="py-3 px-3.5 text-right w-[120px] cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-end gap-1">
                    <span>Stock Actuel</span>
                    {sortField === 'stock_actuel' && (sortDirection === 'desc' ? <ArrowDown size={11} className="text-sky-600" /> : <ArrowUp size={11} className="text-sky-600" />)}
                  </div>
                </th>
                <th className="py-3 px-3 text-right w-[110px]">Conso / An</th>
                <th className="py-3 px-3.5 min-w-[190px]">Dernier Diagnostic</th>
                <th className="py-3 px-4 text-center w-[140px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredHiddenItems.map((item) => {
                const stockNum = Number(item.stock_actuel) || 0;
                const freq = Number(item.mb51_frequency) || Number(item.mb51_purchased_count) || 0;

                return (
                  <tr
                    key={item.code_article}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">
                        {item.code_article}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-slate-700 line-clamp-1" title={item.designation}>
                        {item.designation}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.type_article || 'ROH'} • Unité: {item.unite || 'PCE'}
                      </div>
                    </td>

                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-0.5">
                        {renderCategoryBadge(item.categorie as string)}
                        <span className="text-[10px] text-slate-500 font-semibold">Mag {item.magasin || '33'}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {freq} mvts
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-mono font-bold text-slate-700">
                      {stockNum.toLocaleString()} {item.unite || 'PCE'}
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-slate-500">
                      {Math.round((item.avg_monthly_sortie || 0) * 12).toLocaleString()}
                    </td>

                    <td className="py-2.5 px-3.5">
                      {renderHealthBadge(item.health_status || item.statut, item.alert_reason)}
                    </td>

                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => handleToggleTracking(item, e)}
                        disabled={togglingId === item.code_article}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        title="Restaurer cet article dans le suivi actif"
                      >
                        <Eye size={13} />
                        <span>Restaurer</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-none space-y-4">
      {/* HIDDEN FILE INPUT FOR MCBA UPLOAD */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadMcbaFile}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* PRO MAX HERO HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-700/60">
        {/* Subtle background glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/3 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-black bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
                <Sparkles size={12} className="text-sky-400" />
                {mode === 'finished_goods'
                  ? 'Produits Finis (PF)'
                  : mode === 'purchased'
                    ? 'Pièces Achetées (Mvt 103 / 105)'
                    : 'Matières Premières & Pièces (MP / PD)'}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5 shadow-2xs">
                <Calendar size={12} />
                Dernier Mois MCBA : <strong className="text-white font-bold">{kpis.latestMonth}</strong>
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 flex items-center gap-1.5 shadow-2xs">
                <Activity size={12} />
                Historique MB51 : 2 ans
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Boxes className="text-sky-400 shrink-0" size={30} />
              <span>
                {mode === 'finished_goods'
                  ? 'Situation des Stocks — Produits Finis'
                  : mode === 'purchased'
                    ? 'Situation des Stocks — Pièces Achetées (Fournisseurs)'
                    : 'Situation des Stocks — Matières Premières & Composants'}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {mode === 'purchased' ? (
                <>
                  Articles approvisionnés auprès de fournisseurs externes identifiés par les codes mouvement SAP <strong>103 (Réception bloquée)</strong> &amp; <strong>105 (Libération stock)</strong> (annulations 104 / 106).
                </>
              ) : (
                <>
                  Suivi dynamique synchronisé avec <strong>SAP (MB51 &amp; MCBA)</strong>. Diagnostic temps-réel de couverture, seuils de sécurité (ROP) et détection automatique des risques de rupture de chaîne.
                </>
              )}
            </p>
          </div>

          {/* ACTION BUTTONS (PRO CLUSTER) */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Importer le fichier mcba.xlsx : actualise automatiquement le stock le plus récent"
            >
              {isUploading ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Upload size={15} />
              )}
              <span>{isUploading ? 'Traitement MCBA...' : 'Importer MCBA'}</span>
            </button>

            <button
              onClick={fetchStockSituation}
              className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Recharger la situation"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Exporter la sélection en Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Export Excel</span>
            </button>

            {onNavigateToAppro && (
              <button
                onClick={onNavigateToAppro}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Aller vers la Situation Approvisionnements (MRP)"
              >
                <span>Calcul MRP</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* UPLOAD RESULT NOTIFICATION */}
      {uploadResult && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3 text-emerald-900 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold">Import MCBA Réussi avec Remplacement Automatique</h4>
              <p className="text-xs text-emerald-800">
                <strong>{uploadResult.updatedCount} articles MB51</strong> mis à jour sur le mois le plus récent (<strong>{uploadResult.latestMonth}</strong>). 
                {uploadResult.ignoredCount > 0 && <span> ({uploadResult.ignoredCount} entrées hors liste MB51 ignorées).</span>}
                {' '}Actuellement : <span className="font-bold text-rose-700">{uploadResult.alerts.ruptures} ruptures</span> et <span className="font-bold text-amber-700">{uploadResult.alerts.critiques} critiques</span>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setUploadResult(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* FEEDBACK TOAST NOTIFICATION (HIDE / RESTORE ACTION) */}
      {feedbackToast && (
        <div className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in slide-in-from-top duration-200 ${
          feedbackToast.type === 'hide'
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : 'bg-emerald-50 border-emerald-300 text-emerald-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedbackToast.type === 'hide' ? (
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-2xs">
                <EyeOff size={16} />
              </div>
            ) : (
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs">
                <Eye size={16} />
              </div>
            )}
            <span className="text-sm">{feedbackToast.message}</span>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="p-1.5 hover:bg-black/5 rounded-lg text-slate-500 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* TOP-LEVEL VIEW SWITCHER: PRODUCTION TRACKING vs SELLING CODES (78...) (ONLY FOR COMPONENTS / FINISHED GOODS) */}
      {mode !== 'purchased' && (
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs inline-flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setViewTab('TRACKED')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              viewTab === 'TRACKED'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Boxes size={15} className={viewTab === 'TRACKED' ? 'text-sky-400' : 'text-slate-500'} />
            <span>Suivi Production (Actifs)</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              viewTab === 'TRACKED' ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {activeTrackedItems.length}
            </span>
          </button>

          <button
            onClick={() => setViewTab('SELLING_CODES')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              viewTab === 'SELLING_CODES'
                ? 'bg-violet-950 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Tag size={15} className={viewTab === 'SELLING_CODES' ? 'text-violet-300' : 'text-violet-600'} />
            <span>Codes Vente (78...) / Hors Suivi</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              viewTab === 'SELLING_CODES' ? 'bg-violet-500/30 text-violet-200' : 'bg-violet-100 text-violet-700'
            }`}>
              {untrackedItems.length}
            </span>
          </button>
        </div>
      )}

      {viewTab === 'TRACKED' ? (
        <>
      {/* PRO MAX KPI CARDS WITH PROGRESS & INTERACTIVE TABS */}
      <div className={`grid grid-cols-2 ${mode === 'purchased' ? 'sm:grid-cols-3 lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3`}>
        {/* TOTAL ARTICLE / SANTE GLOBALE */}
        <div 
          onClick={() => setActiveTabFilter('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTabFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-sky-500/50'
              : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-black uppercase tracking-wider ${activeTabFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
              Articles Actifs
            </span>
            <div className={`p-2 rounded-xl ${activeTabFilter === 'ALL' ? 'bg-white/10 text-sky-400' : 'bg-slate-100 text-slate-700'}`}>
              <Boxes size={18} />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-2 font-mono ${activeTabFilter === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
            {activeTrackedItems.length}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className={activeTabFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}>Taux Disponibilité :</span>
            <span className="font-bold text-emerald-500 font-mono">{kpis.healthRate}%</span>
          </div>
        </div>

        {/* RUPTURES */}
        <div 
          onClick={() => {
            setActiveTabFilter(activeTabFilter === 'RUPTURE' ? 'ALL' : 'RUPTURE');
            if (mode !== 'purchased') toggleSection('ruptures');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTabFilter === 'RUPTURE'
              ? 'bg-rose-950 text-white border-rose-800 shadow-md ring-2 ring-rose-500/50'
              : 'bg-rose-50/70 hover:bg-rose-100/60 border-rose-200/90 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
              activeTabFilter === 'RUPTURE' ? 'text-rose-200' : 'text-rose-700'
            }`}>
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
              Ruptures
            </span>
            <div className={`p-2 rounded-xl ${activeTabFilter === 'RUPTURE' ? 'bg-rose-900 text-rose-200' : 'bg-rose-100 text-rose-700'}`}>
              <PackageX size={18} />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-2 font-mono ${
            activeTabFilter === 'RUPTURE' ? 'text-white' : 'text-rose-700'
          }`}>
            {groupedSections.rupturesHigh.length + groupedSections.rupturesLow.length}
          </div>
          <div className={`mt-2 text-[11px] font-medium ${
            activeTabFilter === 'RUPTURE' ? 'text-rose-200' : 'text-rose-600'
          }`}>
            Stock physique nul (0)
          </div>
        </div>

        {/* CRITIQUES */}
        <div 
          onClick={() => {
            setActiveTabFilter(activeTabFilter === 'CRITIQUE' ? 'ALL' : 'CRITIQUE');
            if (mode !== 'purchased') toggleSection('critiques');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTabFilter === 'CRITIQUE'
              ? 'bg-amber-950 text-white border-amber-800 shadow-md ring-2 ring-amber-500/50'
              : 'bg-amber-50/70 hover:bg-amber-100/60 border-amber-200/90 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
              activeTabFilter === 'CRITIQUE' ? 'text-amber-200' : 'text-amber-800'
            }`}>
              <Clock size={12} />
              Critiques
            </span>
            <div className={`p-2 rounded-xl ${activeTabFilter === 'CRITIQUE' ? 'bg-amber-900 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-2 font-mono ${
            activeTabFilter === 'CRITIQUE' ? 'text-white' : 'text-amber-800'
          }`}>
            {groupedSections.critiques.length}
          </div>
          <div className={`mt-2 text-[11px] font-medium ${
            activeTabFilter === 'CRITIQUE' ? 'text-amber-200' : 'text-amber-700'
          }`}>
            &lt; 1 mois de couverture
          </div>
        </div>

        {/* STOCKS BAS */}
        <div 
          onClick={() => {
            setActiveTabFilter(activeTabFilter === 'BAS' ? 'ALL' : 'BAS');
            if (mode !== 'purchased') toggleSection('bas');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTabFilter === 'BAS'
              ? 'bg-yellow-950 text-white border-yellow-800 shadow-md ring-2 ring-yellow-500/50'
              : 'bg-yellow-50/70 hover:bg-yellow-100/60 border-yellow-200/90 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
              activeTabFilter === 'BAS' ? 'text-yellow-200' : 'text-yellow-800'
            }`}>
              <TrendingDown size={12} />
              Stocks Bas
            </span>
            <div className={`p-2 rounded-xl ${activeTabFilter === 'BAS' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'}`}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-2 font-mono ${
            activeTabFilter === 'BAS' ? 'text-white' : 'text-yellow-800'
          }`}>
            {groupedSections.bas.length}
          </div>
          <div className={`mt-2 text-[11px] font-medium ${
            activeTabFilter === 'BAS' ? 'text-yellow-200' : 'text-yellow-700'
          }`}>
            1 à 2 mois (sous ROP)
          </div>
        </div>

        {/* DISPONIBLES */}
        <div 
          onClick={() => {
            setActiveTabFilter(activeTabFilter === 'DISPONIBLE' ? 'ALL' : 'DISPONIBLE');
            if (mode !== 'purchased') toggleSection('disponibles');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTabFilter === 'DISPONIBLE'
              ? 'bg-emerald-950 text-white border-emerald-800 shadow-md ring-2 ring-emerald-500/50'
              : 'bg-emerald-50/70 hover:bg-emerald-100/60 border-emerald-200/90 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
              activeTabFilter === 'DISPONIBLE' ? 'text-emerald-200' : 'text-emerald-800'
            }`}>
              <CheckCircle2 size={12} />
              Disponibles
            </span>
            <div className={`p-2 rounded-xl ${activeTabFilter === 'DISPONIBLE' ? 'bg-emerald-900 text-emerald-200' : 'bg-emerald-100 text-emerald-800'}`}>
              <PackageCheck size={18} />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-2 font-mono ${
            activeTabFilter === 'DISPONIBLE' ? 'text-white' : 'text-emerald-700'
          }`}>
            {groupedSections.disponibles.length}
          </div>
          <div className={`mt-2 text-[11px] font-medium ${
            activeTabFilter === 'DISPONIBLE' ? 'text-emerald-200' : 'text-emerald-700'
          }`}>
            &gt; 2 mois de couverture
          </div>
        </div>

        {/* CARD 6 FOR PURCHASED: ARTICLES MASQUÉS */}
        {mode === 'purchased' && (
          <div 
            onClick={() => setActiveTabFilter(activeTabFilter === 'HIDDEN' ? 'ALL' : 'HIDDEN')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              activeTabFilter === 'HIDDEN'
                ? 'bg-slate-800 text-white border-slate-700 shadow-md ring-2 ring-amber-400/50'
                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                activeTabFilter === 'HIDDEN' ? 'text-amber-300' : 'text-slate-600'
              }`}>
                <EyeOff size={13} />
                Articles Masqués
              </span>
              <div className={`p-2 rounded-xl ${activeTabFilter === 'HIDDEN' ? 'bg-slate-700 text-amber-300' : 'bg-slate-200 text-slate-700'}`}>
                <EyeOff size={16} />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-black mt-2 font-mono ${
              activeTabFilter === 'HIDDEN' ? 'text-white' : 'text-slate-800'
            }`}>
              {untrackedItems.length}
            </div>
            <div className={`mt-2 text-[11px] font-medium ${
              activeTabFilter === 'HIDDEN' ? 'text-amber-300' : 'text-slate-500'
            }`}>
              Restaurables à tout moment
            </div>
          </div>
        )}
      </div>

      {/* TABS NAVIGATION BAR FOR PURCHASED PARTS */}
      {mode === 'purchased' && (
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTabFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTabFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Boxes size={15} />
            <span>Tous les Articles</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTabFilter === 'ALL' ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {activeTrackedItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabFilter('RUPTURE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTabFilter === 'RUPTURE'
                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/20'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            <span>Ruptures</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTabFilter === 'RUPTURE' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-700'
            }`}>
              {groupedSections.rupturesHigh.length + groupedSections.rupturesLow.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabFilter('CRITIQUE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTabFilter === 'CRITIQUE'
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/20'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Clock size={14} />
            <span>Critiques</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTabFilter === 'CRITIQUE' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              {groupedSections.critiques.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabFilter('BAS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTabFilter === 'BAS'
                ? 'bg-yellow-600 text-white shadow-sm ring-2 ring-yellow-600/20'
                : 'text-yellow-800 hover:bg-yellow-50'
            }`}
          >
            <TrendingDown size={14} />
            <span>Stocks Bas</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTabFilter === 'BAS' ? 'bg-yellow-800 text-white' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {groupedSections.bas.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabFilter('DISPONIBLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTabFilter === 'DISPONIBLE'
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Disponibles</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTabFilter === 'DISPONIBLE' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {groupedSections.disponibles.length}
            </span>
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <button
            onClick={() => setActiveTabFilter('HIDDEN')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ml-auto ${
              activeTabFilter === 'HIDDEN'
                ? 'bg-slate-800 text-white shadow-sm ring-2 ring-slate-800/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Articles masqués du suivi (cliquer pour consulter ou restaurer)"
          >
            <EyeOff size={15} className={activeTabFilter === 'HIDDEN' ? 'text-amber-400' : 'text-slate-400'} />
            <span>Articles Masqués</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTabFilter === 'HIDDEN' ? 'bg-slate-700 text-amber-300' : 'bg-slate-100 text-slate-700'
            }`}>
              {untrackedItems.length}
            </span>
          </button>
        </div>
      )}

      {/* CONTROL & FILTER BAR (UI/UX PRO MAX) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Recherche instantanée : Code SAP, Désignation, Magasin, Motif..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap text-xs">
          {(mode === 'components' || mode === 'purchased') && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <span className="text-slate-500 font-semibold text-[11px]">Type:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Toutes catégories</option>
                <option value="MP">MP - Matières Premières</option>
                <option value="PD">PD - Pièces Détachées</option>
                <option value="AUX">AUX - Matériel Auxiliaire</option>
                {mode === 'purchased' && <option value="PF">PF - Produits Finis</option>}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <span className="text-slate-500 font-semibold text-[11px]">Flux MB51:</span>
            <select
              value={selectedTrend}
              onChange={(e) => setSelectedTrend(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tous les flux</option>
              <option value="SORTIE_PLUS">Sorties &gt; Entrées (Conso active)</option>
              <option value="ENTREE_PLUS">Entrées &gt; Sorties</option>
            </select>
          </div>

          {magasinsList.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <span className="text-slate-500 font-semibold text-[11px]">Magasin:</span>
              <select
                value={selectedMagasin}
                onChange={(e) => setSelectedMagasin(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tous</option>
                {magasinsList.map((m) => (
                  <option key={m} value={m}>Mag {m}</option>
                ))}
              </select>
            </div>
          )}

          <div className="px-3 py-1.5 bg-slate-100 rounded-xl text-slate-600 font-bold text-xs">
            {activeTabFilter === 'HIDDEN' ? filteredHiddenItems.length : filteredItems.length} article{(activeTabFilter === 'HIDDEN' ? filteredHiddenItems.length : filteredItems.length) > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* RENDER BY TAB FOR PURCHASED PARTS vs ACCORDION SECTIONS FOR COMPONENTS / FINISHED GOODS */}
      {mode === 'purchased' ? (
        <div className="space-y-4">
          {activeTabFilter === 'HIDDEN' ? renderHiddenItemsTable() : renderPurchasedActiveTable()}
        </div>
      ) : (
        <>
      {/* =========================================================================
          SECTION 1 : VRAIES RUPTURES DE SÉRIE (IMPACT DIRECT SUR LA PRODUCTION)
          ========================================================================= */}
      {(activeTabFilter === 'ALL' || activeTabFilter === 'RUPTURE') && (
        <section className="bg-white rounded-2xl border border-rose-200/90 shadow-sm overflow-hidden">
          <div 
            onClick={() => toggleSection('ruptures')}
            className="p-4 bg-gradient-to-r from-rose-50/90 via-rose-50/40 to-white border-b border-rose-100 flex items-center justify-between cursor-pointer hover:bg-rose-100/50 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-rose-950 uppercase tracking-wide">
                    {mode === 'finished_goods' 
                      ? 'Section 1 : Ruptures Produits Finis (Stock Physique = 0)' 
                      : 'Section 1 : Vraies Ruptures de Série — Blocage Lignes (> 500 à 450 000 / an)'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-2xs">
                    {groupedSections.rupturesHigh.length} article{groupedSections.rupturesHigh.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-rose-700/90 mt-0.5">
                  {mode === 'finished_goods' 
                    ? 'Compteurs et appareils avec stock physique nul dans MCBA (production à la commande ou expédiée).' 
                    : 'Composants indispensables à forte rotation en rupture physique : risque immédiat d\'arrêt machine.'}
                </p>
              </div>
            </div>
            <button className="text-rose-600 p-1.5 hover:bg-rose-200/60 rounded-xl transition-colors">
              {openSections.ruptures ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          {openSections.ruptures && (
            <div className="p-4">
              {renderSectionTable(
                groupedSections.rupturesHigh, 
                "Aucun article en rupture critique selon les filtres sélectionnés.",
                <CheckCircle2 size={26} className="text-emerald-500" />
              )}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          SECTION 1-BIS : BESOINS PONCTUELS & FAIBLE VOLUME (< 500 / AN OU MAINTENANCE)
          ========================================================================= */}
      {mode === 'components' && (activeTabFilter === 'ALL' || activeTabFilter === 'RUPTURE') && groupedSections.rupturesLow.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div 
            onClick={() => toggleSection('rupturesLow')}
            className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-slate-600 text-white rounded-xl shadow-xs">
                <Info size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                    Section 1-B : Besoins Ponctuels & Maintenance à Stock 0 (&lt; 500 unités/an ou 25 kg)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                    {groupedSections.rupturesLow.length} article{groupedSections.rupturesLow.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Articles à faible rotation, consommables d'atelier ou pièces de rechange (n'arrêtent pas directement la fabrication de compteurs).
                </p>
              </div>
            </div>
            <button className="text-slate-500 p-1.5 hover:bg-slate-200/60 rounded-xl transition-colors">
              {openSections.rupturesLow ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          {openSections.rupturesLow && (
            <div className="p-4">
              {renderSectionTable(
                groupedSections.rupturesLow, 
                "Aucun article ponctuel à stock 0.",
                <Boxes size={26} className="text-slate-400" />
              )}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          SECTION 2 : STOCKS CRITIQUES (< 1 MOIS OU SOUS POINT DE RUPTURE)
          ========================================================================= */}
      {(activeTabFilter === 'ALL' || activeTabFilter === 'CRITIQUE') && (
        <section className="bg-white rounded-2xl border border-amber-200/90 shadow-sm overflow-hidden">
          <div 
            onClick={() => toggleSection('critiques')}
            className="p-4 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-white border-b border-amber-100 flex items-center justify-between cursor-pointer hover:bg-amber-100/50 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs">
                <Clock size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                    Section 2 : Alertes Critiques (&lt; 1 Mois de Couverture)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-600 text-white shadow-2xs">
                    {groupedSections.critiques.length} article{groupedSections.critiques.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 mt-0.5">
                  Articles dont le stock actuel est inférieur au délai standard de réapprovisionnement : commande prioritaire requise.
                </p>
              </div>
            </div>
            <button className="text-amber-600 p-1.5 hover:bg-amber-200/60 rounded-xl transition-colors">
              {openSections.critiques ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          {openSections.critiques && (
            <div className="p-4">
              {renderSectionTable(
                groupedSections.critiques, 
                "Aucun article en situation critique selon les filtres sélectionnés.",
                <CheckCircle2 size={26} className="text-emerald-500" />
              )}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          SECTION 3 : STOCKS BAS (1 À 2 MOIS / SOUS POINT DE COMMANDE)
          ========================================================================= */}
      {(activeTabFilter === 'ALL' || activeTabFilter === 'BAS') && (
        <section className="bg-white rounded-2xl border border-yellow-200/90 shadow-sm overflow-hidden">
          <div 
            onClick={() => toggleSection('bas')}
            className="p-4 bg-gradient-to-r from-yellow-50/90 via-yellow-50/40 to-white border-b border-yellow-100 flex items-center justify-between cursor-pointer hover:bg-yellow-100/50 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-yellow-600 text-white rounded-xl shadow-xs">
                <TrendingDown size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-yellow-950 uppercase tracking-wide">
                    Section 3 : Stocks Bas (1 à 2 Mois de Couverture — Sous Seuil ROP)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-yellow-600 text-white shadow-2xs">
                    {groupedSections.bas.length} article{groupedSections.bas.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-yellow-800/90 mt-0.5">
                  Articles ayant franchi le point de commande (ROP) : à inclure dans les prochains bons de commande ou consultations.
                </p>
              </div>
            </div>
            <button className="text-yellow-600 p-1.5 hover:bg-yellow-200/60 rounded-xl transition-colors">
              {openSections.bas ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          {openSections.bas && (
            <div className="p-4">
              {renderSectionTable(
                groupedSections.bas, 
                "Aucun article en stock bas selon les filtres.",
                <CheckCircle2 size={26} className="text-emerald-500" />
              )}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          SECTION 4 : STOCKS DISPONIBLES ET CONFORMES (> 2 MOIS)
          ========================================================================= */}
      {(activeTabFilter === 'ALL' || activeTabFilter === 'DISPONIBLE') && (
        <section className="bg-white rounded-2xl border border-emerald-200/90 shadow-sm overflow-hidden">
          <div 
            onClick={() => toggleSection('disponibles')}
            className="p-4 bg-gradient-to-r from-emerald-50/90 via-emerald-50/40 to-white border-b border-emerald-100 flex items-center justify-between cursor-pointer hover:bg-emerald-100/50 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                    Section 4 : Stocks Sains & Couverture Conforme (&gt; 2 Mois)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-700 text-white shadow-2xs">
                    {groupedSections.disponibles.length} article{groupedSections.disponibles.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-emerald-800/90 mt-0.5">
                  Articles sécurisés avec stock au-dessus du stock de sécurité et du point de commande. Cliquez pour dérouler ou masquer.
                </p>
              </div>
            </div>
            <button className="text-emerald-600 p-1.5 hover:bg-emerald-200/60 rounded-xl transition-colors">
              {openSections.disponibles ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          {openSections.disponibles && (
            <div className="p-4">
              {renderSectionTable(
                groupedSections.disponibles, 
                "Aucun article disponible selon les filtres.",
                <Boxes size={26} className="text-slate-400" />
              )}
            </div>
          )}
        </section>
      )}
        </>
      )}
        </>
      ) : (
        /* =========================================================================
           DEDICATED TAB: CODES VENTE (78...) & ARTICLES HORS SUIVI PRODUCTION
           ========================================================================= */
        <div className="space-y-4">
          {/* Context Banner */}
          <div className="bg-gradient-to-r from-violet-50 via-indigo-50/60 to-white border border-violet-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-violet-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                <Tag size={20} />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm sm:text-base font-black text-violet-950 flex items-center gap-2 flex-wrap">
                  <span>Codes Vente (78...) & Articles Retirés du Suivi Production</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-violet-600 text-white">
                    {untrackedItems.length} article{untrackedItems.length > 1 ? 's' : ''}
                  </span>
                </h2>
                <p className="text-xs text-violet-900/80 max-w-3xl leading-relaxed">
                  Ces articles commencent généralement par <strong>78...</strong> (codes commerciaux utilisés pour les ventes occasionnelles par transfert depuis le code production <strong>010...</strong>). Ils sont exclus des indicateurs de rupture pour ne pas fausser le suivi production. Vous pouvez les vérifier un par un ci-dessous et, si nécessaire, réactiver le suivi pour un article spécifique.
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar for Untracked / 78... */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={sellingSearch}
                onChange={(e) => setSellingSearch(e.target.value)}
                placeholder="Vérifier un code 78... ou une désignation..."
                className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium transition-colors"
              />
              {sellingSearch && (
                <button
                  onClick={() => setSellingSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                <span className="text-slate-500 font-semibold text-[11px]">Stock:</span>
                <select
                  value={sellingStockFilter}
                  onChange={(e) => setSellingStockFilter(e.target.value as 'ALL' | 'IN_STOCK' | 'ZERO')}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tous ({untrackedItems.length})</option>
                  <option value="IN_STOCK">Avec Stock &gt; 0</option>
                  <option value="ZERO">À Stock 0</option>
                </select>
              </div>

              <div className="px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-xl text-violet-800 font-bold text-xs">
                {filteredUntrackedItems.length} affiché{filteredUntrackedItems.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Dedicated Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredUntrackedItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Tag size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Aucun article hors suivi trouvé pour ces critères.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[920px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-3 px-4 w-[130px]">Code Vente</th>
                      <th className="py-3 px-4 min-w-[260px]">Désignation Article</th>
                      <th className="py-3 px-3 text-center w-[80px]">Cat.</th>
                      <th className="py-3 px-4 min-w-[210px]">Code Production Associé (010...)</th>
                      <th className="py-3 px-4 text-right w-[130px]">Stock Actuel</th>
                      <th className="py-3 px-3 text-right w-[110px]">Conso / An</th>
                      <th className="py-3 px-4 text-center w-[190px]">Vérification / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredUntrackedItems.map((item) => {
                      const stockNum = Number(item.stock_actuel) || 0;
                      const prodMatch = findProductionEquivalent(item);

                      return (
                        <tr
                          key={item.code_article}
                          onClick={() => setSelectedArticle(item)}
                          className="hover:bg-violet-50/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-violet-900 bg-violet-50 border border-violet-200 px-2 py-1 rounded text-xs">
                              {item.code_article}
                            </span>
                          </td>

                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900 line-clamp-1 group-hover:text-violet-700 transition-colors" title={item.designation}>
                              {item.designation}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Mag {item.magasin || '33'} • Unité: {item.unite || 'PCE'}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {renderCategoryBadge(item.categorie as string)}
                          </td>

                          <td className="py-2.5 px-4">
                            {prodMatch ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedArticle(prodMatch);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-bold transition-colors cursor-pointer"
                                title={`Comparer avec ${prodMatch.code_article} (${prodMatch.designation})`}
                              >
                                <Link2 size={12} className="text-sky-600 shrink-0" />
                                <span className="font-mono">{prodMatch.code_article}</span>
                                <span className="text-sky-600 font-normal">• Stock: {Number(prodMatch.stock_actuel || 0).toLocaleString()}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Aucun équivalent 010... exact</span>
                            )}
                          </td>

                          <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono">
                            <span className={`text-sm font-black ${stockNum <= 0 ? 'text-slate-400' : 'text-slate-900'}`}>
                              {stockNum.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">{item.unite || 'PCE'}</span>
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-slate-600 font-semibold">
                            {Math.round((item.avg_monthly_sortie || 0) * 12).toLocaleString()}
                          </td>

                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={(e) => handleToggleTracking(item, e)}
                                disabled={togglingId === item.code_article}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                title="Réactiver dans le suivi production"
                              >
                                <Eye size={13} />
                                <span>Suivre</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedArticle(item);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-100 transition-colors cursor-pointer"
                                title="Voir la fiche MCBA / MB51"
                              >
                                <ArrowUpRight size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ARTICLE MONTHLY DETAIL MODAL (PRO MAX DRAWER / POPUP) */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between gap-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono text-xs font-bold border border-sky-400/30">
                    {selectedArticle.code_article}
                  </span>
                  {renderCategoryBadge(selectedArticle.categorie as string)}
                  <span className="text-xs text-slate-300 font-semibold">Magasin {selectedArticle.magasin || '33'}</span>
                  {selectedArticle.unite && (
                    <span className="text-xs text-slate-400">• Unité: {selectedArticle.unite}</span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white line-clamp-1">
                  {selectedArticle.designation}
                </h3>
              </div>

              <button
                onClick={() => setSelectedArticle(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* Summary 4-Grid Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Stock Actuel ({selectedArticle.latest_month || kpis.latestMonth})</div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                    {Number(selectedArticle.stock_actuel || 0).toLocaleString()} <span className="text-xs text-slate-500">{selectedArticle.unite || 'PCE'}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Couverture Estimée</div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                    {selectedArticle.coverage_months !== undefined ? `${selectedArticle.coverage_months.toFixed(1)} mois` : 'N/A'}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Mouvements MB51 (2 ans)</div>
                  <div className="text-xl sm:text-2xl font-black text-indigo-700 font-mono mt-1">
                    {selectedArticle.mb51_frequency || 0} mvts
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Diagnostic Santé</div>
                  <div className="mt-1">
                    {renderHealthBadge(selectedArticle.health_status || selectedArticle.statut, selectedArticle.alert_reason)}
                  </div>
                </div>
              </div>

              {/* Supply Chain Strategic Thresholds Card */}
              <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                    <ShieldAlert size={16} className="text-indigo-400" />
                    Seuils de Réapprovisionnement & Sécurité (ROP)
                  </span>
                  <span className="text-[11px] text-slate-300 font-medium">
                    Délai standard : <strong>{selectedArticle.lead_time_months || 1.5} mois</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-white/10 backdrop-blur-xs rounded-xl border border-white/10">
                    <div className="text-[10px] uppercase font-black text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle size={13} />
                      Point de Rupture
                    </div>
                    <div className="text-xl font-black font-mono text-rose-400 mt-1">
                      {Number(selectedArticle.point_rupture || 0).toLocaleString()} {selectedArticle.unite || 'PCE'}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-1">
                      Seuil d'alerte rouge immédiate
                    </div>
                  </div>

                  <div className="p-3.5 bg-white/10 backdrop-blur-xs rounded-xl border border-white/10">
                    <div className="text-[10px] uppercase font-black text-amber-300 flex items-center gap-1.5">
                      <Clock size={13} />
                      Stock de Sécurité
                    </div>
                    <div className="text-xl font-black font-mono text-amber-400 mt-1">
                      {Number(selectedArticle.stock_securite || 0).toLocaleString()} {selectedArticle.unite || 'PCE'}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-1">
                      Tampon d'absorption des retards
                    </div>
                  </div>

                  <div className="p-3.5 bg-white/10 backdrop-blur-xs rounded-xl border border-white/10">
                    <div className="text-[10px] uppercase font-black text-sky-300 flex items-center gap-1.5">
                      <ArrowRight size={13} />
                      Point de Commande (ROP)
                    </div>
                    <div className="text-xl font-black font-mono text-sky-400 mt-1">
                      {Number(selectedArticle.point_reorder || 0).toLocaleString()} {selectedArticle.unite || 'PCE'}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-1">
                      Déclencheur d'achat automatique
                    </div>
                  </div>
                </div>
              </div>

              {/* MB51 Flow Balance */}
              <div className="p-4 bg-sky-50/70 rounded-2xl border border-sky-200/80 space-y-2.5">
                <h4 className="text-xs font-black uppercase text-sky-950 flex items-center gap-2">
                  <Activity size={16} className="text-sky-600" />
                  <span>Analyse des Flux MB51 (Cumul 24 Derniers Mois)</span>
                </h4>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-sky-100">
                    <span className="text-slate-500 font-semibold block text-[11px]">Entrées Totales :</span>
                    <strong className="text-emerald-700 font-mono text-base font-black">+{Number(selectedArticle.mb51_total_entrees || 0).toLocaleString()}</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-sky-100">
                    <span className="text-slate-500 font-semibold block text-[11px]">Sorties Totales (Conso) :</span>
                    <strong className="text-rose-700 font-mono text-base font-black">-{Number(selectedArticle.mb51_total_sorties || 0).toLocaleString()}</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-sky-100">
                    <span className="text-slate-500 font-semibold block text-[11px]">Flux Net :</span>
                    <strong className={`font-mono text-base font-black ${Number(selectedArticle.mb51_net_flow || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {Number(selectedArticle.mb51_net_flow || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Monthly Evolution from MCBA Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart2 size={16} className="text-sky-600" />
                    <span>Historique Mensuel MCBA (Stock Fin de Mois & Consommation)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                    {selectedArticle.history_records?.length || 0} mois enregistrés
                  </span>
                </h4>

                {selectedArticle.history_records && selectedArticle.history_records.length > 0 ? (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black text-[10px] uppercase">
                          <th className="py-2.5 px-3.5">Mois</th>
                          <th className="py-2.5 px-3.5 text-right">Stock Fin de Mois</th>
                          <th className="py-2.5 px-3.5 text-right text-rose-700">Sorties (Consommation)</th>
                          <th className="py-2.5 px-3.5 text-right text-emerald-700">Entrées</th>
                          <th className="py-2.5 px-3.5 min-w-[120px]">Intensité Consommation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-xs">
                        {selectedArticle.history_records.map((rec, idx) => {
                          const maxSortie = Math.max(...selectedArticle.history_records!.map((r) => r.sortie || 0), 1);
                          const barWidth = Math.min(100, Math.round(((rec.sortie || 0) / maxSortie) * 100));

                          return (
                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3.5 font-bold text-slate-900">{rec.mois}</td>
                              <td className="py-2.5 px-3.5 text-right font-black text-slate-900">
                                {Number(rec.stock || 0).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3.5 text-right text-rose-700 font-bold">
                                {Number(rec.sortie || 0).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3.5 text-right text-emerald-700 font-bold">
                                {Number(rec.entree || 0).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3.5">
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex items-center">
                                  <div 
                                    className="bg-gradient-to-r from-rose-400 to-rose-600 h-full rounded-full transition-all"
                                    style={{ width: `${barWidth}%` }}
                                  ></div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    Aucun historique mensuel détaillé disponible pour cet article.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Système Appro & Stocks Sensus SPA
              </span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
