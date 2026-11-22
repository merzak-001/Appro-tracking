import { describe, it, expect } from 'vitest';
import { ProductionMonthlyRecord } from '../src/types';
import {
  getAvailableYears,
  getAvailableMonthsForYear,
  aggregateComparativeProduction,
} from '../src/utils/productionUtils';

describe('Production Comparative (Year-over-Year N vs N-1)', () => {
  const sampleRecords: ProductionMonthlyRecord[] = [
    // 2025 Data
    {
      code_article: '01021134',
      designation: 'Compteur 420PC15 avec Clapet',
      famille_diametre: 'DN 15',
      mois: '01.2025',
      annee: 2025,
      mois_num: 1,
      qte_entree: 10000,
      qte_sortie: 8000,
      qte_stock: 2000,
      val_entree: 43806600,
      val_sortie: 35045280,
      val_stock: 8761320,
    },
    {
      code_article: '01021134',
      designation: 'Compteur 420PC15 avec Clapet',
      famille_diametre: 'DN 15',
      mois: '02.2025',
      annee: 2025,
      mois_num: 2,
      qte_entree: 12000,
      qte_sortie: 11000,
      qte_stock: 3000,
      val_entree: 52567920,
      val_sortie: 48187260,
      val_stock: 13141980,
    },
    // 2026 Data
    {
      code_article: '01021134',
      designation: 'Compteur 420PC15 avec Clapet',
      famille_diametre: 'DN 15',
      mois: '01.2026',
      annee: 2026,
      mois_num: 1,
      qte_entree: 15000,
      qte_sortie: 12000,
      qte_stock: 5000,
      val_entree: 65709900,
      val_sortie: 52567920,
      val_stock: 21903300,
    },
    {
      code_article: '01021134',
      designation: 'Compteur 420PC15 avec Clapet',
      famille_diametre: 'DN 15',
      mois: '02.2026',
      annee: 2026,
      mois_num: 2,
      qte_entree: 18000,
      qte_sortie: 16000,
      qte_stock: 7000,
      val_entree: 78851880,
      val_sortie: 70090560,
      val_stock: 30664620,
    },
    // 2026 DN 20
    {
      code_article: '01021135',
      designation: 'Compteur 420PC20 avec clapet',
      famille_diametre: 'DN 20',
      mois: '02.2026',
      annee: 2026,
      mois_num: 2,
      qte_entree: 2000,
      qte_sortie: 1500,
      qte_stock: 500,
      val_entree: 10000000,
      val_sortie: 7500000,
      val_stock: 2500000,
    },
  ];

  it('extracts available years dynamically in descending order', () => {
    const years = getAvailableYears(sampleRecords);
    expect(years).toEqual([2026, 2025]);
  });

  it('extracts distinct available months for a given year', () => {
    const months2026 = getAvailableMonthsForYear(sampleRecords, 2026);
    expect(months2026.length).toBe(2);
    expect(months2026[0].monthNum).toBe(1);
    expect(months2026[1].monthNum).toBe(2);
  });

  it('aggregates comparative data correctly for Month 2 (Février) 2026 vs 2025', () => {
    const summary = aggregateComparativeProduction(sampleRecords, 2026, 2025, 2);

    expect(summary.yearN).toBe(2026);
    expect(summary.yearN1).toBe(2025);
    expect(summary.cutoffMonthNum).toBe(2);

    // DN 15 Group
    const dn15 = summary.groups.find((g) => g.famille_diametre === 'DN 15');
    expect(dn15).toBeDefined();
    if (dn15) {
      // Month N (Feb 2026) = 18,000, Month N-1 (Feb 2025) = 12,000
      expect(dn15.qte.month_val_N).toBe(18000);
      expect(dn15.qte.month_val_N1).toBe(12000);
      expect(dn15.qte.month_diff).toBe(6000);
      expect(dn15.qte.month_growth_pct).toBe(50.0);

      // Cumul N (Jan+Feb 2026) = 15000 + 18000 = 33000
      // Cumul N-1 (Jan+Feb 2025) = 10000 + 12000 = 22000
      expect(dn15.qte.cumul_val_N).toBe(33000);
      expect(dn15.qte.cumul_val_N1).toBe(22000);
      expect(dn15.qte.cumul_diff).toBe(11000);
      expect(dn15.qte.cumul_growth_pct).toBe(50.0);
    }

    // Grand Totals: Month 2 (DN15: 18000 + DN20: 2000 = 20000) vs (DN15: 12000 = 12000)
    expect(summary.totals.qte.month_val_N).toBe(20000);
    expect(summary.totals.qte.month_val_N1).toBe(12000);
    expect(summary.totals.qte.month_diff).toBe(8000);
  });
});
