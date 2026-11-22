import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  Search, 
  MessageSquareQuote, 
  Gavel, 
  X, 
  Check, 
  ChevronDown, 
  Building2, 
  Calendar,
  AlertCircle,
  FileText,
  Unlink
} from 'lucide-react';
import { ConsultationItem, AppelOffreItem } from '../types';

export interface SelectedProcurementSource {
  sourceType: 'consultation' | 'appel_offre' | 'none';
  id?: number;
  ref?: string;
  objet?: string;
  supplier_name?: string;
  amount?: number;
  articles?: { designation: string; qty: number; unite: string }[];
}

interface ProcurementSourceSelectorProps {
  selectedType?: 'consultation' | 'appel_offre' | 'none';
  selectedId?: number;
  selectedRef?: string;
  onSelect: (source: SelectedProcurementSource) => void;
  className?: string;
}

export const ProcurementSourceSelector: React.FC<ProcurementSourceSelectorProps> = ({
  selectedType = 'none',
  selectedId,
  selectedRef,
  onSelect,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CONSULTATION' | 'APPEL_OFFRE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
  const [appelsOffres, setAppelsOffres] = useState<AppelOffreItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load consultations and AO
    setLoading(true);
    Promise.all([
      fetch('/api/consultations').then((res) => res.ok ? res.json() : []).catch(() => []),
      fetch('/api/appels-offres').then((res) => res.ok ? res.json() : []).catch(() => []),
    ]).then(([consData, aoData]) => {
      if (Array.isArray(consData)) setConsultations(consData);
      if (Array.isArray(aoData)) setAppelsOffres(aoData);
      setLoading(false);
    });
  }, []);

  const handleClearSelection = () => {
    onSelect({
      sourceType: 'none',
      id: undefined,
      ref: undefined,
    });
    setIsOpen(false);
  };

  const handleSelectConsultation = (item: ConsultationItem) => {
    const winnerName = item.fournisseur_retenu || item.decision_attribution?.fournisseur_retenu;
    const winnerAmt = item.montant_retenu !== undefined ? item.montant_retenu : item.decision_attribution?.montant_retenu_ht;

    onSelect({
      sourceType: 'consultation',
      id: item.id,
      ref: item.ref_consultation,
      objet: item.objet,
      supplier_name: winnerName,
      amount: winnerAmt,
      articles: item.articles?.map((a) => ({ designation: a.designation, qty: a.qty, unite: a.unite })),
    });
    setIsOpen(false);
  };

  const handleSelectAppelOffre = (item: AppelOffreItem) => {
    const winnerName = item.fournisseur_gagnant || item.attribution?.fournisseur_gagnant;
    const winnerAmt = item.montant_attribue !== undefined ? item.montant_attribue : item.attribution?.montant_attribue;

    onSelect({
      sourceType: 'appel_offre',
      id: item.id,
      ref: item.n_ao,
      objet: item.objet,
      supplier_name: winnerName,
      amount: winnerAmt,
      articles: item.articles?.map((a) => ({ designation: a.designation, qty: a.qty, unite: a.unite })),
    });
    setIsOpen(false);
  };

  // Find currently selected item details
  const linkedConsultation = selectedType === 'consultation'
    ? consultations.find((c) => (selectedId && c.id === selectedId) || (selectedRef && c.ref_consultation === selectedRef))
    : null;

  const linkedAppelOffre = selectedType === 'appel_offre'
    ? appelsOffres.find((a) => (selectedId && a.id === selectedId) || (selectedRef && a.n_ao === selectedRef))
    : null;

  const isLinked = (selectedType === 'consultation' || selectedType === 'appel_offre') && !!selectedRef;

  // Filtered lists
  const filteredConsultations = consultations.filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      c.ref_consultation.toLowerCase().includes(q) ||
      c.objet.toLowerCase().includes(q) ||
      (c.fournisseur_retenu && c.fournisseur_retenu.toLowerCase().includes(q)) ||
      (c.demandeur && c.demandeur.toLowerCase().includes(q))
    );
  });

  const filteredAppelsOffres = appelsOffres.filter((a) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      a.n_ao.toLowerCase().includes(q) ||
      a.objet.toLowerCase().includes(q) ||
      (a.fournisseur_gagnant && a.fournisseur_gagnant.toLowerCase().includes(q)) ||
      (a.direction_emettrice && a.direction_emettrice.toLowerCase().includes(q))
    );
  });

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Link2 size={14} className={isLinked ? 'text-sky-600' : 'text-slate-400'} />
          <span>Lien Consultation / Appel d'Offres</span>
          <span className="text-[10px] text-slate-400 font-normal">(Optionnel)</span>
        </label>
        {isLinked && (
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline"
          >
            <Unlink size={12} />
            <span>Dissocier le lien</span>
          </button>
        )}
      </div>

      {/* Linked State View Card */}
      {isLinked ? (
        <div className="p-3 rounded-xl border bg-sky-50/70 border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${selectedType === 'consultation' ? 'bg-sky-600 text-white' : 'bg-purple-600 text-white'}`}>
              {selectedType === 'consultation' ? <MessageSquareQuote size={15} /> : <Gavel size={15} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs font-mono text-slate-900">
                  {selectedRef}
                </span>
                <span className={`px-2 py-0.2 rounded text-[10px] font-black uppercase tracking-wider ${
                  selectedType === 'consultation'
                    ? 'bg-sky-200/80 text-sky-900'
                    : 'bg-purple-200/80 text-purple-900'
                }`}>
                  {selectedType === 'consultation' ? 'Consultation (RFQ)' : "Appel d'Offres (Marché)"}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium line-clamp-1 mt-0.5">
                {linkedConsultation?.objet || linkedAppelOffre?.objet || 'Dossier lié'}
              </p>
              {(linkedConsultation?.fournisseur_retenu || linkedAppelOffre?.fournisseur_gagnant) && (
                <div className="text-[10px] text-emerald-800 font-bold flex items-center gap-1 mt-0.5">
                  <Building2 size={11} />
                  <span>Attribué à : {linkedConsultation?.fournisseur_retenu || linkedAppelOffre?.fournisseur_gagnant}</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-white border border-sky-300 hover:bg-sky-50 rounded-lg shrink-0 transition-colors shadow-2xs flex items-center justify-center gap-1"
          >
            <span>Modifier le lien</span>
            <ChevronDown size={13} />
          </button>
        </div>
      ) : (
        /* Not Linked Trigger */
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-dashed border-slate-300 hover:border-sky-400 bg-slate-50/60 hover:bg-sky-50/50 text-slate-600 hover:text-sky-800 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <Link2 size={14} className="text-slate-400 group-hover:text-sky-600 transition-colors" />
            <span className="font-semibold">Lier cette commande à une Consultation ou Appel d'Offres...</span>
          </div>
          <ChevronDown size={14} className={`text-slate-400 group-hover:text-sky-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Searchable Dropdown Modal/Popout */}
      {isOpen && (
        <div className="p-3 bg-white rounded-2xl border border-slate-300 shadow-xl space-y-2.5 animate-in fade-in zoom-in-95 duration-100 z-20">
          {/* Header Search & Filter Tabs */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par référence, objet ou fournisseur gagnant..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                  activeTab === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CONSULTATION')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                  activeTab === 'CONSULTATION'
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <MessageSquareQuote size={12} />
                <span>Consultations</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('APPEL_OFFRE')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                  activeTab === 'APPEL_OFFRE'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Gavel size={12} />
                <span>Appels d'Offres</span>
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400">Chargement des dossiers...</div>
            ) : (
              <>
                {/* Consultations Section */}
                {(activeTab === 'ALL' || activeTab === 'CONSULTATION') && (
                  <div>
                    <div className="px-3 py-1.5 bg-sky-50/60 text-[10px] font-extrabold uppercase tracking-wider text-sky-900 flex items-center gap-1">
                      <MessageSquareQuote size={12} />
                      <span>Consultations Fournisseurs (RFQ)</span>
                    </div>
                    {filteredConsultations.length === 0 ? (
                      <div className="p-2.5 text-center text-[11px] text-slate-400 italic">
                        Aucune consultation trouvée.
                      </div>
                    ) : (
                      filteredConsultations.map((c) => {
                        const isSelected = selectedType === 'consultation' && selectedRef === c.ref_consultation;
                        const winner = c.fournisseur_retenu || c.decision_attribution?.fournisseur_retenu;
                        return (
                          <button
                            key={`cons-${c.id}`}
                            type="button"
                            onClick={() => handleSelectConsultation(c)}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-sky-50/80 transition-colors ${
                              isSelected ? 'bg-sky-50 font-bold border-l-4 border-sky-600' : ''
                            }`}
                          >
                            <div className="space-y-0.5 max-w-lg">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-xs text-slate-900">{c.ref_consultation}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">{c.category_seuil || 'CONSULTATION'}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{c.date_emission}</span>
                              </div>
                              <p className="text-[11px] text-slate-700 line-clamp-1 font-medium">{c.objet}</p>
                              {winner && (
                                <p className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                                  <span>Attribué à : {winner}</span>
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {isSelected ? (
                                <span className="p-1 rounded-full bg-sky-600 text-white">
                                  <Check size={12} />
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-sky-600 hover:underline">
                                  Sélectionner
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Appels d'Offres Section */}
                {(activeTab === 'ALL' || activeTab === 'APPEL_OFFRE') && (
                  <div>
                    <div className="px-3 py-1.5 bg-purple-50/60 text-[10px] font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                      <Gavel size={12} />
                      <span>Appels d'Offres & Marchés</span>
                    </div>
                    {filteredAppelsOffres.length === 0 ? (
                      <div className="p-2.5 text-center text-[11px] text-slate-400 italic">
                        Aucun appel d'offres trouvé.
                      </div>
                    ) : (
                      filteredAppelsOffres.map((a) => {
                        const isSelected = selectedType === 'appel_offre' && selectedRef === a.n_ao;
                        const winner = a.fournisseur_gagnant || a.attribution?.fournisseur_gagnant;
                        return (
                          <button
                            key={`ao-${a.id}`}
                            type="button"
                            onClick={() => handleSelectAppelOffre(a)}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-purple-50/80 transition-colors ${
                              isSelected ? 'bg-purple-50 font-bold border-l-4 border-purple-600' : ''
                            }`}
                          >
                            <div className="space-y-0.5 max-w-lg">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-xs text-slate-900">{a.n_ao}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">{a.type}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{a.date_publication}</span>
                              </div>
                              <p className="text-[11px] text-slate-700 line-clamp-1 font-medium">{a.objet}</p>
                              {winner && (
                                <p className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                                  <span>Attributaire : {winner}</span>
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {isSelected ? (
                                <span className="p-1 rounded-full bg-purple-600 text-white">
                                  <Check size={12} />
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-purple-600 hover:underline">
                                  Sélectionner
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px]">
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-slate-500 hover:text-rose-600 font-medium"
            >
              Aucun lien (Commande standard sans dossier)
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
