import { Router } from "express";
import { getStore, saveStore } from "../config/store";
import {
  isSqlServerConnected,
  dbGetSuppliers,
  dbCreateSupplier,
  dbUpdateSupplier,
  dbDeleteSupplier,
} from "../../src/db";

const router = Router();

router.get("/", async (req, res) => {
  const store = getStore();
  if (isSqlServerConnected()) {
    try {
      const dbSuppliersList = await dbGetSuppliers();
      if (dbSuppliersList) {
        return res.json(dbSuppliersList);
      }
    } catch (e) {
      console.error("[MSSQL Error on get suppliers]:", e);
    }
  }
  res.json(store.suppliers);
});

router.post("/", async (req, res) => {
  const { name, address, country, rc, nif } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Supplier name is required." });
  }

  const supplierData = {
    name,
    address: address || "",
    country: country || "Algeria",
    rc: rc || "",
    nif: nif || "",
  };

  const store = getStore();

  if (isSqlServerConnected()) {
    try {
      const newDbSupplier = await dbCreateSupplier(supplierData);
      return res.status(201).json(newDbSupplier);
    } catch (e) {
      console.error("[MSSQL Error on create supplier]:", e);
    }
  }

  const newSupplier = {
    id: Date.now(),
    ...supplierData,
    created_at: new Date().toISOString(),
  };

  store.suppliers.unshift(newSupplier);
  saveStore(store);
  res.status(201).json(newSupplier);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();

  if (isSqlServerConnected()) {
    try {
      await dbUpdateSupplier(id, req.body);
    } catch (e) {
      console.error("[MSSQL Error on update supplier]:", e);
    }
  }

  const idx = store.suppliers.findIndex((s) => s.id === id);
  if (idx !== -1) {
    store.suppliers[idx] = { ...store.suppliers[idx], ...req.body };
    saveStore(store);
    res.json(store.suppliers[idx]);
  } else {
    res.status(404).json({ error: "Supplier not found" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();

  if (isSqlServerConnected()) {
    try {
      await dbDeleteSupplier(id);
    } catch (e) {
      console.error("[MSSQL Error on delete supplier]:", e);
    }
  }

  store.suppliers = store.suppliers.filter((s) => s.id !== id);
  saveStore(store);
  res.json({ message: "Supplier deleted" });
});

/* =========================================================================
   SUPPLIER EVALUATION ENDPOINTS
   ========================================================================= */

router.get("/evaluations/by-order/:orderId", async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  const store = getStore();

  if (isSqlServerConnected()) {
    try {
      const { dbGetEvaluationByOrder } = await import("../../src/db/supplierEvaluationsDb");
      const ev = await dbGetEvaluationByOrder(orderId);
      if (ev) return res.json(ev);
    } catch (err) {
      console.error("Failed to fetch order evaluation from SQL Server:", err);
    }
  }

  const ev = (store.supplierEvaluations || []).find((e) => e.order_id === orderId);
  if (!ev) {
    return res.status(404).json({ error: "No evaluation found for this order" });
  }
  res.json(ev);
});

router.post("/evaluations", async (req, res) => {
  const store = getStore();
  let newEval: any = null;

  if (isSqlServerConnected()) {
    try {
      const { dbCreateSupplierEvaluation } = await import("../../src/db/supplierEvaluationsDb");
      newEval = await dbCreateSupplierEvaluation(req.body);
    } catch (err: any) {
      console.error("Failed to create supplier evaluation in SQL Server:", err);
    }
  }

  if (!newEval) {
    newEval = {
      id: Date.now(),
      ...req.body,
      created_at: new Date().toISOString(),
    };
  }

  if (!store.supplierEvaluations) {
    store.supplierEvaluations = [];
  }
  // Avoid duplicate order evaluations in JSON store
  const existingIdx = store.supplierEvaluations.findIndex((e) => e.order_id === newEval.order_id);
  if (existingIdx !== -1) {
    store.supplierEvaluations[existingIdx] = newEval;
  } else {
    store.supplierEvaluations.unshift(newEval);
  }
  saveStore(store);

  res.status(201).json(newEval);
});

router.get("/:id/evaluations", async (req, res) => {
  const supplierId = parseInt(req.params.id, 10);
  const store = getStore();

  if (isSqlServerConnected()) {
    try {
      const { dbGetSupplierEvaluations } = await import("../../src/db/supplierEvaluationsDb");
      const evals = await dbGetSupplierEvaluations(supplierId);
      if (evals && evals.length > 0) return res.json(evals);
    } catch (err) {
      console.error("Failed to fetch supplier evaluations from SQL Server:", err);
    }
  }

  const evals = (store.supplierEvaluations || []).filter((e) => e.supplier_id === supplierId);
  res.json(evals);
});

export default router;
