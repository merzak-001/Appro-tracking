import sql from "mssql/msnodesqlv8";
import { getPool } from "./connection";
import { ForeignOrder, ForeignOrderLine } from "../types";

export async function dbGetForeignOrders(): Promise<ForeignOrder[]> {
  const pool = getPool();
  if (!pool) return [];
  const ordersRes = await pool.request().query<any>(`
    SELECT o.ID as id, o.Code as code, CONVERT(VARCHAR(10), o.Date, 120) as date,
           o.Proforma_Ref as proforma_ref, CONVERT(VARCHAR(10), o.Proforma_Date, 120) as proforma_date,
           ISNULL(o.Mode_Paiement, '') as mode_paiement,
           o.Amount as amount, o.Currency as currency, o.Fournisseur_ID as fournisseur_id,
           s.Name as supplier_name, o.Country as country,
           CONVERT(VARCHAR(10), o.Estimated_Time_Delivery, 120) as estimated_time_delivery,
           ISNULL(o.Num_Expeditions, 1) as num_expeditions,
           ISNULL(o.Destination_Type, 'Port') as destination_type,
           o.Status as status, o.Created_At as created_at
    FROM dbo.Foreign_Order o
    LEFT JOIN dbo.Fournisseur s ON o.Fournisseur_ID = s.ID
    ORDER BY o.ID DESC
  `);

  const linesRes = await pool.request().query<any>(`
    SELECT l.ID as id, l.Foreign_Order_ID as foreign_order_id, l.Position as position,
           l.Designation as designation, l.Qty as qty, l.Unite as unite,
           l.Unit_Price as unit_price, l.Total_Price as total_price
    FROM dbo.Foreign_Order_Line l
    ORDER BY l.Foreign_Order_ID DESC, l.Position ASC
  `);

  const linesByOrder: Record<number, ForeignOrderLine[]> = {};
  linesRes.recordset.forEach((l) => {
    if (!linesByOrder[l.foreign_order_id]) linesByOrder[l.foreign_order_id] = [];
    linesByOrder[l.foreign_order_id].push({
      id: l.id,
      foreign_order_id: l.foreign_order_id,
      position: l.position,
      designation: l.designation,
      qty: Number(l.qty),
      unite: l.unite,
      unit_price: Number(l.unit_price),
      total_price: Number(l.total_price),
    });
  });

  return ordersRes.recordset.map((o) => ({
    id: o.id,
    code: o.code,
    date: o.date,
    proforma_ref: o.proforma_ref,
    proforma_date: o.proforma_date,
    mode_paiement: o.mode_paiement || '',
    amount: Number(o.amount),
    currency: o.currency || 'EUR',
    fournisseur_id: o.fournisseur_id,
    supplier_name: o.supplier_name || '',
    country: o.country || '',
    estimated_time_delivery: o.estimated_time_delivery,
    num_expeditions: Number(o.num_expeditions) || 1,
    destination_type: o.destination_type || 'Port',
    status: o.status || 'Active',
    created_at: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
    lines: linesByOrder[o.id] || [],
  }));
}

export async function dbCreateForeignOrder(o: Omit<ForeignOrder, 'id'>): Promise<ForeignOrder> {
  const pool = getPool();
  if (!pool) throw new Error("SQL Server not connected");
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const req = transaction.request();
    req.input("Code", sql.NVarChar(50), o.code);
    req.input("Date", sql.VarChar(10), o.date);
    req.input("Proforma_Ref", sql.NVarChar(100), o.proforma_ref);
    req.input("Proforma_Date", sql.VarChar(10), o.proforma_date);
    req.input("Mode_Paiement", sql.NVarChar(100), o.mode_paiement || '');
    req.input("Amount", sql.Decimal(18, 2), o.amount);
    req.input("Currency", sql.NVarChar(10), o.currency || 'EUR');
    req.input("Fournisseur_ID", sql.Int, o.fournisseur_id);
    req.input("Country", sql.NVarChar(100), o.country);
    req.input("Estimated_Time_Delivery", sql.VarChar(10), o.estimated_time_delivery);
    req.input("Num_Expeditions", sql.Int, o.num_expeditions || 1);
    req.input("Destination_Type", sql.NVarChar(50), o.destination_type || 'Port');
    req.input("Status", sql.NVarChar(50), o.status || 'Active');

    const orderRes = await req.query(`
      INSERT INTO dbo.Foreign_Order (Code, Date, Proforma_Ref, Proforma_Date, Mode_Paiement, Amount, Currency, Fournisseur_ID, Country, Estimated_Time_Delivery, Num_Expeditions, Destination_Type, Status)
      OUTPUT INSERTED.ID, INSERTED.Created_At
      VALUES (@Code, @Date, @Proforma_Ref, @Proforma_Date, @Mode_Paiement, @Amount, @Currency, @Fournisseur_ID, @Country, @Estimated_Time_Delivery, @Num_Expeditions, @Destination_Type, @Status)
    `);

    const newId = orderRes.recordset[0].ID;
    const createdAt = orderRes.recordset[0].Created_At;

    const insertedLines: ForeignOrderLine[] = [];
    if (o.lines) {
      for (let idx = 0; idx < o.lines.length; idx++) {
        const line = o.lines[idx];
        const lReq = transaction.request();
        lReq.input("Foreign_Order_ID", sql.Int, newId);
        lReq.input("Position", sql.Int, idx + 1);
        lReq.input("Designation", sql.NVarChar(255), line.designation);
        lReq.input("Qty", sql.Decimal(18, 3), line.qty);
        lReq.input("Unite", sql.NVarChar(50), line.unite || 'piece');
        lReq.input("Unit_Price", sql.Decimal(18, 2), line.unit_price);

        const lRes = await lReq.query(`
          INSERT INTO dbo.Foreign_Order_Line (Foreign_Order_ID, Position, Designation, Qty, Unite, Unit_Price)
          OUTPUT INSERTED.ID, INSERTED.Total_Price
          VALUES (@Foreign_Order_ID, @Position, @Designation, @Qty, @Unite, @Unit_Price)
        `);

        insertedLines.push({
          id: lRes.recordset[0].ID,
          foreign_order_id: newId,
          position: idx + 1,
          designation: line.designation,
          qty: line.qty,
          unite: line.unite || 'piece',
          unit_price: line.unit_price,
          total_price: Number(lRes.recordset[0].Total_Price),
        });
      }
    }

    await transaction.commit();

    return {
      id: newId,
      code: o.code,
      date: o.date,
      proforma_ref: o.proforma_ref,
      proforma_date: o.proforma_date,
      mode_paiement: o.mode_paiement || '',
      amount: o.amount,
      currency: o.currency || 'EUR',
      fournisseur_id: o.fournisseur_id,
      supplier_name: o.supplier_name || '',
      country: o.country,
      estimated_time_delivery: o.estimated_time_delivery,
      num_expeditions: o.num_expeditions || 1,
      destination_type: o.destination_type || 'Port',
      status: o.status || 'Active',
      created_at: new Date(createdAt).toISOString(),
      lines: insertedLines,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function dbUpdateForeignOrder(id: number, o: Partial<ForeignOrder>): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const req = transaction.request();
    req.input("ID", sql.Int, id);
    req.input("Code", sql.NVarChar(50), o.code ?? null);
    req.input("Date", sql.VarChar(10), o.date ?? null);
    req.input("Proforma_Ref", sql.NVarChar(100), o.proforma_ref ?? null);
    req.input("Proforma_Date", sql.VarChar(10), o.proforma_date ?? null);
    req.input("Mode_Paiement", sql.NVarChar(100), o.mode_paiement ?? null);
    req.input("Amount", sql.Decimal(18, 2), o.amount !== undefined ? o.amount : null);
    req.input("Currency", sql.NVarChar(10), o.currency ?? null);
    req.input("Fournisseur_ID", sql.Int, o.fournisseur_id !== undefined ? o.fournisseur_id : null);
    req.input("Country", sql.NVarChar(100), o.country ?? null);
    req.input("Estimated_Time_Delivery", sql.VarChar(10), o.estimated_time_delivery ?? null);
    req.input("Num_Expeditions", sql.Int, o.num_expeditions !== undefined ? o.num_expeditions : null);
    req.input("Destination_Type", sql.NVarChar(50), o.destination_type ?? null);
    req.input("Status", sql.NVarChar(50), o.status ?? null);

    await req.query(`
      UPDATE dbo.Foreign_Order
      SET Code = COALESCE(@Code, Code),
          Date = COALESCE(@Date, Date),
          Proforma_Ref = COALESCE(@Proforma_Ref, Proforma_Ref),
          Proforma_Date = COALESCE(@Proforma_Date, Proforma_Date),
          Mode_Paiement = COALESCE(@Mode_Paiement, Mode_Paiement),
          Amount = COALESCE(@Amount, Amount),
          Currency = COALESCE(@Currency, Currency),
          Fournisseur_ID = COALESCE(@Fournisseur_ID, Fournisseur_ID),
          Country = COALESCE(@Country, Country),
          Estimated_Time_Delivery = COALESCE(@Estimated_Time_Delivery, Estimated_Time_Delivery),
          Num_Expeditions = COALESCE(@Num_Expeditions, Num_Expeditions),
          Destination_Type = COALESCE(@Destination_Type, Destination_Type),
          Status = COALESCE(@Status, Status)
      WHERE ID = @ID
    `);

    if (o.lines) {
      const delReq = transaction.request();
      delReq.input("Foreign_Order_ID", sql.Int, id);
      await delReq.query("DELETE FROM dbo.Foreign_Order_Line WHERE Foreign_Order_ID = @Foreign_Order_ID");

      for (let idx = 0; idx < o.lines.length; idx++) {
        const line = o.lines[idx];
        const lReq = transaction.request();
        lReq.input("Foreign_Order_ID", sql.Int, id);
        lReq.input("Position", sql.Int, idx + 1);
        lReq.input("Designation", sql.NVarChar(255), line.designation);
        lReq.input("Qty", sql.Decimal(18, 3), line.qty);
        lReq.input("Unite", sql.NVarChar(50), line.unite || "piece");
        lReq.input("Unit_Price", sql.Decimal(18, 2), line.unit_price);

        await lReq.query(`
          INSERT INTO dbo.Foreign_Order_Line (Foreign_Order_ID, Position, Designation, Qty, Unite, Unit_Price)
          VALUES (@Foreign_Order_ID, @Position, @Designation, @Qty, @Unite, @Unit_Price)
        `);
      }
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function dbUpdateForeignOrderStatus(id: number, status: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const req = pool.request();
  req.input("ID", sql.Int, id);
  req.input("Status", sql.NVarChar(50), status);
  await req.query("UPDATE dbo.Foreign_Order SET Status = @Status WHERE ID = @ID");
}

export async function dbDeleteForeignOrder(id: number): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const req = pool.request();
  req.input("ID", sql.Int, id);
  await req.query("DELETE FROM dbo.Foreign_Order WHERE ID = @ID");
}
