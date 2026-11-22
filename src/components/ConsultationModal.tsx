import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  MessageSquareQuote, 
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { 
  ConsultationItem, 
  ConsultationArticle,
  Supplier 
} from '../types';
import { 
  ThresholdCategory, 
  PROCUREMENT_THRESHOLD_LIST
} from '../utils/procurementThresholds';
import { 
  CONSULTATION_STATUS_LIST 
} from '../utils/procurementStatusWorkflow';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: ConsultationItem) => void;
  editingItem: ConsultationItem | null;
  suppliers: Supplier[];
}

interface ArticleRow {
  id: string;
  position: number;
  designation: string;
  qty: number | '';
  unite: string;
  specifications?: string;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingItem,
  suppliers = [],
}) => {
  const currentYear = new Date().getFullYear();
  const yearSuffix = String(currentYear).slice(-2);

  // Form state
  const [refConsultation, setRefConsultation] = useState('');
  const [dateEmission, setDateEmission] = useState('');
  const [delaiJours, setDelaiJours] = useState<number | ''>(15);
  const [dateCloture, setDateCloture] = useState('');
  const [demandeur, setDemandeur] = useState('Approvisionnements');
  const [objet, setObjet] = useState('');
  const [categorySeuil, setCategorySeuil] = useState<ThresholdCategory>('COMMANDE');
  const [fournisseurRetenu, setFournisseurRetenu] = useState('');
  const [montantRetenu, setMontantRetenu] = useState<number | ''>('');
  const [status, setStatus] = useState<string>('En cours');
  const [observation, setObservation] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Articles state
  const [articlesList, setArticlesList] = useState<ArticleRow[]>([]);

  useEffect(() => {
    if (editingItem) {
      setRefConsultation(editingItem.ref_consultation || '');
      setDateEmission(editingItem.date_emission || '');
      setDelaiJours(editingItem.delai_jours || 15);
      setDateCloture(editingItem.date_cloture || '');
      setDemandeur(editingItem.demandeur || 'Approvisionnements');
      setObjet(editingItem.objet || '');
      setCategorySeuil(editingItem.category_seuil || 'COMMANDE');
      setFournisseurRetenu(
        editingItem.fournisseur_retenu || 
        editingItem.decision_attribution?.fournisseur_retenu || 
        ''
      );
      setMontantRetenu(
        editingItem.montant_retenu !== undefined
          ? editingItem.montant_retenu
          : (editingItem.decision_attribution?.montant_retenu_ht ?? '')
      );
      setStatus(editingItem.status || 'En cours');
      setObservation(editingItem.observation || '');

      if (editingItem.articles && editingItem.articles.length > 0) {
        setArticlesList(
          editingItem.articles.map((art, idx) => ({
            id: String(art.id || `art-${idx}-${Date.now()}`),
            position: art.position || idx + 1,
            designation: art.designation || '',
            qty: art.qty !== undefined ? art.qty : 1,
            unite: art.unite || 'piece',
            specifications: art.specifications || '',
          }))
        );
      } else {
        setArticlesList([
          { id: `art-1-${Date.now()}`, position: 1, designation: '', qty: 1, unite: 'piece', specifications: '' }
        ]);
      }
    } else {
      const randomNum = Math.floor(100 + Math.random() * 900);
      setRefConsultation(`CONS-${yearSuffix}-${randomNum}`);
      const emitDate = new Date().toISOString().split('T')[0];
      setDateEmission(emitDate);
      setDelaiJours(15);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      setDateCloture(futureDate.toISOString().split('T')[0]);

      setDemandeur('Approvisionnements');
      setObjet('');
      setCategorySeuil('COMMANDE');
      setFournisseurRetenu('');
      setMontantRetenu('');
      setArticlesList([
        { id: `art-1-${Date.now()}`, position: 1, designation: '', qty: 1, unite: 'piece', specifications: '' }
      ]);
      setStatus('En cours');
      setObservation('');
    }
    setErrorMsg(null);
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleDurationChange = (days: number | '') => {
    setDelaiJours(days);
    if (typeof days === 'number' && days > 0 && dateEmission) {
      const d = new Date(dateEmission);
      d.setDate(d.getDate() + days);
      setDateCloture(d.toISOString().split('T')[0]);
    }
  };

  const handleDateEmissionChange = (val: string) => {
    setDateEmission(val);
    if (typeof delaiJours === 'number' && delaiJours > 0 && val) {
      const d = new Date(val);
      d.setDate(d.getDate() + delaiJours);
      setDateCloture(d.toISOString().split('T')[0]);
    }
  };

  const handleDateClotureChange = (val: string) => {
    setDateCloture(val);
    if (dateEmission && val) {
      const em = new Date(dateEmission);
      const cl = new Date(val);
      const diffDays = Math.round((cl.getTime() - em.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) setDelaiJours(diffDays);
    }
  };

  const handleAddArticle = () => {
    setArticlesList([
      ...articlesList,
      {
        id: `art-${Date.now()}-${Math.random()}`,
        position: articlesList.length + 1,
        designation: '',
        qty: 1,
        unite: 'piece',
        specifications: '',
      },
    ]);
  };

  const handleUpdateArticle = (id: string, field: keyof ArticleRow, value: any) => {
    setArticlesList((prev) =>
      prev.map((art) => (art.id === id ? { ...art, [field]: value } : art))
    );
  };

  const handleRemoveArticle = (id: string) => {
    if (articlesList.length <= 1) {
      setArticlesList([
        { id: `art-${Date.now()}`, position: 1, designation: '', qty: 1, unite: 'piece', specifications: '' }
      ]);
      return;
    }
    setArticlesList((prev) => prev.filter((art) => art.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refConsultation.trim()) {
      setErrorMsg('Veuillez renseigner la référence.');
      return;
    }
    if (!objet.trim()) {
      setErrorMsg("Veuillez renseigner l'objet.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const validArticles: ConsultationArticle[] = articlesList
      .filter((a) => a.designation.trim().length > 0)
      .map((a, idx) => ({
        id: a.id,
        position: idx + 1,
        designation: a.designation.trim(),
        qty: typeof a.qty === 'number' && a.qty > 0 ? a.qty : 1,
        unite: a.unite || 'piece',
        specifications: a.specifications?.trim() || undefined,
      }));

    const finalWinner = fournisseurRetenu.trim() || undefined;
    const finalAmount = typeof montantRetenu === 'number' ? montantRetenu : undefined;

    let finalStatus = status;
    if (finalWinner && finalStatus === 'En cours') {
      finalStatus = 'Attribué';
    }

    const payload: Partial<ConsultationItem> = {
      ref_consultation: refConsultation.trim(),
      date_emission: dateEmission || new Date().toISOString().split('T')[0],
      delai_jours: typeof delaiJours === 'number' ? delaiJours : undefined,
      date_cloture: dateCloture || undefined,
      demandeur: demandeur.trim(),
      objet: objet.trim(),
      category_seuil: categorySeuil,
      fournisseur_retenu: finalWinner,
      montant_retenu: finalAmount,
      status: finalStatus,
      observation: observation.trim() || undefined,
      articles: validArticles,
      decision_attribution: finalWinner ? {
        fournisseur_retenu: finalWinner,
        montant_retenu_ht: finalAmount,
        date_decision: new Date().toISOString().split('T')[0],
      } : undefined,
    };

    try {
      const targetId = editingItem?.id;
      const url = targetId ? `/api/consultations/${targetId}` : '/api/consultations';
      const method = targetId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      let savedItem: ConsultationItem;
      if (res && res.ok) {
        savedItem = await res.json();
      } else {
        savedItem = {
          id: editingItem?.id || Date.now(),
          ...payload,
          created_at: editingItem?.created_at || new Date().toISOString(),
        } as ConsultationItem;
      }

      onSuccess(savedItem);
      onClose();
    } catch (err: any) {
      console.error('Error saving consultation:', err);
      setErrorMsg('Erreur lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* HEADER */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-600 rounded-lg">
              <MessageSquareQuote size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                {editingItem ? 'Modifier la Consultation' : 'Nouvelle Consultation'}
              </h2>
              <p className="text-[11px] text-slate-500">Formulaire d'expression de besoin et cotations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Réf Consultation *</label>
              <input
                type="text"
                required
                value={refConsultation}
                onChange={(e) => setRefConsultation(e.target.value)}
                placeholder="Ex: CONS-26-01"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Demandeur *</label>
              <input
                type="text"
                required
                value={demandeur}
                onChange={(e) => setDemandeur(e.target.value)}
                placeholder="Service demandeur"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Catégorie de Procédure *</label>
              <select
                value={categorySeuil}
                onChange={(e) => setCategorySeuil(e.target.value as ThresholdCategory)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                {PROCUREMENT_THRESHOLD_LIST.map((th) => (
                  <option key={th.category} value={th.category}>
                    {th.shortTitle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Dates & Délais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Date d'Émission</label>
              <input
                type="date"
                value={dateEmission}
                onChange={(e) => handleDateEmissionChange(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Délai (Jours)</label>
              <input
                type="number"
                min="1"
                value={delaiJours}
                onChange={(e) => handleDurationChange(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ex: 15"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Date Limite de Clôture</label>
              <input
                type="date"
                value={dateCloture}
                onChange={(e) => handleDateClotureChange(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 3: Objet */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Objet de la Consultation *</label>
            <input
              type="text"
              required
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder="Ex: Achat de matière première, outillage, pièces de rechange..."
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Row 4: Articles Demandés */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-slate-800 font-bold">Articles & Quantités Demandés</label>
              <button
                type="button"
                onClick={handleAddArticle}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200"
              >
                <Plus size={12} />
                <span>Ajouter une ligne</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-1.5 px-2 text-center w-8">N°</th>
                    <th className="py-1.5 px-2.5">Désignation de l'article *</th>
                    <th className="py-1.5 px-2.5 w-20">Quantité</th>
                    <th className="py-1.5 px-2.5 w-24">Unité</th>
                    <th className="py-1.5 px-2.5">Spécifications</th>
                    <th className="py-1.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articlesList.map((art, idx) => (
                    <tr key={art.id}>
                      <td className="py-1.5 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-1.5 px-2.5">
                        <input
                          type="text"
                          value={art.designation}
                          onChange={(e) => handleUpdateArticle(art.id, 'designation', e.target.value)}
                          placeholder="Désignation"
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none text-xs"
                        />
                      </td>
                      <td className="py-1.5 px-2.5">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={art.qty}
                          onChange={(e) => handleUpdateArticle(art.id, 'qty', e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Qty"
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center font-bold font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none text-xs"
                        />
                      </td>
                      <td className="py-1.5 px-2.5">
                        <select
                          value={art.unite}
                          onChange={(e) => handleUpdateArticle(art.id, 'unite', e.target.value)}
                          className="w-full px-1.5 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none text-xs"
                        >
                          <option value="piece">Pièce</option>
                          <option value="kg">Kg</option>
                          <option value="litre">Litre</option>
                          <option value="metre">Mètre</option>
                          <option value="boite">Boîte</option>
                          <option value="rouleau">Rouleau</option>
                          <option value="ensemble">Kit</option>
                          <option value="lot">Lot</option>
                          <option value="forfait">Forfait</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2.5">
                        <input
                          type="text"
                          value={art.specifications || ''}
                          onChange={(e) => handleUpdateArticle(art.id, 'specifications', e.target.value)}
                          placeholder="Spécification / Réf"
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none text-xs text-slate-600"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveArticle(art.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 5: Statut & Attribution */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Fournisseur Retenu</label>
              <input
                type="text"
                list="suppliers-list"
                value={fournisseurRetenu}
                onChange={(e) => setFournisseurRetenu(e.target.value)}
                placeholder="Optionnel"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <datalist id="suppliers-list">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Montant Retenu (DZD)</label>
              <input
                type="number"
                min="0"
                value={montantRetenu}
                onChange={(e) => setMontantRetenu(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Optionnel"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Statut *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-sky-300 rounded-lg bg-white font-bold text-sky-950 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                {CONSULTATION_STATUS_LIST.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 6: Observations */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Observations / Remarques</label>
            <input
              type="text"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Notes complémentaires..."
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </form>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={14} />
            <span>{editingItem ? 'Enregistrer' : 'Créer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
