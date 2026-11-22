import sql from "mssql/msnodesqlv8";
import { getPool } from "./connection";
import { ForeignExpedition, ExpeditionLine } from "../types";

export async function dbGetForeignExpeditions(): Promise<ForeignExpedition[]> {
  const pool = getPool();
  if (!pool) return [];
  const expRes = await pool.request().query<any>(`
    SELECT e.ID as id, e.Foreign_Order_ID as foreign_order_id, fo.Code as foreign_order_code,
           e.Expedition_Code as expedition_code, e.N_Facture as n_facture,
           CONVERT(VARCHAR(10), e.Date_Facture, 120) as date_facture,
           e.N_BL_LTA as n_bl_lta, e.Montant as montant, e.Incoterm as incoterm,
           e.Port_Aeroport_Destination as port_aeroport_destination,
           ISNULL(e.Status, 'In Transit') as status, e.Created_At as created_at
    FROM dbo.Foreign_Expedition e
    INNER JOIN dbo.Foreign_Order fo ON e.Foreign_Order_ID = fo.ID
    ORDER BY e.ID DESC
  `);

  const linesRes = await pool.request().query<any>(`
    SELECT el.ID as id, el.Expedition_ID as expedition_id, el.Foreign_Line_ID as foreign_line_id,
           fol.Designation as designation, fol.Unit_Price as unit_price, fol.Unite as unite, el.Shipped_Qty as shipped_qty
    FROM dbo.Expedition_Line el
    INNER JOIN dbo.Foreign_Order_Line fol ON el.Foreign_Line_ID = fol.ID
  `);

  const linesByExp: Record<number, any[]> = {};
  linesRes.recordset.forEach((l) => {
    if (!linesByExp[l.expedition_id]) linesByExp[l.expedition_id] = [];
    const qty = Number(l.shipped_qty);
    const unitPrice = Number(l.unit_price) || 0;
    linesByExp[l.expedition_id].push({
      id: l.id,
      expedition_id: l.expedition_id,
      foreign_line_id: l.foreign_line_id,
      designation: l.designation,
      unit_price: unitPrice,
      unite: l.unite || 'piece',
      shipped_qty: qty,
      shipped_amount: Number((qty * unitPrice).toFixed(2)),
    });
  });

  return expRes.recordset.map((e) => ({
    id: e.id,
    foreign_order_id: e.foreign_order_id,
    foreign_code: e.foreign_order_code,
    expedition_code: e.expedition_code,
    n_facture: e.n_facture,
    date_facture: e.date_facture,
    n_bl_lta: e.n_bl_lta,
    montant: Number(e.montant),
    incoterm: e.incoterm,
    port_aeroport_destination: e.port_aeroport_destination,
    status: e.status || 'In Transit',
    created_at: e.created_at ? new Date(e.created_at).toISOString() : new Date().toISOString(),
    shipped_lines: linesByExp[e.id] || [],
  }));
}

export async function dbCreateForeignExpedition(e: Omit<ForeignExpedition, 'id'>): Promise<ForeignExpedition> {
  const pool = getPool();
  if (!pool) throw new Error("SQL Server not connected");
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const req = transaction.request();
    req.input("Foreign_Order_ID", sql.Int, e.foreign_order_id);
    req.input("Expedition_Code", sql.NVarChar(50), e.expedition_code);
    req.input("N_Facture", sql.NVarChar(100), e.n_facture);
    req.input("Date_Facture", sql.VarChar(10), e.date_facture);
    req.input("N_BL_LTA", sql.NVarChar(100), e.n_bl_lta);
    req.input("Montant", sql.Decimal(18, 2), e.montant);
    req.input("Incoterm", sql.NVarChar(20), e.incoterm || 'CIP');
    req.input("Port_Aeroport_Destination", sql.NVarChar(100), e.port_aeroport_destination);
    req.input("Status", sql.NVarChar(50), e.status || 'In Transit');

    const res = await req.query(`
      INSERT INTO dbo.Foreign_Expedition (Foreign_Order_ID, Expedition_Code, N_Facture, Date_Facture, N_BL_LTA, Montant, Incoterm, Port_Aeroport_Destination, Status)
      OUTPUT INSERTED.ID, INSERTED.Created_At
      VALUES (@Foreign_Order_ID, @Expedition_Code, @N_Facture, @Date_Facture, @N_BL_LTA, @Montant, @Incoterm, @Port_Aeroport_Destination, @Status)
    `);

    const newId = res.recordset[0].ID;
    const createdAt = res.recordset[0].Created_At;

    if (e.shipped_lines) {
      for (const line of e.shipped_lines) {
        const lineCheckReq = transaction.request();
        lineCheckReq.input("Order_ID", sql.Int, e.foreign_order_id);
        lineCheckReq.input("Line_ID", sql.Int, line.foreign_line_id);

        const lineCheckRes = await lineCheckReq.query(`
          SELECT TOP 1 ID FROM dbo.Foreign_Order_Line
          WHERE Foreign_Order_ID = @Order_ID AND (ID = @Line_ID OR Position = @Line_ID)
          ORDER BY CASE WHEN ID = @Line_ID THEN 0 ELSE 1 END
        `);

        if (lineCheckRes.recordset.length > 0) {
          const actualLineId = lineCheckRes.recordset[0].ID;
          const lReq = transaction.request();
          lReq.input("Expedition_ID", sql.Int, newId);
          lReq.input("Foreign_Line_ID", sql.Int, actualLineId);
          lReq.input("Shipped_Qty", sql.Decimal(18, 3), line.shipped_qty || 0);

          await lReq.query(`
            INSERT INTO dbo.Expedition_Line (Expedition_ID, Foreign_Line_ID, Shipped_Qty)
            VALUES (@Expedition_ID, @Foreign_Line_ID, @Shipped_Qty)
          `);
        }
      }
    }

    await transaction.commit();

    return {
      id: newId,
      foreign_order_id: e.foreign_order_id,
      foreign_code: (e as any).foreign_code || (e as any).foreign_order_code,
      expedition_code: e.expedition_code,
      n_facture: e.n_facture,
      date_facture: e.date_facture,
      n_bl_lta: e.n_bl_lta,
      montant: e.montant,
      incoterm: e.incoterm,
      port_aeroport_destination: e.port_aeroport_destination,
      status: e.status || 'In Transit',
      created_at: new Date(createdAt).toISOString(),
      shipped_lines: e.shipped_lines || [],
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function dbUpdateExpeditionCode(id: number, code: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const req = pool.request();
  req.input("ID", sql.Int, id);
  req.input("Expedition_Code", sql.NVarChar(50), code);
  await req.query("UPDATE dbo.Foreign_Expedition SET Expedition_Code = @Expedition_Code WHERE ID = @ID");
}

export async function dbUpdateExpeditionDetails(
  id: number,
  montant: number,
  shipped_lines: ExpeditionLine[]
): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const req = transaction.request();
    req.input("ID", sql.Int, id);
    req.input("Montant", sql.Decimal(18, 2), montant);
    await req.query("UPDATE dbo.Foreign_Expedition SET Montant = @Montant WHERE ID = @ID");

    if (shipped_lines && shipped_lines.length > 0) {
      for (const line of shipped_lines) {
        const lReq = transaction.request();
        lReq.input("Expedition_ID", sql.Int, id);
        lReq.input("Foreign_Line_ID", sql.Int, line.foreign_line_id);
        lReq.input("Shipped_Qty", sql.Decimal(18, 3), line.shipped_qty);

        await lReq.query(`
          UPDATE dbo.Expedition_Line
          SET Shipped_Qty = @Shipped_Qty
          WHERE Expedition_ID = @Expedition_ID AND Foreign_Line_ID = @Foreign_Line_ID
        `);
      }
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function dbUpdateForeignExpeditionFull(
  id: number,
  data: Partial<ForeignExpedition>
): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const req = transaction.request();
    req.input("ID", sql.Int, id);
    req.input("N_Facture", sql.NVarChar(100), data.n_facture ?? null);
    req.input("Date_Facture", sql.NVarChar(50), data.date_facture ?? null);
    req.input("N_BL_LTA", sql.NVarChar(100), data.n_bl_lta ?? null);
    req.input("Montant", sql.Decimal(18, 2), data.montant ?? 0);
    req.input("Incoterm", sql.NVarChar(20), data.incoterm ?? null);
    req.input("Port_Aeroport_Destination", sql.NVarChar(100), data.port_aeroport_destination ?? null);
    req.input("Status", sql.NVarChar(50), data.status ?? null);

    await req.query(`
      UPDATE dbo.Foreign_Expedition
      SET N_Facture = COALESCE(@N_Facture, N_Facture),
          Date_Facture = COALESCE(@Date_Facture, Date_Facture),
          N_BL_LTA = COALESCE(@N_BL_LTA, N_BL_LTA),
          Montant = COALESCE(@Montant, Montant),
          Incoterm = COALESCE(@Incoterm, Incoterm),
          Port_Aeroport_Destination = COALESCE(@Port_Aeroport_Destination, Port_Aeroport_Destination),
          Status = COALESCE(@Status, Status)
      WHERE ID = @ID
    `);

    const expRes = await transaction.request()
      .input("Exp_ID", sql.Int, id)
      .query("SELECT Foreign_Order_ID FROM dbo.Foreign_Expedition WHERE ID = @Exp_ID");
    const foreignOrderId = data.foreign_order_id || expRes.recordset[0]?.Foreign_Order_ID;

    if (data.shipped_lines && Array.isArray(data.shipped_lines)) {
      const delReq = transaction.request();
      delReq.input("Expedition_ID", sql.Int, id);
      await delReq.query("DELETE FROM dbo.Expedition_Line WHERE Expedition_ID = @Expedition_ID");

      for (const line of data.shipped_lines) {
        const lineCheckReq = transaction.request();
        lineCheckReq.input("Order_ID", sql.Int, foreignOrderId);
        lineCheckReq.input("Line_ID", sql.Int, line.foreign_line_id);

        const lineCheckRes = await lineCheckReq.query(`
          SELECT TOP 1 ID FROM dbo.Foreign_Order_Line
          WHERE Foreign_Order_ID = @Order_ID AND (ID = @Line_ID OR Position = @Line_ID)
          ORDER BY CASE WHEN ID = @Line_ID THEN 0 ELSE 1 END
        `);

        if (lineCheckRes.recordset.length > 0) {
          const actualLineId = lineCheckRes.recordset[0].ID;
          const lReq = transaction.request();
          lReq.input("Expedition_ID", sql.Int, id);
          lReq.input("Foreign_Line_ID", sql.Int, actualLineId);
          lReq.input("Shipped_Qty", sql.Decimal(18, 3), line.shipped_qty || 0);

          await lReq.query(`
            INSERT INTO dbo.Expedition_Line (Expedition_ID, Foreign_Line_ID, Shipped_Qty)
            VALUES (@Expedition_ID, @Foreign_Line_ID, @Shipped_Qty)
          `);
        }
      }
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    console.error("[MSSQL Error inside dbUpdateForeignExpeditionFull]:", err);
    throw err;
  }
}

export async function dbUpdateForeignExpeditionStatus(id: number, status: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const req = pool.request();
  req.input("ID", sql.Int, id);
  req.input("Status", sql.NVarChar(50), status);
  await req.query("UPDATE dbo.Foreign_Expedition SET Status = @Status WHERE ID = @ID");
}

export async function dbDeleteForeignExpedition(id: number): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const req1 = transaction.request();
    req1.input("ID", sql.Int, id);
    await req1.query("DELETE FROM dbo.Expedition_Line WHERE Expedition_ID = @ID");

    const req2 = transaction.request();
    req2.input("ID", sql.Int, id);
    await req2.query("DELETE FROM dbo.Foreign_Expedition WHERE ID = @ID");

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
