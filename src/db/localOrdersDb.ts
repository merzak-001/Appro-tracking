import sql from "mssql/msnodesqlv8";
import { getPool } from "./connection";
import { LocalOrder, LocalOrderLine } from "../types";

export async function dbGetLocalOrders(): Promise<LocalOrder[]> {
  const pool = getPool();
  if (!pool) return [];
  const ordersRes = await pool.request().query<any>(`
    SELECT o.ID as id, o.N_Order as n_order, o.Etablir_par as etablir_par, 
           o.Objet_de_commande as objet_de_commande, o.Fournisseur_ID as fournisseur_id,
           s.Name as supplier_name, CONVERT(VARCHAR(10), o.Date, 120) as date,
           o.Observation as observation, o.Status as status,
           o.Delai_Livraison_Jours as delai_livraison_jours,
           o.Procedure_Type as procedure_type,
           o.Total_HT as total_ht, o.Total_TVA as total_tva, o.Total_TTC as total_ttc,
           o.Created_At as created_at
    FROM dbo.Local_Order o
    LEFT JOIN dbo.Fournisseur s ON o.Fournisseur_ID = s.ID
    ORDER BY o.ID DESC
  `);

  const linesRes = await pool.request().query<any>(`
    SELECT l.ID as id, l.Order_ID as order_id, l.Position as position,
           l.Designation as designation, l.Qty as qty, l.Unite as unite,
           l.Unit_Price as unit_price, l.TVA_Percentage as tva_percentage,
           l.Total_HT as total_ht, l.Montant_TVA as montant_tva, l.Total_TTC as total_ttc
    FROM dbo.Local_Order_Line l
    ORDER BY l.Order_ID DESC, l.Position ASC
  `);

  const linesByOrder: Record<number, LocalOrderLine[]> = {};
  linesRes.recordset.forEach((l) => {
    if (!linesByOrder[l.order_id]) linesByOrder[l.order_id] = [];
    linesByOrder[l.order_id].push({
      id: l.id,
      order_id: l.order_id,
      position: l.position,
      designation: l.designation,
      qty: Number(l.qty),
      unite: l.unite,
      unit_price: Number(l.unit_price),
      tva_percentage: Number(l.tva_percentage),
      total_ht: Number(l.total_ht),
      montant_tva: Number(l.montant_tva),
      total_ttc: Number(l.total_ttc),
    });
  });

  return ordersRes.recordset.map((o) => ({
    id: o.id,
    n_order: o.n_order,
    etablir_par: o.etablir_par,
    objet_de_commande: o.objet_de_commande,
    fournisseur_id: o.fournisseur_id,
    supplier_name: o.supplier_name || "",
    date: o.date,
    observation: o.observation || "",
    status: o.status || "Pending",
    delai_livraison_jours: o.delai_livraison_jours != null ? Number(o.delai_livraison_jours) : undefined,
    procedure_type: o.procedure_type || undefined,
    total_ht: Number(o.total_ht),
    total_tva: Number(o.total_tva),
    total_ttc: Number(o.total_ttc),
    created_at: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
    lines: linesByOrder[o.id] || [],
  }));
}

export async function dbCreateLocalOrder(o: Omit<LocalOrder, "id">): Promise<LocalOrder> {
  const pool = getPool();
  if (!pool) throw new Error("SQL Server not connected");

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const req = transaction.request();
    req.input("N_Order", sql.NVarChar(50), o.n_order);
    req.input("Etablir_par", sql.NVarChar(100), o.etablir_par);
    req.input("Objet_de_commande", sql.NVarChar(255), o.objet_de_commande);
    req.input("Fournisseur_ID", sql.Int, o.fournisseur_id);
    req.input("Date", sql.VarChar(10), o.date);
    req.input("Observation", sql.NVarChar(4000), o.observation || "");
    req.input("Status", sql.NVarChar(50), o.status || "Pending");
    req.input("Delai_Livraison_Jours", sql.Int, o.delai_livraison_jours != null ? o.delai_livraison_jours : null);
    req.input("Procedure_Type", sql.NVarChar(50), o.procedure_type || null);
    req.input("Total_HT", sql.Decimal(18, 2), o.total_ht);
    req.input("Total_TVA", sql.Decimal(18, 2), o.total_tva);
    req.input("Total_TTC", sql.Decimal(18, 2), o.total_ttc);

    const orderRes = await req.query(`
      INSERT INTO dbo.Local_Order (N_Order, Etablir_par, Objet_de_commande, Fournisseur_ID, Date, Observation, Status, Delai_Livraison_Jours, Procedure_Type, Total_HT, Total_TVA, Total_TTC)
      OUTPUT INSERTED.ID, INSERTED.Created_At
      VALUES (@N_Order, @Etablir_par, @Objet_de_commande, @Fournisseur_ID, @Date, @Observation, @Status, @Delai_Livraison_Jours, @Procedure_Type, @Total_HT, @Total_TVA, @Total_TTC)
    `);

    const newOrderId = orderRes.recordset[0].ID;
    const createdAt = orderRes.recordset[0].Created_At;

    const insertedLines: LocalOrderLine[] = [];
    for (let idx = 0; idx < o.lines.length; idx++) {
      const line = o.lines[idx];
      const lReq = transaction.request();
      lReq.input("Order_ID", sql.Int, newOrderId);
      lReq.input("Position", sql.Int, idx + 1);
      lReq.input("Designation", sql.NVarChar(255), line.designation);
      lReq.input("Qty", sql.Decimal(18, 3), line.qty);
      lReq.input("Unite", sql.NVarChar(50), line.unite || "piece");
      lReq.input("Unit_Price", sql.Decimal(18, 2), line.unit_price);
      lReq.input("TVA_Percentage", sql.Decimal(5, 2), line.tva_percentage || 19);

      const lineRes = await lReq.query(`
        INSERT INTO dbo.Local_Order_Line (Order_ID, Position, Designation, Qty, Unite, Unit_Price, TVA_Percentage)
        OUTPUT INSERTED.ID, INSERTED.Total_HT, INSERTED.Montant_TVA, INSERTED.Total_TTC
        VALUES (@Order_ID, @Position, @Designation, @Qty, @Unite, @Unit_Price, @TVA_Percentage)
      `);

      const lIns = lineRes.recordset[0];
      insertedLines.push({
        id: lIns.ID,
        order_id: newOrderId,
        position: idx + 1,
        designation: line.designation,
        qty: line.qty,
        unite: line.unite || "piece",
        unit_price: line.unit_price,
        tva_percentage: line.tva_percentage || 19,
        total_ht: Number(lIns.Total_HT),
        montant_tva: Number(lIns.Montant_TVA),
        total_ttc: Number(lIns.Total_TTC),
      });
    }

    await transaction.commit();

    return {
      id: newOrderId,
      n_order: o.n_order,
      etablir_par: o.etablir_par,
      objet_de_commande: o.objet_de_commande,
      fournisseur_id: o.fournisseur_id,
      supplier_name: o.supplier_name || "",
      date: o.date,
      observation: o.observation || "",
      status: o.status || "Pending",
      delai_livraison_jours: o.delai_livraison_jours,
      procedure_type: o.procedure_type,
      total_ht: o.total_ht,
      total_tva: o.total_tva,
      total_ttc: o.total_ttc,
      created_at: new Date(createdAt).toISOString(),
      lines: insertedLines,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function dbUpdateLocalOrder(id: number, o: Partial<LocalOrder>): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const req = transaction.request();
    req.input("ID", sql.Int, id);
    req.input("N_Order", sql.NVarChar(50), o.n_order ?? null);
    req.input("Etablir_par", sql.NVarChar(100), o.etablir_par ?? null);
    req.input("Objet_de_commande", sql.NVarChar(255), o.objet_de_commande ?? null);
    req.input("Fournisseur_ID", sql.Int, o.fournisseur_id !== undefined ? o.fournisseur_id : null);
    req.input("Date", sql.VarChar(10), o.date ?? null);
    req.input("Observation", sql.NVarChar(4000), o.observation !== undefined ? o.observation : null);
    req.input("Status", sql.NVarChar(50), o.status ?? null);
    req.input("Delai_Livraison_Jours", sql.Int, o.delai_livraison_jours !== undefined ? o.delai_livraison_jours : null);
    req.input("Procedure_Type", sql.NVarChar(50), o.procedure_type !== undefined ? o.procedure_type : null);
    req.input("Total_HT", sql.Decimal(18, 2), o.total_ht !== undefined ? o.total_ht : null);
    req.input("Total_TVA", sql.Decimal(18, 2), o.total_tva !== undefined ? o.total_tva : null);
    req.input("Total_TTC", sql.Decimal(18, 2), o.total_ttc !== undefined ? o.total_ttc : null);

    await req.query(`
      UPDATE dbo.Local_Order
      SET N_Order = COALESCE(@N_Order, N_Order),
          Etablir_par = COALESCE(@Etablir_par, Etablir_par),
          Objet_de_commande = COALESCE(@Objet_de_commande, Objet_de_commande),
          Fournisseur_ID = COALESCE(@Fournisseur_ID, Fournisseur_ID),
          Date = COALESCE(@Date, Date),
          Observation = COALESCE(@Observation, Observation),
          Status = COALESCE(@Status, Status),
          Delai_Livraison_Jours = COALESCE(@Delai_Livraison_Jours, Delai_Livraison_Jours),
          Procedure_Type = COALESCE(@Procedure_Type, Procedure_Type),
          Total_HT = COALESCE(@Total_HT, Total_HT),
          Total_TVA = COALESCE(@Total_TVA, Total_TVA),
          Total_TTC = COALESCE(@Total_TTC, Total_TTC)
      WHERE ID = @ID
    `);

    if (o.lines && o.lines.length > 0) {
      // Get existing line IDs for this order from database
      const currentLinesRes = await transaction.request()
        .input("Order_ID", sql.Int, id)
        .query("SELECT ID FROM dbo.Local_Order_Line WHERE Order_ID = @Order_ID");

      const existingLineIds = new Set<number>(currentLinesRes.recordset.map((r: any) => Number(r.ID)));
      const updatedLineIds = new Set<number>();

      for (let idx = 0; idx < o.lines.length; idx++) {
        const line = o.lines[idx];
        const lineId = line.id && existingLineIds.has(Number(line.id)) ? Number(line.id) : null;

        if (lineId) {
          // UPDATE existing line without breaking foreign key constraints!
          updatedLineIds.add(lineId);
          const uReq = transaction.request();
          uReq.input("ID", sql.Int, lineId);
          uReq.input("Position", sql.Int, idx + 1);
          uReq.input("Designation", sql.NVarChar(255), line.designation);
          uReq.input("Qty", sql.Decimal(18, 3), line.qty);
          uReq.input("Unite", sql.NVarChar(50), line.unite || "piece");
          uReq.input("Unit_Price", sql.Decimal(18, 2), line.unit_price);
          uReq.input("TVA_Percentage", sql.Decimal(5, 2), line.tva_percentage || 19);

          await uReq.query(`
            UPDATE dbo.Local_Order_Line
            SET Position = @Position,
                Designation = @Designation,
                Qty = @Qty,
                Unite = @Unite,
                Unit_Price = @Unit_Price,
                TVA_Percentage = @TVA_Percentage
            WHERE ID = @ID
          `);
        } else {
          // INSERT new line
          const iReq = transaction.request();
          iReq.input("Order_ID", sql.Int, id);
          iReq.input("Position", sql.Int, idx + 1);
          iReq.input("Designation", sql.NVarChar(255), line.designation);
          iReq.input("Qty", sql.Decimal(18, 3), line.qty);
          iReq.input("Unite", sql.NVarChar(50), line.unite || "piece");
          iReq.input("Unit_Price", sql.Decimal(18, 2), line.unit_price);
          iReq.input("TVA_Percentage", sql.Decimal(5, 2), line.tva_percentage || 19);

          await iReq.query(`
            INSERT INTO dbo.Local_Order_Line (Order_ID, Position, Designation, Qty, Unite, Unit_Price, TVA_Percentage)
            VALUES (@Order_ID, @Position, @Designation, @Qty, @Unite, @Unit_Price, @TVA_Percentage)
          `);
        }
      }

      // Delete lines that were removed by user AND have no associated deliveries
      for (const oldId of existingLineIds) {
        if (!updatedLineIds.has(oldId)) {
          const dCheckReq = transaction.request();
          dCheckReq.input("Line_ID", sql.Int, oldId);
          const dCountRes = await dCheckReq.query("SELECT COUNT(*) as count FROM dbo.Local_Delivery WHERE Line_ID = @Line_ID");
          if (dCountRes.recordset[0].count === 0) {
            const dDelReq = transaction.request();
            dDelReq.input("ID", sql.Int, oldId);
            await dDelReq.query("DELETE FROM dbo.Local_Order_Line WHERE ID = @ID");
          }
        }
      }
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function dbUpdateLocalOrderStatus(id: number | string, status: string, nOrder?: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const req = pool.request();
  req.input("ID", sql.Int, Number(id) || 0);
  req.input("N_Order", sql.NVarChar(50), String(nOrder || ""));
  req.input("Status", sql.NVarChar(50), String(status || "Pending"));
  await req.query("UPDATE dbo.Local_Order SET Status = @Status WHERE ID = @ID OR (N_Order = @N_Order AND @N_Order <> '')");
}

export async function dbDeleteLocalOrder(id: number): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const req = pool.request();
  req.input("ID", sql.Int, id);
  await req.query("DELETE FROM dbo.Local_Order WHERE ID = @ID");
}
