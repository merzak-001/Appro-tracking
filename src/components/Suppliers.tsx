import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Award,
  FileSpreadsheet,
  BarChart2,
  X,
  CheckCircle,
  Clock,
  Package,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Supplier, User, LocalOrder } from '../types';
import { SupplierModal } from './SupplierModal';
import { SupplierProfileEvaluationsModal } from './SupplierProfileEvaluationsModal';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

interface SuppliersProps {
  currentUser: User;
  suppliers: Supplier[];
  localOrders?: LocalOrder[];
  loading: boolean;
  onRefresh: () => void;
}

export const Suppliers: React.FC<SuppliersProps> = ({
  currentUser,
  suppliers,
  localOrders = [],
  loading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Supplier Stats Modal State
  const [isStatModalOpen, setIsStatModalOpen] = useState(false);
  const [selectedStatSupplier, setSelectedStatSupplier] = useState<Supplier | null>(null);

  // Supplier Evaluations Profile Modal
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedEvalSupplier, setSelectedEvalSupplier] = useState<Supplier | null>(null);

  const handleOpenEvaluationsModal = (supplier: Supplier) => {
    setSelectedEvalSupplier(supplier);
    setIsEvalModalOpen(true);
  };

  const handleOpenStatModal = (supplier: Supplier) => {
    setSelectedStatSupplier(supplier);
    setIsStatModalOpen(true);
  };

  const handleExportExcel = () => {
    const dataToExport = filteredSuppliers.map((s) => {
      const isLocal = isAlgerian(s.country);
      const supOrders = (localOrders || []).filter((o) => o.fournisseur_id === s.id);
      const totalSpend = supOrders.reduce((sum, o) => sum + (Number(o.total_ttc) || 0), 0);

      return {
        'Type': isLocal ? 'Local (Algérie)' : 'Étranger (International)',
        'Nom du Fournisseur': s.name,
        'RC (Registre Commerce)': isLocal ? (s.rc || 'N/A') : 'N/A',
        'NIF (Identifiant Fiscal)': isLocal ? (s.nif || 'N/A') : 'N/A',
        'Pays': s.country || 'Algérie',
        'Adresse': s.address || 'Non renseignée',
        'Nombre de Commandes Locales': supOrders.length,
        'Montant Cumulé Achats (DA)': totalSpend,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fournisseurs');

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Repertoire_Fournisseurs_${today}.xlsx`);
  };

  const canEdit = currentUser.role === 'Appro' || currentUser.role === 'Admin';

  const [typeFilter, setTypeFilter] = useState<'All' | 'Local' | 'Étranger'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const isAlgerian = (countryName?: string) => {
    if (!countryName) return true;
    const c = countryName.trim().toLowerCase();
    return c === 'algeria' || c === 'algérie' || c === 'algerie' || c === 'dz';
  };

  const handleOpenNewModal = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const isLocal = isAlgerian(s.country);
    if (typeFilter === 'Local' && !isLocal) return false;
    if (typeFilter === 'Étranger' && isLocal) return false;

    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.country.toLowerCase().includes(term) ||
      (s.rc && s.rc.toLowerCase().includes(term)) ||
      (s.nif && s.nif.toLowerCase().includes(term))
    );
  });

  const totalPages = Math.ceil(filteredSuppliers.length / pageSize) || 1;
  const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4 sm:space-y-6 w-full mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Répertoire des Fournisseurs (Suppliers Directory)</h2>
          <p className="text-xs text-slate-500">
            Fournisseurs Locaux (Algérie - avec RC & NIF) et Fournisseurs Étrangers (Internationaux)
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-xs transition-colors"
            title="Exporter la liste filtrée des fournisseurs en fichier Excel"
          >
            <FileSpreadsheet size={16} />
            <span>Exporter (Excel)</span>
          </button>

          {canEdit && (
            <button
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-xs transition-colors"
            >
              <Plus size={16} />
              <span>Ajouter Fournisseur</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Type Filter Buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => { setTypeFilter('All'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              typeFilter === 'All'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tous ({suppliers.length})
          </button>
          <button
            onClick={() => { setTypeFilter('Local'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              typeFilter === 'Local'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📍 Locaux (Algérie)
          </button>
          <button
            onClick={() => { setTypeFilter('Étranger'); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              typeFilter === 'Étranger'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌍 Étrangers (International)
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, pays, RC ou NIF..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          />
        </div>
      </div>

      {/* Horizontal Suppliers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Chargement des fournisseurs...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Building2 size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">Aucun fournisseur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Nom du Fournisseur</th>
                  <th className="px-4 py-3">RC (Registre de Commerce)</th>
                  <th className="px-4 py-3">NIF (Ident. Fiscale)</th>
                  <th className="px-4 py-3">Pays</th>
                  <th className="px-4 py-3">Adresse</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedSuppliers.map((s) => {
                  const local = isAlgerian(s.country);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        {local ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
                            📍 Local
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            🌍 Étranger
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{s.name}</td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-700">
                        {local ? (s.rc || 'Non renseigné') : <span className="text-slate-400 font-sans italic">N/A (Étranger)</span>}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-700">
                        {local ? (s.nif || 'Non renseigné') : <span className="text-slate-400 font-sans italic">N/A (Étranger)</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          local
                            ? 'bg-slate-100 text-slate-800 border-slate-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200 font-bold'
                        }`}>
                          {s.country || 'Algérie'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={s.address}>
                        {s.address || 'Non renseignée'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenStatModal(s)}
                            className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors"
                            title="Voir la Fiche Synthétique & Statistiques Achat"
                          >
                            <BarChart2 size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEvaluationsModal(s)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                            title="Voir l'Évaluation ISO 9001 du Fournisseur"
                          >
                            <Award size={16} />
                          </button>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(s)}
                                className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                                title="Edit Supplier"
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(s.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Delete Supplier"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
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
              Affichage <span className="font-semibold text-slate-700">{((currentPage - 1) * pageSize) + 1}</span> à <span className="font-semibold text-slate-700">{Math.min(currentPage * pageSize, filteredSuppliers.length)}</span> sur <span className="font-semibold text-slate-700">{filteredSuppliers.length}</span> fournisseurs
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

      {/* MODAL */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => onRefresh()}
        editingSupplier={editingSupplier}
        existingSuppliers={suppliers}
      />

      {/* SUPPLIER PROFILE EVALUATIONS MODAL */}
      <SupplierProfileEvaluationsModal
        isOpen={isEvalModalOpen}
        onClose={() => setIsEvalModalOpen(false)}
        supplier={selectedEvalSupplier}
      />

      {/* SUPPLIER STATS & FICHE SYNTHÉTIQUE MODAL */}
      {isStatModalOpen && selectedStatSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <BarChart2 className="text-sky-400" size={20} />
                <div>
                  <h3 className="font-bold text-base">{selectedStatSupplier.name}</h3>
                  <p className="text-xs text-slate-300">Fiche Synthétique & Statistiques Achat</p>
                </div>
              </div>
              <button onClick={() => setIsStatModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-5 text-xs overflow-y-auto flex-1">
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl">
                  <div className="text-slate-500 font-medium">Volume Total Engagé</div>
                  <div className="text-base font-black text-sky-900 font-mono mt-1">
                    {((localOrders || [])
                      .filter((o) => o.fournisseur_id === selectedStatSupplier.id)
                      .reduce((sum, o) => sum + (Number(o.total_ttc) || 0), 0))
                      .toLocaleString()}{' '}
                    DA
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div className="text-slate-500 font-medium">Commandes Totales</div>
                  <div className="text-base font-black text-slate-800 font-mono mt-1">
                    {(localOrders || []).filter((o) => o.fournisseur_id === selectedStatSupplier.id).length} commande(s)
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <div className="text-slate-500 font-medium">Type & Origine</div>
                  <div className="text-xs font-bold text-emerald-800 mt-1">
                    {isAlgerian(selectedStatSupplier.country) ? '📍 Fournisseur Local (Algérie)' : '🌍 Fournisseur Étranger'}
                  </div>
                </div>
              </div>

              {/* Fiscal Identification Details */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Identifiants Juridiques & Fiscaux</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-500">Registre de Commerce (RC) :</span> <span className="font-mono font-bold text-slate-800">{selectedStatSupplier.rc || 'N/A'}</span></div>
                  <div><span className="text-slate-500">NIF :</span> <span className="font-mono font-bold text-slate-800">{selectedStatSupplier.nif || 'N/A'}</span></div>
                  <div className="col-span-2"><span className="text-slate-500">Adresse :</span> <span className="font-semibold text-slate-800">{selectedStatSupplier.address || 'Non renseignée'}</span></div>
                </div>
              </div>

              {/* Recent Orders History Table */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Historique des Commandes Passées</h4>
                {(localOrders || []).filter((o) => o.fournisseur_id === selectedStatSupplier.id).length === 0 ? (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-lg">Aucune commande enregistrée pour ce fournisseur.</div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-semibold">
                        <tr>
                          <th className="p-2">Code N°</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Objet</th>
                          <th className="p-2 text-right">Montant TTC</th>
                          <th className="p-2 text-center">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(localOrders || [])
                          .filter((o) => o.fournisseur_id === selectedStatSupplier.id)
                          .map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50">
                              <td className="p-2 font-bold font-mono text-sky-700">{o.n_order}</td>
                              <td className="p-2 text-slate-600">{formatDateDDMMYYYY(o.date)}</td>
                              <td className="p-2 text-slate-700 max-w-xs truncate">{o.objet_de_commande}</td>
                              <td className="p-2 text-right font-mono font-bold">{o.total_ttc?.toLocaleString()} DA</td>
                              <td className="p-2 text-center font-semibold text-slate-700">{o.status}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
