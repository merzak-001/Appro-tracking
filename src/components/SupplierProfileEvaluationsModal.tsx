import React, { useState, useEffect } from 'react';
import { Award, Star, Calendar, User, FileText, X, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { Supplier, SupplierEvaluation } from '../types';

interface SupplierProfileEvaluationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export const SupplierProfileEvaluationsModal: React.FC<SupplierProfileEvaluationsModalProps> = ({
  isOpen,
  onClose,
  supplier,
}) => {
  const [evaluations, setEvaluations] = useState<SupplierEvaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (isOpen && supplier) {
      setLoading(true);
      fetch(`/api/suppliers/${supplier.id}/evaluations`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setEvaluations(data);
          }
        })
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    }
  }, [isOpen, supplier]);

  if (!isOpen || !supplier) return null;

  // Filter by year
  const yearEvaluations = evaluations.filter((ev) => {
    const yr = new Date(ev.evaluation_date || ev.created_at || '').getFullYear();
    return yr === selectedYear;
  });

  // Calculate Moyen (Yearly Average)
  const averageScore = yearEvaluations.length > 0
    ? Math.round(yearEvaluations.reduce((acc, curr) => acc + Number(curr.total_score || 0), 0) / yearEvaluations.length)
    : null;

  const getClassificationBadge = (score: number | null) => {
    if (score === null) return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300">Aucune évaluation ({selectedYear})</span>;
    if (score >= 81) return <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">A : Excellent ({score}%) - Maintien</span>;
    if (score >= 61) return <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-300">B : Satisfaisant ({score}%) - Maintien avec suivi</span>;
    if (score >= 41) return <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">C : Acceptable ({score}%) - Plan d'amélioration</span>;
    if (score >= 21) return <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-300">D : Insuffisant ({score}%) - Suspension</span>;
    return <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">E : Inacceptable ({score}%) - Retrait</span>;
  };

  const getEvaluationTypeDetails = (ev: SupplierEvaluation) => {
    let profile = ev.profile_type;

    // Auto-detect profile for legacy evaluations if not specified
    if (!profile || profile === 'standard') {
      if (ev.sav_score === 0 && ev.support_score === 0 && ev.communication_score === 0 && ev.reclamations_score === 0 && ev.conformite_score === 0 && (ev.qualite_score + ev.delais_score + ev.prix_score === ev.total_score) && ev.total_score > 0) {
        profile = '3_criteres';
      } else if (ev.sav_score === 0 && ev.support_score === 0 && ev.communication_score === 0 && ev.reclamations_score === 0 && (ev.qualite_score + ev.delais_score + ev.prix_score + ev.conformite_score === ev.total_score) && ev.total_score > 0) {
        profile = 'fournitures';
      } else if (ev.prix_score === 0 && ev.conformite_score === 0 && ev.communication_score === 0 && ev.reclamations_score === 0 && (ev.qualite_score + ev.delais_score + ev.support_score + ev.sav_score === ev.total_score) && ev.total_score > 0) {
        profile = 'prestations';
      } else if (ev.sav_score === 0 && ev.communication_score === 0 && ev.reclamations_score === 0 && (ev.qualite_score + ev.delais_score + ev.prix_score + ev.support_score + ev.conformite_score === ev.total_score) && ev.total_score > 0) {
        profile = 'equipements';
      } else {
        profile = 'standard';
      }
    }

    if (profile === '3_criteres') {
      return {
        title: '3 Critères Principaux (Qualité, Délais, Prix)',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        items: [
          { label: 'Qualité Produit', score: ev.qualite_score, max: 40 },
          { label: 'Respect Délais', score: ev.delais_score, max: 30 },
          { label: 'Compétitivité Prix', score: ev.prix_score, max: 30 },
        ]
      };
    }

    if (profile === 'fournitures') {
      return {
        title: 'Fournitures / Matières (4 Critères)',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        items: [
          { label: 'Qualité / Conforme', score: ev.qualite_score, max: 40 },
          { label: 'Respect Délais', score: ev.delais_score, max: 30 },
          { label: 'Compétitivité Prix', score: ev.prix_score, max: 20 },
          { label: 'Conformité Doc.', score: ev.conformite_score, max: 10 },
        ]
      };
    }

    if (profile === 'prestations') {
      return {
        title: 'Prestations / Services (4 Critères)',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
        items: [
          { label: 'Qualité & Compétence', score: ev.qualite_score, max: 35 },
          { label: 'Respect Délais', score: ev.delais_score, max: 25 },
          { label: 'Offre Financière', score: ev.support_score, max: 25 },
          { label: 'SAV & Communication', score: ev.sav_score, max: 15 },
        ]
      };
    }

    if (profile === 'equipements') {
      return {
        title: 'Équipements / Outillages (5 Critères)',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        items: [
          { label: 'Qualité Équipement', score: ev.qualite_score, max: 30 },
          { label: 'Délais Livraison', score: ev.delais_score, max: 20 },
          { label: 'Prix & Compétitivité', score: ev.prix_score, max: 20 },
          { label: 'Support & SAV', score: ev.support_score, max: 20 },
          { label: 'Conformité Tech.', score: ev.conformite_score, max: 10 },
        ]
      };
    }

    return {
      title: 'ISO 9001 (8 Critères)',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
      items: [
        { label: 'Qualité', score: ev.qualite_score, max: 30 },
        { label: 'Délais', score: ev.delais_score, max: 15 },
        { label: 'Prix', score: ev.prix_score, max: 15 },
        { label: 'Conformité', score: ev.conformite_score, max: 10 },
        { label: 'SAV', score: ev.sav_score, max: 10 },
        { label: 'Support', score: ev.support_score, max: 10 },
        { label: 'Communication', score: ev.communication_score, max: 5 },
        { label: 'Réclamations', score: ev.reclamations_score, max: 5 },
      ]
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Profil & Historique des Évaluations - {supplier.name}</h3>
              <p className="text-xs text-slate-300">
                {supplier.country || 'Algérie'} {supplier.rc ? `| RC: ${supplier.rc}` : ''} {supplier.nif ? `| NIF: ${supplier.nif}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">

          {/* Year Filter & Yearly Summary Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Note Annuelle Moyen ({selectedYear})</div>
              <div className="mt-1">{getClassificationBadge(averageScore)}</div>
              <p className="text-[10px] text-slate-400 mt-1">
                {yearEvaluations.length} réévaluation(s) réalisée(s) sur commandes en {selectedYear}
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="font-semibold text-slate-600 text-xs">Année :</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>
          </div>

          {/* Detailed Evaluations List */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-sky-600" />
              Détail des Évaluations par Commande ({yearEvaluations.length})
            </h4>

            {loading ? (
              <div className="p-8 text-center text-slate-500">Chargement des évaluations...</div>
            ) : yearEvaluations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Star size={24} className="mx-auto text-slate-300 mb-1" />
                <p className="font-medium text-xs">Aucune évaluation enregistrée pour l'année {selectedYear}.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Les évaluations s’effectuent automatiquement lors de la clôture des commandes locales.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {yearEvaluations.map((ev) => {
                  const typeDetails = getEvaluationTypeDetails(ev);
                  return (
                    <div key={ev.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold font-mono text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                            {ev.order_code || `Commande #${ev.order_id}`}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeDetails.badgeClass}`}>
                            {typeDetails.title}
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-600 flex items-center gap-1">
                            <Calendar size={12} /> {ev.evaluation_date}
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-600 flex items-center gap-1">
                            <User size={12} /> Évaluateur: {ev.evaluator_name}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="font-black font-mono text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border">
                            {ev.total_score} / 100
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.classification === 'A' ? 'bg-emerald-100 text-emerald-800' :
                            ev.classification === 'B' ? 'bg-sky-100 text-sky-800' :
                            ev.classification === 'C' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            Catégorie {ev.classification}
                          </span>
                        </div>
                      </div>

                      {/* Criteria Breakdown Grid Based on Evaluation Type */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {typeDetails.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-slate-200">
                            <span className="text-slate-600 truncate">{item.label} ({item.max}pt):</span>
                            <strong className="text-slate-900 font-mono ml-1">{item.score} / {item.max}</strong>
                          </div>
                        ))}
                      </div>

                      {ev.commentaires && (
                        <p className="text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded border border-amber-100 italic">
                          "{ev.commentaires}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
