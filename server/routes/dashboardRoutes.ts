import { Router } from "express";
import path from "path";
import fs from "fs";
import { getStore, setStore, saveStore, getDefaultStore } from "../config/store";
import { generateNextOrderNumber } from "../services/orderSequenceService";
import { DashboardKPIs } from "../../src/types";
import {
  isSqlServerConnected,
  dbGetLocalOrders,
  dbGetLocalDeliveries,
  dbGetForeignOrders,
  dbGetForeignExpeditions,
} from "../../src/db";

const router = Router();

// Company Info
router.get("/company-info", (req, res) => {
  const store = getStore();
  const defaultInfo = getDefaultStore().companyInfo;
  res.json(store.companyInfo || defaultInfo);
});

router.put("/company-info", (req, res) => {
  const store = getStore();
  const { name, rc, art, nif, nis, address, logo_url } = req.body;
  store.companyInfo = {
    name: name || store.companyInfo.name,
    rc: rc !== undefined ? rc : store.companyInfo.rc,
    art: art !== undefined ? art : store.companyInfo.art,
    nif: nif !== undefined ? nif : store.companyInfo.nif,
    nis: nis !== undefined ? nis : store.companyInfo.nis,
    address: address !== undefined ? address : store.companyInfo.address,
    logo_url: logo_url !== undefined ? logo_url : store.companyInfo.logo_url,
  };
  saveStore(store);
  res.json(store.companyInfo);
});

// Dashboard KPIs API
router.get("/dashboard/kpis", async (req, res) => {
  const store = getStore();
  let localOrders = store.localOrders || [];
  let localDeliveries = store.localDeliveries || [];
  let foreignOrders = store.foreignOrders || [];
  let foreignExpeditions = store.foreignExpeditions || [];

  if (isSqlServerConnected()) {
    try {
      const [dbLocOrd, dbLocDel, dbForOrd, dbForExp] = await Promise.all([
        dbGetLocalOrders(),
        dbGetLocalDeliveries(),
        dbGetForeignOrders(),
        dbGetForeignExpeditions(),
      ]);
      if (dbLocOrd) localOrders = dbLocOrd;
      if (dbLocDel) localDeliveries = dbLocDel;
      if (dbForOrd) foreignOrders = dbForOrd;
      if (dbForExp) foreignExpeditions = dbForExp;
    } catch (e) {
      console.error("[MSSQL Error on dashboard KPIs]:", e);
    }
  }

  // Local KPIs
  const totalLocalOrders = localOrders.length;
  const totalLocalHT = localOrders.reduce((sum, o) => sum + (Number(o.total_ht) || 0), 0);
  const totalLocalTTC = localOrders.reduce((sum, o) => sum + (Number(o.total_ttc) || 0), 0);
  const pendingCount = localOrders.filter((o) => o.status === "Pending").length;
  const inProgressCount = localOrders.filter((o) => o.status === "In Progress").length;
  const completedCount = localOrders.filter((o) => o.status === "Completed").length;
  const draftCount = localOrders.filter((o) => o.status === "Draft").length;

  // Foreign KPIs
  const activeForeignCount = foreignOrders.filter((o) => o.status === "Active" || o.status === "In Customs").length;
  const totalEurAmount = foreignOrders
    .filter((o) => o.currency === "EUR")
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const totalUsdAmount = foreignOrders
    .filter((o) => o.currency === "USD")
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  const now = new Date();
  const next30Days = new Date();
  next30Days.setDate(now.getDate() + 30);

  const upcomingETDCount = foreignOrders.filter((o) => {
    if (!o.estimated_time_delivery) return false;
    const etd = new Date(o.estimated_time_delivery);
    return etd >= now && etd <= next30Days;
  }).length;

  // Deliveries KPIs
  let totalOrderedLines = 0;
  let totalFulfilledLines = 0;

  localOrders.forEach((o) => {
    (o.lines || []).forEach((line) => {
      totalOrderedLines++;
      const lineDeliveredSum = localDeliveries
        .filter((d) => Number(d.order_id) === Number(o.id) && (Number(d.line_id) === Number(line.id) || Number(d.line_id) === Number(line.position)))
        .reduce((sum, d) => sum + (Number(d.delivered_qty) || 0), 0);

      if (lineDeliveredSum >= Number(line.qty)) {
        totalFulfilledLines++;
      }
    });
  });

  const pendingLinesCount = Math.max(0, totalOrderedLines - totalFulfilledLines);
  const fulfillmentRate = totalOrderedLines > 0 ? (totalFulfilledLines / totalOrderedLines) * 100 : 100;

  const kpis: DashboardKPIs = {
    local: {
      total_orders: totalLocalOrders,
      total_ht: Number(totalLocalHT.toFixed(2)),
      total_ttc: Number(totalLocalTTC.toFixed(2)),
      pending_count: pendingCount,
      in_progress_count: inProgressCount,
      completed_count: completedCount,
      draft_count: draftCount,
    },
    foreign: {
      active_count: activeForeignCount,
      total_amount_eur: Number(totalEurAmount.toFixed(2)),
      total_amount_usd: Number(totalUsdAmount.toFixed(2)),
      upcoming_etd_count: upcomingETDCount,
      total_expeditions: foreignExpeditions.length,
    },
    deliveries: {
      total_deliveries: localDeliveries.length,
      fulfilled_lines_count: totalFulfilledLines,
      pending_lines_count: pendingLinesCount,
      fulfillment_rate_percentage: Number(fulfillmentRate.toFixed(1)),
    },
  };

  res.json(kpis);
});

// Next Order Number Generator API
router.get("/orders/next-number", async (req, res) => {
  const type = (req.query.type as "local" | "foreign") || "local";
  try {
    const nextNum = await generateNextOrderNumber(type);
    res.json({ nextNumber: nextNum });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Reset Seed Data
router.post("/reset-seed", (req, res) => {
  const defaultData = getDefaultStore();
  setStore(defaultData);
  saveStore(defaultData);
  res.json({ message: "Seed data successfully restored.", store: defaultData });
});

// Get SQL Script
router.get("/sql-script", (req, res) => {
  const scriptPath = path.join(process.cwd(), "schema_sqlserver.sql");
  if (fs.existsSync(scriptPath)) {
    res.type("text/plain; charset=utf-8");
    res.sendFile(scriptPath);
  } else {
    res.status(404).send("-- SQL Script file not found.");
  }
});

export default router;
