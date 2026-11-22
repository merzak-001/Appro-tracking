import { Router } from "express";
import {
  dbGetProductionMonthly,
  dbImportProductionMonthly,
  dbClearProductionMonthly,
  dbGetProductionBudgets,
  dbSaveProductionBudgets,
  dbGetProductionNote,
  dbSaveProductionNote,
} from "../../src/db/productionDb";
import { ProductionMonthlyRecord } from "../../src/types";

export const productionRoutes = Router();

/* =========================================================================
   PRODUCTION MONTHLY MCBA ENDPOINTS
   ========================================================================= */

// GET /api/production-mcba
productionRoutes.get("/production-mcba", async (req, res) => {
  try {
    const yearParam = req.query.year ? Number(req.query.year) : undefined;
    const records = await dbGetProductionMonthly(yearParam);
    res.json(records);
  } catch (error) {
    console.error("Failed to fetch production monthly records:", error);
    res.status(500).json({ error: "Failed to fetch production monthly records" });
  }
});

// POST /api/production-mcba/import
productionRoutes.post("/production-mcba/import", async (req, res) => {
  try {
    const { records, replace } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "No records provided" });
    }

    const result = await dbImportProductionMonthly(records, replace !== false);
    res.json({
      success: true,
      message: `${result.count} lignes de production enregistrées avec succès.`,
      ...result,
    });
  } catch (error) {
    console.error("Failed to import production monthly records:", error);
    res.status(500).json({ error: "Failed to import production monthly records" });
  }
});

// DELETE /api/production-mcba
productionRoutes.delete("/production-mcba", async (req, res) => {
  try {
    const yearParam = req.query.year ? Number(req.query.year) : undefined;
    const moisParam = req.query.mois ? String(req.query.mois).trim() : undefined;
    const moisNumParam = req.query.mois_num ? Number(req.query.mois_num) : undefined;

    const result = await dbClearProductionMonthly(yearParam, moisParam, moisNumParam);
    res.json({
      success: true,
      message: `${result.deletedCount} lignes de production supprimées avec succès.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Failed to clear production data:", error);
    res.status(500).json({ error: "Failed to clear production data" });
  }
});

/* =========================================================================
   BUDGET & OPERATIONAL NOTES (TABLEAU DE BORD PRODUCT MOIS)
   ========================================================================= */

// GET /api/production-mcba/budget
productionRoutes.get("/production-mcba/budget", async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const budgets = await dbGetProductionBudgets(year);
    res.json(budgets);
  } catch (error) {
    console.error("Failed to fetch production budgets:", error);
    res.status(500).json({ error: "Failed to fetch production budgets" });
  }
});

// POST /api/production-mcba/budget
productionRoutes.post("/production-mcba/budget", async (req, res) => {
  try {
    const { year, items } = req.body;
    if (!year || !Array.isArray(items)) {
      return res.status(400).json({ error: "Year and items array required" });
    }
    const saved = await dbSaveProductionBudgets(Number(year), items);
    res.json({
      success: true,
      message: "Budgets et prix unitaires enregistrés avec succès.",
      budgets: saved,
    });
  } catch (error) {
    console.error("Failed to save production budgets:", error);
    res.status(500).json({ error: "Failed to save production budgets" });
  }
});

// GET /api/production-mcba/notes
productionRoutes.get("/production-mcba/notes", async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const mois = String(req.query.mois || "").trim();
    const note = await dbGetProductionNote(year, mois);
    res.json({ note });
  } catch (error) {
    console.error("Failed to fetch production note:", error);
    res.status(500).json({ error: "Failed to fetch production note" });
  }
});

// POST /api/production-mcba/notes
productionRoutes.post("/production-mcba/notes", async (req, res) => {
  try {
    const { year, mois, note } = req.body;
    if (!year || !mois) {
      return res.status(400).json({ error: "Year and mois required" });
    }
    const saved = await dbSaveProductionNote(Number(year), String(mois), String(note || ""));
    res.json({
      success: true,
      message: "Note opérationnelle enregistrée avec succès.",
      note: saved,
    });
  } catch (error) {
    console.error("Failed to save production note:", error);
    res.status(500).json({ error: "Failed to save production note" });
  }
});


