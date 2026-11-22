import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  PlusCircle, 
  X, 
  Calendar, 
  Ship, 
  FileText,
  DollarSign,
  Copy,
  Link2
} from 'lucide-react';
import { ForeignOrder, ForeignOrderLine, Supplier, User, CurrencyType, UnitType, IncotermType } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { DateInputDDMMYYYY } from './DateInputDDMMYYYY';
import { ProcurementSourceSelector, SelectedProcurementSource } from './ProcurementSourceSelector';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { SupplierModal } from './SupplierModal';

interface ForeignOrdersProps {
  currentUser: User;
  suppliers: Supplier[];
  orders: ForeignOrder[];
  loading: boolean;
  onRefresh: () => void;
  openCreateModalDirectly?: boolean;
  onSelectTab?: (tab: string) => void;
}

export const ForeignOrders: React.FC<ForeignOrdersProps> = ({
  currentUser,
  suppliers,
  orders,
  loading,
  onRefresh,
  onSelectTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ForeignOrder | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields
  const [nextCode, setNextCode] = useState<string>('S26-20E');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formProformaRef, setFormProformaRef] = useState('');
  const [formProformaDate, setFormProformaDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCurrency, setFormCurrency] = useState<CurrencyType>('EUR');
  const [formSupplierId, setFormSupplierId] = useState<number>(suppliers[0]?.id || 3);
  const [formCountry, setFormCountry] = useState('Germany');
  const [formModePaiement, setFormModePaiement] = useState('');
  const [formEtd, setFormEtd] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'In Customs' | 'Delivered' | 'Cancelled'>('Active');

  // Procurement Source Linkage State
  const [formProcurementSourceType, setFormProcurementSourceType] = useState<'consultation' | 'appel_offre' | 'none'>('none');
  const [formConsultationId, setFormConsultationId] = useState<number | undefined>(undefined);
  const [formConsultationRef, setFormConsultationRef] = useState<string | undefined>(undefined);
  const [formAppelOffreId, setFormAppelOffreId] = useState<number | undefined>(undefined);
  const [formAppelOffreRef, setFormAppelOffreRef] = useState<string | undefined>(undefined);

  // Expedition Config during Order Creation
  const [formNumExpeditions, setFormNumExpeditions] = useState<number>(1);
  const [formDestinationType, setFormDestinationType] = useState<'Port' | 'Aéroport'>('Port');

  // Items
  const [lines, setLines] = useState<ForeignOrderLine[]>([
    {
      position: 1,
      designation: '',
      qty: 1,
      unite: 'piece',
      unit_price: 0,
      total_price: 0,
    },
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDetailOpen) {
          setIsDetailOpen(false);
          setSelectedOrder(null);
        } else if (isFormOpen) {
          setIsFormOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen, isDetailOpen]);

  const canEdit =
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'Appro' ||
    currentUser?.role === 'Chef Service';

  const isAlgerian = (countryName?: string) => {
    if (!countryName) return false;
    const c = countryName.trim().toLowerCase();
    return c === 'algeria' || c === 'algérie' || c === 'algerie' || c === 'dz' || c === 'algerien' || c === 'algérienne';
  };

  // Only suppliers with nationality other than Algeria / Algérie
  const foreignSuppliers = suppliers.filter((s) => !isAlgerian(s.country) || s.is_foreign);

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

    // Auto-fill proforma/item if appropriate
    if (source.supplier_name) {
      const match = foreignSuppliers.find((s) => s.name.toLowerCase().trim() === source.supplier_name?.toLowerCase().trim()) ||
                    suppliers.find((s) => s.name.toLowerCase().trim() === source.supplier_name?.toLowerCase().trim());
      if (match) {
        setFormSupplierId(match.id);
        if (match.country) setFormCountry(match.country);
      }
    }

    // Auto-populate item lines if available in linked consultation/AO
    if (source.articles && source.articles.length > 0) {
      const isLinesEmptyOrBlank = lines.length === 0 || (lines.length === 1 && !lines[0].designation.trim());
      if (isLinesEmptyOrBlank) {
        setLines(
          source.articles.map((art, idx) => ({
            id: idx + 1,
            position: idx + 1,
            designation: art.designation,
            qty: art.qty || 1,
            unite: (art.unite as any) || 'piece',
            unit_price: 0,
            total_price: 0,
          }))
        );
      }
    }
  };

  const handleOpenNewModal = async () => {
    try {
      const res = await fetch('/api/orders/next-number?type=foreign');
      if (res.ok) {
        const data = await res.json();
        setNextCode(data.nextNumber);
      }
    } catch (e) {
      console.error(e);
    }

    const defaultSupplier = foreignSuppliers[0] || suppliers[0];

    setEditingId(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormProformaRef('PRO-2026-001');
    setFormProformaDate(new Date().toISOString().split('T')[0]);
    setFormModePaiement('');
    setFormCurrency('EUR');
    setFormSupplierId(defaultSupplier?.id || 1);
    setFormCountry(defaultSupplier?.country || 'Germany');

    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    setFormEtd(in30Days.toISOString().split('T')[0]);

    setFormStatus('Active');
    setFormProcurementSourceType('none');
    setFormConsultationId(undefined);
    setFormConsultationRef(undefined);
    setFormAppelOffreId(undefined);
    setFormAppelOffreRef(undefined);
    setFormNumExpeditions(1);
    setFormDestinationType('Port');
    setLines([
      {
        position: 1,
        designation: 'Industrial Control Valve 50mm',
        qty: 4,
        unite: 'piece',
        unit_price: 2500,
        total_price: 10000,
      },
    ]);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (order: ForeignOrder) => {
    setEditingId(order.id);
    setNextCode(order.code);
    setFormDate(order.date);
    setFormProformaRef(order.proforma_ref);
    setFormProformaDate(order.proforma_date);
    setFormModePaiement(order.mode_paiement || '');
    setFormCurrency(order.currency);
    setFormSupplierId(order.fournisseur_id);
    setFormCountry(order.country);
    setFormEtd(order.estimated_time_delivery);
    setFormStatus(order.status);
    setFormProcurementSourceType(order.procurement_source_type || (order.consultation_ref ? 'consultation' : (order.appel_offre_ref ? 'appel_offre' : 'none')));
    setFormConsultationId(order.consultation_id);
    setFormConsultationRef(order.consultation_ref);
    setFormAppelOffreId(order.appel_offre_id);
    setFormAppelOffreRef(order.appel_offre_ref);
    setFormNumExpeditions(order.num_expeditions || 1);
    setFormDestinationType(order.destination_type || 'Port');

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
          total_price: 0,
        },
      ]);
    }
    setIsFormOpen(true);
  };

  const handleDuplicateOrder = async (order: ForeignOrder) => {
    let freshNextCode = '';
    try {
      const res = await fetch('/api/orders/next-number?type=foreign');
      if (res.ok) {
        const data = await res.json();
        freshNextCode = data.nextNumber;
      }
    } catch (e) {
      console.error(e);
    }

    setEditingId(null);
    setNextCode(freshNextCode || `${order.code}-BIS`);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormProformaRef(order.proforma_ref ? `${order.proforma_ref}-BIS` : '');
    setFormProformaDate(order.proforma_date || new Date().toISOString().split('T')[0]);
    setFormModePaiement(order.mode_paiement || '');
    setFormCurrency(order.currency);
    setFormSupplierId(order.fournisseur_id);
    setFormCountry(order.country);
    setFormEtd(order.estimated_time_delivery || new Date().toISOString().split('T')[0]);
    setFormStatus('Draft');
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
          foreign_order_id: undefined as any,
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
          total_price: 0,
        },
      ]);
    }
    setIsFormOpen(true);
  };

  const handleLineChange = (index: number, field: keyof ForeignOrderLine, value: any) => {
    setLines((prevLines) => {
      const updated = [...prevLines];
      const target = { ...updated[index], [field]: value };

      const qty = Number(target.qty) || 0;
      const unit_price = Number(target.unit_price) || 0;
      target.total_price = Number((qty * unit_price).toFixed(2));

      updated[index] = target;
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
        total_price: 0,
      },
    ]);
  };

  const handleRemoveLineRow = (index: number) => {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index).map((l, idx) => ({ ...l, position: idx + 1 })));
  };

  const computedOrderAmount = lines.reduce((acc, curr) => acc + (curr.total_price || 0), 0);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProformaRef || !formSupplierId || !formEtd) {
      alert('Please fill in required fields.');
      return;
    }

    const payload = {
      code: nextCode,
      date: formDate,
      proforma_ref: formProformaRef,
      proforma_date: formProformaDate,
      mode_paiement: formModePaiement,
      amount: computedOrderAmount,
      currency: formCurrency,
      fournisseur_id: formSupplierId,
      country: formCountry,
      estimated_time_delivery: formEtd,
      status: formStatus,
      num_expeditions: formNumExpeditions,
      destination_type: formDestinationType,
      lines,
      procurement_source_type: formProcurementSourceType,
      consultation_id: formConsultationId,
      consultation_ref: formConsultationRef,
      appel_offre_id: formAppelOffreId,
      appel_offre_ref: formAppelOffreRef,
    };

    try {
      const url = editingId ? `/api/foreign-orders/${editingId}` : '/api/foreign-orders';
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
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Are you sure you want to delete this foreign order?')) return;
    try {
      const res = await fetch(`/api/foreign-orders/${id}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/foreign-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onRefresh();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus as any });
        }
      } else {
        const err = await res.json();
        alert(`Error updating status: ${err.error}`);
      }
    } catch (e) {
      console.error('Failed to update foreign order status:', e);
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, currencyFilter]);

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      o.code.toLowerCase().includes(term) ||
      (o.proforma_ref && o.proforma_ref.toLowerCase().includes(term)) ||
      (o.supplier_name && o.supplier_name.toLowerCase().includes(term)) ||
      (o.lines && o.lines.some((l) => l.designation && l.designation.toLowerCase().includes(term)));

    const matchesCurrency = currencyFilter === 'ALL' || o.currency === currencyFilter;

    return matchesSearch && matchesCurrency;
  });

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4 sm:space-y-6 w-full mx-auto">
      {/* Sub-Navigation Tabs: Commandes Étrangères & Expéditions Étrangères */}
      {onSelectTab && (
        <div className="flex items-center space-x-2 bg-slate-200/80 p-1.5 rounded-2xl w-fit shadow-inner">
          <button
            type="button"
            className="px-4 py-2 text-xs font-bold rounded-xl bg-white text-slate-900 shadow-sm flex items-center space-x-2 transition-all cursor-default"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>🌐 Commandes Étrangères</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('expeditions')}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Ship className="w-4 h-4 text-slate-500" />
            <span>🚢 Expéditions Étrangères</span>
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Foreign Orders Register (Commande Étrangère)</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
              Bientôt disponible
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Strict Code Format: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sky-700 font-semibold">S[YY]-[NUM]E</code> (Number strictly between 01 and 99)
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenNewModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-xs transition-colors shrink-0"
          >
            <Plus size={16} />
            <span>Create Foreign Order</span>
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code (S26-20E), proforma ref, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          />
        </div>

        <div>
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="ALL">All Currencies</option>
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
            <option value="DA">DA</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading foreign orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Globe size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-medium">No foreign orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 min-w-[140px] whitespace-nowrap">Code</th>
                  <th className="px-4 py-3 min-w-[110px] whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 min-w-[200px] whitespace-nowrap">Supplier & Country</th>
                  <th className="px-4 py-3 min-w-[150px] whitespace-nowrap">Proforma Ref</th>
                  <th className="px-4 py-3 text-right min-w-[150px] whitespace-nowrap">Amount</th>
                  <th className="px-4 py-3 min-w-[110px] whitespace-nowrap">ETD</th>
                  <th className="px-4 py-3 text-center min-w-[140px] whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-center min-w-[120px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-bold font-mono min-w-[140px] whitespace-nowrap">
                      <div className="text-sky-700">{o.code}</div>
                      {(o.consultation_ref || o.appel_offre_ref) && (
                        <div 
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                          title={`Dossier source : ${o.consultation_ref || o.appel_offre_ref}`}
                        >
                          <Link2 size={10} className="text-purple-600" />
                          <span>{o.consultation_ref || o.appel_offre_ref}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 min-w-[110px] whitespace-nowrap">{formatDateDDMMYYYY(o.date)}</td>
                    <td className="px-4 py-3.5 min-w-[200px] whitespace-nowrap">
                      <div className="font-medium text-slate-900">{o.supplier_name}</div>
                      <div className="text-[11px] text-slate-400">{o.country}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">{o.proforma_ref}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900 font-mono min-w-[150px] whitespace-nowrap">
                      {o.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {o.currency}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium whitespace-nowrap">{formatDateDDMMYYYY(o.estimated_time_delivery)}</td>
                    <td className="px-4 py-3.5 text-center">
                      {canEdit ? (
                        <select
                          value={o.status}
                          onChange={(e) => handleStatusChange(o.id, e.target.value)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-2xs hover:border-sky-400 transition-colors"
                        >
                          <option value="Active">Active (En Cours)</option>
                          <option value="In Customs">In Customs (En Douane)</option>
                          <option value="Delivered">Delivered (Livrée)</option>
                          <option value="Cancelled">Cancelled (Annulée)</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          o.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          o.status === 'In Customs' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          o.status === 'Cancelled' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                          'bg-sky-100 text-sky-800 border-sky-200'
                        }`}>
                          {o.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleDuplicateOrder(o)}
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                              title="Dupliquer la commande"
                            >
                              <Copy size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(o)}
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                              title="Edit Foreign Order"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(o.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Delete Foreign Order"
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
              Affichage <span className="font-semibold text-slate-700">{((currentPage - 1) * pageSize) + 1}</span> à <span className="font-semibold text-slate-700">{Math.min(currentPage * pageSize, filteredOrders.length)}</span> sur <span className="font-semibold text-slate-700">{filteredOrders.length}</span> commandes étrangères
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

      {/* CREATE / EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold text-base">
                {editingId ? `Modifier la Commande Étrangère : ${nextCode}` : `Nouvelle Commande Étrangère (Code : ${nextCode})`}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="md:col-span-3">
                  <ProcurementSourceSelector
                    selectedType={formProcurementSourceType}
                    selectedId={formProcurementSourceType === 'consultation' ? formConsultationId : formAppelOffreId}
                    selectedRef={formProcurementSourceType === 'consultation' ? formConsultationRef : formAppelOffreRef}
                    onSelect={handleSelectProcurementSource}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">N° / Code de Commande</label>
                  <input
                    type="text"
                    required
                    value={nextCode}
                    onChange={(e) => setNextCode(e.target.value)}
                    placeholder="e.g. S26-20E"
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white text-sky-900 rounded border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
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
                    <label className="block text-xs font-semibold text-slate-700">Fournisseur Étranger *</label>
                    <button
                      type="button"
                      onClick={() => setIsSupplierModalOpen(true)}
                      className="text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1"
                    >
                      <span>+ Nouveau</span>
                    </button>
                  </div>
                  <SearchableSelect
                    options={foreignSuppliers.map((s) => ({
                      value: s.id,
                      label: s.name,
                      subLabel: `${s.country} - ${s.address || 'Adresse non renseignée'}`,
                      badge: 'Étranger',
                    }))}
                    value={formSupplierId}
                    onChange={(val) => {
                      const id = Number(val);
                      setFormSupplierId(id);
                      const sup = suppliers.find((s) => s.id === id);
                      if (sup) setFormCountry(sup.country);
                    }}
                    placeholder="Sélectionner un fournisseur étranger"
                    searchPlaceholder="Rechercher fournisseur étranger..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Réf. Proforma</label>
                  <input
                    type="text"
                    required
                    value={formProformaRef}
                    onChange={(e) => setFormProformaRef(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date Proforma (JJ/MM/AAAA)</label>
                  <DateInputDDMMYYYY
                    required
                    value={formProformaDate}
                    onChange={(val) => setFormProformaDate(val)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Devise</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value as CurrencyType)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white font-semibold"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF</option>
                    <option value="CAD">CAD</option>
                    <option value="CNY">CNY</option>
                    <option value="DA">DA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mode de Paiement (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: Virement bancaire, LC, CAD..."
                    value={formModePaiement}
                    onChange={(e) => setFormModePaiement(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pays d'Origine</label>
                  <input
                    type="text"
                    required
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date Estimée de Livraison / ETD (JJ/MM/AAAA)</label>
                  <DateInputDDMMYYYY
                    required
                    value={formEtd}
                    onChange={(val) => setFormEtd(val)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Statut</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white font-semibold"
                  >
                    <option value="Active">Active (En Cours)</option>
                    <option value="In Customs">En Douane</option>
                    <option value="Delivered">Livrée</option>
                    <option value="Cancelled">Annulée</option>
                  </select>
                </div>
              </div>

              {/* Configuration des Expéditions (Création Automatique) */}
              {!editingId && (
                <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Ship size={15} className="text-sky-600" />
                      <span>Génération Automatique des Expéditions</span>
                    </h4>
                    <span className="text-[11px] text-sky-700 font-medium">
                      Code de base : <strong className="font-mono font-bold text-sky-900">{nextCode}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombre d'expéditions prévues
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        required
                        value={formNumExpeditions}
                        onChange={(e) => setFormNumExpeditions(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white font-bold text-slate-900"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        {formNumExpeditions === 1
                          ? `1 expédition sera créée avec le code "${nextCode}".`
                          : `${formNumExpeditions} expéditions seront créées ("${nextCode}-1ere", "${nextCode}-2eme", ...).`}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Type de Destination
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setFormDestinationType('Port')}
                          className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                            formDestinationType === 'Port'
                              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          ⚓ Port Maritime
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormDestinationType('Aéroport')}
                          className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                            formDestinationType === 'Aéroport'
                              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          ✈️ Aéroport Aérien
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Détermine la liste par défaut des ports/aéroports algériens disponibles.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Foreign Order Items / Lines
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLineRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold hover:bg-sky-100"
                  >
                    <PlusCircle size={14} />
                    <span>Add Item Line</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-semibold text-slate-700">
                      <tr>
                        <th className="px-2 py-2 w-10 text-center">Pos</th>
                        <th className="px-2 py-2">Item Designation</th>
                        <th className="px-2 py-2 w-20 text-right">Qty</th>
                        <th className="px-2 py-2 w-24">Unit</th>
                        <th className="px-2 py-2 w-28 text-right">Unit Price</th>
                        <th className="px-2 py-2 w-32 text-right bg-sky-100/60 font-bold">Total ({formCurrency})</th>
                        <th className="px-2 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-2 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              required
                              value={line.designation}
                              onChange={(e) => handleLineChange(idx, 'designation', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              required
                              value={line.qty}
                              onChange={(e) => handleLineChange(idx, 'qty', e.target.value)}
                              className="w-full px-2 py-1 text-xs text-right border border-slate-300 rounded font-mono"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={line.unite}
                              onChange={(e) => handleLineChange(idx, 'unite', e.target.value as UnitType)}
                              className="w-full px-1 py-1 text-xs border border-slate-300 rounded"
                            >
                              <option value="piece">piece</option>
                              <option value="kg">kg</option>
                              <option value="liter">liter</option>
                              <option value="box">box</option>
                              <option value="set">set</option>
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
                              className="w-full px-2 py-1 text-xs text-right border border-slate-300 rounded font-mono"
                            />
                          </td>
                          <td className="px-2 py-2 text-right font-mono font-bold text-sky-800 bg-sky-50">
                            {line.total_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineRow(idx)}
                              disabled={lines.length === 1}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
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

              {/* Order Amount Bar */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between font-mono">
                <span className="text-xs text-slate-300 font-sans">TOTAL FOREIGN CONTRACT AMOUNT</span>
                <span className="text-lg font-bold text-sky-300">
                  {computedOrderAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {formCurrency}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 rounded-lg shadow-xs"
                >
                  {editingId ? 'Update Foreign Order' : 'Save Foreign Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-base font-mono">Commande Étrangère: {selectedOrder.code}</h3>
                <p className="text-xs text-slate-300">Proforma: {selectedOrder.proforma_ref} ({formatDateDDMMYYYY(selectedOrder.proforma_date)})</p>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleDuplicateOrder(selectedOrder);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                    title="Dupliquer cette commande étrangère"
                  >
                    <Copy size={14} />
                    <span>Dupliquer</span>
                  </button>
                )}
                <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">Supplier</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedOrder.supplier_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">Country</span>
                  <span className="font-medium text-slate-800">{selectedOrder.country}</span>
                </div>
                {(selectedOrder.consultation_ref || selectedOrder.appel_offre_ref) && (
                  <div className="col-span-2 p-2.5 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link2 size={14} className="text-purple-600 shrink-0" />
                      <span className="font-semibold text-slate-700">Dossier source lié :</span>
                      <span className="font-mono font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded text-xs">
                        {selectedOrder.consultation_ref || selectedOrder.appel_offre_ref}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        ({selectedOrder.procurement_source_type === 'consultation' ? 'Consultation (RFQ)' : "Appel d'Offres (Marché)"})
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">Estimated Time of Delivery (ETD)</span>
                  <span className="font-bold text-slate-700">{formatDateDDMMYYYY(selectedOrder.estimated_time_delivery)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">Contract Amount</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {selectedOrder.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {selectedOrder.currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">Mode de Paiement</span>
                  <span className="font-bold text-sky-700">{selectedOrder.mode_paiement || 'Non renseigné'}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[11px]">Live Status:</span>
                  {canEdit ? (
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                      className="text-xs font-bold px-3 py-1 rounded-lg border border-slate-300 bg-white text-sky-900 focus:ring-2 focus:ring-sky-500 shadow-2xs"
                    >
                      <option value="Active">Active (En Cours)</option>
                      <option value="In Customs">In Customs (En Douane)</option>
                      <option value="Delivered">Delivered (Livrée)</option>
                      <option value="Cancelled">Cancelled (Annulée)</option>
                    </select>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                      {selectedOrder.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Shipped / Contract Items</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-semibold text-slate-700">
                      <tr>
                        <th className="px-3 py-2">Pos</th>
                        <th className="px-3 py-2">Designation</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Total ({selectedOrder.currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedOrder.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{l.designation}</td>
                          <td className="px-3 py-2 text-right font-mono">{l.qty}</td>
                          <td className="px-3 py-2 text-slate-500">{l.unite}</td>
                          <td className="px-3 py-2 text-right font-mono">{l.unit_price.toLocaleString('en-US')}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                            {l.total_price.toLocaleString('en-US')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-md hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIER CREATION MODAL */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        initialType="Étranger"
        onSuccess={(newSupp) => {
          onRefresh();
          if (newSupp) {
            setFormSupplierId(newSupp.id);
            setFormCountry(newSupp.country);
          }
        }}
      />
    </div>
  );
};
