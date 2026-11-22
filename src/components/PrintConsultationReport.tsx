import React, { useRef } from 'react';
import { X, Printer, Download, Award, MessageSquareQuote, CheckCircle2 } from 'lucide-react';
import { ConsultationItem } from '../types';

interface PrintConsultationReportProps {
  isOpen: boolean;
  onClose: () => void;
  consultation: ConsultationItem | null;
}

export const PrintConsultationReport: React.FC<PrintConsultationReportProps> = ({
  isOpen,
  onClose,
  consultation,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !consultation) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (val?: number, curr = 'DZD') => {
    if (!val || isNaN(val)) return `0 ${curr}`;
    return `${val.toLocaleString('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${curr}`;
  };

  // Winner & Articles
  const winnerName = consultation.fournisseur_retenu || consultation.decision_attribution?.fournisseur_retenu;
  const winnerAmount = consultation.montant_retenu || consultation.decision_attribution?.montant_retenu_ht;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* MODAL ACTION HEADER - HIDDEN IN PRINT */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Fiche de Consultation & Expression de Besoin</h3>
              <p className="text-xs text-slate-300">Réf : {consultation.ref_consultation} — Prêt pour impression / export PDF</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
            >
              <Printer size={16} />
              <span>Imprimer la Fiche</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT CONTAINER */}
        <div ref={printRef} className="p-8 overflow-y-auto flex-1 text-slate-900 bg-white space-y-6 text-xs print:p-0 print:text-black">
          {/* HEADER COMPANY */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">SENSUS ALGERIA SPA</h1>
              <p className="text-[11px] font-bold text-slate-600">Société Mixte de Fabrication de Compteurs & Systèmes de Télérelève</p>
              <p className="text-[10px] text-slate-500">Zone Industrielle, El-Eulma, Wilaya de Sétif - Algérie</p>
              <p className="text-[10px] text-slate-500">Direction des Approvisionnements & Achats</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-black text-xs">
                {consultation.ref_consultation}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Date d'émission : {consultation.date_emission}</p>
              <p className="text-[10px] text-slate-500">Date de clôture : {consultation.date_cloture || '-'}</p>
            </div>
          </div>

          {/* TITLE OF PV */}
          <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <h2 className="text-sm font-black uppercase text-slate-900 tracking-wide">
              FICHE DE CONSULTATION FOURNISSEURS (RFQ)
            </h2>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">
              Objet : <u>{consultation.objet}</u>
            </p>
            <div className="flex justify-center gap-6 mt-1 text-[11px] text-slate-600">
              <span><strong>Catégorie :</strong> {consultation.category_seuil || consultation.category || 'COMMANDE'}</span>
              <span><strong>Demandeur :</strong> {consultation.demandeur}</span>
              <span><strong>Statut :</strong> {consultation.status}</span>
            </div>
          </div>

          {/* SECTION 1 : ARTICLES DU BESOIN */}
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 uppercase mb-2">
              1. Désignation des Articles & Prestations Demandés
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead className="bg-slate-100 font-bold text-slate-800">
                <tr>
                  <th className="border border-slate-300 px-2 py-1.5 text-center w-10">N°</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Désignation de l'article / besoin</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center w-24">Quantité</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center w-24">Unité</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Spécifications techniques</th>
                </tr>
              </thead>
              <tbody>
                {consultation.articles && consultation.articles.length > 0 ? (
                  consultation.articles.map((art, idx) => (
                    <tr key={art.id || idx}>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-500">{art.position || idx + 1}</td>
                      <td className="border border-slate-300 px-2 py-1.5 font-semibold text-slate-900">{art.designation}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-bold font-mono">{art.qty}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">{art.unite || 'Pièce'}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-slate-600">{art.specifications || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="border border-slate-300 px-2 py-3 text-center text-slate-400 italic">
                      Détail spécifié dans l'objet global
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SECTION 2 : ATTRIBUTION & CHOIX */}
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase">
              2. Attribution du Besoin & Décision
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p><strong>Fournisseur Retenu :</strong> {winnerName || 'En cours d\'évaluation'}</p>
                <p><strong>Montant Retenu HT :</strong> {winnerAmount ? formatMoney(winnerAmount, consultation.currency) : '-'}</p>
              </div>
              <div>
                <p><strong>Statut de la Procédure :</strong> {consultation.status}</p>
                <p><strong>Remarques / Observations :</strong> {consultation.observation || 'Néant'}</p>
              </div>
            </div>
          </div>

          {/* SECTION 4 : SIGNATURES */}
          <div className="pt-6 grid grid-cols-3 gap-8 text-center text-xs">
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold">Le Demandeur du Besoin</p>
              <p className="text-[10px] text-slate-500 mt-1">{consultation.demandeur}</p>
              <div className="h-14"></div>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold">Le Responsable Approvisionnements</p>
              <p className="text-[10px] text-slate-500 mt-1">Sai, Merzak</p>
              <div className="h-14"></div>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold">Le Directeur Général (ou Délégué)</p>
              <p className="text-[10px] text-slate-500 mt-1">Direction Générale Sensus</p>
              <div className="h-14"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
