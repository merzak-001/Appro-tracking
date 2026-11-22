import sql from "mssql/msnodesqlv8";
import { getPool } from "./connection";
import { LocalDelivery, SAPOrderMapping } from "../types";

export async function dbGetLocalDeliveries(): Promise<LocalDelivery[]> {
  const pool = getPool();
  if (!pool) return [];
  try {
    const result = await pool.request().query<any>(`
      SELECT d.ID as id, d.Order_ID as order_id, 
             COALESCE(o.N_Order, 'CMD') as n_order,
             d.Line_ID as line_id, 
             COALESCE(l.Designation, 'Article') as designation, 
             COALESCE(l.Unite, 'U') as unite,
             COALESCE(l.Qty, d.Delivered_Qty) as ordered_qty, 
             d.Delivered_Qty as delivered_qty,
             COALESCE(l.Unit_Price, 0) as unit_price, 
             COALESCE(l.Unit_Price, 0) as original_unit_price,
             CONVERT(VARCHAR(10), d.Delivery_Date, 120) as delivery_date,
             d.Delivery_Note_Number as delivery_note_number,
             d.Movement_Code as movement_code,
             d.Material_Doc_Number as material_doc_number,
             d.SAP_Order_Number as sap_order_number,
             d.Item_Code as item_code,
             COALESCE(s.Name, o.Etablir_Par, 'Fournisseur') as supplier_name,
             d.Created_At as created_at
      FROM dbo.Local_Delivery d
      LEFT JOIN dbo.Local_Order o ON d.Order_ID = o.ID
      LEFT JOIN dbo.Fournisseur s ON o.Fournisseur_ID = s.ID
      LEFT JOIN dbo.Local_Order_Line l ON d.Line_ID = l.ID
      ORDER BY d.Delivery_Date DESC, d.ID DESC
    `);

    return result.recordset.map((r) => ({
      id: r.id,
      order_id: r.order_id,
      n_order: r.n_order,
      line_id: r.line_id,
      designation: r.designation,
      unite: r.unite,
      ordered_qty: Number(r.ordered_qty),
      delivered_qty: Number(r.delivered_qty),
      unit_price: Number(r.unit_price),
      original_unit_price: Number(r.original_unit_price),
      delivery_date: r.delivery_date,
      delivery_note_number: r.delivery_note_number,
      movement_code: r.movement_code || '103',
      material_doc_number: r.material_doc_number,
      sap_order_number: r.sap_order_number,
      item_code: r.item_code,
      supplier_name: r.supplier_name,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch (err) {
    console.error("[dbGetLocalDeliveries Error]:", err);
    return [];
  }
}

export async function dbCreateLocalDelivery(d: {
  order_id: number;
  line_id: number;
  delivered_qty: number;
  delivery_date: string;
  delivery_note_number: string;
  movement_code?: string;
  material_doc_number?: string;
  sap_order_number?: string;
  item_code?: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) {
    console.warn("[dbCreateLocalDelivery] No database pool available");
    return;
  }
  try {
    const req = pool.request();
    req.input("Order_ID", sql.Int, Number(d.order_id));
    req.input("Line_ID", sql.Int, Number(d.line_id));
    req.input("Delivered_Qty", sql.Decimal(18, 3), Number(d.delivered_qty));
    req.input("Delivery_Date", sql.VarChar(10), String(d.delivery_date));
    req.input("Delivery_Note_Number", sql.NVarChar(100), String(d.delivery_note_number));
    req.input("Movement_Code", sql.NVarChar(10), String(d.movement_code || '103'));
    req.input("Material_Doc_Number", sql.NVarChar(100), d.material_doc_number ? String(d.material_doc_number) : null);
    req.input("SAP_Order_Number", sql.NVarChar(100), d.sap_order_number ? String(d.sap_order_number) : null);
    req.input("Item_Code", sql.NVarChar(100), d.item_code ? String(d.item_code) : null);

    await req.query(`
      INSERT INTO dbo.Local_Delivery (
        Order_ID, Line_ID, Delivered_Qty, Delivery_Date, Delivery_Note_Number, 
        Movement_Code, Material_Doc_Number, SAP_Order_Number, Item_Code
      )
      VALUES (
        @Order_ID, @Line_ID, @Delivered_Qty, @Delivery_Date, @Delivery_Note_Number,
        @Movement_Code, @Material_Doc_Number, @SAP_Order_Number, @Item_Code
      )
    `);
  } catch (err) {
    console.error("[dbCreateLocalDelivery Error]:", err);
    throw err;
  }
}

export async function dbBatchCreateLocalDeliveries(items: Array<{
  order_id: number;
  line_id: number;
  delivered_qty: number;
  delivery_date: string;
  delivery_note_number: string;
  movement_code?: string;
  material_doc_number?: string;
  sap_order_number?: string;
  item_code?: string;
}>): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;

  let insertedCount = 0;
  for (const d of items) {
    try {
      const req = pool.request();
      req.input("Order_ID", sql.Int, Number(d.order_id));
      req.input("Line_ID", sql.Int, Number(d.line_id));
      req.input("Delivered_Qty", sql.Decimal(18, 3), Number(d.delivered_qty));
      req.input("Delivery_Date", sql.VarChar(10), String(d.delivery_date));
      req.input("Delivery_Note_Number", sql.NVarChar(100), String(d.delivery_note_number || 'BL-SAP'));
      req.input("Movement_Code", sql.NVarChar(10), String(d.movement_code || '103'));
      req.input("Material_Doc_Number", sql.NVarChar(100), d.material_doc_number ? String(d.material_doc_number) : null);
      req.input("SAP_Order_Number", sql.NVarChar(100), d.sap_order_number ? String(d.sap_order_number) : null);
      req.input("Item_Code", sql.NVarChar(100), d.item_code ? String(d.item_code) : null);

      await req.query(`
        INSERT INTO dbo.Local_Delivery (
          Order_ID, Line_ID, Delivered_Qty, Delivery_Date, Delivery_Note_Number, 
          Movement_Code, Material_Doc_Number, SAP_Order_Number, Item_Code
        )
        VALUES (
          @Order_ID, @Line_ID, @Delivered_Qty, @Delivery_Date, @Delivery_Note_Number,
          @Movement_Code, @Material_Doc_Number, @SAP_Order_Number, @Item_Code
        )
      `);
      insertedCount++;
    } catch (e) {
      console.error("[dbBatchCreateLocalDeliveries error on row]:", e);
    }
  }
  return insertedCount;
}

export async function dbUpdateLocalDelivery(d: {
  id: number;
  delivered_qty: number;
  delivery_date: string;
  delivery_note_number: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const req = pool.request();
  req.input("ID", sql.Int, d.id);
  req.input("Delivered_Qty", sql.Decimal(18, 3), d.delivered_qty);
  req.input("Delivery_Date", sql.VarChar(10), d.delivery_date);
  req.input("Delivery_Note_Number", sql.NVarChar(100), d.delivery_note_number);

  await req.query(`
    UPDATE dbo.Local_Delivery 
    SET Delivered_Qty = @Delivered_Qty,
        Delivery_Date = @Delivery_Date,
        Delivery_Note_Number = @Delivery_Note_Number
    WHERE ID = @ID
  `);
}

export async function dbDeleteLocalDelivery(id: number): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const req = pool.request();
  req.input("ID", sql.Int, id);
  await req.query("DELETE FROM dbo.Local_Delivery WHERE ID = @ID");
}

export async function dbClearAllLocalDeliveries(): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.request().query("DELETE FROM dbo.Local_Delivery");
}

export async function dbGetSAPOrderMappings(): Promise<SAPOrderMapping[]> {
  const pool = getPool();
  if (!pool) return [];
  try {
    const result = await pool.request().query<any>(`
      SELECT ID as id, 
             SAP_Order_Number as sap_order_number, 
             Local_Order_ID as local_order_id, 
             Local_Order_Number as local_order_number, 
             Created_At as created_at
      FROM dbo.Local_SAP_Order_Mapping
      ORDER BY ID DESC
    `);
    return result.recordset.map(r => ({
      id: r.id,
      sap_order_number: r.sap_order_number,
      local_order_id: r.local_order_id,
      local_order_number: r.local_order_number,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));
  } catch (err) {
    console.error("[dbGetSAPOrderMappings Error]:", err);
    return [];
  }
}

export async function dbSaveSAPOrderMapping(sapOrderNumber: string, localOrderId: number, localOrderNumber: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  try {
    const req = pool.request();
    req.input("SAP_Order_Number", sql.NVarChar(100), sapOrderNumber.trim());
    req.input("Local_Order_ID", sql.Int, Number(localOrderId));
    req.input("Local_Order_Number", sql.NVarChar(100), localOrderNumber.trim());

    await req.query(`
      IF EXISTS (SELECT 1 FROM dbo.Local_SAP_Order_Mapping WHERE SAP_Order_Number = @SAP_Order_Number)
      BEGIN
        UPDATE dbo.Local_SAP_Order_Mapping
        SET Local_Order_ID = @Local_Order_ID,
            Local_Order_Number = @Local_Order_Number
        WHERE SAP_Order_Number = @SAP_Order_Number
      END
      ELSE
      BEGIN
        INSERT INTO dbo.Local_SAP_Order_Mapping (SAP_Order_Number, Local_Order_ID, Local_Order_Number)
        VALUES (@SAP_Order_Number, @Local_Order_ID, @Local_Order_Number)
      END
    `);
  } catch (err) {
    console.error("[dbSaveSAPOrderMapping Error]:", err);
    throw err;
  }
}
