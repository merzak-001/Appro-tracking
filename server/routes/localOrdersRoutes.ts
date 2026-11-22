import { Router } from "express";
import { getStore, saveStore } from "../config/store";
import { generateNextOrderNumber } from "../services/orderSequenceService";
import {
  isSqlServerConnected,
  dbGetLocalOrders,
  dbCreateLocalOrder,
  dbUpdateLocalOrder,
  dbUpdateLocalOrderStatus,
  dbDeleteLocalOrder,
  dbDeleteSupplierEvaluationByOrder,
} from "../../src/db";
import { LocalOrder, LocalOrderLine } from "../../src/types";

const router = Router();

router.get("/", async (req, res) => {
  const store = getStore();
  if (isSqlServerConnected()) {
    try {
      const dbOrders = await dbGetLocalOrders();
      if (dbOrders) {
        let storeChanged = false;
        const merged = dbOrders.map((o) => {
          const stored = store.localOrders.find((s) => String(s.id) === String(o.id) || s.n_order === o.n_order);
          if (stored && stored.status !== o.status) {
            stored.status = o.status;
            storeChanged = true;
          }
          return {
            ...o,
            procurement_source_type: stored?.procurement_source_type || 'none',
            consultation_id: stored?.consultation_id,
            consultation_ref: stored?.consultation_ref,
            appel_offre_id: stored?.appel_offre_id,
            appel_offre_ref: stored?.appel_offre_ref,
          };
        });
        if (storeChanged) {
          saveStore(store);
        }
        return res.json(merged);
      }
    } catch (e) {
      console.error("[MSSQL Error on get local orders]:", e);
    }
  }

  const result = store.localOrders.map((o) => {
    const sup = store.suppliers.find((s) => s.id === o.fournisseur_id);
    return { ...o, supplier_name: sup ? sup.name : "Unknown Supplier" };
  });
  res.json(result);
});

router.post("/", async (req, res) => {
  const { 
    n_order: customOrderNumber, 
    etablir_par, 
    objet_de_commande, 
    fournisseur_id, 
    date, 
    observation, 
    status, 
    lines,
    delai_livraison_jours,
    procedure_type,
    procurement_source_type,
    consultation_id,
    consultation_ref,
    appel_offre_id,
    appel_offre_ref,
  } = req.body;

  if (!etablir_par || !objet_de_commande || !fournisseur_id || !date) {
    return res.status(400).json({ error: "Missing required order header fields." });
  }

  const n_order = (customOrderNumber && String(customOrderNumber).trim())
    ? String(customOrderNumber).trim()
    : await generateNextOrderNumber("local");

  let calculated_total_ht = 0;
  let calculated_total_tva = 0;

  const processedLines: LocalOrderLine[] = (lines || []).map((line: any, idx: number) => {
    const qty = Number(line.qty) || 0;
    const unit_price = Number(line.unit_price) || 0;
    const tva_percentage = Number(line.tva_percentage) ?? 19;

    const total_ht = Number((qty * unit_price).toFixed(2));
    const montant_tva = Number((total_ht * (tva_percentage / 100)).toFixed(2));
    const total_ttc = Number((total_ht + montant_tva).toFixed(2));

    calculated_total_ht += total_ht;
    calculated_total_tva += montant_tva;

    return {
      id: idx + 1,
      position: idx + 1,
      designation: line.designation || "Item",
      qty,
      unite: line.unite || "piece",
      unit_price,
      tva_percentage,
      total_ht,
      montant_tva,
      total_ttc,
    };
  });

  const total_ht = Number(calculated_total_ht.toFixed(2));
  const total_tva = Number(calculated_total_tva.toFixed(2));
  const total_ttc = Number((total_ht + total_tva).toFixed(2));

  const store = getStore();
  const sup = store.suppliers.find((s) => s.id === Number(fournisseur_id));

  const orderData: Omit<LocalOrder, "id"> = {
    n_order,
    etablir_par,
    objet_de_commande,
    fournisseur_id: Number(fournisseur_id),
    supplier_name: sup ? sup.name : "",
    date,
    observation: observation || "",
    status: status || "Pending",
    delai_livraison_jours: delai_livraison_jours != null ? Number(delai_livraison_jours) : undefined,
    procedure_type: procedure_type || undefined,
    total_ht,
    total_tva,
    total_ttc,
    created_at: new Date().toISOString(),
    lines: processedLines,
    procurement_source_type: procurement_source_type || 'none',
    consultation_id: consultation_id ? Number(consultation_id) : undefined,
    consultation_ref: consultation_ref || undefined,
    appel_offre_id: appel_offre_id ? Number(appel_offre_id) : undefined,
    appel_offre_ref: appel_offre_ref || undefined,
  };

  if (isSqlServerConnected()) {
    try {
      const createdDbOrder = await dbCreateLocalOrder(orderData);
      const fullCreatedOrder: LocalOrder = {
        ...createdDbOrder,
        procurement_source_type: orderData.procurement_source_type,
        consultation_id: orderData.consultation_id,
        consultation_ref: orderData.consultation_ref,
        appel_offre_id: orderData.appel_offre_id,
        appel_offre_ref: orderData.appel_offre_ref,
      };
      store.localOrders.unshift(fullCreatedOrder);
      saveStore(store);
      return res.status(201).json(fullCreatedOrder);
    } catch (e) {
      console.error("[MSSQL Error on create local order]:", e);
    }
  }

  const newOrder: LocalOrder = {
    id: store.localOrders.length ? Math.max(...store.localOrders.map((o) => o.id)) + 1 : 1,
    ...orderData,
  };

  store.localOrders.unshift(newOrder);
  saveStore(store);
  res.status(201).json(newOrder);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { 
    n_order, 
    etablir_par, 
    objet_de_commande, 
    fournisseur_id, 
    date, 
    observation, 
    status, 
    lines,
    delai_livraison_jours,
    procedure_type,
    procurement_source_type,
    consultation_id,
    consultation_ref,
    appel_offre_id,
    appel_offre_ref,
  } = req.body;

  const store = getStore();

  let calculated_total_ht = 0;
  let calculated_total_tva = 0;

  const processedLines: LocalOrderLine[] = (lines || []).map((line: any, idx: number) => {
    const qty = Number(line.qty) || 0;
    const unit_price = Number(line.unit_price) || 0;
    const tva_percentage = Number(line.tva_percentage) ?? 19;

    const total_ht = Number((qty * unit_price).toFixed(2));
    const montant_tva = Number((total_ht * (tva_percentage / 100)).toFixed(2));
    const total_ttc = Number((total_ht + montant_tva).toFixed(2));

    calculated_total_ht += total_ht;
    calculated_total_tva += montant_tva;

    return {
      id: line.id ? Number(line.id) : undefined as any,
      order_id: id,
      position: idx + 1,
      designation: line.designation || "Item",
      qty,
      unite: line.unite || "piece",
      unit_price,
      tva_percentage,
      total_ht,
      montant_tva,
      total_ttc,
    };
  });

  const total_ht = Number(calculated_total_ht.toFixed(2));
  const total_tva = Number(calculated_total_tva.toFixed(2));
  const total_ttc = Number((total_ht + total_tva).toFixed(2));

  const sup = store.suppliers.find((s) => Number(s.id) === Number(fournisseur_id));

  const updatedData: Partial<LocalOrder> = {
    n_order: n_order && String(n_order).trim() ? String(n_order).trim() : undefined,
    etablir_par,
    objet_de_commande,
    fournisseur_id: Number(fournisseur_id),
    date,
    observation: observation || "",
    status,
    delai_livraison_jours: delai_livraison_jours != null ? Number(delai_livraison_jours) : undefined,
    procedure_type: procedure_type !== undefined ? procedure_type : undefined,
    total_ht,
    total_tva,
    total_ttc,
    lines: processedLines,
    procurement_source_type: procurement_source_type || 'none',
    consultation_id: consultation_id !== undefined ? Number(consultation_id) : undefined,
    consultation_ref: consultation_ref !== undefined ? consultation_ref : undefined,
    appel_offre_id: appel_offre_id !== undefined ? Number(appel_offre_id) : undefined,
    appel_offre_ref: appel_offre_ref !== undefined ? appel_offre_ref : undefined,
  };

  if (isSqlServerConnected()) {
    try {
      await dbUpdateLocalOrder(id, updatedData);

      const storeIndex = store.localOrders.findIndex((o) => String(o.id) === String(id));
      const updatedOrderObj: LocalOrder = {
        id,
        n_order: updatedData.n_order || (storeIndex !== -1 ? store.localOrders[storeIndex].n_order : ''),
        etablir_par: updatedData.etablir_par || '',
        objet_de_commande: updatedData.objet_de_commande || '',
        fournisseur_id: Number(fournisseur_id),
        supplier_name: sup ? sup.name : (storeIndex !== -1 ? store.localOrders[storeIndex].supplier_name : ''),
        date: date || '',
        observation: observation || '',
        status: status || 'Commandée',
        delai_livraison_jours: updatedData.delai_livraison_jours,
        procedure_type: updatedData.procedure_type,
        total_ht,
        total_tva,
        total_ttc,
        lines: processedLines,
        procurement_source_type: updatedData.procurement_source_type,
        consultation_id: updatedData.consultation_id,
        consultation_ref: updatedData.consultation_ref,
        appel_offre_id: updatedData.appel_offre_id,
        appel_offre_ref: updatedData.appel_offre_ref,
      };

      if (storeIndex !== -1) {
        store.localOrders[storeIndex] = updatedOrderObj;
      } else {
        store.localOrders.unshift(updatedOrderObj);
      }
      saveStore(store);
      return res.json(updatedOrderObj);
    } catch (e: any) {
      console.error("[MSSQL Error on update local order]:", e);
      return res.status(500).json({ error: e.message || "Failed to update local order in SQL Server." });
    }
  }

  // Fallback for JSON store mode
  const index = store.localOrders.findIndex((o) => String(o.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ error: "Local order not found" });
  }

  store.localOrders[index] = {
    ...store.localOrders[index],
    ...updatedData,
    supplier_name: sup ? sup.name : store.localOrders[index].supplier_name,
  };

  saveStore(store);
  res.json(store.localOrders[index]);
});

router.patch("/:id/status", async (req, res) => {
  const idParam = req.params.id;
  const numericId = parseInt(idParam, 10);
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status required." });

  const store = getStore();
  let index = store.localOrders.findIndex(
    (o) => String(o.id) === String(idParam) || (!isNaN(numericId) && Number(o.id) === numericId)
  );

  let nOrder = "";
  if (index !== -1) {
    store.localOrders[index].status = status;
    nOrder = store.localOrders[index].n_order;
  }

  let updatedOrder: any = null;

  if (isSqlServerConnected()) {
    try {
      await dbUpdateLocalOrderStatus(isNaN(numericId) ? idParam : numericId, status, nOrder);
      if (status !== 'Completed') {
        await dbDeleteSupplierEvaluationByOrder(isNaN(numericId) ? Number(idParam) || 0 : numericId);
      }
      const dbOrders = await dbGetLocalOrders();
      if (dbOrders) {
        const dbOrd = dbOrders.find(
          (o) => String(o.id) === String(idParam) || (!isNaN(numericId) && Number(o.id) === numericId) || (nOrder && o.n_order === nOrder)
        );
        if (dbOrd) {
          updatedOrder = dbOrd;
          if (index !== -1) {
            store.localOrders[index].status = dbOrd.status;
          } else {
            store.localOrders.push({ ...dbOrd, status });
          }
        }
      }
    } catch (e) {
      console.error("[MSSQL Error on update local order status]:", e);
    }
  }

  if (status !== 'Completed') {
    store.supplierEvaluations = (store.supplierEvaluations || []).filter(
      (e) => String(e.order_id) !== String(idParam) && Number(e.order_id) !== numericId
    );
  }

  saveStore(store);

  if (!updatedOrder && index !== -1) {
    updatedOrder = store.localOrders[index];
  }

  if (!updatedOrder) {
    updatedOrder = { id: idParam, status };
  }

  res.json(updatedOrder);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();
  if (isSqlServerConnected()) {
    try {
      await dbDeleteLocalOrder(id);
      await dbDeleteSupplierEvaluationByOrder(id);
    } catch (e) {
      console.error("[MSSQL Error on delete local order]:", e);
    }
  }
  store.localOrders = store.localOrders.filter((o) => Number(o.id) !== id);
  store.localDeliveries = store.localDeliveries.filter((d) => Number(d.order_id) !== id);
  store.supplierEvaluations = (store.supplierEvaluations || []).filter((e) => Number(e.order_id) !== id);
  saveStore(store);
  res.json({ success: true });
});

export default router;
