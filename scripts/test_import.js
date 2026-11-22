const XLSX = require('xlsx');
const sql = require('mssql/msnodesqlv8');

async function main() {
  const wb = XLSX.readFile('C:/Users/msai/Downloads/STOCK17.08.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log('Read Excel rows:', data.length);

  const pool = await new sql.ConnectionPool({
    connectionString: 'Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=ProcurementDB;Trusted_Connection=yes;'
  }).connect();
  console.log('Connected to SQL Server');

  // Check unique constraints on Stock_Item
  const constraints = await pool.request().query(`
    SELECT k.name, c.name as col_name
    FROM sys.key_constraints k
    INNER JOIN sys.index_columns ic ON k.parent_object_id = ic.object_id AND k.unique_index_id = ic.index_id
    INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE k.parent_object_id = OBJECT_ID('dbo.Stock_Item') AND k.type = 'UQ';
  `);
  console.log('Active UQ Constraints:', constraints.recordset);

  for (const c of constraints.recordset) {
    console.log('Dropping constraint:', c.name);
    await pool.request().query(`ALTER TABLE dbo.Stock_Item DROP CONSTRAINT [${c.name}]`);
  }

  // Also check unique indexes
  const uqIndexes = await pool.request().query(`
    SELECT i.name, c.name as col_name
    FROM sys.indexes i
    INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE i.object_id = OBJECT_ID('dbo.Stock_Item') AND i.is_unique = 1 AND i.is_primary_key = 0;
  `);
  console.log('Active Unique Indexes:', uqIndexes.recordset);
  for (const idx of uqIndexes.recordset) {
    console.log('Dropping unique index:', idx.name);
    await pool.request().query(`DROP INDEX [${idx.name}] ON dbo.Stock_Item`);
  }

  await pool.request().query('DELETE FROM dbo.Stock_Item');

  const chunkSize = 50;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const req = pool.request();
    let valSql = '';

    chunk.forEach((r, idx) => {
      const p = `p${idx}_`;
      req.input(`${p}c`, sql.NVarChar(50), String(r.Article).trim());
      req.input(`${p}d`, sql.NVarChar(255), String(r['Désignation article'] || 'Article').trim());
      req.input(`${p}div`, sql.NVarChar(20), String(r.Division || '8660').trim());
      req.input(`${p}m`, sql.NVarChar(20), String(r.Magasin || '33').trim());
      req.input(`${p}u`, sql.NVarChar(20), String(r['Unité de qté base'] || 'PCE').trim());
      req.input(`${p}s`, sql.Decimal(18, 3), Number(r['A utilisation libre']) || 0);
      req.input(`${p}qc`, sql.Decimal(18, 3), Number(r['En contrôle qualité']) || 0);
      req.input(`${p}nl`, sql.Decimal(18, 3), Number(r['Stock non libre']) || 0);
      req.input(`${p}tr`, sql.Decimal(18, 3), Number(r['Stock en transit']) || 0);
      req.input(`${p}v`, sql.Decimal(18, 2), Number(r['Valeur non libre']) || 0);
      const typeArt = String(r["Type d'article"] || 'ROH').trim().toUpperCase();
      req.input(`${p}t`, sql.NVarChar(20), typeArt);

      let cat = 'MP';
      const des = String(r['Désignation article'] || '').toLowerCase();
      if (typeArt === 'FERT' || typeArt === 'ZFER' || des.includes('compteur')) cat = 'PF';
      else if (typeArt === 'HIBE' || typeArt === 'VERP') cat = 'AUX';
      else if (typeArt === 'HALB' || typeArt === 'ZHAL' || typeArt === 'HAWA') cat = 'PD';
      req.input(`${p}cat`, sql.NVarChar(20), cat);

      valSql += `${idx > 0 ? ',' : ''} (@${p}c, @${p}d, @${p}div, @${p}m, @${p}cat, @${p}u, @${p}s, @${p}s, @${p}qc, @${p}nl, @${p}tr, @${p}v, @${p}t, CASE WHEN @${p}s > 0 THEN 1 ELSE 0 END, 0, 'Magasin ' + @${p}m, CASE WHEN @${p}s > 0 THEN 'DISPONIBLE' ELSE 'RUPTURE' END, GETDATE(), GETDATE())`;
    });

    await req.query(`
      INSERT INTO dbo.Stock_Item (
        Code_Article, Designation, Division, Magasin, Categorie, Unite,
        Stock_Actuel, Stock_Utilisation_Libre, Stock_Controle_Qualite,
        Stock_Non_Libre, Stock_Transit, Valeur_Non_Libre, Type_Article,
        Is_Tracked, Is_Important, Emplacement, Statut, Created_At, Updated_At
      )
      VALUES ${valSql}
    `);
  }

  const finalCheck = await pool.request().query(`
    SELECT 
      COUNT(*) as total_rows,
      COUNT(DISTINCT Code_Article) as distinct_articles,
      SUM(Stock_Actuel) as total_stock_libre,
      SUM(Valeur_Non_Libre) as total_valeur_bloquee
    FROM dbo.Stock_Item
  `);

  console.log('✅ ALL ROWS SUCCESSFULLY POPULATED IN SQL SERVER:');
  console.log(finalCheck.recordset[0]);

  await pool.close();
}

main().catch(console.error);
