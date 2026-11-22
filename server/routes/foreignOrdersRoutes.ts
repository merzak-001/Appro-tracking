import { Router } from "express";
import { getStore, saveStore } from "../config/store";
import { generateNextOrderNumber } from "../services/orderSequenceService";
import {
  isSqlServerConnected,
  dbGetForeignOrders,
  dbCreateForeignOrder,
  dbCreateForeignExpedition,
  dbUpdateForeignOrder,
  dbUpdateForeignOrderStatus,
  dbDeleteForeignOrder,
} from "../../src/db";
import { ForeignOrder, ForeignOrderLine } from "../../src/types";

const router = Router();

router.get("/", async (req, res) => {
  const store = getStore();
  if (isSqlServerConnected()) {
    try {
      const dbForeignOrders = await dbGetForeignOrders();
      if (dbForeignOrders) {
        const merged = dbForeignOrders.map((o) => {
          const stored = store.foreignOrders.find((s) => s.id === o.id || s.code === o.code);
          return {
            ...o,
            procurement_source_type: stored?.procurement_source_type || 'none',
            consultation_id: stored?.consultation_id,
            consultation_ref: stored?.consultation_ref,
            appel_offre_id: stored?.appel_offre_id,
            appel_offre_ref: stored?.appel_offre_ref,
          };
        });
        return res.json(merged);
      }
    } catch (e) {
      console.error("[MSSQL Error on get foreign orders]:", e);
    }
  }
  const result = store.foreignOrders.map((o) => {
    const sup = store.suppliers.find((s) => s.id === o.fournisseur_id);
    return { ...o, supplier_name: sup ? sup.name : "Unknown Supplier" };
  });
  res.json(result);
});

router.post("/", async (req, res) => {
  const {
    date,
    proforma_ref,
    proforma_date,
    mode_paiement,
    currency,
    fournisseur_id,
    country,
    estimated_time_delivery,
    lines,
    procurement_source_type,
    consultation_id,
    consultation_ref,
    appel_offre_id,
    appel_offre_ref,
  } = req.body;

  if (!date || !proforma_ref || !proforma_date || !fournisseur_id || !estimated_time_delivery) {
    return res.status(400).json({ error: "Missing required foreign order fields." });
  }

  const code = await generateNextOrderNumber("foreign");
  const store = getStore();

  let computed_amount = 0;
  const processedLines: ForeignOrderLine[] = (lines || []).map((line: any, idx: number) => {
    const qty = Number(line.qty) || 0;
    const unit_price = Number(line.unit_price) || 0;
    const total_price = Number((qty * unit_price).toFixed(2));
    computed_amount += total_price;

    return {
      id: idx + 1,
      position: idx + 1,
      designation: line.designation || "Item",
      qty,
      unite: line.unite || "piece",
      unit_price,
      total_price,
    };
  });

  const sup = store.suppliers.find((s) => s.id === Number(fournisseur_id));
  const num_expeditions = Math.max(1, Number(req.body.num_expeditions) || 1);
  const destination_type = req.body.destination_type || 'Port';
  const default_port = destination_type === 'Aéroport' ? 'Aéroport Houari Boumediene (Alger)' : "Port d'Alger";

  const orderData: Omit<ForeignOrder, 'id'> = {
    code,
    date,
    proforma_ref,
    proforma_date,
    mode_paiement: mode_paiement || "",
    amount: processedLines.length ? Number(computed_amount.toFixed(2)) : Number(req.body.amount) || 0,
    currency: currency || "EUR",
    fournisseur_id: Number(fournisseur_id),
    supplier_name: sup ? sup.name : "",
    country: country || (sup ? sup.country : "International"),
    estimated_time_delivery,
    status: "Active",
    created_at: new Date().toISOString(),
    lines: processedLines,
    num_expeditions,
    destination_type,
    procurement_source_type: procurement_source_type || 'none',
    consultation_id: consultation_id ? Number(consultation_id) : undefined,
    consultation_ref: consultation_ref || undefined,
    appel_offre_id: appel_offre_id ? Number(appel_offre_id) : undefined,
    appel_offre_ref: appel_offre_ref || undefined,
  };

  let createdOrder: ForeignOrder;

  if (isSqlServerConnected()) {
    try {
      const dbOrder = await dbCreateForeignOrder(orderData);
      createdOrder = {
        ...dbOrder,
        procurement_source_type: orderData.procurement_source_type,
        consultation_id: orderData.consultation_id,
        consultation_ref: orderData.consultation_ref,
        appel_offre_id: orderData.appel_offre_id,
        appel_offre_ref: orderData.appel_offre_ref,
      };
    } catch (e) {
      console.error("[MSSQL Error on create foreign order]:", e);
      createdOrder = {
        id: store.foreignOrders.length ? Math.max(...store.foreignOrders.map((o) => o.id)) + 1 : 1,
        ...orderData,
      };
    }
  } else {
    createdOrder = {
      id: store.foreignOrders.length ? Math.max(...store.foreignOrders.map((o) => o.id)) + 1 : 1,
      ...orderData,
    };
  }

  store.foreignOrders.unshift(createdOrder);

  // Auto-create num_expeditions linked expeditions
  const suffixMap: Record<number, string> = { 1: "1ere", 2: "2eme", 3: "3eme", 4: "4eme", 5: "5eme", 6: "6eme" };

  for (let i = 1; i <= num_expeditions; i++) {
    const expCode = num_expeditions === 1 
      ? createdOrder.code 
      : `${createdOrder.code}-${suffixMap[i] || i + 'eme'}`;

    const isFirst = i === 1;

    const shipped_lines = createdOrder.lines.map((l, idx) => ({
      foreign_line_id: l.id || idx + 1,
      designation: l.designation,
      unit_price: l.unit_price,
      unite: l.unite,
      shipped_qty: l.qty,
      shipped_amount: isFirst ? l.total_price : 0,
    }));

    const expData = {
      foreign_order_id: createdOrder.id,
      foreign_code: createdOrder.code,
      expedition_code: expCode,
      n_facture: 'En attente',
      date_facture: date,
      n_bl_lta: 'En attente',
      montant: isFirst ? createdOrder.amount : 0,
      incoterm: 'FOB' as const,
      port_aeroport_destination: default_port,
      status: 'In Transit' as const,
      created_at: new Date().toISOString(),
      shipped_lines,
    };

    if (isSqlServerConnected()) {
      try {
        const createdExp = await dbCreateForeignExpedition(expData);
        store.foreignExpeditions.unshift(createdExp);
      } catch (e) {
        console.error('[MSSQL Error auto creating expedition]:', e);
        const newExp = {
          id: store.foreignExpeditions.length ? Math.max(...store.foreignExpeditions.map((e) => e.id)) + 1 : 1,
          ...expData,
        };
        store.foreignExpeditions.unshift(newExp);
      }
    } else {
      const newExp = {
        id: store.foreignExpeditions.length ? Math.max(...store.foreignExpeditions.map((e) => e.id)) + 1 : 1,
        ...expData,
      };
      store.foreignExpeditions.unshift(newExp);
    }
  }

  saveStore(store);
  res.status(201).json(createdOrder);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();
  const index = store.foreignOrders.findIndex((o) => o.id === id);
  if (index === -1) return res.status(404).json({ error: "Order not found." });

  const {
    code,
    date,
    proforma_ref,
    proforma_date,
    mode_paiement,
    amount,
    currency,
    fournisseur_id,
    country,
    estimated_time_delivery,
    status,
    lines,
    procurement_source_type,
    consultation_id,
    consultation_ref,
    appel_offre_id,
    appel_offre_ref,
  } = req.body;

  let computed_amount = 0;
  const processedLines: ForeignOrderLine[] = (lines || []).map((line: any, idx: number) => {
    const qty = Number(line.qty) || 0;
    const unit_price = Number(line.unit_price) || 0;
    const total_price = Number((qty * unit_price).toFixed(2));
    computed_amount += total_price;

    return {
      id: line.id || idx + 1,
      foreign_order_id: id,
      position: idx + 1,
      designation: line.designation || "Item",
      qty,
      unite: line.unite || "piece",
      unit_price,
      total_price,
    };
  });

  const sup = store.suppliers.find((s) => s.id === Number(fournisseur_id));

  const updatedData: Partial<ForeignOrder> = {
    code: code || store.foreignOrders[index].code,
    date: date || store.foreignOrders[index].date,
    proforma_ref: proforma_ref || store.foreignOrders[index].proforma_ref,
    proforma_date: proforma_date || store.foreignOrders[index].proforma_date,
    mode_paiement: mode_paiement !== undefined ? mode_paiement : store.foreignOrders[index].mode_paiement,
    amount: processedLines.length ? Number(computed_amount.toFixed(2)) : (amount !== undefined ? Number(amount) : store.foreignOrders[index].amount),
    currency: currency || store.foreignOrders[index].currency,
    fournisseur_id: Number(fournisseur_id) || store.foreignOrders[index].fournisseur_id,
    supplier_name: sup ? sup.name : store.foreignOrders[index].supplier_name,
    country: country || (sup ? sup.country : store.foreignOrders[index].country),
    estimated_time_delivery: estimated_time_delivery || store.foreignOrders[index].estimated_time_delivery,
    status: status || store.foreignOrders[index].status,
    lines: processedLines,
    procurement_source_type: procurement_source_type || store.foreignOrders[index].procurement_source_type || 'none',
    consultation_id: consultation_id !== undefined ? Number(consultation_id) : store.foreignOrders[index].consultation_id,
    consultation_ref: consultation_ref !== undefined ? consultation_ref : store.foreignOrders[index].consultation_ref,
    appel_offre_id: appel_offre_id !== undefined ? Number(appel_offre_id) : store.foreignOrders[index].appel_offre_id,
    appel_offre_ref: appel_offre_ref !== undefined ? appel_offre_ref : store.foreignOrders[index].appel_offre_ref,
  };

  if (isSqlServerConnected()) {
    try {
      await dbUpdateForeignOrder(id, updatedData);
    } catch (e) {
      console.error("[MSSQL Error on update foreign order]:", e);
    }
  }

  if (index !== -1) {
    store.foreignOrders[index] = {
      ...store.foreignOrders[index],
      ...updatedData,
    };
    saveStore(store);
    return res.json(store.foreignOrders[index]);
  }

  res.json({ id, ...updatedData });
});

router.patch("/:id/status", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Statut requis." });

  if (isSqlServerConnected()) {
    try {
      await dbUpdateForeignOrderStatus(id, status);
    } catch (e) {
      console.error("[MSSQL Error on update foreign order status]:", e);
    }
  }

  const index = store.foreignOrders.findIndex((o) => o.id === id);
  if (index !== -1) {
    store.foreignOrders[index].status = status;
    saveStore(store);
    return res.json(store.foreignOrders[index]);
  }
  res.json({ success: true, status });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();
  if (isSqlServerConnected()) {
    try {
      await dbDeleteForeignOrder(id);
    } catch (e) {
      console.error("[MSSQL Error on delete foreign order]:", e);
    }
  }
  store.foreignOrders = store.foreignOrders.filter((o) => o.id !== id);
  store.foreignExpeditions = store.foreignExpeditions.filter((e) => e.foreign_order_id !== id);
  saveStore(store);
  res.json({ success: true });
});

export default router;
