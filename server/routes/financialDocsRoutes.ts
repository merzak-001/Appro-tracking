import { Router } from "express";
import { isSqlServerConnected } from "../../src/db/connection";
import {
  dbGetFinancialDocuments,
  dbCreateFinancialDocument,
  dbUpdateFinancialDocument,
  dbUpdateFinancialDocumentStatus,
  dbDeleteFinancialDocument,
} from "../../src/db/financialDocsDb";
import { getStore, saveStore } from "../config/store";
import { FinancialDocument } from "../../src/types";

const router = Router();

// Auto Number Generator for Ref_Number (Format: XXXX/SENSUS/DP/YYYY)
async function generateNextFinancialDocRef(dept: string = "DP"): Promise<string> {
  const year = new Date().getFullYear();
  let maxSeq = 0;

  if (isSqlServerConnected()) {
    const docs = await dbGetFinancialDocuments();
    docs.forEach((d) => {
      const match = d.ref_number.match(/(\d+)\/SENSUS/i);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    });
  } else {
    const store = getStore();
    (store.financialDocuments || []).forEach((d) => {
      const match = d.ref_number.match(/(\d+)\/SENSUS/i);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    });
  }

  const nextSeq = String(maxSeq + 1).padStart(4, "0");
  return `${nextSeq}/SENSUS/${dept.toUpperCase()}/${year}`;
}

// GET next ref number
router.get("/financial-documents/next-number", async (req, res) => {
  const dept = (req.query.dept as string) || "DP";
  try {
    const ref = await generateNextFinancialDocRef(dept);
    res.json({ nextRef: ref });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET all financial documents
router.get("/financial-documents", async (req, res) => {
  try {
    if (isSqlServerConnected()) {
      const docs = await dbGetFinancialDocuments();
      return res.json(docs);
    }
    const store = getStore();
    res.json(store.financialDocuments || []);
  } catch (err: any) {
    console.error("GET /api/financial-documents error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST create financial document
router.post("/financial-documents", async (req, res) => {
  try {
    const d: Omit<FinancialDocument, "id"> = req.body;
    if (!d.doc_type || !d.objet) {
      return res.status(400).json({ error: "doc_type and objet are required" });
    }

    if (!d.ref_number || d.ref_number.trim() === "") {
      d.ref_number = await generateNextFinancialDocRef(d.department || "DP");
    }

    if (isSqlServerConnected()) {
      const created = await dbCreateFinancialDocument(d);
      return res.status(201).json(created);
    }

    const store = getStore();
    if (!store.financialDocuments) store.financialDocuments = [];
    const newId = store.financialDocuments.length > 0
      ? Math.max(...store.financialDocuments.map((x) => x.id)) + 1
      : 1;

    const newDoc: FinancialDocument = {
      id: newId,
      ...d,
      created_at: new Date().toISOString(),
      invoice_lines: (d.invoice_lines || []).map((line, idx) => ({
        id: idx + 1,
        document_id: newId,
        position: idx + 1,
        facture_number: line.facture_number,
        facture_date: line.facture_date,
        fournisseur_name: line.fournisseur_name,
        amount: line.amount,
      })),
    };

    store.financialDocuments.unshift(newDoc);
    saveStore(store);
    res.status(201).json(newDoc);
  } catch (err: any) {
    console.error("POST /api/financial-documents error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update financial document
router.put("/financial-documents/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const store = getStore();
    const idx = (store.financialDocuments || []).findIndex((x) => String(x.id) === String(id));
    if (idx !== -1) {
      const existing = store.financialDocuments[idx];
      const updated: FinancialDocument = {
        ...existing,
        ...req.body,
        id: existing.id,
        status: req.body.status !== undefined ? req.body.status : existing.status,
        invoice_lines: req.body.invoice_lines
          ? req.body.invoice_lines.map((line: any, index: number) => ({
              id: line.id || index + 1,
              document_id: existing.id,
              position: index + 1,
              facture_number: line.facture_number,
              facture_date: line.facture_date,
              fournisseur_name: line.fournisseur_name,
              amount: line.amount,
            }))
          : existing.invoice_lines,
      };

      store.financialDocuments[idx] = updated;
      saveStore(store);
    }

    if (isSqlServerConnected()) {
      await dbUpdateFinancialDocument(id, req.body);
      if (req.body.status) {
        await dbUpdateFinancialDocumentStatus(id, req.body.status);
      }
    }

    return res.json({ message: "Updated successfully" });
  } catch (err: any) {
    console.error("PUT /api/financial-documents/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH status of financial document
router.patch("/financial-documents/:id/status", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: "status is required" });
  }

  try {
    // 1. Always update internal store
    const store = getStore();
    const idx = (store.financialDocuments || []).findIndex((x) => String(x.id) === String(id));
    let updatedDoc: any = null;
    if (idx !== -1) {
      store.financialDocuments[idx].status = status;
      saveStore(store);
      updatedDoc = store.financialDocuments[idx];
    }

    // 2. Update SQL Server if connected
    if (isSqlServerConnected()) {
      await dbUpdateFinancialDocumentStatus(id, status);
    }

    return res.json(updatedDoc || { id, status, message: "Status updated successfully" });
  } catch (err: any) {
    console.error("PATCH /api/financial-documents/:id/status error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE financial document
router.delete("/financial-documents/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    if (isSqlServerConnected()) {
      await dbDeleteFinancialDocument(id);
      return res.json({ message: "Deleted successfully" });
    }

    const store = getStore();
    store.financialDocuments = (store.financialDocuments || []).filter((x) => String(x.id) !== String(id));
    saveStore(store);
    res.json({ message: "Deleted successfully" });
  } catch (err: any) {
    console.error("DELETE /api/financial-documents/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
