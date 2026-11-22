import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Trash2, 
  Edit3, 
  MessageSquareQuote, 
  Building2, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers,
  SlidersHorizontal,
  Receipt,
  Gavel,
  Eye
} from 'lucide-react';
import { 
  ConsultationItem, 
  Supplier, 
  User 
} from '../types';
import { 
  getProcurementThresholdByCategory, 
  getProcurementThreshold,
  ThresholdCategory,
  PROCUREMENT_THRESHOLDS,
  PROCUREMENT_THRESHOLD_LIST
} from '../utils/procurementThresholds';
import { ConsultationModal } from './ConsultationModal';
import { ProcurementThresholdModal } from './ProcurementThresholdModal';
import { 
  getConsultationStatusMeta, 
  calculateDeadlineInfo,
  CONSULTATION_STATUS_LIST 
} from '../utils/procurementStatusWorkflow';

interface ConsultationsProps {
  currentUser: User;
  suppliers: Supplier[];
}

export const Consultations: React.FC<ConsultationsProps> = ({
  currentUser,
  suppliers,
}) => {
  const [items, setItems] = useState<ConsultationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsultationItem | null>(null);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);

  const canEdit = currentUser.role === 'Admin' || currentUser.role === 'Appro' || currentUser.role === 'Chef Service';

  const loadConsultations = () => {
    setLoading(true);
    fetch('/api/consultations')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          setItems([]);
        }
      })
      .catch((err) => {
        console.warn('Failed to load consultations from API:', err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConsultations();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette consultation ?')) return;

    try {
      await fetch(`/api/consultations/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      console.error('Error deleting consultation:', e);
      setItems((prev) => prev.filter((it) => it.id !== id));
    }
  };

  const handleModalSuccess = (savedItem: ConsultationItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === savedItem.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedItem;
        return copy;
      }
      return [savedItem, ...prev];
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && item.category_seuil !== categoryFilter) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchRef = item.ref_consultation?.toLowerCase().includes(query);
        const matchObjet = item.objet?.toLowerCase().includes(query);
        const matchDem = item.demandeur?.toLowerCase().includes(query);
        const matchFourn = item.fournisseurs_consultes?.toLowerCase().includes(query);
        const matchRetenu = item.fournisseur_retenu?.toLowerCase().includes(query);
        return matchRef || matchObjet || matchDem || matchFourn || matchRetenu;
      }
      return true;
    });
  }, [items, statusFilter, categoryFilter, searchTerm]);

  // KPIs
  const totalConsultations = items.length;
  const enCoursConsultations = items.filter((i) => {
    const meta = getConsultationStatusMeta(i.status);
    return !meta.isClosed;
  }).length;
  const attribueesConsultations = items.filter((i) => i.status === 'Attribué' || i.fournisseur_retenu).length;
  const totalMontantRetenu = items.reduce((acc, it) => {
    const amt = it.montant_retenu || it.decision_attribution?.montant_retenu_ht || 0;
    return acc + amt;
  }, 0);

  const formatMoney = (amount?: number) => {
    if (!amount) return '0 DZD';
    return new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 0 }).format(amount) + ' DZD';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  };

  const handleExportCsv = () => {
    if (filteredItems.length === 0) {
      alert('Aucune consultation à exporter.');
      return;
    }

    const headers = [
      'Ref Consultation',
      'Date Emission',
      'Demandeur',
      'Objet',
      'Procedure / Seuil',
      'Estimation (DZD)',
      'Fournisseurs Consultes',
      'Fournisseur Retenu',
      'Montant Retenu (DZD)',
      'Statut',
      'Observations'
    ];

    const rows = filteredItems.map((item) => [
      item.ref_consultation,
      item.date_emission,
      item.demandeur,
      `"${(item.objet || '').replace(/"/g, '""')}"`,
      item.category_seuil || '',
      item.estimation_budget || 0,
      `"${(item.fournisseurs_consultes || '').replace(/"/g, '""')}"`,
      item.fournisseur_retenu || item.decision_attribution?.fournisseur_retenu || '',
      item.montant_retenu || item.decision_attribution?.montant_retenu_ht || 0,
      item.status,
      `"${(item.observation || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Consultations_SENSUS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'En cours':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-100 text-sky-800 border border-sky-200">
            <Clock size={11} /> En cours
          </span>
        );
      case 'Attribué':
      case 'Offre Retenue':
      case 'Clôturée':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={11} /> Attribué
          </span>
        );
      case 'Annulé':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle size={11} /> Annulé
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full mx-auto">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 text-sky-600 rounded-xl border border-sky-500/20">
            <MessageSquareQuote size={22} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Consultations Fournisseurs (RFQ)</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-200">
                {items.length} Dossiers
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Gestion et suivi direct des cotations selon les seuils : Achat, Lettre de Commande, Commande, Marché
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Guide des seuils */}
          <button
            onClick={() => setIsThresholdModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
          >
            <SlidersHorizontal size={14} />
            <span>Guide des 4 Seuils</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors shadow-2xs"
          >
            <FileSpreadsheet size={14} className="text-emerald-700" />
            <span>Excel</span>
          </button>

          {/* New Consultation */}
          {canEdit && (
            <button
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 shadow-xs transition-colors shrink-0"
            >
              <Plus size={15} />
              <span>Nouvelle Consultation</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Consultations</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{totalConsultations}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Enregistrées sur l'exercice</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-sky-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-sky-800 uppercase tracking-wide">En cours</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-sky-950 font-mono">{enCoursConsultations}</span>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded">En attente</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Dossiers ouverts aux offres</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Attribuées</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">{attribueesConsultations}</span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
              {totalConsultations > 0 ? Math.round((attribueesConsultations / totalConsultations) * 100) : 0}% Traités
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Offres gagnantes retenues</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-indigo-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-indigo-800 uppercase tracking-wide">Montant Total Retenu</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg xl:text-xl font-black text-indigo-950 font-mono">{formatMoney(totalMontantRetenu)}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Engagements budgétaires réalisés</p>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="space-y-2.5 bg-white p-3 sm:p-4 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase mr-1">Statut :</span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Tous ({items.length})
            </button>
            {CONSULTATION_STATUS_LIST.map((s) => {
              const count = items.filter((it) => getConsultationStatusMeta(it.status).key === s.key).length;
              if (count === 0 && s.key !== 'En cours' && s.key !== 'Attribué') return null;
              return (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                    statusFilter === s.key
                      ? 'bg-sky-700 text-white border-sky-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50/50'
                  }`}
                >
                  <span>{s.shortLabel}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    statusFilter === s.key ? 'bg-sky-800 text-sky-100' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px] sm:w-64 lg:w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par réf, objet, fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Category Threshold Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase mr-1">Catégorie :</span>
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
              categoryFilter === 'ALL'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Toutes
          </button>
          {PROCUREMENT_THRESHOLD_LIST.map((th) => (
            <button
              key={th.category}
              onClick={() => setCategoryFilter(th.category)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                categoryFilter === th.category
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {th.shortTitle}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Réf & Suivi Délais</th>
                <th className="py-3 px-4">Objet & Articles Demandés</th>
                <th className="py-3 px-4">Service Demandeur</th>
                <th className="py-3 px-4">Procédure & Seuil</th>
                <th className="py-3 px-4">Fournisseur Retenu & Montant</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Chargement des consultations...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Aucune consultation trouvée.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const thMeta = item.category_seuil ? getProcurementThresholdByCategory(item.category_seuil) : getProcurementThreshold(item.estimation_budget || 0);
                  const winnerName = item.fournisseur_retenu || item.decision_attribution?.fournisseur_retenu;
                  const winnerAmt = item.montant_retenu !== undefined ? item.montant_retenu : item.decision_attribution?.montant_retenu_ht;
                  const dl = calculateDeadlineInfo(item.date_emission, item.delai_jours, item.date_cloture);
                  const statusMeta = getConsultationStatusMeta(item.status);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-extrabold font-mono text-slate-900 text-xs">{item.ref_consultation}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          <span className="text-slate-400">Émis:</span> {formatDate(item.date_emission)}
                        </div>
                        <div className="text-rose-700 font-bold font-mono text-[10px]">
                          <span className="text-slate-400">Clôture:</span> {formatDate(dl.deadlineDate)}
                        </div>
                        <div className="mt-1">
                          {statusMeta.isClosed ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              <CheckCircle2 size={10} /> Traité
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${dl.badgeColorClass}`}>
                              <Clock size={10} />
                              <span>{dl.statusText}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 max-w-xs truncate" title={item.objet}>
                          {item.objet}
                        </div>
                        {item.articles && item.articles.length > 0 && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                              <Layers size={10} className="text-sky-600" />
                              <span>{item.articles.length} article{item.articles.length > 1 ? 's' : ''}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[170px]" title={item.articles.map(a => `${a.qty} ${a.unite || 'u'} x ${a.designation}`).join(', ')}>
                              {item.articles.map(a => `${a.qty} ${a.designation}`).join(', ')}
                            </span>
                          </div>
                        )}
                        {item.observation && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.observation}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-700">{item.demandeur || 'Approvisionnements'}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold border ${thMeta.badgeBg} ${thMeta.badgeText} ${thMeta.badgeBorder}`}>
                          {thMeta.shortTitle}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {winnerName ? (
                          <div>
                            <span className="font-extrabold text-emerald-950 block">{winnerName}</span>
                            <span className="font-mono font-bold text-[11px] text-emerald-800">
                              {winnerAmt ? formatMoney(winnerAmt) : '-'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Non attribué</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {canEdit && (
                            <button
                              onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                              title="Modifier la consultation"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Supprimer la consultation"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {isModalOpen && (
        <ConsultationModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
          onSuccess={handleModalSuccess}
          editingItem={editingItem}
          suppliers={suppliers}
        />
      )}

      {isThresholdModalOpen && (
        <ProcurementThresholdModal
          isOpen={isThresholdModalOpen}
          onClose={() => setIsThresholdModalOpen(false)}
        />
      )}
    </div>
  );
};
