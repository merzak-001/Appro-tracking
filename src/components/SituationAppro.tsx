import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Calendar, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  Clock, 
  Download, 
  Plus, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Boxes, 
  ArrowRight, 
  FileSpreadsheet, 
  ShieldAlert, 
  Sliders, 
  Save, 
  X, 
  Check,
  PackageCheck,
  ShoppingBag
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ProduitFini, BomComponent, StockItem, SituationApproRow } from '../types';

interface SituationApproProps {
  onNavigateToStock?: () => void;
  onOpenNewConsultation?: () => void;
}

export const SituationAppro: React.FC<SituationApproProps> = ({ 
  onNavigateToStock, 
  onOpenNewConsultation 
}) => {
  const [produitsFinis, setProduitsFinis] = useState<ProduitFini[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | number>('');
  const [loading, setLoading] = useState(true);

  // Simulation Parameters
  const [programmeMensuel, setProgrammeMensuel] = useState<number>(10000);
  const [joursOuvres, setJoursOuvres] = useState<number>(22);
  const [targetHorizonMonths, setTargetHorizonMonths] = useState<number>(1);
  const [searchFilter, setSearchFilter] = useState('');

  // Modal for Product / BOM Management
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProduitFini | null>(null);
  const [productForm, setProductForm] = useState({
    code_produit: '',
    nom_produit: '',
    famille: 'Compteurs Gaz',
    programme_mensuel: 10000,
    jours_ouvres_mois: 22,
    composants: [] as BomComponent[],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPf, resStock] = await Promise.all([
        fetch('/api/produits-finis'),
        fetch('/api/stock')
      ]);

      if (resPf.ok && resStock.ok) {
        const pfData: ProduitFini[] = await resPf.json();
        const stockData: StockItem[] = await resStock.json();
        setProduitsFinis(pfData);
        setStockItems(stockData);

        if (pfData.length > 0 && !selectedProductId) {
          setSelectedProductId(pfData[0].id);
          setProgrammeMensuel(pfData[0].programme_mensuel || 10000);
          setJoursOuvres(pfData[0].jours_ouvres_mois || 22);
        }
      }
    } catch (err) {
      console.error('Error fetching data for situation appro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Current selected product
  const currentProduct = useMemo(() => {
    return produitsFinis.find((p) => String(p.id) === String(selectedProductId)) || produitsFinis[0];
  }, [produitsFinis, selectedProductId]);

  // When product changes, sync default monthly program
  const handleSelectProduct = (id: string | number) => {
    setSelectedProductId(id);
    const prod = produitsFinis.find((p) => String(p.id) === String(id));
    if (prod) {
      setProgrammeMensuel(prod.programme_mensuel || 10000);
      setJoursOuvres(prod.jours_ouvres_mois || 22);
    }
  };

  // Stock lookup map by code_article (case insensitive)
  const stockMap = useMemo(() => {
    const map = new Map<string, StockItem>();
    stockItems.forEach((item) => {
      map.set(item.code_article.trim().toUpperCase(), item);
    });
    return map;
  }, [stockItems]);

  // Calculate Autonomy & Runout Projection for each component
  const projectionRows: SituationApproRow[] = useMemo(() => {
    if (!currentProduct || !currentProduct.composants) return [];

    const today = new Date();
    const workingDays = joursOuvres > 0 ? joursOuvres : 22;
    const monthlyTarget = programmeMensuel >= 0 ? programmeMensuel : 0;

    return currentProduct.composants.map((comp) => {
      const code = comp.code_article.trim().toUpperCase();
      const matchedStock = stockMap.get(code);
      const stockActuel = matchedStock ? Number(matchedStock.stock_actuel) || 0 : 0;
      const ratio = comp.quantite_par_produit > 0 ? comp.quantite_par_produit : 1;

      // Calculations
      const besoinMensuelTotal = monthlyTarget * ratio;
      const besoinJournalier = workingDays > 0 ? besoinMensuelTotal / workingDays : 0;

      // Autonomy in days
      let autonomieJours = 0;
      if (besoinJournalier > 0) {
        autonomieJours = Math.floor(stockActuel / besoinJournalier);
      } else if (stockActuel > 0) {
        autonomieJours = 999;
      }

      // Projected Outage Date
      const dateRupture = new Date(today);
      if (autonomieJours < 999) {
        // Calculate date taking calendar days into account (approx ~1.4 calendar days per working day)
        const calendarDays = Math.round(autonomieJours * (30 / workingDays));
        dateRupture.setDate(dateRupture.getDate() + calendarDays);
      } else {
        dateRupture.setFullYear(dateRupture.getFullYear() + 2);
      }

      const dateRuptureStr = autonomieJours >= 999 
        ? '> 2 ans (Stock suffisant)' 
        : dateRupture.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

      // Status
      let statutCouverture: SituationApproRow['statut_couverture'] = 'COUVERT';
      if (autonomieJours <= 0) {
        statutCouverture = 'RUPTURE_IMMINENTE';
      } else if (autonomieJours < 15) {
        statutCouverture = 'RUPTURE_IMMINENTE';
      } else if (autonomieJours < 30) {
        statutCouverture = 'CRITIQUE';
      } else if (autonomieJours < 60) {
        statutCouverture = 'VIGILANCE';
      } else {
        statutCouverture = 'COUVERT';
      }

      // Net shortage / To Order
      const soldeApres1Mois = stockActuel - besoinMensuelTotal;
      const qtyToOrder1Mois = soldeApres1Mois < 0 ? Math.abs(soldeApres1Mois) : 0;
      const qtyToOrder2Mois = (stockActuel - besoinMensuelTotal * 2) < 0 ? Math.abs(stockActuel - besoinMensuelTotal * 2) : 0;
      const qtyToOrder3Mois = (stockActuel - besoinMensuelTotal * 3) < 0 ? Math.abs(stockActuel - besoinMensuelTotal * 3) : 0;

      return {
        code_article: comp.code_article,
        designation: comp.designation || matchedStock?.designation || comp.code_article,
        famille: matchedStock?.famille || 'Composants',
        unite: comp.unite || matchedStock?.unite || 'piece',
        stock_actuel: stockActuel,
        ratio_par_produit: ratio,
        besoin_mensuel_total: besoinMensuelTotal,
        besoin_journalier: Number(besoinJournalier.toFixed(1)),
        autonomie_jours: autonomieJours,
        date_rupture_estimee: dateRuptureStr,
        statut_couverture: statutCouverture,
        solde_apres_programme: soldeApres1Mois,
        quantite_a_commander_1mois: qtyToOrder1Mois,
        quantite_a_commander_2mois: qtyToOrder2Mois,
        quantite_a_commander_3mois: qtyToOrder3Mois,
      };
    });
  }, [currentProduct, stockMap, programmeMensuel, joursOuvres]);

  // Bottleneck Component (Facteur limitant / Première rupture)
  const bottleneck = useMemo(() => {
    if (projectionRows.length === 0) return null;

    let minRow = projectionRows[0];
    let minCapacite = Math.floor(minRow.stock_actuel / minRow.ratio_par_produit);

    projectionRows.forEach((row) => {
      const cap = Math.floor(row.stock_actuel / row.ratio_par_produit);
      if (cap < minCapacite) {
        minCapacite = cap;
        minRow = row;
      }
    });

    return {
      row: minRow,
      capaciteMaxProduits: minCapacite,
      autonomieJours: minRow.autonomie_jours,
      dateRupture: minRow.date_rupture_estimee,
    };
  }, [projectionRows]);

  // Summary counts
  const summary = useMemo(() => {
    let rupture = 0;
    let critique = 0;
    let vigilance = 0;
    let couvert = 0;

    projectionRows.forEach((r) => {
      if (r.statut_couverture === 'RUPTURE_IMMINENTE') rupture++;
      else if (r.statut_couverture === 'CRITIQUE') critique++;
      else if (r.statut_couverture === 'VIGILANCE') vigilance++;
      else couvert++;
    });

    return { rupture, critique, vigilance, couvert, total: projectionRows.length };
  }, [projectionRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!searchFilter.trim()) return projectionRows;
    const q = searchFilter.toLowerCase();
    return projectionRows.filter(
      (r) => r.code_article.toLowerCase().includes(q) || r.designation.toLowerCase().includes(q)
    );
  }, [projectionRows, searchFilter]);

  // Quick Preset buttons for monthly target
  const presets = [5000, 7500, 10000, 15000, 20000, 25000];

  // Open Product Modal
  const openProductModal = (prod?: ProduitFini) => {
    if (prod) {
      setEditingProduct(prod);
      setProductForm({
        code_produit: prod.code_produit,
        nom_produit: prod.nom_produit,
        famille: prod.famille || 'Compteurs',
        programme_mensuel: prod.programme_mensuel || 10000,
        jours_ouvres_mois: prod.jours_ouvres_mois || 22,
        composants: [...prod.composants],
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        code_produit: `PF-${Date.now().toString().slice(-4)}`,
        nom_produit: '',
        famille: 'Compteurs',
        programme_mensuel: 10000,
        jours_ouvres_mois: 22,
        composants: [
          { id: `c-${Date.now()}-1`, code_article: 'ART-PL-001', designation: 'Corps Supérieur', quantite_par_produit: 1, unite: 'piece' },
          { id: `c-${Date.now()}-2`, code_article: 'ART-RC-003', designation: 'Raccord Laiton 3/4"', quantite_par_produit: 2, unite: 'piece' },
          { id: `c-${Date.now()}-3`, code_article: 'ART-VS-004', designation: 'Vis Inox M5x20', quantite_par_produit: 4, unite: 'piece' },
        ],
      });
    }
    setIsProductModalOpen(true);
  };

  // Add Component Row in Product Modal
  const handleAddBomRow = () => {
    setProductForm({
      ...productForm,
      composants: [
        ...productForm.composants,
        {
          id: `c-${Date.now()}-${Math.random()}`,
          code_article: '',
          designation: '',
          quantite_par_produit: 1,
          unite: 'piece',
        },
      ],
    });
  };

  // Update Component in Product Modal
  const handleUpdateBomRow = (id: string, field: keyof BomComponent, val: any) => {
    setProductForm({
      ...productForm,
      composants: productForm.composants.map((c) => {
        if (c.id === id) {
          const updated = { ...c, [field]: val };
          // If code_article changed, auto-fill designation and unit from stock
          if (field === 'code_article') {
            const match = stockMap.get(String(val).trim().toUpperCase());
            if (match) {
              updated.designation = match.designation;
              updated.unite = match.unite;
            }
          }
          return updated;
        }
        return c;
      }),
    });
  };

  // Remove Component in Product Modal
  const handleRemoveBomRow = (id: string) => {
    if (productForm.composants.length <= 1) return;
    setProductForm({
      ...productForm,
      composants: productForm.composants.filter((c) => c.id !== id),
    });
  };

  // Save Product Form
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.nom_produit.trim() || !productForm.code_produit.trim()) return;

    const validComps = productForm.composants.filter((c) => c.code_article.trim().length > 0);
    if (validComps.length === 0) {
      alert('Veuillez ajouter au moins un composant dans la nomenclature (BOM).');
      return;
    }

    const payload: Partial<ProduitFini> = {
      code_produit: productForm.code_produit.trim().toUpperCase(),
      nom_produit: productForm.nom_produit.trim(),
      famille: productForm.famille.trim(),
      programme_mensuel: Number(productForm.programme_mensuel) || 10000,
      jours_ouvres_mois: Number(productForm.jours_ouvres_mois) || 22,
      composants: validComps,
    };

    try {
      const url = editingProduct ? `/api/produits-finis/${editingProduct.id}` : '/api/produits-finis';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
        setIsProductModalOpen(false);
      }
    } catch (err) {
      console.error('Error saving finished product:', err);
    }
  };

  // Export Situation Appro to Excel
  const handleExportApproExcel = () => {
    if (!currentProduct) return;

    const data = projectionRows.map((r) => ({
      'Code Article': r.code_article,
      'Désignation Composant': r.designation,
      'Stock Actuel': r.stock_actuel,
      'Ratio par Produit Fini': r.ratio_par_produit,
      'Besoin Mensuel Total': r.besoin_mensuel_total,
      'Besoin Journalier': r.besoin_journalier,
      'Autonomie (Jours Ouvrés)': r.autonomie_jours,
      'Date Prévisionnelle Rupture': r.date_rupture_estimee,
      'Statut Couverture': r.statut_couverture,
      'Solde fin de mois': r.solde_apres_programme,
      'Besoin Net 1 Mois': r.quantite_a_commander_1mois,
      'Besoin Net 2 Mois': r.quantite_a_commander_2mois,
      'Besoin Net 3 Mois': r.quantite_a_commander_3mois,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Situation_Appro');
    XLSX.writeFile(wb, `Situation_Appro_${currentProduct.code_produit}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getCoverageBadge = (statut: SituationApproRow['statut_couverture'], autonomieJours: number) => {
    switch (statut) {
      case 'RUPTURE_IMMINENTE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
            <AlertTriangle size={11} />
            <span>Rupture (&lt; 15j)</span>
          </span>
        );
      case 'CRITIQUE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
            <TrendingDown size={11} />
            <span>Critique ({autonomieJours}j)</span>
          </span>
        );
      case 'VIGILANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock size={11} />
            <span>Vigilance ({autonomieJours}j)</span>
          </span>
        );
      case 'COUVERT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={11} />
            <span>Couvert ({autonomieJours > 300 ? '> 1 an' : `${autonomieJours}j`})</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl border border-indigo-500/20">
            <Calculator size={24} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Situation Appro & Autonomie</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                MRP Simulation
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Calcul prévisionnel des dates de rupture et couverture selon le programme mensuel de fabrication
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToStock && (
            <button
              onClick={onNavigateToStock}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shadow-2xs"
            >
              <Boxes size={14} />
              <span>Gérer Inventaire Stock</span>
            </button>
          )}

          <button
            onClick={() => openProductModal(currentProduct)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors shadow-2xs"
          >
            <Edit3 size={14} />
            <span>Modifier Nomenclature (BOM)</span>
          </button>

          <button
            onClick={() => openProductModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors shadow-2xs"
          >
            <Plus size={14} />
            <span>Nouveau Produit</span>
          </button>

          <button
            onClick={handleExportApproExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
          >
            <Download size={14} />
            <span>Exporter Rapport</span>
          </button>
        </div>
      </div>

      {/* PRODUCT SELECTOR & PROGRAM SIMULATION BAR */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Product Tabs / Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-500 shrink-0">Produit Fini :</span>
            {produitsFinis.map((pf) => (
              <button
                key={pf.id}
                onClick={() => handleSelectProduct(pf.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                  String(selectedProductId) === String(pf.id)
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <PackageCheck size={14} />
                <span>{pf.nom_produit}</span>
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            className="p-1.5 self-end md:self-auto text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Recalculer / Rafraîchir"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Interactive Simulation Controls */}
        <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
          {/* Monthly Target Input */}
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders size={14} className="text-indigo-600" />
                <span>Programme Mensuel de Production (Unités) *</span>
              </label>
              <span className="font-mono font-black text-indigo-900 text-sm">
                {programmeMensuel.toLocaleString()} pcs / mois
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="500"
                value={programmeMensuel}
                onChange={(e) => setProgrammeMensuel(e.target.value === '' ? 0 : Number(e.target.value))}
                className="w-32 px-2.5 py-1 border border-indigo-300 rounded-lg bg-white font-mono font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              {/* Preset Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProgrammeMensuel(p)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all ${
                      programmeMensuel === p
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {(p / 1000)}k
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Working Days */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Jours Ouvrés / Mois</label>
            <input
              type="number"
              min="1"
              max="31"
              value={joursOuvres}
              onChange={(e) => setJoursOuvres(e.target.value === '' ? 22 : Number(e.target.value))}
              className="w-full px-2.5 py-1 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">Cadence journalière : ~{Math.round(programmeMensuel / (joursOuvres || 22))} prod/jour</span>
          </div>

          {/* Target Horizon for Shortage View */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Horizon Besoin Net</label>
            <select
              value={targetHorizonMonths}
              onChange={(e) => setTargetHorizonMonths(Number(e.target.value))}
              className="w-full px-2.5 py-1 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value={1}>1 Mois de fabrication</option>
              <option value={2}>2 Mois de fabrication</option>
              <option value={3}>3 Mois (Trimestre)</option>
            </select>
            <span className="text-[10px] text-slate-400">Calcul quantité à commander</span>
          </div>
        </div>
      </div>

      {/* BOTTLENECK DIAGNOSTIC BANNER */}
      {bottleneck && (
        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs ${
          bottleneck.autonomieJours <= 15
            ? 'bg-rose-50/80 border-rose-200 text-rose-950'
            : bottleneck.autonomieJours <= 30
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              bottleneck.autonomieJours <= 15
                ? 'bg-rose-500 text-white'
                : bottleneck.autonomieJours <= 30
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white'
            }`}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wide">
                  Goulot d'Étranglement (Facteur Limitant) :
                </span>
                <span className="font-extrabold text-sm underline">
                  {bottleneck.row.designation} ({bottleneck.row.code_article})
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                La chaîne de production s'arrêtera après <strong className="font-mono">{bottleneck.autonomieJours} jours ouvrés</strong> (Rupture estimée le : <strong>{bottleneck.dateRupture}</strong>).
                Capacité maximale réalisable avec le stock actuel : <strong className="font-mono">{bottleneck.capaciteMaxProduits.toLocaleString()} unités</strong> de {currentProduct?.nom_produit}.
              </p>
            </div>
          </div>

          {onOpenNewConsultation && bottleneck.row.quantite_a_commander_1mois > 0 && (
            <button
              onClick={onOpenNewConsultation}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs shrink-0 self-start md:self-auto"
            >
              <ShoppingBag size={14} className="text-amber-400" />
              <span>Créer Consultation / Commande</span>
            </button>
          )}
        </div>
      )}

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white rounded-xl border border-rose-100 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-rose-600 font-semibold block">Rupture Immédiate (&lt; 15j)</span>
            <span className="text-xl font-black text-rose-700">{summary.rupture} composant(s)</span>
          </div>
          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-orange-100 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-orange-600 font-semibold block">Alerte Critique (15-30j)</span>
            <span className="text-xl font-black text-orange-700">{summary.critique} composant(s)</span>
          </div>
          <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
            <TrendingDown size={18} />
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-amber-600 font-semibold block">Vigilance (30-60j)</span>
            <span className="text-xl font-black text-amber-700">{summary.vigilance} composant(s)</span>
          </div>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Clock size={18} />
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-600 font-semibold block">Totalement Couverts (≥ 60j)</span>
            <span className="text-xl font-black text-emerald-700">{summary.couvert} composant(s)</span>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* MRP PROJECTION TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Header Filter */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Layers size={15} className="text-indigo-600" />
            <span>Nomenclature & Couverture par Composant ({projectionRows.length} pièces requises)</span>
          </div>

          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filtrer composant..."
            className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none w-52"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Composant / Réf</th>
                <th className="py-2.5 px-3 text-center">Ratio par Produit</th>
                <th className="py-2.5 px-3 text-right">Stock Actuel</th>
                <th className="py-2.5 px-3 text-right">Besoin Mensuel</th>
                <th className="py-2.5 px-3 text-right">Besoin / Jour</th>
                <th className="py-2.5 px-3 text-center font-black text-indigo-950">Autonomie (Jours)</th>
                <th className="py-2.5 px-3 text-center">Date Rupture Estimée</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3 text-right bg-indigo-50/70 font-bold text-indigo-900">
                  Besoin Net ({targetHorizonMonths}M)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    Calcul de la situation d'approvisionnement...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Aucun composant dans la nomenclature.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const neededToOrder =
                    targetHorizonMonths === 1
                      ? row.quantite_a_commander_1mois
                      : targetHorizonMonths === 2
                      ? row.quantite_a_commander_2mois
                      : row.quantite_a_commander_3mois;

                  const isRowBottleneck = bottleneck?.row.code_article === row.code_article;

                  return (
                    <tr 
                      key={idx} 
                      className={`hover:bg-slate-50 transition-colors ${
                        isRowBottleneck ? 'bg-rose-50/40 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{row.designation}</span>
                          {isRowBottleneck && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white uppercase">
                              Goulot
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">{row.code_article}</div>
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-900 bg-indigo-50/30">
                        × {row.ratio_par_produit} {row.unite}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                        {row.stock_actuel.toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {row.besoin_mensuel_total.toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {row.besoin_journalier.toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded font-mono font-black text-xs ${
                          row.autonomie_jours < 15
                            ? 'bg-rose-100 text-rose-800'
                            : row.autonomie_jours < 30
                            ? 'bg-orange-100 text-orange-800'
                            : row.autonomie_jours < 60
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {row.autonomie_jours > 300 ? '> 300 j' : `${row.autonomie_jours} j`}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {row.date_rupture_estimee}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {getCoverageBadge(row.statut_couverture, row.autonomie_jours)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-black text-sm bg-indigo-50/50">
                        {neededToOrder > 0 ? (
                          <span className="text-rose-600">
                            + {neededToOrder.toLocaleString()} {row.unite}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-normal text-xs">
                            Couvert (Reste {row.solde_apres_programme.toLocaleString()})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE / EDIT FINISHED PRODUCT & BOM */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Layers size={18} className="text-indigo-600" />
                <span>{editingProduct ? 'Modifier Nomenclature (BOM)' : 'Nouveau Produit & Nomenclature'}</span>
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Product Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Code Produit *</label>
                  <input
                    type="text"
                    required
                    value={productForm.code_produit}
                    onChange={(e) => setProductForm({ ...productForm, code_produit: e.target.value })}
                    placeholder="Ex: PF-GAZ-G4"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Nom du Produit Fini *</label>
                  <input
                    type="text"
                    required
                    value={productForm.nom_produit}
                    onChange={(e) => setProductForm({ ...productForm, nom_produit: e.target.value })}
                    placeholder="Ex: Compteur Gaz Volumétrique G4"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Programme Mensuel par Défaut</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.programme_mensuel}
                    onChange={(e) => setProductForm({ ...productForm, programme_mensuel: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-indigo-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jours Ouvrés / Mois</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={productForm.jours_ouvres_mois}
                    onChange={(e) => setProductForm({ ...productForm, jours_ouvres_mois: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* BOM Components Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    Composants nécessaires pour fabriquer 1 unité de ce produit
                  </label>
                  <button
                    type="button"
                    onClick={handleAddBomRow}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 hover:bg-indigo-100"
                  >
                    <Plus size={12} />
                    <span>Ajouter Composant</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="py-1.5 px-2.5 w-32">Code Article *</th>
                        <th className="py-1.5 px-2.5">Désignation</th>
                        <th className="py-1.5 px-2.5 w-24 text-center">Quantité / 1 PF *</th>
                        <th className="py-1.5 px-2.5 w-20">Unité</th>
                        <th className="py-1.5 px-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productForm.composants.map((comp) => (
                        <tr key={comp.id}>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              list="stock-codes-list"
                              value={comp.code_article}
                              onChange={(e) => handleUpdateBomRow(comp.id, 'code_article', e.target.value)}
                              placeholder="Code article"
                              className="w-full px-2 py-1 border border-slate-200 rounded font-mono font-bold text-xs"
                            />
                            <datalist id="stock-codes-list">
                              {stockItems.map((s) => (
                                <option key={s.id} value={s.code_article}>
                                  {s.designation} (Stock: {s.stock_actuel})
                                </option>
                              ))}
                            </datalist>
                          </td>
                          <td className="py-1.5 px-2.5">
                            <input
                              type="text"
                              value={comp.designation}
                              onChange={(e) => handleUpdateBomRow(comp.id, 'designation', e.target.value)}
                              placeholder="Nom du composant"
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2.5">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={comp.quantite_par_produit}
                              onChange={(e) => handleUpdateBomRow(comp.id, 'quantite_par_produit', e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-center font-mono font-bold text-indigo-900 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2.5">
                            <select
                              value={comp.unite}
                              onChange={(e) => handleUpdateBomRow(comp.id, 'unite', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs"
                            >
                              <option value="piece">Pièce</option>
                              <option value="kg">Kg</option>
                              <option value="metre">Mètre</option>
                              <option value="ensemble">Kit</option>
                              <option value="lot">Lot</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBomRow(comp.id)}
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

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Enregistrer la Nomenclature</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
