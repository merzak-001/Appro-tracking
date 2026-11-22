import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Gavel, 
  AlertCircle, 
  Plus,
  Trash2
} from 'lucide-react';
import { 
  AppelOffreItem, 
  AppelOffreType, 
  AppelOffreArticle,
  Supplier 
} from '../types';
import { 
  APPEL_OFFRE_STATUS_LIST 
} from '../utils/procurementStatusWorkflow';

interface AppelOffreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: AppelOffreItem) => void;
  editingItem: AppelOffreItem | null;
  suppliers: Supplier[];
}

interface AoArticleRow {
  id: string;
  lot_number?: string | number;
  position: number;
  designation: string;
  qty: number | '';
  unite: string;
  specifications?: string;
}

export const AppelOffreModal: React.FC<AppelOffreModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingItem,
  suppliers = [],
}) => {
  const currentYear = new Date().getFullYear();
  const yearSuffix = String(currentYear).slice(-2);

  // Form State
  const [nAo, setNAo] = useState('');
  const [type, setType] = useState<AppelOffreType>('National Ouvert');
  const [objet, setObjet] = useState('');
  const [directionEmettrice, setDirectionEmettrice] = useState('Approvisionnements');
  const [budgetPrevisionnel, setBudgetPrevisionnel] = useState<number | ''>('');
  const [cautionSoumission, setCautionSoumission] = useState<number | ''>('');
  const [datePublication, setDatePublication] = useState('');
  const [delaiJours, setDelaiJours] = useState<number | ''>(30);
  const [dateDepotPlis, setDateDepotPlis] = useState('');
  const [fournisseurGagnant, setFournisseurGagnant] = useState('');
  const [montantAttribue, setMontantAttribue] = useState<number | ''>('');
  const [nMarcheContrat, setNMarcheContrat] = useState('');
  const [statut, setStatut] = useState<string>('En cours');
  const [observation, setObservation] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Articles & Lots State
  const [articlesList, setArticlesList] = useState<AoArticleRow[]>([]);

  useEffect(() => {
    if (editingItem) {
      setNAo(editingItem.n_ao || '');
      setType((editingItem.type as AppelOffreType) || 'National Ouvert');
      setObjet(editingItem.objet || '');
      setDirectionEmettrice(editingItem.direction_emettrice || 'Approvisionnements');
      setBudgetPrevisionnel(editingItem.budget_previsionnel || '');
      setCautionSoumission(editingItem.caution_soumission || '');
      setDatePublication(editingItem.date_publication || '');
      setDelaiJours(editingItem.delai_jours || 30);
      setDateDepotPlis(editingItem.date_depot_plis || '');
      setFournisseurGagnant(
        editingItem.fournisseur_gagnant || 
        editingItem.attribution?.fournisseur_gagnant || 
        ''
      );
      setMontantAttribue(
        editingItem.montant_attribue !== undefined
          ? editingItem.montant_attribue
          : (editingItem.attribution?.montant_attribue ?? '')
      );
      setNMarcheContrat(
        editingItem.n_marche_contrat || 
        editingItem.attribution?.n_marche_contrat || 
        ''
      );
      setStatut(editingItem.statut || 'En cours');
      setObservation(editingItem.observation || '');

      if (editingItem.articles && editingItem.articles.length > 0) {
        setArticlesList(
          editingItem.articles.map((art, idx) => ({
            id: String(art.id || `ao-art-${idx}-${Date.now()}`),
            lot_number: art.lot_number || '',
            position: art.position || idx + 1,
            designation: art.designation || '',
            qty: art.qty !== undefined ? art.qty : 1,
            unite: art.unite || 'piece',
            specifications: art.specifications || '',
          }))
        );
      } else {
        setArticlesList([
          { id: `ao-art-1-${Date.now()}`, lot_number: '', position: 1, designation: '', qty: 1, unite: 'piece', specifications: '' }
        ]);
      }
    } else {
      const randomNum = Math.floor(10 + Math.random() * 90);
      setNAo(`AO-NAT-${yearSuffix}/${randomNum}`);
      setType('National Ouvert');
      setObjet('');
      setDirectionEmettrice('Approvisionnements');
      setBudgetPrevisionnel('');
      setCautionSoumission('');
      const pubDate = new Date().toISOString().split('T')[0];
      setDatePublication(pubDate);
      setDelaiJours(30);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      setDateDepotPlis(futureDate.toISOString().split('T')[0]);

      setArticlesList([
        { id: `ao-art-1-${Date.now()}`, lot_number: '', position: 1, designation: '', qty: 1, unite: 'piece', specifications: '' }
      ]);
      setFournisseurGagnant('');
      setMontantAttribue('');
      setNMarcheContrat('');
      setStatut('En cours');
      setObservation('');
    }
    setErrorMsg(null);
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleDurationChange = (days: number | '') => {
    setDelaiJours(days);
    if (typeof days === 'number' && days > 0 && datePublication) {
      const pub = new Date(datePublication);
      pub.setDate(pub.getDate() + days);
      setDateDepotPlis(pub.toISOString().split('T')[0]);
    }
  };

  const handleDatePublicationChange = (val: string) => {
    setDatePublication(val);
    if (typeof delaiJours === 'number' && delaiJours > 0 && val) {
      const pub = new Date(val);
      pub.setDate(pub.getDate() + delaiJours);
      setDateDepotPlis(pub.toISOString().split('T')[0]);
    }
  };

  const handleDateDepotChange = (val: string) => {
    setDateDepotPlis(val);
    if (datePublication && val) {
      const pub = new Date(datePublication);
      const dep = new Date(val);
      const diffDays = Math.round((dep.getTime() - pub.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) setDelaiJours(diffDays);
    }
  };

  const handleAddArticle = () => {
    setArticlesList([
      ...articlesList,
      {
        id: `ao-art-${Date.now()}-${Math.random()}`,
        lot_number: '',
        position: articlesList.length + 1,
        designation: '',
        qty: 1,
        unite: 'piece',
        specifications: '',
      },
    ]);
  };

  const handleUpdateArticle = (id: string, field: keyof AoArticleRow, value: any) => {
    setArticlesList((prev) =>
      prev.map((art) => (art.id === id ? { ...art, [field]: value } : art))
    );
  };

  const handleRemoveArticle = (id: string) => {
    if (articlesList.length <= 1) {
      setArticlesList([
        { id: `ao-art-${Date.now()}`, lot_number: '', position: 1, designation: '', qty: 1, unite: 'piece', specifications: '' },
      ]);
      return;
    }
    setArticlesList((prev) =>
      prev.filter((art) => art.id !== id).map((art, idx) => ({ ...art, position: idx + 1 }))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nAo.trim()) {
      setErrorMsg("Veuillez renseigner le N° d'Appel d'Offres.");
      return;
    }
    if (!objet.trim()) {
      setErrorMsg("Veuillez renseigner l'objet du marché.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const numBudget = typeof budgetPrevisionnel === 'number' ? budgetPrevisionnel : undefined;
    const numCaution = typeof cautionSoumission === 'number' ? cautionSoumission : undefined;
    const numAttribue = typeof montantAttribue === 'number' ? montantAttribue : undefined;

    let finalStatut = statut;
    if (fournisseurGagnant.trim() && finalStatut === 'En cours') {
      finalStatut = 'Attribué';
    }

    const validArticles: AppelOffreArticle[] = articlesList
      .filter((a) => a.designation.trim().length > 0)
      .map((a, idx) => ({
        id: a.id,
        lot_number: a.lot_number || undefined,
        position: idx + 1,
        designation: a.designation.trim(),
        qty: typeof a.qty === 'number' && a.qty > 0 ? a.qty : 1,
        unite: a.unite || 'piece',
        specifications: a.specifications?.trim() || undefined,
      }));

    const payload: Partial<AppelOffreItem> = {
      n_ao: nAo.trim(),
      type,
      objet: objet.trim(),
      direction_emettrice: directionEmettrice.trim(),
      budget_previsionnel: numBudget,
      caution_soumission: numCaution,
      date_publication: datePublication || new Date().toISOString().split('T')[0],
      delai_jours: typeof delaiJours === 'number' ? delaiJours : undefined,
      date_depot_plis: dateDepotPlis || new Date().toISOString().split('T')[0],
      fournisseur_gagnant: fournisseurGagnant.trim() || undefined,
      montant_attribue: numAttribue,
      n_marche_contrat: nMarcheContrat.trim() || undefined,
      statut: finalStatut,
      observation: observation.trim() || undefined,
      articles: validArticles,
      attribution: fournisseurGagnant.trim() ? {
        fournisseur_gagnant: fournisseurGagnant.trim(),
        montant_attribue: numAttribue,
        n_marche_contrat: nMarcheContrat.trim() || undefined,
        date_attribution_definitive: new Date().toISOString().split('T')[0],
      } : undefined,
    };

    try {
      const targetId = editingItem?.id;
      const url = targetId ? `/api/appels-offres/${targetId}` : '/api/appels-offres';
      const method = targetId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      let savedItem: AppelOffreItem;
      if (res && res.ok) {
        savedItem = await res.json();
      } else {
        savedItem = {
          id: editingItem?.id || Date.now(),
          ...payload,
          created_at: editingItem?.created_at || new Date().toISOString(),
        } as AppelOffreItem;
      }

      onSuccess(savedItem);
      onClose();
    } catch (err: any) {
      console.error('[AppelOffreModal] Error saving:', err);
      setErrorMsg('Erreur lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* HEADER */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
              <Gavel size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {editingItem ? `Modifier Appel d'Offres : ${editingItem.n_ao}` : 'Nouvel Appel d\'Offres'}
              </h2>
              <p className="text-[11px] text-purple-200/80">Gestion du marché et dates de soumission</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2 font-medium">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">N° Appel d'Offres *</label>
              <input
                type="text"
                required
                value={nAo}
                onChange={(e) => setNAo(e.target.value)}
                placeholder="Ex: AO-NAT-26/01"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-purple-950 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Type de Procédure *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AppelOffreType)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="National Ouvert">National Ouvert</option>
                <option value="National Restreint">National Restreint</option>
                <option value="International Ouvert">International Ouvert</option>
                <option value="International Restreint">International Restreint</option>
                <option value="Gré à Gré Après Consultation">Gré à Gré</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Direction / Demandeur *</label>
              <input
                type="text"
                required
                value={directionEmettrice}
                onChange={(e) => setDirectionEmettrice(e.target.value)}
                placeholder="Ex: Approvisionnements, Usine..."
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Dates & Délais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Date de Publication *</label>
              <input
                type="date"
                required
                value={datePublication}
                onChange={(e) => handleDatePublicationChange(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Délai de Soumission (Jours)</label>
              <input
                type="number"
                min="1"
                value={delaiJours}
                onChange={(e) => handleDurationChange(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ex: 30"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Date Dépôt des Plis *</label>
              <input
                type="date"
                required
                value={dateDepotPlis}
                onChange={(e) => handleDateDepotChange(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 3: Objet & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Objet du Marché *</label>
              <input
                type="text"
                required
                value={objet}
                onChange={(e) => setObjet(e.target.value)}
                placeholder="Ex: Fourniture d'équipements de production, outillage..."
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Budget Estimé (DZD)</label>
              <input
                type="number"
                min="0"
                value={budgetPrevisionnel}
                onChange={(e) => setBudgetPrevisionnel(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Optionnel"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Articles & Lots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-slate-800 font-bold">Articles / Lots Demandés</label>
              <button
                type="button"
                onClick={handleAddArticle}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 hover:bg-purple-100"
              >
                <Plus size={12} />
                <span>Ajouter une ligne</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-1.5 px-2 w-16">Lot</th>
                    <th className="py-1.5 px-2.5">Désignation de l'article / équipement *</th>
                    <th className="py-1.5 px-2.5 w-20">Quantité</th>
                    <th className="py-1.5 px-2.5 w-24">Unité</th>
                    <th className="py-1.5 px-2.5">Spécifications</th>
                    <th className="py-1.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articlesList.map((art) => (
                    <tr key={art.id}>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={art.lot_number || ''}
                          onChange={(e) => handleUpdateArticle(art.id, 'lot_number', e.target.value)}
                          placeholder="Lot 1"
                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-center text-xs"
                        />
                      </td>
                      <td className="py-1.5 px-2.5">
                        <input
                          type="text"
                          value={art.designation}
                          onChange={(e) => handleUpdateArticle(art.id, 'designation', e.target.value)}
                          placeholder="Désignation"
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none text-xs"
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
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center font-bold font-mono focus:ring-1 focus:ring-purple-500 focus:outline-none text-xs"
                        />
                      </td>
                      <td className="py-1.5 px-2.5">
                        <select
                          value={art.unite}
                          onChange={(e) => handleUpdateArticle(art.id, 'unite', e.target.value)}
                          className="w-full px-1.5 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none text-xs"
                        >
                          <option value="piece">Pièce</option>
                          <option value="lot">Lot</option>
                          <option value="ensemble">Kit</option>
                          <option value="forfait">Forfait</option>
                          <option value="kg">Kg</option>
                          <option value="metre">Mètre</option>
                          <option value="tonne">Tonne</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2.5">
                        <input
                          type="text"
                          value={art.specifications || ''}
                          onChange={(e) => handleUpdateArticle(art.id, 'specifications', e.target.value)}
                          placeholder="Normes, spécifications..."
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none text-xs text-slate-600"
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
              <label className="block text-slate-600 font-semibold mb-1">Attributaire Retenu</label>
              <input
                type="text"
                list="ao-suppliers-list"
                value={fournisseurGagnant}
                onChange={(e) => setFournisseurGagnant(e.target.value)}
                placeholder="Optionnel"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <datalist id="ao-suppliers-list">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Montant Attribué (DZD)</label>
              <input
                type="number"
                min="0"
                value={montantAttribue}
                onChange={(e) => setMontantAttribue(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Optionnel"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Statut *</label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg bg-white font-bold text-purple-950 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {APPEL_OFFRE_STATUS_LIST.map((s) => (
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
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
            className="px-4 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={14} />
            <span>{editingItem ? 'Enregistrer' : 'Créer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
