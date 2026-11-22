const sql = require("mssql/msnodesqlv8");

const config = {
  connectionString: "Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS;Database=ProcurementDB;Trusted_Connection=yes;",
};

async function migrate() {
  console.log("Connecting to SQL Server ProcurementDB...");
  try {
    const pool = await sql.connect(config);
    console.log("Connected successfully to SQL Server!");

    console.log("Creating dbo.Financial_Document table if not exists...");
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Financial_Document]') AND type in (N'U'))
      BEGIN
          CREATE TABLE dbo.Financial_Document (
              ID INT IDENTITY(1,1) PRIMARY KEY,
              Doc_Type NVARCHAR(50) NOT NULL,
              Ref_Number NVARCHAR(100) NOT NULL,
              Date VARCHAR(10) NOT NULL,
              Location NVARCHAR(100) NOT NULL DEFAULT 'EL- EULMA',
              Department NVARCHAR(100) NOT NULL DEFAULT 'DP',
              Signatory_Title NVARCHAR(150) NOT NULL DEFAULT 'LE DIRECTEUR DE PRODUCTION',
              Objet NVARCHAR(255) NOT NULL,
              Beneficiary_Name NVARCHAR(255) NULL,
              Amount DECIMAL(18,2) NULL,
              Amount_In_Words NVARCHAR(500) NULL,
              Description NVARCHAR(MAX) NULL,
              Order_Ref NVARCHAR(100) NULL,
              Fournisseur_ID INT NULL,
              Fournisseur_Name NVARCHAR(255) NULL,
              Mode_Paiement NVARCHAR(100) NULL,
              Pj_Facture_Ordonnancee BIT DEFAULT 1,
              Pj_Bon_Arrivee NVARCHAR(255) NULL,
              Pj_Commande_Copy NVARCHAR(255) NULL,
              Created_At DATETIME DEFAULT GETDATE()
          );
          PRINT 'Table Financial_Document created.';
      END
    `);

    console.log("Creating dbo.Financial_Document_Invoice_Line table if not exists...");
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Financial_Document_Invoice_Line]') AND type in (N'U'))
      BEGIN
          CREATE TABLE dbo.Financial_Document_Invoice_Line (
              ID INT IDENTITY(1,1) PRIMARY KEY,
              Document_ID INT NOT NULL FOREIGN KEY REFERENCES dbo.Financial_Document(ID) ON DELETE CASCADE,
              Position INT NOT NULL,
              Facture_Number NVARCHAR(100) NOT NULL,
              Facture_Date VARCHAR(10) NOT NULL,
              Fournisseur_Name NVARCHAR(255) NOT NULL,
              Amount DECIMAL(18,2) NOT NULL
          );
          PRINT 'Table Financial_Document_Invoice_Line created.';
      END
    `);

    console.log("MIGRATION COMPLETED SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrate();
