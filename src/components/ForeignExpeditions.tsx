import React, { useState, useEffect } from 'react';
import { 
  Ship, 
  Globe,
  FileText,
  Plus, 
  Search, 
  Trash2, 
  Edit,
  X, 
  Package, 
  ChevronDown, 
  ChevronRight,
  Layers,
  Scale,
  AlertTriangle
} from 'lucide-react';
import { ForeignExpedition, ForeignOrder, User, IncotermType, ExpeditionStatus } from '../types';
import { ALGERIAN_PORTS, ALGERIAN_AIRPORTS, ALL_INCOTERMS } from '../constants/ports';
import { SearchableSelect } from './SearchableSelect';
import { DateInputDDMMYYYY } from './DateInputDDMMYYYY';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

interface ForeignExpeditionsProps {
  currentUser: User;
  orders: ForeignOrder[];
  expeditions: ForeignExpedition[];
  loading: boolean;
  onRefresh: () => void;
  onSelectTab?: (tab: string) => void;
}

export const ForeignExpeditions: React.FC<ForeignExpeditionsProps> = ({
  currentUser,
  orders,
  expeditions,
  loading,
  onRefresh,
  onSelectTab,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<number>(orders[0]?.id || 0);
  const [editingExpeditionId, setEditingExpeditionId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedExpeditionId, setExpandedExpeditionId] = useState<number | null>(null);

  // Form Fields
  const [nFacture, setNFacture] = useState('');
  const [dateFacture, setDateFacture] = useState(new Date().toISOString().split('T')[0]);
  const [nBlLta, setNBlLta] = useState('');
  const [montant, setMontant] = useState<number>(0);
  const [incoterm, setIncoterm] = useState<IncotermType>('FOB');
  const [destinationType, setDestinationType] = useState<'Port' | 'Aéroport'>('Port');
  const [portDestination, setPortDestination] = useState("Port d'Alger");
  const [isCustomDestination, setIsCustomDestination] = useState(false);
  const [status, setStatus] = useState<ExpeditionStatus>('In Transit');

  // Item Quantities & Prices maps
  const [shippedQtyMap, setShippedQtyMap] = useState<Record<number, number>>({});
  const [shippedPriceMap, setShippedPriceMap] = useState<Record<number, number>>({});

  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Appro' || currentUser?.role === 'Chef Service';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
          setEditingExpeditionId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Selected Order reference
  const selectedOrder = orders.find((o) => Number(o.id) === Number(selectedOrderId));

  // Calculate total quantity already shipped for a given order line across OTHER expeditions
  const getAlreadyShippedForLineExcludingExpedition = (orderId: number, line: any, idx: number, excludeExpId: number | null) => {
    const existingOrderExpeditions = expeditions.filter(e => 
      Number(e.foreign_order_id) === Number(orderId) && 
      (!excludeExpId || Number(e.id) !== Number(excludeExpId))
    );
    let totalShipped = 0;
    existingOrderExpeditions.forEach(exp => {
      if (exp.shipped_lines) {
        exp.shipped_lines.forEach(l => {
          const matchesId = line.id && Number(l.foreign_line_id) === Number(line.id);
          const matchesPos = line.position && Number(l.foreign_line_id) === Number(line.position);
          const matchesIdx = Number(l.foreign_line_id) === (idx + 1);
          if (matchesId || matchesPos || matchesIdx) {
            totalShipped += Number(l.shipped_qty) || 0;
          }
        });
      }
    });
    return totalShipped;
  };

  const getAlreadyShippedForLine = (orderId: number, line: any, idx: number) => {
    return getAlreadyShippedForLineExcludingExpedition(orderId, line, idx, null);
  };

  // Pre-fill quantities when selected order changes in create mode
  useEffect(() => {
    if (!editingExpeditionId && selectedOrder && selectedOrder.lines) {
      const initialQtyMap: Record<number, number> = {};
      const initialPriceMap: Record<number, number> = {};
      let total = 0;
      selectedOrder.lines.forEach((line, idx) => {
        const lineKey = line.id || line.position || (idx + 1);
        const alreadyShipped = getAlreadyShippedForLine(selectedOrder.id, line, idx);
        const remainingQty = Math.max(0, line.qty - alreadyShipped);

        initialQtyMap[lineKey] = remainingQty; // Default to remaining balance
        initialPriceMap[lineKey] = line.unit_price; // Default to order unit price
        total += remainingQty * line.unit_price;
      });
      setShippedQtyMap(initialQtyMap);
      setShippedPriceMap(initialPriceMap);
      setMontant(Number(total.toFixed(2)));
    } else if (!editingExpeditionId) {
      setShippedQtyMap({});
      setShippedPriceMap({});
      setMontant(selectedOrder?.amount || 0);
    }
  }, [selectedOrderId, expeditions, editingExpeditionId]);

  const handleOpenModal = () => {
    setEditingExpeditionId(null);
    const defaultId = orders[0]?.id || 0;
    setSelectedOrderId(defaultId);
    setNFacture('');
    setDateFacture(new Date().toISOString().split('T')[0]);
    setNBlLta('');
    setIncoterm('FOB');
    setDestinationType('Port');
    setPortDestination("Port d'Alger");
    setIsCustomDestination(false);
    setStatus('In Transit');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp: ForeignExpedition) => {
    setEditingExpeditionId(exp.id);
    setSelectedOrderId(exp.foreign_order_id);
    setNFacture(exp.n_facture || '');
    setDateFacture(exp.date_facture || new Date().toISOString().split('T')[0]);
    setNBlLta(exp.n_bl_lta || '');
    setIncoterm((exp.incoterm as IncotermType) || 'FOB');

    const rawDest = exp.port_aeroport_destination || "Port d'Alger";
    const isAirport = rawDest.toLowerCase().includes('aéroport') || rawDest.toLowerCase().includes('aeroport');
    setDestinationType(isAirport ? 'Aéroport' : 'Port');
    setPortDestination(rawDest);
    setIsCustomDestination(!ALGERIAN_PORTS.includes(rawDest) && !ALGERIAN_AIRPORTS.includes(rawDest));

    setStatus((exp.status as ExpeditionStatus) || 'In Transit');
    setMontant(exp.montant || 0);

    // Pre-fill line quantities and prices from exp.shipped_lines
    const order = orders.find((o) => Number(o.id) === Number(exp.foreign_order_id));
    const qtyMap: Record<number, number> = {};
    const priceMap: Record<number, number> = {};

    if (order && order.lines) {
      order.lines.forEach((line, idx) => {
        const lineKey = line.id || line.position || (idx + 1);
        const match = exp.shipped_lines?.find(
          (sl) =>
            Number(sl.foreign_line_id) === Number(lineKey) ||
            (line.id && Number(sl.foreign_line_id) === Number(line.id)) ||
            Number(sl.foreign_line_id) === idx + 1
        );

        qtyMap[lineKey] = match ? Number(match.shipped_qty) || 0 : 0;
        priceMap[lineKey] = match && match.unit_price !== undefined ? Number(match.unit_price) : line.unit_price;
      });
    }

    setShippedQtyMap(qtyMap);
    setShippedPriceMap(priceMap);
    setIsModalOpen(true);
  };

  const handleItemChange = (lineKey: number, field: 'qty' | 'unit_price', val: number) => {
    const updatedQtyMap = field === 'qty' ? { ...shippedQtyMap, [lineKey]: Math.max(0, val) } : shippedQtyMap;
    const updatedPriceMap = field === 'unit_price' ? { ...shippedPriceMap, [lineKey]: Math.max(0, val) } : shippedPriceMap;

    setShippedQtyMap(updatedQtyMap);
    setShippedPriceMap(updatedPriceMap);

    if (selectedOrder && selectedOrder.lines) {
      const newTotal = selectedOrder.lines.reduce((sum, line, idx) => {
        const lKey = line.id || line.position || (idx + 1);
        const alreadyShippedOther = getAlreadyShippedForLineExcludingExpedition(selectedOrder.id, line, idx, editingExpeditionId);
        const maxAllowedQty = Math.max(0, line.qty - alreadyShippedOther);
        const q = updatedQtyMap[lKey] !== undefined ? updatedQtyMap[lKey] : maxAllowedQty;
        const p = updatedPriceMap[lKey] !== undefined ? updatedPriceMap[lKey] : line.unit_price;
        return sum + (q * p);
      }, 0);
      setMontant(Number(newTotal.toFixed(2)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      alert('Veuillez sélectionner une commande étrangère.');
      return;
    }

    // STRICT VALIDATION: Ensure no line shipped quantity exceeds remaining balance of main order
    if (selectedOrder && selectedOrder.lines) {
      for (let idx = 0; idx < selectedOrder.lines.length; idx++) {
        const line = selectedOrder.lines[idx];
        const lineKey = line.id || line.position || (idx + 1);
        const alreadyShippedOther = getAlreadyShippedForLineExcludingExpedition(selectedOrder.id, line, idx, editingExpeditionId);
        const maxAllowedQty = Math.max(0, line.qty - alreadyShippedOther);
        const currentQty = shippedQtyMap[lineKey] !== undefined ? shippedQtyMap[lineKey] : maxAllowedQty;

        if (currentQty > maxAllowedQty) {
          alert(`🚫 Quantité Refusée !\n\nPour l'article "${line.designation}", la quantité saisie (${currentQty}) dépasse le solde disponible (${maxAllowedQty}) de la commande principale.\n\nVous ne pouvez pas dépasser la quantité de la commande. Veuillez ajuster la quantité (${maxAllowedQty} max) ou modifier la commande principale.`);
          return;
        }
      }
    }

    // Build shipped lines payload
    const shipped_lines = selectedOrder?.lines
      ? selectedOrder.lines
          .map((line, idx) => {
            const lineKey = line.id || line.position || (idx + 1);
            const alreadyShippedOther = getAlreadyShippedForLineExcludingExpedition(selectedOrder.id, line, idx, editingExpeditionId);
            const defaultRemaining = Math.max(0, line.qty - alreadyShippedOther);
            const shippedQty = shippedQtyMap[lineKey] !== undefined ? shippedQtyMap[lineKey] : defaultRemaining;
            const unitPrice = shippedPriceMap[lineKey] !== undefined ? shippedPriceMap[lineKey] : line.unit_price;
            return {
              foreign_line_id: lineKey,
              designation: line.designation,
              shipped_qty: Number(shippedQty) || 0,
              unit_price: Number(unitPrice) || 0,
            };
          })
      : [];

    try {
      const url = editingExpeditionId ? `/api/foreign-expeditions/${editingExpeditionId}` : '/api/foreign-expeditions';
      const method = editingExpeditionId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foreign_order_id: selectedOrderId,
          n_facture: nFacture || 'En attente',
          date_facture: dateFacture,
          n_bl_lta: nBlLta || 'En attente',
          montant: montant || 0,
          incoterm: incoterm,
          port_aeroport_destination: portDestination || "Port / Aéroport d'Alger",
          status: status,
          shipped_lines,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingExpeditionId(null);
        onRefresh();
      } else {
        const err = await res.json();
        alert(`Erreur: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette expédition ?')) return;
    try {
      const res = await fetch(`/api/foreign-expeditions/${id}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (expeditionId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/foreign-expeditions/${expeditionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onRefresh();
      } else {
        const err = await res.json();
        alert(`Erreur de mise à jour: ${err.error}`);
      }
    } catch (e) {
      console.error('Failed to update expedition status:', e);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredExpeditions = expeditions.filter((e) => {
    const term = searchTerm.toLowerCase();
    return (
      e.expedition_code.toLowerCase().includes(term) ||
      e.n_facture.toLowerCase().includes(term) ||
      e.n_bl_lta.toLowerCase().includes(term) ||
      (e.foreign_code && e.foreign_code.toLowerCase().includes(term)) ||
      (e.shipped_lines && e.shipped_lines.some((l) => l.designation && l.designation.toLowerCase().includes(term)))
    );
  });

  const totalPages = Math.ceil(filteredExpeditions.length / pageSize) || 1;
  const paginatedExpeditions = filteredExpeditions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4 sm:space-y-6 w-full mx-auto">
      {/* Sub-Navigation Tabs: Commandes Étrangères & Expéditions Étrangères */}
      {onSelectTab && (
        <div className="flex items-center space-x-2 bg-slate-200/80 p-1.5 rounded-2xl w-fit shadow-inner">
          <button
            type="button"
            onClick={() => onSelectTab('foreign-orders')}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Globe className="w-4 h-4 text-slate-500" />
            <span>🌐 Commandes Étrangères</span>
          </button>
          <button
            type="button"
            className="px-4 py-2 text-xs font-bold rounded-xl bg-white text-slate-900 shadow-sm flex items-center space-x-2 transition-all cursor-default"
          >
            <Ship className="w-4 h-4 text-blue-600" />
            <span>🚢 Expéditions Étrangères</span>
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Registre des Expéditions Étrangères</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
              Bientôt disponible
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Gestion du solde et expéditions partielles. 1ère expédition : <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-bold">S26-20E</code>. Si plusieurs expéditions : <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-bold">S26-20E-1ere</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-bold">S26-20E-2eme</code>...
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus size={16} />
            <span>Nouvelle Expédition Étrangère</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher code expédition (ex: S26-20E-1ere), N° Facture, ou N° BL/LTA..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
        />
      </div>

      {/* Expeditions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Chargement des expéditions...</div>
        ) : filteredExpeditions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Ship size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-medium">Aucune expédition enregistrée pour le moment</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="w-8 px-2 py-3 text-center"></th>
                  <th className="px-4 py-3">Code Expédition</th>
                  <th className="px-4 py-3">N° Facture & Date</th>
                  <th className="px-4 py-3">N° BL / LTA</th>
                  <th className="px-4 py-3 text-right min-w-[150px] whitespace-nowrap">Montant Expédié</th>
                  <th className="px-4 py-3">Incoterm</th>
                  <th className="px-4 py-3">Port / Destination</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedExpeditions.map((e) => {
                  const isExpanded = expandedExpeditionId === e.id;
                  const hasLines = e.shipped_lines && e.shipped_lines.length > 0;

                  return (
                    <React.Fragment key={e.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-2 py-3.5 text-center">
                          {hasLines && (
                            <button
                              onClick={() => setExpandedExpeditionId(isExpanded ? null : e.id)}
                              className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors cursor-pointer"
                              title="Voir le détail des articles expédiés"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold font-mono text-sky-700">
                          {e.expedition_code}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-mono font-medium">{e.n_facture}</div>
                          <div className="text-[11px] text-slate-400">{formatDateDDMMYYYY(e.date_facture)}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-700">{e.n_bl_lta}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900 font-mono min-w-[150px] whitespace-nowrap">
                          {e.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                            {e.incoterm}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 truncate max-w-xs">{e.port_aeroport_destination}</td>
                        <td className="px-4 py-3.5 text-center">
                          {canEdit ? (
                            <select
                              value={e.status || 'In Transit'}
                              onChange={(evt) => handleStatusChange(e.id, evt.target.value)}
                              className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-2xs hover:border-sky-400 transition-colors"
                            >
                              <option value="In Transit">En Transit</option>
                              <option value="In Customs">En Douane</option>
                              <option value="Delivered">Livrée / Dédouanée</option>
                              <option value="Pending">En Attente</option>
                              <option value="Cancelled">Annulée</option>
                            </select>
                          ) : (
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              e.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              e.status === 'In Customs' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                              e.status === 'Cancelled' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                              'bg-sky-100 text-sky-800 border-sky-200'
                            }`}>
                              {e.status === 'Delivered' ? 'Livrée' : e.status === 'In Customs' ? 'En Douane' : e.status === 'Cancelled' ? 'Annulée' : 'En Transit'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {canEdit && (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(e)}
                                className="p-1.5 text-slate-400 hover:text-sky-600 rounded cursor-pointer transition-colors"
                                title="Modifier l'Expédition"
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(e.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                                title="Supprimer l'Expédition"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Shipped Line Items */}
                      {isExpanded && hasLines && (
                        <tr className="bg-sky-50/50">
                          <td colSpan={9} className="px-6 py-3 border-t border-b border-sky-100">
                            <div className="space-y-1.5">
                              <div className="font-semibold text-sky-900 text-[11px] flex items-center gap-1.5">
                                <Package size={13} />
                                <span>Articles expédiés (Détail Quantités & Prix) :</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {e.shipped_lines!.map((line, idx) => {
                                  const orderCurrency = orders.find(o => Number(o.id) === Number(e.foreign_order_id))?.currency || 'EUR';
                                  return (
                                    <div key={idx} className="bg-white p-2 rounded-lg border border-sky-200 flex justify-between items-center text-[11px]">
                                      <div className="flex flex-col truncate pr-2">
                                        <span className="font-semibold text-slate-800 truncate">{line.designation || `Article #${line.foreign_line_id}`}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          Qté: {line.shipped_qty} {line.unite || 'piece'} {line.unit_price ? `× ${line.unit_price} ${orderCurrency}` : ''}
                                        </span>
                                      </div>
                                      <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 shrink-0">
                                        {line.unit_price ? (line.shipped_qty * line.unit_price).toFixed(2) : line.shipped_qty} {line.unit_price ? orderCurrency : ''}
                                      </span>
                                    </div>
                                  );
                                })}
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
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
            <div className="text-slate-500">
              Affichage <span className="font-semibold text-slate-700">{((currentPage - 1) * pageSize) + 1}</span> à <span className="font-semibold text-slate-700">{Math.min(currentPage * pageSize, filteredExpeditions.length)}</span> sur <span className="font-semibold text-slate-700">{filteredExpeditions.length}</span> expéditions
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

      {/* RECORD EXPEDITION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col overflow-hidden my-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Ship size={18} className="text-sky-400" />
                <span>{editingExpeditionId ? "Modifier l'Expédition Étrangère" : "Nouvelle Expédition Étrangère"}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
              {/* Order Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sélectionner la Commande Étrangère *</label>
                {editingExpeditionId ? (
                  <input
                    type="text"
                    disabled
                    value={selectedOrder ? `${selectedOrder.code} - ${selectedOrder.supplier_name || ''}` : ''}
                    className="w-full px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded border border-slate-300"
                  />
                ) : (
                  <SearchableSelect
                    options={orders.map((o) => ({
                      value: o.id,
                      label: `${o.code} - ${o.supplier_name || 'Fournisseur inconnu'}`,
                      subLabel: `Réf Proforma: ${o.proforma_ref} (${o.country})`,
                      badge: `${o.amount} ${o.currency}`,
                    }))}
                    value={selectedOrderId}
                    onChange={(val) => setSelectedOrderId(Number(val))}
                    placeholder="Sélectionner une commande..."
                    searchPlaceholder="Rechercher code, proforma, fournisseur..."
                  />
                )}
              </div>

              {/* Itemized Quantities & Prices & Remaining Balance Table */}
              {selectedOrder && selectedOrder.lines && selectedOrder.lines.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <Layers size={14} className="text-sky-600" />
                      <span>Suivi du Solde & Quantités à Expédier</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Scale size={12} className="text-sky-600" />
                      Le solde disponible est calculé à partir de la commande principale
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">#</th>
                          <th className="px-3 py-2">Désignation</th>
                          <th className="px-3 py-2 text-right">Qté Commandée</th>
                          <th className="px-3 py-2 text-right">Déjà Expédiée</th>
                          <th className="px-3 py-2 text-center">Solde Disponible</th>
                          <th className="px-3 py-2 text-center w-28">Prix Unitaire</th>
                          <th className="px-3 py-2 text-center w-36">Qté Pour Cette Expédition</th>
                          <th className="px-3 py-2 text-right">Sous-total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOrder.lines.map((line, idx) => {
                          const lineKey = line.id || line.position || (idx + 1);
                          const alreadyShippedOther = getAlreadyShippedForLineExcludingExpedition(selectedOrder.id, line, idx, editingExpeditionId);
                          const maxAllowedQty = Math.max(0, line.qty - alreadyShippedOther);

                          const currentQty = shippedQtyMap[lineKey] !== undefined ? shippedQtyMap[lineKey] : maxAllowedQty;
                          const currentPrice = shippedPriceMap[lineKey] !== undefined ? shippedPriceMap[lineKey] : line.unit_price;
                          const lineTotal = currentQty * currentPrice;
                          const isExceeded = currentQty > maxAllowedQty;

                          return (
                            <tr key={idx} className={`hover:bg-slate-50 ${isExceeded ? 'bg-rose-50/50' : ''}`}>
                              <td className="px-3 py-2 text-center font-mono text-slate-400">{line.position}</td>
                              <td className="px-3 py-2 font-medium text-slate-800">{line.designation}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {line.qty} {line.unite}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-500">
                                {alreadyShippedOther} {line.unite}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                  maxAllowedQty === 0 
                                    ? 'bg-slate-100 text-slate-500' 
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {maxAllowedQty} {line.unite}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={currentPrice}
                                  onChange={(e) => handleItemChange(lineKey, 'unit_price', Number(e.target.value))}
                                  className="w-24 px-2 py-1 text-right font-mono rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex flex-col items-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={maxAllowedQty}
                                    step="any"
                                    value={currentQty}
                                    onChange={(e) => handleItemChange(lineKey, 'qty', Number(e.target.value))}
                                    className={`w-24 px-2 py-1 text-center font-mono font-bold rounded border focus:outline-none focus:ring-2 ${
                                      isExceeded
                                        ? 'border-rose-500 bg-rose-100 text-rose-900 focus:ring-rose-500 animate-pulse'
                                        : 'border-sky-300 bg-sky-50/50 focus:ring-sky-500'
                                    }`}
                                  />
                                  {isExceeded && (
                                    <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5 mt-0.5">
                                      <AlertTriangle size={10} /> Max: {maxAllowedQty}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                                {lineTotal.toFixed(2)} {selectedOrder.currency}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Shipping & Document Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">N° Facture (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: FAC-2026-001"
                    value={nFacture}
                    onChange={(e) => setNFacture(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Facture (JJ/MM/AAAA)</label>
                  <DateInputDDMMYYYY
                    value={dateFacture}
                    onChange={(val) => setDateFacture(val)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">N° BL / LTA (Air Waybill) (Optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: BL-AIR-12345"
                    value={nBlLta}
                    onChange={(e) => setNBlLta(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant Total Expédié (Calculé)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={montant || ''}
                    onChange={(e) => setMontant(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 font-mono font-bold bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Incoterm *</label>
                  <select
                    value={incoterm}
                    onChange={(e) => setIncoterm(e.target.value as IncotermType)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white font-bold text-slate-900"
                  >
                    {ALL_INCOTERMS.map((inc) => (
                      <option key={inc.code} value={inc.code}>
                        {inc.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Statut de l'Expédition</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ExpeditionStatus)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white font-semibold"
                  >
                    <option value="In Transit">En Transit</option>
                    <option value="In Customs">En Douane</option>
                    <option value="Delivered">Livrée / Dédouanée</option>
                    <option value="Pending">En Attente</option>
                    <option value="Cancelled">Annulée</option>
                  </select>
                </div>
              </div>

              {/* Port / Aéroport Destination Selection */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs">
                    Port / Aéroport de Destination (Algérie)
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDestinationType('Port');
                        if (!isCustomDestination) setPortDestination(ALGERIAN_PORTS[0]);
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md border transition-all ${
                        destinationType === 'Port'
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      ⚓ Ports Maritime
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDestinationType('Aéroport');
                        if (!isCustomDestination) setPortDestination(ALGERIAN_AIRPORTS[0]);
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md border transition-all ${
                        destinationType === 'Aéroport'
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      ✈️ Aéroports Aériens
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    {!isCustomDestination ? (
                      <select
                        value={portDestination}
                        onChange={(e) => {
                          if (e.target.value === '__CUSTOM__') {
                            setIsCustomDestination(true);
                            setPortDestination('');
                          } else {
                            setPortDestination(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white font-medium text-slate-900"
                      >
                        <optgroup label={destinationType === 'Port' ? 'Ports Algériens' : 'Aéroports Algériens'}>
                          {(destinationType === 'Port' ? ALGERIAN_PORTS : ALGERIAN_AIRPORTS).map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </optgroup>
                        <option value="__CUSTOM__">✍️ Saisir un autre port/aéroport personnalisé...</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Saisissez le nom du port ou aéroport..."
                        value={portDestination}
                        onChange={(e) => setPortDestination(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded border border-sky-400 bg-white font-medium"
                      />
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setIsCustomDestination(!isCustomDestination)}
                      className="w-full py-2 px-3 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                    >
                      {isCustomDestination ? '📋 Choisir dans la liste' : '✍️ Saisie Libre'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500 rounded-lg shadow-xs cursor-pointer"
                >
                  Enregistrer l'Expédition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
