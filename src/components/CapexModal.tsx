import React, { useState, useEffect } from 'react';
import { TrendingUp, X, AlertCircle, Plus, Trash2, ShoppingCart, Globe, Calculator, Edit, Check, Package, RotateCcw } from 'lucide-react';
import { CapexItem, CapexCategory, CapexStatus, CapexSubItem, CapexApproachCost } from '../types';

interface CapexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedItem?: CapexItem) => void;
  editingItem?: CapexItem | null;
  selectedYear: number;
}

export const CapexModal: React.FC<CapexModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingItem = null,
  selectedYear,
}) => {
  const [year, setYear] = useState<number>(selectedYear);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CapexCategory>('Industriel');
  const [budgetAmount, setBudgetAmount] = useState<string>('');
  const [engagedAmount, setEngagedAmount] = useState<string>('');
  const [realizedAmount, setRealizedAmount] = useState<string>('');
  const [status, setStatus] = useState<CapexStatus>('Planifié');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [observation, setObservation] = useState('');

  // Sub-items (Achats réels / Déboursés sous l'enveloppe budgétaire)
  const [subItems, setSubItems] = useState<CapexSubItem[]>([]);
  const [newSubDesignation, setNewSubDesignation] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newSubRealizedAmount, setNewSubRealizedAmount] = useState<string>('');
  const [newSubIsRealized, setNewSubIsRealized] = useState<boolean>(false);
  const [newSubOriginType, setNewSubOriginType] = useState<'Local' | 'Étranger'>('Local');
  const [newSubCurrency, setNewSubCurrency] = useState<'EUR' | 'USD' | 'DZD'>('EUR');
  const [newSubExchangeRate, setNewSubExchangeRate] = useState<string>('245.00');
  const [newSubBaseDevise, setNewSubBaseDevise] = useState<string>('');
  const [editingSubIdx, setEditingSubIdx] = useState<number | null>(null);

  // Foreign Import (Étranger) & Frais d'approche fields
  const [originType, setOriginType] = useState<'Local' | 'Étranger'>('Local');
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'DZD'>('EUR');
  const [exchangeRate, setExchangeRate] = useState<string>('245.00');
  const [baseCurrencyAmount, setBaseCurrencyAmount] = useState<string>('');
  const [customsDutyType, setCustomsDutyType] = useState<'percentage' | 'amount'>('percentage');
  const [customsDutyValue, setCustomsDutyValue] = useState<string>('15');
  const [freightAmount, setFreightAmount] = useState<string>('');

  const [otherApproachCosts, setOtherApproachCosts] = useState<CapexApproachCost[]>([]);
  const [newAppDesignation, setNewAppDesignation] = useState('');
  const [newAppAmount, setNewAppAmount] = useState('');

  const [isRealizedManuallyEdited, setIsRealizedManuallyEdited] = useState<boolean>(false);
  const [isMainRealizedConfirmed, setIsMainRealizedConfirmed] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (editingItem) {
      setYear(editingItem.year);
      setName(editingItem.name);
      if (editingItem.category) setCategory(editingItem.category);

      const engStr = editingItem.engaged_amount ? String(editingItem.engaged_amount) : '';
      const realStr = (editingItem.realized_amount !== undefined && editingItem.realized_amount !== null && editingItem.realized_amount > 0)
        ? String(editingItem.realized_amount)
        : '';

      setBudgetAmount(editingItem.budget_amount ? String(editingItem.budget_amount) : '');
      setEngagedAmount(engStr);
      setRealizedAmount(realStr);
      setIsRealizedManuallyEdited(Boolean(editingItem.realized_amount && editingItem.realized_amount !== editingItem.engaged_amount));
      
      const isConfirmed = editingItem.is_realized_confirmed !== undefined
        ? Boolean(editingItem.is_realized_confirmed)
        : editingItem.status === 'Réalisé';
      setIsMainRealizedConfirmed(isConfirmed);

      setStatus(editingItem.status);
      setExpectedDeliveryDate(editingItem.expected_delivery_date || '');
      setObservation(editingItem.observation || '');
      setSubItems(editingItem.sub_items ? [...editingItem.sub_items] : []);

      setOriginType(editingItem.origin_type || 'Local');
      setCurrency(editingItem.currency || 'EUR');
      setExchangeRate(editingItem.exchange_rate ? String(editingItem.exchange_rate) : '1.0');
      setBaseCurrencyAmount(editingItem.base_currency_amount ? String(editingItem.base_currency_amount) : '');
      const dutyType = (editingItem.customs_duty_type === 'fixed' || editingItem.customs_duty_type === 'amount') ? 'amount' : 'percentage';
      setCustomsDutyType(dutyType);
      setCustomsDutyValue(editingItem.customs_duty_value ? String(editingItem.customs_duty_value) : '15');
      setFreightAmount(editingItem.freight_amount ? String(editingItem.freight_amount) : '');
      setOtherApproachCosts(editingItem.other_approach_costs ? [...editingItem.other_approach_costs] : []);
    } else {
      setYear(selectedYear);
      setName('');
      setCategory('Industriel');
      setBudgetAmount('');
      setEngagedAmount('');
      setRealizedAmount('');
      setIsRealizedManuallyEdited(false);
      setIsMainRealizedConfirmed(false);
      setStatus('Planifié');
      setExpectedDeliveryDate('');
      setObservation('');
      setSubItems([]);

      setOriginType('Local');
      setCurrency('EUR');
      setExchangeRate('1.0');
      setBaseCurrencyAmount('');
      setCustomsDutyType('percentage');
      setCustomsDutyValue('15');
      setFreightAmount('');
      setOtherApproachCosts([]);
    }
    setNewSubDesignation('');
    setNewSubAmount('');
    setNewSubRealizedAmount('');
    setNewSubBaseDevise('');
    setNewSubIsRealized(false);
    setEditingSubIdx(null);
    setNewAppDesignation('');
    setNewAppAmount('');
    setErrorMsg(null);
  }, [editingItem, isOpen, selectedYear]);

  // Helper to safely parse string/formatted inputs with spaces or commas (e.g. "18 000 000")
  const parseNumber = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleaned = String(val).replace(/\s+/g, '').replace(/,/g, '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Live Frais d'approche Calculations
  const rate = parseNumber(exchangeRate) || 1;
  const baseDevise = parseNumber(baseCurrencyAmount);
  const baseDZD = (currency === 'DZD' || currency === 'DA') ? baseDevise : baseDevise * rate;

  const dutyVal = parseNumber(customsDutyValue);
  const customsDutyDZD = customsDutyType === 'percentage' ? (baseDZD * dutyVal) / 100 : dutyVal;
  const freightDZD = parseNumber(freightAmount);
  const otherFraisDZD = otherApproachCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalApproachDZD = customsDutyDZD + freightDZD + otherFraisDZD;
  const totalLandedDZD = baseDZD + totalApproachDZD;

  // Live Auto-Update of Engaged & Realized Amount when foreign investment parameters change
  useEffect(() => {
    if (originType === 'Étranger' && totalLandedDZD > 0) {
      const formatted = String(Math.round(totalLandedDZD));
      setEngagedAmount(formatted);
      if (!isRealizedManuallyEdited) {
        setRealizedAmount(formatted);
      }
    }
  }, [originType, totalLandedDZD, isRealizedManuallyEdited]);

  if (!isOpen) return null;

  const handleCurrencyChange = (newCurr: 'EUR' | 'USD' | 'DA' | 'DZD') => {
    setCurrency(newCurr);
    if (newCurr === 'DA' || newCurr === 'DZD') {
      setExchangeRate('1.0');
    } else if (newCurr === 'EUR') {
      setExchangeRate('245.00');
    } else if (newCurr === 'USD') {
      setExchangeRate('225.00');
    }
  };

  const handleStatusChange = (newStatus: CapexStatus) => {
    setStatus(newStatus);
    if (newStatus === 'Réalisé') {
      setIsMainRealizedConfirmed(true);
      if (!realizedAmount || parseNumber(realizedAmount) === 0) {
        setRealizedAmount(engagedAmount);
      }
    }
  };

  const handleSaveSubItem = () => {
    if (!newSubDesignation.trim()) {
      setErrorMsg('La désignation du sous-achat est obligatoire.');
      return;
    }

    let calculatedDZD = 0;
    const baseDev = parseNumber(newSubBaseDevise);
    const subRate = parseNumber(newSubExchangeRate) || 1;

    if (newSubOriginType === 'Étranger') {
      if (baseDev <= 0) {
        setErrorMsg('Le montant en devise du sous-achat est obligatoire.');
        return;
      }
      calculatedDZD = Math.round(baseDev * subRate);
    } else {
      calculatedDZD = parseNumber(newSubAmount);
      if (calculatedDZD < 0) {
        setErrorMsg('Le montant ne peut pas être négatif.');
        return;
      }
    }

    const subRealizedAmt = (newSubRealizedAmount && newSubRealizedAmount.trim() !== '')
      ? parseNumber(newSubRealizedAmount)
      : calculatedDZD;

    const targetSubItem: CapexSubItem = {
      id: editingSubIdx !== null && subItems[editingSubIdx]?.id ? subItems[editingSubIdx].id : Date.now(),
      designation: newSubDesignation.trim(),
      amount: calculatedDZD,
      realized_amount: subRealizedAmt,
      qty: 1,
      unit_price: calculatedDZD,
      date: new Date().toISOString().split('T')[0],
      is_realized: newSubIsRealized,
      origin_type: newSubOriginType,
      currency: newSubOriginType === 'Étranger' ? newSubCurrency : 'DA',
      exchange_rate: newSubOriginType === 'Étranger' ? subRate : 1,
      base_currency_amount: newSubOriginType === 'Étranger' ? baseDev : 0,
    };

    if (editingSubIdx !== null) {
      const updated = [...subItems];
      updated[editingSubIdx] = targetSubItem;
      setSubItems(updated);
      setEditingSubIdx(null);
    } else {
      setSubItems([...subItems, targetSubItem]);
    }

    setNewSubDesignation('');
    setNewSubAmount('');
    setNewSubRealizedAmount('');
    setNewSubBaseDevise('');
    setNewSubIsRealized(false);
    setErrorMsg(null);
  };

  const handleStartEditSubItem = (idx: number) => {
    const sub = subItems[idx];
    if (!sub) return;
    setEditingSubIdx(idx);
    setNewSubDesignation(sub.designation);
    setNewSubAmount(String(sub.amount || ''));
    setNewSubRealizedAmount(sub.realized_amount !== undefined && sub.realized_amount !== null ? String(sub.realized_amount) : String(sub.amount || ''));
    setNewSubIsRealized(Boolean(sub.is_realized));
    setNewSubOriginType(sub.origin_type || 'Local');
    setNewSubCurrency(sub.currency as any || 'EUR');
    setNewSubExchangeRate(sub.exchange_rate ? String(sub.exchange_rate) : '245.00');
    setNewSubBaseDevise(sub.base_currency_amount ? String(sub.base_currency_amount) : '');
  };

  const handleCancelEditSubItem = () => {
    setEditingSubIdx(null);
    setNewSubDesignation('');
    setNewSubAmount('');
    setNewSubRealizedAmount('');
    setNewSubBaseDevise('');
    setNewSubIsRealized(false);
  };

  const handleToggleSubRealized = (idx: number) => {
    setSubItems(subItems.map((sub, i) => {
      if (i === idx) {
        const currentVal = Boolean(sub.is_realized);
        return { ...sub, is_realized: !currentVal };
      }
      return sub;
    }));
  };

  const handleRemoveSubItem = (idx: number) => {
    if (editingSubIdx === idx) {
      handleCancelEditSubItem();
    }
    setSubItems(subItems.filter((_, i) => i !== idx));
  };

  const handleAddApproachCost = () => {
    if (!newAppDesignation.trim()) {
      setErrorMsg('La désignation du frais d\'approche est obligatoire.');
      return;
    }
    const amt = Number(newAppAmount) || 0;
    if (amt < 0) {
      setErrorMsg('Le montant ne peut pas être négatif.');
      return;
    }

    const newCost: CapexApproachCost = {
      id: Date.now(),
      designation: newAppDesignation.trim(),
      amount: amt,
    };

    setOtherApproachCosts([...otherApproachCosts, newCost]);
    setNewAppDesignation('');
    setNewAppAmount('');
    setErrorMsg(null);
  };

  const handleRemoveApproachCost = (idx: number) => {
    setOtherApproachCosts(otherApproachCosts.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Le nom de l\'équipement / investissement est obligatoire.');
      return;
    }

    // Auto-capture unadded sub-item in input fields if present and not editing
    let finalSubItems = [...subItems];
    if (newSubDesignation.trim()) {
      let calculatedDZD = 0;
      const baseDev = parseNumber(newSubBaseDevise);
      const subRate = parseNumber(newSubExchangeRate) || 1;
      if (newSubOriginType === 'Étranger') {
        calculatedDZD = Math.round(baseDev * subRate);
      } else {
        calculatedDZD = parseNumber(newSubAmount);
      }
      const subRealizedAmt = (newSubRealizedAmount && newSubRealizedAmount.trim() !== '')
        ? parseNumber(newSubRealizedAmount)
        : calculatedDZD;

      const subObj: CapexSubItem = {
        id: editingSubIdx !== null && subItems[editingSubIdx]?.id ? subItems[editingSubIdx].id : Date.now(),
        designation: newSubDesignation.trim(),
        amount: calculatedDZD,
        realized_amount: subRealizedAmt,
        qty: 1,
        unit_price: calculatedDZD,
        date: new Date().toISOString().split('T')[0],
        is_realized: newSubIsRealized,
        origin_type: newSubOriginType,
        currency: newSubOriginType === 'Étranger' ? newSubCurrency : 'DA',
        exchange_rate: newSubOriginType === 'Étranger' ? subRate : 1,
        base_currency_amount: newSubOriginType === 'Étranger' ? baseDev : 0,
      };

      if (editingSubIdx !== null) {
        finalSubItems[editingSubIdx] = subObj;
      } else {
        finalSubItems.push(subObj);
      }
      setSubItems(finalSubItems);
      setNewSubDesignation('');
      setNewSubAmount('');
      setNewSubRealizedAmount('');
      setNewSubBaseDevise('');
      setNewSubIsRealized(false);
      setEditingSubIdx(null);
    }

    // Auto-capture unadded approach cost if present
    let finalApproachCosts = [...otherApproachCosts];
    if (newAppDesignation.trim()) {
      const amt = parseNumber(newAppAmount);
      finalApproachCosts.push({
        id: Date.now(),
        designation: newAppDesignation.trim(),
        amount: amt,
      });
      setOtherApproachCosts(finalApproachCosts);
      setNewAppDesignation('');
      setNewAppAmount('');
    }

    const budget = parseNumber(budgetAmount);

    const baseEng = (originType === 'Étranger' && totalLandedDZD > 0 && parseNumber(engagedAmount) === 0)
      ? totalLandedDZD
      : parseNumber(engagedAmount);

    const mainRealizedAmount = (realizedAmount && realizedAmount.trim() !== '')
      ? parseNumber(realizedAmount)
      : baseEng;

    if (budget < 0 || baseEng < 0 || mainRealizedAmount < 0) {
      setErrorMsg('Les montants ne peuvent pas être négatifs.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      year,
      name: name.trim(),
      category,
      budget_amount: budget,
      engaged_amount: baseEng,
      realized_amount: mainRealizedAmount,
      status,
      is_realized_confirmed: isMainRealizedConfirmed,
      expected_delivery_date: expectedDeliveryDate,
      observation: observation.trim(),
      sub_items: finalSubItems,
      origin_type: originType,
      currency,
      exchange_rate: rate,
      base_currency_amount: baseDevise,
      customs_duty_type: customsDutyType,
      customs_duty_value: dutyVal,
      freight_amount: freightDZD,
      other_approach_costs: finalApproachCosts,
      total_approach_cost: totalApproachDZD,
    };

    // Calculate total realization for UI percentages
    const subConfirmedSum = finalSubItems.reduce((acc, s) => s.is_realized ? acc + (s.realized_amount || s.amount || 0) : acc, 0);
    const subEngagedSum = finalSubItems.reduce((acc, s) => acc + (s.amount || 0), 0);
    const combinedEngaged = baseEng + subEngagedSum;
    const combinedRealized = (isMainRealizedConfirmed ? mainRealizedAmount : 0) + subConfirmedSum;

    try {
      const targetId = editingItem?.id;
      const url = targetId ? `/api/capex/${targetId}` : '/api/capex';
      const method = targetId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((e) => {
        console.warn('[CapexModal fetch warning, fallback to local save]:', e);
        return null;
      });

      let finalSavedItem: CapexItem;

      if (res && res.ok) {
        const savedData = await res.json().catch(() => null);
        finalSavedItem = (savedData && savedData.id)
          ? {
              ...savedData,
              is_realized_confirmed: isMainRealizedConfirmed,
              sub_items: finalSubItems,
            }
          : {
              ...payload,
              id: targetId || Date.now(),
              engagement_pct: budget > 0 ? Number(((combinedEngaged / budget) * 100).toFixed(1)) : 0,
              realization_pct: budget > 0 ? Number(((combinedRealized / budget) * 100).toFixed(1)) : 0,
              created_at: new Date().toISOString(),
            };
      } else {
        finalSavedItem = {
          ...payload,
          id: targetId || Date.now(),
          engagement_pct: budget > 0 ? Number(((combinedEngaged / budget) * 100).toFixed(1)) : 0,
          realization_pct: budget > 0 ? Number(((combinedRealized / budget) * 100).toFixed(1)) : 0,
          created_at: new Date().toISOString(),
        };
      }

      onSuccess(finalSavedItem);
      onClose();
    } catch (err) {
      console.error('[CapexModal submit exception, saving locally]:', err);
      const fallbackItem: CapexItem = {
        ...payload,
        id: editingItem?.id || Date.now(),
        engagement_pct: budget > 0 ? Number(((combinedEngaged / budget) * 100).toFixed(1)) : 0,
        realization_pct: budget > 0 ? Number(((combinedRealized / budget) * 100).toFixed(1)) : 0,
        created_at: new Date().toISOString(),
      };
      onSuccess(fallbackItem);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl lg:max-w-4xl max-h-[calc(100vh-1.5rem)] md:max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {editingItem ? 'Modifier le Projet CAPEX' : 'Nouveau Projet CAPEX'}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Année budgétaire : <span className="font-bold text-emerald-400">{year}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. INFORMATIONS GÉNÉRALES DE L'ÉQUIPEMENT */}
          <div className="space-y-4">
            {/* Nom Équipement */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Intitulé / Nom de l'Équipement (Enveloppe Budgétaire CAPEX) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Moule Boitier d'injection, Banc Primates PT25..."
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Catégorie & Statut */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CapexCategory)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Industriel">🏭 Équipements de Production (Industriel)</option>
                  <option value="Utilités & Manutention">🚜 Utilités, Transport & Manutention</option>
                  <option value="Matériel Informatique">💻 Équipements & Systèmes Informatiques</option>
                  <option value="Mobilier">🪑 Mobilier de bureau</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Statut du Projet *</label>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as CapexStatus)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Planifié">⏳ Planifié</option>
                  <option value="Engagé">📝 Engagé</option>
                  <option value="En Douane">🛃 En Douane</option>
                  <option value="Réalisé">✅ Réalisé</option>
                  <option value="Annulé">🚫 Annulé</option>
                </select>
              </div>
            </div>

            {/* Origine de l'équipement */}
            <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-indigo-600" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Origine de l'Équipement</span>
                  <span className="text-[11px] text-slate-500">Sélectionnez le mode d'acquisition</span>
                </div>
              </div>
              <div className="flex items-center bg-white p-1 rounded-lg border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOriginType('Local')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    originType === 'Local'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏠 Local (Algérie)
                </button>
                <button
                  type="button"
                  onClick={() => setOriginType('Étranger')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    originType === 'Étranger'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌍 Étranger (Importation)
                </button>
              </div>
            </div>
          </div>

          {/* 2. FRAIS D'APPROCHE & CONVERSION DEVISE (IF ÉTRANGER) */}
          {originType === 'Étranger' && (
            <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200/80 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60">
                <div className="flex items-center gap-2 text-indigo-950 font-extrabold text-xs">
                  <Calculator size={16} className="text-indigo-600" />
                  <span>Calculateur de Frais d'approche & Conversion Devise</span>
                </div>
                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
                  Calcul en Temps Réel
                </span>
              </div>

              {/* Devise & Cours de Change */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Devise d'Importation</label>
                  <div className="flex items-center bg-white rounded-lg border border-slate-300 p-0.5">
                    {(['EUR', 'USD', 'DA'] as const).map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => handleCurrencyChange(curr)}
                        className={`flex-1 py-1 text-xs font-bold rounded transition-all ${
                          currency === curr ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {curr === 'EUR' ? 'EUR (€)' : curr === 'USD' ? 'USD ($)' : 'DA'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Cours de Change ({currency} ➔ DA)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    disabled={currency === 'DA'}
                    placeholder="Ex: 245.00"
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Prix de Base en Devise ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={baseCurrencyAmount}
                    onChange={(e) => setBaseCurrencyAmount(e.target.value)}
                    placeholder={`Prix en ${currency}`}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  {baseDevise > 0 && currency !== 'DA' && (
                    <span className="text-[10px] text-indigo-700 font-bold mt-0.5 block">
                      = {baseDZD.toLocaleString('fr-FR')} DA
                    </span>
                  )}
                </div>
              </div>

              {/* Dédouanement & Fret */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-indigo-200/60">
                {/* Dédouanement */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Dédouanement (Droits & Taxes)</label>
                    <div className="flex items-center gap-1 bg-white rounded border border-slate-300 p-0.5">
                      <button
                        type="button"
                        onClick={() => setCustomsDutyType('percentage')}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          customsDutyType === 'percentage' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomsDutyType('amount')}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          customsDutyType === 'amount' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        DA
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={customsDutyValue}
                    onChange={(e) => setCustomsDutyValue(e.target.value)}
                    placeholder={customsDutyType === 'percentage' ? 'Ex: 15 (% de la base)' : 'Ex: 500000 (DA)'}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  {customsDutyDZD > 0 && (
                    <span className="text-[10px] text-indigo-700 font-bold mt-0.5 block">
                      = {customsDutyDZD.toLocaleString('fr-FR')} DA
                    </span>
                  )}
                </div>

                {/* Fret */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Fret & Transport Int. (DA)</label>
                  <input
                    type="text"
                    value={freightAmount}
                    onChange={(e) => setFreightAmount(e.target.value)}
                    placeholder="Montant du Fret en DA"
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              {/* Autres Frais d'approche Dynamiques */}
              <div className="pt-2 border-t border-indigo-200/60 space-y-2">
                <label className="block text-[11px] font-bold text-slate-800">
                  Autres Frais (Transitnaire, Assurance, Magasinage Portuaire...)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAppDesignation}
                    onChange={(e) => setNewAppDesignation(e.target.value)}
                    placeholder="Désignation (ex: Honoraires Transitnaire, Port...)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <input
                    type="text"
                    value={newAppAmount}
                    onChange={(e) => setNewAppAmount(e.target.value)}
                    placeholder="Montant DA"
                    className="w-32 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddApproachCost}
                    className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shrink-0 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Ajouter</span>
                  </button>
                </div>

                {otherApproachCosts.length > 0 && (
                  <div className="divide-y divide-indigo-100 border border-indigo-200 rounded-lg overflow-hidden bg-white">
                    {otherApproachCosts.map((cost, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="font-semibold text-slate-800">{cost.designation}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-indigo-700">
                            {Number(cost.amount).toLocaleString('fr-FR')} DA
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveApproachCost(idx)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Récapitulatif Coût Total Rendus Usine */}
              <div className="bg-indigo-950 text-white p-3.5 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-indigo-200">
                  <span>Prix Base ({currency}) ➔ DA :</span>
                  <span className="font-mono font-bold">{baseDZD.toLocaleString('fr-FR')} DA</span>
                </div>
                <div className="flex justify-between text-indigo-200">
                  <span>Total Frais d'approche (Douane + Fret + Frais) :</span>
                  <span className="font-mono font-bold text-amber-300">+{totalApproachDZD.toLocaleString('fr-FR')} DA</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-indigo-800 font-extrabold text-xs text-emerald-400">
                  <span>Coût Total Rendus Usine (Calculé en Direct) :</span>
                  <span className="font-mono text-base">{(totalLandedDZD / 1000).toLocaleString('fr-FR')} KDA ({totalLandedDZD.toLocaleString('fr-FR')} DA)</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. SECTION 1 : MATÉRIEL / INVESTISSEMENT PRINCIPAL */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
              <Package size={16} className="text-sky-700" />
              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                1. Équipement / Investissement Principal
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Budget Alloué */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Budget Alloué (DA) *
                </label>
                <input
                  type="text"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="Ex: 18 000 000"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
                {budgetAmount && (
                  <span className="text-[10px] text-sky-700 font-bold mt-0.5 block">
                    = {(parseNumber(budgetAmount) / 1000).toLocaleString('fr-FR')} KDA
                  </span>
                )}
              </div>

              {/* Montant Engagé Principal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Montant Engagé Principal (DA) *
                </label>
                <input
                  type="text"
                  value={engagedAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEngagedAmount(val);
                    if (!isRealizedManuallyEdited) {
                      setRealizedAmount(val);
                    }
                  }}
                  placeholder="Ex: 12 849 861"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
                {originType === 'Étranger' && (
                  <span className="text-[10px] text-indigo-600 font-bold mt-0.5 block">
                    ⚡ Rendus Usine : {(totalLandedDZD / 1000).toLocaleString('fr-FR')} KDA
                  </span>
                )}
              </div>

              {/* Montant Réalisé Principal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Montant Réalisé Principal (DA)
                </label>
                <input
                  type="text"
                  value={realizedAmount}
                  onChange={(e) => {
                    setRealizedAmount(e.target.value);
                    setIsRealizedManuallyEdited(true);
                  }}
                  placeholder="Ex: 12 849 861"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/40"
                />
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                  Montant réel déboursé si réalisé
                </span>
              </div>
            </div>

            {/* Statut Réalisé Principal (Interactive Card with Toggle) */}
            <div className="pt-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirmation de Réalisation du Matériel Principal
              </label>
              <div
                onClick={() => {
                  const nextVal = !isMainRealizedConfirmed;
                  setIsMainRealizedConfirmed(nextVal);
                  if (nextVal && (!realizedAmount || parseNumber(realizedAmount) === 0)) {
                    setRealizedAmount(engagedAmount);
                  }
                }}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer select-none ${
                  isMainRealizedConfirmed
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-300 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isMainRealizedConfirmed}
                    onChange={() => {}} // Controlled by parent div
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block font-bold text-xs">
                      {isMainRealizedConfirmed
                        ? '✅ Matériel Principal Confirmé Réalisé'
                        : '⏳ Matériel Principal Non Réalisé (En attente de confirmation)'}
                    </span>
                    <span className="text-[10px] font-normal text-slate-500 block">
                      {isMainRealizedConfirmed
                        ? 'Le montant réalisé ci-dessus est comptabilisé dans le tableau et les KPI.'
                        : 'Non coché = Le montant réalisé sera compté comme 0 KDA dans le tableau.'}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-md border ${
                    isMainRealizedConfirmed
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {isMainRealizedConfirmed
                      ? `${((parseNumber(realizedAmount) || parseNumber(engagedAmount)) / 1000).toLocaleString('fr-FR')} KDA`
                      : '0 KDA'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. SECTION 2 : SOUS-ACHATS DÉTAILLÉS & DÉBOURS (SUB-ITEMS) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-emerald-700" />
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                  2. Sous-achats & Débours rattachés à cette enveloppe
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                Engagé Sous-achats : {(subItems.reduce((acc, s) => acc + (s.amount || 0), 0) / 1000).toLocaleString('fr-FR')} KDA
              </span>
            </div>

            {/* Sub-items Add / Edit Form */}
            <div className={`p-3 rounded-lg border transition-all ${editingSubIdx !== null ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  {editingSubIdx !== null ? (
                    <>
                      <Edit size={14} className="text-amber-600" />
                      <span className="text-amber-900 font-extrabold">Modification du Sous-achat #{editingSubIdx + 1}</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} className="text-emerald-600" />
                      <span>Ajouter un Sous-achat / Débours</span>
                    </>
                  )}
                </span>
                
                {/* Origin Type Switcher */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setNewSubOriginType('Local')}
                    className={`px-2.5 py-0.5 font-bold rounded-md transition-all ${
                      newSubOriginType === 'Local'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🏠 Local (DA)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSubOriginType('Étranger')}
                    className={`px-2.5 py-0.5 font-bold rounded-md transition-all ${
                      newSubOriginType === 'Étranger'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🌍 Import (Devise)
                  </button>
                </div>
              </div>

              {/* Sub-item Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    value={newSubDesignation}
                    onChange={(e) => setNewSubDesignation(e.target.value)}
                    placeholder="Désignation (ex: Sacoche, Imprimante Laser, Câblage...)"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                  />
                </div>

                {newSubOriginType === 'Local' ? (
                  <>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={newSubAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewSubAmount(val);
                          if (!newSubRealizedAmount || newSubRealizedAmount === newSubAmount) {
                            setNewSubRealizedAmount(val);
                          }
                        }}
                        placeholder="Montant Engagé DA"
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        title="Montant Engagé DA"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={newSubRealizedAmount}
                        onChange={(e) => setNewSubRealizedAmount(e.target.value)}
                        placeholder="Montant Réalisé DA"
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/50"
                        title="Montant Réalisé DA (Optionnel, si différent du montant engagé)"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-7 flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                    <input
                      type="text"
                      value={newSubBaseDevise}
                      onChange={(e) => setNewSubBaseDevise(e.target.value)}
                      placeholder="Devise"
                      className="w-20 px-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      title="Montant en devise étrangère"
                    />
                    <select
                      value={newSubCurrency}
                      onChange={(e) => {
                        const c = e.target.value as 'EUR' | 'USD' | 'DZD';
                        setNewSubCurrency(c);
                        if (c === 'EUR') setNewSubExchangeRate('245.00');
                        if (c === 'USD') setNewSubExchangeRate('225.00');
                      }}
                      className="px-2 py-1.5 text-xs font-black rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="DZD">DA</option>
                    </select>
                    <input
                      type="text"
                      value={newSubExchangeRate}
                      onChange={(e) => setNewSubExchangeRate(e.target.value)}
                      placeholder="Cours"
                      className="w-16 px-1.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 bg-white"
                      title="Cours de change en DA"
                    />
                    <input
                      type="text"
                      value={newSubRealizedAmount}
                      onChange={(e) => setNewSubRealizedAmount(e.target.value)}
                      placeholder="Réalisé DA"
                      className="w-24 px-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/50"
                      title="Montant Réalisé DA"
                    />
                  </div>
                )}
              </div>

              {/* Calculated DZD badge if Étranger */}
              {newSubOriginType === 'Étranger' && parseNumber(newSubBaseDevise) > 0 && (
                <div className="text-[11px] font-mono font-extrabold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 mt-2">
                  ⚡ Montant Calculé : {Math.round(parseNumber(newSubBaseDevise) * (parseNumber(newSubExchangeRate) || 1)).toLocaleString('fr-FR')} DA ({(Math.round(parseNumber(newSubBaseDevise) * (parseNumber(newSubExchangeRate) || 1)) / 1000).toLocaleString('fr-FR')} KDA)
                </div>
              )}

              {/* Realization Confirmation & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 mt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newSubIsRealized}
                    onChange={(e) => setNewSubIsRealized(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>
                    {newSubIsRealized
                      ? '✅ Ce sous-achat est Réalisé (Comptabilisé dans le tableau)'
                      : '⏳ Sous-achat Non Réalisé (Décoché = 0 KDA comptabilisé jusqu\'à confirmation)'}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  {editingSubIdx !== null && (
                    <button
                      type="button"
                      onClick={handleCancelEditSubItem}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <RotateCcw size={13} />
                      <span>Annuler</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveSubItem}
                    className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-1.5 ${
                      editingSubIdx !== null
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {editingSubIdx !== null ? (
                      <>
                        <Check size={14} />
                        <span>Mettre à jour</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Ajouter le Sous-achat</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* List of Sub-items */}
            {subItems.length > 0 && (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden bg-white">
                {subItems.map((sub, idx) => (
                  <div key={idx} className={`flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors ${editingSubIdx === idx ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{sub.designation}</span>
                      {sub.origin_type === 'Étranger' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          🌍 Import ({sub.base_currency_amount} {sub.currency || 'EUR'} @ {sub.exchange_rate} DA)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleSubRealized(idx)}
                        className={`px-2 py-0.5 rounded text-[10px] font-black border transition-all cursor-pointer select-none ${
                          sub.is_realized === true
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-300 shadow-2xs hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Cliquer pour basculer le statut de confirmation réalisé"
                      >
                        {sub.is_realized === true ? '✅ Confirmé Réalisé' : '⏳ Non Réalisé (0 KDA)'}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <div className="font-bold text-slate-800">
                          Engagé : {(Number(sub.amount) / 1000).toLocaleString('fr-FR')} KDA
                        </div>
                        <div className={`text-[10px] font-extrabold ${sub.is_realized ? 'text-emerald-700' : 'text-slate-400'}`}>
                          Réalisé : {sub.is_realized ? `${((Number(sub.realized_amount) || Number(sub.amount)) / 1000).toLocaleString('fr-FR')} KDA` : '0 KDA'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditSubItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Modifier ce sous-achat"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Supprimer ce sous-achat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. RÉCAPITULATIF & TOTALS FINAUX DE L'ENVELOPPE */}
          {(() => {
            const subEngaged = subItems.reduce((acc, s) => acc + (s.amount || 0), 0);
            const confirmedSubCount = subItems.filter((s) => s.is_realized === true).length;
            const subRealized = subItems.reduce((acc, s) => {
              if (s.is_realized === true) {
                const amt = (s.realized_amount !== undefined && s.realized_amount !== null && s.realized_amount > 0)
                  ? s.realized_amount
                  : (s.amount || 0);
                return acc + amt;
              }
              return acc;
            }, 0);
            const mainEngaged = parseNumber(engagedAmount);
            const mainRealized = isMainRealizedConfirmed ? (parseNumber(realizedAmount) || mainEngaged) : 0;

            const totalEngagedCalc = mainEngaged + subEngaged;
            const totalRealizedCalc = mainRealized + subRealized;
            const budgetNum = parseNumber(budgetAmount);
            const overallRealPct = budgetNum > 0 ? ((totalRealizedCalc / budgetNum) * 100).toFixed(1) : '0';

            return (
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 shadow-md border border-slate-800">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-200 pb-2 border-b border-slate-800">
                  <span className="flex items-center gap-2">
                    <Calculator size={16} className="text-emerald-400" />
                    <span className="uppercase tracking-wide">3. Synthèse Comptabilisée dans le Tableau</span>
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800">
                    Taux Réal. Global : {overallRealPct}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-1">
                    <span className="text-[11px] font-extrabold uppercase text-sky-400 block">Montant Engagé Total</span>
                    <span className="text-lg font-black text-sky-200 block">{(totalEngagedCalc / 1000).toLocaleString('fr-FR')} KDA</span>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/10">
                      <span>Principal: {(mainEngaged / 1000).toLocaleString('fr-FR')} KDA</span>
                      <span>Sous-achats: {(subEngaged / 1000).toLocaleString('fr-FR')} KDA</span>
                    </div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-1">
                    <span className="text-[11px] font-extrabold uppercase text-emerald-400 block">Montant Réalisé Total (Confirmés)</span>
                    <span className="text-lg font-black text-emerald-200 block">{(totalRealizedCalc / 1000).toLocaleString('fr-FR')} KDA</span>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/10">
                      <span>Principal: {isMainRealizedConfirmed ? `${(mainRealized / 1000).toLocaleString('fr-FR')} KDA (Validé)` : '0 KDA (Non confirmé)'}</span>
                      <span>Sous-achats ({confirmedSubCount}/{subItems.length}): {(subRealized / 1000).toLocaleString('fr-FR')} KDA</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 6. SUIVI & NOTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delivery Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date Livraison Prévisible</label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            {/* Notes / Observations */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Observations / Notes</label>
              <input
                type="text"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Remarques, Fournisseur, Port d'Alger..."
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            >
              {isSubmitting ? 'Enregistrement...' : editingItem ? 'Mettre à jour' : 'Créer l\'Investissement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
