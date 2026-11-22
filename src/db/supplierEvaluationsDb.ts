import sql from "mssql/msnodesqlv8";
import { getPool } from "./connection";
import { SupplierEvaluation } from "../types";

// Ensure table exists
export async function ensureSupplierEvaluationTable(): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Supplier_Evaluation]') AND type in (N'U'))
    BEGIN
      CREATE TABLE dbo.Supplier_Evaluation (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Supplier_ID INT NOT NULL,
        Order_ID INT NULL,
        Order_Code NVARCHAR(50) NULL,
        Evaluator_Name NVARCHAR(100) NOT NULL,
        Evaluation_Date NVARCHAR(20) NOT NULL,
        Profile_Type NVARCHAR(50) NULL DEFAULT 'standard',
        Qualite_Score FLOAT NOT NULL DEFAULT 0,
        Delais_Score FLOAT NOT NULL DEFAULT 0,
        Prix_Score FLOAT NOT NULL DEFAULT 0,
        Conformite_Score FLOAT NOT NULL DEFAULT 0,
        Sav_Score FLOAT NOT NULL DEFAULT 0,
        Support_Score FLOAT NOT NULL DEFAULT 0,
        Communication_Score FLOAT NOT NULL DEFAULT 0,
        Reclamations_Score FLOAT NOT NULL DEFAULT 0,
        Total_Score FLOAT NOT NULL DEFAULT 0,
        Classification NVARCHAR(5) NOT NULL,
        Commentaires NVARCHAR(MAX) NULL,
        Created_At DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Supplier_Eval_Supplier FOREIGN KEY (Supplier_ID) REFERENCES dbo.Fournisseur(ID) ON DELETE CASCADE
      );
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Supplier_Evaluation]') AND name = 'Profile_Type')
    BEGIN
      ALTER TABLE dbo.Supplier_Evaluation ADD Profile_Type NVARCHAR(50) NULL DEFAULT 'standard';
    END
  `);
}

export async function dbCreateSupplierEvaluation(ev: SupplierEvaluation): Promise<SupplierEvaluation> {
  await ensureSupplierEvaluationTable();
  const pool = getPool();
  if (!pool) throw new Error("SQL Server not connected");

  const req = pool.request();
  req.input("Supplier_ID", sql.Int, Number(ev.supplier_id));
  req.input("Order_ID", sql.Int, ev.order_id ? Number(ev.order_id) : null);
  req.input("Order_Code", sql.NVarChar(50), ev.order_code ? String(ev.order_code) : null);
  req.input("Evaluator_Name", sql.NVarChar(100), String(ev.evaluator_name || "Admin"));
  req.input("Evaluation_Date", sql.NVarChar(20), String(ev.evaluation_date || new Date().toISOString().split("T")[0]));
  req.input("Profile_Type", sql.NVarChar(50), String(ev.profile_type || "standard"));
  req.input("Qualite_Score", sql.Float, Number(ev.qualite_score || 0));
  req.input("Delais_Score", sql.Float, Number(ev.delais_score || 0));
  req.input("Prix_Score", sql.Float, Number(ev.prix_score || 0));
  req.input("Conformite_Score", sql.Float, Number(ev.conformite_score || 0));
  req.input("Sav_Score", sql.Float, Number(ev.sav_score || 0));
  req.input("Support_Score", sql.Float, Number(ev.support_score || 0));
  req.input("Communication_Score", sql.Float, Number(ev.communication_score || 0));
  req.input("Reclamations_Score", sql.Float, Number(ev.reclamations_score || 0));
  req.input("Total_Score", sql.Float, Number(ev.total_score || 0));
  req.input("Classification", sql.NVarChar(5), String(ev.classification || "A"));
  req.input("Commentaires", sql.NVarChar(sql.MAX), ev.commentaires ? String(ev.commentaires) : null);

  const result = await req.query(`
    INSERT INTO dbo.Supplier_Evaluation (
      Supplier_ID, Order_ID, Order_Code, Evaluator_Name, Evaluation_Date, Profile_Type,
      Qualite_Score, Delais_Score, Prix_Score, Conformite_Score, Sav_Score,
      Support_Score, Communication_Score, Reclamations_Score, Total_Score,
      Classification, Commentaires
    )
    OUTPUT INSERTED.ID
    VALUES (
      @Supplier_ID, @Order_ID, @Order_Code, @Evaluator_Name, @Evaluation_Date, @Profile_Type,
      @Qualite_Score, @Delais_Score, @Prix_Score, @Conformite_Score, @Sav_Score,
      @Support_Score, @Communication_Score, @Reclamations_Score, @Total_Score,
      @Classification, @Commentaires
    );
  `);

  const newId = result.recordset[0]?.ID || Date.now();
  return {
    ...ev,
    id: newId,
    created_at: new Date().toISOString(),
  };
}

export async function dbGetSupplierEvaluations(supplierId: number): Promise<SupplierEvaluation[]> {
  await ensureSupplierEvaluationTable();
  const pool = getPool();
  if (!pool) return [];

  const request = pool.request();
  request.input("Supplier_ID", sql.Int, supplierId);
  const result = await request.query<any>(`
    SELECT 
      ID as id, Supplier_ID as supplier_id, Order_ID as order_id, Order_Code as order_code,
      Evaluator_Name as evaluator_name, Evaluation_Date as evaluation_date, Profile_Type as profile_type,
      Qualite_Score as qualite_score, Delais_Score as delais_score, Prix_Score as prix_score,
      Conformite_Score as conformite_score, Sav_Score as sav_score, Support_Score as support_score,
      Communication_Score as communication_score, Reclamations_Score as reclamations_score,
      Total_Score as total_score, Classification as classification, Commentaires as commentaires,
      Created_At as created_at
    FROM dbo.Supplier_Evaluation
    WHERE Supplier_ID = @Supplier_ID
    ORDER BY Evaluation_Date DESC, ID DESC
  `);

  return result.recordset.map((r) => ({
    id: r.id,
    supplier_id: r.supplier_id,
    order_id: r.order_id,
    order_code: r.order_code || "",
    evaluator_name: r.evaluator_name,
    evaluation_date: r.evaluation_date ? new Date(r.evaluation_date).toISOString().split("T")[0] : "",
    profile_type: r.profile_type || "standard",
    qualite_score: Number(r.qualite_score || 0),
    delais_score: Number(r.delais_score || 0),
    prix_score: Number(r.prix_score || 0),
    conformite_score: Number(r.conformite_score || 0),
    sav_score: Number(r.sav_score || 0),
    support_score: Number(r.support_score || 0),
    communication_score: Number(r.communication_score || 0),
    reclamations_score: Number(r.reclamations_score || 0),
    total_score: Number(r.total_score || 0),
    classification: r.classification,
    commentaires: r.commentaires || "",
    created_at: r.created_at ? new Date(r.created_at).toISOString() : "",
  }));
}

export async function dbGetEvaluationByOrder(orderId: number): Promise<SupplierEvaluation | null> {
  await ensureSupplierEvaluationTable();
  const pool = getPool();
  if (!pool) return null;

  const request = pool.request();
  request.input("Order_ID", sql.Int, orderId);
  const result = await request.query<any>(`
    SELECT TOP 1
      ID as id, Supplier_ID as supplier_id, Order_ID as order_id, Order_Code as order_code,
      Evaluator_Name as evaluator_name, Evaluation_Date as evaluation_date, Profile_Type as profile_type,
      Qualite_Score as qualite_score, Delais_Score as delais_score, Prix_Score as prix_score,
      Conformite_Score as conformite_score, Sav_Score as sav_score, Support_Score as support_score,
      Communication_Score as communication_score, Reclamations_Score as reclamations_score,
      Total_Score as total_score, Classification as classification, Commentaires as commentaires,
      Created_At as created_at
    FROM dbo.Supplier_Evaluation
    WHERE Order_ID = @Order_ID
    ORDER BY ID DESC
  `);

  if (result.recordset.length === 0) return null;
  const r = result.recordset[0];
  return {
    id: r.id,
    supplier_id: r.supplier_id,
    order_id: r.order_id,
    order_code: r.order_code || "",
    evaluator_name: r.evaluator_name,
    evaluation_date: r.evaluation_date ? new Date(r.evaluation_date).toISOString().split("T")[0] : "",
    profile_type: r.profile_type || "standard",
    qualite_score: Number(r.qualite_score || 0),
    delais_score: Number(r.delais_score || 0),
    prix_score: Number(r.prix_score || 0),
    conformite_score: Number(r.conformite_score || 0),
    sav_score: Number(r.sav_score || 0),
    support_score: Number(r.support_score || 0),
    communication_score: Number(r.communication_score || 0),
    reclamations_score: Number(r.reclamations_score || 0),
    total_score: Number(r.total_score || 0),
    classification: r.classification,
    commentaires: r.commentaires || "",
    created_at: r.created_at ? new Date(r.created_at).toISOString() : "",
  };
}

export async function dbDeleteSupplierEvaluationByOrder(orderId: number): Promise<void> {
  await ensureSupplierEvaluationTable();
  const pool = getPool();
  if (!pool) return;
  const req = pool.request();
  req.input("Order_ID", sql.Int, Number(orderId));
  await req.query("DELETE FROM dbo.Supplier_Evaluation WHERE Order_ID = @Order_ID");
}
