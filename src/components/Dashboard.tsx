import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Globe, 
  Truck, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  PackageCheck, 
  PlusCircle, 
  ArrowRight,
  Database,
  Filter,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  Search,
  CheckCircle,
  Activity,
  Layers3,
  Boxes,
  ShieldCheck,
  FileCheck2,
  Award,
  Printer,
  AlertTriangle,
  Sparkles,
  Building2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  CartesianGrid 
} from 'recharts';
import { DashboardKPIs, User, LocalOrder, ForeignOrder, LocalDelivery, Supplier } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { SearchableSelect } from './SearchableSelect';
import { PrintRevueProcessusReport } from './PrintRevueProcessusReport';
import { formatAmount, formatQty } from '../utils/numberUtils';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

interface DashboardProps {
  kpis: DashboardKPIs | null;
  localOrders?: LocalOrder[];
  foreignOrders?: ForeignOrder[];
  localDeliveries?: LocalDelivery[];
  suppliers?: Supplier[];
  loading: boolean;
  currentUser: User;
  onNavigate: (tab: string) => void;
  onOpenNewLocalOrder: () => void;
  onOpenNewForeignOrder: () => void;
  onOpenSqlModal: () => void;
}

type DashboardMode = 'LOCAL' | 'FOREIGN' | 'DELIVERIES';

const COLORS = ['#0284c7', '#0f172a', '#38bdf8', '#64748b', '#0369a1', '#1e293b', '#e2e8f0'];

const MONTHS_OPTIONS = [
  { value: 'ALL', label: 'Tous les mois' },
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

export const Dashboard: React.FC<DashboardProps> = ({
  kpis,
  localOrders = [],
  foreignOrders = [],
  localDeliveries = [],
  suppliers = [],
  loading,
  currentUser,
  onNavigate,
  onOpenNewLocalOrder,
  onOpenNewForeignOrder,
  onOpenSqlModal
}) => {
  const { t } = useLanguage();

  // Primary Dashboard Mode
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>('LOCAL');
  const [localViewMode, setLocalViewMode] = useState<'kpis' | 'iso_revue'>('kpis');
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);

  // Date Filter States (Defaults to Current Year and Current Month)
  const now = new Date();
  const currentYearStr = String(now.getFullYear());
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Deliveries Mode: Specific Order & Item Selectors (NO Vue Global)
  const [selectedDeliveryOrderId, setSelectedDeliveryOrderId] = useState<string>('');
  const [selectedItemDesignation, setSelectedItemDesignation] = useState<string>('ALL');

  // Ensure Deliveries mode defaults to the first available Local Order
  useEffect(() => {
    if (localOrders.length > 0 && (!selectedDeliveryOrderId || selectedDeliveryOrderId === 'ALL')) {
      setSelectedDeliveryOrderId(String(localOrders[0].id));
    }
  }, [localOrders, selectedDeliveryOrderId]);

  // Helper for date filtering
  const isDateInFilter = (dateStr?: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;

    const y = String(d.getFullYear());
    const m = String(d.getMonth() + 1).padStart(2, '0');

    if (selectedYear !== 'ALL' && y !== selectedYear) return false;
    if (selectedMonth !== 'ALL' && m !== selectedMonth) return false;

    return true;
  };

  // --- FILTERED DATASETS ---
  const filteredLocalOrders = useMemo(() => {
    return localOrders.filter((o) => isDateInFilter(o.date));
  }, [localOrders, selectedYear, selectedMonth]);

  const filteredForeignOrders = useMemo(() => {
    return foreignOrders.filter((o) => isDateInFilter(o.date));
  }, [foreignOrders, selectedYear, selectedMonth]);

  const filteredDeliveries = useMemo(() => {
    return localDeliveries.filter((d) => isDateInFilter(d.delivery_date));
  }, [localDeliveries, selectedYear, selectedMonth]);

  // --- LOCAL ORDERS ANALYTICS COMPUTATION ---
  const localAnalytics = useMemo(() => {
    const ordersToUse = filteredLocalOrders;
    const totalOrders = ordersToUse.length;
    const totalHT = ordersToUse.reduce((sum, o) => sum + (o.total_ht || 0), 0);
    const totalTTC = ordersToUse.reduce((sum, o) => sum + (o.total_ttc || 0), 0);
    const avgOrderHT = totalOrders > 0 ? totalHT / totalOrders : 0;

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    ordersToUse.forEach((o) => {
      const st = o.status || 'Pending';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    const statusChartData = Object.keys(statusCounts).map((status) => ({
      name: status === 'Pending' ? 'En attente' : status === 'In Progress' ? 'En cours' : status === 'Completed' ? 'Clôturée' : status,
      value: statusCounts[status],
    }));

    // Spend per supplier
    const supplierSpendMap: Record<string, number> = {};
    ordersToUse.forEach((o) => {
      const supName = o.supplier_name || 'Inconnu';
      supplierSpendMap[supName] = (supplierSpendMap[supName] || 0) + o.total_ht;
    });

    const topSuppliersData = Object.entries(supplierSpendMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    return {
      totalOrders,
      totalHT,
      totalTTC,
      avgOrderHT,
      statusChartData,
      topSuppliersData,
    };
  }, [filteredLocalOrders]);

  // --- FOREIGN ORDERS ANALYTICS COMPUTATION ---
  const foreignAnalytics = useMemo(() => {
    const ordersToUse = filteredForeignOrders;
    const totalOrders = ordersToUse.length;
    let eurTotal = 0;
    let usdTotal = 0;

    const currencyMap: Record<string, number> = {};
    const countryMap: Record<string, number> = {};

    ordersToUse.forEach((o) => {
      const curr = o.currency || 'EUR';
      currencyMap[curr] = (currencyMap[curr] || 0) + (o.amount || 0);
      if (curr === 'EUR') eurTotal += o.amount || 0;
      if (curr === 'USD') usdTotal += o.amount || 0;

      const ctry = o.country || 'International';
      countryMap[ctry] = (countryMap[ctry] || 0) + (o.amount || 0);
    });

    const currencyChartData = Object.entries(currencyMap).map(([name, value]) => ({ name, value }));
    const countryChartData = Object.entries(countryMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalOrders,
      eurTotal,
      usdTotal,
      currencyChartData,
      countryChartData,
    };
  }, [filteredForeignOrders]);

  // --- DELIVERIES ANALYTICS & FREQUENCY COMPUTATION ---
  const deliveriesAnalytics = useMemo(() => {
    // Selected Order Object
    const selectedOrderObj = localOrders.find((o) => String(o.id) === String(selectedDeliveryOrderId)) || localOrders[0] || null;
    const orderIdToFilter = selectedOrderObj ? selectedOrderObj.id : null;

    // Deliveries belonging to this selected order (and date filter)
    const orderDeliveries = filteredDeliveries.filter((d) => String(d.local_order_id) === String(orderIdToFilter));

    // Deliveries further filtered by selected item designation
    const activeItemDeliveries = selectedItemDesignation === 'ALL'
      ? orderDeliveries
      : orderDeliveries.filter((d) => d.designation?.toLowerCase() === selectedItemDesignation.toLowerCase());

    // Delivery Frequency over time (grouped by delivery_date)
    const frequencyMap: Record<string, { date: string; displayDate: string; count: number; qty: number }> = {};

    activeItemDeliveries.forEach((d) => {
      const dateKey = d.delivery_date || 'Inconnue';
      const formattedDate = formatDateDDMMYYYY(dateKey);
      if (!frequencyMap[dateKey]) {
        frequencyMap[dateKey] = {
          date: dateKey,
          displayDate: formattedDate,
          count: 0,
          qty: 0,
        };
      }
      frequencyMap[dateKey].count += 1;
      frequencyMap[dateKey].qty += d.delivered_qty;
    });

    const frequencyTimelineData = Object.values(frequencyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Quantities per line item
    const totalDeliveredQty = activeItemDeliveries.reduce((sum, d) => sum + (d.delivered_qty || 0), 0);
    const totalDeliveredAmount = activeItemDeliveries.reduce((sum, d) => sum + (d.delivered_qty * d.unit_price), 0);

    // Item breakdown for comparison chart
    let itemComparisonData: Array<{ name: string; ordered: number; delivered: number; unit: string }> = [];

    if (selectedOrderObj && selectedOrderObj.lines) {
      const linesToConsider = selectedItemDesignation === 'ALL'
        ? selectedOrderObj.lines
        : selectedOrderObj.lines.filter((l) => l.designation.toLowerCase() === selectedItemDesignation.toLowerCase());

      itemComparisonData = linesToConsider.map((line) => {
        const itemDelivered = orderDeliveries
          .filter((d) => d.designation?.toLowerCase() === line.designation?.toLowerCase())
          .reduce((sum, d) => sum + (d.delivered_qty || 0), 0);

        return {
          name: line.designation.length > 22 ? line.designation.substring(0, 22) + '...' : line.designation,
          ordered: line.qty,
          delivered: itemDelivered,
          unit: line.unite,
        };
      });
    }

    return {
      selectedOrderObj,
      orderDeliveries,
      activeItemDeliveries,
      totalDeliveredQty,
      totalDeliveredAmount,
      frequencyTimelineData,
      itemComparisonData,
    };
  }, [localOrders, filteredDeliveries, selectedDeliveryOrderId, selectedItemDesignation]);

  if (loading || !kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full mx-auto">
      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-sky-600" size={22} />
            <span>Tableau de Bord & Analytics Procurement</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Indicateurs clés de performance (KPIs) et suivi visuel des achats et réceptions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 w-full lg:w-auto">
          {/* Main Dashboard Mode Selector */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setDashboardMode('LOCAL')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                dashboardMode === 'LOCAL'
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={15} />
              <span>Commandes Locales</span>
            </button>

            <button
              onClick={() => setDashboardMode('FOREIGN')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                dashboardMode === 'FOREIGN'
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe size={15} />
              <span>Commandes Étrangères</span>
            </button>

            <button
              onClick={() => setDashboardMode('DELIVERIES')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                dashboardMode === 'DELIVERIES'
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck size={15} />
              <span>Livraisons</span>
            </button>
          </div>

          <button
            onClick={onOpenSqlModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-colors ml-auto lg:ml-0"
          >
            <Database size={15} className="text-slate-700" />
            <span>SQL Server Script</span>
          </button>
        </div>
      </div>

      {/* GLOBAL DATE FILTERING BAR (Default: Current Year & Current Month) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700 border border-sky-200 shrink-0">
            <Filter size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex flex-wrap items-center gap-2">
              <span>Filtre Période de Consultation</span>
              <span className="bg-sky-50 text-sky-700 text-[10px] px-2 py-0.5 rounded-full border border-sky-200 font-semibold">
                Par défaut : Mois et Année en cours
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Filtrer les KPIs, statistiques et graphiques par année et mois de création/livraison
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar size={14} className="text-sky-600" />
            <span className="text-[11px] text-slate-600 font-semibold">Année:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Toutes les années</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Clock size={14} className="text-sky-600" />
            <span className="text-[11px] text-slate-600 font-semibold">Mois:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {MONTHS_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {(selectedYear !== currentYearStr || selectedMonth !== currentMonthStr) && (
            <button
              onClick={() => {
                setSelectedYear(currentYearStr);
                setSelectedMonth(currentMonthStr);
              }}
              className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 underline underline-offset-2 ml-1"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* DELIVERIES MODE: ORDER & ITEM SELECTOR (NO VUE GLOBALE) */}
      {dashboardMode === 'DELIVERIES' && (
        <div className="bg-sky-50 rounded-2xl p-4 border border-sky-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-600 text-white shadow-xs">
                <Boxes size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                  Sélection Commande & Article pour Analyse des Livraisons
                </h3>
                <p className="text-[11px] text-sky-700 font-medium">
                  Choisissez une commande spécifique et un article pour afficher la fréquence et le suivi de livraison
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full md:w-[650px]">
              {/* Order Selector (No Vue Globale) */}
              <div>
                <label className="block text-[10px] font-bold text-sky-900 uppercase mb-1">
                  Commande Locale *
                </label>
                <SearchableSelect
                  options={localOrders.map((o) => ({
                    value: String(o.id),
                    label: `${o.n_order} - ${o.supplier_name || 'Fournisseur inconnu'}`,
                    subLabel: o.objet_de_commande,
                    badge: `${o.lines?.length || 0} art.`,
                  }))}
                  value={selectedDeliveryOrderId}
                  onChange={(val) => {
                    setSelectedDeliveryOrderId(String(val));
                    setSelectedItemDesignation('ALL'); // reset item choice on order change
                  }}
                  placeholder="Sélectionner une commande..."
                  searchPlaceholder="Rechercher par N° commande ou fournisseur..."
                />
              </div>

              {/* Item Selector */}
              <div>
                <label className="block text-[10px] font-bold text-sky-900 uppercase mb-1">
                  Article (Désignation)
                </label>
                <SearchableSelect
                  options={[
                    { value: 'ALL', label: 'Tous les articles de la commande' },
                    ...(deliveriesAnalytics.selectedOrderObj?.lines || []).map((line) => ({
                      value: line.designation,
                      label: line.designation,
                      subLabel: `Qté: ${formatQty(line.qty)} ${line.unite}`,
                      badge: `${formatAmount(line.unit_price)} DA`,
                    })),
                  ]}
                  value={selectedItemDesignation}
                  onChange={(val) => setSelectedItemDesignation(String(val))}
                  placeholder="Sélectionner un article..."
                  searchPlaceholder="Rechercher un article..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 1: LOCAL ORDERS DASHBOARD */}
      {dashboardMode === 'LOCAL' && (
        <div className="space-y-6">
          
          {/* Sub-View Switcher Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setLocalViewMode('kpis')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  localViewMode === 'kpis'
                    ? 'bg-sky-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <BarChart3 size={15} />
                <span>Synthèse Opérationnelle & Dépenses</span>
              </button>

              <button
                type="button"
                onClick={() => setLocalViewMode('iso_revue')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  localViewMode === 'iso_revue'
                    ? 'bg-indigo-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileCheck2 size={15} className="text-indigo-400" />
                <span>Revue de Processus Approvisionnements (Juin 2026)</span>
                <span className="bg-indigo-800 text-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Norme ISO SMS-05
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPrintReportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs cursor-pointer"
              >
                <Printer size={15} className="text-indigo-700" />
                <span>Imprimer Fiche Revue Officielle</span>
              </button>
            </div>
          </div>

          {/* VIEW 1.1: Standard Operational KPIs & Charts */}
          {localViewMode === 'kpis' && (
            <>
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Montant Total HT</span>
                    <TrendingUp size={18} className="text-sky-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {formatAmount(localAnalytics.totalHT)} <span className="text-xs font-semibold text-slate-500">DA</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Total TTC: <span className="font-bold text-slate-700 font-mono">{formatAmount(localAnalytics.totalTTC)} DA</span>
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Commandes</span>
                    <FileText size={18} className="text-slate-400" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {localAnalytics.totalOrders}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Période: {selectedMonth !== 'ALL' ? MONTHS_OPTIONS.find(m => m.value === selectedMonth)?.label : 'Année'} {selectedYear}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Disponibilité Stocks (OTD)</span>
                    <Clock size={18} className="text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono flex items-baseline gap-2">
                    <span>90 %</span>
                    <span className="text-xs text-slate-500 font-normal">(Cible: 100%)</span>
                  </div>
                  <p className="text-[11px] text-rose-600 font-semibold">
                    ⚠️ Écart -10% (Retard SARL SLR)
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Récapitulatif Statuts</span>
                    <CheckCircle2 size={18} className="text-sky-600" />
                  </div>
                  <div className="text-2xl font-black text-sky-700 font-mono">
                    {filteredLocalOrders.filter(o => o.status === 'Completed').length}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {filteredLocalOrders.filter(o => o.status !== 'Completed').length} Commandes non clôturées
                  </p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Suppliers Spend Bar Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Top Fournisseurs Locaux par Dépense (DA)</h3>
                      <p className="text-xs text-slate-500">Cumul des montants HT pour la période sélectionnée</p>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    {localAnalytics.topSuppliersData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={localAnalytics.topSuppliersData} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                          <Tooltip
                            formatter={(val: any) => [`${formatAmount(Number(val))} DA`, 'Total HT']}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                          />
                          <Bar dataKey="total" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        Aucune commande locale enregistrée pour cette période
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Breakdown Pie Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Statuts des Commandes</h3>
                    <p className="text-xs text-slate-500">Répartition par état de validation</p>
                  </div>

                  <div className="h-64 w-full">
                    {localAnalytics.statusChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={localAnalytics.statusChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={4}
                          >
                            {localAnalytics.statusChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val: any) => [val, 'Commandes']} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">Aucune donnée disponible</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VIEW 1.2: Revue de Processus Approvisionnements ISO (Juin 2026) */}
          {localViewMode === 'iso_revue' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-sky-900 text-white p-6 rounded-2xl shadow-sm border border-indigo-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-800/80 text-indigo-200 text-xs font-bold mb-2 border border-indigo-700">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span>Système de Management Intégré (SMI) • Session de Revue de Processus</span>
                    </div>
                    <h2 className="text-xl font-black tracking-tight">Revue de Processus Approvisionnements (Juin 2026)</h2>
                    <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                      Examen officiel des 12 indicateurs de performance, cibles contractuelles, respect des délais de passation et évaluation des prestataires clés.
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/20 text-right shrink-0">
                    <span className="block text-[11px] text-indigo-200 uppercase font-bold">Évaluation Globale Processus</span>
                    <span className="text-2xl font-black text-emerald-300">Niveau 3 / 3</span>
                    <span className="block text-[10px] text-indigo-200 mt-0.5">Grille E-PCS-O1-SMS-05</span>
                  </div>
                </div>
              </div>

              {/* 8 Process Objectives */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">
                      <CheckCircle2 size={16} />
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900">Présentation des 8 Objectifs du Processus Approvisionnements</h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold">Référence Norme ISO / SMI</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {[
                    { title: '1. Disponibilité des Stocks', desc: 'Assurer la disponibilité permanente des matières selon les délais convenus.' },
                    { title: '2. Réduction des Délais', desc: 'Optimiser les délais de passation (Achats, Lettres, Commandes et Marchés).' },
                    { title: '3. Conformité Fournisseurs', desc: 'Augmentation continue du taux de conformité des réceptions (Cible ≥ 98%).' },
                    { title: '4. Respect des Budgets', desc: 'Contrôle des coûts d’investissement et capex par rapport au budget alloué.' },
                    { title: '5. Optimisation des Coûts', desc: 'Maîtrise de l’évolution des coûts unitaires moyens des matières clés (≤ +10%).' },
                    { title: '6. Traitement des NC', desc: 'Traitement rapide et clôture des non-conformités détectées dans les délais (≥ 95%).' },
                    { title: '7. Couverture des Besoins', desc: 'Assurer la couverture optimale du stock sans surstockage (Cible ≤ 150%).' },
                    { title: '8. Fiabilité d’Inventaire', desc: 'Suivre et maintenir un écart d’inventaire annuel minimaliste (≤ 1%).' },
                  ].map((obj, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <span className="text-xs font-bold text-indigo-900 block">{obj.title}</span>
                      <p className="text-[11px] text-slate-600 leading-snug">{obj.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 12 Indicators Performance Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Clock size={16} className="text-indigo-600" />
                      <span>Examen des Résultats du Processus (12 Indicateurs Clés)</span>
                    </h3>
                    <p className="text-xs text-slate-500">Tableau officiel comparatif : Résultat mesuré, Cible, Écart et Analyse</p>
                  </div>
                  <span className="text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-lg">
                    Juin 2026
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-3 px-4 min-w-[280px]">Indicateur de Performance</th>
                        <th className="py-3 px-3 text-center min-w-[130px]">Résultat Mesuré</th>
                        <th className="py-3 px-3 text-center min-w-[100px]">Cible</th>
                        <th className="py-3 px-3 text-center min-w-[90px]">Écart</th>
                        <th className="py-3 px-4 min-w-[320px]">Analyse des Écarts / Commentaires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {[
                        {
                          indicateur: 'Taux de disponibilité des stocks selon délais convenus',
                          mesure: '90 %',
                          cible: '100%',
                          ecart: '-10%',
                          status: 'attention',
                          analyse: 'Écart dû au retard de livraison du fournisseur SARL SLR au cours du mois de juin, causé par un manque de matières premières et une panne de machine.',
                        },
                        {
                          indicateur: 'Délai moyen de traitement des achats (< 200 000 DA TTC)',
                          mesure: '7 jours ouvrables',
                          cible: '≤ 7 jours',
                          ecart: 'Conforme',
                          status: 'conforme',
                          analyse: 'Objectif atteint.',
                        },
                        {
                          indicateur: 'Délai moyen de traitement des lettres de commande (200 000 – 1 000 000 DA TTC)',
                          mesure: 'Aucune lettre de commande placée en juin 2026.',
                          cible: '≤ 20 jours',
                          ecart: '-',
                          status: 'conforme',
                          analyse: '-',
                        },
                        {
                          indicateur: 'Délai moyen de traitement des commandes (1 000 000 – 12 000 000 DA TTC)',
                          mesure: '6 JOURS',
                          cible: '≤ 30 jours',
                          ecart: '-24 jours',
                          status: 'conforme',
                          analyse: 'Objectif atteint.',
                        },
                        {
                          indicateur: 'Délai moyen de traitement des marchés nationaux (> 12 000 000 DA TTC)',
                          mesure: 'Aucun marché national placé en juin 2026.',
                          cible: '≤ 80 jours',
                          ecart: '-',
                          status: 'conforme',
                          analyse: 'Aucune procédure sur la période.',
                        },
                        {
                          indicateur: 'Délai moyen de traitement des marchés nationaux et internationaux (> 12 000 000 DA TTC)',
                          mesure: '22 JOURS',
                          cible: '≤ 90 jours',
                          ecart: '-68 JOURS',
                          status: 'conforme',
                          analyse: 'Objectif atteint.',
                        },
                        {
                          indicateur: 'Taux de conformité des livraisons',
                          mesure: '100 %',
                          cible: '≥ 98 %',
                          ecart: '+2 %',
                          status: 'conforme',
                          analyse: 'Objectif atteint.',
                        },
                        {
                          indicateur: 'Taux de traitement des produits non conformes dans les délais',
                          mesure: 'Aucune non-conformité n’a été signalée au cours du mois.',
                          cible: '≥ 95 %',
                          ecart: 'Conforme',
                          status: 'conforme',
                          analyse: 'Objectif atteint.',
                        },
                        {
                          indicateur: 'Écart entre le coût réel et le budget alloué (investissement)',
                          mesure: 'Aucun investissement n’a été réalisé durant le mois.',
                          cible: '≤ 10 %',
                          ecart: 'Conforme',
                          status: 'conforme',
                          analyse: 'Objectif atteint.',
                        },
                        {
                          indicateur: 'Évolution du coût unitaire moyen des matières clés',
                          mesure: 'Aucun changement du coût unitaire par rapport au mois précédent.',
                          cible: '≤ +10 %',
                          ecart: 'Conforme',
                          status: 'conforme',
                          analyse: 'Objectif atteint.',
                        },
                        {
                          indicateur: 'Taux de couverture du stock',
                          mesure: '93 %',
                          cible: '≤ 150 %',
                          ecart: '57 %',
                          status: 'conforme',
                          analyse: 'Objectif atteint.',
                        },
                        {
                          indicateur: 'Écart d’inventaire (annuel)',
                          mesure: 'Conforme aux tolérances d\'audit',
                          cible: '≤ 1 %',
                          ecart: 'Conforme',
                          status: 'conforme',
                          analyse: 'Objectif atteint.',
                        },
                      ].map((ind, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {ind.indicateur}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-extrabold text-indigo-900 bg-indigo-50/40">
                            {ind.mesure}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-700">
                            {ind.cible}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                              ind.status === 'conforme' 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {ind.ecart}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-xs leading-relaxed">
                            {ind.analyse}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Critical Alert Card */}
              <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 mb-1">
                    Analyse d'Écart Critique Documentée dans la Revue de Processus
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Le taux de disponibilité des stocks selon délais convenus est mesuré à <strong>90%</strong> (contre une cible de <strong>100%</strong>). 
                    L'écart de <strong>-10%</strong> est imputable au retard de livraison du fournisseur <strong>SARL SLR</strong> (commandes <em>S25/394L</em> et <em>S24/219L</em>), causé par un manque de matières premières et une panne de machine chez le prestataire.
                  </p>
                </div>
              </div>

              {/* Evaluated Key Suppliers Grid */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">Évaluation des Prestataires Externes (Grille E-PCS-O1-SMS-05)</h3>
                  </div>
                  <button
                    onClick={() => onNavigate('local-orders')}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 underline"
                  >
                    Voir détail complet dans Commandes Locales →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { name: 'SAIEG', ref: 'Contrat Cadre', score: 96, classe: 'A', app: 'Excellent' },
                    { name: 'ALBIS', ref: 'Fournisseur Matières', score: 96, classe: 'A', app: 'Excellent' },
                    { name: 'SIMONFOND SRL', ref: 'S26/05E', score: 94, classe: 'A', app: 'Excellent' },
                    { name: 'COPRS', ref: 'Convention Locale', score: 86, classe: 'A', app: 'Excellent' },
                    { name: 'SARL SLR', ref: 'S25/394L', score: 78, classe: 'B', app: 'Satisfaisant (Retard)' },
                    { name: 'SARL SLR', ref: 'S24/219L', score: 69, classe: 'B', app: 'Satisfaisant (Panne)' },
                  ].map((s, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{s.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">{s.ref}</span>
                        <span className="text-[10px] text-slate-600 mt-0.5 block">{s.app}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-slate-900 font-mono block">{s.score}/100</span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                          s.classe === 'A' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                        }`}>
                          Classe {s.classe}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Official Print Modal */}
          <PrintRevueProcessusReport
            isOpen={isPrintReportOpen}
            onClose={() => setIsPrintReportOpen(false)}
            periodeTitre="Juin 2026"
            participants={[
              { role: 'Le pilote du processus', nom: 'Mr BRAHIMI', present: true },
              { role: 'Le Co-pilote', nom: 'Mr HADJADJ', present: true },
              { role: 'Le Co-pilote', nom: 'Mr SAI', present: true },
              { role: 'Le directeur de production', nom: 'Mr FERDJALLAH', present: true },
              { role: 'Le responsable commercial', nom: 'Mr ABDERREZAK', present: true },
              { role: 'Le Responsable qualité', nom: 'Mr BENLOUCIF', present: true },
              { role: 'Le Responsable de la Réalisation des compteurs', nom: 'Mr AMRANE', present: true },
              { role: 'Le Responsable de la Fabrication des pièces Plastique', nom: 'Mr KRAOUCHI', present: true },
              { role: 'Le Responsable de la Maintenance', nom: 'Mr MENNOUR', present: true },
              { role: 'Autres : Magasinier', nom: 'Magasinier Central', present: true },
            ]}
            indicators={[
              {
                indicateur: 'Taux de disponibilité des stocks selon délais convenus',
                mesure: '90 %',
                cible: '100%',
                ecart: '-10%',
                status: 'attention',
                analyse: 'Écart dû au retard de livraison du fournisseur SARL SLR au cours du mois de juin, causé par un manque de matières premières et une panne de machine.',
              },
              {
                indicateur: 'Délai moyen de traitement des achats (< 200 000 DA TTC)',
                mesure: '7 jours ouvrables',
                cible: '≤ 7 jours',
                ecart: 'Conforme',
                status: 'conforme',
                analyse: 'Objectif atteint.',
              },
              {
                indicateur: 'Délai moyen de traitement des lettres de commande (200 000 – 1 000 000 DA TTC)',
                mesure: 'Aucune lettre de commande placée en juin 2026.',
                cible: '≤ 20 jours',
                ecart: '-',
                status: 'conforme',
                analyse: '-',
              },
              {
                indicateur: 'Délai moyen de traitement des commandes (1 000 000 – 12 000 000 DA TTC)',
                mesure: '6 JOURS',
                cible: '≤ 30 jours',
                ecart: '-24 jours',
                status: 'conforme',
                analyse: 'Objectif atteint.',
              },
              {
                indicateur: 'Délai moyen de traitement des marchés nationaux (> 12 000 000 DA TTC)',
                mesure: 'Aucun marché national placé en juin 2026.',
                cible: '≤ 80 jours',
                ecart: '-',
                status: 'conforme',
                analyse: 'Aucune procédure sur la période.',
              },
              {
                indicateur: 'Délai moyen de traitement des marchés nationaux et internationaux (> 12 000 000 DA TTC)',
                mesure: '22 JOURS',
                cible: '≤ 90 jours',
                ecart: '-68 JOURS',
                status: 'conforme',
                analyse: 'Objectif atteint.',
              },
              {
                indicateur: 'Taux de conformité des livraisons',
                mesure: '100 %',
                cible: '≥ 98 %',
                ecart: '+2 %',
                status: 'conforme',
                analyse: 'Objectif atteint.',
              },
              {
                indicateur: 'Taux de traitement des produits non conformes dans les délais',
                mesure: 'Aucune non-conformité n’a été signalée au cours du mois.',
                cible: '≥ 95 %',
                ecart: 'Conforme',
                status: 'conforme',
                analyse: 'Objectif atteint.',
              },
              {
                indicateur: 'Écart entre le coût réel et le budget alloué (investissement)',
                mesure: 'Aucun investissement n’a été réalisé durant le mois.',
                cible: '≤ 10 %',
                ecart: 'Conforme',
                status: 'conforme',
                analyse: 'Objectif atteint.',
              },
              {
                indicateur: 'Évolution du coût unitaire moyen des matières clés',
                mesure: 'Aucun changement du coût unitaire par rapport au mois précédent.',
                cible: '≤ +10 %',
                ecart: 'Conforme',
                status: 'conforme',
                analyse: 'Objectif atteint.',
              },
              {
                indicateur: 'Taux de couverture du stock',
                mesure: '93 %',
                cible: '≤ 150 %',
                ecart: '57 %',
                status: 'conforme',
                analyse: 'Objectif atteint.',
              },
              {
                indicateur: 'Écart d’inventaire (annuel)',
                mesure: 'Conforme aux tolérances d\'audit',
                cible: '≤ 1 %',
                ecart: 'Conforme',
                status: 'conforme',
                analyse: 'Objectif atteint.',
              },
            ]}
            supplierEvaluations={[
              {
                fournisseur: 'SAIEG',
                reference: 'Contrat Cadre',
                noteTechQualite: 30,
                noteDelais: 14,
                noteServicePrix: 12,
                noteAbsenceNC: 10,
                noteServiceClient: 10,
                noteLoisReglement: 10,
                noteReponseTel: 5,
                noteDocTech: 5,
                total: 96,
                classe: 'A',
                appreciation: 'Excellent',
              },
              {
                fournisseur: 'ALBIS',
                reference: 'Fournisseur Matières',
                noteTechQualite: 30,
                noteDelais: 14,
                noteServicePrix: 12,
                noteAbsenceNC: 10,
                noteServiceClient: 10,
                noteLoisReglement: 10,
                noteReponseTel: 5,
                noteDocTech: 5,
                total: 96,
                classe: 'A',
                appreciation: 'Excellent',
              },
              {
                fournisseur: 'SIMONFOND SRL',
                reference: 'S26/05E',
                noteTechQualite: 30,
                noteDelais: 15,
                noteServicePrix: 12,
                noteAbsenceNC: 9,
                noteServiceClient: 10,
                noteLoisReglement: 8,
                noteReponseTel: 5,
                noteDocTech: 5,
                total: 94,
                classe: 'A',
                appreciation: 'Excellent',
              },
              {
                fournisseur: 'COPRS',
                reference: 'Convention Locale',
                noteTechQualite: 25,
                noteDelais: 12,
                noteServicePrix: 14,
                noteAbsenceNC: 9,
                noteServiceClient: 8,
                noteLoisReglement: 10,
                noteReponseTel: 4,
                noteDocTech: 4,
                total: 86,
                classe: 'A',
                appreciation: 'Excellent',
              },
              {
                fournisseur: 'SARL SLR',
                reference: 'S25/394L',
                noteTechQualite: 25,
                noteDelais: 7,
                noteServicePrix: 12,
                noteAbsenceNC: 10,
                noteServiceClient: 8,
                noteLoisReglement: 10,
                noteReponseTel: 3,
                noteDocTech: 3,
                total: 78,
                classe: 'B',
                appreciation: 'Satisfaisant (Retard)',
              },
              {
                fournisseur: 'SARL SLR',
                reference: 'S24/219L',
                noteTechQualite: 20,
                noteDelais: 5,
                noteServicePrix: 12,
                noteAbsenceNC: 8,
                noteServiceClient: 8,
                noteLoisReglement: 10,
                noteReponseTel: 3,
                noteDocTech: 3,
                total: 69,
                classe: 'B',
                appreciation: 'Satisfaisant (Panne)',
              },
            ]}
            evaluationNote={3}
          />

        </div>
      )}

      {/* MODE 2: FOREIGN ORDERS DASHBOARD */}
      {dashboardMode === 'FOREIGN' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Volume Total EUR (€)</span>
                <DollarSign size={18} className="text-sky-600" />
              </div>
              <div className="text-2xl font-black text-sky-700 font-mono">
                €{foreignAnalytics.eurTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500">Fournisseurs internationaux en Euro</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Volume Total USD ($)</span>
                <DollarSign size={18} className="text-sky-600" />
              </div>
              <div className="text-2xl font-black text-sky-700 font-mono">
                ${foreignAnalytics.usdTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500">Fournisseurs internationaux en Dollar</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Commandes Étrangères</span>
                <Globe size={18} className="text-sky-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {foreignAnalytics.totalOrders}
              </div>
              <p className="text-[11px] text-slate-500">Période: {selectedYear}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Expéditions Actives</span>
                <Calendar size={18} className="text-slate-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {kpis.foreign.upcoming_etd_count}
              </div>
              <p className="text-[11px] text-slate-500">Prochains ETD/Suivi conteneurs</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Country Spend Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Montant par Pays de Provenance</h3>
                <p className="text-xs text-slate-500">Dépenses engagées par pays d'origine</p>
              </div>

              <div className="h-72 w-full">
                {foreignAnalytics.countryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={foreignAnalytics.countryChartData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip formatter={(val: any) => [`${formatAmount(Number(val))}`, 'Total Montant']} />
                      <Bar dataKey="amount" fill="#0284c7" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    Aucune commande étrangère pour cette période
                  </div>
                )}
              </div>
            </div>

            {/* Currency Breakdown Pie */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Répartition par Devise</h3>
                <p className="text-xs text-slate-500">Proportion des devises étrangères (EUR / USD)</p>
              </div>

              <div className="h-72 w-full">
                {foreignAnalytics.currencyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={foreignAnalytics.currencyChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {foreignAnalytics.currencyChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${formatAmount(Number(val))}`, 'Montant']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">Aucune donnée disponible</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: DELIVERIES DASHBOARD (SPECIFIC ORDER & ITEM + FREQUENCY CHART) */}
      {dashboardMode === 'DELIVERIES' && (
        <div className="space-y-6">
          {/* KPI Cards for Selected Order/Item */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre de Réceptions</span>
              <div className="text-3xl font-black text-sky-600 font-mono">
                {deliveriesAnalytics.activeItemDeliveries.length}
              </div>
              <p className="text-[11px] text-slate-500">Bons de livraison (BL) enregistrés</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Quantité Totale Livrée</span>
                <PackageCheck size={18} className="text-sky-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatQty(deliveriesAnalytics.totalDeliveredQty)}
              </div>
              <p className="text-[11px] text-slate-500">
                {selectedItemDesignation !== 'ALL' ? `Article: ${selectedItemDesignation}` : 'Cumul tous articles'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Valeur HT Livrée</span>
                <Truck size={18} className="text-sky-600" />
              </div>
              <div className="text-2xl font-black text-sky-700 font-mono">
                {formatAmount(deliveriesAnalytics.totalDeliveredAmount)} <span className="text-xs font-semibold text-slate-500">DA</span>
              </div>
              <p className="text-[11px] text-slate-500">Montant total réceptionné en magasin</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Fournisseur Commande</span>
                <CheckCircle2 size={18} className="text-sky-600" />
              </div>
              <div className="text-sm font-black text-slate-900 truncate">
                {deliveriesAnalytics.selectedOrderObj?.supplier_name || 'Non spécifié'}
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                N° BC: <span className="font-bold text-sky-700">{deliveriesAnalytics.selectedOrderObj?.n_order}</span>
              </p>
            </div>
          </div>

          {/* DELIVERY FREQUENCY & QUANTITY TIMELINE CHART */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity size={18} className="text-sky-600" />
                  <span>Fréquence des Livraisons & Volumes dans le Temps</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Évolution des réceptions par date pour {deliveriesAnalytics.selectedOrderObj?.n_order}{' '}
                  {selectedItemDesignation !== 'ALL' ? `(Article: ${selectedItemDesignation})` : ''}
                </p>
              </div>

              {selectedItemDesignation !== 'ALL' && (
                <span className="px-3 py-1 bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold rounded-lg">
                  Filtre Article: {selectedItemDesignation}
                </span>
              )}
            </div>

            <div className="h-72 w-full">
              {deliveriesAnalytics.frequencyTimelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={deliveriesAnalytics.frequencyTimelineData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        name === 'qty' ? `${formatQty(Number(val))}` : `${val} BL`,
                        name === 'qty' ? 'Qté Livrée' : 'Nombre de livraisons',
                      ]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="qty" name="Qté Livrée par Date" stroke="#10b981" fillOpacity={1} fill="url(#colorQty)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Aucune livraison enregistrée pour cette commande / cet article pendant la période sélectionnée
                </div>
              )}
            </div>
          </div>

          {/* Delivery Quantities per Line Item Comparison Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Comparatif Quantités Commandées vs Quantités Livrées par Article
              </h3>
              <p className="text-xs text-slate-500">Taux de réalisation pour chaque poste de la commande</p>
            </div>

            <div className="h-72 w-full">
              {deliveriesAnalytics.itemComparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliveriesAnalytics.itemComparisonData} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" angle={-20} textAnchor="end" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        `${formatQty(Number(val))}`,
                        name === 'ordered' ? 'Qté Commandée' : 'Qté Livrée',
                      ]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="ordered" name="Qté Commandée" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="delivered" name="Qté Livrée" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Aucun article trouvé pour la commande sélectionnée
                </div>
              )}
            </div>
          </div>

          {/* Detailed Item Fulfillment Breakdown Table */}
          {deliveriesAnalytics.selectedOrderObj && deliveriesAnalytics.selectedOrderObj.lines && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <PackageCheck size={16} className="text-sky-400" />
                  <span>Détail d'avancement des articles - {deliveriesAnalytics.selectedOrderObj.n_order}</span>
                </h4>
                <span className="text-xs text-slate-300">
                  {deliveriesAnalytics.selectedOrderObj.lines.length} Position(s) au total
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-center">N°</th>
                      <th className="px-4 py-3">Désignation</th>
                      <th className="px-4 py-3 text-right">Qté Commandée</th>
                      <th className="px-4 py-3 text-right">Qté Livrée</th>
                      <th className="px-4 py-3 text-right">Prix Unit. HT (DA)</th>
                      <th className="px-4 py-3 text-center">Avancement (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {deliveriesAnalytics.selectedOrderObj.lines.map((line, idx) => {
                      const delivered = deliveriesAnalytics.orderDeliveries
                        .filter((d) => d.designation?.toLowerCase() === line.designation?.toLowerCase())
                        .reduce((sum, d) => sum + d.delivered_qty, 0);

                      const percent = line.qty > 0 ? Math.min(Math.round((delivered / line.qty) * 100), 100) : 0;
                      const isComplete = percent >= 100;
                      const isSelected = selectedItemDesignation !== 'ALL' && selectedItemDesignation.toLowerCase() === line.designation.toLowerCase();

                      return (
                        <tr key={idx} className={`transition-colors ${isSelected ? 'bg-sky-50/60 font-semibold' : 'hover:bg-slate-50'}`}>
                          <td className="px-4 py-3.5 text-center font-bold font-mono text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                            <span>{line.designation}</span>
                            {isSelected && (
                              <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.5 rounded font-mono font-normal">
                                Sélectionné
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-700">{formatQty(line.qty)} {line.unite}</td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-sky-700">{formatQty(delivered)} {line.unite}</td>
                          <td className="px-4 py-3.5 text-right font-mono">{formatAmount(line.unit_price)} DA</td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${isComplete ? 'bg-sky-600' : 'bg-sky-400'}`}
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                              <span className={`font-mono text-[11px] font-bold ${isComplete ? 'text-sky-700' : 'text-slate-600'}`}>
                                {percent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
