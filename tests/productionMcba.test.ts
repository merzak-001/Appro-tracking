import { describe, it, expect } from 'vitest';
import {
  extractDiameter,
  toKDA,
  formatKDA,
  formatNumber,
  sortMonthsChronologically,
  aggregateProductionData,
  getMonthName,
  formatMonthString,
} from '../src/utils/productionUtils';
import { ProductionMonthlyRecord } from '../src/types';

describe('Production MCBA Utils & Business Logic', () => {
  describe('extractDiameter', () => {
    it('classifies standard DN 15 meter variants correctly', () => {
      expect(extractDiameter('01021134 Compteur 420PC15 avec Clapet')).toBe('DN 15');
      expect(extractDiameter('01021149 Compteur 420PC15 pour le Privé')).toBe('DN 15');
      expect(extractDiameter("01021167 Compteur d'eau 420 015 L170")).toBe('DN 15 (Export)');
      expect(extractDiameter('01021144 Compteur 420PC15 SEOR')).toBe('DN 15');
      expect(extractDiameter('01021159 Compteur 820 DN15')).toBe('DN 15');
      expect(extractDiameter('01021304 Compteur RESIDIA Eau Chaude avec clapet')).toBe('DN 15');
    });

    it('classifies DN 20, DN 25, DN 30, DN 40 meters correctly', () => {
      expect(extractDiameter('01021135 Compteur 420PC20 avec clapet')).toBe('DN 20');
      expect(extractDiameter('01021157 Compteur 420PC DN25')).toBe('DN 25');
      expect(extractDiameter('01021155 compteur 420 PC 30')).toBe('DN 30');
      expect(extractDiameter('01021156 Compteur 420 PC 40')).toBe('DN 40');
      expect(extractDiameter('WPDIFAXE INS WPD 40 50℃/PN16 X DZ')).toBe('DN 40');
    });

    it('classifies industrial WPD calibres (DN 50 to DN 200) correctly', () => {
      expect(extractDiameter('01021161 compteur WPD DN 50')).toBe('DN 50');
      expect(extractDiameter('01021162 compteur WPD DN 65')).toBe('DN 65');
      expect(extractDiameter('01021163 compteur WPD DN 80')).toBe('DN 80');
      expect(extractDiameter('01021166 compteur WPD DN 100')).toBe('DN 100');
      expect(extractDiameter('01021164 compteur WPD DN 125')).toBe('DN 125');
      expect(extractDiameter('01021165 compteur WPD DN 150')).toBe('DN 150');
      expect(extractDiameter('F829553D WPDy 200 L350 Q15 B E PN10 China')).toBe('DN 200');
    });

    it('classifies accessories or test equipment as Autres', () => {
      expect(extractDiameter('94021072 Test bench JOS 100')).toBe('Autres');
    });
  });

  describe('kDA Formatting & Values', () => {
    it('converts DZD to kDA accurately (DZD / 1,000)', () => {
      expect(toKDA(1000000)).toBe(1000);
      expect(toKDA(24676060.48)).toBeCloseTo(24676.06, 1);
      expect(toKDA(0)).toBe(0);
    });

    it('formats kDA string with localized spacing', () => {
      expect(formatKDA(1000000)).toContain('kDA');
      expect(formatKDA(0)).toBe('0 kDA');
    });
  });

  describe('sortMonthsChronologically', () => {
    it('sorts month strings in chronological order across years', () => {
      const unsorted = ['08.2026', '01.2026', '05.2026', '12.2025', '03.2026'];
      const sorted = sortMonthsChronologically(unsorted);
      expect(sorted).toEqual(['12.2025', '01.2026', '03.2026', '05.2026', '08.2026']);
    });
  });

  describe('aggregateProductionData', () => {
    it('aggregates multi-model meters under DN 15 group and computes YTD cumuls', () => {
      const sampleRecords: ProductionMonthlyRecord[] = [
        {
          code_article: '01021134',
          designation: 'Compteur 420PC15 avec Clapet',
          famille_diametre: 'DN 15',
          mois: '01.2026',
          annee: 2026,
          mois_num: 1,
          qte_entree: 20000,
          qte_sortie: 15000,
          qte_stock: 5000,
          val_entree: 60000000,
          val_sortie: 45000000,
          val_stock: 15000000,
        },
        {
          code_article: '01021134',
          designation: 'Compteur 420PC15 avec Clapet',
          famille_diametre: 'DN 15',
          mois: '02.2026',
          annee: 2026,
          mois_num: 2,
          qte_entree: 25000,
          qte_sortie: 20000,
          qte_stock: 10000,
          val_entree: 75000000,
          val_sortie: 60000000,
          val_stock: 30000000,
        },
        {
          code_article: '01021149',
          designation: 'Compteur 420PC15 pour le Privé',
          famille_diametre: 'DN 15',
          mois: '01.2026',
          annee: 2026,
          mois_num: 1,
          qte_entree: 10000,
          qte_sortie: 8000,
          qte_stock: 2000,
          val_entree: 30000000,
          val_sortie: 24000000,
          val_stock: 6000000,
        },
        {
          code_article: '01021161',
          designation: 'compteur WPD DN 50',
          famille_diametre: 'DN 50',
          mois: '01.2026',
          annee: 2026,
          mois_num: 1,
          qte_entree: 50,
          qte_sortie: 30,
          qte_stock: 20,
          val_entree: 1000000,
          val_sortie: 600000,
          val_stock: 400000,
        },
      ];

      const result = aggregateProductionData(sampleRecords, 2026);

      expect(result.groups.length).toBe(2); // DN 15 and DN 50
      expect(result.allMonths).toEqual(['01.2026', '02.2026']);

      const dn15Group = result.groups.find((g) => g.famille_diametre === 'DN 15');
      expect(dn15Group).toBeDefined();
      expect(dn15Group?.modelCount).toBe(2); // 2 models: 01021134 and 01021149
      expect(dn15Group?.cumul_qte_entree).toBe(55000); // 20000 + 25000 + 10000
      expect(dn15Group?.cumul_qte_sortie).toBe(43000); // 15000 + 20000 + 8000
      expect(dn15Group?.dernier_stock_qte).toBe(12000); // 10000 + 2000

      // Overall totals
      expect(result.totals.cumul_qte_entree).toBe(55050);
      expect(result.totals.cumul_qte_sortie).toBe(43030);
    });

    it('filters out items with 0 annual production but retains DN 25 even with 0 production', () => {
      const records: ProductionMonthlyRecord[] = [
        // Active item DN 15
        {
          code_article: '01021134',
          designation: 'Compteur 420PC15 avec Clapet',
          famille_diametre: 'DN 15',
          mois: '01.2026',
          annee: 2026,
          mois_num: 1,
          qte_entree: 1000,
          qte_sortie: 800,
          qte_stock: 200,
          val_entree: 3000000,
          val_sortie: 2400000,
          val_stock: 600000,
        },
        // Inactive item DN 20 (0 entree, 0 sortie, 0 stock across whole year) -> Should be deleted/filtered
        {
          code_article: '01021131',
          designation: 'Compteur 420PC20',
          famille_diametre: 'DN 20',
          mois: '01.2026',
          annee: 2026,
          mois_num: 1,
          qte_entree: 0,
          qte_sortie: 0,
          qte_stock: 0,
          val_entree: 0,
          val_sortie: 0,
          val_stock: 0,
        },
        // Inactive item DN 25 (0 entree across whole year) -> MUST BE RETAINED per user requirement
        {
          code_article: '01021157',
          designation: 'Compteur 420PC DN25',
          famille_diametre: 'DN 25',
          mois: '01.2026',
          annee: 2026,
          mois_num: 1,
          qte_entree: 0,
          qte_sortie: 0,
          qte_stock: 0,
          val_entree: 0,
          val_sortie: 0,
          val_stock: 0,
        },
        // Inactive item WPD DN 200 (0 entree, 0 sortie, 0 stock) -> Should be deleted/filtered
        {
          code_article: 'F829553D',
          designation: 'WPDy 200 L350 Q15 B E PN10 China',
          famille_diametre: 'DN 200',
          mois: '01.2026',
          annee: 2026,
          mois_num: 1,
          qte_entree: 0,
          qte_sortie: 0,
          qte_stock: 0,
          val_entree: 0,
          val_sortie: 0,
          val_stock: 0,
        },
      ];

      const result = aggregateProductionData(records, 2026);
      const groupNames = result.groups.map((g) => g.famille_diametre);

      // Must include DN 15 (has production) and DN 25 (retained despite 0 production)
      expect(groupNames).toContain('DN 15');
      expect(groupNames).toContain('DN 25');

      // Must NOT include DN 20 or DN 200 (0 production and not DN 25)
      expect(groupNames).not.toContain('DN 20');
      expect(groupNames).not.toContain('DN 200');

      expect(result.articleCount).toBe(2); // exactly 2 articles retained
    });

    it('manages Stock Initial (Report N-1) when previous year data exists', () => {
      const multiYearRecords: ProductionMonthlyRecord[] = [
        // Year 2025 (Previous Year) - Month 12 closing stock
        {
          code_article: '01021134',
          designation: 'Compteur 420PC15 avec Clapet',
          famille_diametre: 'DN 15',
          mois: '12.2025',
          annee: 2025,
          mois_num: 12,
          qte_entree: 15000,
          qte_sortie: 12000,
          qte_stock: 4500, // <- Expected Stock Initial for 2026
          val_entree: 45000000,
          val_sortie: 36000000,
          val_stock: 13500000,
        },
        // Year 2026 (Current Year)
        {
          code_article: '01021134',
          designation: 'Compteur 420PC15 avec Clapet',
          famille_diametre: 'DN 15',
          mois: '01.2026',
          annee: 2026,
          mois_num: 1,
          qte_entree: 20000,
          qte_sortie: 18000,
          qte_stock: 6500, // 4500 + 20000 - 18000 = 6500
          val_entree: 60000000,
          val_sortie: 54000000,
          val_stock: 19500000,
        },
      ];

      const result = aggregateProductionData(multiYearRecords, 2026);
      expect(result.hasPreviousYearData).toBe(true);
      expect(result.previousYear).toBe(2025);

      const dn15Group = result.groups.find((g) => g.famille_diametre === 'DN 15');
      expect(dn15Group?.stock_initial_qte).toBe(4500);
      expect(dn15Group?.stock_initial_val).toBe(13500000);
      expect(dn15Group?.total_disponible_qte).toBe(4500 + 20000); // 24,500 units available

      // Totals
      expect(result.totals.stock_initial_qte).toBe(4500);
      expect(result.totals.total_disponible_qte).toBe(24500);
    });

    it('sets Stock Initial (Report N-1) to null/empty when NO previous year data exists', () => {
      const singleYearRecords: ProductionMonthlyRecord[] = [
        {
          code_article: '01021134',
          designation: 'Compteur 420PC15 avec Clapet',
          famille_diametre: 'DN 15',
          mois: '01.2026',
          annee: 2026,
          mois_num: 1,
          qte_entree: 20000,
          qte_sortie: 15000,
          qte_stock: 5000,
          val_entree: 60000000,
          val_sortie: 45000000,
          val_stock: 15000000,
        },
      ];

      const result = aggregateProductionData(singleYearRecords, 2026);
      expect(result.hasPreviousYearData).toBe(false);
      expect(result.totals.stock_initial_qte).toBeNull();
      expect(result.totals.stock_initial_val).toBeNull();
      expect(result.totals.total_disponible_qte).toBeNull();
    });
  });

  describe('French Month Names & Formatting', () => {
    it('returns full French month name for 1-12', () => {
      expect(getMonthName(1)).toBe('Janvier');
      expect(getMonthName(2)).toBe('Février');
      expect(getMonthName(8)).toBe('Août');
      expect(getMonthName(12)).toBe('Décembre');
    });

    it('formats month strings like 01.2026 into French names with and without year', () => {
      expect(formatMonthString('01.2026', true)).toBe('Janvier 2026');
      expect(formatMonthString('01.2026', false)).toBe('Janvier');
      expect(formatMonthString('08.2025', true)).toBe('Août 2025');
      expect(formatMonthString('08.2025', false)).toBe('Août');
      expect(formatMonthString('12.2024', true)).toBe('Décembre 2024');
    });
  });

  describe('Production Data Delete Logic', () => {
    const mockDataset: ProductionMonthlyRecord[] = [
      {
        code_article: '01021134',
        designation: 'Compteur 420PC15 avec Clapet',
        famille_diametre: 'DN 15',
        mois: '01.2026',
        annee: 2026,
        mois_num: 1,
        qte_entree: 10000,
        qte_sortie: 8000,
        qte_stock: 2000,
        val_entree: 30000000,
        val_sortie: 24000000,
        val_stock: 6000000,
      },
      {
        code_article: '01021134',
        designation: 'Compteur 420PC15 avec Clapet',
        famille_diametre: 'DN 15',
        mois: '02.2026',
        annee: 2026,
        mois_num: 2,
        qte_entree: 12000,
        qte_sortie: 9000,
        qte_stock: 5000,
        val_entree: 36000000,
        val_sortie: 27000000,
        val_stock: 15000000,
      },
      {
        code_article: '01021134',
        designation: 'Compteur 420PC15 avec Clapet',
        famille_diametre: 'DN 15',
        mois: '12.2025',
        annee: 2025,
        mois_num: 12,
        qte_entree: 15000,
        qte_sortie: 10000,
        qte_stock: 5000,
        val_entree: 45000000,
        val_sortie: 30000000,
        val_stock: 15000000,
      },
    ];

    it('filters out only the target month when deleting by year and month', () => {
      const yearToDelete = 2026;
      const monthToDelete = '01.2026';

      const remaining = mockDataset.filter(
        (r) => !(r.annee === yearToDelete && r.mois === monthToDelete)
      );

      expect(remaining.length).toBe(2);
      expect(remaining.some((r) => r.mois === '01.2026')).toBe(false);
      expect(remaining.some((r) => r.mois === '02.2026')).toBe(true);
      expect(remaining.some((r) => r.annee === 2025)).toBe(true);
    });

    it('filters out the entire year when deleting by year', () => {
      const yearToDelete = 2026;
      const remaining = mockDataset.filter((r) => r.annee !== yearToDelete);

      expect(remaining.length).toBe(1);
      expect(remaining[0].annee).toBe(2025);
    });
  });

  describe('Tableau de Bord Product Mois & Budget Calculations', () => {
    it('calculates planned monthly, cumulative, and annual metrics correctly', () => {
      const annualBudgetU = 465000; // DN15 annual budget
      const pu = 4.38066; // kDA
      const monthNum = 7; // Juillet

      const prevuMoisU = annualBudgetU / 12;
      const prevuMoisKDA = (annualBudgetU * pu) / 12;

      const prevuCumU = prevuMoisU * monthNum;
      const prevuCumKDA = prevuMoisKDA * monthNum;

      expect(prevuMoisU).toBe(38750);
      expect(prevuCumU).toBe(271250);
      expect(prevuMoisKDA).toBeCloseTo(169750.58, 1);
      expect(prevuCumKDA).toBeCloseTo(1188254.02, 1);


      // Suppose realized is 280000
      const realCumU = 280000;
      const txRealCumU = realCumU / prevuCumU;
      const txRealAnnuelleU = realCumU / annualBudgetU;

      expect(txRealCumU).toBeGreaterThan(1.0); // Goal achieved
      expect(txRealAnnuelleU).toBeCloseTo(0.602, 2); // ~60.2% of annual budget
    });

    it('determines quarter index and quarter months correctly', () => {
      const getQuarterMonths = (m: number) => {
        const q = Math.ceil(m / 3);
        const start = (q - 1) * 3 + 1;
        return { q, months: [start, start + 1, start + 2] };
      };

      expect(getQuarterMonths(1)).toEqual({ q: 1, months: [1, 2, 3] });
      expect(getQuarterMonths(3)).toEqual({ q: 1, months: [1, 2, 3] });
      expect(getQuarterMonths(4)).toEqual({ q: 2, months: [4, 5, 6] });
      expect(getQuarterMonths(7)).toEqual({ q: 3, months: [7, 8, 9] });
      expect(getQuarterMonths(12)).toEqual({ q: 4, months: [10, 11, 12] });
    });
  });
});


