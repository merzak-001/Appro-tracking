import React from 'react';
import { FinancialDocument } from '../types';
import { SensusLogo } from './SensusLogo';
import { formatNumber, numberToFrenchWords } from '../utils/numberUtils';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { Printer, X, CheckCircle } from 'lucide-react';

interface PrintFinancialDocProps {
  document: FinancialDocument;
  onClose: () => void;
  onToggleStatus?: (doc: FinancialDocument) => void;
}

export const PrintFinancialDoc: React.FC<PrintFinancialDocProps> = ({
  document: doc,
  onClose,
  onToggleStatus,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const isDemandeCheque = doc.doc_type === 'DEMANDE_CHEQUE';
  const isValidated = doc.status === 'Validé';

  return (
    <div className="print-modal-overlay fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block print:w-full print:h-auto">
      <div 
        className="printable-document bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:w-full print:max-w-none print:rounded-none print:overflow-visible print:p-0 print:m-0"
        style={{ fontFamily: "Cambria, 'Times New Roman', serif" }}
      >
        
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50 print:hidden font-sans">
          <div className="flex items-center space-x-2 sm:space-x-3 truncate mr-2">
            <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
              Aperçu: <span className="font-mono text-blue-700">{doc.ref_number}</span>
            </span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <button
              type="button"
              onClick={() => onToggleStatus && onToggleStatus(doc)}
              className={`p-2 rounded-xl shadow-sm transition-all duration-200 cursor-pointer inline-flex items-center justify-center ${
                isValidated
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
              title={isValidated ? 'Document Validé. Cliquer pour repasser en brouillon' : 'Cliquer pour Valider le document'}
            >
              <CheckCircle className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center p-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-colors cursor-pointer"
              title="Imprimer / Exporter PDF"
            >
              <Printer className="w-4 h-4 sm:mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">Imprimer / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Fermer (Echap)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CSS Print Styles to eliminate outer container & force full A4 width */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm 15mm 12mm 15mm;
            }
            body, html {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
            }
            .print-modal-overlay {
              position: static !important;
              background: transparent !important;
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
              width: 100% !important;
              height: auto !important;
            }
            .printable-document {
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              padding: 10mm 15mm 10mm 15mm !important;
              background: #ffffff !important;
              overflow: visible !important;
            }
            .printable-body {
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              overflow: visible !important;
              background: #ffffff !important;
            }
            .printable-document, .printable-document * {
              font-family: Cambria, Arial, 'Helvetica Neue', Helvetica, sans-serif, serif !important;
            }
            .print-avoid-break {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}</style>

        {/* Document Body (Printable Area) */}
        <div className="printable-body p-8 md:p-12 overflow-y-auto bg-white print:p-0 print:m-0 print:overflow-visible text-slate-900 text-base leading-relaxed flex-1 flex flex-col justify-between" style={{ fontFamily: "Cambria, Arial, 'Helvetica Neue', Helvetica, sans-serif, serif" }}>
          <div className="flex-1 flex flex-col">
            {/* 1. Logo & Company Header (First at Top) */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-3">
                <SensusLogo height={42} />
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-slate-900 tracking-widest font-serif">SENSUS S.P.A</div>
                <div className="text-[11px] text-slate-600 font-serif font-medium">Direction de Production</div>
              </div>
            </div>

            {/* 2. Top Full-Width Finance Dual Approval Box (Comptabilité | Finances) */}
            <div className="w-full border border-slate-900 grid grid-cols-2 divide-x divide-slate-900 text-xs font-serif mb-6 print-avoid-break">
              <div className="p-2.5 space-y-1.5">
                <div className="font-bold border-b border-slate-900 pb-1 text-center uppercase tracking-wider text-sm">COMPTABILITE</div>
                <div className="text-[11px]">N° Pces <span className="underline font-semibold">COMPTABLES</span> : __________</div>
                <div className="text-[11px]">VISA DU <span className="underline font-semibold">VERIFICATEUR</span> : __________</div>
              </div>
              <div className="p-2.5 space-y-1.5">
                <div className="font-bold border-b border-slate-900 pb-1 text-center uppercase tracking-wider text-sm">FINANCES</div>
                <div className="text-[11px]">N° Pces <span className="underline font-semibold">COMPTABLES</span> : __________</div>
                <div className="text-[11px]">VISA DU <span className="underline font-semibold">VERIFICATEUR</span> : __________</div>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 mb-6"></div>

            {/* Date & Ref Number Line */}
            <div className="flex justify-between items-center mb-8 font-sans font-bold text-base md:text-lg">
              <div className="underline decoration-slate-800 underline-offset-4">
                N° {doc.ref_number}
              </div>
              <div className="underline decoration-slate-800 underline-offset-4">
                {doc.location || 'EL- EULMA'} LE : {formatDateDDMMYYYY(doc.date)}
              </div>
            </div>

            {/* Document Main Title */}
            <div className="text-center my-6">
              <h1 className="text-xl md:text-2xl font-black font-sans uppercase tracking-widest text-slate-900">
                NOTE POUR : LE CONTRÔLEUR FINANCIER
              </h1>
            </div>

            {/* DEMANDE DE CHEQUE CONTENT */}
            {doc.doc_type === 'DEMANDE_CHEQUE' && (
              <div className="space-y-6">
                <div className="font-bold font-sans text-lg">
                  Objet : <span className="underline decoration-slate-800">{doc.objet}</span>
                </div>

                <div className="text-justify leading-relaxed">
                  Nous vous demandons de bien vouloir nous établir un chèque d'un montant de :{' '}
                  <strong className="font-bold font-sans">
                    ({formatNumber(doc.amount || 0, 2)} DA)
                  </strong>
                  <br />
                  <span className="italic font-medium">({doc.amount_in_words || ''}).</span>
                </div>

                {doc.beneficiary_name && (
                  <div className="text-lg">
                    Au Nom de : <strong className="font-extrabold uppercase font-sans text-slate-900">{doc.beneficiary_name}</strong>.
                  </div>
                )}

                {doc.description && (
                  <div className="text-justify leading-relaxed whitespace-pre-line">
                    {doc.description}
                  </div>
                )}
              </div>
            )}

            {/* DEMANDE DE CHEQUE CERTIFIE CONTENT */}
            {doc.doc_type === 'DEMANDE_CHEQUE_CERTIFIE' && (
              <div className="space-y-6">
                <div className="font-bold font-sans text-lg">
                  Objet : <span className="underline decoration-slate-800">{doc.objet || 'Demande de Chèque Certifié'}</span>
                </div>

                <div className="text-justify leading-relaxed">
                  Nous vous demandons de bien vouloir nous établir un <strong className="font-extrabold uppercase font-sans">chèque certifié</strong> d'un montant de :{' '}
                  <strong className="font-bold font-sans">
                    ({formatNumber(doc.amount || 0, 2)} DA)
                  </strong>
                  <br />
                  <span className="italic font-medium">({doc.amount_in_words || ''}).</span>
                </div>

                {doc.beneficiary_name && (
                  <div className="text-lg">
                    Au Nom de : <strong className="font-extrabold uppercase font-sans text-slate-900">{doc.beneficiary_name}</strong>.
                  </div>
                )}

                {doc.description && (
                  <div className="text-justify leading-relaxed whitespace-pre-line">
                    {doc.description}
                  </div>
                )}
              </div>
            )}

            {/* DEMANDE DE VIREMENT BANCAIRE CONTENT */}
            {doc.doc_type === 'DEMANDE_VIREMENT' && (
              <div className="space-y-6">
                <div className="font-bold font-sans text-lg">
                  Objet : <span className="underline decoration-slate-800">{doc.objet || 'Demande de Virement Bancaire'}</span>
                </div>

                <div className="text-justify leading-relaxed">
                  Nous vous demandons de bien vouloir effectuer un <strong className="font-extrabold uppercase font-sans">virement bancaire</strong> d'un montant de :{' '}
                  <strong className="font-bold font-sans">
                    ({formatNumber(doc.amount || 0, 2)} DA)
                  </strong>
                  <br />
                  <span className="italic font-medium">({doc.amount_in_words || ''}).</span>
                </div>

                {(doc.beneficiary_name || doc.fournisseur_name) && (
                  <div className="text-lg">
                    Au Bénéficiaire : <strong className="font-extrabold uppercase font-sans text-slate-900">{doc.beneficiary_name || doc.fournisseur_name}</strong>.
                  </div>
                )}

                {(doc.bank_name || doc.bank_account_number) && (
                  <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-1.5 font-sans">
                    {doc.bank_name && (
                      <div className="text-base">
                        Banque : <strong className="font-bold text-slate-900 uppercase">{doc.bank_name}</strong>
                      </div>
                    )}
                    {doc.bank_account_number && (
                      <div className="text-base">
                        N° de Compte / RIB : <strong className="font-mono font-bold text-slate-900">{doc.bank_account_number}</strong>
                      </div>
                    )}
                  </div>
                )}

                {doc.description && (
                  <div className="text-justify leading-relaxed whitespace-pre-line">
                    {doc.description}
                  </div>
                )}
              </div>
            )}

            {/* REGULARISATION DE CHEQUE CONTENT */}
            {doc.doc_type === 'REGULARISATION_CHEQUE' && (
              <div className="space-y-6">
                <div className="font-bold font-sans text-base md:text-lg space-y-1.5">
                  <div>
                    <span className="font-bold">Objet</span> &nbsp;: &nbsp; {
                      (() => {
                        let text = doc.objet || '';
                        if (text.toLowerCase().startsWith('régularisation de chèque')) {
                          text = text.replace(/^régularisation de chèque\s*/i, '');
                        }
                        return text || (doc.cheque_number ? `Chèque N° ${doc.cheque_number} du ${formatDateDDMMYYYY(doc.cheque_date || doc.date)}.` : 'Régularisation de chèque.');
                      })()
                    }
                  </div>
                  <div className="flex items-start mt-2">
                    <span className="font-bold mr-2">P.J</span> &nbsp;&nbsp;: &nbsp;
                    <div className="font-normal text-sm md:text-base space-y-0.5">
                      {doc.invoice_lines && doc.invoice_lines.length > 0 ? (
                        doc.invoice_lines.map((l, idx) => {
                          const posStr = String(l.position || idx + 1).padStart(2, '0');
                          return (
                            <div key={idx} className="flex items-baseline space-x-1">
                              <span className="font-bold font-mono text-slate-900 shrink-0">{posStr}-</span>
                              <span>Facture N° <span className="font-bold font-mono">{l.facture_number}</span> du {formatDateDDMMYYYY(l.facture_date)}.</span>
                            </div>
                          );
                        })
                      ) : (
                        <div>- 01 Facture dûment ordonnancée.</div>
                      )}
                      {doc.pj_commande_copy && <div>- {doc.pj_commande_copy}</div>}
                    </div>
                  </div>
                </div>

                <div className="text-justify leading-relaxed font-sans text-base space-y-4 pt-2">
                  <p>
                    En régularisation du chèque demandé par note citée en référence, nous vous transmettons ci-joint :
                  </p>
                  <p className="pl-4 font-sans">
                    -01 Facture cités en pièces jointes dûment ordonnancées d'un montant global de :{' '}
                    <strong className="font-bold">{doc.amount_in_words || (doc.amount ? numberToFrenchWords(doc.amount) : '')}.</strong>{' '}
                    <strong className="font-mono font-black text-slate-900">({formatNumber(doc.amount || 0, 2)} DA).</strong>
                  </p>
                  {doc.description && (
                    <p className="text-justify leading-relaxed whitespace-pre-line pt-2">
                      {doc.description}
                    </p>
                  )}
                </div>

                {/* Invoice Lines Table if multiple */}
                {doc.invoice_lines && doc.invoice_lines.length > 1 && (
                  <div className="mt-6 mb-8 font-sans overflow-x-auto">
                    <table className="w-full border-collapse border-2 border-slate-900 text-sm md:text-base">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b-2 border-slate-900 text-center">
                          <th className="border border-slate-800 py-3 px-3 w-14 whitespace-nowrap">Pos.</th>
                          <th className="border border-slate-800 py-3 px-4 whitespace-nowrap">N° Facture</th>
                          <th className="border border-slate-800 py-3 px-4 whitespace-nowrap">Date</th>
                          <th className="border border-slate-800 py-3 px-4">Fournisseurs</th>
                          <th className="border border-slate-800 py-3 px-6 text-right w-48 min-w-[160px] whitespace-nowrap">Montants/DA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doc.invoice_lines.map((line, idx) => (
                          <tr key={idx} className="border-b border-slate-800 text-center">
                            <td className="border border-slate-800 py-3 px-3 font-semibold whitespace-nowrap">
                              {String(line.position || idx + 1).padStart(2, '0')}
                            </td>
                            <td className="border border-slate-800 py-3 px-4 font-mono font-medium whitespace-nowrap">
                              {line.facture_number}
                            </td>
                            <td className="border border-slate-800 py-3 px-4 whitespace-nowrap">
                              {formatDateDDMMYYYY(line.facture_date)}
                            </td>
                            <td className="border border-slate-800 py-3 px-4 uppercase font-bold text-left">
                              {line.fournisseur_name || doc.fournisseur_name || doc.beneficiary_name || ''}
                            </td>
                            <td className="border border-slate-800 py-3 px-6 font-bold font-mono text-right w-48 min-w-[160px] whitespace-nowrap">
                              {formatNumber(line.amount, 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-900">
                          <td colSpan={4} className="border border-slate-800 py-3 px-4 text-right uppercase tracking-wider font-extrabold text-slate-900">
                            TOTAL
                          </td>
                          <td className="border border-slate-800 py-3 px-6 font-mono font-black text-right text-slate-900 text-base md:text-lg w-48 min-w-[160px] whitespace-nowrap">
                            {formatNumber(
                              doc.invoice_lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0),
                              2
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* REGLEMENT DE FACTURE CONTENT */}
            {doc.doc_type === 'REGLEMENT_FACTURE' && (
              <div className="space-y-6">
                <div className="font-bold font-sans text-base md:text-lg space-y-1">
                  <div>
                    <span className="underline font-bold">OBJET</span> &nbsp;: &nbsp; {doc.objet}
                  </div>
                  {(doc.pj_facture_ordonnancee || doc.pj_bon_arrivee || doc.pj_commande_copy) && (
                    <div className="flex items-start">
                      <span className="underline font-bold mr-2">P.J</span> &nbsp;&nbsp;: &nbsp;
                      <div className="font-normal text-sm md:text-base space-y-0.5">
                        {doc.pj_facture_ordonnancee && <div>- 01 Facture dûment ordonnancée.</div>}
                        {doc.pj_bon_arrivee && <div>- {doc.pj_bon_arrivee}</div>}
                        {doc.pj_commande_copy && <div>- {doc.pj_commande_copy}</div>}
                      </div>
                    </div>
                  )}
                </div>

                {doc.description && (
                  <div className="text-justify leading-relaxed font-sans text-base">
                    {doc.description}
                    {doc.fournisseur_name && !doc.description.includes(doc.fournisseur_name) && (
                      <span> auprès du fournisseur <strong className="font-extrabold uppercase">{doc.fournisseur_name}</strong>.</span>
                    )}
                  </div>
                )}

                {doc.mode_paiement && (
                  <div className="font-sans font-medium text-base">
                    Mode de paiement : <strong className="font-bold font-sans uppercase">{doc.mode_paiement}</strong>.
                  </div>
                )}

                {/* Invoice Lines Table */}
                {doc.invoice_lines && doc.invoice_lines.length > 0 && (
                  <div className="mt-6 mb-8 font-sans overflow-x-auto">
                    <table className="w-full border-collapse border-2 border-slate-900 text-sm md:text-base">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b-2 border-slate-900 text-center">
                          <th className="border border-slate-800 py-3 px-3 w-14 whitespace-nowrap">Pos.</th>
                          <th className="border border-slate-800 py-3 px-4 whitespace-nowrap">N° Facture</th>
                          <th className="border border-slate-800 py-3 px-4 whitespace-nowrap">Date</th>
                          <th className="border border-slate-800 py-3 px-4">Fournisseurs</th>
                          <th className="border border-slate-800 py-3 px-6 text-right w-48 min-w-[160px] whitespace-nowrap">Montants/DA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doc.invoice_lines.map((line, idx) => (
                          <tr key={idx} className="border-b border-slate-800 text-center">
                            <td className="border border-slate-800 py-3 px-3 font-semibold whitespace-nowrap">
                              {String(line.position || idx + 1).padStart(2, '0')}
                            </td>
                            <td className="border border-slate-800 py-3 px-4 font-mono font-medium whitespace-nowrap">
                              {line.facture_number}
                            </td>
                            <td className="border border-slate-800 py-3 px-4 whitespace-nowrap">
                              {formatDateDDMMYYYY(line.facture_date)}
                            </td>
                            <td className="border border-slate-800 py-3 px-4 uppercase font-bold text-left">
                              {line.fournisseur_name || doc.fournisseur_name || doc.beneficiary_name || ''}
                            </td>
                            <td className="border border-slate-800 py-3 px-6 font-bold font-mono text-right w-48 min-w-[160px] whitespace-nowrap">
                              {formatNumber(line.amount, 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-900">
                          <td colSpan={4} className="border border-slate-800 py-3 px-4 text-right uppercase tracking-wider font-extrabold text-slate-900">
                            TOTAL
                          </td>
                          <td className="border border-slate-800 py-3 px-6 font-mono font-black text-right text-slate-900 text-base md:text-lg w-48 min-w-[160px] whitespace-nowrap">
                            {formatNumber(
                              doc.invoice_lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0),
                              2
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Signatory Block */}
            <div className="mt-12 text-center font-sans">
              <div className="font-extrabold text-lg md:text-xl underline tracking-wider uppercase text-slate-900">
                {doc.signatory_title || 'LE DIRECTEUR DE PRODUCTION'}
              </div>
            </div>
          </div>

          {/* Official Company Footer (Pinned to Page Bottom) */}
          <footer className="printable-footer mt-auto pt-4 border-t border-slate-300 text-[10px] text-slate-500 font-sans text-center leading-tight">
            SENSUS-Société par actions au Capital Social de 288 600 000 DA -Adresse : BP 02 Route de Batna -19600 - EL EULMA - Wilaya de Sétif -ALGERIE-<br />
            TEL:00 213 (0) 36 47 96 80 - 00 213 (0) 36 47 96 85 - FAX : 00 213 (0) 47 96 82.<br />
            RC N° 05B 0086023 -00/19 - NIF 000519008602385 - N° ART 19208603930
          </footer>

        </div>
      </div>
    </div>
  );
};
