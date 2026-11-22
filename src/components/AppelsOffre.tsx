import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Trash2, 
  Edit3, 
  Gavel, 
  Building2, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck,
  Award,
  SlidersHorizontal,
  Calendar
} from 'lucide-react';
import { 
  AppelOffreItem, 
  AppelOffreType, 
  Supplier, 
  User 
} from '../types';
import { AppelOffreModal } from './AppelOffreModal';
import { ProcurementThresholdModal } from './ProcurementThresholdModal';
import { 
  getAppelOffreStatusMeta, 
  calculateDeadlineInfo,
  APPEL_OFFRE_STATUS_LIST 
} from '../utils/procurementStatusWorkflow';

interface AppelsOffreProps {
  currentUser: User;
  suppliers: Supplier[];
}

export const AppelsOffre: React.FC<AppelsOffreProps> = ({
  currentUser,
  suppliers,
}) => {
  const [items, setItems] = useState<AppelOffreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AppelOffreItem | null>(null);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);

  const canEdit = currentUser.role === 'Admin' || currentUser.role === 'Appro' || currentUser.role === 'Chef Service';

  const loadAppelsOffre = () => {
    setLoading(true);
    fetch('/api/appels-offres')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          setItems([]);
        }
      })
      .catch((err) => {
        console.warn('Failed to load AO from API:', err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAppelsOffre();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce dossier d'Appel d'Offres ?")) return;

    try {
      await fetch(`/api/appels-offres/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      console.error('Error deleting AO:', e);
      setItems((prev) => prev.filter((it) => it.id !== id));
    }
  };

  const handleModalSuccess = (savedItem: AppelOffreItem) => {
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
      if (statusFilter !== 'ALL') {
        const meta = getAppelOffreStatusMeta(item.statut);
        if (meta.key !== statusFilter && item.statut !== statusFilter) return false;
      }
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNAo = item.n_ao?.toLowerCase().includes(query);
        const matchObjet = item.objet?.toLowerCase().includes(query);
        const matchDir = item.direction_emettrice?.toLowerCase().includes(query);
        const matchGagnant = (item.fournisseur_gagnant || item.attribution?.fournisseur_gagnant || '')
          .toLowerCase()
          .includes(query);
        const matchMarche = (item.n_marche_contrat || item.attribution?.n_marche_contrat || '')
          .toLowerCase()
          .includes(query);
        return matchNAo || matchObjet || matchDir || matchGagnant || matchMarche;
      }
      return true;
    });
  }, [items, statusFilter, typeFilter, searchTerm]);

  // KPIs
  const totalAo = items.length;
  const enCoursAo = items.filter((i) => {
    const meta = getAppelOffreStatusMeta(i.statut);
    return !meta.isClosed;
  }).length;
  const attribuesAo = items.filter((i) => {
    const meta = getAppelOffreStatusMeta(i.statut);
    return meta.key === 'Attribué' || meta.key === 'Contrat Signé';
  }).length;
  const totalMontantAttribue = items.reduce((acc, it) => {
    const amt = it.montant_attribue || it.attribution?.montant_attribue || 0;
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
      alert("Aucun appel d'offres à exporter.");
      return;
    }

    const headers = [
      'N° Appel Offres',
      'Type Procedure',
      'Date Publication',
      'Date Limite Depot',
      'Direction Emettrice',
      'Objet Marche',
      'Budget Previsionnel (DZD)',
      'Caution (DZD)',
      'Attributaire Retenu',
      'Montant Attribue (DZD)',
      'N° Marche / Contrat',
      'Statut',
      'Observations'
    ];

    const rows = filteredItems.map((item) => [
      item.n_ao,
      item.type,
      item.date_publication,
      item.date_depot_plis,
      item.direction_emettrice,
      `"${(item.objet || '').replace(/"/g, '""')}"`,
      item.budget_previsionnel || 0,
      item.caution_soumission || 0,
      item.fournisseur_gagnant || item.attribution?.fournisseur_gagnant || '',
      item.montant_attribue || item.attribution?.montant_attribue || 0,
      item.n_marche_contrat || item.attribution?.n_marche_contrat || '',
      item.statut,
      `"${(item.observation || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Appels_Offres_SENSUS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    const meta = getAppelOffreStatusMeta(status);
    return (
      <span 
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
        title={meta.description}
      >
        <ShieldCheck size={12} className="shrink-0" />
        <span className="truncate max-w-[170px]">{meta.shortLabel}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full mx-auto">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-700 rounded-xl border border-purple-500/20">
            <Gavel size={22} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Appels d'Offres & Marchés (≥ 12 MDZD)</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-200">
                {items.length} Marchés
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Pilotage direct des avis de marché, délais de dépôt des plis et attributions
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

          {/* New AO */}
          {canEdit && (
            <button
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-700 text-white hover:bg-purple-800 shadow-xs transition-colors shrink-0"
            >
              <Plus size={15} />
              <span>Nouveau Marché / AO</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Dossiers AO</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{totalAo}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Exercice en cours</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-purple-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-purple-800 uppercase tracking-wide">En cours / Évaluation</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-purple-950 font-mono">{enCoursAo}</span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">Phase active</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Dépôt ou analyse des plis</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Marchés Attribués</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">{attribuesAo}</span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
              {totalAo > 0 ? Math.round((attribuesAo / totalAo) * 100) : 0}% Adjugés
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Contrats finalisés</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-indigo-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-indigo-800 uppercase tracking-wide">Total Montant Attribué</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg xl:text-xl font-black text-indigo-950 font-mono">{formatMoney(totalMontantAttribue)}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Volume global des contrats</p>
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
            {APPEL_OFFRE_STATUS_LIST.map((s) => {
              const count = items.filter((it) => getAppelOffreStatusMeta(it.statut).key === s.key).length;
              if (count === 0 && s.key !== 'En cours' && s.key !== 'Attribué') return null;
              return (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                    statusFilter === s.key
                      ? 'bg-purple-800 text-white border-purple-800 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50/50'
                  }`}
                >
                  <span>{s.shortLabel}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    statusFilter === s.key ? 'bg-purple-700 text-purple-100' : 'bg-slate-100 text-slate-600'
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
              placeholder="Rechercher par N° AO, objet, attributaire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Type Filter row */}
        <div className="flex flex-wrap items-center gap-1 text-xs pt-1 border-t border-slate-100">
          <span className="text-slate-400 text-[10px] font-bold mr-1">Type :</span>
          {['ALL', 'National Ouvert', 'National Restreint', 'International Ouvert', 'Gré à Gré Après Consultation'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all ${
                typeFilter === t
                  ? 'bg-purple-700 text-white border-purple-700'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t === 'ALL' ? 'Tous Types' : t}
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
                <th className="py-3 px-4">N° AO & Type</th>
                <th className="py-3 px-4">Dates & Suivi Délais</th>
                <th className="py-3 px-4">Objet du Marché</th>
                <th className="py-3 px-4">Direction Émettrice</th>
                <th className="py-3 px-4">Budget Prévisionnel</th>
                <th className="py-3 px-4">Attributaire & Montant</th>
                <th className="py-3 px-4">Statut (Workflow BAOSEM)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Chargement des Appels d'Offres...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Aucun Appel d'Offres trouvé.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const winnerName = item.fournisseur_gagnant || item.attribution?.fournisseur_gagnant;
                  const winnerAmt = item.montant_attribue !== undefined ? item.montant_attribue : item.attribution?.montant_attribue;
                  const contractRef = item.n_marche_contrat || item.attribution?.n_marche_contrat;
                  const dl = calculateDeadlineInfo(item.date_publication, item.delai_jours, item.date_depot_plis);
                  const statusMeta = getAppelOffreStatusMeta(item.statut);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-extrabold font-mono text-purple-950 text-xs">{item.n_ao}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">{item.type}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium font-mono text-xs">
                          <span className="text-slate-400">Publié:</span> {formatDate(item.date_publication)}
                        </div>
                        <div className="text-rose-700 font-bold font-mono text-[10px]">
                          <span className="text-slate-400">Dépôt:</span> {formatDate(item.date_depot_plis)}
                        </div>
                        <div className="mt-1">
                          {statusMeta.isClosed ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              <CheckCircle2 size={10} /> Clôturé
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
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                              <FileText size={10} className="text-purple-600" />
                              <span>{item.articles.length} article{item.articles.length > 1 ? 's' : ''} / lot{item.articles.length > 1 ? 's' : ''}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[170px]" title={item.articles.map(a => `${a.qty} ${a.unite || 'u'} x ${a.designation}`).join(', ')}>
                              {item.articles.map(a => `${a.qty} ${a.designation}`).join(', ')}
                            </span>
                          </div>
                        )}
                        {contractRef && (
                          <div className="text-[10px] text-purple-700 font-mono font-bold truncate max-w-xs">
                            N° Contrat : {contractRef}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-700">{item.direction_emettrice || 'Direction Générale'}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                        {formatMoney(item.budget_previsionnel)}
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
                          <span className="text-slate-400 italic">En procédure</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(item.statut)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {canEdit && (
                            <button
                              onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                              title="Modifier le dossier"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Supprimer le dossier"
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
        <AppelOffreModal
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
