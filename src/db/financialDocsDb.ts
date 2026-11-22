import sql from "mssql/msnodesqlv8";
import { getPool } from "./connection";
import { FinancialDocument, FinancialDocInvoiceLine } from "../types";

export async function dbGetFinancialDocuments(): Promise<FinancialDocument[]> {
  const pool = getPool();
  if (!pool) return [];
  const docsRes = await pool.request().query<any>(`
    SELECT ID as id, Doc_Type as doc_type, Ref_Number as ref_number,
           CONVERT(VARCHAR(10), Date, 120) as date, Location as location,
           Department as department, Signatory_Title as signatory_title,
           Objet as objet, Beneficiary_Name as beneficiary_name, Amount as amount,
           Amount_In_Words as amount_in_words, Description as description,
           Order_Ref as order_ref, Fournisseur_ID as fournisseur_id,
           Fournisseur_Name as fournisseur_name, Mode_Paiement as mode_paiement,
           Cheque_Number as cheque_number, CONVERT(VARCHAR(10), Cheque_Date, 120) as cheque_date,
           Bank_Name as bank_name, Bank_Account_Number as bank_account_number,
           Pj_Facture_Ordonnancee as pj_facture_ordonnancee,
           Pj_Bon_Arrivee as pj_bon_arrivee, Pj_Commande_Copy as pj_commande_copy,
           Status as status, Created_At as created_at
    FROM dbo.Financial_Document
    ORDER BY ID DESC
  `);

  const linesRes = await pool.request().query<any>(`
    SELECT ID as id, Document_ID as document_id, Position as position,
           Facture_Number as facture_number, CONVERT(VARCHAR(10), Facture_Date, 120) as facture_date,
           Fournisseur_Name as fournisseur_name, Amount as amount
    FROM dbo.Financial_Document_Invoice_Line
    ORDER BY Document_ID DESC, Position ASC
  `);

  const linesByDoc: Record<number, FinancialDocInvoiceLine[]> = {};
  linesRes.recordset.forEach((l) => {
    if (!linesByDoc[l.document_id]) linesByDoc[l.document_id] = [];
    linesByDoc[l.document_id].push({
      id: l.id,
      document_id: l.document_id,
      position: l.position,
      facture_number: l.facture_number,
      facture_date: l.facture_date,
      fournisseur_name: l.fournisseur_name,
      amount: Number(l.amount),
    });
  });

  return docsRes.recordset.map((d) => ({
    id: d.id,
    doc_type: d.doc_type,
    ref_number: d.ref_number,
    date: d.date,
    location: d.location || 'EL- EULMA',
    department: d.department || 'DP',
    signatory_title: d.signatory_title || 'LE DIRECTEUR DE PRODUCTION',
    objet: d.objet,
    beneficiary_name: d.beneficiary_name || '',
    amount: d.amount ? Number(d.amount) : undefined,
    amount_in_words: d.amount_in_words || '',
    description: d.description || '',
    order_ref: d.order_ref || '',
    fournisseur_id: d.fournisseur_id ? Number(d.fournisseur_id) : undefined,
    fournisseur_name: d.fournisseur_name || '',
    mode_paiement: d.mode_paiement || '',
    cheque_number: d.cheque_number || '',
    cheque_date: d.cheque_date || '',
    bank_name: d.bank_name || '',
    bank_account_number: d.bank_account_number || '',
    pj_facture_ordonnancee: Boolean(d.pj_facture_ordonnancee),
    pj_bon_arrivee: d.pj_bon_arrivee || '',
    pj_commande_copy: d.pj_commande_copy || '',
    status: d.status || 'Brouillon',
    created_at: d.created_at ? new Date(d.created_at).toISOString() : new Date().toISOString(),
    invoice_lines: linesByDoc[d.id] || [],
  }));
}

export async function dbCreateFinancialDocument(d: Omit<FinancialDocument, 'id'>): Promise<FinancialDocument> {
  const pool = getPool();
  if (!pool) throw new Error("SQL Server not connected");
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const req = transaction.request();
    req.input("Doc_Type", sql.NVarChar(50), d.doc_type);
    req.input("Ref_Number", sql.NVarChar(100), d.ref_number);
    req.input("Date", sql.VarChar(10), d.date);
    req.input("Location", sql.NVarChar(100), d.location || 'EL- EULMA');
    req.input("Department", sql.NVarChar(100), d.department || 'DP');
    req.input("Signatory_Title", sql.NVarChar(150), d.signatory_title || 'LE DIRECTEUR DE PRODUCTION');
    req.input("Objet", sql.NVarChar(255), d.objet);
    req.input("Beneficiary_Name", sql.NVarChar(255), d.beneficiary_name || null);
    req.input("Amount", sql.Decimal(18, 2), d.amount ?? null);
    req.input("Amount_In_Words", sql.NVarChar(500), d.amount_in_words || null);
    req.input("Description", sql.NVarChar(sql.MAX), d.description || null);
    req.input("Order_Ref", sql.NVarChar(100), d.order_ref || null);
    req.input("Fournisseur_ID", sql.Int, d.fournisseur_id ?? null);
    req.input("Fournisseur_Name", sql.NVarChar(255), d.fournisseur_name || null);
    req.input("Mode_Paiement", sql.NVarChar(100), d.mode_paiement || null);
    req.input("Cheque_Number", sql.NVarChar(100), d.cheque_number || null);
    req.input("Cheque_Date", sql.VarChar(10), d.cheque_date || null);
    req.input("Bank_Name", sql.NVarChar(255), d.bank_name || null);
    req.input("Bank_Account_Number", sql.NVarChar(100), d.bank_account_number || null);
    req.input("Pj_Facture_Ordonnancee", sql.Bit, d.pj_facture_ordonnancee !== false ? 1 : 0);
    req.input("Pj_Bon_Arrivee", sql.NVarChar(255), d.pj_bon_arrivee || null);
    req.input("Pj_Commande_Copy", sql.NVarChar(255), d.pj_commande_copy || null);
    req.input("Status", sql.NVarChar(50), d.status || 'Brouillon');

    const docRes = await req.query(`
      INSERT INTO dbo.Financial_Document (
        Doc_Type, Ref_Number, Date, Location, Department, Signatory_Title,
        Objet, Beneficiary_Name, Amount, Amount_In_Words, Description,
        Order_Ref, Fournisseur_ID, Fournisseur_Name, Mode_Paiement,
        Cheque_Number, Cheque_Date, Bank_Name, Bank_Account_Number,
        Pj_Facture_Ordonnancee, Pj_Bon_Arrivee, Pj_Commande_Copy, Status
      )
      OUTPUT INSERTED.ID, INSERTED.Created_At
      VALUES (
        @Doc_Type, @Ref_Number, @Date, @Location, @Department, @Signatory_Title,
        @Objet, @Beneficiary_Name, @Amount, @Amount_In_Words, @Description,
        @Order_Ref, @Fournisseur_ID, @Fournisseur_Name, @Mode_Paiement,
        @Cheque_Number, @Cheque_Date, @Bank_Name, @Bank_Account_Number,
        @Pj_Facture_Ordonnancee, @Pj_Bon_Arrivee, @Pj_Commande_Copy, @Status
      )
    `);

    const newId = docRes.recordset[0].ID;
    const createdAt = docRes.recordset[0].Created_At;

    const insertedLines: FinancialDocInvoiceLine[] = [];
    if (d.invoice_lines && d.invoice_lines.length > 0) {
      for (let idx = 0; idx < d.invoice_lines.length; idx++) {
        const line = d.invoice_lines[idx];
        const lReq = transaction.request();
        lReq.input("Document_ID", sql.Int, newId);
        lReq.input("Position", sql.Int, idx + 1);
        lReq.input("Facture_Number", sql.NVarChar(100), line.facture_number);
        lReq.input("Facture_Date", sql.VarChar(10), line.facture_date);
        lReq.input("Fournisseur_Name", sql.NVarChar(255), line.fournisseur_name);
        lReq.input("Amount", sql.Decimal(18, 2), line.amount);

        const lRes = await lReq.query(`
          INSERT INTO dbo.Financial_Document_Invoice_Line (Document_ID, Position, Facture_Number, Facture_Date, Fournisseur_Name, Amount)
          OUTPUT INSERTED.ID
          VALUES (@Document_ID, @Position, @Facture_Number, @Facture_Date, @Fournisseur_Name, @Amount)
        `);

        insertedLines.push({
          id: lRes.recordset[0].ID,
          document_id: newId,
          position: idx + 1,
          facture_number: line.facture_number,
          facture_date: line.facture_date,
          fournisseur_name: line.fournisseur_name,
          amount: line.amount,
        });
      }
    }

    await transaction.commit();

    return {
      id: newId,
      ...d,
      status: d.status || 'Brouillon',
      created_at: new Date(createdAt).toISOString(),
      invoice_lines: insertedLines,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function dbUpdateFinancialDocumentStatus(id: number, status: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool
    .request()
    .input("ID", sql.Int, id)
    .input("Status", sql.NVarChar(50), status)
    .query("UPDATE dbo.Financial_Document SET Status = @Status WHERE ID = @ID");
}

export async function dbUpdateFinancialDocument(id: number, d: Partial<FinancialDocument>): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const req = transaction.request();
    req.input("ID", sql.Int, id);
    req.input("Doc_Type", sql.NVarChar(50), d.doc_type || null);
    req.input("Ref_Number", sql.NVarChar(100), d.ref_number || null);
    req.input("Date", sql.VarChar(10), d.date || null);
    req.input("Location", sql.NVarChar(100), d.location || null);
    req.input("Department", sql.NVarChar(100), d.department || null);
    req.input("Signatory_Title", sql.NVarChar(150), d.signatory_title || null);
    req.input("Objet", sql.NVarChar(255), d.objet || null);
    req.input("Beneficiary_Name", sql.NVarChar(255), d.beneficiary_name || null);
    req.input("Amount", sql.Decimal(18, 2), d.amount !== undefined && d.amount !== null ? d.amount : null);
    req.input("Amount_In_Words", sql.NVarChar(500), d.amount_in_words || null);
    req.input("Description", sql.NVarChar(sql.MAX), d.description || null);
    req.input("Order_Ref", sql.NVarChar(100), d.order_ref || null);
    req.input("Fournisseur_ID", sql.Int, d.fournisseur_id || null);
    req.input("Fournisseur_Name", sql.NVarChar(255), d.fournisseur_name || null);
    req.input("Mode_Paiement", sql.NVarChar(100), d.mode_paiement || null);
    req.input("Cheque_Number", sql.NVarChar(100), d.cheque_number || null);
    req.input("Cheque_Date", sql.VarChar(10), d.cheque_date || null);
    req.input("Bank_Name", sql.NVarChar(255), d.bank_name || null);
    req.input("Bank_Account_Number", sql.NVarChar(100), d.bank_account_number || null);
    req.input("Pj_Facture_Ordonnancee", sql.Bit, d.pj_facture_ordonnancee !== false ? 1 : 0);
    req.input("Pj_Bon_Arrivee", sql.NVarChar(255), d.pj_bon_arrivee || null);
    req.input("Pj_Commande_Copy", sql.NVarChar(255), d.pj_commande_copy || null);
    req.input("Status", sql.NVarChar(50), d.status || null);

    await req.query(`
      UPDATE dbo.Financial_Document
      SET Doc_Type = COALESCE(@Doc_Type, Doc_Type),
          Ref_Number = COALESCE(@Ref_Number, Ref_Number),
          Date = COALESCE(@Date, Date),
          Location = COALESCE(@Location, Location),
          Department = COALESCE(@Department, Department),
          Signatory_Title = COALESCE(@Signatory_Title, Signatory_Title),
          Objet = COALESCE(@Objet, Objet),
          Beneficiary_Name = COALESCE(@Beneficiary_Name, Beneficiary_Name),
          Amount = COALESCE(@Amount, Amount),
          Amount_In_Words = COALESCE(@Amount_In_Words, Amount_In_Words),
          Description = COALESCE(@Description, Description),
          Order_Ref = COALESCE(@Order_Ref, Order_Ref),
          Fournisseur_ID = COALESCE(@Fournisseur_ID, Fournisseur_ID),
          Fournisseur_Name = COALESCE(@Fournisseur_Name, Fournisseur_Name),
          Mode_Paiement = COALESCE(@Mode_Paiement, Mode_Paiement),
          Cheque_Number = COALESCE(@Cheque_Number, Cheque_Number),
          Cheque_Date = COALESCE(@Cheque_Date, Cheque_Date),
          Bank_Name = COALESCE(@Bank_Name, Bank_Name),
          Bank_Account_Number = COALESCE(@Bank_Account_Number, Bank_Account_Number),
          Pj_Facture_Ordonnancee = COALESCE(@Pj_Facture_Ordonnancee, Pj_Facture_Ordonnancee),
          Pj_Bon_Arrivee = COALESCE(@Pj_Bon_Arrivee, Pj_Bon_Arrivee),
          Pj_Commande_Copy = COALESCE(@Pj_Commande_Copy, Pj_Commande_Copy),
          Status = COALESCE(@Status, Status)
      WHERE ID = @ID
    `);

    if (d.invoice_lines) {
      const delReq = transaction.request();
      delReq.input("Document_ID", sql.Int, id);
      await delReq.query("DELETE FROM dbo.Financial_Document_Invoice_Line WHERE Document_ID = @Document_ID");

      for (let idx = 0; idx < d.invoice_lines.length; idx++) {
        const line = d.invoice_lines[idx];
        const lReq = transaction.request();
        lReq.input("Document_ID", sql.Int, id);
        lReq.input("Position", sql.Int, idx + 1);
        lReq.input("Facture_Number", sql.NVarChar(100), line.facture_number);
        lReq.input("Facture_Date", sql.VarChar(10), line.facture_date);
        lReq.input("Fournisseur_Name", sql.NVarChar(255), line.fournisseur_name);
        lReq.input("Amount", sql.Decimal(18, 2), line.amount);

        await lReq.query(`
          INSERT INTO dbo.Financial_Document_Invoice_Line (Document_ID, Position, Facture_Number, Facture_Date, Fournisseur_Name, Amount)
          VALUES (@Document_ID, @Position, @Facture_Number, @Facture_Date, @Fournisseur_Name, @Amount)
        `);
      }
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function dbDeleteFinancialDocument(id: number): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const req = pool.request();
  req.input("ID", sql.Int, id);
  await req.query("DELETE FROM dbo.Financial_Document WHERE ID = @ID");
}
