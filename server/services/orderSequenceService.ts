import { getStore, saveStore } from "../config/store";
import {
  isSqlServerConnected,
  dbGetLocalOrders,
  dbGetForeignOrders,
  dbGetForeignExpeditions,
  dbUpdateExpeditionDetails,
  dbUpdateExpeditionCode,
} from "../../src/db";
import { ForeignExpedition, ExpeditionLine } from "../../src/types";

export async function generateNextOrderNumber(type: "local" | "foreign"): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearSuffix = String(currentYear).slice(-2);
  const prefix = `S${yearSuffix}-`;

  let activeCodes: string[] = [];
  const store = getStore();

  if (isSqlServerConnected()) {
    try {
      if (type === "local") {
        const dbOrders = await dbGetLocalOrders();
        activeCodes = dbOrders.map((o) => o.n_order);
      } else {
        const dbOrders = await dbGetForeignOrders();
        activeCodes = dbOrders.map((o) => o.code);
      }
    } catch (e) {
      console.error("[MSSQL Error getting active orders for sequence]:", e);
    }
  }

  if (!activeCodes.length) {
    if (type === "local") {
      activeCodes = store.localOrders.map((o) => o.n_order);
    } else {
      activeCodes = store.foreignOrders.map((o) => o.code);
    }
  }

  if (type === "local") {
    let maxNum = 149;

    activeCodes.forEach((codeStr) => {
      if (codeStr && codeStr.startsWith(prefix) && codeStr.endsWith("L")) {
        const numPart = codeStr.substring(prefix.length, codeStr.length - 1);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    });

    return `${prefix}${maxNum + 1}L`;
  } else {
    let maxNum = 19;

    activeCodes.forEach((codeStr) => {
      if (codeStr && codeStr.startsWith(prefix) && codeStr.endsWith("E")) {
        const numPart = codeStr.substring(prefix.length, codeStr.length - 1);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    });

    const nextNum = maxNum + 1;
    if (nextNum > 99) {
      throw new Error("Limite de séquence de commande étrangère (99) atteinte pour cette année");
    }

    const formattedNum = String(nextNum).padStart(2, "0");
    return `${prefix}${formattedNum}E`;
  }
}

export async function getOrGenerateExpeditionCode(foreignOrderId: number, orderCode: string): Promise<string> {
  const store = getStore();
  let existingExpeditions: ForeignExpedition[] = [];

  if (isSqlServerConnected()) {
    try {
      const allDbExps = await dbGetForeignExpeditions();
      existingExpeditions = allDbExps.filter(e => Number(e.foreign_order_id) === Number(foreignOrderId));
    } catch (e) {
      console.error("[MSSQL Error getting existing expeditions]:", e);
      existingExpeditions = store.foreignExpeditions.filter(e => Number(e.foreign_order_id) === Number(foreignOrderId));
    }
  } else {
    existingExpeditions = store.foreignExpeditions.filter(e => Number(e.foreign_order_id) === Number(foreignOrderId));
  }

  existingExpeditions.sort((a, b) => a.id - b.id);

  const count = existingExpeditions.length + 1;

  if (count === 1) {
    return orderCode;
  }

  const suffixMap: Record<number, string> = {
    2: "2eme",
    3: "3eme",
    4: "4eme",
    5: "5eme",
    6: "6eme",
  };

  const suffix = suffixMap[count] || `${count}eme`;
  return `${orderCode}-${suffix}`;
}

export async function adjustFirstExpeditionQuantitiesAndAmount(
  foreignOrderId: number,
  newExpeditionLines: ExpeditionLine[]
): Promise<void> {
  const store = getStore();
  let allDbExps: ForeignExpedition[] = [];
  if (isSqlServerConnected()) {
    try {
      allDbExps = await dbGetForeignExpeditions();
    } catch (e) {
      console.error("[MSSQL Error fetching expeditions for adjustment]:", e);
    }
  }
  if (!allDbExps.length) {
    allDbExps = store.foreignExpeditions;
  }

  const orderExps = allDbExps
    .filter((e) => Number(e.foreign_order_id) === Number(foreignOrderId))
    .sort((a, b) => a.id - b.id);

  if (orderExps.length === 0) return;

  const firstExp = orderExps[0];
  if (!firstExp || !firstExp.shipped_lines) return;

  let newFirstMontant = 0;

  const updatedFirstLines = firstExp.shipped_lines.map((line, idx) => {
    const newExpLine = newExpeditionLines.find(
      (nl) =>
        Number(nl.foreign_line_id) === Number(line.foreign_line_id) ||
        (line.id && Number(nl.foreign_line_id) === Number(line.id)) ||
        Number(nl.foreign_line_id) === idx + 1
    );

    const newExpQty = newExpLine ? Number(newExpLine.shipped_qty) || 0 : 0;
    const currentFirstQty = Number(line.shipped_qty) || 0;
    const adjustedQty = Math.max(0, currentFirstQty - newExpQty);
    const unitPrice = Number(line.unit_price) || 0;
    const lineMontant = Number((adjustedQty * unitPrice).toFixed(2));

    newFirstMontant += lineMontant;

    return {
      ...line,
      shipped_qty: adjustedQty,
      shipped_amount: lineMontant,
    };
  });

  const finalMontant = Number(newFirstMontant.toFixed(2));

  if (isSqlServerConnected()) {
    try {
      await dbUpdateExpeditionDetails(firstExp.id, finalMontant, updatedFirstLines);
    } catch (e) {
      console.error("[MSSQL Error updating 1st expedition details]:", e);
    }
  }

  const storeFirstExp = store.foreignExpeditions.find((e) => Number(e.id) === Number(firstExp.id));
  if (storeFirstExp) {
    storeFirstExp.montant = finalMontant;
    storeFirstExp.shipped_lines = updatedFirstLines;
  }
  saveStore(store);
}

export async function resequenceExpeditionsForOrder(foreignOrderId: number): Promise<void> {
  const store = getStore();
  let orderExpeditions: ForeignExpedition[] = [];
  let orderCode = "";

  if (isSqlServerConnected()) {
    try {
      const allDbExps = await dbGetForeignExpeditions();
      const allOrders = await dbGetForeignOrders();
      const order = allOrders.find(o => Number(o.id) === Number(foreignOrderId));
      if (order) orderCode = order.code;

      orderExpeditions = allDbExps.filter(e => Number(e.foreign_order_id) === Number(foreignOrderId));
    } catch (e) {
      console.error("[MSSQL Error fetching expeditions for resequence]:", e);
    }
  }

  if (!orderExpeditions.length) {
    orderExpeditions = store.foreignExpeditions.filter(e => Number(e.foreign_order_id) === Number(foreignOrderId));
    const storeOrder = store.foreignOrders.find(o => Number(o.id) === Number(foreignOrderId));
    if (storeOrder) orderCode = storeOrder.code;
  }

  if (!orderCode || !orderExpeditions.length) return;

  orderExpeditions.sort((a, b) => a.id - b.id);

  const total = orderExpeditions.length;
  const suffixMap: Record<number, string> = {
    1: "1ere",
    2: "2eme",
    3: "3eme",
    4: "4eme",
    5: "5eme",
    6: "6eme",
  };

  for (let idx = 0; idx < total; idx++) {
    const exp = orderExpeditions[idx];
    let newCode = "";
    if (total === 1) {
      newCode = orderCode;
    } else {
      const suffix = suffixMap[idx + 1] || `${idx + 1}eme`;
      newCode = `${orderCode}-${suffix}`;
    }

    if (exp.expedition_code !== newCode) {
      exp.expedition_code = newCode;
      if (isSqlServerConnected()) {
        try {
          await dbUpdateExpeditionCode(exp.id, newCode);
        } catch (e) {
          console.error("[MSSQL Error resequencing expedition code]:", e);
        }
      }

      const storeExp = store.foreignExpeditions.find(e => Number(e.id) === Number(exp.id));
      if (storeExp) {
        storeExp.expedition_code = newCode;
      }
    }
  }

  saveStore(store);
}
