import { Router } from "express";
import { getStore, saveStore } from "../config/store";
import { ConsultationItem, AppelOffreItem } from "../../src/types";

export const procurementTendersRoutes = Router();

/* =========================================================================
   CONSULTATIONS (RFQ) ENDPOINTS
   ========================================================================= */

// GET /api/consultations
procurementTendersRoutes.get("/consultations", (req, res) => {
  try {
    const store = getStore();
    const items = store.consultations || [];
    res.json(items);
  } catch (error) {
    console.error("Error fetching consultations:", error);
    res.status(500).json({ error: "Failed to fetch consultations" });
  }
});

// POST /api/consultations
procurementTendersRoutes.post("/consultations", (req, res) => {
  try {
    const store = getStore();
    if (!store.consultations) store.consultations = [];

    const newId = store.consultations.length > 0 ? Math.max(...store.consultations.map((i) => i.id)) + 1 : 1;
    const newItem: ConsultationItem = {
      ...req.body,
      id: newId,
      created_at: new Date().toISOString(),
    };

    store.consultations.unshift(newItem);
    saveStore(store);

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating consultation:", error);
    res.status(500).json({ error: "Failed to create consultation" });
  }
});

// PUT /api/consultations/:id
procurementTendersRoutes.put("/consultations/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const store = getStore();
    if (!store.consultations) store.consultations = [];

    const idx = store.consultations.findIndex((item) => item.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Consultation not found" });
    }

    const updatedItem: ConsultationItem = {
      ...store.consultations[idx],
      ...req.body,
      id,
    };

    store.consultations[idx] = updatedItem;
    saveStore(store);

    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating consultation:", error);
    res.status(500).json({ error: "Failed to update consultation" });
  }
});

// DELETE /api/consultations/:id
procurementTendersRoutes.delete("/consultations/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const store = getStore();
    if (!store.consultations) store.consultations = [];

    const idx = store.consultations.findIndex((item) => item.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Consultation not found" });
    }

    store.consultations.splice(idx, 1);
    saveStore(store);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting consultation:", error);
    res.status(500).json({ error: "Failed to delete consultation" });
  }
});

/* =========================================================================
   APPELS D'OFFRES & MARCHÉS ENDPOINTS
   ========================================================================= */

// GET /api/appels-offres
procurementTendersRoutes.get("/appels-offres", (req, res) => {
  try {
    const store = getStore();
    const items = store.appelsOffres || [];
    res.json(items);
  } catch (error) {
    console.error("Error fetching appels d'offres:", error);
    res.status(500).json({ error: "Failed to fetch appels d'offres" });
  }
});

// POST /api/appels-offres
procurementTendersRoutes.post("/appels-offres", (req, res) => {
  try {
    const store = getStore();
    if (!store.appelsOffres) store.appelsOffres = [];

    const newId = store.appelsOffres.length > 0 ? Math.max(...store.appelsOffres.map((i) => i.id)) + 1 : 1;
    const newItem: AppelOffreItem = {
      ...req.body,
      id: newId,
      created_at: new Date().toISOString(),
    };

    store.appelsOffres.unshift(newItem);
    saveStore(store);

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating appel d'offres:", error);
    res.status(500).json({ error: "Failed to create appel d'offres" });
  }
});

// PUT /api/appels-offres/:id
procurementTendersRoutes.put("/appels-offres/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const store = getStore();
    if (!store.appelsOffres) store.appelsOffres = [];

    const idx = store.appelsOffres.findIndex((item) => item.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Appel d'offres not found" });
    }

    const updatedItem: AppelOffreItem = {
      ...store.appelsOffres[idx],
      ...req.body,
      id,
    };

    store.appelsOffres[idx] = updatedItem;
    saveStore(store);

    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating appel d'offres:", error);
    res.status(500).json({ error: "Failed to update appel d'offres" });
  }
});

// DELETE /api/appels-offres/:id
procurementTendersRoutes.delete("/appels-offres/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const store = getStore();
    if (!store.appelsOffres) store.appelsOffres = [];

    const idx = store.appelsOffres.findIndex((item) => item.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Appel d'offres not found" });
    }

    store.appelsOffres.splice(idx, 1);
    saveStore(store);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting appel d'offres:", error);
    res.status(500).json({ error: "Failed to delete appel d'offres" });
  }
});
