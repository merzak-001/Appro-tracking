import { Router } from "express";
import { getStore, saveStore } from "../config/store";
import {
  isSqlServerConnected,
  dbGetLocalDeliveries,
  dbCreateLocalDelivery,
  dbUpdateLocalDelivery,
  dbDeleteLocalDelivery,
  dbClearAllLocalDeliveries,
  dbGetSAPOrderMappings,
  dbSaveSAPOrderMapping,
  dbBatchCreateLocalDeliveries,
  dbUpdateLocalOrderStatus,
} from "../../src/db";
import { LocalDelivery } from "../../src/types";

const router = Router();

router.get("/", async (req, res) => {
  const store = getStore();
  if (isSqlServerConnected()) {
    try {
      const dbDeliveries = await dbGetLocalDeliveries();
      if (dbDeliveries) {
        return res.json(dbDeliveries);
      }
    } catch (e) {
      console.error("[MSSQL Error on get local deliveries]:", e);
    }
  }
  res.json(store.localDeliveries);
});

// SAP Order Mappings
router.get("/sap-mappings", async (req, res) => {
  if (isSqlServerConnected()) {
    try {
      const mappings = await dbGetSAPOrderMappings();
      return res.json(mappings);
    } catch (e) {
      console.error("[MSSQL Error on get sap mappings]:", e);
    }
  }
  const store = getStore();
  res.json((store as any).sapOrderMappings || []);
});

router.post("/sap-mappings", async (req, res) => {
  const { sap_order_number, local_order_id, local_order_number } = req.body;
  if (!sap_order_number || !local_order_id) {
    return res.status(400).json({ error: "Missing required mapping fields." });
  }

  if (isSqlServerConnected()) {
    try {
      await dbSaveSAPOrderMapping(String(sap_order_number), Number(local_order_id), String(local_order_number || ''));
    } catch (e) {
      console.error("[MSSQL Error on save sap mapping]:", e);
    }
  }

  const store = getStore();
  if (!(store as any).sapOrderMappings) (store as any).sapOrderMappings = [];
  const existingIndex = (store as any).sapOrderMappings.findIndex((m: any) => m.sap_order_number === sap_order_number);
  const newMapping = {
    id: Date.now(),
    sap_order_number: String(sap_order_number),
    local_order_id: Number(local_order_id),
    local_order_number: String(local_order_number || ''),
    created_at: new Date().toISOString()
  };
  if (existingIndex >= 0) {
    (store as any).sapOrderMappings[existingIndex] = newMapping;
  } else {
    (store as any).sapOrderMappings.push(newMapping);
  }
  saveStore(store);

  res.json({ success: true, mapping: newMapping });
});

// Clear all deliveries
router.delete("/clear-all", async (req, res) => {
  if (isSqlServerConnected()) {
    try {
      await dbClearAllLocalDeliveries();
    } catch (e) {
      console.error("[MSSQL Error on clear-all local deliveries]:", e);
    }
  }
  const store = getStore();
  store.localDeliveries = [];
  saveStore(store);
  res.json({ success: true, message: "All deliveries have been cleared." });
});

// SAP Bulk Import Endpoint
router.post("/import-sap", async (req, res) => {
  const { items, newMappings } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "No items provided for import." });
  }

  // Save any newly learned mappings first
  if (Array.isArray(newMappings)) {
    for (const m of newMappings) {
      if (m.sap_order_number && m.local_order_id) {
        try {
          if (isSqlServerConnected()) {
            await dbSaveSAPOrderMapping(String(m.sap_order_number), Number(m.local_order_id), String(m.local_order_number || ''));
          }
          const store = getStore();
          if (!(store as any).sapOrderMappings) (store as any).sapOrderMappings = [];
          const idx = (store as any).sapOrderMappings.findIndex((x: any) => x.sap_order_number === m.sap_order_number);
          const obj = {
            id: Date.now(),
            sap_order_number: String(m.sap_order_number),
            local_order_id: Number(m.local_order_id),
            local_order_number: String(m.local_order_number || ''),
            created_at: new Date().toISOString()
          };
          if (idx >= 0) (store as any).sapOrderMappings[idx] = obj;
          else (store as any).sapOrderMappings.push(obj);
          saveStore(store);
        } catch (e) {
          console.error("Error saving mapping during import:", e);
        }
      }
    }
  }

  const store = getStore();
  const dbItemsToInsert: any[] = [];
  const inMemoryItemsToInsert: LocalDelivery[] = [];

  for (const item of items) {
    const {
      order_id,
      line_id,
      delivered_qty,
      delivery_date,
      delivery_note_number,
      movement_code,
      material_doc_number,
      sap_order_number,
      item_code,
      designation,
      unite,
      n_order,
      unit_price
    } = item;

    const qty = Number(delivered_qty);
    if (!order_id || !line_id || !delivery_date) continue;

    let cleanDate = String(delivery_date);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanDate)) {
      const p = cleanDate.split('/');
      cleanDate = `${p[2]}-${p[1]}-${p[0]}`;
    }

    const mCode = String(movement_code || (qty < 0 ? '104' : '103'));
    const blNum = String(delivery_note_number || material_doc_number || 'BL-SAP').trim();

    dbItemsToInsert.push({
      order_id: Number(order_id),
      line_id: Number(line_id),
      delivered_qty: qty,
      delivery_date: cleanDate,
      delivery_note_number: blNum,
      movement_code: mCode,
      material_doc_number: material_doc_number ? String(material_doc_number) : null,
      sap_order_number: sap_order_number ? String(sap_order_number) : null,
      item_code: item_code ? String(item_code) : null,
    });

    const order = store.localOrders.find((o) => Number(o.id) === Number(order_id) || o.n_order === n_order);
    const line = order ? order.lines.find((l) => Number(l.id) === Number(line_id) || l.designation === designation) : null;
    const finalUnitPrice = unit_price !== undefined ? Number(unit_price) : (line ? line.unit_price : 0);

    inMemoryItemsToInsert.push({
      id: Math.floor(Date.now() + Math.random() * 100000),
      order_id: Number(order_id),
      n_order: order ? order.n_order : (n_order || "CMD"),
      line_id: Number(line_id),
      designation: line ? line.designation : (designation || "Article"),
      unite: line ? line.unite : (unite || "U"),
      ordered_qty: line ? line.qty : Math.abs(qty),
      delivered_qty: qty,
      unit_price: finalUnitPrice,
      original_unit_price: line ? line.unit_price : finalUnitPrice,
      delivery_date: cleanDate,
      delivery_note_number: blNum,
      movement_code: mCode,
      material_doc_number: material_doc_number ? String(material_doc_number) : undefined,
      sap_order_number: sap_order_number ? String(sap_order_number) : undefined,
      item_code: item_code ? String(item_code) : undefined,
      created_at: new Date().toISOString(),
    });
  }

  let insertedInDb = 0;
  if (isSqlServerConnected()) {
    try {
      insertedInDb = await dbBatchCreateLocalDeliveries(dbItemsToInsert);
    } catch (e) {
      console.error("[MSSQL Error in /import-sap]:", e);
    }
  }

  store.localDeliveries = [...inMemoryItemsToInsert, ...store.localDeliveries];
  saveStore(store);

  res.status(201).json({
    success: true,
    totalReceived: items.length,
    insertedCount: isSqlServerConnected() ? insertedInDb : inMemoryItemsToInsert.length,
  });
});

router.post("/batch", async (req, res) => {
  const { deliveries } = req.body;
  if (!Array.isArray(deliveries) || deliveries.length === 0) {
    return res.status(400).json({ error: "Invalid deliveries array." });
  }

  const store = getStore();
  const createdDeliveries: LocalDelivery[] = [];
  const errors: string[] = [];

  for (const item of deliveries) {
    const { order_id, line_id, delivered_qty, unit_price, delivery_date, delivery_note_number, designation, unite, n_order } = item;
    const qtyNum = Number(delivered_qty);
    if (!order_id || !line_id || !qtyNum || !delivery_date || !delivery_note_number) continue;

    let cleanDate = String(delivery_date);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanDate)) {
      const p = cleanDate.split('/');
      cleanDate = `${p[2]}-${p[1]}-${p[0]}`;
    }

    if (isSqlServerConnected()) {
      try {
        await dbCreateLocalDelivery({
          order_id: Number(order_id),
          line_id: Number(line_id),
          delivered_qty: qtyNum,
          delivery_date: cleanDate,
          delivery_note_number: String(delivery_note_number).trim(),
        });
      } catch (e: any) {
        console.error("[MSSQL Error on batch create local delivery]:", e);
        errors.push(e?.message || String(e));
      }
    }

    const order = store.localOrders.find((o) => Number(o.id) === Number(order_id) || o.n_order === n_order);
    const line = order ? order.lines.find((l) => Number(l.id) === Number(line_id) || l.designation === designation) : null;

    const finalUnitPrice = unit_price !== undefined && Number(unit_price) > 0 ? Number(unit_price) : (line ? line.unit_price : 0);

    const newDelivery: LocalDelivery = {
      id: store.localDeliveries.length ? Math.max(...store.localDeliveries.map((d) => d.id || 0)) + 1 : Math.floor(Date.now() % 1000000),
      order_id: Number(order_id),
      n_order: order ? order.n_order : (n_order || "CMD"),
      line_id: Number(line_id),
      designation: line ? line.designation : (designation || "Article"),
      unite: line ? line.unite : (unite || "U"),
      ordered_qty: line ? line.qty : qtyNum,
      delivered_qty: qtyNum,
      unit_price: finalUnitPrice,
      original_unit_price: line ? line.unit_price : finalUnitPrice,
      delivery_date: cleanDate,
      delivery_note_number: String(delivery_note_number).trim(),
      created_at: new Date().toISOString(),
    };

    store.localDeliveries.unshift(newDelivery);
    createdDeliveries.push(newDelivery);
  }

  saveStore(store);

  if (createdDeliveries.length === 0 && errors.length > 0) {
    return res.status(500).json({ error: errors.join("; ") });
  }

  res.status(201).json({ success: true, count: createdDeliveries.length, deliveries: createdDeliveries });
});

router.post("/", async (req, res) => {
  const { order_id, line_id, delivered_qty, unit_price, delivery_date, delivery_note_number, movement_code, material_doc_number, sap_order_number, item_code } = req.body;

  if (!order_id || !line_id || !delivered_qty || !delivery_date || !delivery_note_number) {
    return res.status(400).json({ error: "Missing required delivery details." });
  }

  const store = getStore();
  const order = store.localOrders.find((o) => o.id === Number(order_id));
  const line = order ? order.lines.find((l) => l.id === Number(line_id)) : null;

  const finalUnitPrice = unit_price !== undefined ? Number(unit_price) : (line ? line.unit_price : 0);

  if (isSqlServerConnected()) {
    try {
      await dbCreateLocalDelivery({
        order_id: Number(order_id),
        line_id: Number(line_id),
        delivered_qty: Number(delivered_qty),
        delivery_date,
        delivery_note_number,
        movement_code,
        material_doc_number,
        sap_order_number,
        item_code,
      });
    } catch (e) {
      console.error("[MSSQL Error on create local delivery]:", e);
    }
  }

  const newDelivery: LocalDelivery = {
    id: store.localDeliveries.length ? Math.max(...store.localDeliveries.map((d) => d.id || 0)) + 1 : 1,
    order_id: Number(order_id),
    n_order: order ? order.n_order : "CMD",
    line_id: Number(line_id),
    designation: line ? line.designation : "Article",
    unite: line ? line.unite : "U",
    ordered_qty: line ? line.qty : Number(delivered_qty),
    delivered_qty: Number(delivered_qty),
    unit_price: finalUnitPrice,
    original_unit_price: line ? line.unit_price : finalUnitPrice,
    delivery_date,
    delivery_note_number,
    movement_code: movement_code || '103',
    material_doc_number,
    sap_order_number,
    item_code,
    created_at: new Date().toISOString(),
  };

  store.localDeliveries.unshift(newDelivery);
  saveStore(store);
  res.status(201).json(newDelivery);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { delivered_qty, delivery_date, delivery_note_number, unit_price } = req.body;
  const store = getStore();

  if (isSqlServerConnected()) {
    try {
      await dbUpdateLocalDelivery({
        id,
        delivered_qty: Number(delivered_qty),
        delivery_date,
        delivery_note_number,
      });
    } catch (e) {
      console.error("[MSSQL Error on update local delivery]:", e);
    }
  }

  const deliv = store.localDeliveries.find((d) => d.id === id);
  if (deliv) {
    if (delivered_qty !== undefined) deliv.delivered_qty = Number(delivered_qty);
    if (delivery_date !== undefined) deliv.delivery_date = delivery_date;
    if (delivery_note_number !== undefined) deliv.delivery_note_number = delivery_note_number;
    if (unit_price !== undefined) deliv.unit_price = Number(unit_price);
  }
  saveStore(store);
  res.json({ success: true, delivery: deliv });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();
  if (isSqlServerConnected()) {
    try {
      await dbDeleteLocalDelivery(id);
    } catch (e) {
      console.error("[MSSQL Error on delete local delivery]:", e);
    }
  }
  store.localDeliveries = store.localDeliveries.filter((d) => d.id !== id);
  saveStore(store);
  res.json({ success: true });
});

export default router;
