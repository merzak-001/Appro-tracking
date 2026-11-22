import React, { useState } from 'react';
import { Award, CheckCircle2, AlertCircle, X, Star, Layers } from 'lucide-react';
import { SupplierEvaluation } from '../types';

interface SupplierEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (evaluation: SupplierEvaluation) => void;
  supplierId: number;
  supplierName: string;
  orderId: number;
  orderCode: string;
  evaluatorName: string;
}

export type EvaluationProfileType = '3_criteres' | 'fournitures' | 'prestations' | 'equipements' | 'standard';

export const SupplierEvaluationModal: React.FC<SupplierEvaluationModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  supplierId,
  supplierName,
  orderId,
  orderCode,
  evaluatorName,
}) => {
  const [profile, setProfile] = useState<EvaluationProfileType>('3_criteres');

  // Scores - Initially NULL so user MUST actively rate every field
  const [qualite, setQualite] = useState<number | null>(null);
  const [delais, setDelais] = useState<number | null>(null);
  const [prix, setPrix] = useState<number | null>(null);
  const [conformite, setConformite] = useState<number | null>(null);
  const [sav, setSav] = useState<number | null>(null);
  const [support, setSupport] = useState<number | null>(null);
  const [communication, setCommunication] = useState<number | null>(null);
  const [reclamations, setReclamations] = useState<number | null>(null);

  const [commentaires, setCommentaires] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Change Profile & reset un-filled scores
  const handleProfileChange = (newProfile: EvaluationProfileType) => {
    setProfile(newProfile);
    setQualite(null);
    setDelais(null);
    setPrix(null);
    setConformite(null);
    setSav(null);
    setSupport(null);
    setCommunication(null);
    setReclamations(null);
    setError(null);
  };

  // Determine required criteria based on profile
  const isQualiteRequired = true;
  const isDelaisRequired = true;
  const isPrixRequired = profile !== 'prestations';
  const isConformiteRequired = profile === 'standard' || profile === 'fournitures' || profile === 'equipements';
  const isSavRequired = profile === 'standard' || profile === 'prestations';
  const isSupportRequired = profile === 'standard' || profile === 'prestations' || profile === 'equipements';
  const isCommunicationRequired = profile === 'standard';
  const isReclamationsRequired = profile === 'standard';

  const qualiteMax = (profile === '3_criteres' || profile === 'fournitures') ? 40 : profile === 'prestations' ? 35 : 30;
  const delaisMax = (profile === '3_criteres' || profile === 'fournitures') ? 30 : profile === 'prestations' ? 25 : profile === 'equipements' ? 20 : 15;
  const prixMax = profile === '3_criteres' ? 30 : (profile === 'fournitures' || profile === 'equipements') ? 20 : 15;
  const conformiteMax = 10;
  const savMax = profile === 'prestations' ? 15 : 10;
  const supportMax = profile === 'prestations' ? 25 : profile === 'equipements' ? 20 : 10;
  const commMax = 5;
  const reclMax = 5;

  const checkAllRated = (): boolean => {
    if (isQualiteRequired && qualite === null) return false;
    if (isDelaisRequired && delais === null) return false;
    if (isPrixRequired && prix === null) return false;
    if (isConformiteRequired && conformite === null) return false;
    if (isSavRequired && sav === null) return false;
    if (isSupportRequired && support === null) return false;
    if (isCommunicationRequired && communication === null) return false;
    if (isReclamationsRequired && reclamations === null) return false;
    return true;
  };

  const currentScoreSum =
    (qualite || 0) +
    (delais || 0) +
    (prix || 0) +
    (conformite || 0) +
    (sav || 0) +
    (support || 0) +
    (communication || 0) +
    (reclamations || 0);

  const totalScore = Math.min(100, Math.max(0, currentScoreSum));
  const isFullyRated = checkAllRated();

  const getClassification = (score: number): { code: 'A' | 'B' | 'C' | 'D' | 'E'; label: string; bg: string; text: string } => {
    if (score >= 81) return { code: 'A', label: 'A : Excellent (Maintien)', bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800' };
    if (score >= 61) return { code: 'B', label: 'B : Satisfaisant (Maintien avec suivi)', bg: 'bg-sky-100 border-sky-300', text: 'text-sky-800' };
    if (score >= 41) return { code: 'C', label: 'C : Acceptable (Plan d\'amélioration)', bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800' };
    if (score >= 21) return { code: 'D', label: 'D : Insuffisant (Suspension)', bg: 'bg-orange-100 border-orange-300', text: 'text-orange-800' };
    return { code: 'E', label: 'E : Inacceptable (Retrait)', bg: 'bg-rose-100 border-rose-300', text: 'text-rose-800' };
  };

  const classificationInfo = getClassification(totalScore);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!checkAllRated()) {
      setError('⚠️ Évaluation incomplète : Veuillez remplir tous les critères requis ci-dessous avant de pouvoir valider la clôture.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Partial<SupplierEvaluation> = {
        supplier_id: supplierId,
        order_id: orderId,
        order_code: orderCode,
        evaluator_name: evaluatorName,
        evaluation_date: new Date().toISOString().split('T')[0],
        profile_type: profile,
        qualite_score: qualite || 0,
        delais_score: delais || 0,
        prix_score: isPrixRequired ? (prix || 0) : 0,
        conformite_score: isConformiteRequired ? (conformite || 0) : 0,
        sav_score: isSavRequired ? (sav || 0) : 0,
        support_score: isSupportRequired ? (support || 0) : 0,
        communication_score: isCommunicationRequired ? (communication || 0) : 0,
        reclamations_score: isReclamationsRequired ? (reclamations || 0) : 0,
        total_score: totalScore,
        classification: classificationInfo.code,
        commentaires: commentaires.trim(),
      };

      const res = await fetch('/api/suppliers/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errText = 'Erreur réseau lors de la soumission de l\'évaluation.';
        try {
          const errData = await res.json();
          errText = errData.error || errText;
        } catch (_) {
          errText = await res.text();
        }
        throw new Error(errText);
      }

      const savedEval = await res.json();
      onSubmitSuccess(savedEval);
    } catch (err: any) {
      console.error('Failed to submit evaluation:', err);
      setError(err.message || 'Impossible d\'enregistrer l\'évaluation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Award size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Évaluation Obligatoire du Fournisseur</h3>
              <p className="text-[11px] text-slate-300">
                Commande <span className="font-mono font-bold text-sky-400">{orderCode}</span> — {supplierName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Remarque ISO 9001 :</span> La clôture d'une commande requiert l'évaluation active du fournisseur sur le barème total de 100 points.
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-900 text-xs font-bold shadow-xs">
              {error}
            </div>
          )}

          {/* Profile Selector */}
          <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Layers size={14} className="text-sky-600" />
              <span>Type de Commande / Profil d'Évaluation :</span>
            </label>
            <select
              value={profile}
              onChange={(e) => handleProfileChange(e.target.value as EvaluationProfileType)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="3_criteres">📊 3 Critères Principaux (Qualité 40%, Délais 30%, Prix 30% = 100 pt)</option>
              <option value="fournitures">📦 Achats & Fournitures (Qualité 40%, Délais 30%, Prix 20%, Doc 10% = 100 pt)</option>
              <option value="prestations">🛠️ Prestations & Services (Qualité 35%, Délais 25%, Support 25%, SAV 15% = 100 pt)</option>
              <option value="equipements">⚙️ Équipements & Outillages (Qualité 30%, Délais 20%, Prix 20%, Support 20%, Tech 10% = 100 pt)</option>
              <option value="standard">📋 Procédure ISO 9001 (8 Critères Répartis = 100 pt)</option>
            </select>
          </div>

          {/* Live Score Counter */}
          <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${isFullyRated ? classificationInfo.bg : 'bg-slate-100 border-slate-300 text-slate-600'}`}>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide">
                {isFullyRated ? 'Note Globale Consolidée' : 'Évaluation en cours de saisie...'}
              </div>
              <div className={`text-sm font-bold ${isFullyRated ? classificationInfo.text : 'text-slate-500'}`}>
                {isFullyRated ? classificationInfo.label : 'Veuillez évaluer tous les critères requis ci-dessous'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black font-mono text-slate-900">
                {isFullyRated ? `${totalScore} / 100` : `${totalScore} pts`}
              </div>
              <div className="text-[10px] font-semibold text-slate-500">
                {isFullyRated ? `${totalScore}%` : 'Incomplet'}
              </div>
            </div>
          </div>

          {/* Criteria Inputs */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              Saisie des Notes par Critère (Total = 100 points)
            </h4>

            {/* 1. Qualité */}
            {isQualiteRequired && (
              <div className={`space-y-1.5 p-3 rounded-lg border ${qualite === null ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-800">
                    1. Qualité des produits / livrables (Max {qualiteMax} pts) <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${qualite === null ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-sky-50 text-sky-900 border-sky-300'}`}>
                    {qualite === null ? 'Non évalué' : `${qualite} / ${qualiteMax} pts`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={qualiteMax}
                  value={qualite ?? 0}
                  onChange={(e) => setQualite(Number(e.target.value))}
                  className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* 2. Délais */}
            {isDelaisRequired && (
              <div className={`space-y-1.5 p-3 rounded-lg border ${delais === null ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-800">
                    2. Respect des délais (Max {delaisMax} pts) <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${delais === null ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-sky-50 text-sky-900 border-sky-300'}`}>
                    {delais === null ? 'Non évalué' : `${delais} / ${delaisMax} pts`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={delaisMax}
                  value={delais ?? 0}
                  onChange={(e) => setDelais(Number(e.target.value))}
                  className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* 3. Prix */}
            {isPrixRequired && (
              <div className={`space-y-1.5 p-3 rounded-lg border ${prix === null ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-800">
                    3. Compétitivité Prix & Conditions (Max {prixMax} pts) <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${prix === null ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-sky-50 text-sky-900 border-sky-300'}`}>
                    {prix === null ? 'Non évalué' : `${prix} / ${prixMax} pts`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={prixMax}
                  value={prix ?? 0}
                  onChange={(e) => setPrix(Number(e.target.value))}
                  className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* 4. Conformité */}
            {isConformiteRequired && (
              <div className={`space-y-1.5 p-3 rounded-lg border ${conformite === null ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-800">
                    4. Conformité réglementaire & légale (Max {conformiteMax} pts) <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${conformite === null ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-sky-50 text-sky-900 border-sky-300'}`}>
                    {conformite === null ? 'Non évalué' : `${conformite} / ${conformiteMax} pts`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={conformiteMax}
                  value={conformite ?? 0}
                  onChange={(e) => setConformite(Number(e.target.value))}
                  className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* 5. SAV / Garantie */}
            {isSavRequired && (
              <div className={`space-y-1.5 p-3 rounded-lg border ${sav === null ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-800">
                    5. Disponibilité & SAV / Garantie (Max {savMax} pts) <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${sav === null ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-sky-50 text-sky-900 border-sky-300'}`}>
                    {sav === null ? 'Non évalué' : `${sav} / ${savMax} pts`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={savMax}
                  value={sav ?? 0}
                  onChange={(e) => setSav(Number(e.target.value))}
                  className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* Support technique */}
            {isSupportRequired && (
              <div className={`space-y-1.5 p-3 rounded-lg border ${support === null ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-800">
                    6. Support technique & réactivité (Max {supportMax} pts) <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${support === null ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-sky-50 text-sky-900 border-sky-300'}`}>
                    {support === null ? 'Non évalué' : `${support} / ${supportMax} pts`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={supportMax}
                  value={support ?? 0}
                  onChange={(e) => setSupport(Number(e.target.value))}
                  className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* Communication */}
            {isCommunicationRequired && (
              <div className={`space-y-1.5 p-3 rounded-lg border ${communication === null ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-800">
                    7. Communication & Documentation (Max {commMax} pts) <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${communication === null ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-sky-50 text-sky-900 border-sky-300'}`}>
                    {communication === null ? 'Non évalué' : `${communication} / ${commMax} pts`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={commMax}
                  value={communication ?? 0}
                  onChange={(e) => setCommunication(Number(e.target.value))}
                  className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* Reclamations */}
            {isReclamationsRequired && (
              <div className={`space-y-1.5 p-3 rounded-lg border ${reclamations === null ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-800">
                    8. Suivi des réclamations & non-conformités (Max {reclMax} pts) <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${reclamations === null ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-sky-50 text-sky-900 border-sky-300'}`}>
                    {reclamations === null ? 'Non évalué' : `${reclamations} / ${reclMax} pts`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={reclMax}
                  value={reclamations ?? 0}
                  onChange={(e) => setReclamations(Number(e.target.value))}
                  className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Observations & Comments */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 text-xs">Remarques ou Observations (Optionnel)</label>
            <textarea
              rows={2}
              value={commentaires}
              onChange={(e) => setCommentaires(e.target.value)}
              placeholder="Ex: Évaluation effectuée lors de la réception..."
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Annuler (Conserver le statut actuel)
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !isFullyRated}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer ${
                isFullyRated
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-102 active:scale-98'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-70'
              }`}
            >
              <CheckCircle2 size={16} />
              <span>Enregistrer & Clôturer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
