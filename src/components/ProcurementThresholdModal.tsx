import React, { useState } from 'react';
import { 
  X, 
  Scale, 
  FileText, 
  Receipt, 
  Layers, 
  Gavel, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Info,
  DollarSign
} from 'lucide-react';
import { 
  PROCUREMENT_THRESHOLDS, 
  getProcurementThreshold, 
  ThresholdCategory, 
  formatProcurementAmount 
} from '../utils/procurementThresholds';

interface ProcurementThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: number;
}

export const ProcurementThresholdModal: React.FC<ProcurementThresholdModalProps> = ({
  isOpen,
  onClose,
  initialAmount = 2500000,
}) => {
  const [testAmount, setTestAmount] = useState<number>(initialAmount);

  if (!isOpen) return null;

  const currentThreshold = getProcurementThreshold(testAmount);

  const getIcon = (cat: ThresholdCategory) => {
    switch (cat) {
      case 'ACHAT_DIRECT': return <Receipt size={20} className="text-slate-700" />;
      case 'LETTRE_COMMANDE': return <FileText size={20} className="text-sky-700" />;
      case 'COMMANDE': return <Layers size={20} className="text-indigo-700" />;
      case 'MARCHE': return <Gavel size={20} className="text-purple-700" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[calc(100vh-1.5rem)] md:max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* HEADER */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Guide & Réglementation des Seuils d'Achats SENSUS SPA</span>
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-300">
                Classification réglementaire : Achat, Lettre de Commande, Commande, Marché
              </p>
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 flex-1 text-xs">
          {/* INTERACTIVE CALCULATOR / SIMULATOR BANNER */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black tracking-wider uppercase text-indigo-400 block">Simulateur de Procédure Réglementaire</span>
                <h4 className="text-sm font-bold text-white mt-0.5">Saisir le montant estimatif de votre besoin (DZD) :</h4>
              </div>
              <div className="relative min-w-[220px]">
                <input
                  type="number"
                  value={testAmount || ''}
                  onChange={(e) => setTestAmount(Number(e.target.value))}
                  placeholder="e.g. 5000000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-black text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 font-mono">DZD</span>
              </div>
            </div>

            {/* Dynamic Result Box */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
              currentThreshold.category === 'MARCHE' 
                ? 'bg-purple-950/80 border-purple-600 text-purple-100' 
                : currentThreshold.category === 'COMMANDE'
                ? 'bg-indigo-950/80 border-indigo-600 text-indigo-100'
                : currentThreshold.category === 'LETTRE_COMMANDE'
                ? 'bg-sky-950/80 border-sky-600 text-sky-100'
                : 'bg-slate-800/80 border-slate-600 text-slate-100'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md font-black text-[11px] bg-white text-slate-900">
                    {currentThreshold.rangeLabel}
                  </span>
                  <span className="font-extrabold text-sm">{currentThreshold.title}</span>
                </div>
                <p className="text-[11px] text-slate-300">{currentThreshold.description}</p>
              </div>

              {currentThreshold.isTenderRequired && (
                <div className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[11px] flex items-center gap-1.5 shrink-0">
                  <AlertTriangle size={15} />
                  <span>Procédure de Marché Requise</span>
                </div>
              )}
            </div>
          </div>

          {/* THE 4 REGULATORY THRESHOLDS CARDS */}
          <div className="space-y-3">
            <span className="text-xs font-extrabold text-slate-900 block uppercase tracking-wide">
              Tableau Officiel des 4 Tranches Budgétaires & Procédures :
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. ACHAT DIRECT */}
              <div className={`p-4 rounded-2xl border transition-all ${
                currentThreshold.category === 'ACHAT_DIRECT'
                  ? 'border-slate-800 bg-slate-50 ring-2 ring-slate-800 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-100 rounded-xl">
                      {getIcon('ACHAT_DIRECT')}
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 block">1. Achat Direct / Simple</span>
                      <span className="font-mono font-bold text-[11px] text-slate-500">0 à 200 000 DA</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-300">
                    Niveau 1
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2.5">{PROCUREMENT_THRESHOLDS.ACHAT_DIRECT.description}</p>
                <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 text-[10px] uppercase">Documents Requis :</span>
                  <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                    {PROCUREMENT_THRESHOLDS.ACHAT_DIRECT.mandatoryDocs.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 2. LETTRE DE COMMANDE */}
              <div className={`p-4 rounded-2xl border transition-all ${
                currentThreshold.category === 'LETTRE_COMMANDE'
                  ? 'border-sky-600 bg-sky-50/70 ring-2 ring-sky-600 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-sky-100 rounded-xl">
                      {getIcon('LETTRE_COMMANDE')}
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-sky-950 block">2. Lettre de Commande</span>
                      <span className="font-mono font-bold text-[11px] text-sky-700">200 000 à 1 000 000 DA</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-sky-100 text-sky-900 border border-sky-300">
                    3 Devis Requis
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2.5">{PROCUREMENT_THRESHOLDS.LETTRE_COMMANDE.description}</p>
                <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 text-[10px] uppercase">Documents Requis :</span>
                  <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                    {PROCUREMENT_THRESHOLDS.LETTRE_COMMANDE.mandatoryDocs.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 3. COMMANDE */}
              <div className={`p-4 rounded-2xl border transition-all ${
                currentThreshold.category === 'COMMANDE'
                  ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                      {getIcon('COMMANDE')}
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-indigo-950 block">3. Commande</span>
                      <span className="font-mono font-bold text-[11px] text-indigo-700">1 000 000 à 12 000 000 DA</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-100 text-indigo-950 border border-indigo-300">
                    Consultation & PV Choix
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2.5">{PROCUREMENT_THRESHOLDS.COMMANDE.description}</p>
                <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 text-[10px] uppercase">Documents Requis :</span>
                  <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                    {PROCUREMENT_THRESHOLDS.COMMANDE.mandatoryDocs.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 4. MARCHE / APPEL D'OFFRES */}
              <div className={`p-4 rounded-2xl border transition-all ${
                currentThreshold.category === 'MARCHE'
                  ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-600 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-xl">
                      {getIcon('MARCHE')}
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-purple-950 block">4. Marché / Appel d'Offres</span>
                      <span className="font-mono font-bold text-[11px] text-purple-700">12 000 000 DA et plus</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-100 text-purple-950 border border-purple-300">
                    CPS & COP Obligatoires
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2.5">{PROCUREMENT_THRESHOLDS.MARCHE.description}</p>
                <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 text-[10px] uppercase">Documents Requis :</span>
                  <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                    {PROCUREMENT_THRESHOLDS.MARCHE.mandatoryDocs.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[10px] sm:text-[11px] text-slate-500">
            Règlement intérieur des Achats & Code des Marchés
          </span>
          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Fermer le Guide
          </button>
        </div>
      </div>
    </div>
  );
};
