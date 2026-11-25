import { Router } from "express";
import { isSqlServerConnected } from "../../src/db/connection";
import {
  dbGetStockItems,
  dbCreateStockItem,
  dbUpdateStockItem,
  dbDeleteStockItem,
  dbToggleTracking,
  dbToggleImportant,
  dbBulkUpdateImportance,
  dbGetWatchlist,
  dbBulkSetTrackingOrImportant,
  dbBulkImportStock,
  dbGetProduitsFinis,
} from "../../src/db/stockDb";
import { getStore, saveStore } from "../config/store";
import { StockItem, ProduitFini } from "../../src/types";

export const stockRoutes = Router();

/* =========================================================================
   STOCK ITEMS ENDPOINTS
   ========================================================================= */

// GET /api/stock
stockRoutes.get("/stock", async (req, res) => {
  try {
    let items: StockItem[] = [];

    if (isSqlServerConnected()) {
      items = await dbGetStockItems();
    }

    if (!items || items.length === 0) {
      const store = getStore();
      items = store.stockItems || [];
    }

    res.json(items);
  } catch (error) {
    console.error("Error fetching stock items:", error);
    res.status(500).json({ error: "Failed to fetch stock items" });
  }
});

// GET /api/stock/stats (Calcul des KPIs et distributions directement depuis la base de données)
stockRoutes.get("/stock/stats", async (req, res) => {
  try {
    let items: StockItem[] = [];
    if (isSqlServerConnected()) {
      items = await dbGetStockItems();
    }
    if (!items || items.length === 0) {
      const store = getStore();
      items = store.stockItems || [];
    }

    const total_items_in_db = items.length;
    let total_tracked = 0;
    let total_dormant = 0;
    let total_libre_qty = 0;
    let total_qc_qty = 0;
    let total_non_libre_qty = 0;
    let total_transit_qty = 0;
    let zero_count = 0;
    let positive_count = 0;
    let critique_count = 0;

    const categories_breakdown: Record<string, { count: number; qty: number }> = {
      MP: { count: 0, qty: 0 },
      PF: { count: 0, qty: 0 },
      PD: { count: 0, qty: 0 },
      AUX: { count: 0, qty: 0 },
    };

    const magasins_breakdown: Record<string, { count: number; qty: number }> = {};
    const types_breakdown: Record<string, { count: number; qty: number }> = {};

    items.forEach((item) => {
      const libre = Number(item.stock_actuel !== undefined ? item.stock_actuel : item.stock_utilisation_libre) || 0;
      const isTracked = item.is_tracked !== false;

      if (isTracked) total_tracked++;
      else total_dormant++;

      total_libre_qty += libre;
      total_qc_qty += Number(item.stock_controle_qualite || 0);
      total_non_libre_qty += Number(item.stock_non_libre || 0);
      total_transit_qty += Number(item.stock_transit || 0);

      if (libre <= 0) zero_count++;
      else {
        positive_count++;
        if (libre < 100) critique_count++;
      }

      // Category
      const cat = (item.categorie || 'MP').toUpperCase();
      if (!categories_breakdown[cat]) categories_breakdown[cat] = { count: 0, qty: 0 };
      categories_breakdown[cat].count++;
      categories_breakdown[cat].qty += libre;

      // Magasin
      const mag = item.magasin ? `Magasin ${item.magasin}` : 'Magasin Central';
      if (!magasins_breakdown[mag]) magasins_breakdown[mag] = { count: 0, qty: 0 };
      magasins_breakdown[mag].count++;
      magasins_breakdown[mag].qty += libre;

      // Type
      const typ = (item.type_article || 'AUTRE').toUpperCase();
      if (!types_breakdown[typ]) types_breakdown[typ] = { count: 0, qty: 0 };
      types_breakdown[typ].count++;
      types_breakdown[typ].qty += libre;
    });

    const top_stocked_items = [...items]
      .sort((a, b) => (Number(b.stock_actuel) || 0) - (Number(a.stock_actuel) || 0))
      .slice(0, 10)
      .map((i) => ({
        id: i.id,
        code_article: i.code_article,
        designation: i.designation,
        stock_actuel: i.stock_actuel,
        unite: i.unite,
        magasin: i.magasin,
        categorie: i.categorie,
      }));

    res.json({
      total_items_in_db,
      total_tracked,
      total_dormant,
      total_libre_qty,
      total_qc_qty,
      total_non_libre_qty,
      total_transit_qty,
      zero_count,
      positive_count,
      critique_count,
      categories_breakdown,
      magasins_breakdown,
      types_breakdown,
      top_stocked_items,
      last_updated: items[0]?.updated_at || new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating stock stats:", error);
    res.status(500).json({ error: "Failed to generate stock stats" });
  }
});

// POST /api/stock
stockRoutes.post("/stock", async (req, res) => {
  try {
    let createdItem: StockItem | null = null;
    if (isSqlServerConnected()) {
      createdItem = await dbCreateStockItem(req.body);
    }

    const store = getStore();
    if (!store.stockItems) store.stockItems = [];

    const newId = createdItem?.id || (store.stockItems.length > 0 
      ? Math.max(...store.stockItems.map((i) => Number(i.id) || 0)) + 1 
      : 1);

    const newItem: StockItem = {
      ...req.body,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.stockItems.unshift(newItem);
    saveStore(store);

    res.status(201).json(createdItem || newItem);
  } catch (error) {
    console.error("Error creating stock item:", error);
    res.status(500).json({ error: "Failed to create stock item" });
  }
});

// PUT /api/stock/:id
stockRoutes.put("/stock/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (isSqlServerConnected()) {
      await dbUpdateStockItem(id, req.body);
    }

    const store = getStore();
    if (!store.stockItems) store.stockItems = [];

    const idx = store.stockItems.findIndex((item) => String(item.id) === String(id) || item.code_article === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Stock item not found" });
    }

    const updatedItem: StockItem = {
      ...store.stockItems[idx],
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    store.stockItems[idx] = updatedItem;
    saveStore(store);

    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating stock item:", error);
    res.status(500).json({ error: "Failed to update stock item" });
  }
});

// PATCH /api/stock/:id/toggle-important (Marquer / Démarquer comme important ⭐)
stockRoutes.patch("/stock/:id/toggle-important", async (req, res) => {
  try {
    const id = req.params.id;
    let nextVal: boolean | null = null;
    if (isSqlServerConnected()) {
      nextVal = await dbToggleImportant(id);
    }

    const store = getStore();
    if (!store.stockItems) store.stockItems = [];

    const idx = store.stockItems.findIndex(
      (item) => String(item.id) === String(id) || item.code_article.trim().toUpperCase() === String(id).trim().toUpperCase()
    );

    if (nextVal === null) {
      if (idx === -1) {
        return res.status(404).json({ error: "Stock item not found" });
      }
      nextVal = !store.stockItems[idx].is_important;
    }

    if (idx !== -1) {
      const code = store.stockItems[idx].code_article.trim().toUpperCase();
      store.stockItems.forEach((i) => {
        if (i.code_article.trim().toUpperCase() === code) {
          i.is_important = nextVal!;
          i.updated_at = new Date().toISOString();
        }
      });
      saveStore(store);
      return res.json({ success: true, is_important: nextVal, item: store.stockItems[idx] });
    }

    res.json({ success: true, is_important: nextVal });
  } catch (error) {
    console.error("Error toggling important status:", error);
    res.status(500).json({ error: "Failed to toggle important status" });
  }
});

// POST /api/stock/bulk-update-importance (Enregistrement groupé des articles importants ⭐)
stockRoutes.post("/stock/bulk-update-importance", async (req, res) => {
  try {
    const { updates } = req.body; // updates: { code_article: string, is_important: boolean }[]
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Updates array is required" });
    }

    if (isSqlServerConnected()) {
      await dbBulkUpdateImportance(updates);
    }

    const store = getStore();
    if (!store.stockItems) store.stockItems = [];

    const updateMap = new Map<string, boolean>();
    updates.forEach((u) => {
      if (u.code_article) {
        updateMap.set(u.code_article.trim().toUpperCase(), !!u.is_important);
      }
    });

    store.stockItems.forEach((item) => {
      const code = item.code_article.trim().toUpperCase();
      if (updateMap.has(code)) {
        item.is_important = updateMap.get(code)!;
        item.updated_at = new Date().toISOString();
      }
    });

    saveStore(store);
    res.json({ success: true, count: updates.length, items: store.stockItems });
  } catch (error) {
    console.error("Error bulk updating importance:", error);
    res.status(500).json({ error: "Failed to bulk update importance" });
  }
});

// PATCH /api/stock/:id/toggle-tracking (Activer / Désactiver du suivi tableau de bord)
stockRoutes.patch("/stock/:id/toggle-tracking", async (req, res) => {
  try {
    const id = req.params.id;
    if (isSqlServerConnected()) {
      await dbToggleTracking(id);
    }

    const store = getStore();
    if (!store.stockItems) store.stockItems = [];

    const idx = store.stockItems.findIndex((item) => String(item.id) === String(id) || item.code_article === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Stock item not found" });
    }

    const current = store.stockItems[idx].is_tracked ?? true;
    store.stockItems[idx].is_tracked = !current;
    store.stockItems[idx].updated_at = new Date().toISOString();
    saveStore(store);

    res.json({ success: true, is_tracked: store.stockItems[idx].is_tracked, item: store.stockItems[idx] });
  } catch (error) {
    console.error("Error toggling tracking status:", error);
    res.status(500).json({ error: "Failed to toggle tracking status" });
  }
});

// POST /api/stock/bulk-tracking (Activer / Désactiver en masse)
stockRoutes.post("/stock/bulk-tracking", async (req, res) => {
  try {
    const { action, ids, is_tracked } = req.body;
    const store = getStore();
    if (!store.stockItems) store.stockItems = [];

    if (isSqlServerConnected()) {
      await dbBulkSetTrackingOrImportant(action, ids, is_tracked);
    }

    if (action === 'track_all_positive') {
      store.stockItems.forEach((item) => {
        item.is_tracked = Number(item.stock_actuel) > 0;
        item.updated_at = new Date().toISOString();
      });
    } else if (action === 'mark_positive_important') {
      store.stockItems.forEach((item) => {
        item.is_important = Number(item.stock_actuel) > 0;
        item.is_tracked = true;
        item.updated_at = new Date().toISOString();
      });
    } else if (action === 'track_all') {
      store.stockItems.forEach((item) => {
        item.is_tracked = true;
        item.updated_at = new Date().toISOString();
      });
    } else if (action === 'untrack_all') {
      store.stockItems.forEach((item) => {
        item.is_tracked = false;
        item.updated_at = new Date().toISOString();
      });
    } else if (action === 'mark_all_important') {
      store.stockItems.forEach((item) => {
        item.is_important = true;
        item.updated_at = new Date().toISOString();
      });
    } else if (action === 'unmark_all_important') {
      store.stockItems.forEach((item) => {
        item.is_important = false;
        item.updated_at = new Date().toISOString();
      });
    } else if (Array.isArray(ids)) {
      const idSet = new Set(ids.map(String));
      store.stockItems.forEach((item) => {
        if (idSet.has(String(item.id)) || idSet.has(String(item.code_article))) {
          item.is_tracked = !!is_tracked;
          item.updated_at = new Date().toISOString();
        }
      });
    }

    saveStore(store);
    res.json({ success: true, items: store.stockItems });
  } catch (error) {
    console.error("Error updating bulk tracking:", error);
    res.status(500).json({ error: "Failed to update bulk tracking" });
  }
});

// DELETE /api/stock/:id
stockRoutes.delete("/stock/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (isSqlServerConnected()) {
      await dbDeleteStockItem(id);
    }

    const store = getStore();
    if (!store.stockItems) store.stockItems = [];

    store.stockItems = store.stockItems.filter((item) => String(item.id) !== String(id) && item.code_article !== id);
    saveStore(store);

    res.json({ success: true, message: "Stock item deleted successfully" });
  } catch (error) {
    console.error("Error deleting stock item:", error);
    res.status(500).json({ error: "Failed to delete stock item" });
  }
});

// GET /api/stock/watchlist (Liste des codes articles marqués importants)
stockRoutes.get("/stock/watchlist", async (req, res) => {
  try {
    if (isSqlServerConnected()) {
      const list = await dbGetWatchlist();
      return res.json({ success: true, watchlist: list });
    }

    const store = getStore();
    const list = (store.stockItems || [])
      .filter((i) => i.is_important)
      .map((i) => ({ code_article: i.code_article, is_important: true }));

    res.json({ success: true, watchlist: list });
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    res.status(500).json({ error: "Failed to fetch watchlist" });
  }
});

// POST /api/stock/bulk-import (Upload / Replace / Upsert from Excel)
stockRoutes.post("/stock/bulk-import", async (req, res) => {
  try {
    const { items, mode } = req.body; // mode: 'replace' | 'upsert'
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required" });
    }

    // Save to SQL Server database if connected
    if (isSqlServerConnected()) {
      await dbBulkImportStock(items, mode || 'replace');
    }

    // Also update JSON Store mirror
    const store = getStore();
    if (!store.stockItems) store.stockItems = [];

    // Map of existing items to preserve tracking preferences by (code_article, magasin)
    const existingTrackingMap = new Map<string, { is_tracked?: boolean; is_important?: boolean }>();
    store.stockItems.forEach((s) => {
      const key = `${s.code_article.trim().toUpperCase()}__${(s.magasin || '').trim()}`;
      existingTrackingMap.set(key, {
        is_tracked: s.is_tracked,
        is_important: s.is_important,
      });
      // Also map by code_article alone
      if (s.is_important) {
        existingTrackingMap.set(s.code_article.trim().toUpperCase(), {
          is_tracked: s.is_tracked,
          is_important: true,
        });
      }
    });

    if (mode === 'replace') {
      store.stockItems = items.map((item, idx) => {
        const key = `${item.code_article?.trim().toUpperCase()}__${(item.magasin || '').trim()}`;
        const existing = existingTrackingMap.get(key) || existingTrackingMap.get(item.code_article?.trim().toUpperCase());
        const isSellingCode = (item.code_article || '').trim().toUpperCase().startsWith('78');
        const defaultTracked = isSellingCode ? false : Number(item.stock_actuel) > 0;
        const isImp = item.is_important !== undefined ? !!item.is_important : (existing?.is_important ?? false);
        return {
          ...item,
          id: item.id || idx + 1,
          is_tracked: existing?.is_tracked !== undefined ? existing.is_tracked : (item.is_tracked !== undefined ? item.is_tracked : defaultTracked),
          is_important: isImp,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });
    } else {
      items.forEach((incoming, idx) => {
        const existingIdx = store.stockItems!.findIndex(
          (s) => s.code_article.trim().toUpperCase() === incoming.code_article?.trim().toUpperCase() &&
                 (s.magasin || '').trim() === (incoming.magasin || '').trim()
        );
        if (existingIdx >= 0) {
          store.stockItems![existingIdx] = {
            ...store.stockItems![existingIdx],
            ...incoming,
            is_tracked: incoming.is_tracked !== undefined ? incoming.is_tracked : store.stockItems![existingIdx].is_tracked,
            is_important: incoming.is_important !== undefined ? incoming.is_important : store.stockItems![existingIdx].is_important,
            updated_at: new Date().toISOString(),
          };
        } else {
          const newId = store.stockItems!.length > 0 
            ? Math.max(...store.stockItems!.map((i) => Number(i.id) || 0)) + 1 
            : idx + 1;
          const isSellingCode = (incoming.code_article || '').trim().toUpperCase().startsWith('78');
          store.stockItems!.push({
            ...incoming,
            id: newId,
            is_tracked: incoming.is_tracked !== undefined ? incoming.is_tracked : (isSellingCode ? false : Number(incoming.stock_actuel) > 0),
            is_important: incoming.is_important ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      });
    }

    saveStore(store);
    res.json({ success: true, count: store.stockItems.length, items: store.stockItems });
  } catch (error) {
    console.error("Error in bulk stock import:", error);
    res.status(500).json({ error: "Failed to process bulk import" });
  }
});

/* =========================================================================
   MB51 MOVEMENT & MCBA STOCK SITUATION ENDPOINTS
   ========================================================================= */

// Helper to parse 'MM.YYYY' into comparable number
function parseMonthKey(mStr: string): number {
  if (!mStr) return 0;
  const parts = String(mStr).trim().split('.');
  if (parts.length === 2) {
    return parseInt(parts[1], 10) * 100 + parseInt(parts[0], 10);
  }
  return 0;
}

// GET /api/stock/situation (Returns MB51-whitelisted items with latest MCBA stock & alerts)
stockRoutes.get("/stock/situation", (req, res) => {
  try {
    const store = getStore();
    const items = store.stockItems || [];
    const whitelist = new Set((store.mb51_whitelist || []).map(c => c.trim().toUpperCase()));

    // Filter to only MB51 articles if whitelist exists
    const trackedItems = whitelist.size > 0
      ? items.filter(i => {
          const c = i.code_article.trim().toUpperCase();
          return whitelist.has(c) || whitelist.has(c.padStart(8, '0')) || whitelist.has(c.replace(/^0+/, ''));
        })
      : items;

    const activeTracked = trackedItems.filter(i => i.is_tracked !== false);

    let ruptures = 0;
    let critiques = 0;
    let bas = 0;
    let disponibles = 0;
    let totalStock = 0;

    activeTracked.forEach(i => {
      const st = i.health_status || i.statut;
      const s = Number(i.stock_actuel) || 0;
      totalStock += s;
      if (st === 'RUPTURE' || s <= 0) ruptures++;
      else if (st === 'CRITIQUE') critiques++;
      else if (st === 'BAS') bas++;
      else disponibles++;
    });

    const latestMonth = store.stock_last_sync?.latest_month || trackedItems[0]?.latest_month || '11.2026';

    res.json({
      success: true,
      items: trackedItems,
      kpis: {
        total_tracked: activeTracked.length,
        ruptures,
        critiques,
        bas,
        disponibles,
        total_problems: ruptures + critiques,
        total_stock_units: totalStock,
        latest_month: latestMonth,
        last_sync: store.stock_last_sync?.timestamp || new Date().toISOString(),
      },
      syncInfo: store.stock_last_sync || null,
    });
  } catch (error) {
    console.error("Error fetching stock situation:", error);
    res.status(500).json({ error: "Failed to fetch stock situation" });
  }
});

// POST /api/stock/upload-mcba (Process uploaded MCBA data: latest month only, replace existing)
stockRoutes.post("/stock/upload-mcba", (req, res) => {
  try {
    const { rows, fileName } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Rows array is required" });
    }

    const store = getStore();
    if (!store.stockItems) store.stockItems = [];
    const whitelist = new Set((store.mb51_whitelist || []).map(c => c.trim().toUpperCase()));

    // Group rows by article code
    const byArticle = new Map<string, any[]>();
    let ignoredCount = 0;

    rows.forEach(r => {
      const artStr = String(r['Article'] || r['article'] || r['Code'] || r['code'] || '').trim();
      const match = artStr.match(/^(\d+)\s+(.*)$/);
      const code = (match ? match[1] : artStr.split(' ')[0]).trim().toUpperCase();

      if (!code) return;

      // Filter against MB51 whitelist if available
      const isWhitelisted = whitelist.size === 0 ||
        whitelist.has(code) ||
        whitelist.has(code.padStart(8, '0')) ||
        whitelist.has(code.replace(/^0+/, ''));

      if (!isWhitelisted) {
        ignoredCount++;
        return;
      }

      if (!byArticle.has(code)) {
        byArticle.set(code, []);
      }

      const mois = String(r['Mois'] || r['mois'] || '');
      const sortie = Number(r['Sortie'] || r['sortie'] || 0);
      const entree = Number(r['QtéEnt.SV'] || r['entree'] || 0);
      const stock = Number(r['Stock'] !== undefined ? r['Stock'] : (r['stock'] || 0));

      byArticle.get(code)!.push({ mois, sortie, entree, stock, raw: r });
    });

    let updatedCount = 0;
    let globalLatestMonth = '';

    // Map existing stock items by code
    const stockMap = new Map<string, StockItem>();
    store.stockItems.forEach(i => {
      stockMap.set(i.code_article.trim().toUpperCase(), i);
      stockMap.set(i.code_article.replace(/^0+/, '').trim().toUpperCase(), i);
    });

    for (const [code, records] of byArticle.entries()) {
      records.sort((a, b) => parseMonthKey(a.mois) - parseMonthKey(b.mois));
      const latest = records[records.length - 1];

      if (latest && parseMonthKey(latest.mois) > parseMonthKey(globalLatestMonth)) {
        globalLatestMonth = latest.mois;
      }

      const existing = stockMap.get(code) || stockMap.get(code.padStart(8, '0')) || stockMap.get(code.replace(/^0+/, ''));

      const totalSorties = records.reduce((sum, rec) => sum + rec.sortie, 0);
      const avgMonthlySortie = records.length > 0 ? totalSorties / records.length : 0;
      const currentStock = latest ? latest.stock : 0;
      const latestMonth = latest ? latest.mois : 'N/A';
      const coverageMonths = avgMonthlySortie > 0 ? (currentStock / avgMonthlySortie) : (currentStock > 0 ? 999 : 0);

      // Variance & StdDev calculation for demand fluctuation
      const variance = records.reduce((acc, rec) => acc + Math.pow(rec.sortie - avgMonthlySortie, 2), 0) / (records.length || 1);
      const stdDev = Math.sqrt(variance);

      // Lead time L in months according to category
      const cat = existing ? existing.categorie : 'MP';
      let L = 1.5;
      if (cat === 'PF') L = 0.5;
      else if (cat === 'PD' || cat === 'AUX') L = 1.0;

      let stockSecurite = 0;
      let reorderPoint = 0;
      let pointRupture = 0;

      if (avgMonthlySortie > 0) {
        // Safety Stock (z = 1.65, 95% service level)
        const theoreticalSS = 1.65 * stdDev * Math.sqrt(L);
        const minSS = 0.5 * avgMonthlySortie;
        stockSecurite = Math.round(Math.max(theoreticalSS, minSS));
        reorderPoint = Math.round((avgMonthlySortie * L) + stockSecurite);
        pointRupture = Math.round(Math.max(1, stockSecurite * 0.4, (avgMonthlySortie / 30) * 7));
      } else {
        stockSecurite = existing?.stock_securite || 0;
        reorderPoint = stockSecurite;
        pointRupture = 0;
      }

      let status: 'RUPTURE' | 'CRITIQUE' | 'BAS' | 'DISPONIBLE' | 'SURSTOCK' = 'DISPONIBLE';
      let alertReason = 'Stock suffisant';

      if (currentStock <= 0) {
        status = 'RUPTURE';
        alertReason = 'Stock épuisé (0 en stock)';
      } else if (currentStock <= pointRupture || (avgMonthlySortie > 0 && coverageMonths < 0.5)) {
        status = 'CRITIQUE';
        alertReason = `Critique: Stock sous le seuil de rupture (${currentStock} ≤ ${pointRupture})`;
      } else if (currentStock <= stockSecurite || (avgMonthlySortie > 0 && coverageMonths < 1.0)) {
        status = 'CRITIQUE';
        alertReason = `Critique: Stock sous le stock de sécurité (${currentStock} ≤ ${stockSecurite})`;
      } else if (currentStock <= reorderPoint || (avgMonthlySortie > 0 && coverageMonths < 2.0)) {
        status = 'BAS';
        alertReason = `Stock bas: Réapprovisionnement requis (Stock ${currentStock} ≤ ROP ${reorderPoint})`;
      } else {
        status = 'DISPONIBLE';
        alertReason = `Normal: Couverture ${coverageMonths > 99 ? '> 24' : coverageMonths.toFixed(1)} mois`;
      }

      if (existing) {
        // REPLACE existing stock
        existing.stock_actuel = currentStock;
        existing.stock_utilisation_libre = currentStock;
        existing.latest_month = latestMonth;
        existing.avg_monthly_sortie = Math.round(avgMonthlySortie * 10) / 10;
        existing.coverage_months = Math.round(coverageMonths * 10) / 10;
        existing.stock_securite = stockSecurite;
        existing.point_reorder = reorderPoint;
        existing.point_rupture = pointRupture;
        existing.lead_time_months = L;
        existing.health_status = status;
        existing.statut = status;
        existing.alert_reason = alertReason;
        existing.history_records = records;
        existing.updated_at = new Date().toISOString();
        updatedCount++;
      }
    }

    const activeForSync = store.stockItems.filter(i => i.is_tracked !== false);
    store.stock_last_sync = {
      timestamp: new Date().toISOString(),
      latest_month: globalLatestMonth || store.stock_last_sync?.latest_month || '11.2026',
      source_mcba: fileName || "Upload MCBA",
      total_tracked: activeForSync.length,
      ruptures: activeForSync.filter(i => i.health_status === 'RUPTURE').length,
      critiques: activeForSync.filter(i => i.health_status === 'CRITIQUE').length,
      bas: activeForSync.filter(i => i.health_status === 'BAS').length,
      disponibles: activeForSync.filter(i => i.health_status === 'DISPONIBLE').length,
    };

    saveStore(store);

    res.json({
      success: true,
      updatedCount,
      ignoredCount,
      latestMonth: globalLatestMonth,
      alerts: {
        ruptures: store.stock_last_sync.ruptures,
        critiques: store.stock_last_sync.critiques,
        bas: store.stock_last_sync.bas,
        disponibles: store.stock_last_sync.disponibles,
      },
      message: `✅ ${updatedCount} articles MB51 mis à jour avec le dernier mois (${globalLatestMonth}). ${ignoredCount} entrées hors liste ignorées.`,
    });
  } catch (error) {
    console.error("Error processing MCBA upload:", error);
    res.status(500).json({ error: "Failed to process MCBA upload" });
  }
});


/* =========================================================================
   PRODUITS FINIS & BOM (NOMENCLATURE) ENDPOINTS
   ========================================================================= */

// GET /api/produits-finis
stockRoutes.get("/produits-finis", (req, res) => {
  try {
    const store = getStore();
    const items = store.produitsFinis || [];
    res.json(items);
  } catch (error) {
    console.error("Error fetching finished products:", error);
    res.status(500).json({ error: "Failed to fetch finished products" });
  }
});

// POST /api/produits-finis
stockRoutes.post("/produits-finis", (req, res) => {
  try {
    const store = getStore();
    if (!store.produitsFinis) store.produitsFinis = [];

    const newId = store.produitsFinis.length > 0 
      ? Math.max(...store.produitsFinis.map((i) => Number(i.id) || 0)) + 1 
      : 1;

    const newItem: ProduitFini = {
      ...req.body,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.produitsFinis.push(newItem);
    saveStore(store);

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating finished product:", error);
    res.status(500).json({ error: "Failed to create finished product" });
  }
});

// PUT /api/produits-finis/:id
stockRoutes.put("/produits-finis/:id", (req, res) => {
  try {
    const id = req.params.id;
    const store = getStore();
    if (!store.produitsFinis) store.produitsFinis = [];

    const idx = store.produitsFinis.findIndex((item) => String(item.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: "Finished product not found" });
    }

    const updatedItem: ProduitFini = {
      ...store.produitsFinis[idx],
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    store.produitsFinis[idx] = updatedItem;
    saveStore(store);

    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating finished product:", error);
    res.status(500).json({ error: "Failed to update finished product" });
  }
});

// DELETE /api/produits-finis/:id
stockRoutes.delete("/produits-finis/:id", (req, res) => {
  try {
    const id = req.params.id;
    const store = getStore();
    if (!store.produitsFinis) store.produitsFinis = [];

    store.produitsFinis = store.produitsFinis.filter((item) => String(item.id) !== String(id));
    saveStore(store);

    res.json({ success: true, message: "Finished product deleted successfully" });
  } catch (error) {
    console.error("Error deleting finished product:", error);
    res.status(500).json({ error: "Failed to delete finished product" });
  }
});
