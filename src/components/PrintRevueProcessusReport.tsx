import React, { useRef, useState } from 'react';
import { X, Printer, Download, FileText, CheckCircle2, ShieldCheck, Award, Building2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { SensusLogo } from './SensusLogo';

export interface ParticipantItem {
  role: string;
  nom: string;
  present: boolean;
}

export interface IndicatorItem {
  indicateur: string;
  mesure: string;
  cible: string;
  ecart: string;
  status: 'conforme' | 'attention';
  analyse: string;
}

export interface SupplierEvalItem {
  fournisseur: string;
  reference: string;
  noteTechQualite: number; // /30
  noteDelais: number;      // /15
  noteServicePrix: number; // /15
  noteAbsenceNC: number;   // /10
  noteServiceClient: number;// /10
  noteLoisReglement: number;// /10
  noteReponseTel: number;   // /5
  noteDocTech: number;      // /5
  total: number;
  classe: string;
  appreciation: string;
}

interface PrintRevueProcessusReportProps {
  isOpen: boolean;
  onClose: () => void;
  periodeTitre?: string;
  participants: ParticipantItem[];
  indicators: IndicatorItem[];
  supplierEvaluations: SupplierEvalItem[];
  evaluationNote?: number;
}

export const PrintRevueProcessusReport: React.FC<PrintRevueProcessusReportProps> = ({
  isOpen,
  onClose,
  periodeTitre = 'Juin 2026',
  participants,
  indicators,
  supplierEvaluations,
  evaluationNote = 3,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    if (!printRef.current) return;
    setIsExportingPdf(true);

    const element = printRef.current;
    const opt = {
      margin: [8, 8, 8, 8] as [number, number, number, number],
      filename: `Revue_de_processus_appros_${periodeTitre.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => setIsExportingPdf(false))
      .catch((err: any) => {
        console.error('PDF generation error:', err);
        setIsExportingPdf(false);
      });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        
        {/* Modal Toolbar (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-900 text-white">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Fiche Officielle : Revue de Processus Approvisionnements ({periodeTitre})
              </h2>
              <p className="text-xs text-slate-500">Conforme à la norme ISO / SMI • Grille d'Évaluation E-PCS-O1-SMS-05</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Download size={15} />
              <span>{isExportingPdf ? 'Génération PDF...' : 'Télécharger PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-900 text-white hover:bg-indigo-800 transition-colors shadow-xs cursor-pointer"
            >
              <Printer size={15} />
              <span>Imprimer le Document</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="overflow-y-auto p-6 sm:p-10 bg-slate-100/50 print:bg-white print:p-0 print:overflow-visible">
          <div
            ref={printRef}
            className="bg-white p-8 sm:p-10 rounded-xl shadow-xs border border-slate-200 print:border-none print:shadow-none print:p-0 max-w-4xl mx-auto space-y-6 text-slate-800 font-sans"
          >
            
            {/* Header Document */}
            <div className="border-b-2 border-slate-800 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <SensusLogo height={42} />
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">SENSUS SPA</h1>
                    <p className="text-[11px] font-semibold text-slate-600">Système de Management Intégré (SMI)</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-black rounded-lg">
                    Réf. E-PCS-O1-SMS-05
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">Date d'évaluation : {periodeTitre}</p>
                </div>
              </div>

              <div className="text-center mt-5 pt-3 border-t border-slate-200">
                <h2 className="text-xl font-black text-slate-950 uppercase tracking-wide">
                  Revue de Processus Approvisionnements
                </h2>
                <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider mt-0.5">
                  Session : {periodeTitre}
                </p>
              </div>
            </div>

            {/* Section 1: Participants Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 p-2 rounded border border-slate-300">
                1. Participants & Commission de Revue
              </h3>
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-200/80 text-slate-800 font-bold">
                    <th className="border border-slate-300 py-2 px-3">Fonction / Rôle</th>
                    <th className="border border-slate-300 py-2 px-3">Nom & Prénom</th>
                    <th className="border border-slate-300 py-2 px-2 text-center w-12">P</th>
                    <th className="border border-slate-300 py-2 px-2 text-center w-12">A</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="border border-slate-300 py-1.5 px-3 font-semibold text-slate-700">{p.role}</td>
                      <td className="border border-slate-300 py-1.5 px-3 font-bold text-slate-900">{p.nom}</td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-bold text-emerald-700">
                        {p.present ? 'X' : ''}
                      </td>
                      <td className="border border-slate-300 py-1.5 px-2 text-center font-bold text-rose-700">
                        {!p.present ? 'X' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-slate-500 italic">P : Présent ; A : Absent</p>
            </div>

            {/* Section 2: Presentation of Process Objectives */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 p-2 rounded border border-slate-300">
                2. Présentation des Objectifs du Processus
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pl-2">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-700">•</span>
                  <span>Assurer la disponibilité des stocks ;</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-700">•</span>
                  <span>Réduction des délais de passation des marchés, Commandes, lettres de commandes et achats ;</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-700">•</span>
                  <span>Augmentation du taux de conformité des livraisons fournisseurs ;</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-700">•</span>
                  <span>Coût d’investissement par rapport au budget ;</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-700">•</span>
                  <span>Optimisation des coûts d’approvisionnement ;</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-700">•</span>
                  <span>Taux de traitement produit non conforme dans les délais ;</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-700">•</span>
                  <span>Assurer la couverture des besoins ;</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-700">•</span>
                  <span>Suivre la fiabilité d’inventaire.</span>
                </div>
              </div>
            </div>

            {/* Section 3: Previous Actions Follow-up */}
            <div className="text-xs">
              <span className="font-bold text-slate-900">Suivi des actions décidées lors des revues précédentes :</span>{' '}
              <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">RAS</span>
            </div>

            {/* Section 4: Table of Process Results & Indicators */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 p-2 rounded border border-slate-300">
                3. Examen des Résultats du Processus (Tableau des Indicateurs)
              </h3>
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-200/80 text-slate-800 font-bold">
                    <th className="border border-slate-300 py-2 px-3">Indicateur</th>
                    <th className="border border-slate-300 py-2 px-2 text-center w-28">Résultat Mesuré</th>
                    <th className="border border-slate-300 py-2 px-2 text-center w-24">Cible</th>
                    <th className="border border-slate-300 py-2 px-2 text-center w-20">Écart</th>
                    <th className="border border-slate-300 py-2 px-3">Analyse / Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {indicators.map((ind, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="border border-slate-300 py-2 px-3 font-semibold text-slate-800">{ind.indicateur}</td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold text-slate-900">{ind.mesure}</td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-mono font-medium text-slate-700">{ind.cible}</td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-bold">
                        <span className={ind.status === 'conforme' ? 'text-emerald-700' : 'text-rose-700'}>
                          {ind.ecart}
                        </span>
                      </td>
                      <td className="border border-slate-300 py-2 px-3 text-[11px] text-slate-700 leading-snug">{ind.analyse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 5: Process Evolutions & Characteristics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">Examen des évolutions du processus et de son environnement :</span>
                <span className="text-slate-600 font-medium">RAS</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">Examen des caractéristiques du processus :</span>
                <span className="text-slate-600 font-medium">RAS</span>
              </div>
            </div>

            {/* Section 6: Evaluation du Processus */}
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="font-black text-indigo-950 block">Évaluation du Processus (Enregistrement sur grille d'évaluation)</span>
                <span className="text-[11px] text-indigo-700">Selon grille officielle E-PCS-O1-SMS-05</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Moyenne</span>
                <div className="text-lg font-black text-indigo-900 font-mono">{evaluationNote} / 3</div>
              </div>
            </div>

            {/* Section 7: External Suppliers Evaluation Grid (g/ evaluation des prestataires externes) */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 p-2 rounded border border-slate-300">
                4. Évaluation des Prestataires Externes (Achats)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 font-bold text-[10px]">
                      <th className="border border-slate-300 py-1.5 px-2">Fournisseur Clé</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center">Réf.</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center">Qualité (/30)</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center">Délais (/15)</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center">Prix (/15)</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center">Absence NC (/10)</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center">Service (/10)</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center">Lois (/10)</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center">Tél (/5)</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center">Doc (/5)</th>
                      <th className="border border-slate-300 py-1.5 px-1.5 text-center font-black">TOTAL /100</th>
                      <th className="border border-slate-300 py-1.5 px-1.5 text-center font-black">Classe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierEvaluations.map((ev, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="border border-slate-300 py-1.5 px-2 font-bold text-slate-900">{ev.fournisseur}</td>
                        <td className="border border-slate-300 py-1.5 px-1 text-center font-mono text-[10px]">{ev.reference}</td>
                        <td className="border border-slate-300 py-1.5 px-1 text-center font-mono">{ev.noteTechQualite}</td>
                        <td className="border border-slate-300 py-1.5 px-1 text-center font-mono">{ev.noteDelais}</td>
                        <td className="border border-slate-300 py-1.5 px-1 text-center font-mono">{ev.noteServicePrix}</td>
                        <td className="border border-slate-300 py-1.5 px-1 text-center font-mono">{ev.noteAbsenceNC}</td>
                        <td className="border border-slate-300 py-1.5 px-1 text-center font-mono">{ev.noteServiceClient}</td>
                        <td className="border border-slate-300 py-1.5 px-1 text-center font-mono">{ev.noteLoisReglement}</td>
                        <td className="border border-slate-300 py-1.5 px-1 text-center font-mono">{ev.noteReponseTel}</td>
                        <td className="border border-slate-300 py-1.5 px-1 text-center font-mono">{ev.noteDocTech}</td>
                        <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono font-black text-indigo-900 bg-indigo-50/40">
                          {ev.total}/100
                        </td>
                        <td className="border border-slate-300 py-1.5 px-1.5 text-center font-black">
                          <span className={ev.classe === 'A' ? 'text-emerald-700' : 'text-sky-700'}>
                            {ev.classe}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cotation Scale Legend */}
              <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600 flex flex-wrap justify-between gap-2">
                <span><strong>A:</strong> Excellent (81%-100%)</span>
                <span><strong>B:</strong> Satisfaisant (61%-80%)</span>
                <span><strong>C:</strong> Acceptable (41%-60%)</span>
                <span><strong>D:</strong> Insuffisant (21%-40%)</span>
                <span><strong>E:</strong> Inacceptable (0%-20%)</span>
              </div>
            </div>

            {/* Section 8: Improvement Proposals & Signatures */}
            <div className="space-y-4 pt-2">
              <div className="text-xs">
                <span className="font-bold text-slate-900">Propositions d'amélioration et besoins en ressources :</span>{' '}
                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">RAS</span>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300">
                <div className="text-center space-y-12">
                  <p className="text-xs font-bold uppercase text-slate-700">Le Pilote du Processus Approvisionnements</p>
                  <div className="text-xs font-bold text-slate-900">Mr BRAHIMI</div>
                </div>

                <div className="text-center space-y-12">
                  <p className="text-xs font-bold uppercase text-slate-700">Le Directeur de Production / SMI</p>
                  <div className="text-xs font-bold text-slate-900">Mr FERDJALLAH / Mr SAI</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
