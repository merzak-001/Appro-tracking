import sql from 'mssql/msnodesqlv8';
import { getPool, isSqlServerConnected } from './connection';
import { ProductionMonthlyRecord, ProductionBudgetItem, ProductionMonthlyNote } from '../types';
import { getStore, saveStore } from '../../server/config/store';
import { extractDiameter, isExportMeterArticle } from '../utils/productionUtils';


/* =========================================================================
   PRODUCTION MONTHLY MCBA (SQL SERVER & STORE ADAPTER)
   ========================================================================= */

/**
 * Filter helper: removes any item that has 0 annual production (qte_entree = 0)
 * throughout the entire year, keeping ONLY DN 25 and DN 15 (Export) even if they have zero production.
 */
export function filterZeroProductionRecords(records: ProductionMonthlyRecord[]): ProductionMonthlyRecord[] {
  if (!records || records.length === 0) return [];

  // Group by (code_article, annee) to calculate annual total entree
  const articleYearEntree: Record<string, number> = {};
  records.forEach((r) => {
    const key = `${(r.code_article || '').trim()}_${r.annee || 2026}`;
    articleYearEntree[key] = (articleYearEntree[key] || 0) + Number(r.qte_entree || 0);
  });

  return records.filter((r) => {
    const key = `${(r.code_article || '').trim()}_${r.annee || 2026}`;
    const totalEntree = articleYearEntree[key] || 0;
    const fam = (r.famille_diametre || extractDiameter(`${r.code_article} ${r.designation}`, r.code_article)).toUpperCase();
    const isDN25 = fam.includes('DN 25') || fam.includes('DN25');
    const isExportDN15 = fam.includes('EXPORT') || isExportMeterArticle(`${r.code_article} ${r.designation}`, r.code_article);

    // Keep if it has produced during the year OR if it belongs to DN 25 / DN 15 (Export)
    return totalEntree > 0 || isDN25 || isExportDN15;
  });
}

/**
 * Fetch all monthly production records, optionally filtered by year.
 */
export async function dbGetProductionMonthly(year?: number): Promise<ProductionMonthlyRecord[]> {
  const pool = getPool();
  if (isSqlServerConnected() && pool) {
    try {
      let query = `
        SELECT 
          ID as id,
          Code_Article as code_article,
          Designation as designation,
          Famille_Diametre as famille_diametre,
          Mois as mois,
          Annee as annee,
          Mois_Num as mois_num,
          Qte_Entree as qte_entree,
          Qte_Sortie as qte_sortie,
          Qte_Stock as qte_stock,
          Val_Entree as val_entree,
          Val_Sortie as val_sortie,
          Val_Stock as val_stock,
          Unite as unite,
          Magasin as magasin,
          Division as division,
          Type_Article as type_article,
          Groupe_Marchandises as groupe_marchandises,
          Created_At as created_at,
          Updated_At as updated_at
        FROM dbo.Production_Monthly_MCBA
      `;

      const request = pool.request();
      if (year) {
        query += ' WHERE Annee = @year';
        request.input('year', sql.Int, year);
      }
      query += ' ORDER BY Annee ASC, Mois_Num ASC, Famille_Diametre ASC, Code_Article ASC';

      const result = await request.query(query);
      const mapped = result.recordset.map((row: any) => ({
        ...row,
        qte_entree: Number(row.qte_entree) || 0,
        qte_sortie: Number(row.qte_sortie) || 0,
        qte_stock: Number(row.qte_stock) || 0,
        val_entree: Number(row.val_entree) || 0,
        val_sortie: Number(row.val_sortie) || 0,
        val_stock: Number(row.val_stock) || 0,
      }));

      return filterZeroProductionRecords(mapped);
    } catch (err) {
      console.error('[MSSQL] Error fetching production monthly records:', err);
    }
  }

  // Fallback to local store
  const store = getStore();
  const list: ProductionMonthlyRecord[] = (store as any).production_monthly_mcba || [];
  const filteredList = filterZeroProductionRecords(list);
  if (year) {
    return filteredList.filter((r) => r.annee === year);
  }
  return filteredList;
}

/**
 * Bulk import / replace monthly production records into MSSQL & .data_store.json.
 * Targeted replacement: ONLY the month(s) and year(s) present in the uploaded file
 * are replaced. All other existing months in the database are safely preserved.
 */
export async function dbImportProductionMonthly(
  records: ProductionMonthlyRecord[],
  replace: boolean = true
): Promise<{ count: number; distinctArticles: number; months: string[] }> {
  if (!records || records.length === 0) {
    return { count: 0, distinctArticles: 0, months: [] };
  }

  // 1. Ensure diametre & dates are well-formed and filter completely empty rows
  const normalizedRecords: ProductionMonthlyRecord[] = records
    .filter((r) => (r.code_article && r.code_article.trim()) || (r.designation && r.designation.trim()))
    .map((r) => {
      const mois = (r.mois || '').trim();
      let annee = Number(r.annee);
      let moisNum = Number(r.mois_num);

      if ((!annee || !moisNum) && mois.includes('.')) {
        const parts = mois.split('.');
        moisNum = Number(parts[0]) || 1;
        annee = Number(parts[1]) || 2026;
      }

      const code = (r.code_article || '').trim();
      const des = (r.designation || '').trim();
      const fam = isExportMeterArticle(`${code} ${des}`, code)
        ? 'DN 15 (Export)'
        : (r.famille_diametre && r.famille_diametre !== 'DN 15' ? r.famille_diametre : extractDiameter(`${code} ${des}`, code));

      return {
        ...r,
        code_article: code,
        designation: des,
        famille_diametre: fam,
        mois,
        annee: annee || 2026,
        mois_num: moisNum || 1,
        qte_entree: Number(r.qte_entree) || 0,
        qte_sortie: Number(r.qte_sortie) || 0,
        qte_stock: Number(r.qte_stock) || 0,
        val_entree: Number(r.val_entree) || 0,
        val_sortie: Number(r.val_sortie) || 0,
        val_stock: Number(r.val_stock) || 0,
        unite: r.unite || 'PCE',
        magasin: r.magasin || '866034',
        division: r.division || '8660',
        type_article: r.type_article || 'FERT',
        groupe_marchandises: r.groupe_marchandises || '',
      };
    });

  const cleanRecords = normalizedRecords;

  // Extract all distinct periods (Year + Month) present in the uploaded file
  interface UploadPeriod {
    annee: number;
    moisNum: number;
    mois: string;
  }
  const periodMap = new Map<string, UploadPeriod>();
  cleanRecords.forEach((r) => {
    const mNum = r.mois_num || (r.mois ? parseInt(r.mois.split('.')[0], 10) : 1);
    const key = `${r.annee}_${mNum}_${r.mois}`;
    if (!periodMap.has(key)) {
      periodMap.set(key, {
        annee: r.annee,
        moisNum: mNum,
        mois: r.mois,
      });
    }
  });

  const uploadedPeriods = Array.from(periodMap.values());
  const distinctMonths = Array.from(new Set(cleanRecords.map((r) => r.mois)));
  const distinctArticles = Array.from(new Set(cleanRecords.map((r) => r.code_article)));

  const pool = getPool();
  if (isSqlServerConnected() && pool) {
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      // Targeted deletion: ONLY delete records for the uploaded months/periods
      // All other months (e.g. Jan-Aug) remain completely untouched in the DB
      if (replace && uploadedPeriods.length > 0) {
        const delReq = new sql.Request(transaction);
        const periodClauses: string[] = [];
        uploadedPeriods.forEach((p, idx) => {
          delReq.input(`del_yr_${idx}`, sql.Int, p.annee);
          delReq.input(`del_mn_${idx}`, sql.Int, p.moisNum);
          delReq.input(`del_mstr_${idx}`, sql.NVarChar(20), p.mois);
          periodClauses.push(
            `(Annee = @del_yr_${idx} AND (Mois_Num = @del_mn_${idx} OR Mois = @del_mstr_${idx}))`
          );
        });

        const deleteSql = `DELETE FROM dbo.Production_Monthly_MCBA WHERE ${periodClauses.join(' OR ')}`;
        await delReq.query(deleteSql);
        console.log(
          `[MSSQL] Cleared existing records exclusively for ${uploadedPeriods.length} uploaded period(s): ${uploadedPeriods
            .map((p) => `${p.moisNum}/${p.annee}`)
            .join(', ')}`
        );
      }

      // Batch insert in chunks of 100 to stay well within parameter limits
      const CHUNK_SIZE = 100;
      for (let i = 0; i < cleanRecords.length; i += CHUNK_SIZE) {
        const chunk = cleanRecords.slice(i, i + CHUNK_SIZE);
        const insertReq = new sql.Request(transaction);

        const valueClauses: string[] = [];
        chunk.forEach((rec, idx) => {
          insertReq.input(`c_${idx}`, sql.NVarChar(50), rec.code_article);
          insertReq.input(`d_${idx}`, sql.NVarChar(255), rec.designation);
          insertReq.input(`fd_${idx}`, sql.NVarChar(50), rec.famille_diametre);
          insertReq.input(`m_${idx}`, sql.NVarChar(20), rec.mois);
          insertReq.input(`a_${idx}`, sql.Int, rec.annee);
          insertReq.input(`mn_${idx}`, sql.Int, rec.mois_num);
          insertReq.input(`qe_${idx}`, sql.Decimal(18, 4), rec.qte_entree);
          insertReq.input(`qs_${idx}`, sql.Decimal(18, 4), rec.qte_sortie);
          insertReq.input(`qstk_${idx}`, sql.Decimal(18, 4), rec.qte_stock);
          insertReq.input(`ve_${idx}`, sql.Decimal(18, 2), rec.val_entree);
          insertReq.input(`vs_${idx}`, sql.Decimal(18, 2), rec.val_sortie);
          insertReq.input(`vstk_${idx}`, sql.Decimal(18, 2), rec.val_stock);
          insertReq.input(`u_${idx}`, sql.NVarChar(20), rec.unite);
          insertReq.input(`mag_${idx}`, sql.NVarChar(50), rec.magasin);
          insertReq.input(`div_${idx}`, sql.NVarChar(50), rec.division);
          insertReq.input(`ta_${idx}`, sql.NVarChar(50), rec.type_article);
          insertReq.input(`gm_${idx}`, sql.NVarChar(100), rec.groupe_marchandises);

          valueClauses.push(
            `(@c_${idx}, @d_${idx}, @fd_${idx}, @m_${idx}, @a_${idx}, @mn_${idx}, @qe_${idx}, @qs_${idx}, @qstk_${idx}, @ve_${idx}, @vs_${idx}, @vstk_${idx}, @u_${idx}, @mag_${idx}, @div_${idx}, @ta_${idx}, @gm_${idx}, GETDATE(), GETDATE())`
          );
        });

        const insertSql = `
          INSERT INTO dbo.Production_Monthly_MCBA (
            Code_Article, Designation, Famille_Diametre, Mois, Annee, Mois_Num,
            Qte_Entree, Qte_Sortie, Qte_Stock, Val_Entree, Val_Sortie, Val_Stock,
            Unite, Magasin, Division, Type_Article, Groupe_Marchandises, Created_At, Updated_At
          ) VALUES ${valueClauses.join(', ')}
        `;

        await insertReq.query(insertSql);
      }

      await transaction.commit();
      console.log(
        `[MSSQL] Successfully imported ${cleanRecords.length} monthly production records for periods: ${distinctMonths.join(', ')} (all other months preserved)!`
      );
    } catch (err) {
      console.error('[MSSQL] Error during production targeted import, rolling back:', err);
      try {
        await transaction.rollback();
      } catch (rbErr) {}
    }
  }

  // Update JSON Store fallback with targeted replacement
  const store = getStore();
  let currentList: ProductionMonthlyRecord[] = (store as any).production_monthly_mcba || [];
  if (replace) {
    currentList = currentList.filter((r) => {
      const rMoisNum = r.mois_num || (r.mois ? parseInt(r.mois.split('.')[0], 10) : 0);
      return !uploadedPeriods.some(
        (p) => p.annee === r.annee && (p.moisNum === rMoisNum || p.mois === r.mois)
      );
    });
  }
  (store as any).production_monthly_mcba = [...currentList, ...cleanRecords];
  saveStore(store);

  return {
    count: cleanRecords.length,
    distinctArticles: distinctArticles.length,
    months: distinctMonths,
  };
}

/**
 * Cleans out any zero-production articles (except DN 25) from both SQL Server and JSON store.
 */
export async function dbCleanZeroProductionRecords(year?: number): Promise<{ deletedArticles: number }> {
  const pool = getPool();
  if (isSqlServerConnected() && pool) {
    try {
      const request = pool.request();
      let query = `
        WITH ZeroProdArticles AS (
          SELECT Code_Article, Annee
          FROM dbo.Production_Monthly_MCBA
          GROUP BY Code_Article, Annee, Famille_Diametre
          HAVING SUM(Qte_Entree) = 0 
             AND Famille_Diametre NOT LIKE '%DN 25%' 
             AND Famille_Diametre NOT LIKE '%DN25%'
        )
        DELETE p
        FROM dbo.Production_Monthly_MCBA p
        INNER JOIN ZeroProdArticles z 
          ON p.Code_Article = z.Code_Article AND p.Annee = z.Annee
      `;
      if (year) {
        query += ' WHERE p.Annee = @year';
        request.input('year', sql.Int, year);
      }
      await request.query(query);
      console.log('[MSSQL] Zero-production cleanup executed successfully.');
    } catch (err) {
      console.error('[MSSQL] Error cleaning zero-production records:', err);
    }
  }

  // Clean JSON store
  const store = getStore();
  const currentList: ProductionMonthlyRecord[] = (store as any).production_monthly_mcba || [];
  const cleaned = filterZeroProductionRecords(currentList);
  (store as any).production_monthly_mcba = cleaned;
  saveStore(store);

  return { deletedArticles: currentList.length - cleaned.length };
}

/**
 * Clear or delete production monthly records by year and/or month, or entirely.
 */
export async function dbClearProductionMonthly(
  year?: number,
  mois?: string,
  moisNum?: number
): Promise<{ deletedCount: number }> {
  let deletedCount = 0;

  const pool = getPool();
  if (isSqlServerConnected() && pool) {
    try {
      const request = pool.request();
      let query = 'DELETE FROM dbo.Production_Monthly_MCBA';
      const whereClauses: string[] = [];

      if (year) {
        request.input('year', sql.Int, year);
        whereClauses.push('Annee = @year');
      }

      if (mois) {
        request.input('mois', sql.NVarChar(20), mois.trim());
        const numPart = parseInt(mois.split('.')[0], 10) || 0;
        request.input('moisNumFallback', sql.Int, numPart);
        whereClauses.push('(Mois = @mois OR Mois_Num = @moisNumFallback)');
      } else if (moisNum) {
        request.input('moisNum', sql.Int, moisNum);
        whereClauses.push('Mois_Num = @moisNum');
      }

      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      } else {
        query = 'TRUNCATE TABLE dbo.Production_Monthly_MCBA';
      }

      const res = await request.query(query);
      if (res.rowsAffected && res.rowsAffected[0]) {
        deletedCount = res.rowsAffected[0];
      }
      console.log(`[MSSQL] Cleared production monthly records (Year: ${year || 'ALL'}, Mois: ${mois || moisNum || 'ALL'})`);
    } catch (err) {
      console.error('[MSSQL] Error clearing production monthly records:', err);
    }
  }

  // Synchronize JSON store
  const store = getStore();
  const currentList: ProductionMonthlyRecord[] = (store as any).production_monthly_mcba || [];
  const beforeCount = currentList.length;

  let remainingList: ProductionMonthlyRecord[] = currentList;

  if (year || mois || moisNum) {
    remainingList = currentList.filter((r) => {
      if (year && r.annee === year) {
        if (mois) {
          const numPart = parseInt(mois.split('.')[0], 10) || 0;
          return r.mois !== mois && r.mois_num !== numPart;
        }
        if (moisNum) {
          return r.mois_num !== moisNum;
        }
        return false;
      }
      if (!year && mois) {
        return r.mois !== mois;
      }
      if (!year && moisNum) {
        return r.mois_num !== moisNum;
      }
      return true;
    });
  } else {
    remainingList = [];
  }

  (store as any).production_monthly_mcba = remainingList;
  saveStore(store);

  if (!deletedCount) {
    deletedCount = beforeCount - remainingList.length;
  }

  return { deletedCount };
}

/* =========================================================================
   PRODUCTION BUDGET & OPERATIONAL NOTES (TABLEAU DE BORD)
   ========================================================================= */

export const DEFAULT_PRODUCTION_BUDGETS: Record<
  string,
  { label: string; budget_qte: number; prix_unitaire_kda: number; prevision_cloture_qte?: number; is_export?: boolean }
> = {
  'DN 15': { label: '420PC DN15 (National)', budget_qte: 465000, prix_unitaire_kda: 4.38066, prevision_cloture_qte: 470062 },
  'DN 15 (Export)': { label: '420PC DN15 (Export - 420 015 L170)', budget_qte: 0, prix_unitaire_kda: 4.38066, prevision_cloture_qte: 0, is_export: true },
  'DN 20': { label: '420PC DN20', budget_qte: 10000, prix_unitaire_kda: 5.00000, prevision_cloture_qte: 7807 },
  'DN 30': { label: '420PC DN30', budget_qte: 950, prix_unitaire_kda: 14.30000, prevision_cloture_qte: 970 },
  'DN 40': { label: '420PC DN40', budget_qte: 1100, prix_unitaire_kda: 21.00000, prevision_cloture_qte: 1231 },
  'DN 50': { label: 'WPDN50', budget_qte: 600, prix_unitaire_kda: 29.18000, prevision_cloture_qte: 600 },
  'DN 65': { label: 'WPDN65', budget_qte: 300, prix_unitaire_kda: 31.39000, prevision_cloture_qte: 300 },
  'DN 80': { label: 'WPDN80', budget_qte: 250, prix_unitaire_kda: 36.80000, prevision_cloture_qte: 250 },
  'DN 100': { label: 'WPDN100', budget_qte: 200, prix_unitaire_kda: 44.00000, prevision_cloture_qte: 200 },
  'DN 125': { label: 'WPDN125', budget_qte: 150, prix_unitaire_kda: 52.15000, prevision_cloture_qte: 150 },
  'DN 150': { label: 'WPDN150', budget_qte: 125, prix_unitaire_kda: 78.90000, prevision_cloture_qte: 125 },
  'DN 25': { label: '420PC DN25', budget_qte: 0, prix_unitaire_kda: 0.00000, prevision_cloture_qte: 0 },
  'DN 200': { label: 'WPDN200', budget_qte: 0, prix_unitaire_kda: 0.00000, prevision_cloture_qte: 0 },
  'Autres': { label: 'Autres', budget_qte: 0, prix_unitaire_kda: 0.00000, prevision_cloture_qte: 0 },
};

let budgetTablesInitialized = false;

async function ensureBudgetAndNotesTables(pool: any) {
  if (budgetTablesInitialized) return;
  try {
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Production_Budget_MCBA')
      BEGIN
        CREATE TABLE dbo.Production_Budget_MCBA (
          ID INT IDENTITY(1,1) PRIMARY KEY,
          Annee INT NOT NULL,
          Famille_Diametre NVARCHAR(50) NOT NULL,
          Budget_Qte DECIMAL(18, 2) NOT NULL DEFAULT 0,
          Prix_Unitaire_KDA DECIMAL(18, 4) NOT NULL DEFAULT 0,
          Prevision_Cloture_Qte DECIMAL(18, 2) NULL,
          Updated_At DATETIME DEFAULT GETDATE(),
          CONSTRAINT UQ_Production_Budget_Year_Famille UNIQUE (Annee, Famille_Diametre)
        );
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Production_Budget_MCBA') AND name = 'Prevision_Cloture_Qte')
        BEGIN
          EXEC('ALTER TABLE dbo.Production_Budget_MCBA ADD Prevision_Cloture_Qte DECIMAL(18, 2) NULL');
        END
      END

      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Production_Notes_MCBA')
      BEGIN
        CREATE TABLE dbo.Production_Notes_MCBA (
          ID INT IDENTITY(1,1) PRIMARY KEY,
          Annee INT NOT NULL,
          Mois NVARCHAR(20) NOT NULL,
          Note NVARCHAR(MAX) NOT NULL,
          Updated_At DATETIME DEFAULT GETDATE(),
          CONSTRAINT UQ_Production_Notes_Year_Mois UNIQUE (Annee, Mois)
        );
      END
    `);
    budgetTablesInitialized = true;
  } catch (err) {
    console.error('[MSSQL] Error ensuring Production Budget & Notes tables:', err);
  }
}

/**
 * Get configured budgets & PU for a specific year.
 * Returns default values from product mois and seeds them if none exist yet.
 */
export async function dbGetProductionBudgets(year: number = 2026): Promise<ProductionBudgetItem[]> {
  const pool = getPool();
  if (isSqlServerConnected() && pool) {
    try {
      await ensureBudgetAndNotesTables(pool);
      const req = pool.request();
      req.input('annee', sql.Int, year);
      const result = await req.query(`
        SELECT 
          ID as id,
          Annee as annee,
          Famille_Diametre as famille_diametre,
          Budget_Qte as budget_qte,
          Prix_Unitaire_KDA as prix_unitaire_kda,
          Prevision_Cloture_Qte as prevision_cloture_qte,
          Updated_At as updated_at
        FROM dbo.Production_Budget_MCBA
        WHERE Annee = @annee
        ORDER BY ID ASC
      `);

      if (result.recordset && result.recordset.length > 0) {
        return result.recordset.map((r: any) => ({
          id: r.id,
          annee: Number(r.annee),
          famille_diametre: r.famille_diametre,
          budget_qte: Number(r.budget_qte) || 0,
          prix_unitaire_kda: Number(r.prix_unitaire_kda) || 0,
          prevision_cloture_qte: r.prevision_cloture_qte !== null && r.prevision_cloture_qte !== undefined ? Number(r.prevision_cloture_qte) : undefined,
          updated_at: r.updated_at,
        }));
      }
    } catch (err) {
      console.error('[MSSQL] Error getting production budgets:', err);
    }
  }

  // Fallback to local store
  const store = getStore();
  const list: ProductionBudgetItem[] = (store as any).production_budget_mcba || [];
  const forYear = list.filter((b) => b.annee === year);

  if (forYear.length > 0) {
    return forYear;
  }

  // Generate defaults for this year
  const defaults: ProductionBudgetItem[] = Object.entries(DEFAULT_PRODUCTION_BUDGETS).map(
    ([fam, cfg], idx) => ({
      id: idx + 1,
      annee: year,
      famille_diametre: fam,
      budget_qte: cfg.budget_qte,
      prix_unitaire_kda: cfg.prix_unitaire_kda,
      prevision_cloture_qte: cfg.prevision_cloture_qte,
      updated_at: new Date().toISOString(),
    })
  );

  // Auto-seed in background
  try {
    await dbSaveProductionBudgets(year, defaults);
  } catch (e) {
    console.error('Failed to auto-seed defaults:', e);
  }

  return defaults;
}

/**
 * Save or update budget items for a specific year.
 */
export async function dbSaveProductionBudgets(
  year: number,
  items: ProductionBudgetItem[]
): Promise<ProductionBudgetItem[]> {
  if (!items || items.length === 0) return [];

  const pool = getPool();
  if (isSqlServerConnected() && pool) {
    try {
      await ensureBudgetAndNotesTables(pool);
      for (const item of items) {
        const req = pool.request();
        req.input('annee', sql.Int, year);
        req.input('famille', sql.NVarChar(50), item.famille_diametre.trim());
        req.input('bqte', sql.Decimal(18, 2), Number(item.budget_qte) || 0);
        req.input('pu', sql.Decimal(18, 4), Number(item.prix_unitaire_kda) || 0);
        req.input('pcloture', sql.Decimal(18, 2), item.prevision_cloture_qte !== undefined ? Number(item.prevision_cloture_qte) : (Number(item.budget_qte) || 0));

        await req.query(`
          IF EXISTS (SELECT 1 FROM dbo.Production_Budget_MCBA WHERE Annee = @annee AND Famille_Diametre = @famille)
          BEGIN
            UPDATE dbo.Production_Budget_MCBA 
            SET Budget_Qte = @bqte, Prix_Unitaire_KDA = @pu, Prevision_Cloture_Qte = @pcloture, Updated_At = GETDATE()
            WHERE Annee = @annee AND Famille_Diametre = @famille;
          END
          ELSE
          BEGIN
            INSERT INTO dbo.Production_Budget_MCBA (Annee, Famille_Diametre, Budget_Qte, Prix_Unitaire_KDA, Prevision_Cloture_Qte, Updated_At)
            VALUES (@annee, @famille, @bqte, @pu, @pcloture, GETDATE());
          END
        `);
      }
      console.log(`[MSSQL] Saved ${items.length} budget items for year ${year}`);
    } catch (err) {
      console.error('[MSSQL] Error saving production budgets:', err);
    }
  }

  // Update store
  const store = getStore();
  const currentList: ProductionBudgetItem[] = (store as any).production_budget_mcba || [];
  const otherYears = currentList.filter((b) => b.annee !== year);

  const updatedItems: ProductionBudgetItem[] = items.map((it, idx) => ({
    id: it.id || idx + 1,
    annee: year,
    famille_diametre: it.famille_diametre,
    budget_qte: Number(it.budget_qte) || 0,
    prix_unitaire_kda: Number(it.prix_unitaire_kda) || 0,
    prevision_cloture_qte: it.prevision_cloture_qte !== undefined ? Number(it.prevision_cloture_qte) : undefined,
    updated_at: new Date().toISOString(),
  }));

  (store as any).production_budget_mcba = [...otherYears, ...updatedItems];
  saveStore(store);

  return updatedItems;
}


/**
 * Get monthly operational note (NB).
 */
export async function dbGetProductionNote(year: number, mois: string): Promise<string> {
  const normalizedMois = mois.trim();
  const pool = getPool();
  if (isSqlServerConnected() && pool) {
    try {
      await ensureBudgetAndNotesTables(pool);
      const req = pool.request();
      req.input('annee', sql.Int, year);
      req.input('mois', sql.NVarChar(20), normalizedMois);
      const res = await req.query(`
        SELECT Note as note
        FROM dbo.Production_Notes_MCBA
        WHERE Annee = @annee AND Mois = @mois
      `);
      if (res.recordset && res.recordset.length > 0) {
        return res.recordset[0].note || '';
      }
    } catch (err) {
      console.error('[MSSQL] Error getting production note:', err);
    }
  }

  const store = getStore();
  const notesList: ProductionMonthlyNote[] = (store as any).production_notes_mcba || [];
  const match = notesList.find((n) => n.annee === year && n.mois === normalizedMois);
  return match ? match.note : '';
}

/**
 * Save monthly operational note (NB).
 */
export async function dbSaveProductionNote(
  year: number,
  mois: string,
  note: string
): Promise<ProductionMonthlyNote> {
  const normalizedMois = mois.trim();
  const trimmedNote = (note || '').trim();

  const pool = getPool();
  if (isSqlServerConnected() && pool) {
    try {
      await ensureBudgetAndNotesTables(pool);
      const req = pool.request();
      req.input('annee', sql.Int, year);
      req.input('mois', sql.NVarChar(20), normalizedMois);
      req.input('note', sql.NVarChar(sql.MAX), trimmedNote);

      await req.query(`
        MERGE dbo.Production_Notes_MCBA AS target
        USING (SELECT @annee AS Annee, @mois AS Mois) AS source
        ON (target.Annee = source.Annee AND target.Mois = source.Mois)
        WHEN MATCHED THEN
          UPDATE SET Note = @note, Updated_At = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (Annee, Mois, Note, Updated_At)
          VALUES (@annee, @mois, @note, GETDATE());
      `);
      console.log(`[MSSQL] Saved production note for ${normalizedMois}`);
    } catch (err) {
      console.error('[MSSQL] Error saving production note:', err);
    }
  }

  const store = getStore();
  const notesList: ProductionMonthlyNote[] = (store as any).production_notes_mcba || [];
  const otherNotes = notesList.filter((n) => !(n.annee === year && n.mois === normalizedMois));

  const savedNote: ProductionMonthlyNote = {
    annee: year,
    mois: normalizedMois,
    note: trimmedNote,
    updated_at: new Date().toISOString(),
  };

  (store as any).production_notes_mcba = [...otherNotes, savedNote];
  saveStore(store);

  return savedNote;
}



