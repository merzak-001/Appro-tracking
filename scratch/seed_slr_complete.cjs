const fs = require('fs');
const sql = require('mssql/msnodesqlv8');

const connString = 'Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=ProcurementDB;Trusted_Connection=yes;';

async function seedSLR() {
  const pool = await new sql.ConnectionPool({ connectionString: connString }).connect();
  console.log('Connected to SQL Server.');

  // 0. Ensure schema migration for Delai_Livraison_Jours
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Local_Order' AND COLUMN_NAME = 'Delai_Livraison_Jours'
    )
    BEGIN
      ALTER TABLE dbo.Local_Order ADD Delai_Livraison_Jours INT NULL;
    END
  `);
  console.log('Schema verified.');

  // 1. Ensure Supplier "SARL SLR" exists
  let supplierId;
  const existingSup = await pool.request().query("SELECT ID FROM dbo.Fournisseur WHERE Name LIKE '%SLR%' OR Name LIKE '%1010979%'");
  
  if (existingSup.recordset.length > 0) {
    supplierId = existingSup.recordset[0].ID;
    console.log(`Found existing supplier SLR with ID: ${supplierId}`);
  } else {
    const supRes = await pool.request()
      .input('Name', sql.NVarChar(150), 'SARL SLR')
      .input('Address', sql.NVarChar(255), 'Algérie')
      .input('Country', sql.NVarChar(100), 'Algérie')
      .input('RC', sql.NVarChar(100), '16/00-0979455B26')
      .input('NIF', sql.NVarChar(100), '001010979000033')
      .query(`
        INSERT INTO dbo.Fournisseur (Name, Address, Country, RC, NIF)
        OUTPUT INSERTED.ID
        VALUES (@Name, @Address, @Country, @RC, @NIF)
      `);
    supplierId = supRes.recordset[0].ID;
    console.log(`Created new supplier SARL SLR with ID: ${supplierId}`);
  }

  // Clean existing orders for this supplier if any incomplete entries exist
  await pool.request().query(`
    DELETE FROM dbo.Local_Delivery WHERE Order_ID IN (SELECT ID FROM dbo.Local_Order WHERE Fournisseur_ID = ${supplierId});
    DELETE FROM dbo.Local_Order_Line WHERE Order_ID IN (SELECT ID FROM dbo.Local_Order WHERE Fournisseur_ID = ${supplierId});
    DELETE FROM dbo.Local_Order WHERE Fournisseur_ID = ${supplierId};
  `);
  console.log('Cleaned old SLR orders.');

  // 2. Read parsed SLR rows
  const rows = JSON.parse(fs.readFileSync('c:\\Users\\msai\\antigravity\\Procurement-Order-Tracker\\scratch\\parsed_slr.json', 'utf8')).slice(1);

  // Group valid movements (codeMvt 105) by Order Number
  const validMovements = [];
  rows.forEach((r, idx) => {
    const article = (r[0] || '').trim();
    const designation = (r[1] || '').replace(/^"|"$/g, '').trim();
    const qtyStr = r[4];
    const codeMvt = (r[5] || '').trim();
    const date = r[9];
    const orderNum = (r[10] || '').trim();
    const unite = r[11] || 'PCE';
    const amountStr = r[14];
    const docNum = (r[15] || '').trim();

    if (!orderNum || !article || codeMvt !== '105') return; // Only process positive addition codeMvt 105

    const qty = parseFloat(qtyStr || '0');
    const amount = parseFloat(amountStr || '0');

    if (qty <= 0) return;

    validMovements.push({
      rowIdx: idx + 1,
      article,
      designation,
      qty,
      codeMvt,
      date,
      orderNum,
      unite,
      amount,
      docNum,
    });
  });

  console.log(`Filtered ${validMovements.length} positive receipt entries (codeMvt 105).`);

  // Group entries by Order Number
  const ordersMap = {};
  validMovements.forEach((mvt) => {
    if (!ordersMap[mvt.orderNum]) {
      ordersMap[mvt.orderNum] = [];
    }
    ordersMap[mvt.orderNum].push(mvt);
  });

  const orderNumbers = Object.keys(ordersMap);
  console.log(`Processing ${orderNumbers.length} unique purchase orders...`);

  let totalOrdersCreated = 0;
  let totalLinesCreated = 0;
  let totalDeliveriesCreated = 0;

  for (const ordNum of orderNumbers) {
    const mvts = ordersMap[ordNum];

    // Group items by article code to build Order Line Items
    const articleMap = {};
    mvts.forEach((mvt) => {
      if (!articleMap[mvt.article]) {
        articleMap[mvt.article] = {
          article: mvt.article,
          designation: mvt.designation,
          unite: mvt.unite,
          totalQty: 0,
          totalAmountHT: 0,
          minDate: mvt.date,
          movements: [],
        };
      }
      const a = articleMap[mvt.article];
      a.totalQty += mvt.qty;
      a.totalAmountHT += mvt.amount;
      a.movements.push(mvt);
      if (mvt.date < a.minDate) a.minDate = mvt.date;
    });

    const articlesList = Object.values(articleMap);

    // Calculate order headers totals
    let orderTotalHT = 0;
    let orderTotalTVA = 0;
    let orderTotalTTC = 0;
    let orderMinDate = articlesList[0]?.minDate || '2026-01-01';

    const orderLinesData = articlesList.map((art, idx) => {
      const lineHT = Number(art.totalAmountHT.toFixed(2));
      const lineTVA = Number((lineHT * 0.19).toFixed(2));
      const lineTTC = Number((lineHT + lineTVA).toFixed(2));
      const unitPrice = art.totalQty > 0 ? Number((lineHT / art.totalQty).toFixed(2)) : 0;

      orderTotalHT += lineHT;
      orderTotalTVA += lineTVA;
      orderTotalTTC += lineTTC;

      if (art.minDate < orderMinDate) orderMinDate = art.minDate;

      return {
        position: idx + 1,
        designation: art.designation,
        qty: art.totalQty,
        unite: art.unite,
        unit_price: unitPrice,
        tva_percentage: 19,
        total_ht: lineHT,
        montant_tva: lineTVA,
        total_ttc: lineTTC,
        movements: art.movements,
      };
    });

    // Create Local Order in Transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const req = transaction.request();
      req.input('N_Order', sql.NVarChar(50), ordNum);
      req.input('Etablir_par', sql.NVarChar(100), 'SARL SLR');
      req.input('Objet_de_commande', sql.NVarChar(255), `Commande SLR N° ${ordNum}`);
      req.input('Fournisseur_ID', sql.Int, supplierId);
      req.input('Date', sql.VarChar(10), orderMinDate);
      req.input('Observation', sql.NVarChar(4000), 'Importé automatiquement depuis le fichier Livraison SLR');
      req.input('Status', sql.NVarChar(50), 'Livraison Partielle');
      req.input('Delai_Livraison_Jours', sql.Int, 30);
      req.input('Total_HT', sql.Decimal(18, 2), Number(orderTotalHT.toFixed(2)));
      req.input('Total_TVA', sql.Decimal(18, 2), Number(orderTotalTVA.toFixed(2)));
      req.input('Total_TTC', sql.Decimal(18, 2), Number(orderTotalTTC.toFixed(2)));

      const orderRes = await req.query(`
        INSERT INTO dbo.Local_Order (N_Order, Etablir_par, Objet_de_commande, Fournisseur_ID, Date, Observation, Status, Delai_Livraison_Jours, Total_HT, Total_TVA, Total_TTC)
        OUTPUT INSERTED.ID
        VALUES (@N_Order, @Etablir_par, @Objet_de_commande, @Fournisseur_ID, @Date, @Observation, @Status, @Delai_Livraison_Jours, @Total_HT, @Total_TVA, @Total_TTC)
      `);

      const orderId = orderRes.recordset[0].ID;
      totalOrdersCreated++;

      // Create lines & deliveries
      for (const lineData of orderLinesData) {
        const lReq = transaction.request();
        lReq.input('Order_ID', sql.Int, orderId);
        lReq.input('Position', sql.Int, lineData.position);
        lReq.input('Designation', sql.NVarChar(255), lineData.designation);
        lReq.input('Qty', sql.Decimal(18, 3), lineData.qty);
        lReq.input('Unite', sql.NVarChar(50), lineData.unite);
        lReq.input('Unit_Price', sql.Decimal(18, 2), lineData.unit_price);
        lReq.input('TVA_Percentage', sql.Decimal(5, 2), lineData.tva_percentage);

        const lineRes = await lReq.query(`
          INSERT INTO dbo.Local_Order_Line (Order_ID, Position, Designation, Qty, Unite, Unit_Price, TVA_Percentage)
          OUTPUT INSERTED.ID
          VALUES (@Order_ID, @Position, @Designation, @Qty, @Unite, @Unit_Price, @TVA_Percentage)
        `);

        const lineId = lineRes.recordset[0].ID;
        totalLinesCreated++;

        // Insert deliveries for each movement
        for (const mvt of lineData.movements) {
          const dReq = transaction.request();
          dReq.input('Order_ID', sql.Int, orderId);
          dReq.input('Line_ID', sql.Int, lineId);
          dReq.input('Delivered_Qty', sql.Decimal(18, 3), mvt.qty);
          dReq.input('Delivery_Date', sql.VarChar(10), mvt.date);
          dReq.input('Delivery_Note_Number', sql.NVarChar(100), `BL-${mvt.docNum}`);

          await dReq.query(`
            INSERT INTO dbo.Local_Delivery (Order_ID, Line_ID, Delivered_Qty, Delivery_Date, Delivery_Note_Number)
            VALUES (@Order_ID, @Line_ID, @Delivered_Qty, @Delivery_Date, @Delivery_Note_Number)
          `);
          totalDeliveriesCreated++;
        }
      }

      await transaction.commit();
      console.log(`Successfully created Order ${ordNum} (ID: ${orderId}) with ${orderLinesData.length} lines and ${mvts.length} deliveries.`);
    } catch (err) {
      await transaction.rollback();
      console.error(`Failed to create order ${ordNum}:`, err);
    }
  }

  console.log(`\n==========================================`);
  console.log(`DONE SEEDING SLR DATA SUCCESSFULLY!`);
  console.log(`Supplier ID: ${supplierId}`);
  console.log(`Total Purchase Orders Created: ${totalOrdersCreated}`);
  console.log(`Total Order Lines Created: ${totalLinesCreated}`);
  console.log(`Total Delivery BLs Created: ${totalDeliveriesCreated}`);
  console.log(`==========================================`);

  await pool.close();
}

seedSLR().catch(console.error);
