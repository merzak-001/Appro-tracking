const sql = require('mssql/msnodesqlv8');

const connString = 'Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=ProcurementDB;Trusted_Connection=yes;';

async function testUpdate() {
  const pool = await new sql.ConnectionPool({ connectionString: connString }).connect();
  console.log('Connected to SQL Server.');

  // Find order ID 20
  const ordRes = await pool.request().query('SELECT TOP 1 ID, N_Order FROM dbo.Local_Order WHERE Etablir_par = N\'SARL SLR\'');
  const ord = ordRes.recordset[0];
  console.log('Target Order:', ord);

  if (!ord) return;

  const linesRes = await pool.request().query(`SELECT * FROM dbo.Local_Order_Line WHERE Order_ID = ${ord.ID}`);
  console.log('Lines count before update:', linesRes.recordset.length);
  const sampleLine = linesRes.recordset[0];

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const req = transaction.request();
    req.input('ID', sql.Int, ord.ID);
    req.input('N_Order', sql.NVarChar(50), ord.N_Order);
    req.input('Etablir_par', sql.NVarChar(100), 'SARL SLR / Appro');
    req.input('Objet_de_commande', sql.NVarChar(255), 'Updated SLR Order Test');
    req.input('Fournisseur_ID', sql.Int, 105);
    req.input('Date', sql.VarChar(10), '2026-04-21');
    req.input('Observation', sql.NVarChar(4000), 'Updated successfully');
    req.input('Status', sql.NVarChar(50), 'Commandée');
    req.input('Delai_Livraison_Jours', sql.Int, 45);
    req.input('Total_HT', sql.Decimal(18, 2), 50000);
    req.input('Total_TVA', sql.Decimal(18, 2), 9500);
    req.input('Total_TTC', sql.Decimal(18, 2), 59500);

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
          Total_HT = COALESCE(@Total_HT, Total_HT),
          Total_TVA = COALESCE(@Total_TVA, Total_TVA),
          Total_TTC = COALESCE(@Total_TTC, Total_TTC)
      WHERE ID = @ID
    `);

    // Intelligent UPSERT on order lines
    const currentLinesRes = await transaction.request()
      .input('Order_ID', sql.Int, ord.ID)
      .query('SELECT ID FROM dbo.Local_Order_Line WHERE Order_ID = @Order_ID');

    const existingLineIds = new Set(currentLinesRes.recordset.map((r) => Number(r.ID)));
    const updatedLineIds = new Set();

    // Mock line update
    const linesToUpdate = [
      {
        id: sampleLine.ID,
        designation: sampleLine.Designation,
        qty: sampleLine.Qty,
        unite: sampleLine.Unite,
        unit_price: sampleLine.Unit_Price,
        tva_percentage: 19,
      },
    ];

    for (let idx = 0; idx < linesToUpdate.length; idx++) {
      const line = linesToUpdate[idx];
      const lineId = line.id && existingLineIds.has(Number(line.id)) ? Number(line.id) : null;

      if (lineId) {
        updatedLineIds.add(lineId);
        const uReq = transaction.request();
        uReq.input('ID', sql.Int, lineId);
        uReq.input('Position', sql.Int, idx + 1);
        uReq.input('Designation', sql.NVarChar(255), line.designation);
        uReq.input('Qty', sql.Decimal(18, 3), line.qty);
        uReq.input('Unite', sql.NVarChar(50), line.unite || 'piece');
        uReq.input('Unit_Price', sql.Decimal(18, 2), line.unit_price);
        uReq.input('TVA_Percentage', sql.Decimal(5, 2), line.tva_percentage || 19);

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
      }
    }

    await transaction.commit();
    console.log('SUCCESS: Order and lines updated without any errors!');
  } catch (err) {
    await transaction.rollback();
    console.error('UPDATE FAILED:', err);
  }

  await pool.close();
}

testUpdate().catch(console.error);
