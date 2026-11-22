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
  Filter,
  Eye,
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
  ChevronLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StockItem, StockStatusType, StockCategory } from '../types';

interface StockSituationProps {
  onNavigateToAppro?: () => void;
}

export const StockSituation: React.FC<StockSituationProps> = ({ onNavigateToAppro }) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active Filter Tab: 'ALL' | 'PROBLEMS' | 'RUPTURE' | 'CRITIQUE' | 'BAS' | 'DISPONIBLE'
  const [activeTabFilter, setActiveTabFilter] = useState<'PROBLEMS' | 'ALL' | 'RUPTURE' | 'CRITIQUE' | 'BAS' | 'DISPONIBLE'>('PROBLEMS');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL'); // 'ALL' | 'MP' | 'PF' | 'PD' | 'AUX'
  const [selectedTrend, setSelectedTrend] = useState<string>('ALL'); // 'ALL' | 'SORTIE_PLUS' | 'ENTREE_PLUS'
  const [selectedMagasin, setSelectedMagasin] = useState<string>('ALL');

  // Sorting
  const [sortField, setSortField] = useState<keyof StockItem>('stock_actuel');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

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
        // Fallback to /api/stock
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

  // Overall KPIs
  const kpis = useMemo(() => {
    const total = stockItems.length;
    let ruptures = 0;
    let critiques = 0;
    let bas = 0;
    let disponibles = 0;
    let totalStockVolume = 0;
    let latestMonth = '11.2026';

    stockItems.forEach((i) => {
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

    return {
      total,
      ruptures,
      critiques,
      bas,
      disponibles,
      problems: ruptures + critiques,
      totalStockVolume,
      latestMonth,
    };
  }, [stockItems]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return stockItems
      .filter((item) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.code_article.toLowerCase().includes(q) ||
          item.designation.toLowerCase().includes(q) ||
          (item.magasin && String(item.magasin).toLowerCase().includes(q)) ||
          (item.alert_reason && item.alert_reason.toLowerCase().includes(q));

        // Tab Filter
        const status = item.health_status || item.statut || (Number(item.stock_actuel) <= 0 ? 'RUPTURE' : 'DISPONIBLE');
        let matchesTab = true;
        if (activeTabFilter === 'PROBLEMS') {
          matchesTab = status === 'RUPTURE' || status === 'CRITIQUE' || Number(item.stock_actuel) <= 0;
        } else if (activeTabFilter === 'RUPTURE') {
          matchesTab = status === 'RUPTURE' || Number(item.stock_actuel) <= 0;
        } else if (activeTabFilter === 'CRITIQUE') {
          matchesTab = status === 'CRITIQUE';
        } else if (activeTabFilter === 'BAS') {
          matchesTab = status === 'BAS';
        } else if (activeTabFilter === 'DISPONIBLE') {
          matchesTab = status === 'DISPONIBLE' && Number(item.stock_actuel) > 0;
        }

        // Category Filter
        let matchesCategory = true;
        if (selectedCategory !== 'ALL') {
          matchesCategory = item.categorie === selectedCategory;
        }

        // Trend Filter
        let matchesTrend = true;
        if (selectedTrend === 'SORTIE_PLUS') {
          matchesTrend = item.mb51_trend === 'SORTIE_PLUS' || (Number(item.mb51_total_sorties) > Number(item.mb51_total_entrees));
        } else if (selectedTrend === 'ENTREE_PLUS') {
          matchesTrend = item.mb51_trend === 'ENTREE_PLUS' || (Number(item.mb51_total_entrees) >= Number(item.mb51_total_sorties));
        }

        // Magasin Filter
        const matchesMagasin = selectedMagasin === 'ALL' || String(item.magasin) === selectedMagasin;

        return matchesSearch && matchesTab && matchesCategory && matchesTrend && matchesMagasin;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'health_status' || sortField === 'statut') {
          const rank = { RUPTURE: 0, CRITIQUE: 1, BAS: 2, DISPONIBLE: 3, SURSTOCK: 4 };
          valA = rank[a.health_status || 'DISPONIBLE'] ?? 5;
          valB = rank[b.health_status || 'DISPONIBLE'] ?? 5;
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA ?? '').localeCompare(String(valB ?? ''))
          : String(valB ?? '').localeCompare(String(valA ?? ''));
      });
  }, [stockItems, searchQuery, activeTabFilter, selectedCategory, selectedTrend, selectedMagasin, sortField, sortDirection]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTabFilter, selectedCategory, selectedTrend, selectedMagasin, pageSize]);

  // Paginated Items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

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
      'Code Article': item.code_article,
      'Désignation': item.designation,
      'Catégorie': item.categorie || 'MP',
      'Magasin': item.magasin || '33',
      'Stock Actuel': item.stock_actuel,
      'Dernier Mois MCBA': item.latest_month || '11.2026',
      'Statut Santé': item.health_status || item.statut,
      'Diagnostic / Motif': item.alert_reason || '',
      'Couverture (Mois)': item.coverage_months !== undefined ? item.coverage_months : '',
      'Sorties Moy. / Mois': item.avg_monthly_sortie || 0,
      'MB51 Fréquence Mouvements (2 ans)': item.mb51_frequency || 0,
      'MB51 Total Entrées': item.mb51_total_entrees || 0,
      'MB51 Total Sorties': item.mb51_total_sorties || 0,
      'MB51 Flux Net': item.mb51_net_flow || 0,
      'Tendance Flux': item.mb51_trend === 'SORTIE_PLUS' ? 'Consommation dominante' : 'Approvisionnement dominant',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Situation Stock');
    XLSX.writeFile(wb, `Situation_Stock_MB51_MCBA_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Health Status Badge Renderer
  const renderHealthBadge = (status?: string, reason?: string) => {
    const s = status || 'DISPONIBLE';
    if (s === 'RUPTURE') {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            RUPTURE
          </span>
          {reason && <span className="text-[10px] text-rose-600 font-medium truncate max-w-[170px]">{reason}</span>}
        </div>
      );
    }
    if (s === 'CRITIQUE') {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-300 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            CRITIQUE (&lt; 1 m)
          </span>
          {reason && <span className="text-[10px] text-orange-700 font-medium truncate max-w-[170px]">{reason}</span>}
        </div>
      );
    }
    if (s === 'BAS') {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            STOCK BAS (&lt; 2 m)
          </span>
          {reason && <span className="text-[10px] text-amber-700 font-medium truncate max-w-[170px]">{reason}</span>}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          DISPONIBLE
        </span>
        {reason && <span className="text-[10px] text-emerald-700 font-medium truncate max-w-[170px]">{reason}</span>}
      </div>
    );
  };

  // Category Badge Renderer
  const renderCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'MP':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">MP</span>;
      case 'PF':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">PF</span>;
      case 'PD':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">PD</span>;
      case 'AUX':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">AUX</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">AUTRE</span>;
    }
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

      {/* TOP NOTIFICATION / CONTEXT BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-wider">
              Périmètre Strict MB51
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
              <Calendar size={12} />
              Dernier Mois MCBA Remplacé : <strong className="text-white">{kpis.latestMonth}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Boxes className="text-sky-400" size={26} />
            <span>Situation de Stock & Alertes d'Approvisionnement</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Seuls les <strong>{kpis.total} articles avec historique de mouvements récents (MB51 sur 2 ans)</strong> sont affichés. À chaque nouvel import du fichier <strong>MCBA</strong>, seul le dernier mois de stock est extrait et remplace automatiquement les données existantes pour alerter immédiatement sur les risques de rupture.
          </p>
        </div>

        {/* TOP ACTIONS */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Importer le fichier mcba.xlsx : prend automatiquement le dernier mois de stock pour les articles MB51 et remplace la base"
          >
            {isUploading ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Upload size={15} />
            )}
            <span>{isUploading ? 'Traitement MCBA...' : 'Importer Fichier MCBA'}</span>
          </button>

          <button
            onClick={fetchStockSituation}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Recharger la situation"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Exporter la liste filtrée en Excel"
          >
            <FileSpreadsheet size={15} />
            <span>Exporter Excel</span>
          </button>

          {onNavigateToAppro && (
            <button
              onClick={onNavigateToAppro}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Aller vers la Situation Approvisionnements"
            >
              <span>Situation Appro</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* UPLOAD SUCCESS TOAST MODAL */}
      {uploadResult && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl shadow-xs flex items-center justify-between gap-3 text-emerald-900 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-lg">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold">Import MCBA Réussi avec Remplacement Automatique</h4>
              <p className="text-xs text-emerald-800">
                <strong>{uploadResult.updatedCount} articles MB51</strong> mis à jour sur le mois le plus récent (<strong>{uploadResult.latestMonth}</strong>). 
                {uploadResult.ignoredCount > 0 && <span> ({uploadResult.ignoredCount} entrées hors liste MB51 ignorées).</span>}
                {' '}Actuellement : <span className="font-bold text-rose-700">{uploadResult.alerts.ruptures} ruptures</span> et <span className="font-bold text-orange-700">{uploadResult.alerts.critiques} critiques</span>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setUploadResult(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1.5 rounded-lg hover:bg-emerald-100"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* 5 MOST NEEDED KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Total MB51 Articles */}
        <div 
          onClick={() => setActiveTabFilter('ALL')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTabFilter === 'ALL' 
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/20 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Articles MB51</span>
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Boxes size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.total}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Actifs ces 2 ans</div>
        </div>

        {/* KPI 2: Tous les Problèmes (Ruptures + Critiques) */}
        <div 
          onClick={() => setActiveTabFilter('PROBLEMS')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTabFilter === 'PROBLEMS' 
              ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-400/20 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-rose-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert size={14} />
              Total Alertes
            </span>
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">{kpis.problems}</div>
          <div className="text-[11px] text-rose-600 font-semibold mt-0.5">Ruptures & Critiques</div>
        </div>

        {/* KPI 3: Ruptures Immédiates */}
        <div 
          onClick={() => setActiveTabFilter('RUPTURE')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTabFilter === 'RUPTURE' 
              ? 'bg-rose-100/80 border-rose-500 ring-2 ring-rose-500/20 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ruptures</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
          </div>
          <div className="text-2xl font-black text-rose-700">{kpis.ruptures}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">Stock = 0 unités</div>
        </div>

        {/* KPI 4: Stock Critique (< 1 mois de couverture) */}
        <div 
          onClick={() => setActiveTabFilter('CRITIQUE')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTabFilter === 'CRITIQUE' 
              ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400/20 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-orange-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-orange-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Critiques</span>
            <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-orange-700">{kpis.critiques}</div>
          <div className="text-[11px] text-orange-600 font-medium mt-0.5">&lt; 1 mois de couverture</div>
        </div>

        {/* KPI 5: Stock Bas (< 2 mois de couverture) */}
        <div 
          onClick={() => setActiveTabFilter('BAS')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTabFilter === 'BAS' 
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-amber-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stock Bas</span>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">{kpis.bas}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">1 à 2 mois couverture</div>
        </div>

        {/* KPI 6: Disponibles / Bons */}
        <div 
          onClick={() => setActiveTabFilter('DISPONIBLE')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTabFilter === 'DISPONIBLE' 
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-emerald-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Disponibles</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">{kpis.disponibles}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Stock sain &gt; 2 mois</div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL TOOLBAR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* ROW 1: Search & Dropdown Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par code article, désignation, magasin, motif d'alerte..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-semibold hidden sm:inline">Catégorie:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">Toutes Catégories</option>
                <option value="MP">MP - Matières Premières</option>
                <option value="PF">PF - Produits Finis</option>
                <option value="PD">PD - Pièces Détachées</option>
                <option value="AUX">AUX - Matériel Auxiliaire</option>
              </select>
            </div>

            {/* Trend Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-semibold hidden sm:inline">Tendance Flux:</span>
              <select
                value={selectedTrend}
                onChange={(e) => setSelectedTrend(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">Tous les Flux</option>
                <option value="SORTIE_PLUS">🔴 Sorties &gt; Entrées (Forte Consommation)</option>
                <option value="ENTREE_PLUS">🟢 Entrées &gt; Sorties (Appro Dominant)</option>
              </select>
            </div>

            {/* Magasin Filter */}
            {magasinsList.length > 1 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 font-semibold hidden sm:inline">Magasin:</span>
                <select
                  value={selectedMagasin}
                  onChange={(e) => setSelectedMagasin(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="ALL">Tous Magasins</option>
                  {magasinsList.map((m) => (
                    <option key={m} value={m}>Magasin {m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={300}>Tous (300)</option>
            </select>
          </div>
        </div>

        {/* ROW 2: Filter Pills for Fast Switching */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 border-t border-slate-100">
          <button
            onClick={() => setActiveTabFilter('PROBLEMS')}
            className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTabFilter === 'PROBLEMS'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle size={13} />
            <span>Tous les Problèmes ({kpis.problems})</span>
          </button>

          <button
            onClick={() => setActiveTabFilter('RUPTURE')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTabFilter === 'RUPTURE'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            <span>Ruptures ({kpis.ruptures})</span>
          </button>

          <button
            onClick={() => setActiveTabFilter('CRITIQUE')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTabFilter === 'CRITIQUE'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            <span>Critiques &lt; 1m ({kpis.critiques})</span>
          </button>

          <button
            onClick={() => setActiveTabFilter('BAS')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTabFilter === 'BAS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Stock Bas &lt; 2m ({kpis.bas})</span>
          </button>

          <button
            onClick={() => setActiveTabFilter('DISPONIBLE')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTabFilter === 'DISPONIBLE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Disponibles ({kpis.disponibles})</span>
          </button>

          <button
            onClick={() => setActiveTabFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTabFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Tous les {kpis.total} Articles MB51</span>
          </button>

          <div className="ml-auto text-xs text-slate-400 font-medium shrink-0">
            {filteredItems.length} articles affichés
          </div>
        </div>
      </div>

      {/* FULL HORIZONTAL WIDTH DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600 tracking-wider">
                <th 
                  onClick={() => handleSort('code_article')} 
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors w-[130px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Code SAP</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('designation')} 
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors min-w-[260px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Désignation Article</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th className="py-3 px-2 text-center w-[90px]">
                  <span>Cat. / Mag</span>
                </th>

                <th 
                  onClick={() => handleSort('stock_actuel')} 
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors w-[130px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Stock Actuel</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('health_status')} 
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors w-[190px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Statut & Diagnostic</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('coverage_months')} 
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors w-[110px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Couverture</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('avg_monthly_sortie')} 
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors w-[110px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Sorties/Mois</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('mb51_frequency')} 
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors w-[110px]"
                  title="Nombre de mouvements enregistrés dans MB51 au cours des 2 dernières années"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Mvts MB51</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('mb51_total_sorties')} 
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors w-[130px]"
                  title="Total des sorties de stock MB51"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Sorties MB51</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('mb51_total_entrees')} 
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors w-[130px]"
                  title="Total des entrées de stock MB51"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Entrées MB51</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>

                <th className="py-3 px-3 text-center w-[120px]">
                  <span>Flux MB51</span>
                </th>

                <th className="py-3 px-2 text-center w-[50px]">
                  <span>Détail</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="animate-spin text-sky-600" size={24} />
                      <span className="font-semibold">Chargement de la situation des stocks...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Boxes className="text-slate-300" size={32} />
                      <span className="font-bold text-slate-700">Aucun article ne correspond à vos filtres.</span>
                      <span className="text-xs text-slate-400">Essayez de réinitialiser la recherche ou de changer d'onglet.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const isRupture = (item.health_status === 'RUPTURE') || (Number(item.stock_actuel) <= 0);
                  const isCritique = item.health_status === 'CRITIQUE';
                  const isBas = item.health_status === 'BAS';
                  const trendIsSortie = item.mb51_trend === 'SORTIE_PLUS' || (Number(item.mb51_total_sorties) > Number(item.mb51_total_entrees));

                  return (
                    <tr 
                      key={item.code_article}
                      onClick={() => setSelectedArticle(item)}
                      className={`hover:bg-sky-50/50 transition-colors cursor-pointer ${
                        isRupture 
                          ? 'bg-rose-50/20' 
                          : isCritique 
                            ? 'bg-orange-50/15' 
                            : ''
                      }`}
                    >
                      {/* Code SAP */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px] border border-slate-200">
                          {item.code_article}
                        </span>
                      </td>

                      {/* Désignation */}
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        <div className="font-bold line-clamp-1" title={item.designation}>
                          {item.designation}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{item.type_article || 'ROH'}</span>
                          <span>•</span>
                          <span>{item.unite || 'PCE'}</span>
                          {item.emplacement && (
                            <>
                              <span>•</span>
                              <span>{item.emplacement}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Catégorie & Magasin */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          {renderCategoryBadge(item.categorie as string)}
                          <span className="text-[10px] text-slate-500 font-medium">Mag {item.magasin || '33'}</span>
                        </div>
                      </td>

                      {/* Stock Actuel (Dernier Mois) */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className={`text-sm font-black font-mono ${
                          isRupture ? 'text-rose-600' : isCritique ? 'text-orange-600' : isBas ? 'text-amber-700' : 'text-slate-900'
                        }`}>
                          {Number(item.stock_actuel || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-end gap-1">
                          <span>{item.unite || 'PCE'}</span>
                          <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-500 text-[9px] border border-slate-200">
                            {item.latest_month || kpis.latestMonth}
                          </span>
                        </div>
                      </td>

                      {/* Statut & Diagnostic */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderHealthBadge(item.health_status || item.statut, item.alert_reason)}
                      </td>

                      {/* Couverture */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono">
                        {item.coverage_months !== undefined ? (
                          item.coverage_months > 99 ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600">
                              &gt; 24 m
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                              item.coverage_months <= 0 
                                ? 'bg-rose-100 text-rose-700 font-extrabold' 
                                : item.coverage_months < 1 
                                  ? 'bg-orange-100 text-orange-800' 
                                  : item.coverage_months < 2 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {item.coverage_months.toFixed(1)} m
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Sorties Moyennes / Mois */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        {item.avg_monthly_sortie ? Number(item.avg_monthly_sortie).toLocaleString() : '0'}
                      </td>

                      {/* MB51 Mouvements count */}
                      <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          (item.mb51_frequency || 0) > 100 
                            ? 'bg-indigo-100 text-indigo-800 font-black' 
                            : (item.mb51_frequency || 0) > 20 
                              ? 'bg-sky-100 text-sky-800' 
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.mb51_frequency || 0} mvts
                        </span>
                      </td>

                      {/* MB51 Total Sorties */}
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700 whitespace-nowrap font-semibold">
                        -{Number(item.mb51_total_sorties || 0).toLocaleString()}
                      </td>

                      {/* MB51 Total Entrées */}
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 whitespace-nowrap font-semibold">
                        +{Number(item.mb51_total_entrees || 0).toLocaleString()}
                      </td>

                      {/* Flux MB51 */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {trendIsSortie ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <TrendingDown size={11} />
                            Sortie &gt; Entrée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <TrendingUp size={11} />
                            Entrée &gt; Sortie
                          </span>
                        )}
                      </td>

                      {/* Detail Button */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedArticle(item);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="Voir l'historique mensuel MCBA & MB51"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Affichage de <strong>{Math.min(filteredItems.length, (currentPage - 1) * pageSize + 1)}</strong> à <strong>{Math.min(filteredItems.length, currentPage * pageSize)}</strong> sur <strong>{filteredItems.length}</strong> articles filtrés ({kpis.total} au total)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              Début
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-3 py-1 font-bold text-slate-800">
              Page {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              Fin
            </button>
          </div>
        </div>
      </div>

      {/* ARTICLE MONTHLY DETAIL MODAL */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono text-xs font-bold border border-sky-400/30">
                    {selectedArticle.code_article}
                  </span>
                  {renderCategoryBadge(selectedArticle.categorie as string)}
                  <span className="text-xs text-slate-400 font-medium">Magasin {selectedArticle.magasin || '33'}</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white line-clamp-1">
                  {selectedArticle.designation}
                </h3>
              </div>

              <button
                onClick={() => setSelectedArticle(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Stock Actuel ({selectedArticle.latest_month || kpis.latestMonth})</div>
                  <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                    {Number(selectedArticle.stock_actuel || 0).toLocaleString()} {selectedArticle.unite || 'PCE'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Couverture Estimée</div>
                  <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                    {selectedArticle.coverage_months !== undefined ? `${selectedArticle.coverage_months} mois` : 'N/A'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Mouvements MB51 (2 ans)</div>
                  <div className="text-xl font-black text-indigo-700 font-mono mt-0.5">
                    {selectedArticle.mb51_frequency || 0} mvts
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Statut Santé</div>
                  <div className="mt-1">
                    {renderHealthBadge(selectedArticle.health_status || selectedArticle.statut, selectedArticle.alert_reason)}
                  </div>
                </div>
              </div>

              {/* MB51 Flux Summary */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2">
                <h4 className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
                  <Activity size={15} />
                  <span>Analyse des Flux MB51 (Total des 2 Dernières Années)</span>
                </h4>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block">Total Entrées :</span>
                    <strong className="text-emerald-700 font-mono text-sm">+{Number(selectedArticle.mb51_total_entrees || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Total Sorties (Consommation) :</span>
                    <strong className="text-rose-700 font-mono text-sm">-{Number(selectedArticle.mb51_total_sorties || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Flux Net :</span>
                    <strong className={`font-mono text-sm ${Number(selectedArticle.mb51_net_flow || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {Number(selectedArticle.mb51_net_flow || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Monthly Evolution from MCBA Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BarChart2 size={15} className="text-sky-600" />
                    <span>Évolution Mensuelle du Stock & des Sorties (Fichier MCBA)</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {selectedArticle.history_records?.length || 0} mois enregistrés
                  </span>
                </h4>

                {selectedArticle.history_records && selectedArticle.history_records.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold">
                          <th className="py-2 px-3">Mois</th>
                          <th className="py-2 px-3 text-right">Stock de Fin de Mois</th>
                          <th className="py-2 px-3 text-right text-rose-700">Sorties (Consommation)</th>
                          <th className="py-2 px-3 text-right text-emerald-700">Entrées</th>
                          <th className="py-2 px-3">Visualisation Consommation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-xs">
                        {selectedArticle.history_records.map((rec, idx) => {
                          const maxSortie = Math.max(...selectedArticle.history_records!.map((r) => r.sortie || 0), 1);
                          const barWidth = Math.min(100, Math.round(((rec.sortie || 0) / maxSortie) * 100));

                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-slate-900">{rec.mois}</td>
                              <td className="py-2 px-3 text-right font-black text-slate-900">
                                {Number(rec.stock || 0).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right text-rose-700 font-semibold">
                                {Number(rec.sortie || 0).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right text-emerald-700 font-semibold">
                                {Number(rec.entree || 0).toLocaleString()}
                              </td>
                              <td className="py-2 px-3">
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex items-center">
                                  <div 
                                    className="bg-rose-500 h-full rounded-full transition-all"
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
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    Aucun historique mensuel détaillé disponible pour cet article.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
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
