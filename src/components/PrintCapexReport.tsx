import React from 'react';
import { CapexItem } from '../types';
import { SensusLogo } from './SensusLogo';

interface PrintCapexReportProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  items: CapexItem[];
}

export const PrintCapexReport: React.FC<PrintCapexReportProps> = ({
  isOpen,
  onClose,
  year,
  items,
}) => {
  if (!isOpen) return null;

  const getItemTotals = (item: CapexItem) => {
    if (item.status === 'Annulé') {
      return { subItemsSum: 0, subItemsEngaged: 0, subItemsRealized: 0, engaged: 0, realized: 0, engPct: 0, realPct: 0 };
    }

    const subItemsEngaged = (item.sub_items && item.sub_items.length > 0)
      ? item.sub_items.reduce((s, sub) => s + (sub.amount || 0), 0)
      : 0;

    const subItemsRealized = (item.sub_items && item.sub_items.length > 0)
      ? item.sub_items.reduce((s, sub) => {
          if (sub.is_realized === true) {
            const subRealAmt = (sub.realized_amount !== undefined && sub.realized_amount !== null && sub.realized_amount > 0)
              ? sub.realized_amount
              : (sub.amount || 0);
            return s + subRealAmt;
          }
          return s;
        }, 0)
      : 0;

    const baseEng = item.engaged_amount || 0;

    // Main equipment is realized ONLY if status === 'Réalisé' OR is_realized_confirmed === true
    const isMainConfirmed = item.is_realized_confirmed === true || (item.is_realized_confirmed === undefined && item.status === 'Réalisé');
    const mainRealizedAmount = (item.realized_amount !== undefined && item.realized_amount !== null && item.realized_amount > 0)
      ? item.realized_amount
      : baseEng;
    const mainRealized = isMainConfirmed ? mainRealizedAmount : 0;

    const engaged = baseEng + subItemsEngaged;
    const realized = mainRealized + subItemsRealized;
    const budget = item.budget_amount || 0;
    const engPct = budget > 0 ? Number(((engaged / budget) * 100).toFixed(1)) : 0;
    const realPct = budget > 0 ? Number(((realized / budget) * 100).toFixed(1)) : 0;

    return { subItemsSum: subItemsEngaged, subItemsEngaged, subItemsRealized, engaged, realized, engPct, realPct };
  };

  const activeItems = items.filter((i) => i.status !== 'Annulé');

  const totalBudget = activeItems.reduce((sum, i) => sum + (i.budget_amount || 0), 0);
  const totalEngaged = activeItems.reduce((sum, i) => sum + getItemTotals(i).engaged, 0);
  const totalRealized = activeItems.reduce((sum, i) => sum + getItemTotals(i).realized, 0);
  const totalBalance = totalBudget - totalRealized;
  const overallEngagementPct = totalBudget > 0 ? ((totalEngaged / totalBudget) * 100).toFixed(1) : '0';
  const overallRealizationPct = totalBudget > 0 ? ((totalRealized / totalBudget) * 100).toFixed(1) : '0';

  const handlePrint = () => {
    window.print();
  };

  const formatKDA = (val: number) => {
    if (!val || isNaN(val)) return '0 KDA';
    const kda = val / 1000;
    return kda.toLocaleString('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' KDA';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col overflow-hidden my-auto print:shadow-none print:border-none print:w-full print:max-w-none">
        {/* Modal Controls Bar (Hidden during Print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base">Aperçu Impression Rapport CAPEX {year}</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <span>🖨️ Imprimer / Sauvegarder PDF</span>
            </button>
            <button onClick={onClose} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg">
              Fermer
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 space-y-6 text-slate-900 bg-white font-sans print:p-6" id="printable-capex-report">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-4">
              <SensusLogo className="h-12 w-auto" />
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">Sensus SPA</h1>
                <p className="text-xs text-slate-600 font-semibold">Direction des Approvisionnements & Investissements</p>
                <p className="text-[11px] text-slate-500">BP 02 Route de Batna, El-Eulma, Algérie</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 rounded-lg text-sm font-black border border-emerald-300">
                RAPPORT ANNUEL CAPEX {year} (en KDA)
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Date d'édition : {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">Budget Total Alloué</p>
              <p className="text-sm font-black text-slate-900 font-mono mt-0.5">{formatKDA(totalBudget)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-sky-700 uppercase">Montant Engagé (Commandé)</p>
              <p className="text-sm font-black text-sky-900 font-mono mt-0.5">{formatKDA(totalEngaged)}</p>
              <span className="text-[10px] font-extrabold text-sky-800">({overallEngagementPct}%)</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-emerald-700 uppercase">Montant Réalisé (Confirmé)</p>
              <p className="text-sm font-black text-emerald-900 font-mono mt-0.5">{formatKDA(totalRealized)}</p>
              <span className="text-[10px] font-extrabold text-emerald-800">({overallRealizationPct}%)</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-amber-700 uppercase">Solde Restant</p>
              <p className="text-sm font-black text-amber-900 font-mono mt-0.5">{formatKDA(totalBalance)}</p>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold text-[11px]">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Équipement / Investissement</th>
                  <th className="px-3 py-2.5">Catégorie</th>
                  <th className="px-3 py-2.5 text-right">Budget (KDA)</th>
                  <th className="px-3 py-2.5 text-right">Engagé (KDA)</th>
                  <th className="px-3 py-2.5 text-right">% Eng.</th>
                  <th className="px-3 py-2.5 text-right">Réalisé Confirmé (KDA)</th>
                  <th className="px-3 py-2.5 text-right">% Réal.</th>
                  <th className="px-3 py-2.5 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 text-[11px]">
                {items.map((item, idx) => {
                  const { engaged, realized, engPct, realPct } = getItemTotals(item);
                  return (
                    <tr key={item.id} className="odd:bg-white even:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{item.name}</td>
                      <td className="px-3 py-2 font-medium text-slate-700">{item.category}</td>
                      <td className="px-3 py-2 text-right font-mono font-medium">{formatKDA(item.budget_amount)}</td>
                      <td className="px-3 py-2 text-right font-mono font-medium text-sky-800">{formatKDA(engaged)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-sky-700">{engPct}%</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-800">{formatKDA(realized)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{realPct}%</td>
                      <td className="px-3 py-2 text-center font-bold">{item.status}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-extrabold border-t-2 border-slate-300 text-[11px]">
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-slate-900 uppercase">Total Général ({year})</td>
                  <td className="px-3 py-3 text-right font-mono">{formatKDA(totalBudget)}</td>
                  <td className="px-3 py-3 text-right font-mono text-sky-900">{formatKDA(totalEngaged)}</td>
                  <td className="px-3 py-3 text-right font-mono text-sky-900">{overallEngagementPct}%</td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-900">{formatKDA(totalRealized)}</td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-900">{overallRealizationPct}%</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs font-bold border-t border-slate-200 print:pt-4">
            <div>
              <p className="text-slate-600 mb-12">Le Responsable des Investissements / Approvisionnements</p>
              <p className="text-slate-900 font-black">Sai, Merzak</p>
            </div>
            <div>
              <p className="text-slate-600 mb-12">Le Directeur Général / Chef de Service</p>
              <p className="text-slate-900 font-black">Sensus SPA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
