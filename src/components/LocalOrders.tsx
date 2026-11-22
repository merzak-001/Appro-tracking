import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Truck,
  Plus, 
  Search, 
  Eye, 
  Edit,
  Edit3, 
  Trash2, 
  PlusCircle, 
  X, 
  Calculator, 
  Building2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileSpreadsheet,
  Printer,
  Copy,
  Link2,
  BarChart3,
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';
import { LocalOrder, LocalOrderLine, Supplier, User, UnitType, LocalOrderStatus, SupplierEvaluation } from '../types';
import { SupplierModal } from './SupplierModal';
import { PrintLocalOrder } from './PrintLocalOrder';
import { SearchableSelect } from './SearchableSelect';
import { DateInputDDMMYYYY } from './DateInputDDMMYYYY';
import { ProcurementSourceSelector, SelectedProcurementSource } from './ProcurementSourceSelector';
import { SupplierEvaluationModal } from './SupplierEvaluationModal';
import { LocalOrdersAnalytics } from './LocalOrdersAnalytics';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { formatAmount, formatQty } from '../utils/numberUtils';

interface LocalOrdersProps {
  currentUser: User;
  suppliers: Supplier[];
  orders: LocalOrder[];
  loading: boolean;
  onRefresh: () => void;
  openCreateModalDirectly?: boolean;
  onSelectTab?: (tab: string) => void;
}

export const LocalOrders: React.FC<LocalOrdersProps> = ({
  currentUser,
  suppliers,
  orders,
  loading,
  onRefresh,
  onSelectTab,
}) => {
  const [displayOrders, setDisplayOrders] = useState<LocalOrder[]>(orders || []);

  useEffect(() => {
    setDisplayOrders(orders || []);
  }, [orders]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [activeViewTab, setActiveViewTab] = useState<'registre' | 'analyse'>('registre');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LocalOrder | null>(null);
  const [printOrder, setPrintOrder] = useState<LocalOrder | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Supplier Evaluation Modal State
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [pendingCompletionOrder, setPendingCompletionOrder] = useState<LocalOrder | null>(null);

  // Live Form State
  const [formEtablirPar, setFormEtablirPar] = useState(currentUser.full_name || 'Karim Benali (SAI)');
  const [formObjet, setFormObjet] = useState('');
  const [formSupplierId, setFormSupplierId] = useState<number>(suppliers[0]?.id || 1);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formObservation, setFormObservation] = useState('');
  const [formStatus, setFormStatus] = useState<LocalOrderStatus>('Pending');
  const [nextOrderNum, setNextOrderNum] = useState<string>('S26-150L');
  const [isCustomOrderNum, setIsCustomOrderNum] = useState(false);
  const [customOrderNum, setCustomOrderNum] = useState('');

  // Procurement Source Linkage State
  const [formProcurementSourceType, setFormProcurementSourceType] = useState<'consultation' | 'appel_offre' | 'none'>('none');
  const [formConsultationId, setFormConsultationId] = useState<number | undefined>(undefined);
  const [formConsultationRef, setFormConsultationRef] = useState<string | undefined>(undefined);
  const [formAppelOffreId, setFormAppelOffreId] = useState<number | undefined>(undefined);
  const [formAppelOffreRef, setFormAppelOffreRef] = useState<string | undefined>(undefined);
  const [formDelaiLivraisonJours, setFormDelaiLivraisonJours] = useState<number | undefined>(15);
  const [formProcedureType, setFormProcedureType] = useState<string>('');

  // Order Lines State with Real-Time Live Math
  const [lines, setLines] = useState<LocalOrderLine[]>([
    {
      position: 1,
      designation: '',
      qty: 1,
      unite: 'piece',
      unit_price: 0,
      tva_percentage: 19,
      total_ht: 0,
      montant_tva: 0,
      total_ttc: 0,
    },
  ]);

  const canEdit = currentUser.role === 'Appro' || currentUser.role === 'Admin';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPrintModalOpen) {
          setIsPrintModalOpen(false);
          setPrintOrder(null);
        } else if (isDetailOpen) {
          setIsDetailOpen(false);
          setSelectedOrder(null);
        } else if (isSupplierModalOpen) {
          setIsSupplierModalOpen(false);
        } else if (isFormOpen) {
          setIsFormOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen, isDetailOpen, isSupplierModalOpen, isPrintModalOpen]);

  const handleSelectProcurementSource = (source: SelectedProcurementSource) => {
    setFormProcurementSourceType(source.sourceType);
    if (source.sourceType === 'consultation') {
      setFormConsultationId(source.id);
      setFormConsultationRef(source.ref);
      setFormAppelOffreId(undefined);
      setFormAppelOffreRef(undefined);
    } else if (source.sourceType === 'appel_offre') {
      setFormAppelOffreId(source.id);
      setFormAppelOffreRef(source.ref);
      setFormConsultationId(undefined);
      setFormConsultationRef(undefined);
    } else {
      setFormConsultationId(undefined);
      setFormConsultationRef(undefined);
      setFormAppelOffreId(undefined);
      setFormAppelOffreRef(undefined);
    }

    // Auto-fill object if empty
    if (source.objet && (!formObjet || formObjet.trim() === '')) {
      setFormObjet(source.objet);
    }

    // Auto-select supplier if name matches
    if (source.supplier_name) {
      const match = suppliers.find((s) => s.name.toLowerCase().trim() === source.supplier_name?.toLowerCase().trim());
      if (match) {
        setFormSupplierId(match.id);
      }
    }

    // Auto-populate item lines if available in linked consultation/AO
    if (source.articles && source.articles.length > 0) {
      const isLinesEmptyOrBlank = lines.length === 0 || (lines.length === 1 && !lines[0].designation.trim());
      if (isLinesEmptyOrBlank) {
        setLines(
          source.articles.map((art, idx) => ({
            position: idx + 1,
            designation: art.designation,
            qty: art.qty || 1,
            unite: (art.unite as any) || 'piece',
            unit_price: 0,
            tva_percentage: 19,
            total_ht: 0,
            montant_tva: 0,
            total_ttc: 0,
          }))
        );
      }
    }
  };

  // Fetch next order code when creating new order
  const handleOpenNewModal = async () => {
    try {
      const res = await fetch('/api/orders/next-number?type=local');
      if (res.ok) {
        const data = await res.json();
        setNextOrderNum(data.nextNumber);
      }
    } catch (e) {
      console.error(e);
    }

    setEditingId(null);
    setIsCustomOrderNum(false);
    setCustomOrderNum('');
    setFormEtablirPar(currentUser.full_name || 'Procurement Agent');
    setFormObjet('');
    setFormSupplierId(suppliers[0]?.id || 1);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormObservation('');
    setFormStatus('Commandée');
    setFormProcurementSourceType('none');
    setFormConsultationId(undefined);
    setFormConsultationRef(undefined);
    setFormAppelOffreId(undefined);
    setFormAppelOffreRef(undefined);
    setFormDelaiLivraisonJours(15);
    setFormProcedureType('');
    setLines([
      {
        position: 1,
        designation: '',
        qty: 10,
        unite: 'piece',
        unit_price: 1000,
        tva_percentage: 19,
        total_ht: 10000,
        montant_tva: 1900,
        total_ttc: 11900,
      },
    ]);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (order: LocalOrder) => {
    setEditingId(order.id);
    setIsCustomOrderNum(false);
    setNextOrderNum(order.n_order);
    setCustomOrderNum(order.n_order);
    setFormEtablirPar(order.etablir_par);
    setFormObjet(order.objet_de_commande);
    setFormSupplierId(order.fournisseur_id);
    setFormDate(order.date);
    setFormObservation(order.observation || '');
    setFormStatus(order.status);
    setFormProcedureType(order.procedure_type || '');
    setFormProcurementSourceType(order.procurement_source_type || (order.consultation_ref ? 'consultation' : (order.appel_offre_ref ? 'appel_offre' : 'none')));
    setFormConsultationId(order.consultation_id);
    setFormConsultationRef(order.consultation_ref);
    setFormAppelOffreId(order.appel_offre_id);
    setFormAppelOffreRef(order.appel_offre_ref);
    setFormDelaiLivraisonJours(order.delai_livraison_jours);

    if (order.lines && order.lines.length > 0) {
      setLines(order.lines);
    } else {
      setLines([
        {
          position: 1,
          designation: '',
          qty: 1,
          unite: 'piece',
          unit_price: 0,
          tva_percentage: 19,
          total_ht: 0,
          montant_tva: 0,
          total_ttc: 0,
        },
      ]);
    }
    setIsFormOpen(true);
  };

  const handleDuplicateOrder = async (order: LocalOrder) => {
    let freshNextNumber = '';
    try {
      const res = await fetch('/api/local-orders/next-number');
      if (res.ok) {
        const data = await res.json();
        freshNextNumber = data.nextNumber;
      }
    } catch (e) {
      console.error(e);
    }

    setEditingId(null);
    setIsCustomOrderNum(false);
    setNextOrderNum(freshNextNumber || `${order.n_order}-BIS`);
    setCustomOrderNum('');
    setFormEtablirPar(order.etablir_par || currentUser.full_name || 'Procurement Agent');
    setFormObjet(order.objet_de_commande ? `${order.objet_de_commande} (Copie)` : '');
    setFormSupplierId(order.fournisseur_id);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormObservation(order.observation || '');
    setFormStatus('Pending');
    setFormProcedureType(order.procedure_type || '');
    setFormProcurementSourceType(order.procurement_source_type || 'none');
    setFormConsultationId(order.consultation_id);
    setFormConsultationRef(order.consultation_ref);
    setFormAppelOffreId(order.appel_offre_id);
    setFormAppelOffreRef(order.appel_offre_ref);

    if (order.lines && order.lines.length > 0) {
      setLines(
        order.lines.map((l, idx) => ({
          ...l,
          id: undefined as any,
          local_order_id: undefined as any,
          position: idx + 1,
        }))
      );
    } else {
      setLines([
        {
          position: 1,
          designation: '',
          qty: 1,
          unite: 'piece',
          unit_price: 0,
          tva_percentage: 19,
          total_ht: 0,
          montant_tva: 0,
          total_ttc: 0,
        },
      ]);
    }
    setIsFormOpen(true);
  };

  // REAL-TIME MATH HANDLER: Triggered on every keypress / change in line item fields
  const handleLineChange = (index: number, field: keyof LocalOrderLine, value: any) => {
    setLines((prevLines) => {
      const updated = [...prevLines];
      const targetLine = { ...updated[index], [field]: value };

      const qty = Number(targetLine.qty) || 0;
      const unit_price = Number(targetLine.unit_price) || 0;
      const tva_percentage = Number(targetLine.tva_percentage) ?? 19;

      // Real-time calculation
      const total_ht = Number((qty * unit_price).toFixed(2));
      const montant_tva = Number((total_ht * (tva_percentage / 100)).toFixed(2));
      const total_ttc = Number((total_ht + montant_tva).toFixed(2));

      targetLine.total_ht = total_ht;
      targetLine.montant_tva = montant_tva;
      targetLine.total_ttc = total_ttc;

      updated[index] = targetLine;
      return updated;
    });
  };

  const handleAddLineRow = () => {
    setLines((prev) => [
      ...prev,
      {
        position: prev.length + 1,
        designation: '',
        qty: 1,
        unite: 'piece',
        unit_price: 0,
        tva_percentage: 19,
        total_ht: 0,
        montant_tva: 0,
        total_ttc: 0,
      },
    ]);
  };

  const handleRemoveLineRow = (index: number) => {
    if (lines.length === 1) return; // keep at least 1 row
    setLines((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((line, i) => ({ ...line, position: i + 1 }));
    });
  };

  // Live Order Header Totals Summary Calculation
  const liveTotalHT = lines.reduce((acc, curr) => acc + (curr.total_ht || 0), 0);
  const liveTotalTVA = lines.reduce((acc, curr) => acc + (curr.montant_tva || 0), 0);
  const liveTotalTTC = lines.reduce((acc, curr) => acc + (curr.total_ttc || 0), 0);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formObjet || !formSupplierId) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (!formProcedureType || !formProcedureType.trim()) {
      alert('Le Type de Procédure (Achat Direct, Lettre de commande, Commande, Marché) est obligatoire.');
      return;
    }

    const orderNumToSend = isCustomOrderNum && customOrderNum.trim() ? customOrderNum.trim() : nextOrderNum;

    const payload = {
      n_order: orderNumToSend,
      etablir_par: formEtablirPar,
      objet_de_commande: formObjet,
      fournisseur_id: formSupplierId,
      date: formDate,
      observation: formObservation,
      status: formStatus,
      lines,
      delai_livraison_jours: formDelaiLivraisonJours,
      procedure_type: formProcedureType,
      procurement_source_type: formProcurementSourceType,
      consultation_id: formConsultationId,
      consultation_ref: formConsultationRef,
      appel_offre_id: formAppelOffreId,
      appel_offre_ref: formAppelOffreRef,
    };

    try {
      const url = editingId ? `/api/local-orders/${editingId}` : '/api/local-orders';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsFormOpen(false);
        onRefresh();
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || 'Failed to save order'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error saving order.');
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Are you sure you want to delete this local order? All associated deliveries will also be removed.')) {
      return;
    }

    try {
      const res = await fetch(`/api/local-orders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Execute order status update
  const executeStatusUpdate = async (orderId: number, newStatus: LocalOrderStatus) => {
    // Instant optimistic update in local state so dropdown badge changes immediately!
    setDisplayOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    try {
      const res = await fetch(`/api/local-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to change order status live:', err);
    }
  };

  // Live Status Change Handler - FORCES evaluation popup on Clôture (Completed)
  const handleLiveStatusChange = async (order: LocalOrder, newStatus: LocalOrderStatus) => {
    if (newStatus === order.status) return;

    if (newStatus === 'Completed') {
      // Force pop up evaluation modal immediately without updating status yet!
      setPendingCompletionOrder(order);
      setIsEvaluationModalOpen(true);
      return;
    }

    await executeStatusUpdate(order.id, newStatus);
  };

  const handleEvaluationSubmitSuccess = async (savedEval: SupplierEvaluation) => {
    setIsEvaluationModalOpen(false);
    if (pendingCompletionOrder) {
      await executeStatusUpdate(pendingCompletionOrder.id, 'Completed');
      setPendingCompletionOrder(null);
    }
  };

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  // Extract all available unique years from orders dynamically
  const availableYears: number[] = Array.from(
    new Set<number>(
      displayOrders
        .map((o) => (o.date ? parseInt(o.date.split('-')[0], 10) : currentYear))
        .filter((y): y is number => !isNaN(y))
        .concat(currentYear)
    )
  ).sort((a: number, b: number) => b - a);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, supplierFilter, selectedYear]);

  // Local Suppliers Only (Algeria / Algérie)
  const localSuppliers = suppliers.filter((s) => {
    const country = (s.country || '').toLowerCase().trim();
    return !country || country.includes('alger') || country.includes('algérie') || country.includes('algerie');
  });

  // Filter logic with line-item deep search & "Livraison Partielle" year-exemption
  const filteredOrders = displayOrders.filter((o) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      o.n_order.toLowerCase().includes(term) ||
      o.objet_de_commande.toLowerCase().includes(term) ||
      (o.etablir_par && o.etablir_par.toLowerCase().includes(term)) ||
      (o.created_by_name && o.created_by_name.toLowerCase().includes(term)) ||
      (o.supplier_name && o.supplier_name.toLowerCase().includes(term)) ||
      (o.lines && o.lines.some((l) => l.designation && l.designation.toLowerCase().includes(term)));

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'Active'
        ? (o.status === 'Active' || o.status === 'Commandée' || o.status === 'In Progress' || o.status === 'Pending' || o.status === 'Livraison Partielle' || o.status === 'En cours de livraison')
        : statusFilter === 'Pending_Or_Progress'
        ? (o.status === 'Pending' || o.status === 'In Progress')
        : o.status === statusFilter;

    const matchesSupplier = supplierFilter === 'ALL' || String(o.fournisseur_id) === supplierFilter;

    // Dynamic Year filter: defaults to current year, allows specific year or ALL.
    // ALWAYS includes orders with status "Livraison Partielle" regardless of year
    const orderYear = o.date ? parseInt(o.date.split('-')[0], 10) : currentYear;
    const matchesYear =
      selectedYear === 'ALL' ||
      String(orderYear) === selectedYear ||
      o.status === 'Livraison Partielle';

    return matchesSearch && matchesStatus && matchesSupplier && matchesYear;
  });

  // Count helper for streamlined status tabs
  const counts = {
    Active: displayOrders.filter(o => (o.status === 'Commandée' || o.status === 'Livraison Partielle' || o.status === 'En cours de livraison' || o.status === 'Active' || o.status === 'Pending' || o.status === 'In Progress') && (selectedYear === 'ALL' || String(o.date ? parseInt(o.date.split('-')[0], 10) : currentYear) === selectedYear || o.status === 'Livraison Partielle')).length,
    Commandée: displayOrders.filter(o => o.status === 'Commandée' && (selectedYear === 'ALL' || String(o.date ? parseInt(o.date.split('-')[0], 10) : currentYear) === selectedYear)).length,
    EnCoursLivraison: displayOrders.filter(o => o.status === 'En cours de livraison' && (selectedYear === 'ALL' || String(o.date ? parseInt(o.date.split('-')[0], 10) : currentYear) === selectedYear)).length,
    LivraisonPartielle: displayOrders.filter(o => o.status === 'Livraison Partielle').length,
    Completed: displayOrders.filter(o => o.status === 'Completed' && (selectedYear === 'ALL' || String(o.date ? parseInt(o.date.split('-')[0], 10) : currentYear) === selectedYear)).length,
    Cancelled: displayOrders.filter(o => o.status === 'Cancelled' && (selectedYear === 'ALL' || String(o.date ? parseInt(o.date.split('-')[0], 10) : currentYear) === selectedYear)).length,
    ALL: displayOrders.filter(o => selectedYear === 'ALL' || String(o.date ? parseInt(o.date.split('-')[0], 10) : currentYear) === selectedYear || o.status === 'Livraison Partielle').length,
  };

  // Sorting State
  const [sortField, setSortField] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aVal: any = a[sortField as keyof LocalOrder];
    let bVal: any = b[sortField as keyof LocalOrder];

    if (sortField === 'supplier_name') {
      aVal = a.supplier_name || '';
      bVal = b.supplier_name || '';
    } else if (sortField === 'total_ht') {
      aVal = Number(a.total_ht || 0);
      bVal = Number(b.total_ht || 0);
    } else if (sortField === 'total_ttc') {
      aVal = Number(a.total_ttc || 0);
      bVal = Number(b.total_ttc || 0);
    } else if (sortField === 'date') {
      aVal = new Date(a.date || '').getTime();
      bVal = new Date(b.date || '').getTime();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedOrders.length / pageSize) || 1;
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getDelayBadge = (order: LocalOrder) => {
    if (!order.delai_livraison_jours || order.status === 'Completed' || order.status === 'Cancelled') {
      return null;
    }
    const orderDate = new Date(order.date);
    if (isNaN(orderDate.getTime())) return null;

    const targetDate = new Date(orderDate.getTime() + order.delai_livraison_jours * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - targetDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse whitespace-nowrap" title={`Dépassement de ${diffDays} jour(s) par rapport au délai convenu de ${order.delai_livraison_jours} jours`}>
          ⚠️ Retard {diffDays}j
        </span>
      );
    } else {
      const remainingDays = Math.abs(diffDays);
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap" title={`Dans les délais : reste ${remainingDays} jour(s)`}>
          ⏱️ J-{remainingDays}
        </span>
      );
    }
  };

  const getStatusBadge = (status: LocalOrderStatus) => {
    switch (status) {
      case 'Completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-300 whitespace-nowrap"><CheckCircle size={12} className="shrink-0"/> Clôturée</span>;
      case 'Commandée':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 whitespace-nowrap"><FileText size={12} className="shrink-0"/> Commandée</span>;
      case 'Livraison Partielle':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap"><Truck size={12} className="shrink-0"/> Livraison Partielle</span>;
      case 'En cours':
      case 'En cours de livraison':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 whitespace-nowrap"><Clock size={12} className="shrink-0"/> En cours</span>;
      case 'Pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap"><AlertCircle size={12} className="shrink-0"/> En attente</span>;
      case 'Active':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap"><CheckCircle size={12} className="shrink-0"/> Active</span>;
      case 'Draft':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">Brouillon</span>;
      case 'Cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap">Annulée</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">{status}</span>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full mx-auto">

      {/* Main View Switcher: Registre vs Tableau de Bord & Analyse */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveViewTab('registre')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeViewTab === 'registre'
                ? 'bg-white text-sky-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText size={15} className={activeViewTab === 'registre' ? 'text-sky-600' : 'text-slate-500'} />
            <span>Registre des Commandes</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeViewTab === 'registre' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {displayOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('analyse')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeViewTab === 'analyse'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BarChart3 size={15} className={activeViewTab === 'analyse' ? 'text-indigo-600' : 'text-slate-500'} />
            <span>Tableau de Bord & Analyses</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {canEdit && (
            <button
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 shadow-xs transition-all hover:shadow shrink-0"
            >
              <Plus size={16} />
              <span>Nouvelle Commande Locale</span>
            </button>
          )}
        </div>
      </div>

      {activeViewTab === 'analyse' ? (
        <LocalOrdersAnalytics
          orders={displayOrders}
          suppliers={suppliers}
          onSelectOrder={(order) => {
            setSelectedOrder(order);
            setIsDetailOpen(true);
          }}
        />
      ) : (
        <>
          {/* Header & Controls Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">Registre des Commandes Locales</h2>
              <p className="text-xs text-slate-500">
                Format automatique: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sky-700 font-semibold">S[YY]-[NUM]L</code> (Ex: S26-150L) ou Saisie Manuelle
              </p>
            </div>
          </div>

          {/* Status Tabs Bar */}
          <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('Active')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'Active'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <CheckCircle size={14} />
              <span>Actives</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                statusFilter === 'Active' ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {counts.Active}
              </span>
            </button>

        <button
          onClick={() => setStatusFilter('Commandée')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            statusFilter === 'Commandée'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText size={14} />
          <span>Commandée</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === 'Commandée' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {counts.Commandée}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('En cours de livraison')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            statusFilter === 'En cours de livraison'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Truck size={14} />
          <span>En cours de livraison</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === 'En cours de livraison' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-900'
          }`}>
            {counts.EnCoursLivraison}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('Livraison Partielle')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            statusFilter === 'Livraison Partielle'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Truck size={14} />
          <span>Livraison Partielle</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === 'Livraison Partielle' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'
          }`}>
            {counts.LivraisonPartielle}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('Completed')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            statusFilter === 'Completed'
              ? 'bg-sky-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CheckCircle size={14} />
          <span>Clôturées</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === 'Completed' ? 'bg-sky-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {counts.Completed}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('Cancelled')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            statusFilter === 'Cancelled'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <AlertCircle size={14} />
          <span>Annulées</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === 'Cancelled' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'
          }`}>
            {counts.Cancelled}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('ALL')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ml-auto ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>Toutes</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
            statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {counts.ALL}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par N° code, objet, désignation article, fournisseur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          />
        </div>

        {/* Dynamic Year Select Dropdown */}
        <div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-800"
          >
            <option value={String(currentYear)}>
              Exercice {currentYear} (Actuel)
            </option>
            <option value="ALL">Tous les Exercices</option>
            {availableYears
              .filter((y) => y !== currentYear)
              .map((y) => (
                <option key={y} value={String(y)}>
                  Exercice {y}
                </option>
              ))}
          </select>
        </div>

        <div>
          <SearchableSelect
            options={[
              { value: 'ALL', label: 'Tous les Fournisseurs' },
              ...suppliers.map((s) => ({
                value: String(s.id),
                label: s.name,
                subLabel: s.address,
                badge: s.is_foreign ? 'Étranger' : 'Local',
              })),
            ]}
            value={supplierFilter}
            onChange={(val) => setSupplierFilter(String(val))}
            searchPlaceholder="Rechercher un fournisseur..."
          />
        </div>
      </div>

      {/* Orders Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Chargement des commandes...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <FileText size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-medium">Aucune commande locale trouvée</p>
            <p className="text-xs text-slate-400">Essayez d'ajuster votre recherche ou vos filtres.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 select-none">
                <tr>
                  <th onClick={() => handleSort('n_order')} className="px-3 py-3 min-w-[130px] whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                    N° Code {sortField === 'n_order' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th onClick={() => handleSort('etablir_par')} className="px-3 py-3 min-w-[140px] whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                    Établi par {sortField === 'etablir_par' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th onClick={() => handleSort('supplier_name')} className="px-3 py-3 min-w-[170px] whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                    Fournisseur {sortField === 'supplier_name' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th className="px-3 py-3 min-w-[220px]">Objet de bon de commande</th>
                  <th onClick={() => handleSort('total_ht')} className="px-3 py-3 text-right min-w-[130px] whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                    Montant HT {sortField === 'total_ht' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th onClick={() => handleSort('total_ttc')} className="px-3 py-3 text-right min-w-[130px] whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                    Montant TTC {sortField === 'total_ttc' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th onClick={() => handleSort('date')} className="px-3 py-3 text-center min-w-[110px] whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                    Date {sortField === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th onClick={() => handleSort('status')} className="px-3 py-3 text-center min-w-[150px] whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                    Statut / Suivi {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th className="px-3 py-3 text-center min-w-[140px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-3.5 font-bold font-mono min-w-[140px] whitespace-nowrap">
                      <div className="text-sky-700">{order.n_order}</div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        {order.procedure_type && (
                          <div 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 w-fit"
                            title={`Type de Procédure : ${order.procedure_type}`}
                          >
                            <span>🏷️ {order.procedure_type}</span>
                          </div>
                        )}
                        {(order.consultation_ref || order.appel_offre_ref) && (
                          <div 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 w-fit"
                            title={`Dossier source : ${order.consultation_ref || order.appel_offre_ref}`}
                          >
                            <Link2 size={10} className="text-sky-600" />
                            <span>{order.consultation_ref || order.appel_offre_ref}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 font-medium text-slate-700 min-w-[140px] whitespace-nowrap">
                      {order.etablir_par || 'N/A'}
                    </td>
                    <td className="px-3 py-3.5 font-semibold text-slate-800 min-w-[170px] whitespace-nowrap">
                      {order.supplier_name || 'N/A'}
                    </td>
                    <td className="px-3 py-3.5 max-w-xs truncate" title={order.objet_de_commande}>
                      {order.objet_de_commande}
                    </td>
                    <td className="px-3 py-3.5 text-right font-medium font-mono min-w-[130px] whitespace-nowrap">
                      {formatAmount(order.total_ht)} DA
                    </td>
                    <td className="px-3 py-3.5 text-right font-bold text-slate-900 font-mono min-w-[130px] whitespace-nowrap">
                      {formatAmount(order.total_ttc)} DA
                    </td>
                    <td className="px-3 py-3.5 text-center text-slate-600 min-w-[110px] whitespace-nowrap">
                      <div>{formatDateDDMMYYYY(order.date)}</div>
                      {getDelayBadge(order)}
                    </td>
                    <td className="px-3 py-3.5 text-center min-w-[140px]">
                      {canEdit ? (
                        <select
                          value={order.status}
                          onChange={(e) => handleLiveStatusChange(order, e.target.value as LocalOrderStatus)}
                          className="text-xs font-semibold px-2 py-1 rounded-full border border-slate-300 bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                        >
                          <option value="Commandée">📜 Commandée</option>
                          <option value="En cours">⏱️ En cours</option>
                          <option value="Livraison Partielle">🚚 Livraison Partielle</option>
                          <option value="Completed">✅ Clôturée</option>
                          <option value="Cancelled">❌ Annulée</option>
                        </select>
                      ) : (
                        getStatusBadge(order.status)
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                          title="Voir les Détails"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          onClick={() => {
                            setPrintOrder(order);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                          title="Imprimer Bon de Commande"
                        >
                          <Printer size={15} />
                        </button>

                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleDuplicateOrder(order)}
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                              title="Dupliquer la commande"
                            >
                              <Copy size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(order)}
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                              title="Edit Order"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Order"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
            <div className="text-slate-500">
              Affichage <span className="font-semibold text-slate-700">{((currentPage - 1) * pageSize) + 1}</span> à <span className="font-semibold text-slate-700">{Math.min(currentPage * pageSize, filteredOrders.length)}</span> sur <span className="font-semibold text-slate-700">{filteredOrders.length}</span> commandes
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                Précédent
              </button>
              <span className="text-slate-700 font-semibold px-2">
                Page {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )}

      {/* CREATE / EDIT LOCAL ORDER MODAL WITH REAL-TIME MATH */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Calculator className="text-sky-400" size={20} />
                <h3 className="font-bold text-base">
                  {editingId ? `Edit Local Order: ${nextOrderNum}` : `New Local Order (Auto: ${nextOrderNum})`}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      N° Commande
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer text-[11px] font-medium text-slate-600 hover:text-sky-700 select-none">
                      <input
                        type="checkbox"
                        checked={isCustomOrderNum}
                        onChange={(e) => {
                          setIsCustomOrderNum(e.target.checked);
                          if (e.target.checked && !customOrderNum) {
                            setCustomOrderNum(nextOrderNum);
                          }
                        }}
                        className="rounded text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>Saisie manuelle</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    disabled={!isCustomOrderNum}
                    value={isCustomOrderNum ? customOrderNum : nextOrderNum}
                    onChange={(e) => setCustomOrderNum(e.target.value)}
                    placeholder="Ex: S26-150L-BIS"
                    className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded border transition-colors ${
                      isCustomOrderNum
                        ? 'bg-white text-slate-900 border-sky-500 focus:ring-2 focus:ring-sky-500'
                        : 'bg-slate-200 text-sky-800 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Établi Par</label>
                  <input
                    type="text"
                    required
                    value={formEtablirPar}
                    onChange={(e) => setFormEtablirPar(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date de Commande (JJ/MM/AAAA)</label>
                  <DateInputDDMMYYYY
                    required
                    value={formDate}
                    onChange={(val) => setFormDate(val)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Fournisseur</label>
                    <button
                      type="button"
                      onClick={() => setIsSupplierModalOpen(true)}
                      className="text-[11px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-0.5 hover:underline"
                    >
                      <Plus size={12} />
                      <span>+ Nouveau Fournisseur</span>
                    </button>
                  </div>
                  <SearchableSelect
                    options={localSuppliers.map((s) => ({
                      value: s.id,
                      label: s.name,
                      subLabel: s.address || s.country || 'Algérie',
                      badge: 'Local',
                    }))}
                    value={formSupplierId}
                    onChange={(val) => setFormSupplierId(Number(val))}
                    placeholder="Sélectionner un fournisseur local (Algérie)"
                    searchPlaceholder="Rechercher fournisseur local..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as LocalOrderStatus)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="Commandée">📜 Commandée</option>
                    <option value="En cours">⏱️ En cours</option>
                    <option value="Livraison Partielle">🚚 Livraison Partielle</option>
                    <option value="Completed">✅ Clôturée</option>
                    <option value="Cancelled">❌ Annulée</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Délai de Livraison (Jours)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="ex: 15 (jours)"
                    value={formDelaiLivraisonJours ?? ''}
                    onChange={(e) => setFormDelaiLivraisonJours(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-sky-500 bg-white font-semibold text-slate-800"
                  />
                </div>

                <div className="md:col-span-3 bg-white p-3 rounded-xl border-2 border-dashed border-sky-200 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                    <span>Type de Procédure de Passation * <span className="text-rose-600 font-extrabold text-[11px]">(Obligatoire)</span></span>
                    {formProcedureType && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                        Sélectionné : {formProcedureType}
                      </span>
                    )}
                  </label>
                  <select
                    required
                    value={formProcedureType}
                    onChange={(e) => setFormProcedureType(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg border font-bold transition-all ${
                      !formProcedureType 
                        ? 'border-amber-400 bg-amber-50/70 text-slate-600 ring-2 ring-amber-200' 
                        : 'border-sky-400 bg-sky-50/30 text-sky-950 ring-1 ring-sky-200'
                    }`}
                  >
                    <option value="">-- Sélectionner le type de procédure (Obligatoire) * --</option>
                    <option value="Achat Direct">🏷️ Achat Direct</option>
                    <option value="Lettre de commande">📄 Lettre de commande</option>
                    <option value="Commande">📜 Commande</option>
                    <option value="Marché">🏛️ Marché</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Veuillez préciser la filière contractuelle conforme aux seuils de passation de l'entreprise.
                  </p>
                </div>

                <div className="md:col-span-3">
                  <ProcurementSourceSelector
                    selectedType={formProcurementSourceType}
                    selectedId={formProcurementSourceType === 'consultation' ? formConsultationId : formAppelOffreId}
                    selectedRef={formProcurementSourceType === 'consultation' ? formConsultationRef : formAppelOffreRef}
                    onSelect={handleSelectProcurementSource}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Objet de la Commande (Subject) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fourniture de pièces de rechange pour compresseur A3..."
                    value={formObjet}
                    onChange={(e) => setFormObjet(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                </div>
              </div>

              {/* LIVE MATHEMATICAL ORDER LINES TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-sky-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Lignes de Commande (Live Real-Time Calculations)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLineRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold hover:bg-sky-100 transition-colors"
                  >
                    <PlusCircle size={14} />
                    <span>Add Item Line</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold">
                      <tr>
                        <th className="px-2 py-2 w-10 text-center">Pos</th>
                        <th className="px-2 py-2 min-w-[200px]">Désignation</th>
                        <th className="px-2 py-2 min-w-[150px] text-right">Qty</th>
                        <th className="px-2 py-2 w-24">Unité</th>
                        <th className="px-2 py-2 min-w-[150px] text-right">Prix Unitaire</th>
                        <th className="px-2 py-2 w-20 text-right">TVA %</th>
                        <th className="px-2 py-2 min-w-[120px] text-right bg-slate-200/60">Total HT</th>
                        <th className="px-2 py-2 min-w-[120px] text-right bg-slate-200/60">Montant TVA</th>
                        <th className="px-2 py-2 min-w-[130px] text-right bg-sky-100/60 text-sky-900">Total TTC</th>
                        <th className="px-2 py-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-2 py-2 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="inline-flex items-center gap-1 text-[10px] text-sky-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={line.is_multiline || false}
                                    onChange={(e) => handleLineChange(idx, 'is_multiline', e.target.checked)}
                                    className="rounded text-sky-600 focus:ring-sky-500 w-3 h-3 cursor-pointer"
                                  />
                                  <span>Multi-lignes</span>
                                </label>
                              </div>
                              {line.is_multiline ? (
                                <textarea
                                  required
                                  rows={3}
                                  placeholder="Description détaillée de l'article sur plusieurs lignes..."
                                  value={line.designation}
                                  onChange={(e) => handleLineChange(idx, 'designation', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 bg-white"
                                />
                              ) : (
                                <input
                                  type="text"
                                  required
                                  placeholder="Description..."
                                  value={line.designation}
                                  onChange={(e) => handleLineChange(idx, 'designation', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-sky-500"
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              required
                              value={line.qty}
                              onChange={(e) => handleLineChange(idx, 'qty', e.target.value)}
                              className="w-full min-w-[135px] px-2.5 py-1 text-xs text-right border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 font-mono font-bold text-slate-900"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={line.unite}
                              onChange={(e) => handleLineChange(idx, 'unite', e.target.value as UnitType)}
                              className="w-full px-1 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-sky-500"
                            >
                              <option value="piece">piece</option>
                              <option value="kg">kg</option>
                              <option value="liter">liter</option>
                              <option value="box">box</option>
                              <option value="meter">meter</option>
                              <option value="roll">roll</option>
                              <option value="pack">pack</option>
                              <option value="set">set</option>
                              <option value="ton">ton</option>
                              <option value="drum">drum</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              required
                              value={line.unit_price}
                              onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                              className="w-full min-w-[135px] px-2.5 py-1 text-xs text-right border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 font-mono font-bold text-slate-900"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              required
                              value={line.tva_percentage}
                              onChange={(e) => handleLineChange(idx, 'tva_percentage', e.target.value)}
                              className="w-full px-2 py-1 text-xs text-right border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 font-mono"
                            />
                          </td>

                          {/* Computed Live Totals per Line */}
                          <td className="px-2 py-2 text-right font-mono font-medium bg-slate-50">
                            {line.total_ht.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-2 text-right font-mono font-medium bg-slate-50 text-slate-600">
                            {line.montant_tva.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-2 text-right font-mono font-bold text-sky-700 bg-sky-50/60">
                            {line.total_ttc.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineRow(idx)}
                              disabled={lines.length === 1}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LIVE GRAND TOTAL SUMMARY BOX */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-2">
                  <Calculator className="text-sky-400 shrink-0" size={20} />
                  <div>
                    <p className="text-xs font-semibold text-slate-300">Live Computed Order Totals</p>
                    <p className="text-[11px] text-slate-400">Sum of all item lines recalculated automatically</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right font-mono">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Total HT</span>
                    <span className="text-sm font-semibold text-slate-200">
                      {liveTotalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Total TVA</span>
                    <span className="text-sm font-semibold text-slate-300">
                      {liveTotalTVA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                    </span>
                  </div>

                  <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                    <span className="block text-[10px] text-sky-400 uppercase font-sans font-bold">
                      Grand Total TTC
                    </span>
                    <span className="text-base font-extrabold text-sky-300">
                      {liveTotalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                    </span>
                  </div>
                </div>
              </div>

              {/* Observation Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observation / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional conditions, delivery instructions..."
                  value={formObservation}
                  onChange={(e) => setFormObservation(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
                >
                  {editingId ? 'Update Local Order' : 'Save Local Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAIL VIEW MODAL */}
      {isDetailOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-base font-mono">Bon de Commande: {selectedOrder.n_order}</h3>
                <p className="text-xs text-slate-300">Issued on {formatDateDDMMYYYY(selectedOrder.date)} by {selectedOrder.etablir_par}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPrintOrder(selectedOrder);
                    setIsPrintModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  title="Imprimer le Bon de Commande"
                >
                  <Printer size={14} />
                  <span>Imprimer Bon de Commande</span>
                </button>
                {canEdit && (
                  <button
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleDuplicateOrder(selectedOrder);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm"
                    title="Dupliquer ce Bon de Commande"
                  >
                    <Copy size={14} />
                    <span>Dupliquer</span>
                  </button>
                )}
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">Fournisseur (Supplier)</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedOrder.supplier_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">Status</span>
                  <span>{getStatusBadge(selectedOrder.status)}</span>
                </div>
                {selectedOrder.procedure_type && (
                  <div className="col-span-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-900">Type de Procédure :</span>
                      <span className="font-mono font-bold text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded text-xs">
                        🏷️ {selectedOrder.procedure_type}
                      </span>
                    </div>
                  </div>
                )}
                {(selectedOrder.consultation_ref || selectedOrder.appel_offre_ref) && (
                  <div className="col-span-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link2 size={14} className="text-sky-600 shrink-0" />
                      <span className="font-semibold text-slate-700">Dossier source lié :</span>
                      <span className="font-mono font-bold text-sky-900 bg-sky-100 px-2 py-0.5 rounded text-xs">
                        {selectedOrder.consultation_ref || selectedOrder.appel_offre_ref}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        ({selectedOrder.procurement_source_type === 'consultation' ? 'Consultation (RFQ)' : "Appel d'Offres (Marché)"})
                      </span>
                    </div>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-slate-400 block font-semibold uppercase">Objet de commande</span>
                  <span className="font-medium text-slate-800">{selectedOrder.objet_de_commande}</span>
                </div>
                {selectedOrder.observation && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block font-semibold uppercase">Observation</span>
                    <span className="text-slate-700 italic">{selectedOrder.observation}</span>
                  </div>
                )}
              </div>

              {/* Lines Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lignes de Commande</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-semibold text-slate-700">
                      <tr>
                        <th className="px-3 py-2">Pos</th>
                        <th className="px-3 py-2">Designation</th>
                        <th className="px-3 py-2 text-right">Qté</th>
                        <th className="px-3 py-2">Unité</th>
                        <th className="px-3 py-2 text-right">Prix Unit.</th>
                        <th className="px-3 py-2 text-right">TVA</th>
                        <th className="px-3 py-2 text-right">Total TTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedOrder.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{l.designation}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{formatQty(l.qty)}</td>
                          <td className="px-3 py-2 text-slate-500">{l.unite}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatAmount(l.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-mono">{l.tva_percentage}%</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                            {formatAmount(l.total_ttc)} DA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center text-xs font-mono">
                <span className="font-sans font-bold text-slate-300">RÉSUMÉ TOTAL COMMANDE</span>
                <div className="space-x-4 text-right">
                  <span>HT: {formatAmount(selectedOrder.total_ht)} DA</span>
                  <span>TVA: {formatAmount(selectedOrder.total_tva)} DA</span>
                  <span className="font-bold text-sky-400 text-sm">
                    TTC: {formatAmount(selectedOrder.total_ttc)} DA
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setPrintOrder(selectedOrder);
                  setIsPrintModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                <Printer size={15} />
                <span>Imprimer Bon de Commande</span>
              </button>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-md hover:bg-slate-900"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIER CREATION MODAL */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        initialType="Local"
        onSuccess={(newSupp) => {
          onRefresh();
          if (newSupp) {
            setFormSupplierId(newSupp.id);
          }
        }}
      />

      {/* PRINT LOCAL ORDER MODAL */}
      <PrintLocalOrder
        isOpen={isPrintModalOpen}
        order={printOrder}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* MANDATORY SUPPLIER RE-EVALUATION MODAL ON CLÔTURE */}
      {pendingCompletionOrder && (
        <SupplierEvaluationModal
          isOpen={isEvaluationModalOpen}
          onClose={() => {
            setIsEvaluationModalOpen(false);
            setPendingCompletionOrder(null);
          }}
          onSubmitSuccess={handleEvaluationSubmitSuccess}
          supplierId={pendingCompletionOrder.fournisseur_id}
          supplierName={pendingCompletionOrder.supplier_name || 'Fournisseur'}
          orderId={pendingCompletionOrder.id}
          orderCode={pendingCompletionOrder.n_order}
          evaluatorName={currentUser.full_name || 'Utilisateur'}
        />
      )}
    </div>
  );
};
