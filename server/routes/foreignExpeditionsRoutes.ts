import { Router } from "express";
import { getStore, saveStore } from "../config/store";
import { getOrGenerateExpeditionCode, resequenceExpeditionsForOrder } from "../services/orderSequenceService";
import {
  isSqlServerConnected,
  dbGetForeignOrders,
  dbGetForeignExpeditions,
  dbCreateForeignExpedition,
  dbUpdateForeignExpeditionFull,
  dbUpdateForeignExpeditionStatus,
  dbDeleteForeignExpedition,
} from "../../src/db";
import { ForeignOrder, ForeignExpedition } from "../../src/types";

const router = Router();

router.get("/", async (req, res) => {
  const store = getStore();
  if (isSqlServerConnected()) {
    try {
      const dbExpeditions = await dbGetForeignExpeditions();
      if (dbExpeditions) {
        return res.json(dbExpeditions);
      }
    } catch (e) {
      console.error("[MSSQL Error on get foreign expeditions]:", e);
    }
  }
  res.json(store.foreignExpeditions);
});

router.post("/", async (req, res) => {
  const {
    foreign_order_id,
    n_facture,
    date_facture,
    n_bl_lta,
    montant,
    incoterm,
    port_aeroport_destination,
    shipped_lines,
  } = req.body;

  const targetOrderId = Number(foreign_order_id);
  if (!targetOrderId) {
    return res.status(400).json({ error: "Veuillez sélectionner une commande étrangère." });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const final_n_facture = n_facture && String(n_facture).trim() ? String(n_facture).trim() : "En attente";
  const final_date_facture = date_facture || todayStr;
  const final_n_bl_lta = n_bl_lta && String(n_bl_lta).trim() ? String(n_bl_lta).trim() : "En attente";

  let fOrder: ForeignOrder | undefined;
  const store = getStore();

  if (isSqlServerConnected()) {
    try {
      const dbOrders = await dbGetForeignOrders();
      fOrder = dbOrders.find((o) => Number(o.id) === targetOrderId);
    } catch (e) {
      console.error("[MSSQL Error fetching foreign order for expedition]:", e);
    }
  }

  if (!fOrder) {
    fOrder = store.foreignOrders.find((o) => Number(o.id) === targetOrderId);
  }

  if (!fOrder) {
    return res.status(404).json({ error: "Commande étrangère non trouvée." });
  }

  const expedition_code = await getOrGenerateExpeditionCode(fOrder.id, fOrder.code);

  const expData: Omit<ForeignExpedition, 'id'> = {
    foreign_order_id: fOrder.id,
    foreign_code: fOrder.code,
    expedition_code,
    n_facture: final_n_facture,
    date_facture: final_date_facture,
    n_bl_lta: final_n_bl_lta,
    montant: Number(montant) || 0,
    incoterm: incoterm || "FOB",
    port_aeroport_destination: port_aeroport_destination || "Port d'Alger",
    status: req.body.status || "In Transit",
    created_at: new Date().toISOString(),
    shipped_lines: shipped_lines || [],
  };

  let createdExp: ForeignExpedition;

  if (isSqlServerConnected()) {
    try {
      createdExp = await dbCreateForeignExpedition(expData);
      store.foreignExpeditions.unshift(createdExp);
    } catch (e) {
      console.error("[MSSQL Error on create foreign expedition]:", e);
      createdExp = {
        id: store.foreignExpeditions.length ? Math.max(...store.foreignExpeditions.map((e) => e.id)) + 1 : 1,
        ...expData,
      };
      store.foreignExpeditions.unshift(createdExp);
    }
  } else {
    createdExp = {
      id: store.foreignExpeditions.length ? Math.max(...store.foreignExpeditions.map((e) => e.id)) + 1 : 1,
      ...expData,
    };
    store.foreignExpeditions.unshift(createdExp);
  }

  saveStore(store);
  await resequenceExpeditionsForOrder(fOrder.id);
  res.status(201).json(createdExp);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();
  const {
    n_facture,
    date_facture,
    n_bl_lta,
    montant,
    incoterm,
    port_aeroport_destination,
    status,
    shipped_lines,
  } = req.body;

  let existingExpeditions: ForeignExpedition[] = [];
  let allOrders: ForeignOrder[] = [];

  if (isSqlServerConnected()) {
    try {
      existingExpeditions = await dbGetForeignExpeditions();
      allOrders = await dbGetForeignOrders();
    } catch (e) {
      console.error("[MSSQL Error fetching data for update expedition]:", e);
    }
  }

  if (!existingExpeditions.length) existingExpeditions = store.foreignExpeditions;
  if (!allOrders.length) allOrders = store.foreignOrders;

  const currentExp = existingExpeditions.find((e) => Number(e.id) === id);
  if (!currentExp) return res.status(404).json({ error: "Expédition non trouvée." });

  const parentOrder = allOrders.find((o) => Number(o.id) === Number(currentExp.foreign_order_id));

  if (parentOrder && shipped_lines && Array.isArray(shipped_lines)) {
    for (const sLine of shipped_lines) {
      const oLine = parentOrder.lines?.find(
        (l, idx) =>
          Number(l.id) === Number(sLine.foreign_line_id) ||
          Number(l.position) === Number(sLine.foreign_line_id) ||
          idx + 1 === Number(sLine.foreign_line_id)
      );

      if (oLine) {
        const otherShipped = existingExpeditions
          .filter((e) => Number(e.foreign_order_id) === Number(parentOrder.id) && Number(e.id) !== id)
          .reduce((sum, e) => {
            const match = e.shipped_lines?.find(
              (el, idx) =>
                Number(el.foreign_line_id) === Number(sLine.foreign_line_id) ||
                (el.id && Number(el.foreign_line_id) === Number(oLine.id)) ||
                idx + 1 === Number(sLine.foreign_line_id)
            );
            return sum + (match ? Number(match.shipped_qty) || 0 : 0);
          }, 0);

        const availableBalance = Math.max(0, oLine.qty - otherShipped);
        const requestedQty = Number(sLine.shipped_qty) || 0;

        if (requestedQty > availableBalance) {
          return res.status(400).json({
            error: `La quantité saisie (${requestedQty}) dépasse le solde disponible (${availableBalance}) de la commande principale pour l'article "${oLine.designation}". Modifiez la commande principale pour augmenter la quantité.`,
          });
        }
      }
    }
  }

  const updatedData: Partial<ForeignExpedition> = {
    n_facture: n_facture !== undefined ? String(n_facture).trim() : currentExp.n_facture,
    date_facture: date_facture || currentExp.date_facture,
    n_bl_lta: n_bl_lta !== undefined ? String(n_bl_lta).trim() : currentExp.n_bl_lta,
    montant: montant !== undefined ? Number(montant) || 0 : currentExp.montant,
    incoterm: incoterm || currentExp.incoterm,
    port_aeroport_destination: port_aeroport_destination || currentExp.port_aeroport_destination,
    status: status || currentExp.status,
    shipped_lines: shipped_lines || currentExp.shipped_lines,
  };

  if (isSqlServerConnected()) {
    try {
      await dbUpdateForeignExpeditionFull(id, updatedData);
    } catch (e) {
      console.error("[MSSQL Error on update foreign expedition full]:", e);
      return res.status(500).json({ error: "Erreur de sauvegarde SQL Server: " + (e as any).message });
    }
  }

  const idx = store.foreignExpeditions.findIndex((e) => Number(e.id) === id);
  if (idx !== -1) {
    store.foreignExpeditions[idx] = {
      ...store.foreignExpeditions[idx],
      ...updatedData,
    };
    saveStore(store);
    return res.json(store.foreignExpeditions[idx]);
  }

  res.json({ id, ...updatedData });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();

  let targetExp = store.foreignExpeditions.find((e) => Number(e.id) === id);
  if (!targetExp && isSqlServerConnected()) {
    try {
      const allDbExps = await dbGetForeignExpeditions();
      targetExp = allDbExps.find((e) => Number(e.id) === id);
    } catch (e) {
      console.error("[MSSQL Error finding expedition to delete]:", e);
    }
  }

  const foreignOrderId = targetExp ? targetExp.foreign_order_id : null;

  if (isSqlServerConnected()) {
    try {
      await dbDeleteForeignExpedition(id);
    } catch (e) {
      console.error("[MSSQL Error on delete foreign expedition]:", e);
    }
  }

  store.foreignExpeditions = store.foreignExpeditions.filter((e) => Number(e.id) !== id);
  saveStore(store);

  if (foreignOrderId) {
    await resequenceExpeditionsForOrder(foreignOrderId);
  }

  res.json({ success: true });
});

router.patch("/:id/status", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();
  const index = store.foreignExpeditions.findIndex((e) => e.id === id);
  if (index === -1) return res.status(404).json({ error: "Expedition not found." });

  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status required." });

  if (isSqlServerConnected()) {
    try {
      await dbUpdateForeignExpeditionStatus(id, status);
    } catch (e) {
      console.error("[MSSQL Error on update expedition status]:", e);
    }
  }

  store.foreignExpeditions[index].status = status;
  saveStore(store);
  res.json(store.foreignExpeditions[index]);
});

export default router;
