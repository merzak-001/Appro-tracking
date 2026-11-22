import {
  ProductionMonthlyRecord,
  ProductionDiameterGroup,
  ProductionArticleAggregation,
  ProductionMonthlyDataPoint,
  ProductionComparativeMetrics,
  ProductionComparativeArticle,
  ProductionComparativeGroup,
  ProductionComparativeSummary,
} from '../types';

/**
 * Checks if an article designation or code corresponds to the specific Export meter:
 * 'Compteur d'eau 420 015 L170' (SAP Code: 01021167).
 */
export function isExportMeterArticle(raw: string, code?: string): boolean {
  if (code && code.trim() === '01021167') return true;
  if (!raw) return false;
  const s = raw.toUpperCase();
  if (s.includes('01021167')) return true;
  if (/420\s*015\s*L170|015\s*L170|\bL170\b/i.test(s) && (s.includes('420') || s.includes('COMPTEUR'))) return true;
  if (s.includes('EXPORT') && (s.includes('15') || s.includes('015'))) return true;
  return false;
}

/**
 * Extracts and standardizes diameter / calibre from an article designation or code.
 * E.g. '01021134 Compteur 420PC15 avec Clapet' -> 'DN 15'
 *      '01021167 Compteur d'eau 420 015 L170' -> 'DN 15 (Export)'
 *      '01021135 Compteur 420PC20 avec clapet' -> 'DN 20'
 *      '01021161 compteur WPD DN 50' -> 'DN 50'
 */
export function extractDiameter(raw: string, code?: string): string {
  if (!raw) return 'Autres';
  
  // Specific Export Model 420 015 L170 (Separate category)
  if (isExportMeterArticle(raw, code)) {
    return 'DN 15 (Export)';
  }

  const s = raw.toUpperCase();

  // Explicit WPD / Industrial Meters
  if (/DN\s*200|WPDY?\s*200|200\s*L350/i.test(s)) return 'DN 200';
  if (/DN\s*150|WPD\s*150/i.test(s)) return 'DN 150';
  if (/DN\s*125|WPD\s*125/i.test(s)) return 'DN 125';
  if (/DN\s*100|WPD\s*100/i.test(s) && !s.includes('BENCH') && !s.includes('TEST')) return 'DN 100';
  if (/DN\s*80|WPD\s*80|\b080\b/i.test(s)) return 'DN 80';
  if (/DN\s*65|WPD\s*65|\b065\b/i.test(s)) return 'DN 65';
  if (/DN\s*50|WPD\s*50|\b050\b/i.test(s)) return 'DN 50';

  // Medium / Residential Calibres
  if (/PC\s*40|DN\s*40|WPD\s*40|\b040\b/i.test(s)) return 'DN 40';
  if (/PC\s*30|DN\s*30|\b030\b/i.test(s)) return 'DN 30';
  if (/DN\s*25|\b025\b/i.test(s)) return 'DN 25';
  if (/420\s*PC\s*20|PC20|DN\s*20|\b020\b/i.test(s)) return 'DN 20';
  
  // DN 15 National and variants
  if (/420\s*PC\s*15|PC15|DN\s*15|\b015\b|RESIDIA/i.test(s) && !/PC\s*(20|25|30|40)|DN\s*(20|25|30|40|50|65|80|100|125|150|200)/i.test(s)) {
    return 'DN 15';
  }

  return 'Autres';
}

/**
 * Standard sorting order for meter diameters from smallest to largest
 */
export const DIAMETER_ORDER: Record<string, number> = {
  'DN 15': 1,
  'DN 15 (Export)': 2,
  'DN 20': 3,
  'DN 25': 4,
  'DN 30': 5,
  'DN 40': 6,
  'DN 50': 7,
  'DN 65': 8,
  'DN 80': 9,
  'DN 100': 10,
  'DN 125': 11,
  'DN 150': 12,
  'DN 200': 13,
  'Autres': 99,
};

/**
 * Converts a DZD value to Kilo-Dinars (kDA = DZD / 1,000)
 */
export function toKDA(amountDZD: number): number {
  if (!amountDZD || isNaN(amountDZD)) return 0;
  return amountDZD / 1000;
}

/**
 * Formats a number with thousands separators and optional decimals
 */
export function formatNumber(val: number, decimals: number = 0): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

/**
 * Formats an amount into kDA representation (e.g. 24 676 kDA)
 */
export function formatKDA(amountDZD: number, decimals: number = 1): string {
  const kda = toKDA(amountDZD);
  if (kda === 0) return '0 kDA';
  // If integer or decimals 0, format cleanly
  const formatted = formatNumber(kda, Math.abs(kda) < 10 && kda % 1 !== 0 ? 1 : 0);
  return `${formatted} kDA`;
}

/**
 * French month names list
 */
export const FRENCH_MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

/**
 * Returns the French month name for a given month number (1-12)
 */
export function getMonthName(monthNum: number): string {
  if (monthNum >= 1 && monthNum <= 12) {
    return FRENCH_MONTHS[monthNum - 1];
  }
  return `Mois ${monthNum}`;
}

/**
 * Formats a raw month code (e.g. '01.2026', '08.2026', '1') into French text
 * E.g. '01.2026' -> 'Janvier 2026' (includeYear=true) or 'Janvier' (includeYear=false)
 */
export function formatMonthString(mois: string, includeYear: boolean = true): string {
  if (!mois) return '';
  if (mois.includes('.')) {
    const parts = mois.split('.');
    const m = Number(parts[0]) || 1;
    const y = Number(parts[1]);
    const mName = getMonthName(m);
    return includeYear && y ? `${mName} ${y}` : mName;
  }
  const mNum = Number(mois);
  if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) {
    return getMonthName(mNum);
  }
  return mois;
}

/**
 * Sorts month strings in chronological order (e.g. '01.2026', '02.2026', ..., '08.2026')
 */
export function sortMonthsChronologically(months: string[]): string[] {
  return [...months].sort((a, b) => {
    const [m1, y1] = a.split('.').map(Number);
    const [m2, y2] = b.split('.').map(Number);
    if (y1 !== y2) return (y1 || 0) - (y2 || 0);
    return (m1 || 0) - (m2 || 0);
  });
}

/**
 * Aggregates monthly production records into Diameter Groups (e.g. DN 15, DN 20, ...)
 * and individual article sub-rows.
 * Supports an optional `upToMonth` parameter (e.g. '03.2026') to compute point-in-time
 * cumulative production, sales, and closing stock up to that specific month.
 */
export function aggregateProductionData(
  records: ProductionMonthlyRecord[],
  selectedYear?: number,
  upToMonth?: string
) {
  // Extract distinct years from ALL records in database and ensure actual year is included
  const actualYear = new Date().getFullYear();
  const allYearsSet = new Set<number>();
  allYearsSet.add(actualYear);
  records.forEach((r) => {
    if (r.annee) allYearsSet.add(Number(r.annee));
  });
  const distinctYears = Array.from(allYearsSet).sort((a, b) => b - a);

  const currentYear = selectedYear || actualYear;
  const filtered = records.filter((r) => r.annee === currentYear);

  // Extract distinct months for the current analyzed year and sort them
  const monthSet = new Set<string>();
  filtered.forEach((r) => {
    if (r.mois) monthSet.add(r.mois);
  });

  const allMonths = sortMonthsChronologically(Array.from(monthSet));

  // Determine point-in-time cutoff month number if specified
  const upToMonthNum = upToMonth ? parseInt(upToMonth.split('.')[0], 10) || 12 : 12;

  // Identify previous year and whether we have historical data for N-1
  const previousYear = currentYear - 1;
  const prevYearRecords = records.filter((r) => r.annee === previousYear);
  const hasPreviousYearData = prevYearRecords.length > 0;

  let lastPrevMonth = '';
  if (hasPreviousYearData) {
    const prevMonths = sortMonthsChronologically(Array.from(new Set(prevYearRecords.map((r) => r.mois))));
    lastPrevMonth = prevMonths[prevMonths.length - 1] || '';
  }

  // Group by Article first
  const articleMap: Record<string, ProductionArticleAggregation> = {};

  filtered.forEach((r) => {
    const code = r.code_article.trim();
    if (!articleMap[code]) {
      const fam = isExportMeterArticle(`${code} ${r.designation}`, code)
        ? 'DN 15 (Export)'
        : (r.famille_diametre && r.famille_diametre !== 'DN 15' ? r.famille_diametre : extractDiameter(`${code} ${r.designation}`, code));
      articleMap[code] = {
        code_article: code,
        designation: r.designation,
        famille_diametre: fam,
        unite: r.unite || 'PCE',
        monthsData: {},
        stock_initial_qte: null,
        stock_initial_val: null,
        has_previous_year_data: hasPreviousYearData,
        total_disponible_qte: null,
        total_disponible_val: null,
        cumul_qte_entree: 0,
        cumul_val_entree: 0,
        cumul_qte_sortie: 0,
        cumul_val_sortie: 0,
        dernier_stock_qte: 0,
        dernier_stock_val: 0,
        dernier_mois: '',
      };
    }

    const art = articleMap[code];
    const mNum = r.mois_num || Number(r.mois.split('.')[0]);
    art.monthsData[r.mois] = {
      mois: r.mois,
      annee: r.annee,
      mois_num: mNum,
      qte_entree: Number(r.qte_entree || 0),
      qte_sortie: Number(r.qte_sortie || 0),
      qte_stock: Number(r.qte_stock || 0),
      val_entree: Number(r.val_entree || 0),
      val_sortie: Number(r.val_sortie || 0),
      val_stock: Number(r.val_stock || 0),
    };

    // Accumulate up to selected cutoff month
    if (!upToMonth || mNum <= upToMonthNum) {
      art.cumul_qte_entree += Number(r.qte_entree || 0);
      art.cumul_val_entree += Number(r.val_entree || 0);
      art.cumul_qte_sortie += Number(r.qte_sortie || 0);
      art.cumul_val_sortie += Number(r.val_sortie || 0);
    }
  });

  // Calculate final stock & initial stock (from previous year) for each article
  Object.values(articleMap).forEach((art) => {
    // Final stock at cutoff point
    const eligibleMonths = upToMonth
      ? allMonths.filter((m) => (parseInt(m.split('.')[0], 10) || 0) <= upToMonthNum)
      : allMonths;

    for (let i = eligibleMonths.length - 1; i >= 0; i--) {
      const m = eligibleMonths[i];
      if (art.monthsData[m]) {
        art.dernier_stock_qte = art.monthsData[m].qte_stock;
        art.dernier_stock_val = art.monthsData[m].val_stock;
        art.dernier_mois = m;
        break;
      }
    }

    // Initial stock from N-1 (if data exists, otherwise empty/null)
    if (hasPreviousYearData) {
      const prevRec = prevYearRecords.find(
        (r) => r.code_article.trim() === art.code_article.trim() && r.mois === lastPrevMonth
      );
      art.stock_initial_qte = prevRec ? Number(prevRec.qte_stock || 0) : 0;
      art.stock_initial_val = prevRec ? Number(prevRec.val_stock || 0) : 0;
      art.has_previous_year_data = true;
      art.total_disponible_qte = (art.stock_initial_qte || 0) + art.cumul_qte_entree;
      art.total_disponible_val = (art.stock_initial_val || 0) + art.cumul_val_entree;
    } else {
      art.stock_initial_qte = null;
      art.stock_initial_val = null;
      art.has_previous_year_data = false;
      art.total_disponible_qte = null;
      art.total_disponible_val = null;
    }
  });


  // User Business Rule: Retain all articles that have activity (production > 0, sales > 0, stock > 0, or initial stock > 0),
  // as well as key tracked calibres (DN 25 and DN 15 Export).
  const retainedArticles = Object.values(articleMap).filter((art) => {
    const isDN25 = (art.famille_diametre || '').toUpperCase().includes('DN 25') ||
                   (art.famille_diametre || '').toUpperCase().includes('DN25') ||
                   extractDiameter(`${art.code_article} ${art.designation}`).toUpperCase().includes('DN 25');
    const isExportDN15 = (art.famille_diametre || '').toUpperCase().includes('EXPORT') ||
                         isExportMeterArticle(`${art.code_article} ${art.designation}`, art.code_article);
    const hasActivity =
      art.cumul_qte_entree > 0 ||
      art.cumul_qte_sortie > 0 ||
      art.dernier_stock_qte > 0 ||
      (art.stock_initial_qte !== null && art.stock_initial_qte !== undefined && art.stock_initial_qte > 0);
    return hasActivity || isDN25 || isExportDN15;
  });

  // Group Retained Articles by Diameter (DN 15, DN 20, ...)
  const groupMap: Record<string, ProductionDiameterGroup> = {};

  retainedArticles.forEach((art) => {
    const diam = art.famille_diametre || 'Autres';
    if (!groupMap[diam]) {
      groupMap[diam] = {
        famille_diametre: diam,
        modelCount: 0,
        articles: [],
        monthsData: {},
        stock_initial_qte: hasPreviousYearData ? 0 : null,
        stock_initial_val: hasPreviousYearData ? 0 : null,
        has_previous_year_data: hasPreviousYearData,
        total_disponible_qte: hasPreviousYearData ? 0 : null,
        total_disponible_val: hasPreviousYearData ? 0 : null,
        cumul_qte_entree: 0,
        cumul_val_entree: 0,
        cumul_qte_sortie: 0,
        cumul_val_sortie: 0,
        dernier_stock_qte: 0,
        dernier_stock_val: 0,
        dernier_mois: '',
      };

      // Initialize all month keys
      allMonths.forEach((m) => {
        const [mNum, yNum] = m.split('.').map(Number);
        groupMap[diam].monthsData[m] = {
          mois: m,
          annee: yNum,
          mois_num: mNum,
          qte_entree: 0,
          qte_sortie: 0,
          qte_stock: 0,
          val_entree: 0,
          val_sortie: 0,
          val_stock: 0,
        };
      });
    }

    const grp = groupMap[diam];
    grp.modelCount += 1;
    grp.articles.push(art);

    if (hasPreviousYearData) {
      grp.stock_initial_qte = (grp.stock_initial_qte || 0) + (art.stock_initial_qte || 0);
      grp.stock_initial_val = (grp.stock_initial_val || 0) + (art.stock_initial_val || 0);
    }

    grp.cumul_qte_entree += art.cumul_qte_entree;
    grp.cumul_val_entree += art.cumul_val_entree;
    grp.cumul_qte_sortie += art.cumul_qte_sortie;
    grp.cumul_val_sortie += art.cumul_val_sortie;
    grp.dernier_stock_qte += art.dernier_stock_qte;
    grp.dernier_stock_val += art.dernier_stock_val;

    if (hasPreviousYearData) {
      grp.total_disponible_qte = (grp.stock_initial_qte || 0) + grp.cumul_qte_entree;
      grp.total_disponible_val = (grp.stock_initial_val || 0) + grp.cumul_val_entree;
    }

    // Sum monthly points
    allMonths.forEach((m) => {
      if (art.monthsData[m]) {
        grp.monthsData[m].qte_entree += art.monthsData[m].qte_entree;
        grp.monthsData[m].qte_sortie += art.monthsData[m].qte_sortie;
        grp.monthsData[m].qte_stock += art.monthsData[m].qte_stock;
        grp.monthsData[m].val_entree += art.monthsData[m].val_entree;
        grp.monthsData[m].val_sortie += art.monthsData[m].val_sortie;
        grp.monthsData[m].val_stock += art.monthsData[m].val_stock;
      }
    });
  });

  // Sort groups by standard diameter sequence
  const groups = Object.values(groupMap).sort((a, b) => {
    const orderA = DIAMETER_ORDER[a.famille_diametre] || 50;
    const orderB = DIAMETER_ORDER[b.famille_diametre] || 50;
    return orderA - orderB;
  });

  // Sort articles inside each group by production descending, then by stock
  groups.forEach((g) => {
    g.articles.sort((a, b) => (b.cumul_qte_entree - a.cumul_qte_entree) || (b.dernier_stock_qte - a.dernier_stock_qte));
  });

  // Calculate Overall Totals
  const totals = {
    cumul_qte_entree: 0,
    cumul_val_entree: 0,
    cumul_qte_sortie: 0,
    cumul_val_sortie: 0,
    dernier_stock_qte: 0,
    dernier_stock_val: 0,
    stock_initial_qte: hasPreviousYearData ? 0 : (null as number | null),
    stock_initial_val: hasPreviousYearData ? 0 : (null as number | null),
    total_disponible_qte: hasPreviousYearData ? 0 : (null as number | null),
    total_disponible_val: hasPreviousYearData ? 0 : (null as number | null),
    has_previous_year_data: hasPreviousYearData,
    previous_year: previousYear,
    current_year: currentYear,
    monthsTotals: {} as Record<string, ProductionMonthlyDataPoint>,
  };

  allMonths.forEach((m) => {
    const [mNum, yNum] = m.split('.').map(Number);
    totals.monthsTotals[m] = {
      mois: m,
      annee: yNum,
      mois_num: mNum,
      qte_entree: 0,
      qte_sortie: 0,
      qte_stock: 0,
      val_entree: 0,
      val_sortie: 0,
      val_stock: 0,
    };
  });

  groups.forEach((g) => {
    if (hasPreviousYearData && totals.stock_initial_qte !== null && totals.stock_initial_val !== null) {
      totals.stock_initial_qte += g.stock_initial_qte || 0;
      totals.stock_initial_val += g.stock_initial_val || 0;
    }
    totals.cumul_qte_entree += g.cumul_qte_entree;
    totals.cumul_val_entree += g.cumul_val_entree;
    totals.cumul_qte_sortie += g.cumul_qte_sortie;
    totals.cumul_val_sortie += g.cumul_val_sortie;
    totals.dernier_stock_qte += g.dernier_stock_qte;
    totals.dernier_stock_val += g.dernier_stock_val;

    allMonths.forEach((m) => {
      if (g.monthsData[m]) {
        totals.monthsTotals[m].qte_entree += g.monthsData[m].qte_entree;
        totals.monthsTotals[m].qte_sortie += g.monthsData[m].qte_sortie;
        totals.monthsTotals[m].qte_stock += g.monthsData[m].qte_stock;
        totals.monthsTotals[m].val_entree += g.monthsData[m].val_entree;
        totals.monthsTotals[m].val_sortie += g.monthsData[m].val_sortie;
        totals.monthsTotals[m].val_stock += g.monthsData[m].val_stock;
      }
    });
  });

  if (hasPreviousYearData && totals.stock_initial_qte !== null && totals.stock_initial_val !== null) {
    totals.total_disponible_qte = totals.stock_initial_qte + totals.cumul_qte_entree;
    totals.total_disponible_val = totals.stock_initial_val + totals.cumul_val_entree;
  }

  return {
    groups,
    allMonths,
    distinctYears,
    totals,
    hasPreviousYearData,
    previousYear,
    articleCount: retainedArticles.length,
    articles: retainedArticles,
  };
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Calculates the last DATA update date & time for the specified year (defaults to current year 2026).
 * Returns exact database last update timestamp (e.g. "18/08/2026 10:15")
 * or last month arrêté (e.g. "Arrêté à Août 2026") based on the actual imported database records.
 */
export function getLatestProductionUpdateTime(
  records: ProductionMonthlyRecord[],
  targetYear: number = new Date().getFullYear()
): string {
  if (!records || records.length === 0) {
    return `Aucune donnée ${targetYear}`;
  }

  const currentYearRecs = records.filter((r) => r.annee === targetYear);
  const searchPool = currentYearRecs.length > 0 ? currentYearRecs : records;
  const effectiveYear = currentYearRecs.length > 0 ? targetYear : searchPool[0]?.annee || targetYear;

  // 1. Find max updated_at / created_at timestamp in database records
  let maxTimestamp = 0;
  let latestDate: Date | null = null;

  for (const r of searchPool) {
    const rawDate = r.updated_at || r.created_at;
    if (rawDate) {
      const d = new Date(rawDate);
      const t = d.getTime();
      if (!isNaN(t) && t > maxTimestamp) {
        maxTimestamp = t;
        latestDate = d;
      }
    }
  }

  if (latestDate) {
    const day = String(latestDate.getDate()).padStart(2, '0');
    const month = String(latestDate.getMonth() + 1).padStart(2, '0');
    const year = latestDate.getFullYear();
    const hours = String(latestDate.getHours()).padStart(2, '0');
    const mins = String(latestDate.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }

  // 2. Fallback: Find max month number for effective year
  const distinctMonths = Array.from(new Set(searchPool.map((r) => Number(r.mois_num || 0))))
    .filter((m) => m > 0)
    .sort((a, b) => b - a);

  if (distinctMonths.length > 0) {
    const lastMonthNum = distinctMonths[0];
    const monthName = MONTH_NAMES_FR[lastMonthNum - 1] || `Mois ${lastMonthNum}`;
    return `Arrêté à ${monthName} ${effectiveYear}`;
  }

  return `Exercice ${effectiveYear}`;
}

/**
 * Finds the latest year and latest month present in production records.
 * For example, if records has data up to 10.2026, returns { year: 2026, monthStr: '10.2026', monthNum: 10 }.
 */
export function getLatestRecordPeriod(records: ProductionMonthlyRecord[]): {
  year: number;
  monthStr: string;
  monthNum: number;
} {
  const defaultYear = new Date().getFullYear();
  if (!records || records.length === 0) {
    return {
      year: defaultYear,
      monthStr: `01.${defaultYear}`,
      monthNum: 1,
    };
  }

  let maxYear = 0;
  let maxMonthNum = 0;
  let maxMonthStr = '';

  records.forEach((r) => {
    const y = Number(r.annee);
    const mNum = r.mois_num || (r.mois ? parseInt(r.mois.split('.')[0], 10) : 0);
    if (y > maxYear || (y === maxYear && mNum > maxMonthNum)) {
      maxYear = y;
      maxMonthNum = mNum;
      maxMonthStr = r.mois || `${String(mNum).padStart(2, '0')}.${y}`;
    }
  });

  if (maxYear === 0) {
    maxYear = defaultYear;
    maxMonthNum = 1;
    maxMonthStr = `01.${defaultYear}`;
  }

  if (!maxMonthStr) {
    maxMonthStr = `${String(maxMonthNum || 1).padStart(2, '0')}.${maxYear}`;
  }

  return {
    year: maxYear,
    monthStr: maxMonthStr,
    monthNum: maxMonthNum || 1,
  };
}

/**
 * Extracts all unique years from production records sorted in descending order (e.g. [2027, 2026, 2025, 2024])
 */
export function getAvailableYears(records: ProductionMonthlyRecord[]): number[] {
  if (!records || records.length === 0) return [new Date().getFullYear()];
  const set = new Set<number>();
  records.forEach((r) => {
    if (r.annee) set.add(Number(r.annee));
  });
  const list = Array.from(set).sort((a, b) => b - a);
  return list.length > 0 ? list : [new Date().getFullYear()];
}

/**
 * Extracts available distinct months for a given year (or all years if unspecified)
 */
export function getAvailableMonthsForYear(
  records: ProductionMonthlyRecord[],
  year?: number
): { monthNum: number; monthStr: string; label: string }[] {
  const filtered = year ? records.filter((r) => r.annee === year) : records;
  const map = new Map<number, { monthNum: number; monthStr: string; label: string }>();

  filtered.forEach((r) => {
    const mNum = r.mois_num || (r.mois ? parseInt(r.mois.split('.')[0], 10) : 0);
    if (mNum >= 1 && mNum <= 12 && !map.has(mNum)) {
      const padded = String(mNum).padStart(2, '0');
      map.set(mNum, {
        monthNum: mNum,
        monthStr: r.mois || (year ? `${padded}.${year}` : padded),
        label: `${getMonthName(mNum)} (${padded})`,
      });
    }
  });

  // Sort months 1 to 12
  return Array.from(map.values()).sort((a, b) => a.monthNum - b.monthNum);
}

/**
 * Helper to calculate variance (diff) and growth percentage safely
 */
function calcVariation(valN: number, valN1: number): { diff: number; pct: number } {
  const diff = (valN || 0) - (valN1 || 0);
  let pct = 0;
  if (valN1 && valN1 > 0) {
    pct = Number(((diff / valN1) * 100).toFixed(1));
  } else if (valN && valN > 0) {
    pct = 100.0; // New production from 0 baseline
  } else if (valN1 && valN1 < 0) {
    pct = Number(((diff / Math.abs(valN1)) * 100).toFixed(1));
  } else {
    pct = 0.0;
  }
  return { diff, pct };
}

/**
 * Aggregates comparative Year-over-Year (N vs N-1) production data:
 * - Month N vs Month N-1 (same month)
 * - Cumul YTD N vs Cumul YTD N-1 (from month 1 up to cutoffMonthNum)
 * - Calculates diffs and % evolutions for Quantities and Values across Calibres and Articles.
 */
export function aggregateComparativeProduction(
  records: ProductionMonthlyRecord[],
  yearN: number,
  yearN1: number,
  cutoffMonthNum: number = 12
): ProductionComparativeSummary {
  const distinctYears = getAvailableYears(records);

  // Group by article first
  const articleMap: Record<string, {
    code_article: string;
    designation: string;
    famille_diametre: string;
    unite: string;
    // Month data
    month_qte_N: number;
    month_val_N: number;
    month_qte_N1: number;
    month_val_N1: number;
    // Cumul data
    cumul_qte_N: number;
    cumul_val_N: number;
    cumul_qte_N1: number;
    cumul_val_N1: number;
    // Latest stock
    stock_qte_N: number;
    stock_val_N: number;
  }> = {};

  records.forEach((r) => {
    const annee = Number(r.annee);
    if (annee !== yearN && annee !== yearN1) return;

    const code = r.code_article.trim();
    if (!articleMap[code]) {
      const fam = isExportMeterArticle(`${code} ${r.designation}`, code)
        ? 'DN 15 (Export)'
        : (r.famille_diametre && r.famille_diametre !== 'DN 15'
            ? r.famille_diametre
            : extractDiameter(`${code} ${r.designation}`, code));

      articleMap[code] = {
        code_article: code,
        designation: r.designation,
        famille_diametre: fam,
        unite: r.unite || 'PCE',
        month_qte_N: 0,
        month_val_N: 0,
        month_qte_N1: 0,
        month_val_N1: 0,
        cumul_qte_N: 0,
        cumul_val_N: 0,
        cumul_qte_N1: 0,
        cumul_val_N1: 0,
        stock_qte_N: 0,
        stock_val_N: 0,
      };
    }

    const art = articleMap[code];
    const mNum = r.mois_num || (r.mois ? parseInt(r.mois.split('.')[0], 10) : 0);
    const qteEntree = Number(r.qte_entree || 0);
    const valEntree = Number(r.val_entree || 0);
    const qteStock = Number(r.qte_stock || 0);
    const valStock = Number(r.val_stock || 0);

    if (annee === yearN) {
      if (mNum === cutoffMonthNum) {
        art.month_qte_N += qteEntree;
        art.month_val_N += valEntree;
        art.stock_qte_N = qteStock;
        art.stock_val_N = valStock;
      }
      if (mNum <= cutoffMonthNum) {
        art.cumul_qte_N += qteEntree;
        art.cumul_val_N += valEntree;
      }
    } else if (annee === yearN1) {
      if (mNum === cutoffMonthNum) {
        art.month_qte_N1 += qteEntree;
        art.month_val_N1 += valEntree;
      }
      if (mNum <= cutoffMonthNum) {
        art.cumul_qte_N1 += qteEntree;
        art.cumul_val_N1 += valEntree;
      }
    }
  });

  // Filter retained articles (has production in N or N-1 or is DN 25 / DN 15 Export)
  const retainedArticles: ProductionComparativeArticle[] = Object.values(articleMap)
    .filter((a) => {
      const isDN25 = (a.famille_diametre || '').toUpperCase().includes('DN 25') ||
                     (a.famille_diametre || '').toUpperCase().includes('DN25') ||
                     extractDiameter(`${a.code_article} ${a.designation}`).toUpperCase().includes('DN 25');
      const isExportDN15 = (a.famille_diametre || '').toUpperCase().includes('EXPORT') ||
                           isExportMeterArticle(`${a.code_article} ${a.designation}`, a.code_article);
      const hasProd = a.cumul_qte_N > 0 || a.cumul_qte_N1 > 0 || a.month_qte_N > 0 || a.month_qte_N1 > 0 || a.stock_qte_N > 0;
      return hasProd || isDN25 || isExportDN15;
    })
    .map((a) => {
      const monthQteVar = calcVariation(a.month_qte_N, a.month_qte_N1);
      const monthValVar = calcVariation(a.month_val_N, a.month_val_N1);
      const cumulQteVar = calcVariation(a.cumul_qte_N, a.cumul_qte_N1);
      const cumulValVar = calcVariation(a.cumul_val_N, a.cumul_val_N1);

      return {
        code_article: a.code_article,
        designation: a.designation,
        famille_diametre: a.famille_diametre,
        unite: a.unite,
        qte: {
          month_val_N: a.month_qte_N,
          month_val_N1: a.month_qte_N1,
          month_diff: monthQteVar.diff,
          month_growth_pct: monthQteVar.pct,
          cumul_val_N: a.cumul_qte_N,
          cumul_val_N1: a.cumul_qte_N1,
          cumul_diff: cumulQteVar.diff,
          cumul_growth_pct: cumulQteVar.pct,
        },
        val: {
          month_val_N: a.month_val_N,
          month_val_N1: a.month_val_N1,
          month_diff: monthValVar.diff,
          month_growth_pct: monthValVar.pct,
          cumul_val_N: a.cumul_val_N,
          cumul_val_N1: a.cumul_val_N1,
          cumul_diff: cumulValVar.diff,
          cumul_growth_pct: cumulValVar.pct,
        },
        stock_qte_N: a.stock_qte_N,
        stock_val_N: a.stock_val_N,
      };
    });

  // Group by Diameter
  const groupMap: Record<string, ProductionComparativeGroup> = {};

  retainedArticles.forEach((art) => {
    const diam = art.famille_diametre || 'Autres';
    if (!groupMap[diam]) {
      groupMap[diam] = {
        famille_diametre: diam,
        modelCount: 0,
        articles: [],
        qte: {
          month_val_N: 0,
          month_val_N1: 0,
          month_diff: 0,
          month_growth_pct: 0,
          cumul_val_N: 0,
          cumul_val_N1: 0,
          cumul_diff: 0,
          cumul_growth_pct: 0,
        },
        val: {
          month_val_N: 0,
          month_val_N1: 0,
          month_diff: 0,
          month_growth_pct: 0,
          cumul_val_N: 0,
          cumul_val_N1: 0,
          cumul_diff: 0,
          cumul_growth_pct: 0,
        },
        stock_qte_N: 0,
        stock_val_N: 0,
      };
    }

    const grp = groupMap[diam];
    grp.modelCount += 1;
    grp.articles.push(art);

    grp.qte.month_val_N += art.qte.month_val_N;
    grp.qte.month_val_N1 += art.qte.month_val_N1;
    grp.qte.cumul_val_N += art.qte.cumul_val_N;
    grp.qte.cumul_val_N1 += art.qte.cumul_val_N1;

    grp.val.month_val_N += art.val.month_val_N;
    grp.val.month_val_N1 += art.val.month_val_N1;
    grp.val.cumul_val_N += art.val.cumul_val_N;
    grp.val.cumul_val_N1 += art.val.cumul_val_N1;

    grp.stock_qte_N += art.stock_qte_N;
    grp.stock_val_N += art.stock_val_N;
  });

  // Compute variations for each group
  Object.values(groupMap).forEach((grp) => {
    const mQVar = calcVariation(grp.qte.month_val_N, grp.qte.month_val_N1);
    grp.qte.month_diff = mQVar.diff;
    grp.qte.month_growth_pct = mQVar.pct;

    const cQVar = calcVariation(grp.qte.cumul_val_N, grp.qte.cumul_val_N1);
    grp.qte.cumul_diff = cQVar.diff;
    grp.qte.cumul_growth_pct = cQVar.pct;

    const mVVar = calcVariation(grp.val.month_val_N, grp.val.month_val_N1);
    grp.val.month_diff = mVVar.diff;
    grp.val.month_growth_pct = mVVar.pct;

    const cVVar = calcVariation(grp.val.cumul_val_N, grp.val.cumul_val_N1);
    grp.val.cumul_diff = cVVar.diff;
    grp.val.cumul_growth_pct = cVVar.pct;

    // Sort articles inside group by cumul production N desc
    grp.articles.sort((a, b) => b.qte.cumul_val_N - a.qte.cumul_val_N || b.stock_qte_N - a.stock_qte_N);
  });

  // Sort groups by standard diameter sequence
  const groups = Object.values(groupMap).sort((a, b) => {
    const orderA = DIAMETER_ORDER[a.famille_diametre] || 50;
    const orderB = DIAMETER_ORDER[b.famille_diametre] || 50;
    return orderA - orderB;
  });

  // Calculate Overall Grand Totals
  const totalQteN = groups.reduce((acc, g) => acc + g.qte.month_val_N, 0);
  const totalQteN1 = groups.reduce((acc, g) => acc + g.qte.month_val_N1, 0);
  const totalCumulQteN = groups.reduce((acc, g) => acc + g.qte.cumul_val_N, 0);
  const totalCumulQteN1 = groups.reduce((acc, g) => acc + g.qte.cumul_val_N1, 0);

  const totalValN = groups.reduce((acc, g) => acc + g.val.month_val_N, 0);
  const totalValN1 = groups.reduce((acc, g) => acc + g.val.month_val_N1, 0);
  const totalCumulValN = groups.reduce((acc, g) => acc + g.val.cumul_val_N, 0);
  const totalCumulValN1 = groups.reduce((acc, g) => acc + g.val.cumul_val_N1, 0);

  const totalStockQteN = groups.reduce((acc, g) => acc + g.stock_qte_N, 0);
  const totalStockValN = groups.reduce((acc, g) => acc + g.stock_val_N, 0);

  const totalMonthQVar = calcVariation(totalQteN, totalQteN1);
  const totalCumulQVar = calcVariation(totalCumulQteN, totalCumulQteN1);
  const totalMonthVVar = calcVariation(totalValN, totalValN1);
  const totalCumulVVar = calcVariation(totalCumulValN, totalCumulValN1);

  return {
    yearN,
    yearN1,
    cutoffMonthNum,
    cutoffMonthStr: getMonthName(cutoffMonthNum),
    groups,
    totals: {
      qte: {
        month_val_N: totalQteN,
        month_val_N1: totalQteN1,
        month_diff: totalMonthQVar.diff,
        month_growth_pct: totalMonthQVar.pct,
        cumul_val_N: totalCumulQteN,
        cumul_val_N1: totalCumulQteN1,
        cumul_diff: totalCumulQVar.diff,
        cumul_growth_pct: totalCumulQVar.pct,
      },
      val: {
        month_val_N: totalValN,
        month_val_N1: totalValN1,
        month_diff: totalMonthVVar.diff,
        month_growth_pct: totalMonthVVar.pct,
        cumul_val_N: totalCumulValN,
        cumul_val_N1: totalCumulValN1,
        cumul_diff: totalCumulVVar.diff,
        cumul_growth_pct: totalCumulVVar.pct,
      },
      stock_qte_N: totalStockQteN,
      stock_val_N: totalStockValN,
    },
    distinctYears,
  };
}
