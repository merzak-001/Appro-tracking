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
  ChevronDown,
  ChevronLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StockItem, StockStatusType, StockCategory } from '../types';

interface StockSituationProps {
  mode?: 'components' | 'finished_goods' | 'all';
  onNavigateToAppro?: () => void;
}

export const StockSituation: React.FC<StockSituationProps> = ({ mode = 'components', onNavigateToAppro }) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active Filter Tab: 'ALL' | 'PROBLEMS' | 'RUPTURE' | 'CRITIQUE' | 'BAS' | 'DISPONIBLE'
  // Collapsible sections state
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    ruptures: true,
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

  // Filtered & Sorted items based on Mode (Components vs Finished Goods) and Velocity
  const scopedItems = useMemo(() => {
    if (mode === 'components') {
      return stockItems.filter(i => (i.categorie || '').toUpperCase() !== 'PF');
    } else if (mode === 'finished_goods') {
      return stockItems.filter(i => (i.categorie || '').toUpperCase() === 'PF');
    }
    return stockItems;
  }, [stockItems, mode]);

  const filteredItems = useMemo(() => {
    return scopedItems
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

        return matchesSearch && matchesCategory && matchesTrend && matchesMagasin;
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
  }, [scopedItems, searchQuery, selectedCategory, selectedTrend, selectedMagasin, sortField, sortDirection]);

  // Grouped sections with intelligent velocity differentiation
  const groupedSections = useMemo(() => {
    // 1. High-Volume Real Production Ruptures (Stock = 0 & annual demand > 500 or active series)
    const rupturesHigh = filteredItems.filter((i) => {
      const stock = Number(i.stock_actuel) || 0;
      const history = i.history_records || [];
      const totalOut = history.reduce((s, h) => s + (Number(h.sortie) || 0), 0);
      const isRupture = stock <= 0 || i.health_status === 'RUPTURE';
      // In finished goods mode, all stock=0 are shown; in components mode, prioritize active consumption
      if (mode === 'finished_goods') return isRupture;
      return isRupture && totalOut >= 500;
    });

    // 2. Low-Volume / Occasional / Maintenance Ruptures (e.g. 25kg, < 500/year, or special parts)
    const rupturesLow = filteredItems.filter((i) => {
      if (mode === 'finished_goods') return false;
      const stock = Number(i.stock_actuel) || 0;
      const history = i.history_records || [];
      const totalOut = history.reduce((s, h) => s + (Number(h.sortie) || 0), 0);
      const isRupture = stock <= 0 || i.health_status === 'RUPTURE';
      return isRupture && totalOut < 500;
    });

    // 3. Critiques (< 1 month coverage)
    const critiques = filteredItems.filter((i) => Number(i.stock_actuel) > 0 && i.health_status === 'CRITIQUE');

    // 4. Stocks Bas (1-2 months coverage)
    const bas = filteredItems.filter((i) => Number(i.stock_actuel) > 0 && i.health_status === 'BAS');

    // 5. Disponibles (> 2 months coverage)
    const disponibles = filteredItems.filter((i) => Number(i.stock_actuel) > 0 && (i.health_status === 'DISPONIBLE' || !i.health_status));

    return { rupturesHigh, rupturesLow, critiques, bas, disponibles };
  }, [filteredItems, mode]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedTrend, selectedMagasin, pageSize]);

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

  // Reusable Section Table Component
  const renderSectionTable = (items: StockItem[], emptyMsg: string, emptyIcon: React.ReactNode) => {
    if (items.length === 0) {
      return (
        <div className="py-7 text-center text-slate-400 bg-slate-50/60 rounded-xl border border-slate-100 my-1">
          <div className="flex flex-col items-center justify-center gap-1.5">
            {emptyIcon}
            <span className="text-xs font-semibold text-slate-600">{emptyMsg}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600 tracking-wider">
              <th className="py-2.5 px-3.5 w-[120px]">Code SAP</th>
              <th className="py-2.5 px-3.5 min-w-[270px]">Désignation Article</th>
              <th className="py-2.5 px-2 text-center w-[90px]">Cat. / Mag</th>
              <th className="py-2.5 px-3.5 text-right w-[120px]">Stock Actuel</th>
              <th className="py-2.5 px-3 text-right w-[110px]">Conso / An</th>
              <th className="py-2.5 px-3.5 text-center w-[110px]">Couverture</th>
              <th className="py-2.5 px-3.5 text-right w-[120px]">Point Commande</th>
              <th className="py-2.5 px-3.5 min-w-[190px]">Diagnostic</th>
              <th className="py-2.5 px-2 text-center w-[50px]">Fiche</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {items.map((item) => {
              const isZero = Number(item.stock_actuel) <= 0;
              return (
                <tr
                  key={item.code_article}
                  onClick={() => setSelectedArticle(item)}
                  className="hover:bg-sky-50/70 transition-colors cursor-pointer group"
                >
                  <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                    <span className="bg-slate-100 group-hover:bg-white px-2 py-0.5 rounded text-[11px] border border-slate-200 shadow-2xs">
                      {item.code_article}
                    </span>
                  </td>

                  <td className="py-2.5 px-3.5">
                    <div className="font-bold text-slate-900 line-clamp-1 group-hover:text-sky-700 transition-colors" title={item.designation}>
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

                  <td className="py-2.5 px-2 text-center whitespace-nowrap">
                    <div className="flex flex-col items-center gap-0.5">
                      {renderCategoryBadge(item.categorie as string)}
                      <span className="text-[10px] text-slate-500 font-medium">Mag {item.magasin || '33'}</span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-mono font-black">
                    <span className={isZero ? 'text-rose-600' : 'text-slate-900'}>
                      {Number(item.stock_actuel || 0).toLocaleString()}
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
                    {item.coverage_months !== undefined ? (
                      item.coverage_months > 99 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          &gt; 24 m
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          item.coverage_months <= 0
                            ? 'bg-rose-100 text-rose-800'
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

                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-mono font-bold text-indigo-700">
                    <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
                      {item.point_reorder !== undefined ? Number(item.point_reorder).toLocaleString() : '-'}
                    </span>
                  </td>

                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    {renderHealthBadge(item.health_status || item.statut, item.alert_reason)}
                  </td>

                  <td className="py-2.5 px-2 text-center whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedArticle(item);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-100 transition-colors inline-flex items-center justify-center"
                      title="Ouvrir la fiche complète"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

      {/* TOP NOTIFICATION / CONTEXT BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-wider">
              {mode === 'finished_goods' ? 'Produits Finis (PF)' : 'Matières Premières & Pièces (MP / PD)'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
              <Calendar size={12} />
              Dernier Mois MCBA Remplacé : <strong className="text-white">{kpis.latestMonth}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Boxes className="text-sky-400" size={26} />
            <span>{mode === 'finished_goods' ? 'Situation des Stocks : Produits Finis (Compteurs & Appareils)' : 'Situation des Stocks : Matières Premières & Pièces Détachées'}</span>
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

      {/* SECTION OVERVIEW SUMMARY BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div 
          onClick={() => toggleSection('ruptures')}
          className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200 cursor-pointer hover:shadow-xs transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
              {mode === 'finished_goods' ? 'Ruptures Produits Finis' : 'Ruptures Série (Impact Ligne)'}
            </div>
            <div className="text-2xl font-black text-rose-700 mt-0.5">{groupedSections.rupturesHigh.length}</div>
            <div className="text-[11px] text-rose-600 font-medium">Stock = 0 & Forte conso</div>
          </div>
          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div 
          onClick={() => toggleSection('critiques')}
          className="p-3.5 bg-orange-50/80 rounded-2xl border border-orange-200 cursor-pointer hover:shadow-xs transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-orange-700 flex items-center gap-1.5">
              <Clock size={12} />
              Stocks Critiques
            </div>
            <div className="text-2xl font-black text-orange-700 mt-0.5">{groupedSections.critiques.length}</div>
            <div className="text-[11px] text-orange-600 font-medium">&lt; 1 mois de couverture</div>
          </div>
          <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
            <TrendingDown size={18} />
          </div>
        </div>

        <div 
          onClick={() => toggleSection('bas')}
          className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 cursor-pointer hover:shadow-xs transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <ShieldAlert size={12} />
              Stocks Bas
            </div>
            <div className="text-2xl font-black text-amber-700 mt-0.5">{groupedSections.bas.length}</div>
            <div className="text-[11px] text-amber-600 font-medium">1 à 2 mois (sous ROP)</div>
          </div>
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <AlertCircle size={18} />
          </div>
        </div>

        <div 
          onClick={() => toggleSection('disponibles')}
          className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 cursor-pointer hover:shadow-xs transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 size={12} />
              Stocks Sains (&gt; 2 mois)
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-0.5">{groupedSections.disponibles.length}</div>
            <div className="text-[11px] text-emerald-600 font-medium">Couverture assurée</div>
          </div>
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <Boxes size={18} />
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR (CLEAN, NO TABS) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer en direct par code SAP, désignation, magasin..."
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
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

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {mode === 'components' && (
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-semibold">Type:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">Toutes matières</option>
                <option value="MP">MP - Matières Premières</option>
                <option value="PD">PD - Pièces Détachées</option>
                <option value="AUX">AUX - Matériel Auxiliaire</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-semibold">Flux MB51:</span>
            <select
              value={selectedTrend}
              onChange={(e) => setSelectedTrend(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tous les flux</option>
              <option value="SORTIE_PLUS">Sorties &gt; Entrées</option>
              <option value="ENTREE_PLUS">Entrées &gt; Sorties</option>
            </select>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            {filteredItems.length} articles affichés
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1 : VRAIES RUPTURES DE SÉRIE (IMPACT DIRECT SUR LA PRODUCTION)
          ========================================================================= */}
      <section className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
        <div 
          onClick={() => toggleSection('ruptures')}
          className="p-3.5 bg-gradient-to-r from-rose-50 to-white border-b border-rose-100 flex items-center justify-between cursor-pointer hover:bg-rose-100/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-rose-950 uppercase tracking-wide">
                  {mode === 'finished_goods' 
                    ? 'Section 1 : Ruptures Produits Finis (Stock = 0)' 
                    : 'Section 1 : Vraies Ruptures de Série (Composants de Forte Consommation > 500 à 450 000 / an)'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-2xs">
                  {groupedSections.rupturesHigh.length} articles
                </span>
              </div>
              <p className="text-xs text-rose-700 mt-0.5">
                {mode === 'finished_goods' 
                  ? 'Compteurs et appareils avec stock physique nul dans MCBA (production à la commande ou expédiée).' 
                  : 'Composants indispensables à forte rotation en rupture physique : blocage immédiat des lignes de fabrication.'}
              </p>
            </div>
          </div>
          <button className="text-rose-600 p-1.5 hover:bg-rose-200/50 rounded-lg">
            {openSections.ruptures ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {openSections.ruptures && (
          <div className="p-4">
            {renderSectionTable(
              groupedSections.rupturesHigh, 
              "Aucun article en rupture critique selon les filtres.",
              <CheckCircle2 size={24} className="text-emerald-500" />
            )}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 1-BIS : BESOINS PONCTUELS & FAIBLE VOLUME (< 500 / AN OU MAINTENANCE)
          ========================================================================= */}
      {mode === 'components' && groupedSections.rupturesLow.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div 
            onClick={() => toggleSection('rupturesLow')}
            className="p-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-600 text-white rounded-xl shadow-xs">
                <Info size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                    Section 1-B : Besoins Ponctuels & Maintenance à Stock 0 (&lt; 500 unités/an ou 25 kg)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                    {groupedSections.rupturesLow.length} articles
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Articles à faible rotation, consommables d'atelier ou pièces de maintenance (ne bloquent pas la production de série).
                </p>
              </div>
            </div>
            <button className="text-slate-500 p-1.5 hover:bg-slate-200/50 rounded-lg">
              {openSections.rupturesLow ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>

          {openSections.rupturesLow && (
            <div className="p-4">
              {renderSectionTable(
                groupedSections.rupturesLow, 
                "Aucun article ponctuel à stock 0.",
                <Boxes size={24} className="text-slate-400" />
              )}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          SECTION 2 : STOCKS CRITIQUES (< 1 MOIS OU SOUS POINT DE RUPTURE)
          ========================================================================= */}
      <section className="bg-white rounded-2xl border border-orange-200 shadow-xs overflow-hidden">
        <div 
          onClick={() => toggleSection('critiques')}
          className="p-3.5 bg-gradient-to-r from-orange-50 to-white border-b border-orange-100 flex items-center justify-between cursor-pointer hover:bg-orange-100/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600 text-white rounded-xl shadow-xs">
              <Clock size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-orange-950 uppercase tracking-wide">
                  Section 2 : Alertes Critiques (&lt; 1 Mois de Couverture)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-orange-600 text-white shadow-2xs">
                  {groupedSections.critiques.length} articles
                </span>
              </div>
              <p className="text-xs text-orange-700 mt-0.5">
                Articles dont le stock est insuffisant pour couvrir le délai d'approvisionnement normal.
              </p>
            </div>
          </div>
          <button className="text-orange-600 p-1.5 hover:bg-orange-200/50 rounded-lg">
            {openSections.critiques ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {openSections.critiques && (
          <div className="p-4">
            {renderSectionTable(
              groupedSections.critiques, 
              "Aucun article en situation critique selon les filtres.",
              <CheckCircle2 size={24} className="text-emerald-500" />
            )}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 3 : STOCKS BAS (1 À 2 MOIS / SOUS POINT DE COMMANDE)
          ========================================================================= */}
      <section className="bg-white rounded-2xl border border-amber-200 shadow-xs overflow-hidden">
        <div 
          onClick={() => toggleSection('bas')}
          className="p-3.5 bg-gradient-to-r from-amber-50 to-white border-b border-amber-100 flex items-center justify-between cursor-pointer hover:bg-amber-100/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs">
              <TrendingDown size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                  Section 3 : Stocks Bas (1 à 2 Mois de Couverture - Sous Point de Commande)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-600 text-white shadow-2xs">
                  {groupedSections.bas.length} articles
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                Articles ayant franchi le point de commande (ROP) : à intégrer dans les prochains bons de commande.
              </p>
            </div>
          </div>
          <button className="text-amber-600 p-1.5 hover:bg-amber-200/50 rounded-lg">
            {openSections.bas ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {openSections.bas && (
          <div className="p-4">
            {renderSectionTable(
              groupedSections.bas, 
              "Aucun article en stock bas selon les filtres.",
              <CheckCircle2 size={24} className="text-emerald-500" />
            )}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 4 : STOCKS DISPONIBLES ET CONFORMES (> 2 MOIS)
          ========================================================================= */}
      <section className="bg-white rounded-2xl border border-emerald-200 shadow-xs overflow-hidden">
        <div 
          onClick={() => toggleSection('disponibles')}
          className="p-3.5 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100 flex items-center justify-between cursor-pointer hover:bg-emerald-100/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                  Section 4 : Stocks Disponibles & Couverture Saine (&gt; 2 Mois)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-700 text-white shadow-2xs">
                  {groupedSections.disponibles.length} articles
                </span>
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Articles sécurisés avec stock au-dessus du stock de sécurité et du point de commande. Cliquez pour dérouler.
              </p>
            </div>
          </div>
          <button className="text-emerald-600 p-1.5 hover:bg-emerald-200/50 rounded-lg">
            {openSections.disponibles ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {openSections.disponibles && (
          <div className="p-4">
            {renderSectionTable(
              groupedSections.disponibles, 
              "Aucun article disponible selon les filtres.",
              <Boxes size={24} className="text-slate-400" />
            )}
          </div>
        )}
      </section>

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

              {/* Specific Supply Chain Thresholds (Point de Rupture, Sécurité, Reorder) */}
              <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <ShieldAlert size={15} />
                    Paramètres de Gestion des Stocks & Seuils Critiques
                  </span>
                  <span className="text-[11px] text-slate-300 font-medium">
                    Délai réapprovisionnement estimé : {selectedArticle.lead_time_months || 1.5} mois
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                    <div className="text-[10px] uppercase font-bold text-rose-300 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Point de Rupture (Critique)
                    </div>
                    <div className="text-xl font-black font-mono text-rose-400 mt-0.5">
                      {Number(selectedArticle.point_rupture || 0).toLocaleString()} {selectedArticle.unite || 'PCE'}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-1">
                      Seuil de basculement en rupture imminente
                    </div>
                  </div>

                  <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                    <div className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
                      <Clock size={12} />
                      Stock de Sécurité
                    </div>
                    <div className="text-xl font-black font-mono text-amber-400 mt-0.5">
                      {Number(selectedArticle.stock_securite || 0).toLocaleString()} {selectedArticle.unite || 'PCE'}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-1">
                      Tampon statistique face aux aléas de conso / délai
                    </div>
                  </div>

                  <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                    <div className="text-[10px] uppercase font-bold text-sky-300 flex items-center gap-1">
                      <ArrowRight size={12} />
                      Point de Commande (ROP)
                    </div>
                    <div className="text-xl font-black font-mono text-sky-400 mt-0.5">
                      {Number(selectedArticle.point_reorder || 0).toLocaleString()} {selectedArticle.unite || 'PCE'}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-1">
                      Niveau déclencheur du bon de commande
                    </div>
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
