import React, { useRef } from 'react';
import { X, Printer, Gavel, Award, ShieldCheck, FileCheck2 } from 'lucide-react';
import { AppelOffreItem } from '../types';

interface PrintAppelOffreReportProps {
  isOpen: boolean;
  onClose: () => void;
  appelOffre: AppelOffreItem | null;
}

export const PrintAppelOffreReport: React.FC<PrintAppelOffreReportProps> = ({
  isOpen,
  onClose,
  appelOffre,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !appelOffre) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (val?: number, curr = 'DZD') => {
    if (!val || isNaN(val)) return `0 ${curr}`;
    return `${val.toLocaleString('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${curr}`;
  };

  const winner = appelOffre.soumissionnaires?.find(s => s.statut_soumission === 'Attributaire Définitif' || s.statut_soumission === 'Attributaire Provisoire');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* MODAL HEADER - HIDDEN IN PRINT */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-950 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Procès-Verbal de Séance COP & Jugement des Offres</h3>
              <p className="text-xs text-slate-300">Marché N° : {appelOffre.n_ao} — Document Officiel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
            >
              <Printer size={16} />
              <span>Imprimer le Document</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PRINTABLE BODY */}
        <div ref={printRef} className="p-8 overflow-y-auto flex-1 text-slate-900 bg-white space-y-6 text-xs print:p-0 print:text-black">
          {/* HEADER SENSUS */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">SENSUS ALGERIA SPA</h1>
              <p className="text-[11px] font-bold text-slate-600">Société Mixte de Fabrication de Compteurs & Systèmes de Télérelève</p>
              <p className="text-[10px] text-slate-500">Zone Industrielle, El-Eulma, Wilaya de Sétif - Algérie</p>
              <p className="text-[10px] text-slate-500">Commission d'Ouverture des Plis & d'Évaluation des Marchés (COP)</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-purple-50 border border-purple-300 text-purple-950 rounded font-mono font-black text-xs">
                {appelOffre.n_ao}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Procédure : <strong>{appelOffre.type}</strong></p>
              <p className="text-[10px] text-slate-500">Séance COP : {appelOffre.date_ouverture_plis || appelOffre.date_depot_plis}</p>
            </div>
          </div>

          {/* PV TITLE */}
          <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <h2 className="text-sm font-black uppercase text-slate-900 tracking-wide">
              PROCÈS-VERBAL D'OUVERTURE DES PLIS & D'ÉVALUATION DES CANDIDATURES
            </h2>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">
              Objet du Marché : <u>{appelOffre.objet}</u>
            </p>
            <div className="flex justify-center gap-6 mt-1 text-[11px] text-slate-600">
              <span><strong>Direction Émettrice :</strong> {appelOffre.direction_emettrice}</span>
              <span><strong>Budget Prévisionnel :</strong> {formatMoney(appelOffre.budget_previsionnel, appelOffre.currency)}</span>
              <span><strong>Caution de Soumission :</strong> {formatMoney(appelOffre.caution_soumission, appelOffre.currency)}</span>
            </div>
          </div>

          {/* SECTION 1 : ARTICLES & LOTS DU MARCHÉ */}
          {appelOffre.articles && appelOffre.articles.length > 0 && (
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 uppercase mb-2 border-b border-slate-300 pb-1">
                1. Composition des Lots & Équipements Demandés
              </h3>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead className="bg-slate-100 font-bold text-slate-800">
                  <tr>
                    <th className="border border-slate-300 px-2 py-1.5 w-10 text-center">N°</th>
                    <th className="border border-slate-300 px-2 py-1.5 w-20 text-center">Lot</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Désignation de la Fourniture / Prestation</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center w-24">Quantité</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Spécifications Techniques</th>
                  </tr>
                </thead>
                <tbody>
                  {appelOffre.articles.map((art, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="border border-slate-300 px-2 py-1 text-center font-bold">{idx + 1}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center font-mono font-bold text-purple-900">{art.lot_number || '-'}</td>
                      <td className="border border-slate-300 px-2 py-1 font-semibold">{art.designation}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center font-mono font-bold">{art.qty} {art.unite || 'u'}</td>
                      <td className="border border-slate-300 px-2 py-1 text-[11px] text-slate-600">{art.specifications || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SECTION 2 : MEMBRES DE LA COMMISSION */}
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 uppercase mb-2 border-b border-slate-300 pb-1">
              {appelOffre.articles && appelOffre.articles.length > 0 ? '2' : '1'}. Composition de la Commission d'Ouverture des Plis (COP)
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead className="bg-slate-100 font-bold text-slate-800">
                <tr>
                  <th className="border border-slate-300 px-2 py-1.5 w-10 text-center">N°</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Nom & Prénom</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Qualité au sein de la COP</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Direction / Département</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center w-24">Présence</th>
                </tr>
              </thead>
              <tbody>
                {appelOffre.commission_cop?.membres && appelOffre.commission_cop.membres.length > 0 ? (
                  appelOffre.commission_cop.membres.map((m, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 px-2 py-1 text-center font-bold">{idx + 1}</td>
                      <td className="border border-slate-300 px-2 py-1 font-semibold">{m.nom_prenom}</td>
                      <td className="border border-slate-300 px-2 py-1 font-bold text-purple-900">{m.qualite}</td>
                      <td className="border border-slate-300 px-2 py-1 text-slate-600">{m.service_direction}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center font-bold text-emerald-800">
                        {m.presence !== false ? 'Présent(e)' : 'Absent(e)'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="border border-slate-300 px-2 py-2 text-center text-slate-400 italic">
                      Membres désignés selon la décision de constitution de la commission.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SECTION 2 : ADJUDICATION DU MARCHÉ */}
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase">
              2. Décision d'Attribution & Contractualisation
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p><strong>Attributaire Retenu :</strong> {appelOffre.fournisseur_gagnant || appelOffre.attribution?.fournisseur_gagnant || 'En cours d\'évaluation'}</p>
                <p><strong>Montant du Marché HT :</strong> {formatMoney(appelOffre.montant_attribue || appelOffre.attribution?.montant_attribue || 0, appelOffre.currency)}</p>
              </div>
              <div>
                <p><strong>N° Contrat / Marché :</strong> {appelOffre.n_marche_contrat || appelOffre.attribution?.n_marche_contrat || 'En cours d\'établissement'}</p>
                <p><strong>Statut du Dossier :</strong> {appelOffre.statut}</p>
              </div>
            </div>
            {appelOffre.observation && (
              <p className="text-[11px] text-slate-700 pt-1 border-t border-slate-200">
                <strong>Observations :</strong> {appelOffre.observation}
              </p>
            )}
          </div>

          {/* SECTION 4 : SIGNATURES COP */}
          <div className="pt-6 grid grid-cols-3 gap-8 text-center text-xs">
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold">Le Président de la Commission</p>
              <p className="text-[10px] text-slate-500 mt-1">Direction Générale Sensus</p>
              <div className="h-14"></div>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold">Le Rapporteur de la COP</p>
              <p className="text-[10px] text-slate-500 mt-1">Approvisionnements & Achats</p>
              <div className="h-14"></div>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold">Les Membres Techniques & Finances</p>
              <p className="text-[10px] text-slate-500 mt-1">Signatures conjointes</p>
              <div className="h-14"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
