import sql from 'mssql/msnodesqlv8';
import { getPool, isSqlServerConnected } from './connection';
import { StockItem, ProduitFini, BomComponent, StockCategory, StockStatusType } from '../types';

/* =========================================================================
   STOCK ITEMS (SQL SERVER ADAPTER)
   ========================================================================= */

export async function dbGetStockItems(): Promise<StockItem[]> {
  const pool = getPool();
  if (!isSqlServerConnected() || !pool) return [];

  try {
    const result = await pool.request().query(`
      SELECT 
        ID as id,
        Code_Article as code_article,
        Designation as designation,
        Division as division,
        Magasin as magasin,
        Categorie as categorie,
        Is_Tracked as is_tracked,
        Is_Important as is_important,
        Famille as famille,
        Type_Article as type_article,
        Unite as unite,
        Stock_Actuel as stock_actuel,
        Stock_Utilisation_Libre as stock_utilisation_libre,
        Stock_Controle_Qualite as stock_controle_qualite,
        Stock_Non_Libre as stock_non_libre,
        Stock_Transit as stock_transit,
        Valeur_Non_Libre as valeur_non_libre,
        Stock_Securite as stock_securite,
        Emplacement as emplacement,
        Prix_Unitaire_Estime as prix_unitaire_estime,
        Fournisseur_Principal as fournisseur_principal,
        Statut as statut,
        Created_At as created_at,
        Updated_At as updated_at
      FROM dbo.Stock_Item
      ORDER BY Code_Article ASC
    `);

    return result.recordset.map((row: any) => ({
      ...row,
      is_tracked: Boolean(row.is_tracked),
      is_important: Boolean(row.is_important),
      stock_actuel: Number(row.stock_actuel) || 0,
      stock_utilisation_libre: Number(row.stock_utilisation_libre) || Number(row.stock_actuel) || 0,
      stock_controle_qualite: Number(row.stock_controle_qualite) || 0,
      stock_non_libre: Number(row.stock_non_libre) || 0,
      stock_transit: Number(row.stock_transit) || 0,
      valeur_non_libre: Number(row.valeur_non_libre) || 0,
      stock_securite: Number(row.stock_securite) || 100,
      prix_unitaire_estime: row.prix_unitaire_estime ? Number(row.prix_unitaire_estime) : undefined,
    }));
  } catch (err) {
    console.error('[MSSQL] Error in dbGetStockItems:', err);
    return [];
  }
}

export async function dbCreateStockItem(item: Partial<StockItem>): Promise<StockItem | null> {
  const pool = getPool();
  if (!isSqlServerConnected() || !pool) return null;

  try {
    const result = await pool.request()
      .input('Code_Article', sql.NVarChar(50), item.code_article?.trim())
      .input('Designation', sql.NVarChar(255), item.designation?.trim())
      .input('Division', sql.NVarChar(20), item.division?.trim() || '8660')
      .input('Magasin', sql.NVarChar(20), item.magasin?.trim() || '33')
      .input('Categorie', sql.NVarChar(20), item.categorie || 'MP')
      .input('Is_Tracked', sql.Bit, item.is_tracked !== false ? 1 : 0)
      .input('Is_Important', sql.Bit, item.is_important ? 1 : 0)
      .input('Famille', sql.NVarChar(100), item.famille || 'Matières Premières & Composants (MP)')
      .input('Type_Article', sql.NVarChar(20), item.type_article || 'ROH')
      .input('Unite', sql.NVarChar(20), item.unite || 'PCE')
      .input('Stock_Actuel', sql.Decimal(18, 3), Number(item.stock_actuel) || 0)
      .input('Stock_Utilisation_Libre', sql.Decimal(18, 3), Number(item.stock_actuel) || 0)
      .input('Stock_Controle_Qualite', sql.Decimal(18, 3), Number(item.stock_controle_qualite) || 0)
      .input('Stock_Non_Libre', sql.Decimal(18, 3), Number(item.stock_non_libre) || 0)
      .input('Stock_Transit', sql.Decimal(18, 3), Number(item.stock_transit) || 0)
      .input('Valeur_Non_Libre', sql.Decimal(18, 2), Number(item.valeur_non_libre) || 0)
      .input('Stock_Securite', sql.Decimal(18, 3), Number(item.stock_securite) || 100)
      .input('Emplacement', sql.NVarChar(100), item.emplacement || `Magasin ${item.magasin || '33'}`)
      .input('Prix_Unitaire_Estime', sql.Decimal(18, 2), item.prix_unitaire_estime ? Number(item.prix_unitaire_estime) : null)
      .input('Fournisseur_Principal', sql.NVarChar(150), item.fournisseur_principal || null)
      .input('Statut', sql.NVarChar(20), item.statut || (Number(item.stock_actuel) > 0 ? 'DISPONIBLE' : 'RUPTURE'))
      .query(`
        INSERT INTO dbo.Stock_Item (
          Code_Article, Designation, Division, Magasin, Categorie, Is_Tracked, Is_Important,
          Famille, Type_Article, Unite, Stock_Actuel, Stock_Utilisation_Libre,
          Stock_Controle_Qualite, Stock_Non_Libre, Stock_Transit, Valeur_Non_Libre, Stock_Securite,
          Emplacement, Prix_Unitaire_Estime, Fournisseur_Principal, Statut, Created_At, Updated_At
        )
        OUTPUT INSERTED.ID
        VALUES (
          @Code_Article, @Designation, @Division, @Magasin, @Categorie, @Is_Tracked, @Is_Important,
          @Famille, @Type_Article, @Unite, @Stock_Actuel, @Stock_Utilisation_Libre,
          @Stock_Controle_Qualite, @Stock_Non_Libre, @Stock_Transit, @Valeur_Non_Libre, @Stock_Securite,
          @Emplacement, @Prix_Unitaire_Estime, @Fournisseur_Principal, @Statut, GETDATE(), GETDATE()
        )
      `);

    const newId = result.recordset[0]?.ID;
    return {
      ...item,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as StockItem;
  } catch (err) {
    console.error('[MSSQL] Error in dbCreateStockItem:', err);
    return null;
  }
}

export async function dbUpdateStockItem(id: string | number, item: Partial<StockItem>): Promise<boolean> {
  const pool = getPool();
  if (!isSqlServerConnected() || !pool) return false;

  try {
    await pool.request()
      .input('Id', sql.Int, Number(id))
      .input('Code_Article', sql.NVarChar(50), item.code_article?.trim())
      .input('Designation', sql.NVarChar(255), item.designation?.trim())
      .input('Division', sql.NVarChar(20), item.division?.trim() || '8660')
      .input('Magasin', sql.NVarChar(20), item.magasin?.trim() || '33')
      .input('Categorie', sql.NVarChar(20), item.categorie || 'MP')
      .input('Is_Tracked', sql.Bit, item.is_tracked !== undefined ? (item.is_tracked ? 1 : 0) : 1)
      .input('Is_Important', sql.Bit, item.is_important ? 1 : 0)
      .input('Famille', sql.NVarChar(100), item.famille || 'Matières Premières & Composants (MP)')
      .input('Type_Article', sql.NVarChar(20), item.type_article || 'ROH')
      .input('Unite', sql.NVarChar(20), item.unite || 'PCE')
      .input('Stock_Actuel', sql.Decimal(18, 3), Number(item.stock_actuel) || 0)
      .input('Stock_Utilisation_Libre', sql.Decimal(18, 3), Number(item.stock_actuel) || 0)
      .input('Stock_Controle_Qualite', sql.Decimal(18, 3), Number(item.stock_controle_qualite) || 0)
      .input('Stock_Non_Libre', sql.Decimal(18, 3), Number(item.stock_non_libre) || 0)
      .input('Stock_Transit', sql.Decimal(18, 3), Number(item.stock_transit) || 0)
      .input('Valeur_Non_Libre', sql.Decimal(18, 2), Number(item.valeur_non_libre) || 0)
      .input('Stock_Securite', sql.Decimal(18, 3), Number(item.stock_securite) || 100)
      .input('Emplacement', sql.NVarChar(100), item.emplacement || `Magasin ${item.magasin || '33'}`)
      .input('Prix_Unitaire_Estime', sql.Decimal(18, 2), item.prix_unitaire_estime ? Number(item.prix_unitaire_estime) : null)
      .input('Fournisseur_Principal', sql.NVarChar(150), item.fournisseur_principal || null)
      .input('Statut', sql.NVarChar(20), item.statut || (Number(item.stock_actuel) > 0 ? 'DISPONIBLE' : 'RUPTURE'))
      .query(`
        UPDATE dbo.Stock_Item SET
          Code_Article = COALESCE(@Code_Article, Code_Article),
          Designation = COALESCE(@Designation, Designation),
          Division = COALESCE(@Division, Division),
          Magasin = COALESCE(@Magasin, Magasin),
          Categorie = COALESCE(@Categorie, Categorie),
          Is_Tracked = COALESCE(@Is_Tracked, Is_Tracked),
          Is_Important = COALESCE(@Is_Important, Is_Important),
          Famille = COALESCE(@Famille, Famille),
          Type_Article = COALESCE(@Type_Article, Type_Article),
          Unite = COALESCE(@Unite, Unite),
          Stock_Actuel = COALESCE(@Stock_Actuel, Stock_Actuel),
          Stock_Utilisation_Libre = COALESCE(@Stock_Utilisation_Libre, Stock_Utilisation_Libre),
          Stock_Controle_Qualite = COALESCE(@Stock_Controle_Qualite, Stock_Controle_Qualite),
          Stock_Non_Libre = COALESCE(@Stock_Non_Libre, Stock_Non_Libre),
          Stock_Transit = COALESCE(@Stock_Transit, Stock_Transit),
          Valeur_Non_Libre = COALESCE(@Valeur_Non_Libre, Valeur_Non_Libre),
          Stock_Securite = COALESCE(@Stock_Securite, Stock_Securite),
          Emplacement = COALESCE(@Emplacement, Emplacement),
          Prix_Unitaire_Estime = @Prix_Unitaire_Estime,
          Fournisseur_Principal = @Fournisseur_Principal,
          Statut = COALESCE(@Statut, Statut),
          Updated_At = GETDATE()
        WHERE ID = @Id
      `);

    return true;
  } catch (err) {
    console.error('[MSSQL] Error in dbUpdateStockItem:', err);
    return false;
  }
}

export async function dbDeleteStockItem(id: string | number): Promise<boolean> {
  const pool = getPool();
  if (!isSqlServerConnected() || !pool) return false;

  try {
    await pool.request()
      .input('Id', sql.Int, Number(id))
      .query(`DELETE FROM dbo.Stock_Item WHERE ID = @Id`);
    return true;
  } catch (err) {
    console.error('[MSSQL] Error in dbDeleteStockItem:', err);
    return false;
  }
}

export async function dbToggleTracking(id: string | number): Promise<boolean> {
  const pool = getPool();
  if (!isSqlServerConnected() || !pool) return false;

  try {
    await pool.request()
      .input('Id', sql.Int, Number(id))
      .query(`
        UPDATE dbo.Stock_Item 
        SET Is_Tracked = CASE WHEN Is_Tracked = 1 THEN 0 ELSE 1 END,
            Updated_At = GETDATE()
        WHERE ID = @Id
      `);
    return true;
  } catch (err) {
    console.error('[MSSQL] Error in dbToggleTracking:', err);
    return false;
  }
}

export async function dbGetWatchlist(): Promise<{ code_article: string; is_important: boolean }[]> {
  const pool = getPool();
  if (!isSqlServerConnected() || !pool) return [];

  try {
    const result = await pool.request().query(`
      SELECT Code_Article as code_article, Is_Important as is_important 
      FROM dbo.Stock_Watchlist 
      WHERE Is_Important = 1
    `);
    return result.recordset || [];
  } catch (err) {
    console.error('[MSSQL] Error in dbGetWatchlist:', err);
    return [];
  }
}

export async function dbToggleImportant(id: string | number): Promise<boolean | null> {
  const pool = getPool();
  if (!isSqlServerConnected() || !pool) return null;

  try {
    const isNumeric = !isNaN(Number(id));
    let checkRes;
    if (isNumeric) {
      checkRes = await pool.request()
        .input('Id', sql.Int, Number(id))
        .query(`SELECT Code_Article, Is_Important FROM dbo.Stock_Item WHERE ID = @Id`);
    }
    if (!checkRes || checkRes.recordset.length === 0) {
      checkRes = await pool.request()
        .input('Code', sql.NVarChar(50), String(id).trim())
        .query(`SELECT TOP 1 Code_Article, Is_Important FROM dbo.Stock_Item WHERE Code_Article = @Code`);
    }

    if (checkRes.recordset.length === 0) return null;
    const { Code_Article, Is_Important } = checkRes.recordset[0];
    const nextImportant = !Is_Important;

    await pool.request()
      .input('Code', sql.NVarChar(50), Code_Article)
      .input('Imp', sql.Bit, nextImportant ? 1 : 0)
      .query(`
        UPDATE dbo.Stock_Item 
        SET Is_Important = @Imp,
            Updated_At = GETDATE()
        WHERE Code_Article = @Code;

        IF @Imp = 1
        BEGIN
          IF EXISTS (SELECT 1 FROM dbo.Stock_Watchlist WHERE Code_Article = @Code)
            UPDATE dbo.Stock_Watchlist SET Is_Important = 1, Updated_At = GETDATE() WHERE Code_Article = @Code;
          ELSE
            INSERT INTO dbo.Stock_Watchlist (Code_Article, Is_Important, Created_At, Updated_At)
            VALUES (@Code, 1, GETDATE(), GETDATE());
        END
        ELSE
        BEGIN
          DELETE FROM dbo.Stock_Watchlist WHERE Code_Article = @Code;
        END
      `);

    return nextImportant;
  } catch (err) {
    console.error('[MSSQL] Error in dbToggleImportant:', err);
    return null;
  }
}

export async function dbBulkUpdateImportance(updates: { code_article: string; is_important: boolean }[]): Promise<boolean> {
  const pool = getPool();
  if (!isSqlServerConnected() || !pool) return false;

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    for (const u of updates) {
      const code = u.code_article.trim().toUpperCase();
      const imp = u.is_important ? 1 : 0;
      const req = new sql.Request(transaction);
      req.input('Code', sql.NVarChar(50), code);
      req.input('Imp', sql.Bit, imp);
      await req.query(`
        UPDATE dbo.Stock_Item 
        SET Is_Important = @Imp,
            Updated_At = GETDATE()
        WHERE UPPER(LTRIM(RTRIM(Code_Article))) = @Code;

        IF @Imp = 1
        BEGIN
          IF EXISTS (SELECT 1 FROM dbo.Stock_Watchlist WHERE UPPER(LTRIM(RTRIM(Code_Article))) = @Code)
            UPDATE dbo.Stock_Watchlist SET Is_Important = 1, Updated_At = GETDATE() WHERE UPPER(LTRIM(RTRIM(Code_Article))) = @Code;
          ELSE
            INSERT INTO dbo.Stock_Watchlist (Code_Article, Is_Important, Created_At, Updated_At)
            VALUES (@Code, 1, GETDATE(), GETDATE());
        END
        ELSE
        BEGIN
          DELETE FROM dbo.Stock_Watchlist WHERE UPPER(LTRIM(RTRIM(Code_Article))) = @Code;
        END
      `);
    }

    await transaction.commit();
    return true;
  } catch (err) {
    await transaction.rollback();
    console.error('[MSSQL] Error in dbBulkUpdateImportance:', err);
    return false;
  }
}

export async function dbBulkSetTrackingOrImportant(action: string, ids?: (string | number)[], value?: boolean): Promise<boolean> {
  const pool = getPool();
  if (!isSqlServerConnected() || !pool) return false;

  try {
    const req = pool.request();
    if (action === 'track_all_positive') {
      await req.query(`
        UPDATE dbo.Stock_Item 
        SET Is_Tracked = CASE WHEN Stock_Actuel > 0 THEN 1 ELSE 0 END,
            Updated_At = GETDATE()
      `);
    } else if (action === 'mark_positive_important') {
      await req.query(`
        UPDATE dbo.Stock_Item 
        SET Is_Important = CASE WHEN Stock_Actuel > 0 THEN 1 ELSE 0 END,
            Is_Tracked = 1,
            Updated_At = GETDATE()
      `);
    } else if (action === 'track_all') {
      await req.query(`UPDATE dbo.Stock_Item SET Is_Tracked = 1, Updated_At = GETDATE()`);
    } else if (action === 'untrack_all') {
      await req.query(`UPDATE dbo.Stock_Item SET Is_Tracked = 0, Updated_At = GETDATE()`);
    } else if (action === 'mark_all_important') {
      await req.query(`UPDATE dbo.Stock_Item SET Is_Important = 1, Updated_At = GETDATE()`);
    } else if (action === 'unmark_all_important') {
      await req.query(`UPDATE dbo.Stock_Item SET Is_Important = 0, Updated_At = GETDATE()`);
    }
    return true;
  } catch (err) {
    console.error('[MSSQL] Error in dbBulkSetTrackingOrImportant:', err);
    return false;
  }
}

export async function dbBulkImportStock(items: Partial<StockItem>[], mode: 'replace' | 'upsert' = 'replace'): Promise<boolean> {
  const pool = getPool();
  if (!isSqlServerConnected() || !pool) return false;

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    if (mode === 'replace') {
      // Create temp table to preserve is_tracked and is_important by (Code_Article, Magasin)
      const request = new sql.Request(transaction);
      await request.query(`
        IF OBJECT_ID('tempdb..#StockPrefs') IS NOT NULL DROP TABLE #StockPrefs;
        SELECT Code_Article, Magasin, Is_Tracked, Is_Important INTO #StockPrefs FROM dbo.Stock_Item;
        DELETE FROM dbo.Stock_Item;
      `);

      // Batch insert in chunks of 100 for maximum performance
      const chunkSize = 100;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        let valuesSql = '';
        const chunkReq = new sql.Request(transaction);

        chunk.forEach((item, idx) => {
          const prefix = `p${idx}_`;
          chunkReq.input(`${prefix}Code`, sql.NVarChar(50), item.code_article?.trim() || `000${i + idx}`);
          chunkReq.input(`${prefix}Des`, sql.NVarChar(255), item.designation?.trim() || 'Article');
          chunkReq.input(`${prefix}Div`, sql.NVarChar(20), item.division?.trim() || '8660');
          chunkReq.input(`${prefix}Mag`, sql.NVarChar(20), item.magasin?.trim() || '33');
          chunkReq.input(`${prefix}Cat`, sql.NVarChar(20), item.categorie || 'MP');
          chunkReq.input(`${prefix}Track`, sql.Bit, item.is_tracked !== undefined ? (item.is_tracked ? 1 : 0) : (Number(item.stock_actuel) > 0 ? 1 : 0));
          chunkReq.input(`${prefix}Imp`, sql.Bit, item.is_important ? 1 : 0);
          chunkReq.input(`${prefix}Fam`, sql.NVarChar(100), item.famille || 'Matières Premières & Composants (MP)');
          chunkReq.input(`${prefix}Type`, sql.NVarChar(20), item.type_article || 'ROH');
          chunkReq.input(`${prefix}Unite`, sql.NVarChar(20), item.unite || 'PCE');
          chunkReq.input(`${prefix}Stock`, sql.Decimal(18, 3), Number(item.stock_actuel) || 0);
          chunkReq.input(`${prefix}Libre`, sql.Decimal(18, 3), Number(item.stock_utilisation_libre) || Number(item.stock_actuel) || 0);
          chunkReq.input(`${prefix}QC`, sql.Decimal(18, 3), Number(item.stock_controle_qualite) || 0);
          chunkReq.input(`${prefix}NonLibre`, sql.Decimal(18, 3), Number(item.stock_non_libre) || 0);
          chunkReq.input(`${prefix}Transit`, sql.Decimal(18, 3), Number(item.stock_transit) || 0);
          chunkReq.input(`${prefix}ValNonLibre`, sql.Decimal(18, 2), Number(item.valeur_non_libre) || 0);
          chunkReq.input(`${prefix}Sec`, sql.Decimal(18, 3), Number(item.stock_securite) || 100);
          chunkReq.input(`${prefix}Emp`, sql.NVarChar(100), item.emplacement || `Magasin ${item.magasin || '33'}`);
          chunkReq.input(`${prefix}Statut`, sql.NVarChar(20), item.statut || (Number(item.stock_actuel) > 0 ? 'DISPONIBLE' : 'RUPTURE'));

          valuesSql += `${idx > 0 ? ',' : ''} (
            @${prefix}Code, @${prefix}Des, @${prefix}Div, @${prefix}Mag, @${prefix}Cat,
            @${prefix}Track, @${prefix}Imp, @${prefix}Fam, @${prefix}Type, @${prefix}Unite,
            @${prefix}Stock, @${prefix}Libre, @${prefix}QC, @${prefix}NonLibre, @${prefix}Transit,
            @${prefix}ValNonLibre, @${prefix}Sec, @${prefix}Emp, @${prefix}Statut, GETDATE(), GETDATE()
          )`;
        });

        await chunkReq.query(`
          INSERT INTO dbo.Stock_Item (
            Code_Article, Designation, Division, Magasin, Categorie,
            Is_Tracked, Is_Important, Famille, Type_Article, Unite,
            Stock_Actuel, Stock_Utilisation_Libre, Stock_Controle_Qualite,
            Stock_Non_Libre, Stock_Transit, Valeur_Non_Libre, Stock_Securite, Emplacement, Statut, Created_At, Updated_At
          )
          VALUES ${valuesSql}
        `);
      }

      // Re-apply preserved preferences from temp table matched on (Code_Article, Magasin)
      const restoreReq = new sql.Request(transaction);
      await restoreReq.query(`
        UPDATE s
        SET s.Is_Tracked = p.Is_Tracked,
            s.Is_Important = p.Is_Important
        FROM dbo.Stock_Item s
        INNER JOIN #StockPrefs p ON s.Code_Article = p.Code_Article AND s.Magasin = p.Magasin;

        -- Also ensure permanent Watchlist items remain starred
        UPDATE s
        SET s.Is_Important = 1
        FROM dbo.Stock_Item s
        INNER JOIN dbo.Stock_Watchlist w ON s.Code_Article = w.Code_Article
        WHERE w.Is_Important = 1;
      `);
    } else {
      // Upsert mode by (Code_Article, Magasin)
      for (const item of items) {
        if (!item.code_article) continue;
        const upReq = new sql.Request(transaction);
        upReq.input('Code', sql.NVarChar(50), item.code_article.trim());
        upReq.input('Des', sql.NVarChar(255), item.designation?.trim() || 'Article');
        upReq.input('Div', sql.NVarChar(20), item.division?.trim() || '8660');
        upReq.input('Mag', sql.NVarChar(20), item.magasin?.trim() || '33');
        upReq.input('Cat', sql.NVarChar(20), item.categorie || 'MP');
        upReq.input('Stock', sql.Decimal(18, 3), Number(item.stock_actuel) || 0);
        upReq.input('Libre', sql.Decimal(18, 3), Number(item.stock_utilisation_libre) || Number(item.stock_actuel) || 0);
        upReq.input('QC', sql.Decimal(18, 3), Number(item.stock_controle_qualite) || 0);
        upReq.input('NonLibre', sql.Decimal(18, 3), Number(item.stock_non_libre) || 0);
        upReq.input('Transit', sql.Decimal(18, 3), Number(item.stock_transit) || 0);
        upReq.input('ValNonLibre', sql.Decimal(18, 2), Number(item.valeur_non_libre) || 0);
        upReq.input('Statut', sql.NVarChar(20), item.statut || (Number(item.stock_actuel) > 0 ? 'DISPONIBLE' : 'RUPTURE'));

        await upReq.query(`
          IF EXISTS (SELECT 1 FROM dbo.Stock_Item WHERE Code_Article = @Code AND Magasin = @Mag)
          BEGIN
            UPDATE dbo.Stock_Item SET
              Designation = @Des,
              Division = @Div,
              Categorie = @Cat,
              Stock_Actuel = @Stock,
              Stock_Utilisation_Libre = @Libre,
              Stock_Controle_Qualite = @QC,
              Stock_Non_Libre = @NonLibre,
              Stock_Transit = @Transit,
              Valeur_Non_Libre = @ValNonLibre,
              Statut = @Statut,
              Updated_At = GETDATE()
            WHERE Code_Article = @Code AND Magasin = @Mag;
          END
          ELSE
          BEGIN
            INSERT INTO dbo.Stock_Item (
              Code_Article, Designation, Division, Magasin, Categorie,
              Is_Tracked, Is_Important, Famille, Type_Article, Unite,
              Stock_Actuel, Stock_Utilisation_Libre, Stock_Controle_Qualite,
              Stock_Non_Libre, Stock_Transit, Valeur_Non_Libre, Stock_Securite, Emplacement, Statut, Created_At, Updated_At
            )
            VALUES (
              @Code, @Des, @Div, @Mag, @Cat,
              CASE WHEN @Stock > 0 THEN 1 ELSE 0 END, 0, 'Matières Premières', 'ROH', 'PCE',
              @Stock, @Libre, @QC, @NonLibre, @Transit, @ValNonLibre, 100, 'Magasin Central', @Statut, GETDATE(), GETDATE()
            );
          END
        `);
      }
    }

    await transaction.commit();
    return true;
  } catch (err) {
    await transaction.rollback();
    console.error('[MSSQL] Error in dbBulkImportStock:', err);
    return false;
  }
}

/* =========================================================================
   PRODUITS FINIS & BOM (SQL SERVER ADAPTER)
   ========================================================================= */

export async function dbGetProduitsFinis(): Promise<ProduitFini[]> {
  const pool = getPool();
  if (!isSqlServerConnected() || !pool) return [];

  try {
    const pfResult = await pool.request().query(`
      SELECT 
        ID as id,
        Code_Produit as code_produit,
        Nom_Produit as nom_produit,
        Famille as famille,
        Programme_Mensuel as programme_mensuel,
        Jours_Ouvres_Mois as jours_ouvres_mois,
        Created_At as created_at
      FROM dbo.Produit_Fini
      ORDER BY Nom_Produit ASC
    `);

    const compResult = await pool.request().query(`
      SELECT 
        ID as id,
        Produit_Fini_ID as produit_fini_id,
        Code_Article as code_article,
        Designation as designation,
        Quantite_Par_Produit as quantite_par_produit,
        Unite as unite,
        Remarque as remarque
      FROM dbo.Produit_Fini_Composant
      ORDER BY Position ASC
    `);

    const composantsByPf = new Map<number, BomComponent[]>();
    compResult.recordset.forEach((row: any) => {
      const pfId = row.produit_fini_id;
      if (!composantsByPf.has(pfId)) composantsByPf.set(pfId, []);
      composantsByPf.get(pfId)!.push({
        id: String(row.id),
        code_article: row.code_article,
        designation: row.designation,
        quantite_par_produit: Number(row.quantite_par_produit) || 1,
        unite: row.unite || 'PCE',
        remarque: row.remarque,
      });
    });

    return pfResult.recordset.map((pf: any) => ({
      id: pf.id,
      code_produit: pf.code_produit,
      nom_produit: pf.nom_produit,
      famille: pf.famille,
      programme_mensuel: Number(pf.programme_mensuel) || 5000,
      jours_ouvres_mois: Number(pf.jours_ouvres_mois) || 22,
      composants: composantsByPf.get(pf.id) || [],
      created_at: pf.created_at,
    }));
  } catch (err) {
    console.error('[MSSQL] Error in dbGetProduitsFinis:', err);
    return [];
  }
}
