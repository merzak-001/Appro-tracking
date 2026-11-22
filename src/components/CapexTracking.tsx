import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Printer, 
  Download, 
  Calendar,
  Factory,
  Laptop,
  Armchair,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Database,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Globe,
  Calculator,
  Eye,
  Check,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { CapexItem, CapexCategory, CapexStatus, User } from '../types';
import { CapexModal } from './CapexModal';
import { PrintCapexReport } from './PrintCapexReport';
import { DatabaseExplorer } from './DatabaseExplorer';

interface CapexTrackingProps {
  currentUser: User;
}

export const DEFAULT_CAPEX_2026: CapexItem[] = [
  { 
    id: 1, 
    year: 2026, 
    name: "Moule Boitier d'injection", 
    category: 'Industriel', 
    budget_amount: 18000000, 
    engaged_amount: 18000000, 
    engagement_pct: 100, 
    realized_amount: 18500000, 
    realization_pct: 102.8, 
    status: 'Réalisé', 
    is_realized_confirmed: true,
    expected_delivery_date: '2026-03-15', 
    observation: "Importation avec frais d'approche (Fret, Douane & Transit)",
    origin_type: 'Étranger',
    currency: 'EUR',
    exchange_rate: 245.00,
    base_currency_amount: 50000,
    customs_duty_type: 'percentage',
    customs_duty_value: 30,
    freight_amount: 1575000,
    other_approach_costs: [
      { id: "app-1", capex_id: 1, designation: "Assurance & Honoraires Transitnaire Port d'Alger", amount: 500000 }
    ],
    total_approach_cost: 5750000
  },
  { id: 2, year: 2026, name: "Moule Pignon XN5", category: 'Industriel', budget_amount: 12000000, engaged_amount: 12000000, engagement_pct: 100, realized_amount: 12300000, realization_pct: 102.5, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-04-10', observation: "Frais de port maritimes inclus" },
  { id: 3, year: 2026, name: "Moule Roue d'indexage", category: 'Industriel', budget_amount: 12000000, engaged_amount: 12000000, engagement_pct: 100, realized_amount: 12000000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-04-10', observation: "Reçu et conforme" },
  { id: 4, year: 2026, name: "Moule turbine 274 T1", category: 'Industriel', budget_amount: 11000000, engaged_amount: 11000000, engagement_pct: 100, realized_amount: 11400000, realization_pct: 103.6, status: 'En Douane', is_realized_confirmed: false, expected_delivery_date: '2026-08-20', observation: "En dédouanement Port d'Alger" },
  { id: 5, year: 2026, name: "Moule HRI", category: 'Industriel', budget_amount: 10000000, engaged_amount: 10000000, engagement_pct: 100, realized_amount: 10000000, realization_pct: 100, status: 'Engagé', is_realized_confirmed: false, expected_delivery_date: '2026-09-15', observation: "Commande validée avec fournisseur" },
  { id: 6, year: 2026, name: "Banc Primates PT25", category: 'Industriel', budget_amount: 40000000, engaged_amount: 40000000, engagement_pct: 100, realized_amount: 41200000, realization_pct: 103.0, status: 'En Douane', is_realized_confirmed: false, expected_delivery_date: '2026-09-30', observation: "Banc d'essai haute précision" },
  { id: 7, year: 2026, name: "Banc réglage Qmax reg 25 avec réservoir séparer", category: 'Industriel', budget_amount: 5000000, engaged_amount: 5000000, engagement_pct: 100, realized_amount: 5000000, realization_pct: 100, status: 'Engagé', is_realized_confirmed: false, expected_delivery_date: '2026-10-15', observation: "En cours d'assemblage usine" },
  { id: 8, year: 2026, name: "Aspirateur matière plastique", category: 'Industriel', budget_amount: 5000000, engaged_amount: 5000000, engagement_pct: 100, realized_amount: 5000000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-05-10', observation: "Installé sur ligne d'injection" },
  { id: 9, year: 2026, name: "Pompe 400 V 50HZ 5,5 KW 2910 t/m Q(l/min) 100-500 H(m) 65-22 T 30 °C", category: 'Industriel', budget_amount: 2000000, engaged_amount: 2000000, engagement_pct: 100, realized_amount: 2000000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-02-18', observation: "Pompe industrielle haute capacité" },
  { id: 10, year: 2026, name: "Vanne de décharge DN 50 PN16", category: 'Industriel', budget_amount: 700000, engaged_amount: 700000, engagement_pct: 100, realized_amount: 700000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-01-25', observation: "Livrée et installée" },
  { id: 11, year: 2026, name: "Regloplas", category: 'Industriel', budget_amount: 9000000, engaged_amount: 9000000, engagement_pct: 100, realized_amount: 9250000, realization_pct: 102.8, status: 'En Douane', is_realized_confirmed: false, expected_delivery_date: '2026-09-05', observation: "Thermorégulateur moules" },
  { id: 12, year: 2026, name: "Mélangeur matière plastique", category: 'Industriel', budget_amount: 2000000, engaged_amount: 2000000, engagement_pct: 100, realized_amount: 2000000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-04-05', observation: "Opérationnel atelier d'injection" },
  { id: 13, year: 2026, name: "Presse pneumatique", category: 'Industriel', budget_amount: 4000000, engaged_amount: 4000000, engagement_pct: 100, realized_amount: 4000000, realization_pct: 100, status: 'Engagé', is_realized_confirmed: false, expected_delivery_date: '2026-10-01', observation: "Presse de précision" },
  { id: 14, year: 2026, name: "Chaine d'assemblage et approbation MID pour compteur 420+", category: 'Industriel', budget_amount: 60000000, engaged_amount: 60000000, engagement_pct: 100, realized_amount: 0, realization_pct: 0, status: 'Engagé', is_realized_confirmed: false, expected_delivery_date: '2026-11-30', observation: "Ligne principale MID 420+" },
  { id: 15, year: 2026, name: "Gerber semi électrique 1,5T", category: 'Utilités & Manutention', budget_amount: 450000, engaged_amount: 450000, engagement_pct: 100, realized_amount: 450000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-03-20', observation: "Gerbeur dépôt central" },
  { id: 16, year: 2026, name: "Transpalette", category: 'Utilités & Manutention', budget_amount: 140000, engaged_amount: 140000, engagement_pct: 100, realized_amount: 140000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-02-10', observation: "Transpalette manuel 2.5T" },
  { id: 17, year: 2026, name: "Véhicule utilitaire", category: 'Utilités & Manutention', budget_amount: 10000000, engaged_amount: 10000000, engagement_pct: 100, realized_amount: 10000000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-06-15', observation: "Fourgon de service et livraison" },
  { id: 18, year: 2026, name: "Machine de cerclage", category: 'Utilités & Manutention', budget_amount: 500000, engaged_amount: 500000, engagement_pct: 100, realized_amount: 500000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-04-18', observation: "Cerclage automatique palettes" },
  { 
    id: 19, 
    year: 2026, 
    name: "Pc portable", 
    category: 'Matériel Informatique', 
    budget_amount: 900000, 
    engaged_amount: 680000, 
    engagement_pct: 100, 
    realized_amount: 680000, 
    realization_pct: 100, 
    status: 'Réalisé', 
    is_realized_confirmed: true,
    expected_delivery_date: '2026-02-28', 
    observation: "Laptops professionnels & imprimante en sous-achat",
    sub_items: [
      { id: "sub-2", capex_id: 19, designation: "Imprimante Laser Couleur Multifonction", amount: 220000, realized_amount: 220000, is_realized: true, qty: 1, unit_price: 220000, date: "2026-02-28", notes: "Acquis sur solde budget restant PC" }
    ]
  },
  { id: 20, year: 2026, name: "Système de télé-surveillance", category: 'Matériel Informatique', budget_amount: 3000000, engaged_amount: 3000000, engagement_pct: 100, realized_amount: 3000000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-05-30', observation: "Caméras IP & NVR Usine" },
  { id: 21, year: 2026, name: "Appareil photos", category: 'Matériel Informatique', budget_amount: 180000, engaged_amount: 180000, engagement_pct: 100, realized_amount: 180000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-01-15', observation: "Contrôle qualité & documentation" },
  { id: 22, year: 2026, name: "Écran 24 pouces", category: 'Matériel Informatique', budget_amount: 100000, engaged_amount: 100000, engagement_pct: 100, realized_amount: 100000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-02-05', observation: "Écrans Full HD bureaux" },
  { id: 23, year: 2026, name: "Impriment Multi fonction (photocopie/scanner/impression)", category: 'Matériel Informatique', budget_amount: 220000, engaged_amount: 220000, engagement_pct: 100, realized_amount: 220000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-03-12', observation: "Imprimante réseau multifonction" },
  { id: 24, year: 2026, name: "Armoire vestiaires", category: 'Mobilier', budget_amount: 1800000, engaged_amount: 1800000, engagement_pct: 100, realized_amount: 1800000, realization_pct: 100, status: 'Réalisé', is_realized_confirmed: true, expected_delivery_date: '2026-04-01', observation: "Vestiaires métalliques personnel" }
];

export const CapexTracking: React.FC<CapexTrackingProps> = ({ currentUser }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [viewMode, setViewMode] = useState<'dashboard' | 'doc_grid' | 'db_table'>('dashboard');
  
  const loadInitialItems = (): CapexItem[] => {
    try {
      const cached = localStorage.getItem('CAPEX_CACHE_2026');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_CAPEX_2026;
  };

  const [items, setItems] = useState<CapexItem[]>(loadInitialItems);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CapexItem | null>(null);
  const [expandedItemIds, setExpandedItemIds] = useState<number[]>([19]);
  const [tableLayoutMode, setTableLayoutMode] = useState<'split' | 'unified'>('split');

  const toggleExpandRow = (id: number) => {
    setExpandedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isCategoryMatch = (itemCat: string, secCat: string): boolean => {
    if (!itemCat || !secCat) return false;
    const c1 = itemCat.toLowerCase().trim();
    const c2 = secCat.toLowerCase().trim();
    if (c1 === c2) return true;
    if (c1.includes('indus') && c2.includes('indus')) return true;
    if ((c1.includes('info') || c1.includes('informatique')) && (c2.includes('info') || c2.includes('informatique'))) return true;
    if ((c1.includes('util') || c1.includes('manut') || c1.includes('transport')) && (c2.includes('util') || c2.includes('manut') || c2.includes('transport'))) return true;
    if ((c1.includes('mobi') || c1.includes('meuble')) && (c2.includes('mobi') || c2.includes('meuble'))) return true;
    return false;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const canEdit = currentUser.role === 'Appro' || currentUser.role === 'Admin';

  const fetchCapexItems = async (year: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/capex?year=${year}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setItems(data);
          try {
            localStorage.setItem('CAPEX_CACHE_2026', JSON.stringify(data));
          } catch (e) {}
          const withSub = data.filter((i: CapexItem) => i.sub_items && i.sub_items.length > 0).map((i: CapexItem) => Number(i.id));
          setExpandedItemIds(withSub);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to fetch CAPEX items from API, using fallback:', e);
    } finally {
      setLoading(false);
    }

    // Always fallback to cached items or DEFAULT_CAPEX_2026
    const activeList = loadInitialItems();
    setItems(activeList);
    const withSub = activeList.filter((i) => i.sub_items && i.sub_items.length > 0).map((i) => Number(i.id));
    setExpandedItemIds(withSub);
  };

  useEffect(() => {
    fetchCapexItems(selectedYear);
  }, [selectedYear]);

  const handleSaveSuccess = (savedItem?: CapexItem) => {
    if (savedItem) {
      setItems((prevItems) => {
        const idx = prevItems.findIndex((i) => Number(i.id) === Number(savedItem.id));
        let updated: CapexItem[];
        if (idx !== -1) {
          updated = [...prevItems];
          updated[idx] = savedItem;
        } else {
          updated = [...prevItems, savedItem];
        }
        try {
          localStorage.setItem('CAPEX_CACHE_2026', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      // Also update DEFAULT_CAPEX_2026 fallback array in memory
      const defIdx = DEFAULT_CAPEX_2026.findIndex((i) => Number(i.id) === Number(savedItem.id));
      if (defIdx !== -1) {
        DEFAULT_CAPEX_2026[defIdx] = savedItem;
      } else {
        DEFAULT_CAPEX_2026.push(savedItem);
      }

      if (savedItem.id && !expandedItemIds.includes(Number(savedItem.id))) {
        setExpandedItemIds((prev) => [...prev, Number(savedItem.id)]);
      }
    }
  };

  // Quick toggle main equipment realization confirmation in drawer
  const handleToggleMainRealization = async (itemId: number) => {
    const target = items.find((i) => Number(i.id) === Number(itemId));
    if (!target) return;
    const currentConfirmed = target.is_realized_confirmed === true || (target.is_realized_confirmed === undefined && target.status === 'Réalisé');
    const nextConfirmed = !currentConfirmed;
    
    const updatedItem: CapexItem = {
      ...target,
      is_realized_confirmed: nextConfirmed,
      realized_amount: nextConfirmed && (!target.realized_amount || target.realized_amount === 0)
        ? (target.engaged_amount || target.budget_amount)
        : (target.realized_amount || target.engaged_amount),
    };
    handleSaveSuccess(updatedItem);

    try {
      await fetch(`/api/capex/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
      });
    } catch (e) {
      console.warn('API sync warning:', e);
    }
  };

  // Quick toggle sub-item realization confirmation in drawer
  const handleToggleSubItemRealization = async (itemId: number, subIdx: number) => {
    const target = items.find((i) => Number(i.id) === Number(itemId));
    if (!target || !target.sub_items || !target.sub_items[subIdx]) return;
    
    const updatedSubItems = target.sub_items.map((sub, idx) => {
      if (idx === subIdx) {
        return { ...sub, is_realized: !sub.is_realized };
      }
      return sub;
    });

    const updatedItem: CapexItem = {
      ...target,
      sub_items: updatedSubItems,
    };
    handleSaveSuccess(updatedItem);

    try {
      await fetch(`/api/capex/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
      });
    } catch (e) {
      console.warn('API sync warning:', e);
    }
  };

  const handleOpenNewModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: CapexItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet investissement CAPEX ?')) return;
    try {
      const res = await fetch(`/api/capex/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prevItems) => {
          const updated = prevItems.filter((i) => Number(i.id) !== Number(id));
          try {
            localStorage.setItem('CAPEX_CACHE_2026', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        const defIdx = DEFAULT_CAPEX_2026.findIndex((i) => Number(i.id) === Number(id));
        if (defIdx !== -1) {
          DEFAULT_CAPEX_2026.splice(defIdx, 1);
        }
      } else {
        alert('Erreur lors de la suppression de l\'investissement.');
      }
    } catch (e) {
      console.error('Error deleting CAPEX item:', e);
      setItems((prevItems) => {
        const updated = prevItems.filter((i) => Number(i.id) !== Number(id));
        try {
          localStorage.setItem('CAPEX_CACHE_2026', JSON.stringify(updated));
        } catch (err) {}
        return updated;
      });
    }
  };

  // Export to Excel / CSV with UTF-8 BOM
  const handleExportExcel = () => {
    const headers = [
      'Année',
      'Équipement / Investissement',
      'Catégorie',
      'Budget Initial (KDA)',
      'Montant Engagé (KDA)',
      '% Engagement',
      'Montant Réalisé Confirmé (KDA)',
      '% Réalisation',
      'Statut',
      'Date Prevue Livraison',
      'Observation',
    ];

    const rows = filteredItems.map((i) => {
      const totals = getItemTotals(i);
      return [
        i.year,
        `"${i.name.replace(/"/g, '""')}"`,
        `"${i.category}"`,
        i.budget_amount,
        totals.engaged,
        `${totals.engPct}%`,
        totals.realized,
        `${totals.realPct}%`,
        `"${i.status}"`,
        `"${i.expected_delivery_date || ''}"`,
        `"${(i.observation || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CAPEX_Investissements_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryPriority = (cat?: string): number => {
    if (!cat) return 99;
    const c = cat.toLowerCase().trim();
    if (c.includes('indus')) return 1;
    if (c.includes('util') || c.includes('manut') || c.includes('transport')) return 2;
    if (c.includes('info') || c.includes('informatique')) return 3;
    if (c.includes('mobi') || c.includes('meuble')) return 4;
    return 5;
  };

  const sortCapexItems = (list: CapexItem[]): CapexItem[] => {
    return [...list].sort((a, b) => {
      const catA = getCategoryPriority(a.category);
      const catB = getCategoryPriority(b.category);
      if (catA !== catB) return catA - catB;
      if (a.created_at && b.created_at) {
        const tA = new Date(a.created_at).getTime();
        const tB = new Date(b.created_at).getTime();
        if (!isNaN(tA) && !isNaN(tB) && tA !== tB) return tA - tB;
      }
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });
  };

  // Filter & Sort Items by Category and Order of Creation
  const filteredItems = sortCapexItems(
    items.filter((item) => {
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.observation && item.observation.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesCategory && matchesStatus && matchesSearch;
    })
  );

  // Helper to compute combined item totals with strict realization confirmation
  const getItemTotals = (item: CapexItem) => {
    if (item.status === 'Annulé') {
      return { 
        subItemsSum: 0, 
        subItemsEngaged: 0, 
        subItemsRealized: 0, 
        engaged: 0, 
        realized: 0, 
        engPct: 0, 
        realPct: 0,
        isMainConfirmed: false,
        confirmedSubCount: 0,
        totalSubCount: 0
      };
    }

    const subItemsEngaged = (item.sub_items && item.sub_items.length > 0)
      ? item.sub_items.reduce((s, sub) => s + (sub.amount || 0), 0)
      : 0;

    const confirmedSubCount = (item.sub_items && item.sub_items.length > 0)
      ? item.sub_items.filter((sub) => sub.is_realized === true).length
      : 0;
    const totalSubCount = item.sub_items ? item.sub_items.length : 0;

    const subItemsRealized = (item.sub_items && item.sub_items.length > 0)
      ? item.sub_items.reduce((s, sub) => {
          if (sub.is_realized === true) {
            const subRealAmt = (sub.realized_amount !== undefined && sub.realized_amount !== null && sub.realized_amount > 0)
              ? sub.realized_amount
              : (sub.amount || 0);
            return s + subRealAmt;
          }
          return s;
        }, 0)
      : 0;

    const baseEng = item.engaged_amount || 0;

    // Main equipment is realized ONLY if explicitly confirmed or status === 'Réalisé'
    const isMainConfirmed = item.is_realized_confirmed === true || (item.is_realized_confirmed === undefined && item.status === 'Réalisé');
    const mainRealizedAmount = (item.realized_amount !== undefined && item.realized_amount !== null && item.realized_amount > 0)
      ? item.realized_amount
      : baseEng;
    const mainRealized = isMainConfirmed ? mainRealizedAmount : 0;

    const engaged = baseEng + subItemsEngaged;
    const realized = mainRealized + subItemsRealized;

    const budget = item.budget_amount || 0;
    const engPct = budget > 0 ? Number(((engaged / budget) * 100).toFixed(1)) : 0;
    const realPct = budget > 0 ? Number(((realized / budget) * 100).toFixed(1)) : 0;

    return { 
      subItemsSum: subItemsEngaged, 
      subItemsEngaged, 
      subItemsRealized, 
      engaged, 
      realized, 
      engPct, 
      realPct,
      isMainConfirmed,
      confirmedSubCount,
      totalSubCount
    };
  };

  // Active non-cancelled items for KPI & Category calculations
  const activeItems = filteredItems.filter((i) => i.status !== 'Annulé');

  // Calculate Aggregates for Selected Year (Excluding 'Annulé')
  const totalBudget = activeItems.reduce((sum, i) => sum + (i.budget_amount || 0), 0);
  const totalEngaged = activeItems.reduce((sum, i) => sum + getItemTotals(i).engaged, 0);
  const totalRealized = activeItems.reduce((sum, i) => sum + getItemTotals(i).realized, 0);
  const totalBalance = totalBudget - totalRealized;
  const overallEngPct = totalBudget > 0 ? Number(((totalEngaged / totalBudget) * 100).toFixed(1)) : 0;
  const overallRealPct = totalBudget > 0 ? Number(((totalRealized / totalBudget) * 100).toFixed(1)) : 0;

  // Category Aggregates
  const categoriesList: { name: CapexCategory; icon: any; color: string; bg: string }[] = [
    { name: 'Industriel', icon: Factory, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
    { name: 'Matériel Informatique', icon: Laptop, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
    { name: 'Mobilier', icon: Armchair, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { name: 'Utilités & Manutention', icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  ];

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatMoney = (val: number) => {
    return val.toLocaleString('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatKDA = (valDZD: number) => {
    if (!valDZD || isNaN(valDZD)) return '0 KDA';
    const kda = valDZD / 1000;
    return kda.toLocaleString('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' KDA';
  };

  const getStatusBadge = (status: CapexStatus) => {
    switch (status) {
      case 'Planifié':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
            <Clock size={11} className="shrink-0 text-slate-500" />
            <span>Planifié</span>
          </span>
        );
      case 'Engagé':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-sky-100 text-sky-800 border border-sky-300 whitespace-nowrap">
            <Clock size={11} className="shrink-0 text-sky-600" />
            <span>Engagé</span>
          </span>
        );
      case 'En Douane':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
            <AlertTriangle size={11} className="shrink-0 text-amber-600" />
            <span>En Douane</span>
          </span>
        );
      case 'Réalisé':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 whitespace-nowrap">
            <CheckCircle2 size={11} className="shrink-0 text-emerald-600" />
            <span>Réalisé</span>
          </span>
        );
      case 'Annulé':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap">
            <AlertTriangle size={11} className="shrink-0 text-rose-600" />
            <span>Annulé</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full mx-auto">
      {/* HEADER & YEAR FILTER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Suivi Budgétaire CAPEX ({selectedYear})</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                {filteredItems.length} Projets
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Plan de Charge des Investissements & Équipements — Valeurs affichées en <strong className="text-slate-800 font-bold">KDA (Kilo Dinar)</strong>
            </p>
          </div>
        </div>

        {/* YEAR SELECTOR & ACTIONS */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Filter */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <Calendar size={16} className="text-slate-500 ml-2" />
            <span className="text-xs font-bold text-slate-600">Année :</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs font-black text-slate-900 bg-white rounded-lg border border-slate-300 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y} {y === currentYear ? '📍 (En cours)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Export Buttons */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors shadow-2xs"
          >
            <FileSpreadsheet size={15} className="text-emerald-700" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs"
          >
            <Printer size={15} className="text-emerald-400" />
            <span>Rapport PDF</span>
          </button>

          {canEdit && (
            <button
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors shrink-0"
            >
              <Plus size={16} />
              <span>Nouveau Projet CAPEX</span>
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Budget Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Budget Alloué ({selectedYear})</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 font-mono">{formatKDA(totalBudget)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Budget total d'investissements voté</p>
        </div>

        {/* Card 2: Montant Engagé */}
        <div className="bg-white p-4 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wide">Montant Engagé (Commandé)</span>
            <span className="px-2 py-0.5 text-xs font-black rounded bg-sky-100 text-sky-900">{overallEngPct}%</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-sky-950 font-mono">{formatKDA(totalEngaged)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div className="bg-sky-600 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(overallEngPct, 100)}%` }} />
          </div>
        </div>

        {/* Card 3: Montant Réalisé (Confirmé Réel) */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Réalisé Confirmé (Déboursé)</span>
            <span className="px-2 py-0.5 text-xs font-black rounded bg-emerald-100 text-emerald-900">{overallRealPct}%</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-emerald-950 font-mono">{formatKDA(totalRealized)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div className="bg-emerald-600 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(overallRealPct, 100)}%` }} />
          </div>
        </div>

        {/* Card 4: Solde Budget Restant */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Solde Budget Restant</span>
          <div className="mt-2">
            <span className={`text-xl font-black font-mono ${totalBalance >= 0 ? 'text-amber-950' : 'text-rose-600'}`}>
              {formatKDA(totalBalance)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {totalBalance >= 0 ? 'Budget disponible non encore déboursé' : '⚠️ Dépassement budgétaire avec frais d\'approche'}
          </p>
        </div>
      </div>

      {/* CATEGORY BREAKDOWN CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {categoriesList.map((cat) => {
          const catItems = activeItems.filter((i) => i.category === cat.name);
          const catBudget = catItems.reduce((sum, i) => sum + (i.budget_amount || 0), 0);
          const catEngaged = catItems.reduce((sum, i) => sum + getItemTotals(i).engaged, 0);
          const catRealized = catItems.reduce((sum, i) => sum + getItemTotals(i).realized, 0);
          const catEngPct = catBudget > 0 ? Number(((catEngaged / catBudget) * 100).toFixed(1)) : 0;
          const catRealPct = catBudget > 0 ? Number(((catRealized / catBudget) * 100).toFixed(1)) : 0;
          const Icon = cat.icon;

          return (
            <button
              key={cat.name}
              onClick={() => setCategoryFilter(categoryFilter === cat.name ? 'ALL' : cat.name)}
              className={`p-3.5 rounded-xl border text-left transition-all ${cat.bg} ${
                categoryFilter === cat.name ? 'ring-2 ring-emerald-500 shadow-xs scale-[1.01]' : 'hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={18} className={cat.color} />
                  <span className="text-xs font-bold text-slate-900">{cat.name}</span>
                </div>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-white/80 border border-slate-200">
                  {catItems.length} proj.
                </span>
              </div>

              <div className="mt-2.5 space-y-1 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-sans font-medium">Budget:</span>
                  <span className="font-extrabold text-slate-900">{formatKDA(catBudget)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sky-700 font-sans font-bold">Engagé:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-sky-950">{formatKDA(catEngaged)}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-sky-100 text-sky-800">
                      {catEngPct}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700 font-sans font-bold">Réalisé:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-emerald-950">{formatKDA(catRealized)}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                      {catRealPct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.min(catRealPct, 100)}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Pills */}
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              categoryFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Toutes Catégories ({items.length})
          </button>
          {categoriesList.map((c) => (
            <button
              key={c.name}
              onClick={() => setCategoryFilter(c.name)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                categoryFilter === c.name
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Layout View Switcher & Search */}
        <div className="flex flex-wrap items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setTableLayoutMode('split')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                tableLayoutMode === 'split'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Afficher les tableaux séparés par catégorie"
            >
              <LayoutGrid size={14} />
              <span>Par Catégories</span>
            </button>
            <button
              onClick={() => setTableLayoutMode('unified')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                tableLayoutMode === 'unified'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Afficher tous les équipements dans un tableau général unique"
            >
              <Database size={14} />
              <span>Tableau Général ({filteredItems.length})</span>
            </button>
          </div>

          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher équipement..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* CAPEX DATA TABLES DISPLAY */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
          Chargement du tableau CAPEX...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <TrendingUp size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-medium">Aucun projet d'investissement trouvé pour {selectedYear}</p>
        </div>
      ) : tableLayoutMode === 'unified' ? (
        /* UNIFIED MASTER TABLE SHOWING ALL ITEMS IN ONE PLACE */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database size={20} className="text-emerald-400" />
              <h3 className="font-extrabold text-sm text-white tracking-tight">Tableau Général de Tous les Équipements ({filteredItems.length})</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono font-bold">
              <span>Budget : <span className="text-emerald-300">{formatKDA(totalBudget)}</span></span>
              <span>|</span>
              <span>Engagé : <span className="text-sky-300">{formatKDA(totalEngaged)}</span></span>
              <span>|</span>
              <span>Réalisé : <span className="text-emerald-300">{formatKDA(totalRealized)}</span></span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-extrabold text-slate-800">Équipement / Investissement</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3 text-right">Budget Alloué (KDA)</th>
                  <th className="px-4 py-3 text-right">Montant Engagé (KDA)</th>
                  <th className="px-4 py-3 text-center">% Eng.</th>
                  <th className="px-4 py-3 text-right">Réalisé Confirmé (KDA)</th>
                  <th className="px-4 py-3 text-center">% Réal.</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3">Livraison Prévisible</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedItems.map((item) => {
                  const isExpanded = expandedItemIds.includes(item.id);
                  const hasSubItems = item.sub_items && item.sub_items.length > 0;
                  const { subItemsSum, engaged, realized, engPct, realPct, isMainConfirmed, confirmedSubCount, totalSubCount } = getItemTotals(item);

                  return (
                    <React.Fragment key={item.id}>
                      <tr className={`transition-colors ${item.status === 'Annulé' ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/80'}`}>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                            <span className={item.status === 'Annulé' ? 'line-through text-slate-500' : ''}>{item.name}</span>
                            {item.origin_type === 'Étranger' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                                <Globe size={11} />
                                <span>Étranger ({item.currency || 'EUR'})</span>
                              </span>
                            )}
                            {hasSubItems && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <ShoppingCart size={11} />
                                <span>{confirmedSubCount}/{totalSubCount} sous-achat{totalSubCount > 1 ? 's' : ''} réalisé{totalSubCount > 1 ? 's' : ''} ({formatKDA(subItemsSum)})</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-extrabold text-sky-700">
                          {formatKDA(item.budget_amount)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                          {item.status === 'Annulé' ? <span className="text-slate-400 font-normal">0 KDA</span> : formatKDA(engaged)}
                        </td>
                        <td className="px-4 py-3.5 text-center min-w-[90px]">
                          {item.status === 'Annulé' ? (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded bg-rose-100 text-rose-800 border border-rose-200">0%</span>
                          ) : (
                            <>
                              <span className="font-mono font-extrabold text-sky-700 text-[11px]">{engPct}%</span>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div className="bg-sky-600 h-1.5 rounded-full" style={{ width: `${Math.min(engPct, 100)}%` }} />
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-extrabold text-emerald-700">
                          {item.status === 'Annulé' ? (
                            <span className="text-slate-400 font-normal">0 KDA</span>
                          ) : realized === 0 ? (
                            <span className="text-slate-400 font-bold">0 KDA</span>
                          ) : (
                            formatKDA(realized)
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center min-w-[90px]">
                          {item.status === 'Annulé' ? (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded bg-rose-100 text-rose-800 border border-rose-200">0%</span>
                          ) : (
                            <>
                              <span className="font-mono font-extrabold text-emerald-700 text-[11px]">{realPct}%</span>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.min(realPct, 100)}%` }} />
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-600 whitespace-nowrap">
                          {item.expected_delivery_date ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={13} className="text-slate-400" />
                              {new Date(item.expected_delivery_date).toLocaleDateString('fr-FR')}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Non définie</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => toggleExpandRow(item.id)}
                              className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold ${
                                isExpanded
                                  ? 'bg-slate-900 text-white shadow-2xs'
                                  : 'p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50'
                              }`}
                              title={isExpanded ? "Masquer les détails" : "Voir les détails"}
                            >
                              <Eye size={15} />
                              <span className="hidden sm:inline">{isExpanded ? 'Masquer' : 'Voir'}</span>
                            </button>

                            {canEdit && (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(item)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                  title="Modifier cet investissement"
                                >
                                  <Edit size={15} />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Supprimer cet investissement"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDABLE DETAIL DRAWER */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={10} className="px-6 py-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
                              {/* Header bar of drawer */}
                              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
                                  <Eye size={16} className="text-indigo-600" />
                                  <span>Fiche Détaillée d'Investissement : {item.name}</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                  Origine : {item.origin_type === 'Étranger' ? `🌍 Importation (${item.currency || 'EUR'})` : '🏠 Local (Algérie)'}
                                </span>
                              </div>

                              {/* Observations / Notes if present */}
                              {item.observation && (
                                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900">
                                  <strong className="font-extrabold">💬 Observations / Remarques : </strong>
                                  <span>{item.observation}</span>
                                </div>
                              )}

                              {/* Frais d'approche card if Étranger */}
                              {item.origin_type === 'Étranger' && (
                                <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200 space-y-2">
                                  <div className="flex items-center justify-between font-extrabold text-xs text-indigo-950">
                                    <div className="flex items-center gap-1.5">
                                      <Calculator size={15} className="text-indigo-600" />
                                      <span>Décomposition des Frais d'approche & Devise (Importation)</span>
                                    </div>
                                    <span className="font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">
                                      Coût Rendus Usine (Montant Engagé) : {formatKDA(item.engaged_amount || item.budget_amount)}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs font-semibold">
                                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                                      <span className="text-[11px] text-slate-500 block mb-0.5">Prix de Base Devise</span>
                                      <span className="font-mono font-bold text-indigo-900">{formatMoney(item.base_currency_amount || 0)} {item.currency || 'EUR'}</span>
                                      <span className="text-[10px] text-slate-400 block mt-0.5">Cours: {item.exchange_rate || 1} DA</span>
                                    </div>
                                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                                      <span className="text-[11px] text-slate-500 block mb-0.5">Dédouanement (Droits & Taxes)</span>
                                      <span className="font-mono font-bold text-amber-800">
                                        {item.customs_duty_type === 'percentage' ? `${item.customs_duty_value}%` : formatKDA(item.customs_duty_value || 0)}
                                      </span>
                                    </div>
                                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                                      <span className="text-[11px] text-slate-500 block mb-0.5">Fret & Transport Int.</span>
                                      <span className="font-mono font-bold text-amber-800">{formatKDA(item.freight_amount || 0)}</span>
                                    </div>
                                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                                      <span className="text-[11px] text-slate-500 block mb-0.5">Total Frais d'approche</span>
                                      <span className="font-mono font-bold text-indigo-700">+{formatKDA(item.total_approach_cost || 0)}</span>
                                    </div>
                                  </div>
                                  {item.other_approach_costs && item.other_approach_costs.length > 0 && (
                                    <div className="pt-2 border-t border-indigo-200/60 text-xs">
                                      <span className="font-bold text-slate-700 block mb-1">Autres Frais d'approche Détaillés :</span>
                                      <div className="flex flex-wrap gap-2">
                                        {item.other_approach_costs.map((c, cIdx) => (
                                          <span key={cIdx} className="bg-white px-2.5 py-1 rounded border border-indigo-200 text-slate-800 font-mono font-semibold">
                                            {c.designation}: <strong className="text-indigo-700">{formatKDA(c.amount)}</strong>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Sub-items list & Realization Summary */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                                    <ShoppingCart size={14} className="text-emerald-600" />
                                    <span>Décomposition Matériel Principal & Sous-achats</span>
                                  </div>
                                  <div className="flex items-center gap-2 font-mono text-xs">
                                    <span className="font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                                      Engagé Total : {formatKDA(engaged)}
                                    </span>
                                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                                      Réalisé Confirmé Total : {formatKDA(realized)}
                                    </span>
                                  </div>
                                </div>

                                {/* Main Equipment Status Card in Drawer with One-Click Confirmation Toggle */}
                                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-slate-900 block">1. Équipement Principal : {item.name}</span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                        isMainConfirmed
                                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                          : 'bg-slate-200 text-slate-600 border-slate-300'
                                      }`}>
                                        {isMainConfirmed ? '✅ Réalisé' : '⏳ Non Réalisé (0 KDA)'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-medium mt-0.5 space-x-3">
                                      <span>Engagé : <strong className="font-mono text-slate-800">{formatKDA(item.engaged_amount || item.budget_amount)}</strong></span>
                                      <span>|</span>
                                      <span>Montant si Réalisé : <strong className="font-mono text-emerald-800">{formatKDA(item.realized_amount || item.engaged_amount)}</strong></span>
                                    </div>
                                  </div>

                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMainRealization(item.id)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer ${
                                        isMainConfirmed
                                          ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                      }`}
                                    >
                                      {isMainConfirmed ? (
                                        <>
                                          <Check size={14} />
                                          <span>Confirmé Réalisé</span>
                                        </>
                                      ) : (
                                        <>
                                          <Plus size={14} />
                                          <span>Confirmer Réalisation</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>

                                {hasSubItems ? (
                                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead className="bg-slate-100 text-slate-700 font-bold">
                                        <tr>
                                          <th className="px-3 py-2">Désignation du Sous-achat</th>
                                          <th className="px-3 py-2 text-right">Montant Engagé</th>
                                          <th className="px-3 py-2 text-right">Montant Réalisé</th>
                                          <th className="px-3 py-2 text-center">Statut de Confirmation</th>
                                          <th className="px-3 py-2 text-center">Date</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {item.sub_items!.map((sub, sIdx) => {
                                          const subRealAmt = (sub.realized_amount !== undefined && sub.realized_amount !== null && sub.realized_amount > 0)
                                            ? sub.realized_amount
                                            : (sub.amount || 0);

                                          return (
                                            <tr key={sIdx} className="hover:bg-slate-50">
                                              <td className="px-3 py-2 font-bold text-slate-900">
                                                {sub.designation}
                                                {sub.origin_type === 'Étranger' && (
                                                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                                    🌍 Import ({sub.base_currency_amount} {sub.currency || 'EUR'})
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">{formatKDA(sub.amount)}</td>
                                              <td className="px-3 py-2 text-right font-mono font-extrabold text-emerald-700">
                                                {sub.is_realized === true ? formatKDA(subRealAmt) : <span className="text-slate-400 font-normal">0 KDA (Non confirmé)</span>}
                                              </td>
                                              <td className="px-3 py-2 text-center">
                                                {canEdit ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleSubItemRealization(item.id, sIdx)}
                                                    className={`px-2.5 py-0.5 rounded text-[10px] font-black border transition-all cursor-pointer select-none ${
                                                      sub.is_realized === true
                                                        ? 'bg-emerald-100 text-emerald-950 border-emerald-300 hover:bg-emerald-200'
                                                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                                    }`}
                                                    title="Cliquer pour basculer le statut de confirmation"
                                                  >
                                                    {sub.is_realized === true ? '✅ Confirmé Réalisé' : '⏳ Non Réalisé (0 KDA)'}
                                                  </button>
                                                ) : (
                                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                                    sub.is_realized === true
                                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                                      : 'bg-slate-100 text-slate-700 border-slate-300'
                                                  }`}>
                                                    {sub.is_realized === true ? '✅ Réalisé' : '⏳ Non Réalisé'}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 text-center font-mono text-slate-600">{sub.date || '-'}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                                    Aucun sous-achat détaillé pour cet équipement.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CATEGORY SPLIT TABLES */
        <div className="space-y-6">
          {[
            { cat: 'Industriel', title: "1. Équipements de Production (Industriel)", icon: Factory, color: 'text-indigo-600', badgeBg: 'bg-indigo-950 text-white' },
            { cat: 'Utilités & Manutention', title: "2. Équipements de manutention et de transport (Utilités)", icon: Truck, color: 'text-emerald-600', badgeBg: 'bg-emerald-950 text-white' },
            { cat: 'Matériel Informatique', title: "3. Équipements et systèmes informatiques", icon: Laptop, color: 'text-sky-600', badgeBg: 'bg-sky-950 text-white' },
            { cat: 'Mobilier', title: "4. Mobilier de bureau", icon: Armchair, color: 'text-amber-600', badgeBg: 'bg-amber-950 text-white' },
            { cat: 'Autres', title: "5. Autres Équipements & Investissements", icon: TrendingUp, color: 'text-slate-600', badgeBg: 'bg-slate-900 text-white' },
          ].map((sec) => {
            let secItems: CapexItem[] = [];
            if (sec.cat === 'Autres') {
              secItems = filteredItems.filter((i) => 
                !isCategoryMatch(i.category, 'Industriel') &&
                !isCategoryMatch(i.category, 'Utilités & Manutention') &&
                !isCategoryMatch(i.category, 'Matériel Informatique') &&
                !isCategoryMatch(i.category, 'Mobilier')
              );
            } else {
              secItems = filteredItems.filter((i) => isCategoryMatch(i.category, sec.cat));
            }

            if (secItems.length === 0) return null;

            const secBudget = secItems.reduce((sum, i) => sum + (i.budget_amount || 0), 0);
            const secEngaged = secItems.reduce((sum, i) => sum + getItemTotals(i).engaged, 0);
            const secRealized = secItems.reduce((sum, i) => sum + getItemTotals(i).realized, 0);
            const secEngPct = secBudget > 0 ? Number(((secEngaged / secBudget) * 100).toFixed(1)) : 0;
            const secRealPct = secBudget > 0 ? Number(((secRealized / secBudget) * 100).toFixed(1)) : 0;
            const Icon = sec.icon;

            return (
              <div key={sec.cat} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Category Table Header Bar */}
                <div className={`px-5 py-3.5 ${sec.badgeBg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2`}>
                  <div className="flex items-center gap-2.5">
                    <Icon size={20} className="text-emerald-400" />
                    <h3 className="font-extrabold text-sm text-white tracking-tight">{sec.title}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-white/20 text-white border border-white/30">
                      {secItems.length} équipement{secItems.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono font-bold text-white">
                    <span>Budget : <span className="text-emerald-200 font-extrabold">{formatKDA(secBudget)}</span></span>
                    <span className="hidden md:inline text-slate-400">|</span>
                    <span>Engagé : <span className="text-sky-300 font-extrabold">{formatKDA(secEngaged)} ({secEngPct}%)</span></span>
                    <span className="hidden md:inline text-slate-400">|</span>
                    <span>Réalisé : <span className="text-emerald-300 font-extrabold">{formatKDA(secRealized)} ({secRealPct}%)</span></span>
                  </div>
                </div>

                {/* Table for this Category */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-extrabold text-slate-800">Équipement / Investissement</th>
                        <th className="px-4 py-3 text-right">Budget Alloué (KDA)</th>
                        <th className="px-4 py-3 text-right">Montant Engagé (KDA)</th>
                        <th className="px-4 py-3 text-center">% Eng.</th>
                        <th className="px-4 py-3 text-right">Réalisé Confirmé (KDA)</th>
                        <th className="px-4 py-3 text-center">% Réal.</th>
                        <th className="px-4 py-3 text-center">Statut</th>
                        <th className="px-4 py-3">Livraison Prévisible</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {secItems.map((item) => {
                        const isExpanded = expandedItemIds.includes(item.id);
                        const hasSubItems = item.sub_items && item.sub_items.length > 0;
                        const { subItemsSum, engaged, realized, engPct, realPct, isMainConfirmed, confirmedSubCount, totalSubCount } = getItemTotals(item);

                        return (
                          <React.Fragment key={item.id}>
                            <tr className={`transition-colors ${item.status === 'Annulé' ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/80'}`}>
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                  <span className={item.status === 'Annulé' ? 'line-through text-slate-500' : ''}>{item.name}</span>
                                  {item.origin_type === 'Étranger' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                                      <Globe size={11} />
                                      <span>Étranger ({item.currency || 'EUR'})</span>
                                    </span>
                                  )}
                                  {hasSubItems && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                      <ShoppingCart size={11} />
                                      <span>{confirmedSubCount}/{totalSubCount} sous-achat{totalSubCount > 1 ? 's' : ''} réalisé{totalSubCount > 1 ? 's' : ''} ({formatKDA(subItemsSum)})</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono font-extrabold text-sky-700">
                                {formatKDA(item.budget_amount)}
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                                {item.status === 'Annulé' ? <span className="text-slate-400 font-normal">0 KDA</span> : formatKDA(engaged)}
                              </td>
                              <td className="px-4 py-3.5 text-center min-w-[90px]">
                                {item.status === 'Annulé' ? (
                                  <span className="px-2 py-0.5 text-[10px] font-black rounded bg-rose-100 text-rose-800 border border-rose-200">0%</span>
                                ) : (
                                  <>
                                    <span className="font-mono font-extrabold text-sky-700 text-[11px]">{engPct}%</span>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                      <div className="bg-sky-600 h-1.5 rounded-full" style={{ width: `${Math.min(engPct, 100)}%` }} />
                                    </div>
                                  </>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono font-extrabold text-emerald-700">
                                {item.status === 'Annulé' ? (
                                  <span className="text-slate-400 font-normal">0 KDA</span>
                                ) : realized === 0 ? (
                                  <span className="text-slate-400 font-bold">0 KDA</span>
                                ) : (
                                  formatKDA(realized)
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center min-w-[90px]">
                                {item.status === 'Annulé' ? (
                                  <span className="px-2 py-0.5 text-[10px] font-black rounded bg-rose-100 text-rose-800 border border-rose-200">0%</span>
                                ) : (
                                  <>
                                    <span className="font-mono font-extrabold text-emerald-700 text-[11px]">{realPct}%</span>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                      <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.min(realPct, 100)}%` }} />
                                    </div>
                                  </>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {getStatusBadge(item.status)}
                              </td>
                              <td className="px-4 py-3.5 font-medium text-slate-600 whitespace-nowrap">
                                {item.expected_delivery_date ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock size={13} className="text-slate-400" />
                                    {new Date(item.expected_delivery_date).toLocaleDateString('fr-FR')}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Non définie</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => toggleExpandRow(item.id)}
                                    className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold ${
                                      isExpanded
                                        ? 'bg-slate-900 text-white shadow-2xs'
                                        : 'p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50'
                                    }`}
                                    title={isExpanded ? "Masquer les détails" : "Voir les détails"}
                                  >
                                    <Eye size={15} />
                                    <span className="hidden sm:inline">{isExpanded ? 'Masquer' : 'Voir'}</span>
                                  </button>

                                  {canEdit && (
                                    <>
                                      <button
                                        onClick={() => handleOpenEditModal(item)}
                                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                        title="Modifier cet investissement"
                                      >
                                        <Edit size={15} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                        title="Supprimer cet investissement"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* EXPANDABLE DETAIL DRAWER */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 border-b border-slate-200">
                                <td colSpan={10} className="px-6 py-4">
                                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
                                    {/* Header bar of drawer */}
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                      <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
                                        <Eye size={16} className="text-indigo-600" />
                                        <span>Fiche Détaillée d'Investissement : {item.name}</span>
                                      </div>
                                      <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                        Origine : {item.origin_type === 'Étranger' ? `🌍 Importation (${item.currency || 'EUR'})` : '🏠 Local (Algérie)'}
                                      </span>
                                    </div>

                                    {/* Observations / Notes if present */}
                                    {item.observation && (
                                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900">
                                        <strong className="font-extrabold">💬 Observations / Remarques : </strong>
                                        <span>{item.observation}</span>
                                      </div>
                                    )}

                                    {/* Frais d'approche card if Étranger */}
                                    {item.origin_type === 'Étranger' && (
                                      <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200 space-y-2">
                                        <div className="flex items-center justify-between font-extrabold text-xs text-indigo-950">
                                          <div className="flex items-center gap-1.5">
                                            <Calculator size={15} className="text-indigo-600" />
                                            <span>Décomposition des Frais d'approche & Devise (Importation)</span>
                                          </div>
                                          <span className="font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">
                                            Coût Rendus Usine (Montant Engagé) : {formatKDA(item.engaged_amount || item.budget_amount)}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs font-semibold">
                                          <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                                            <span className="text-[11px] text-slate-500 block mb-0.5">Prix de Base Devise</span>
                                            <span className="font-mono font-bold text-indigo-900">{formatMoney(item.base_currency_amount || 0)} {item.currency || 'EUR'}</span>
                                            <span className="text-[10px] text-slate-400 block mt-0.5">Cours: {item.exchange_rate || 1} DA</span>
                                          </div>
                                          <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                                            <span className="text-[11px] text-slate-500 block mb-0.5">Dédouanement (Droits & Taxes)</span>
                                            <span className="font-mono font-bold text-amber-800">
                                              {item.customs_duty_type === 'percentage' ? `${item.customs_duty_value}%` : formatKDA(item.customs_duty_value || 0)}
                                            </span>
                                          </div>
                                          <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                                            <span className="text-[11px] text-slate-500 block mb-0.5">Fret & Transport Int.</span>
                                            <span className="font-mono font-bold text-amber-800">{formatKDA(item.freight_amount || 0)}</span>
                                          </div>
                                          <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                                            <span className="text-[11px] text-slate-500 block mb-0.5">Total Frais d'approche</span>
                                            <span className="font-mono font-bold text-indigo-700">+{formatKDA(item.total_approach_cost || 0)}</span>
                                          </div>
                                        </div>
                                        {item.other_approach_costs && item.other_approach_costs.length > 0 && (
                                          <div className="pt-2 border-t border-indigo-200/60 text-xs">
                                            <span className="font-bold text-slate-700 block mb-1">Autres Frais d'approche Détaillés :</span>
                                            <div className="flex flex-wrap gap-2">
                                              {item.other_approach_costs.map((c, cIdx) => (
                                                <span key={cIdx} className="bg-white px-2.5 py-1 rounded border border-indigo-200 text-slate-800 font-mono font-semibold">
                                                  {c.designation}: <strong className="text-indigo-700">{formatKDA(c.amount)}</strong>
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Sub-items list & Realization Summary */}
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                                          <ShoppingCart size={14} className="text-emerald-600" />
                                          <span>Décomposition Matériel Principal & Sous-achats</span>
                                        </div>
                                        <div className="flex items-center gap-2 font-mono text-xs">
                                          <span className="font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                                            Engagé Total : {formatKDA(engaged)}
                                          </span>
                                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                                            Réalisé Confirmé Total : {formatKDA(realized)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Main Equipment Status Card in Drawer with One-Click Confirmation Toggle */}
                                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-slate-900 block">1. Équipement Principal : {item.name}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                              isMainConfirmed
                                                ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                                : 'bg-slate-200 text-slate-600 border-slate-300'
                                            }`}>
                                              {isMainConfirmed ? '✅ Réalisé' : '⏳ Non Réalisé (0 KDA)'}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 font-medium mt-0.5 space-x-3">
                                            <span>Engagé : <strong className="font-mono text-slate-800">{formatKDA(item.engaged_amount || item.budget_amount)}</strong></span>
                                            <span>|</span>
                                            <span>Montant si Réalisé : <strong className="font-mono text-emerald-800">{formatKDA(item.realized_amount || item.engaged_amount)}</strong></span>
                                          </div>
                                        </div>

                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={() => handleToggleMainRealization(item.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer ${
                                              isMainConfirmed
                                                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                            }`}
                                          >
                                            {isMainConfirmed ? (
                                              <>
                                                <Check size={14} />
                                                <span>Confirmé Réalisé</span>
                                              </>
                                            ) : (
                                              <>
                                                <Plus size={14} />
                                                <span>Confirmer Réalisation</span>
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </div>

                                      {hasSubItems ? (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                                          <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-slate-100 text-slate-700 font-bold">
                                              <tr>
                                                <th className="px-3 py-2">Désignation du Sous-achat</th>
                                                <th className="px-3 py-2 text-right">Montant Engagé</th>
                                                <th className="px-3 py-2 text-right">Montant Réalisé</th>
                                                <th className="px-3 py-2 text-center">Statut de Confirmation</th>
                                                <th className="px-3 py-2 text-center">Date</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {item.sub_items!.map((sub, sIdx) => {
                                                const subRealAmt = (sub.realized_amount !== undefined && sub.realized_amount !== null && sub.realized_amount > 0)
                                                  ? sub.realized_amount
                                                  : (sub.amount || 0);

                                                return (
                                                  <tr key={sIdx} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 font-bold text-slate-900">
                                                      {sub.designation}
                                                      {sub.origin_type === 'Étranger' && (
                                                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                                          🌍 Import ({sub.base_currency_amount} {sub.currency || 'EUR'})
                                                        </span>
                                                      )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">{formatKDA(sub.amount)}</td>
                                                    <td className="px-3 py-2 text-right font-mono font-extrabold text-emerald-700">
                                                      {sub.is_realized === true ? formatKDA(subRealAmt) : <span className="text-slate-400 font-normal">0 KDA (Non confirmé)</span>}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                      {canEdit ? (
                                                        <button
                                                          type="button"
                                                          onClick={() => handleToggleSubItemRealization(item.id, sIdx)}
                                                          className={`px-2.5 py-0.5 rounded text-[10px] font-black border transition-all cursor-pointer select-none ${
                                                            sub.is_realized === true
                                                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300 hover:bg-emerald-200'
                                                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                                          }`}
                                                          title="Cliquer pour basculer le statut de confirmation"
                                                        >
                                                          {sub.is_realized === true ? '✅ Confirmé Réalisé' : '⏳ Non Réalisé (0 KDA)'}
                                                        </button>
                                                      ) : (
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                                          sub.is_realized === true
                                                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                                            : 'bg-slate-100 text-slate-700 border-slate-300'
                                                        }`}>
                                                          {sub.is_realized === true ? '✅ Réalisé' : '⏳ Non Réalisé'}
                                                        </span>
                                                      )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center font-mono text-slate-600">{sub.date || '-'}</td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                                          Aucun sous-achat détaillé pour cet équipement.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-xs text-slate-900">
                      <tr>
                        <td className="px-4 py-3">Sous-total {sec.title}</td>
                        <td className="px-4 py-3 text-right font-mono text-sky-800">{formatKDA(secBudget)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatKDA(secEngaged)}</td>
                        <td colSpan={1}></td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-800">{formatKDA(secRealized)}</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT / CREATE MODAL */}
      <CapexModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSaveSuccess}
        editingItem={editingItem}
        selectedYear={selectedYear}
      />

      {/* PRINT REPORT MODAL */}
      <PrintCapexReport
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        year={selectedYear}
        items={filteredItems}
      />
    </div>
  );
};
