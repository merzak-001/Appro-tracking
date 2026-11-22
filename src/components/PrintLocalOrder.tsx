import React, { useEffect, useState } from 'react';
import { X, Printer, CheckCircle2, Image as ImageIcon, Upload, Settings, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { LocalOrder, CompanyInfo, Supplier } from '../types';
import { SensusLogo } from './SensusLogo';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { formatAmount, formatQty, numberToFrenchWords } from '../utils/numberUtils';

interface PrintLocalOrderProps {
  order: LocalOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintLocalOrder: React.FC<PrintLocalOrderProps> = ({ order, isOpen, onClose }) => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'Sensus SPA',
    rc: '05B0086023',
    art: '19208603930',
    nif: '000519008602385',
    nis: '00519200158942',
    address: 'BP 02 route de Batna el eulma',
    logo_url: '',
  });
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [paymentMode, setPaymentMode] = useState<'cheque' | 'virement' | 'both'>('cheque');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCompanyModalOpen) {
          setIsCompanyModalOpen(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCompanyModalOpen, onClose]);
  const [editCompany, setEditCompany] = useState<CompanyInfo>(companyInfo);
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyError, setCompanyError] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      // Fetch company info
      fetch('/api/company-info')
        .then((res) => res.json())
        .then((data) => {
          setCompanyInfo(data);
          setEditCompany(data);
        })
        .catch(() => {});

      // Fetch supplier details
      if (order.fournisseur_id) {
        fetch('/api/suppliers')
          .then((res) => res.json())
          .then((suppliers: Supplier[]) => {
            const found = suppliers.find((s) => s.id === order.fournisseur_id);
            if (found) setSupplier(found);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const handleTriggerPrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-order-sheet');
    if (!element) return;
    setIsGeneratingPdf(true);

    try {
      const opt = {
        margin: [6, 6, 6, 6] as [number, number, number, number],
        filename: `Bon_de_Commande_${order.n_order}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEditCompany((prev) => ({ ...prev, logo_url: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    setCompanyError('');
    try {
      const res = await fetch('/api/company-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCompany),
      });
      if (res.ok) {
        const updated = await res.json();
        setCompanyInfo(updated);
        setIsCompanyModalOpen(false);
        window.dispatchEvent(new Event('company-info-updated'));
      } else {
        const data = await res.json().catch(() => ({}));
        setCompanyError(data.error || 'Erreur lors de la sauvegarde des informations.');
      }
    } catch (err) {
      console.error('Failed to update company info:', err);
      setCompanyError('Erreur de connexion lors de la sauvegarde.');
    } finally {
      setSavingCompany(false);
    }
  };

  const totalInWords = numberToFrenchWords(order.total_ttc);

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block">
      {/* Top Action Bar - Hidden when printing */}
      <div className="fixed top-4 right-4 z-50 flex flex-wrap items-center gap-3 print:hidden bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-700 shadow-2xl">
        <button
          onClick={() => {
            setEditCompany(companyInfo);
            setIsCompanyModalOpen(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs rounded-xl transition-all shadow-md"
          title="Uploader un logo ou modifier l'en-tête"
        >
          <Upload size={15} />
          <span>Modifier Logo & Infos</span>
        </button>

        <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs text-white gap-1 mr-1">
          <span className="text-[10px] text-slate-400 font-semibold px-2">Paiement:</span>
          <button
            onClick={() => setPaymentMode('cheque')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
              paymentMode === 'cheque' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Chèque
          </button>
          <button
            onClick={() => setPaymentMode('virement')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
              paymentMode === 'virement' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Virement
          </button>
          <button
            onClick={() => setPaymentMode('both')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
              paymentMode === 'both' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Chèque / Virement
          </button>
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPdf}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
          title="Télécharger directement en fichier PDF"
        >
          <Download size={16} />
          <span>{isGeneratingPdf ? 'Génération...' : 'Télécharger PDF'}</span>
        </button>

        <button
          onClick={handleTriggerPrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          <Printer size={16} />
          <span>Imprimer (Print A4)</span>
        </button>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          title="Fermer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Printable Sheet Container - Pure Clean White Document */}
      <div
        id="printable-order-sheet"
        className="printable-document bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-[210mm] min-h-[297mm] p-8 md:p-12 my-auto flex flex-col justify-between text-black print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:min-h-screen"
        style={{ fontFamily: 'Cambria, Georgia, serif' }}
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-black pb-5">
            <div className="flex flex-col gap-2">
              <SensusLogo logoUrl={companyInfo.logo_url} height={52} />
              <div className="mt-1">
                <h1 className="font-extrabold text-lg text-black tracking-tight">{companyInfo.name}</h1>
                <p className="text-xs text-black font-medium">{companyInfo.address}</p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="border-2 border-black px-5 py-1.5 rounded bg-white inline-block">
                <h2 className="text-base font-black tracking-wider uppercase text-black">BON DE COMMANDE</h2>
              </div>
              <p className="text-lg font-black font-mono text-black mt-2">N° {order.n_order}</p>
              <p className="text-xs font-bold text-black mt-1">
                Date: <span className="font-mono">{formatDateDDMMYYYY(order.date)}</span>
              </p>
              {order.procedure_type && (
                <p className="text-[11px] font-black text-black uppercase tracking-wider mt-1 border border-black px-2 py-0.5 rounded">
                  Procédure: {order.procedure_type}
                </p>
              )}
            </div>
          </div>

          {/* Supplier Info Box & Mode de Paiement */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-black rounded-lg p-4 bg-white">
              <span className="text-[10px] font-bold uppercase text-black tracking-wider block mb-1">
                FOURNISSEUR
              </span>
              <p className="text-sm font-black text-black">{order.supplier_name || supplier?.name || 'Non spécifié'}</p>
              <p className="text-xs text-black mt-1 font-medium">
                <span className="font-bold">Adresse: </span>
                {supplier?.address || 'Adresse non renseignée'}
              </p>
            </div>

            <div className="border border-black rounded-lg p-4 bg-white flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-black tracking-wider block mb-1">
                MODE DE PAIEMENT
              </span>
              <div className="flex items-center gap-6 mt-2 text-xs font-bold text-black">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className={`w-4 h-4 border border-black flex items-center justify-center font-bold text-[10px] ${paymentMode === 'cheque' || paymentMode === 'both' ? 'bg-black text-white' : 'bg-white'}`}>
                    {(paymentMode === 'cheque' || paymentMode === 'both') && '✓'}
                  </div>
                  <span>Chèque</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <div className={`w-4 h-4 border border-black flex items-center justify-center font-bold text-[10px] ${paymentMode === 'virement' || paymentMode === 'both' ? 'bg-black text-white' : 'bg-white'}`}>
                    {(paymentMode === 'virement' || paymentMode === 'both') && '✓'}
                  </div>
                  <span>Virement bancaire</span>
                </label>
              </div>
              <p className="text-[10px] text-slate-600 mt-2 italic">
                Règlement selon les conditions convenues.
              </p>
            </div>
          </div>

          {/* Lines Table - All White with Solid Borders */}
          <div className="mt-6 overflow-hidden rounded-lg border border-black">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white text-black font-extrabold border-b-2 border-black">
                  <th className="px-3 py-2.5 w-10 text-center border-r border-black">N°</th>
                  <th className="px-4 py-2.5 border-r border-black">Désignation des Articles</th>
                  <th className="px-3 py-2.5 w-20 text-right border-r border-black">Qté</th>
                  <th className="px-3 py-2.5 w-16 text-center border-r border-black">Unité</th>
                  <th className="px-4 py-2.5 w-36 min-w-[125px] text-right border-r border-black whitespace-nowrap">P.U. HT (DA)</th>
                  <th className="px-3 py-2.5 w-16 text-right border-r border-black whitespace-nowrap">TVA</th>
                  <th className="px-4 py-2.5 w-44 min-w-[155px] text-right whitespace-nowrap">Total HT (DA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-black font-medium bg-white">
                {order.lines && order.lines.length > 0 ? (
                  order.lines.map((line, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-3 py-2.5 text-center font-bold font-mono border-r border-black">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-black border-r border-black">{line.designation}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-black border-r border-black whitespace-nowrap">{formatQty(line.qty)}</td>
                      <td className="px-3 py-2.5 text-center text-black border-r border-black">{line.unite}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold border-r border-black whitespace-nowrap">{formatAmount(line.unit_price)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-black border-r border-black whitespace-nowrap">{line.tva_percentage}%</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-black whitespace-nowrap">{formatAmount(line.total_ht)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      Aucun article dans cette commande
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* TOTAL IN LETTERS SECTION */}
          <div className="mt-5 border border-black p-3 rounded-lg bg-white">
            <span className="text-[10px] font-bold uppercase text-black tracking-wider block">
              ARRÊTÉ LE PRÉSENT BON DE COMMANDE À LA SOMME DE :
            </span>
            <p className="text-xs font-extrabold text-black uppercase mt-1 leading-relaxed tracking-wide">
              {totalInWords}
            </p>
          </div>

          {/* Observations & Totals */}
          <div className="mt-5 flex flex-col md:flex-row items-start justify-between gap-4">
            <div className="flex-1 text-xs text-black border border-black p-3 rounded-lg bg-white w-full">
              <span className="font-bold text-black block mb-0.5">Observations / Conditions:</span>
              <p className="text-black font-medium">{order.observation || 'Aucune observation enregistrée.'}</p>
            </div>

            <div className="w-full md:w-80 min-w-[310px] border-2 border-black rounded-lg p-3.5 bg-white space-y-1.5 text-xs text-black font-bold">
              <div className="flex justify-between items-center">
                <span>Total HT:</span>
                <span className="font-mono text-sm whitespace-nowrap">{formatAmount(order.total_ht)} DA</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Total TVA:</span>
                <span className="font-mono whitespace-nowrap">{formatAmount(order.total_tva)} DA</span>
              </div>
              <div className="pt-2 border-t-2 border-black flex justify-between items-center text-sm font-black">
                <span>TOTAL TTC:</span>
                <span className="font-mono text-base md:text-lg whitespace-nowrap">{formatAmount(order.total_ttc)} DA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de page (Company Info Footer) */}
        <div className="mt-10 pt-3 border-t-2 border-black text-[10px] text-black text-center space-y-0.5 bg-white">
          <p className="font-black text-black text-xs tracking-wider uppercase">{companyInfo.name}</p>
          <p className="font-mono font-bold">
            RC: {companyInfo.rc} | ART: {companyInfo.art} | NIF: {companyInfo.nif} | NIS: {companyInfo.nis}
          </p>
          <p className="text-black font-medium">{companyInfo.address}</p>
        </div>
      </div>

      {/* Modal - Configuration Logo & Infos Société */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 text-slate-100 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="text-sky-400" size={20} />
                <h3 className="text-base font-bold text-white">Logo & En-tête de l'Entreprise</h3>
              </div>
              <button
                onClick={() => setIsCompanyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {companyError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <X size={15} />
                <span>{companyError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCompany} className="space-y-4">
              {/* Logo Section */}
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  Logo de la Société (Upload de fichier ou URL)
                </label>

                {/* Preview */}
                <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="w-24 h-12 bg-white rounded border border-slate-300 flex items-center justify-center overflow-hidden">
                    <SensusLogo logoUrl={editCompany.logo_url} height={36} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] text-slate-400 font-medium">Aperçu du logo</p>
                    {editCompany.logo_url ? (
                      <button
                        type="button"
                        onClick={() => setEditCompany((prev) => ({ ...prev, logo_url: '' }))}
                        className="text-[10px] text-rose-400 hover:underline font-bold"
                      >
                        Réinitialiser le logo (Utiliser SVG par défaut)
                      </button>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-medium">Logo vectoriel Sensus par défaut</p>
                    )}
                  </div>
                </div>

                {/* File input */}
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1 font-semibold">
                    Option 1 : Choisir une image depuis votre ordinateur
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                  />
                </div>

                {/* URL input */}
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1 font-semibold">
                    Option 2 : Entrer un lien image (URL)
                  </span>
                  <input
                    type="url"
                    value={editCompany.logo_url || ''}
                    onChange={(e) => setEditCompany((prev) => ({ ...prev, logo_url: e.target.value }))}
                    placeholder="https://exemple.com/mon-logo.png"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Company Info Fields */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Raison Sociale / Nom</label>
                  <input
                    type="text"
                    value={editCompany.name}
                    onChange={(e) => setEditCompany((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">RC (Registre Commerce)</label>
                  <input
                    type="text"
                    value={editCompany.rc}
                    onChange={(e) => setEditCompany((prev) => ({ ...prev, rc: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ART (Article Imposition)</label>
                  <input
                    type="text"
                    value={editCompany.art}
                    onChange={(e) => setEditCompany((prev) => ({ ...prev, art: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">NIF (Matricule Fiscal)</label>
                  <input
                    type="text"
                    value={editCompany.nif}
                    onChange={(e) => setEditCompany((prev) => ({ ...prev, nif: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">NIS (Numéro Statistique)</label>
                  <input
                    type="text"
                    value={editCompany.nis}
                    onChange={(e) => setEditCompany((prev) => ({ ...prev, nis: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Adresse Siège Social</label>
                  <input
                    type="text"
                    value={editCompany.address}
                    onChange={(e) => setEditCompany((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  {savingCompany ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

