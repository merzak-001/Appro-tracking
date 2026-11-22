import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  FileText, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  Truck, 
  Ship, 
  ArrowRight, 
  Lock, 
  Unlock, 
  PackageCheck, 
  FileCheck, 
  Layers, 
  Calculator, 
  Plus, 
  RefreshCw,
  Info,
  Check,
  XCircle,
  ExternalLink,
  Percent
} from 'lucide-react';
import { Supplier, User } from '../types';
import { formatNumber, numberToFrenchWords } from '../utils/numberUtils';

interface ParentChildWorkflowTestProps {
  currentUser: User;
  suppliers: Supplier[];
}

// Data Interfaces for Testing Workflow
export interface MasterDossier {
  id: string;
  po_code: string; // e.g. PO-2026-GLOBAL-01
  fournisseur_name: string;
  proforma_ref: string;
  total_amount: number;
  currency: 'EUR' | 'USD' | 'GBP' | 'DA';
  incoterm: 'FOB' | 'CIF' | 'CFR' | 'EXW' | 'CIP' | 'DDP';
  domiciliation_number?: string; // e.g. DOM-BNP-2026-00412
  domiciliation_date?: string;
  status: 'BROUILLON' | 'EN_PRE_DOMICILIATION' | 'DOMICILIE_ACTIF' | 'CLOTURE';
  created_at: string;
}

export interface ChildExpedition {
  id: string;
  master_id: string;
  shipment_code: string; // e.g. S26-05E-1ERE
  invoice_number: string;
  invoice_date: string;
  invoice_amount: number; // Invoice amount in currency
  bl_awb_number: string;
  dhl_tracking_number: string;
  
  // Tab 3 Operations Info
  assurance_number?: string;
  freight_cheque_number?: string;
  freight_cheque_amount?: number;
  freight_tva_recuperable?: number; // TVA Fret à déduire
  customs_cheque_number?: string;
  customs_cheque_amount?: number;
  customs_tva_recuperable?: number; // TVA Douane à déduire
  storage_cheque_number?: string;
  storage_cheque_amount?: number;
  storage_tva_recuperable?: number; // TVA Transit à déduire
  tva_recuperable_amount?: number; // Legacy total fallback
  declaration_douane_number?: string;
  declaration_date?: string;
  exchange_rate?: number; // Taux de change (e.g. 146.50 DZD)

  // Tab 4 SAP & Closure Info
  bon_reception_number?: string;
  bon_reception_date?: string;
  appurement_ref?: string;
  swift_payment_ref?: string;
  swift_date?: string;
  is_closed: boolean;
  created_at: string;
}

export const ParentChildWorkflowTest: React.FC<ParentChildWorkflowTestProps> = ({
  currentUser,
  suppliers,
}) => {
  const [internalTab, setInternalTab] = useState<'tab1' | 'tab2' | 'tab3' | 'tab4'>('tab1');

  // Master Dossiers State (Persisted in localStorage for lab testing)
  const [masterDossiers, setMasterDossiers] = useState<MasterDossier[]>(() => {
    try {
      const saved = localStorage.getItem('lab_master_dossiers');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'M-101',
        po_code: 'PO-2026-SIMONFOND-01',
        fournisseur_name: 'SIMONFOND (Italie)',
        proforma_ref: 'PRO-SIM-2026-991',
        total_amount: 500000.00,
        currency: 'EUR',
        incoterm: 'FOB',
        domiciliation_number: 'DOM-BNP-2026-00412',
        domiciliation_date: '2026-04-10',
        status: 'DOMICILIE_ACTIF',
        created_at: '2026-04-01',
      },
      {
        id: 'M-102',
        po_code: 'PO-2026-CMA-CONTAINERS',
        fournisseur_name: 'CMA CGM LOGISTICS',
        proforma_ref: 'PRO-CMA-2026-401',
        total_amount: 250000.00,
        currency: 'USD',
        incoterm: 'CIF',
        domiciliation_number: 'DOM-BEA-2026-00890',
        domiciliation_date: '2026-05-15',
        status: 'DOMICILIE_ACTIF',
        created_at: '2026-05-02',
      }
    ];
  });

  // Child Expeditions State
  const [childExpeditions, setChildExpeditions] = useState<ChildExpedition[]>(() => {
    try {
      const saved = localStorage.getItem('lab_child_expeditions');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'E-201',
        master_id: 'M-101',
        shipment_code: 'S26-05E-1ERE',
        invoice_number: 'FAC-SIM-2026-1049',
        invoice_date: '2026-04-16',
        invoice_amount: 219985.92,
        bl_awb_number: 'BL-CMA-Alger-9910',
        dhl_tracking_number: 'DHL-381920482',
        customs_cheque_number: '2229675',
        customs_cheque_amount: 7762996.00,
        storage_cheque_number: '4069559',
        storage_cheque_amount: 358840.78,
        declaration_douane_number: '5100100002026DED026268I',
        declaration_date: '2026-05-18',
        exchange_rate: 146.50,
        bon_reception_number: 'BR-SAP-5002239738',
        bon_reception_date: '2026-06-01',
        appurement_ref: '0937 /SENSUS/DP/2026',
        swift_payment_ref: 'SWIFT-BNP-2026-008912',
        swift_date: '2026-06-10',
        is_closed: true,
        created_at: '2026-04-20',
      }
    ];
  });

  // Selected Active Master & Child for workspace
  const [selectedMasterId, setSelectedMasterId] = useState<string>('M-101');
  const [selectedChildId, setSelectedChildId] = useState<string>('E-201');

  // Persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem('lab_master_dossiers', JSON.stringify(masterDossiers));
    } catch (e) {}
  }, [masterDossiers]);

  useEffect(() => {
    try {
      localStorage.setItem('lab_child_expeditions', JSON.stringify(childExpeditions));
    } catch (e) {}
  }, [childExpeditions]);

  // Tab 1 Form State (New Master Order)
  const [newMaster, setNewMaster] = useState({
    po_code: '',
    fournisseur_name: suppliers[0]?.name || 'SIMONFOND (Italie)',
    proforma_ref: '',
    total_amount: 100000,
    currency: 'EUR' as const,
    incoterm: 'FOB' as const,
  });

  // Tab 1 Finance Domiciliation Input
  const [domiciliationInput, setDomiciliationInput] = useState('');

  // Tab 2 Form State (New Shipment)
  const [newShipment, setNewShipment] = useState({
    master_id: selectedMasterId,
    shipment_code: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    invoice_amount: 0,
    bl_awb_number: '',
    dhl_tracking_number: '',
  });

  // Keep newShipment.master_id synced with selectedMasterId
  useEffect(() => {
    setNewShipment(prev => ({ ...prev, master_id: selectedMasterId }));
  }, [selectedMasterId]);

  // Active Master Object
  const activeMaster = masterDossiers.find(m => m.id === selectedMasterId) || masterDossiers[0];

  // Calculate Reliquat Domicilié Restant for Master Order
  const getMasterReliquat = (masterId: string) => {
    const master = masterDossiers.find(m => m.id === masterId);
    if (!master) return 0;
    const totalEngaged = childExpeditions
      .filter(c => c.master_id === masterId)
      .reduce((sum, c) => sum + c.invoice_amount, 0);
    return Math.max(0, master.total_amount - totalEngaged);
  };

  const currentReliquat = activeMaster ? getMasterReliquat(activeMaster.id) : 0;

  // Active Child Shipment Object
  const activeChild = childExpeditions.find(c => c.id === selectedChildId) || childExpeditions[0];

  // TAB 1 HANDLERS
  const handleCreateMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaster.po_code.trim()) return;
    const created: MasterDossier = {
      id: `M-${Date.now()}`,
      po_code: newMaster.po_code.trim(),
      fournisseur_name: newMaster.fournisseur_name,
      proforma_ref: newMaster.proforma_ref.trim() || `PRO-${Date.now()}`,
      total_amount: Number(newMaster.total_amount) || 0,
      currency: newMaster.currency,
      incoterm: newMaster.incoterm,
      status: 'EN_PRE_DOMICILIATION',
      created_at: new Date().toISOString().split('T')[0],
    };
    setMasterDossiers([created, ...masterDossiers]);
    setSelectedMasterId(created.id);
    setNewMaster({
      po_code: '',
      fournisseur_name: suppliers[0]?.name || 'SIMONFOND (Italie)',
      proforma_ref: '',
      total_amount: 100000,
      currency: 'EUR',
      incoterm: 'FOB',
    });
  };

  const handleValidateDomiciliation = (masterId: string) => {
    if (!domiciliationInput.trim()) return;
    setMasterDossiers(prev =>
      prev.map(m =>
        m.id === masterId
          ? {
              ...m,
              domiciliation_number: domiciliationInput.trim(),
              domiciliation_date: new Date().toISOString().split('T')[0],
              status: 'DOMICILIE_ACTIF',
            }
          : m
      )
    );
    setDomiciliationInput('');
  };

  // TAB 2 HANDLERS (Create Expedition with Validation)
  const isInvoiceAmountOverLimit = newShipment.invoice_amount > currentReliquat;

  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvoiceAmountOverLimit || newShipment.invoice_amount <= 0 || !newShipment.shipment_code.trim()) {
      return;
    }
    const created: ChildExpedition = {
      id: `E-${Date.now()}`,
      master_id: newShipment.master_id,
      shipment_code: newShipment.shipment_code.trim(),
      invoice_number: newShipment.invoice_number.trim() || `FAC-${Date.now()}`,
      invoice_date: newShipment.invoice_date,
      invoice_amount: Number(newShipment.invoice_amount),
      bl_awb_number: newShipment.bl_awb_number.trim(),
      dhl_tracking_number: newShipment.dhl_tracking_number.trim(),
      is_closed: false,
      created_at: new Date().toISOString().split('T')[0],
    };
    setChildExpeditions([created, ...childExpeditions]);
    setSelectedChildId(created.id);
    setNewShipment({
      master_id: selectedMasterId,
      shipment_code: '',
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      invoice_amount: 0,
      bl_awb_number: '',
      dhl_tracking_number: '',
    });
    // Auto switch to Tab 3 for operational tracking
    setInternalTab('tab3');
  };

  // TAB 3 HANDLERS (Operations & Custom Update)
  const [tab3Form, setTab3Form] = useState({
    assurance_number: '',
    freight_cheque_number: '',
    freight_cheque_amount: 0,
    freight_tva_recuperable: 0,
    customs_cheque_number: '',
    customs_cheque_amount: 0,
    customs_tva_recuperable: 0,
    storage_cheque_number: '',
    storage_cheque_amount: 0,
    storage_tva_recuperable: 0,
    declaration_douane_number: '',
    declaration_date: new Date().toISOString().split('T')[0],
    exchange_rate: 146.50,
  });

  useEffect(() => {
    if (activeChild) {
      setTab3Form({
        assurance_number: activeChild.assurance_number || '',
        freight_cheque_number: activeChild.freight_cheque_number || '',
        freight_cheque_amount: activeChild.freight_cheque_amount || 0,
        freight_tva_recuperable: activeChild.freight_tva_recuperable || 0,
        customs_cheque_number: activeChild.customs_cheque_number || '',
        customs_cheque_amount: activeChild.customs_cheque_amount || 0,
        customs_tva_recuperable: activeChild.customs_tva_recuperable || activeChild.tva_recuperable_amount || 0,
        storage_cheque_number: activeChild.storage_cheque_number || '',
        storage_cheque_amount: activeChild.storage_cheque_amount || 0,
        storage_tva_recuperable: activeChild.storage_tva_recuperable || 0,
        declaration_douane_number: activeChild.declaration_douane_number || '',
        declaration_date: activeChild.declaration_date || new Date().toISOString().split('T')[0],
        exchange_rate: activeChild.exchange_rate || 146.50,
      });
    }
  }, [selectedChildId]);

  const handleSaveTab3 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChild) return;
    setChildExpeditions(prev =>
      prev.map(c =>
        c.id === activeChild.id
          ? {
              ...c,
              ...tab3Form,
            }
          : c
      )
    );
    alert('✅ Opérations & Douane enregistrées avec succès !');
  };

  // TAB 4 HANDLERS (SAP & Closure)
  const [tab4Form, setTab4Form] = useState({
    bon_reception_number: '',
    bon_reception_date: new Date().toISOString().split('T')[0],
    appurement_ref: '',
    swift_payment_ref: '',
    swift_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (activeChild) {
      setTab4Form({
        bon_reception_number: activeChild.bon_reception_number || '',
        bon_reception_date: activeChild.bon_reception_date || new Date().toISOString().split('T')[0],
        appurement_ref: activeChild.appurement_ref || '',
        swift_payment_ref: activeChild.swift_payment_ref || '',
        swift_date: activeChild.swift_date || new Date().toISOString().split('T')[0],
      });
    }
  }, [selectedChildId]);

  const handleCloseShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChild) return;
    
    // Update child expedition status
    const updatedChildren = childExpeditions.map(c =>
      c.id === activeChild.id
        ? {
            ...c,
            ...tab4Form,
            is_closed: true,
          }
        : c
    );
    setChildExpeditions(updatedChildren);

    // Check if master reliquat reaches 0 -> update master to CLOTURE
    const master = masterDossiers.find(m => m.id === activeChild.master_id);
    if (master) {
      const remainingReliquat = getMasterReliquat(master.id);
      if (remainingReliquat <= 0) {
        setMasterDossiers(prev =>
          prev.map(m => (m.id === master.id ? { ...m, status: 'CLOTURE' } : m))
        );
      }
    }

    alert('🎉 Expédition Clôturée & Appurement Validé ! Master Order mis à jour.');
  };

  // Calculate Frais d'Approche (HT excluding recoverable VAT for SAP entry)
  const calculatedCustomsValueDA = activeChild
    ? activeChild.invoice_amount * (activeChild.exchange_rate || 146.50)
    : 0;

  // Customs Net HT
  const customsChequeTotal = activeChild?.customs_cheque_amount || 0;
  const customsTvaRecuperable = activeChild?.customs_tva_recuperable || activeChild?.tva_recuperable_amount || 0;
  const netCustomsHT = Math.max(0, customsChequeTotal - customsTvaRecuperable);

  // Freight Net HT
  const freightChequeTotal = activeChild?.freight_cheque_amount || 0;
  const freightTvaRecuperable = activeChild?.freight_tva_recuperable || 0;
  const netFreightHT = Math.max(0, freightChequeTotal - freightTvaRecuperable);

  // Storage / Transit Net HT
  const storageChequeTotal = activeChild?.storage_cheque_amount || 0;
  const storageTvaRecuperable = activeChild?.storage_tva_recuperable || 0;
  const netStorageHT = Math.max(0, storageChequeTotal - storageTvaRecuperable);

  // Total Frais d'Approche HT (Douane + Fret + Transit/Magasinage)
  const calculatedTotalFraisApprocheDA = netCustomsHT + netFreightHT + netStorageHT;

  // SAP Ratio Percentages (Calculated against commercial invoice value in DZD)
  const freightPercentageSAP = calculatedCustomsValueDA > 0
    ? (netFreightHT / calculatedCustomsValueDA) * 100
    : 0;

  const customsPercentageSAP = calculatedCustomsValueDA > 0
    ? ((netCustomsHT + netStorageHT) / calculatedCustomsValueDA) * 100
    : 0;

  const totalFraisApprochePercentageSAP = calculatedCustomsValueDA > 0
    ? (calculatedTotalFraisApprocheDA / calculatedCustomsValueDA) * 100
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-blue-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-400/20 text-sky-300 border border-sky-400/30 font-mono">
              LAB TEST FEATURE
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Modèle Héritage Parent / Enfant (Appro & Finance)
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-3">
            <Layers className="w-7 h-7 text-sky-400" />
            <span>Workflow Importation Parent / Enfant</span>
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Séparation du dossier bancaire global (Parent PO) et des expéditions physiques récurrentes (Enfants).
            Saisie unique initiale : les expéditions héritent automatiquement du fournisseur, incoterm et reliquat bancaire.
          </p>
        </div>

        {/* Selected Master Selector pill */}
        {activeMaster && (
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/20 text-xs font-medium shrink-0 space-y-1 min-w-[240px]">
            <div className="text-slate-300 text-[11px] font-bold uppercase tracking-wider">Dossier Maître Actif</div>
            <div className="font-bold text-sky-300 text-sm font-mono">{activeMaster.po_code}</div>
            <div className="flex items-center justify-between text-slate-200">
              <span>Reliquat Domicilié :</span>
              <strong className="text-emerald-400 font-mono">
                {formatNumber(currentReliquat)} {activeMaster.currency}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Circular Lifecycle Stepper Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="font-bold text-slate-900 text-xs flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-sky-600" />
            <span>Cycle de Vie Procédural d'Importation & Domiciliation (Master ➔ Expéditions)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {activeChild ? `Expédition active: ${activeChild.shipment_code}` : 'Aucune expédition sélectionnée'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
          {/* Step 1 */}
          <button
            onClick={() => setInternalTab('tab1')}
            className={`p-3 rounded-xl border transition-all text-left relative cursor-pointer ${
              internalTab === 'tab1'
                ? 'bg-sky-50 border-sky-500 shadow-md text-sky-900 ring-2 ring-sky-500/20'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                internalTab === 'tab1' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>1</span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Phase Initiale</span>
            </div>
            <div className="font-bold text-xs">Dossier Maître & Banque</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Budget & Domiciliation locked</div>
          </button>

          {/* Step 2 */}
          <button
            onClick={() => setInternalTab('tab2')}
            className={`p-3 rounded-xl border transition-all text-left relative cursor-pointer ${
              internalTab === 'tab2'
                ? 'bg-sky-50 border-sky-500 shadow-md text-sky-900 ring-2 ring-sky-500/20'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                internalTab === 'tab2' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>2</span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Arrivage Partiel</span>
            </div>
            <div className="font-bold text-xs">Nouvel Arrivage (Enfant)</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Déduction du Reliquat Domicilié</div>
          </button>

          {/* Step 3 */}
          <button
            onClick={() => setInternalTab('tab3')}
            className={`p-3 rounded-xl border transition-all text-left relative cursor-pointer ${
              internalTab === 'tab3'
                ? 'bg-sky-50 border-sky-500 shadow-md text-sky-900 ring-2 ring-sky-500/20'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                internalTab === 'tab3' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>3</span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Transit & SAP</span>
            </div>
            <div className="font-bold text-xs">Opérations & Ratios SAP</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Chèques HT & Ratios % Fret/Douane</div>
          </button>

          {/* Step 4 */}
          <button
            onClick={() => setInternalTab('tab4')}
            className={`p-3 rounded-xl border transition-all text-left relative cursor-pointer ${
              internalTab === 'tab4'
                ? 'bg-emerald-50 border-emerald-500 shadow-md text-emerald-900 ring-2 ring-emerald-500/20'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                internalTab === 'tab4' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>4</span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-700">Clôture / Boucle</span>
            </div>
            <div className="font-bold text-xs">Réception SAP & Clôture</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Appurement Swift & Boucle 🔄</div>
          </button>
        </div>

        {/* Circular Cycle Loop Banner */}
        <div className="p-2.5 bg-sky-50/70 border border-sky-200 rounded-xl flex items-center justify-between text-xs text-sky-900">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="font-medium text-[11px]">
              <strong>Cycle Récurrent d'Importation :</strong> Une fois l'Étape 4 validée, si le Reliquat Domicilié ({formatNumber(currentReliquat)} {activeMaster?.currency}) est supérieur à 0.00, le workflow boucle automatiquement vers l'Étape 2 pour traiter le prochain arrivage. Si le reliquat est 0.00, le Dossier Maître bascule en <span className="font-bold text-emerald-700">CLÔTURÉ</span>.
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ONGLET 1 : DOSSIER MAÎTRE & BANQUE (GLOBAL ORDER) */}
      {/* ========================================================================= */}
      {internalTab === 'tab1' && (
        <div className="space-y-6">
          {/* Active Dossier Selection & Overview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 & 2: Master Order List & Creation Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Master Orders List Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-sky-600" />
                    <span>Dossiers Maîtres Contractuels (Bank Master POs)</span>
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">
                    {masterDossiers.length} Dossiers Enregistrés
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                        <th className="px-3 py-3">Code Master PO</th>
                        <th className="px-3 py-3">Fournisseur</th>
                        <th className="px-3 py-3">Montant Total</th>
                        <th className="px-3 py-3">Incoterm</th>
                        <th className="px-3 py-3">N° Domiciliation</th>
                        <th className="px-3 py-3">Reliquat Domicilié</th>
                        <th className="px-3 py-3 text-center">Sélection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {masterDossiers.map(m => {
                        const reliquat = getMasterReliquat(m.id);
                        const isSelected = m.id === selectedMasterId;
                        return (
                          <tr
                            key={m.id}
                            className={`transition-colors cursor-pointer ${
                              isSelected ? 'bg-sky-50/80 font-semibold' : 'hover:bg-slate-50'
                            }`}
                            onClick={() => setSelectedMasterId(m.id)}
                          >
                            <td className="px-3 py-3 font-mono font-bold text-sky-900">
                              {m.po_code}
                            </td>
                            <td className="px-3 py-3 text-slate-800">{m.fournisseur_name}</td>
                            <td className="px-3 py-3 font-mono font-bold text-slate-900">
                              {formatNumber(m.total_amount)} {m.currency}
                            </td>
                            <td className="px-3 py-3">
                              <span className="px-2 py-0.5 font-mono text-[10px] font-bold rounded bg-slate-100 text-slate-800 border">
                                {m.incoterm}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-mono text-slate-700">
                              {m.domiciliation_number || (
                                <span className="text-amber-600 italic">En attente banq.</span>
                              )}
                            </td>
                            <td className="px-3 py-3 font-mono font-bold text-emerald-700">
                              {formatNumber(reliquat)} {m.currency}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {isSelected ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-600 text-white">
                                  Actif
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Choisir</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Form to Create New Master Order */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <Plus className="w-4 h-4 text-sky-600" />
                  <span>1.1 Créer un Nouveau Dossier Maître (Contrat Global)</span>
                </h3>

                <form onSubmit={handleCreateMaster} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Code Commande Maître (PO Reference)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PO-2026-VALVES-GLOBAL"
                      value={newMaster.po_code}
                      onChange={e => setNewMaster({ ...newMaster, po_code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Fournisseur Étranger</label>
                    <select
                      value={newMaster.fournisseur_name}
                      onChange={e => setNewMaster({ ...newMaster, fournisseur_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                      <option value="SIMONFOND (Italie)">SIMONFOND (Italie)</option>
                      <option value="CMA CGM LOGISTICS">CMA CGM LOGISTICS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Réf Facture Proforma</label>
                    <input
                      type="text"
                      placeholder="e.g. PRO-2026-8819"
                      value={newMaster.proforma_ref}
                      onChange={e => setNewMaster({ ...newMaster, proforma_ref: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Montant Total du Contrat</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={newMaster.total_amount}
                      onChange={e => setNewMaster({ ...newMaster, total_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Devise du Contrat</label>
                    <select
                      value={newMaster.currency}
                      onChange={e => setNewMaster({ ...newMaster, currency: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none font-bold"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="DA">DA (DZD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Incoterm Officiel</label>
                    <select
                      value={newMaster.incoterm}
                      onChange={e => setNewMaster({ ...newMaster, incoterm: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none font-bold font-mono"
                    >
                      <option value="FOB">FOB (Free on Board - Fret & Assurance à la charge Appro)</option>
                      <option value="CIF">CIF (Cost, Insurance & Freight - Inclus par fournisseur)</option>
                      <option value="CFR">CFR (Cost & Freight - Fret inclus, Assurance à charge)</option>
                      <option value="EXW">EXW (Ex Works)</option>
                      <option value="CIP">CIP (Carriage & Insurance Paid)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Enregistrer Dossier Maître</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Column 3: Finance Hand-off & Domiciliation Card for Active Master */}
            <div className="space-y-6">
              {activeMaster && (
                <div className="bg-gradient-to-b from-sky-900 to-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-md border border-sky-800">
                  <div className="flex items-center justify-between border-b border-sky-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-sky-400" />
                      <span>Dossier Sélectionné</span>
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      {activeMaster.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="text-slate-400 text-[11px]">Réf Commande Maître :</div>
                      <div className="font-bold text-base font-mono text-white">{activeMaster.po_code}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <div className="text-slate-400 text-[11px]">Fournisseur :</div>
                        <div className="font-semibold text-slate-200">{activeMaster.fournisseur_name}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[11px]">Incoterm :</div>
                        <div className="font-bold text-sky-300 font-mono">{activeMaster.incoterm}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-sky-800/80 space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Budget Total Autorisé :</span>
                        <strong className="font-mono text-white">
                          {formatNumber(activeMaster.total_amount)} {activeMaster.currency}
                        </strong>
                      </div>
                      <div className="flex justify-between text-emerald-300">
                        <span>Reliquat Domicilié Restant :</span>
                        <strong className="font-mono text-emerald-400 text-sm">
                          {formatNumber(currentReliquat)} {activeMaster.currency}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Finance Hand-off Domiciliation Form */}
                  <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15 space-y-3 pt-3">
                    <div className="text-xs font-bold text-sky-200 flex items-center space-x-1.5">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>1.2 Validation Domiciliation Bancaire (Finance)</span>
                    </div>

                    {activeMaster.domiciliation_number ? (
                      <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl space-y-1 text-xs">
                        <div className="text-emerald-300 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Dossier Domicilié en Banque !</span>
                        </div>
                        <div className="font-mono font-bold text-white text-sm">
                          N° {activeMaster.domiciliation_number}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          Date Domiciliation : {activeMaster.domiciliation_date}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        <label className="block text-slate-200 font-medium">
                          N° de Domiciliation Officiel (Après accord de banque) :
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. DOM-BNP-2026-00412"
                          value={domiciliationInput}
                          onChange={e => setDomiciliationInput(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:ring-2 focus:ring-sky-400 outline-none"
                        />
                        <button
                          onClick={() => handleValidateDomiciliation(activeMaster.id)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Valider Ouverture de Dossier</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 2 : NOUVEL ARRIVAGE (NEW EXPEDITION WITH SMART AUTOMATION) */}
      {/* ========================================================================= */}
      {internalTab === 'tab2' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form to Log Partial Shipment */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Ship className="w-5 h-5 text-sky-600" />
                <span>2. Loguer un Nouvel Arrivage (Expédition Partielle)</span>
              </h2>
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-sky-100 text-sky-800 font-mono">
                Héritage Automatique du Parent
              </span>
            </div>

            <form onSubmit={handleCreateShipment} className="space-y-4 text-xs">
              {/* Step 1: Select Active Domiciliation Dropdown */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  1. Sélectionner le Dossier Maître / N° de Domiciliation Bancaire :
                </label>
                <select
                  value={selectedMasterId}
                  onChange={e => setSelectedMasterId(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-bold text-sm bg-sky-50/50 outline-none"
                >
                  {masterDossiers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.po_code} — {m.fournisseur_name} (Dom: {m.domiciliation_number || 'En attente'})
                    </option>
                  ))}
                </select>
              </div>

              {/* SMART AUTOMATION INHERITANCE BANNER */}
              {activeMaster && (
                <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 space-y-3">
                  <div className="text-xs font-bold text-sky-900 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    <span>Héritage Automatique des Paramètres du Contrat Maître</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-sky-100">
                      <span className="text-[10px] text-slate-500 block">Fournisseur (Hérité) :</span>
                      <strong className="text-slate-800">{activeMaster.fournisseur_name}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-sky-100">
                      <span className="text-[10px] text-slate-500 block">Incoterm (Hérité) :</span>
                      <strong className="text-sky-700 font-mono font-bold">{activeMaster.incoterm}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-sky-100">
                      <span className="text-[10px] text-slate-500 block">N° Domiciliation :</span>
                      <strong className="text-slate-900 font-mono">{activeMaster.domiciliation_number || 'N/A'}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
                      <span className="text-[10px] text-emerald-800 font-bold block">Reliquat Disponible :</span>
                      <strong className="text-emerald-700 font-mono text-sm font-bold">
                        {formatNumber(currentReliquat)} {activeMaster.currency}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Required Inputs Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Code / Réf Expédition (Shipment Code)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. S26-05E-2EME"
                    value={newShipment.shipment_code}
                    onChange={e => setNewShipment({ ...newShipment, shipment_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">N° Facture Commerciale</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FAC-2026-1050"
                    value={newShipment.invoice_number}
                    onChange={e => setNewShipment({ ...newShipment, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Montant Facture Commerciale ({activeMaster?.currency})</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newShipment.invoice_amount || ''}
                    onChange={e => setNewShipment({ ...newShipment, invoice_amount: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border rounded-xl focus:ring-2 font-mono outline-none font-bold text-sm ${
                      isInvoiceAmountOverLimit
                        ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-sky-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">N° Connaissement (B/L ou LTA/AWB)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BL-CMA-992014"
                    value={newShipment.bl_awb_number}
                    onChange={e => setNewShipment({ ...newShipment, bl_awb_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">N° Suivi DHL / Courrier (Documents Physiques Banque)</label>
                  <input
                    type="text"
                    placeholder="e.g. DHL-381920482"
                    value={newShipment.dhl_tracking_number}
                    onChange={e => setNewShipment({ ...newShipment, dhl_tracking_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none"
                  />
                </div>
              </div>

              {/* OVER-LIMIT SMART AUTOMATION BLOCKING WARNING */}
              {isInvoiceAmountOverLimit && (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl flex items-center space-x-3 text-rose-900 font-bold text-xs animate-pulse">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    ❌ Bloqué par le système : Le montant de la facture ({formatNumber(newShipment.invoice_amount)} {activeMaster?.currency}) dépasse le Reliquat Domicilié disponible ({formatNumber(currentReliquat)} {activeMaster?.currency}).
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isInvoiceAmountOverLimit || newShipment.invoice_amount <= 0}
                  className={`px-6 py-3 font-bold text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2 ${
                    isInvoiceAmountOverLimit || newShipment.invoice_amount <= 0
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Ship className="w-4 h-4" />
                  <span>Enregistrer l'Arrivage & Passer aux Opérations (Tab 3)</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Existing Child Expeditions List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Layers className="w-4 h-4 text-sky-600" />
              <span>Expéditions Liées au Dossier Maître ({activeMaster?.po_code})</span>
            </h3>

            <div className="space-y-3">
              {childExpeditions
                .filter(c => c.master_id === selectedMasterId)
                .map(c => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedChildId(c.id)}
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all cursor-pointer ${
                      c.id === selectedChildId
                        ? 'border-sky-500 bg-sky-50/80 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-900 font-mono">{c.shipment_code}</span>
                      {c.is_closed ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                          ✓ Clôturé
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                          En Transit / Opérations
                        </span>
                      )}
                    </div>

                    <div className="text-slate-600 font-medium">Facture : {c.invoice_number}</div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Montant :</span>
                      <strong className="text-slate-900">{formatNumber(c.invoice_amount)} {activeMaster?.currency}</strong>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 3 : OPÉRATIONS & DOUANE (OPERATIONS & DYNAMIC INCOTERM CHECKLIST) */}
      {/* ========================================================================= */}
      {internalTab === 'tab3' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Expedition Workspace */}
          <div className="lg:col-span-2 space-y-6">
            {/* Expedition Picker */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-2">
                <Truck className="w-4 h-4 text-sky-600" />
                <span>Expédition à Traiter :</span>
              </span>
              <select
                value={selectedChildId}
                onChange={e => setSelectedChildId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold font-mono border border-slate-300 rounded-xl bg-slate-50 outline-none"
              >
                {childExpeditions.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.shipment_code} (FAC: {c.invoice_number})
                  </option>
                ))}
              </select>
            </div>

            {/* DYNAMIC INCOTERM CHECKLIST BANNER */}
            {activeMaster && (
              <div className="p-4 bg-gradient-to-r from-sky-900 to-slate-900 text-white rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>Checklist Dynamique d'Arrivage (Incoterm : {activeMaster.incoterm})</span>
                  </span>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-white/10 text-white border border-white/20">
                    Adaptation Automatique
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Step A: Fret Maritime */}
                  <div className={`p-3 rounded-xl border ${
                    activeMaster.incoterm === 'CIF' || activeMaster.incoterm === 'CIP'
                      ? 'bg-white/5 border-white/10 opacity-70'
                      : 'bg-sky-800/60 border-sky-700'
                  }`}>
                    <div className="font-bold text-white mb-1">1. Fret Maritime</div>
                    {activeMaster.incoterm === 'CIF' || activeMaster.incoterm === 'CIP' ? (
                      <span className="text-[11px] text-emerald-300 italic">✓ Inclus par le fournisseur ({activeMaster.incoterm})</span>
                    ) : (
                      <span className="text-[11px] text-amber-300">⚠️ Requiert Chèque de Fret Maritime (Appro)</span>
                    )}
                  </div>

                  {/* Step B: Assurance Maritime */}
                  <div className={`p-3 rounded-xl border ${
                    activeMaster.incoterm === 'CIF' || activeMaster.incoterm === 'CIP'
                      ? 'bg-white/5 border-white/10 opacity-70'
                      : 'bg-sky-800/60 border-sky-700'
                  }`}>
                    <div className="font-bold text-white mb-1">2. Assurance Maritime</div>
                    {activeMaster.incoterm === 'CIF' || activeMaster.incoterm === 'CIP' ? (
                      <span className="text-[11px] text-emerald-300 italic">✓ Inclus dans le contrat ({activeMaster.incoterm})</span>
                    ) : (
                      <span className="text-[11px] text-amber-300">⚠️ Police d'Assurance requise</span>
                    )}
                  </div>

                  {/* Step C: Dédouanement & Port */}
                  <div className="p-3 rounded-xl border bg-sky-800/60 border-sky-700">
                    <div className="font-bold text-white mb-1">3. Dédouanement Port</div>
                    <span className="text-[11px] text-sky-200">Chèque Douane & Magasinage (OBLIGATOIRE)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Inputs Form for Finance & Transitaire */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Calculator className="w-5 h-5 text-sky-600" />
                <span>3.1 Chèques Financiers & Déclaration Douanière (Transitaire)</span>
              </h3>

              <form onSubmit={handleSaveTab3} className="space-y-4 text-xs">
                {/* Finance Chèques Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="font-bold text-slate-900 text-xs">Émissions des Chèques Financiers (Finance)</div>
                  
                  <div className="space-y-4">
                    {/* Douane Block */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                        <span>1. Chèque de Douane (Déclaration D10 / DED)</span>
                        <span className="text-[10px] text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">Obligatoire</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">N° Chèque Douane</label>
                          <input
                            type="text"
                            placeholder="e.g. 2229675"
                            value={tab3Form.customs_cheque_number}
                            onChange={e => setTab3Form({ ...tab3Form, customs_cheque_number: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none bg-slate-50/50"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">Montant Total Chèque (DA)</label>
                          <input
                            type="number"
                            placeholder="e.g. 7762996"
                            value={tab3Form.customs_cheque_amount || ''}
                            onChange={e => setTab3Form({ ...tab3Form, customs_cheque_amount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none bg-slate-50/50 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-amber-800 font-bold mb-1 flex items-center justify-between">
                            <span>- TVA Douane Récupérable</span>
                            <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded">À Déduire</span>
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 1240000"
                            value={tab3Form.customs_tva_recuperable || ''}
                            onChange={e => setTab3Form({ ...tab3Form, customs_tva_recuperable: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono outline-none bg-amber-50/30 text-amber-900 font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fret Block (if applicable or optional) */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                        <span>2. Chèque Fret Maritime / Aérien (Comptagnies de Transport)</span>
                        {activeMaster.incoterm === 'CIF' || activeMaster.incoterm === 'CIP' ? (
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">✓ Inclus en {activeMaster.incoterm}</span>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Requis ({activeMaster.incoterm})</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">N° Chèque Fret</label>
                          <input
                            type="text"
                            placeholder="e.g. 8810294"
                            value={tab3Form.freight_cheque_number}
                            onChange={e => setTab3Form({ ...tab3Form, freight_cheque_number: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none bg-slate-50/50"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">Montant Total Fret (DA)</label>
                          <input
                            type="number"
                            placeholder="e.g. 450000"
                            value={tab3Form.freight_cheque_amount || ''}
                            onChange={e => setTab3Form({ ...tab3Form, freight_cheque_amount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none bg-slate-50/50 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-amber-800 font-bold mb-1 flex items-center justify-between">
                            <span>- TVA Fret Récupérable</span>
                            <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded">À Déduire</span>
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 71850"
                            value={tab3Form.freight_tva_recuperable || ''}
                            onChange={e => setTab3Form({ ...tab3Form, freight_tva_recuperable: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono outline-none bg-amber-50/30 text-amber-900 font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Transit / Magasinage Block */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-800 text-xs">3. Chèque Magasinage / Transit Portuaire</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">N° Chèque Transit</label>
                          <input
                            type="text"
                            placeholder="e.g. 4069559"
                            value={tab3Form.storage_cheque_number}
                            onChange={e => setTab3Form({ ...tab3Form, storage_cheque_number: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none bg-slate-50/50"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">Montant Total Transit (DA)</label>
                          <input
                            type="number"
                            placeholder="e.g. 358840"
                            value={tab3Form.storage_cheque_amount || ''}
                            onChange={e => setTab3Form({ ...tab3Form, storage_cheque_amount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none bg-slate-50/50 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-amber-800 font-bold mb-1 flex items-center justify-between">
                            <span>- TVA Transit Récupérable</span>
                            <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded">À Déduire</span>
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 57280"
                            value={tab3Form.storage_tva_recuperable || ''}
                            onChange={e => setTab3Form({ ...tab3Form, storage_tva_recuperable: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono outline-none bg-amber-50/30 text-amber-900 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transitaire Déclaration & Taux de Change */}
                <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-200 space-y-3">
                  <div className="font-bold text-sky-900 text-xs">Déclaration Douanière & Taux de Change (Transitaire)</div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">N° Déclaration (D10 / DED)</label>
                      <input
                        type="text"
                        placeholder="e.g. 5100100002026DED026268I"
                        value={tab3Form.declaration_douane_number}
                        onChange={e => setTab3Form({ ...tab3Form, declaration_douane_number: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Date Déclaration</label>
                      <input
                        type="date"
                        value={tab3Form.declaration_date}
                        onChange={e => setTab3Form({ ...tab3Form, declaration_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Taux de Change Officiel (DZD)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 146.50"
                        value={tab3Form.exchange_rate}
                        onChange={e => setTab3Form({ ...tab3Form, exchange_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono font-bold text-sky-900 outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Enregistrer les Données Opérationnelles
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Live Costing Summary Box */}
          <div className="space-y-6">
            {activeChild && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Calcul Automatique de Valeur (DZD)</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Facture Commerciale :</span>
                    <strong className="font-mono text-slate-900">
                      {formatNumber(activeChild.invoice_amount)} {activeMaster?.currency}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Taux de Change (Douane) :</span>
                    <strong className="font-mono text-sky-800 font-bold">
                      1 {activeMaster?.currency} = {(activeChild.exchange_rate || 146.50).toFixed(2)} DZD
                    </strong>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Valeur en Douane (DA) :</span>
                    <strong className="font-mono text-slate-900 text-sm font-bold">
                      {formatNumber(calculatedCustomsValueDA)} DA
                    </strong>
                  </div>

                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-slate-700 font-semibold">
                      <span>1. Droits Douane HT (Net) :</span>
                      <span className="font-mono font-bold text-slate-900">{formatNumber(netCustomsHT)} DA</span>
                    </div>
                    {customsTvaRecuperable > 0 && (
                      <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        (Chèque Douane: {formatNumber(customsChequeTotal)} - TVA Récup: -{formatNumber(customsTvaRecuperable)})
                      </div>
                    )}

                    <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-200/80 pt-1.5">
                      <span>2. Fret Maritime HT (Net) :</span>
                      <span className="font-mono font-bold text-slate-900">{formatNumber(netFreightHT)} DA</span>
                    </div>

                    <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-200/80 pt-1.5">
                      <span>3. Transit / Magasinage HT :</span>
                      <span className="font-mono font-bold text-slate-900">{formatNumber(netStorageHT)} DA</span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <div className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Total Frais d'Approche HT (DA)</span>
                      <span className="text-[10px] text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 font-semibold">Hors TVA</span>
                    </div>
                    <div className="font-mono text-lg font-black text-emerald-900">
                      {formatNumber(calculatedTotalFraisApprocheDA)} DA
                    </div>
                  </div>

                  {/* SAP Percentages Ratio Box */}
                  <div className="bg-indigo-950 text-white p-4 rounded-xl space-y-2 border border-indigo-800 shadow-md">
                    <div className="text-xs font-bold text-indigo-300 flex items-center justify-between border-b border-indigo-800/80 pb-2">
                      <span className="flex items-center space-x-1.5">
                        <Percent className="w-4 h-4 text-indigo-400" />
                        <span>Pourcentages d'Approche pour SAP</span>
                      </span>
                      <span className="text-[10px] bg-indigo-800/60 text-indigo-200 px-2 py-0.5 rounded font-mono">Pour Saisie SAP</span>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between items-center text-slate-300">
                        <span>% Fret (SAP) :</span>
                        <strong className="text-emerald-400 font-black text-sm">{freightPercentageSAP.toFixed(2)} %</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span>% Douane & Transit (SAP) :</span>
                        <strong className="text-sky-300 font-black text-sm">{customsPercentageSAP.toFixed(2)} %</strong>
                      </div>
                      <div className="flex justify-between items-center text-white border-t border-indigo-800/80 pt-1.5">
                        <span className="font-sans font-bold text-indigo-200">% TOTAL Frais d'Approche :</span>
                        <strong className="text-amber-300 font-black text-base">{totalFraisApprochePercentageSAP.toFixed(2)} %</strong>
                      </div>
                    </div>

                    <div className="text-[10px] text-indigo-300/80 italic pt-1 border-t border-indigo-800/40">
                      💡 Saisissez ces ratios % dans le Bon de Réception SAP (MIGO) pour que SAP calcule automatiquement la ventilation du coût d'acquisition.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 4 : RÉCEPTION SAP & CLÔTURE (ACCOUNTING & SYSTEM CLOSURE) */}
      {/* ========================================================================= */}
      {internalTab === 'tab4' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <span>4. Réception SAP, Appurement & Clôture Définitive</span>
              </h2>
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                Finalisation Comptable & Clôture
              </span>
            </div>

            <form onSubmit={handleCloseShipment} className="space-y-4 text-xs">
              {/* Magasinier Section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>1. Vérification Magasinier (Bon de Réception SAP)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">N° Bon de Réception SAP</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BR-SAP-5002239738"
                      value={tab4Form.bon_reception_number}
                      onChange={e => setTab4Form({ ...tab4Form, bon_reception_number: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Date Réception Magasin</label>
                    <input
                      type="date"
                      value={tab4Form.bon_reception_date}
                      onChange={e => setTab4Form({ ...tab4Form, bon_reception_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Appro & Finance Section */}
              <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-200 space-y-3">
                <div className="font-bold text-sky-900 text-xs flex items-center space-x-1.5">
                  <FileCheck className="w-4 h-4 text-sky-600" />
                  <span>2. Appurement Importation & Règlement Swift Final</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Réf Appurement Importation (Appro)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 0937 /SENSUS/DP/2026"
                      value={tab4Form.appurement_ref}
                      onChange={e => setTab4Form({ ...tab4Form, appurement_ref: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">N° Avis de Paiement / Swift (Finance)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SWIFT-BNP-2026-008912"
                      value={tab4Form.swift_payment_ref}
                      onChange={e => setTab4Form({ ...tab4Form, swift_payment_ref: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Date Swift</label>
                    <input
                      type="date"
                      value={tab4Form.swift_date}
                      onChange={e => setTab4Form({ ...tab4Form, swift_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Valider l'Appurement & Clôturer le Dossier</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Final Summary & System Update Status */}
          <div className="space-y-6">
            {activeChild && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Synthèse Frais d'Approche HT (SAP)</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Valeur Marchandise (DA) :</span>
                    <strong className="font-mono text-slate-900 font-bold">
                      {formatNumber(calculatedCustomsValueDA)} DA
                    </strong>
                  </div>

                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-slate-700 font-semibold">
                      <span>1. Droits Douane HT (Net) :</span>
                      <span className="font-mono font-bold text-slate-900">{formatNumber(netCustomsHT)} DA</span>
                    </div>

                    <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-200/80 pt-1.5">
                      <span>2. Fret Maritime HT (Net) :</span>
                      <span className="font-mono font-bold text-slate-900">{formatNumber(netFreightHT)} DA</span>
                    </div>

                    <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-200/80 pt-1.5">
                      <span>3. Transit / Magasinage HT :</span>
                      <span className="font-mono font-bold text-slate-900">{formatNumber(netStorageHT)} DA</span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <div className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Total Frais d'Approche HT (DA)</span>
                      <span className="text-[10px] text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 font-semibold">Hors TVA</span>
                    </div>
                    <div className="font-mono text-lg font-black text-emerald-900">
                      {formatNumber(calculatedTotalFraisApprocheDA)} DA
                    </div>
                  </div>

                  {/* SAP Percentages Box */}
                  <div className="bg-indigo-950 text-white p-4 rounded-xl space-y-2 border border-indigo-800 shadow-md">
                    <div className="text-xs font-bold text-indigo-300 flex items-center justify-between border-b border-indigo-800/80 pb-2">
                      <span className="flex items-center space-x-1.5">
                        <Percent className="w-4 h-4 text-indigo-400" />
                        <span>Ratios pour Saisie SAP (Bon Réception)</span>
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between items-center text-slate-300">
                        <span>% Fret (SAP) :</span>
                        <strong className="text-emerald-400 font-black text-sm">{freightPercentageSAP.toFixed(2)} %</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span>% Douane & Transit (SAP) :</span>
                        <strong className="text-sky-300 font-black text-sm">{customsPercentageSAP.toFixed(2)} %</strong>
                      </div>
                      <div className="flex justify-between items-center text-white border-t border-indigo-800/80 pt-1.5">
                        <span className="font-sans font-bold text-indigo-200">% TOTAL Frais d'Approche :</span>
                        <strong className="text-amber-300 font-black text-base">{totalFraisApprochePercentageSAP.toFixed(2)} %</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-md">
              <h3 className="font-bold text-sky-300 text-sm border-b border-slate-800 pb-3 flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-sky-400" />
                <span>Mise à Jour Automatique du Système</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="text-slate-400">Dossier Maître :</div>
                  <div className="font-mono font-bold text-white text-sm">{activeMaster?.po_code}</div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="text-slate-400">Statut Reliquat Domicilié :</div>
                  <div className="font-mono font-bold text-emerald-400 text-sm">
                    {formatNumber(currentReliquat)} {activeMaster?.currency}
                  </div>
                </div>

                {currentReliquat <= 0 ? (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-300 font-bold space-y-1">
                    <div>🎉 Budget Totalement Apuré !</div>
                    <div className="text-[11px] font-normal text-slate-300">
                      Le statut du dossier maître bascule automatiquement sur :
                    </div>
                    <div className="px-2.5 py-1 bg-emerald-600 text-white text-center rounded-lg font-black text-xs font-mono uppercase tracking-wider">
                      Dossier Totalement Clôturé
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-400/20 rounded-xl text-amber-300 space-y-1">
                    <div className="font-bold">Reliquat Encore Disponible :</div>
                    <div className="text-[11px] text-slate-300">
                      Ce dossier maître reste actif pour de futurs arrivages partiels jusqu'à l'apurement complet.
                    </div>
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
