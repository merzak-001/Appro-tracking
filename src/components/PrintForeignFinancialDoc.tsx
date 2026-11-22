import React from 'react';
import { ForeignFinancialDocument } from '../types';
import { SensusLogo } from './SensusLogo';
import { formatNumber, numberToFrenchWords } from '../utils/numberUtils';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { Printer, X } from 'lucide-react';

interface PrintForeignFinancialDocProps {
  document: ForeignFinancialDocument;
  onClose: () => void;
}

export const PrintForeignFinancialDoc: React.FC<PrintForeignFinancialDocProps> = ({
  document: doc,
  onClose,
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

  const amountInFrench = doc.currency && doc.currency !== 'DA' && doc.currency !== 'DZD'
    ? `${formatNumber(doc.amount)} ${doc.currency}`
    : numberToFrenchWords(doc.amount || 0);

  const formattedDate = formatDateDDMMYYYY(doc.date);
  const formattedChequeDate = doc.cheque_date ? formatDateDDMMYYYY(doc.cheque_date) : '';

  return (
    <div className="print-modal-overlay fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block print:w-full print:h-auto">
      <div 
        className="printable-document bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:w-full print:max-w-none print:rounded-none print:overflow-visible print:p-0 print:m-0"
        style={{ fontFamily: "Cambria, 'Times New Roman', serif" }}
      >
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white print:hidden shrink-0">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 text-xs font-bold rounded bg-sky-500 text-white font-mono">
              {doc.ref_number}
            </span>
            <span className="text-sm font-semibold text-slate-200">
              Imprimer Document Financier Étranger ({doc.doc_type})
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
            >
              <Printer size={16} />
              <span>Imprimer (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CSS Print Styles to eliminate outer container & force full A4 width */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            html, body {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: 100% !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-modal-overlay {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: auto !important;
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
            }
            .printable-document {
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              margin: 0 !important;
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

        {/* PRINTABLE PAGE CONTENT */}
        <div 
          className="printable-body p-8 md:p-12 space-y-6 flex-1 overflow-y-auto print:overflow-visible print:p-0 print:m-0 text-black text-sm sm:text-base leading-relaxed"
          style={{ fontFamily: "Cambria, Arial, 'Helvetica Neue', Helvetica, sans-serif, serif" }}
        >
          {/* 1. Logo & Company Header (First at Top) */}
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-3">
              <SensusLogo className="h-12 w-auto" />
            </div>
            <div className="text-right">
              <div className="font-bold text-sm text-slate-900 tracking-widest font-serif">SENSUS S.P.A</div>
              <div className="text-[11px] text-slate-600 font-serif font-medium">Direction de Production</div>
            </div>
          </div>

          {/* 2. Top Full-Width Finance Dual Approval Box (Comptabilité | Finances) */}
          <div className="w-full border border-slate-900 grid grid-cols-2 divide-x divide-slate-900 text-xs font-serif mb-2 print-avoid-break">
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
          <div className="border-b border-dashed border-slate-900 mb-6"></div>

          {/* 3. Reference & Location Date Bar */}
          <div className="flex items-center justify-between text-base font-bold font-serif pt-1 mb-4">
            <div>
              <span className="border-b-2 border-slate-900 pb-0.5">
                N° : {doc.ref_number}
              </span>
            </div>
            <div>
              {doc.location || 'EL-EULMA'} LE : {formattedDate}
            </div>
          </div>

          {/* 4. Main Title */}
          <div className="text-center py-3 mb-4 font-serif">
            <h1 className="text-xl sm:text-2xl font-bold tracking-wide uppercase text-slate-900 underline decoration-2 underline-offset-4">
              NOTE POUR : LE CONTRÔLEUR FINANCIER
            </h1>
          </div>

          {/* DOCUMENT TYPE SPECIFIC BODY CONTENT */}

          {/* 1. APUREMENT IMPORTATION */}
          {doc.doc_type === 'APUREMENT_IMPORTATION' && (
            <div className="space-y-5 font-serif">
              <div className="space-y-2 text-base font-medium">
                <div><span className="font-bold underline min-w-[140px] inline-block">OBJET</span> : Apurement</div>
                {doc.order_ref && <div><span className="font-bold underline min-w-[140px] inline-block">REF</span> : Expédition N° {doc.order_ref}.</div>}
                {doc.fournisseur_name && <div><span className="font-bold underline min-w-[140px] inline-block">FOURNISSEUR</span> : {doc.fournisseur_name}.</div>}
                <div><span className="font-bold underline min-w-[140px] inline-block">MONTANT</span> : <span className="font-bold">{formatNumber(doc.amount)} {doc.currency || 'EUR'}</span></div>
              </div>

              <p className="pt-2">
                En apurement de l’importation du dossier cité en référence, veuillez trouver ci-joint :
              </p>

              {doc.attachments && doc.attachments.length > 0 && (
                <div className="space-y-1 font-medium pl-2">
                  {doc.attachments.map((att, idx) => {
                    const posStr = String(att.position || idx + 1).padStart(2, '0');
                    let cleanLabel = (att.label || '').replace(/^\d+\s*/, '').replace(/\s*n[°º]\s*$/i, '').trim();
                    if (!cleanLabel) cleanLabel = 'quittance';
                    return (
                      <div key={idx} className="flex items-baseline space-x-1.5">
                        <span className="font-bold font-mono text-slate-900 shrink-0">{posStr}-</span>
                        <span>
                          {cleanLabel}{att.doc_number ? ` N° ${att.doc_number}` : ''}{att.doc_date ? ` du ${formatDateDDMMYYYY(att.doc_date)}` : ''}{att.amount ? ` Montant : ${formatNumber(att.amount, 2)} DA` : ''}.
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {doc.details_description && (
                <p className="pt-2 italic text-slate-800">
                  {doc.details_description}
                </p>
              )}
            </div>
          )}

          {/* 2. DEMANDE DE CHEQUE FRET */}
          {doc.doc_type === 'DEMANDE_CHEQUE_ETRANGER' && (
            <div className="space-y-6 font-serif">
              <div>
                <span className="font-bold text-lg underline">Objet</span> <span className="text-lg font-semibold">: Demande de Chèque</span>
              </div>

              <p className="leading-relaxed">
                Nous vous demandons de bien vouloir nous établir un chèque d’un montant de :<br />
                <span className="font-bold">{amountInFrench} ({formatNumber(doc.amount, 2)} DA)</span>.
              </p>

              {doc.beneficiary_name && (
                <div>
                  <span className="font-medium">Au Nom de : </span>
                  <span className="font-bold text-base uppercase">{doc.beneficiary_name}.</span>
                </div>
              )}

              {doc.details_description && (
                <p className="leading-relaxed">
                  {doc.details_description}
                </p>
              )}

              <p className="pt-2 font-medium">
                La régularisation de cette opération se fera ultérieurement.
              </p>
            </div>
          )}

          {/* 3. DEMANDE DE CHEQUE CERTIFIE DOUANES */}
          {doc.doc_type === 'DEMANDE_CHEQUE_CERTIFIE_ETRANGER' && (
            <div className="space-y-6 font-serif">
              <div>
                <span className="font-bold text-lg underline">Objet</span> <span className="text-lg font-semibold">: Demande de Chèque certifié</span>
              </div>

              <p className="leading-relaxed">
                Nous vous demandons de bien vouloir nous établir un chèque certifié d’un montant de :<br />
                <span className="font-bold">{amountInFrench} ({formatNumber(doc.amount, 2)} DA)</span>.
              </p>

              {doc.beneficiary_name && (
                <div>
                  <span className="font-medium">Au Nom de : </span>
                  <span className="font-bold text-base uppercase">{doc.beneficiary_name}.</span>
                </div>
              )}

              {doc.details_description && (
                <p className="leading-relaxed">
                  {doc.details_description}
                </p>
              )}

              <p className="pt-2 font-medium">
                La régularisation de cette opération se fera ultérieurement.
              </p>
            </div>
          )}

          {/* 4. REGULARISATION CHEQUE FRET */}
          {doc.doc_type === 'REGULARISATION_CHEQUE_ETRANGER' && (
            <div className="space-y-5 font-serif">
              <div>
                <span className="font-bold text-base underline">Objet</span> : Régularisation de chèque N° <span className="font-bold font-mono">{doc.cheque_number || '......'}</span> {formattedChequeDate ? `du ${formattedChequeDate}` : ''}.
              </div>

              {doc.attachments && doc.attachments.length > 0 && (
                <div className="flex items-start space-x-2">
                  <span className="font-bold underline min-w-[50px] shrink-0">P.J</span> :
                  <div className="space-y-1 font-medium">
                    {doc.attachments.map((att, idx) => {
                      const posStr = String(att.position || idx + 1).padStart(2, '0');
                      let cleanLabel = (att.label || '').replace(/^\d+\s*/, '').replace(/\s*n[°º]\s*$/i, '').trim();
                      if (!cleanLabel) cleanLabel = 'Facture';
                      return (
                        <div key={idx} className="flex items-baseline space-x-1.5">
                          <span className="font-bold font-mono text-slate-900 shrink-0">{posStr}-</span>
                          <span>
                            {cleanLabel}{att.doc_number ? ` N° ${att.doc_number}` : ''}{att.doc_date ? ` du ${formatDateDDMMYYYY(att.doc_date)}` : ''}{att.amount ? ` Montant : ${formatNumber(att.amount, 2)} DA` : ''}.
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p>
                En régularisation du chèque demandé par note citée en référence, nous vous transmettons ci-joint :
              </p>

              <p>
                01 Facture citée ci-dessus dûment ordonnancée d’un montant global de : <br />
                <span className="font-bold">{amountInFrench} ({formatNumber(doc.amount, 2)} DA)</span>.
              </p>

              {doc.details_description && (
                <p className="leading-relaxed pt-2">
                  {doc.details_description}
                </p>
              )}
            </div>
          )}

          {/* 5. REGULARISATION CHEQUE CERTIFIE DOUANES */}
          {doc.doc_type === 'REGULARISATION_CHEQUE_CERTIFIE_ETRANGER' && (
            <div className="space-y-5 font-serif">
              <div>
                <span className="font-bold text-base underline uppercase">OBJET</span> : Régularisation de chèque certifié N° <span className="font-bold font-mono">{doc.cheque_number || '......'}</span> {formattedChequeDate ? `DU ${formattedChequeDate}` : ''}.
              </div>

              {doc.attachments && doc.attachments.length > 0 && (
                <div className="flex items-start space-x-2">
                  <span className="font-bold underline min-w-[50px] shrink-0">P.J</span> :
                  <div className="space-y-1 font-medium">
                    {doc.attachments.map((att, idx) => {
                      const posStr = String(att.position || idx + 1).padStart(2, '0');
                      let cleanLabel = (att.label || '').replace(/^\d+\s*/, '').replace(/\s*n[°º]\s*$/i, '').trim();
                      if (!cleanLabel) cleanLabel = 'quittance';
                      return (
                        <div key={idx} className="flex items-baseline space-x-1.5">
                          <span className="font-bold font-mono text-slate-900 shrink-0">{posStr}-</span>
                          <span>
                            {cleanLabel}{att.doc_number ? ` N° ${att.doc_number}` : ''}{att.doc_date ? ` du ${formatDateDDMMYYYY(att.doc_date)}` : ''}{att.amount ? ` Montant : ${formatNumber(att.amount, 2)} DA` : ''}.
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p>
                En régularisation du chèque demandé par la note citée en référence, nous vous transmettons, Ci-joints :
              </p>

              <p>
                Quittances citées ci-dessus dûment ordonnancées d’un montant de : <br />
                <span className="font-bold">{amountInFrench} ({formatNumber(doc.amount)} DA)</span>.
              </p>

              {doc.details_description && (
                <p className="leading-relaxed pt-2">
                  {doc.details_description}
                </p>
              )}
            </div>
          )}

          {/* Signatory Section */}
          <div className="pt-16 pb-12 flex justify-center font-serif">
            <div className="text-center space-y-12">
              <div className="font-bold text-base uppercase border-b-2 border-slate-900 pb-1 tracking-wider inline-block">
                {doc.signatory_title || 'LE DIRECTEUR DE PRODUCTION'}
              </div>
              <div className="h-16"></div> {/* Signature Space */}
            </div>
          </div>

          {/* Footer (Sensus SPA official company info) */}
          <div className="pt-8 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-0.5 leading-tight">
            <div>SENSUS-Société par actions au Capital Social de 288 600 000 DA - Adresse : BP 02 Route de Batna -19600 - EL EULMA - Wilaya de Sétif -ALGERIE-</div>
            <div>TEL 00 213 (0) 36 47 96 80 - 00 213 (0) 36 47 96 34 - FAX 00 213 (0) 36 47 96 82</div>
            <div>RC N° 05B 0086023 -00/19 - NIF 000519008602385 - N° ART 19208603930</div>
          </div>

        </div>
      </div>
    </div>
  );
};
