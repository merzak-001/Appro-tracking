import sql from "mssql/msnodesqlv8";

let pool: sql.ConnectionPool | null = null;
let isConnected = false;

export async function closeSqlServer(): Promise<void> {
  if (pool) {
    try {
      await pool.close();
    } catch (e) {
      console.warn("[MSSQL] Error closing pool:", e);
    } finally {
      pool = null;
      isConnected = false;
    }
  }
}

export function getPool(): sql.ConnectionPool | null {
  return pool;
}

export function isSqlServerConnected(): boolean {
  return isConnected && pool !== null;
}

export async function initSqlServer(): Promise<boolean> {
  const rawServer = (process.env.DB_SERVER || process.env.MSSQL_SERVER || "localhost\\SQLEXPRESS").trim();
  const dbName = process.env.DB_NAME || "ProcurementDB";

  const isTrustedConnection =
    process.env.DB_TRUSTED_CONNECTION === "true" ||
    !process.env.DB_USER ||
    process.env.DB_USER.trim() === "" ||
    process.env.DB_USER.trim().toLowerCase() === "windows";

  try {
    let connectionString = "";

    if (isTrustedConnection) {
      connectionString = `Driver={SQL Server};Server=${rawServer};Database=${dbName};Trusted_Connection=yes;`;
    } else {
      connectionString = `Driver={SQL Server};Server=${rawServer};Database=${dbName};Uid=${process.env.DB_USER};Pwd=${process.env.DB_PASSWORD};`;
    }

    console.log(
      `[MSSQL] Connecting to SQL Server: ${rawServer} (Database: ${dbName}, Auth: ${
        isTrustedConnection ? "Windows Authentication" : "SQL Server Auth"
      })`
    );

    pool = await new sql.ConnectionPool({
      connectionString,
      connectionTimeout: 3000,
      requestTimeout: 5000,
    } as any).connect();

    isConnected = true;
    console.log(`[MSSQL] Successfully connected to Microsoft SQL Server!`);

    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
        BEGIN
            CREATE TABLE dbo.Users (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Username NVARCHAR(50) NOT NULL UNIQUE,
                Password NVARCHAR(255) NOT NULL,
                Full_Name NVARCHAR(100) NOT NULL,
                Role NVARCHAR(20) NOT NULL CHECK (Role IN ('Admin', 'Appro', 'Chef Service', 'Visitor')),
                Created_At DATETIME2 DEFAULT GETDATE()
            );
        END

        -- Ensure Role check constraint accepts 'Appro'
        DECLARE @chkName NVARCHAR(256);
        DECLARE chk_user_cursor CURSOR FOR
            SELECT name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.Users') AND definition LIKE '%Role%';
        OPEN chk_user_cursor;
        FETCH NEXT FROM chk_user_cursor INTO @chkName;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            EXEC('ALTER TABLE dbo.Users DROP CONSTRAINT [' + @chkName + ']');
            FETCH NEXT FROM chk_user_cursor INTO @chkName;
        END;
        CLOSE chk_user_cursor;
        DEALLOCATE chk_user_cursor;

        IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Users_Role' AND parent_object_id = OBJECT_ID('dbo.Users'))
        BEGIN
            ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('Admin', 'Appro', 'Chef Service', 'Visitor'));
        END

        -- Seed initial requested users if missing
        IF NOT EXISTS (SELECT * FROM dbo.Users WHERE Username = 'salem.ferdjallah')
        BEGIN
            INSERT INTO dbo.Users (Username, Password, Full_Name, Role) VALUES
            ('salem.ferdjallah', '1010', 'Ferdjallah, Salem', 'Appro'),
            ('mohamed.brahimi', '1010', 'Brahimi, Mohamed', 'Appro'),
            ('abdelouahab.hadjadj', '1010', 'Hadjadj, Abdelouahab', 'Appro'),
            ('merzak.sai', '1010', 'Sai, Merzak', 'Appro');
        END

        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'Allowed_Pages')
        BEGIN
            ALTER TABLE dbo.Users ADD Allowed_Pages NVARCHAR(MAX) NULL;
        END

        -- Set Brahimi Mohamed's default access to only suivi-production if not already customized
        UPDATE dbo.Users 
        SET Allowed_Pages = '["suivi-production"]'
        WHERE (LOWER(Username) LIKE '%brahimi%' OR LOWER(Full_Name) LIKE '%brahimi%')
          AND (Allowed_Pages IS NULL OR Allowed_Pages = '');

        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Foreign_Order' AND COLUMN_NAME = 'Mode_Paiement')
        BEGIN
            ALTER TABLE dbo.Foreign_Order ADD Mode_Paiement NVARCHAR(100) NULL;
        END

        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Foreign_Order' AND COLUMN_NAME = 'Num_Expeditions')
        BEGIN
            ALTER TABLE dbo.Foreign_Order ADD Num_Expeditions INT NOT NULL DEFAULT 1;
        END

        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Foreign_Order' AND COLUMN_NAME = 'Destination_Type')
        BEGIN
            ALTER TABLE dbo.Foreign_Order ADD Destination_Type NVARCHAR(50) NOT NULL DEFAULT 'Port';
        END

        -- Ensure Incoterm check constraint accepts all standard Incoterms
        DECLARE @incotermChk NVARCHAR(256);
        SELECT @incotermChk = name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.Foreign_Expedition') AND name <> 'CK_Expedition_Incoterm' AND definition LIKE '%Incoterm%';
        IF @incotermChk IS NOT NULL
        BEGIN
            EXEC('ALTER TABLE dbo.Foreign_Expedition DROP CONSTRAINT [' + @incotermChk + ']');
        END
        IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.Foreign_Expedition') AND name = 'CK_Expedition_Incoterm')
        BEGIN
            ALTER TABLE dbo.Foreign_Expedition ADD CONSTRAINT CK_Expedition_Incoterm CHECK (Incoterm IN ('FOB', 'CFR', 'CPT', 'EXW', 'FCA', 'FAS', 'CIF', 'CIP', 'DAP', 'DPU', 'DDP'));
        END

        -- Ensure Local_Order Status check constraint is dropped if present so all status values are allowed
        DECLARE @orderStatusChk NVARCHAR(256);
        SELECT @orderStatusChk = name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.Local_Order');
        IF @orderStatusChk IS NOT NULL
        BEGIN
            EXEC('ALTER TABLE dbo.Local_Order DROP CONSTRAINT [' + @orderStatusChk + ']');
        END

        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Local_Order' AND COLUMN_NAME = 'Delai_Livraison_Jours')
        BEGIN
            ALTER TABLE dbo.Local_Order ADD Delai_Livraison_Jours INT NULL;
        END

        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Local_Order' AND COLUMN_NAME = 'Procedure_Type')
        BEGIN
            ALTER TABLE dbo.Local_Order ADD Procedure_Type NVARCHAR(50) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Local_Delivery]') AND type in (N'U'))
        BEGIN
            CREATE TABLE dbo.Local_Delivery (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Order_ID INT NOT NULL,
                Line_ID INT NOT NULL,
                Delivered_Qty DECIMAL(18,3) NOT NULL,
                Delivery_Date VARCHAR(10) NOT NULL,
                Delivery_Note_Number NVARCHAR(100) NOT NULL,
                Movement_Code NVARCHAR(10) NULL DEFAULT '103',
                Material_Doc_Number NVARCHAR(100) NULL,
                SAP_Order_Number NVARCHAR(100) NULL,
                Item_Code NVARCHAR(100) NULL,
                Created_At DATETIME DEFAULT GETDATE()
            );
        END
        ELSE
        BEGIN
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Local_Delivery' AND COLUMN_NAME = 'Movement_Code')
            BEGIN
                ALTER TABLE dbo.Local_Delivery ADD Movement_Code NVARCHAR(10) NULL DEFAULT '103';
            END
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Local_Delivery' AND COLUMN_NAME = 'Material_Doc_Number')
            BEGIN
                ALTER TABLE dbo.Local_Delivery ADD Material_Doc_Number NVARCHAR(100) NULL;
            END
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Local_Delivery' AND COLUMN_NAME = 'SAP_Order_Number')
            BEGIN
                ALTER TABLE dbo.Local_Delivery ADD SAP_Order_Number NVARCHAR(100) NULL;
            END
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Local_Delivery' AND COLUMN_NAME = 'Item_Code')
            BEGIN
                ALTER TABLE dbo.Local_Delivery ADD Item_Code NVARCHAR(100) NULL;
            END
        END

        -- Ensure any check constraints on Local_Delivery (such as Delivered_Qty > 0) are removed to permit Code 104 cancellations
        DECLARE @delChkName NVARCHAR(256);
        DECLARE del_chk_cursor CURSOR FOR
            SELECT name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.Local_Delivery');
        OPEN del_chk_cursor;
        FETCH NEXT FROM del_chk_cursor INTO @delChkName;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            EXEC('ALTER TABLE dbo.Local_Delivery DROP CONSTRAINT [' + @delChkName + ']');
            FETCH NEXT FROM del_chk_cursor INTO @delChkName;
        END;
        CLOSE del_chk_cursor;
        DEALLOCATE del_chk_cursor;

        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Local_SAP_Order_Mapping]') AND type in (N'U'))
        BEGIN
            CREATE TABLE dbo.Local_SAP_Order_Mapping (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                SAP_Order_Number NVARCHAR(100) NOT NULL UNIQUE,
                Local_Order_ID INT NOT NULL,
                Local_Order_Number NVARCHAR(100) NOT NULL,
                Created_At DATETIME DEFAULT GETDATE()
            );
        END

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
                Cheque_Number NVARCHAR(100) NULL,
                Cheque_Date VARCHAR(10) NULL,
                Bank_Name NVARCHAR(255) NULL,
                Bank_Account_Number NVARCHAR(100) NULL,
                Pj_Facture_Ordonnancee BIT DEFAULT 1,
                Pj_Bon_Arrivee NVARCHAR(255) NULL,
                Pj_Commande_Copy NVARCHAR(255) NULL,
                Status NVARCHAR(50) NULL DEFAULT 'Brouillon',
                Created_At DATETIME DEFAULT GETDATE()
            );
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Financial_Document]') AND name = 'Status')
        BEGIN
            ALTER TABLE dbo.Financial_Document ADD Status NVARCHAR(50) NULL DEFAULT 'Brouillon';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Financial_Document]') AND name = 'Cheque_Number')
        BEGIN
            ALTER TABLE dbo.Financial_Document ADD Cheque_Number NVARCHAR(100) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Financial_Document]') AND name = 'Cheque_Date')
        BEGIN
            ALTER TABLE dbo.Financial_Document ADD Cheque_Date VARCHAR(10) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Financial_Document]') AND name = 'Bank_Name')
        BEGIN
            ALTER TABLE dbo.Financial_Document ADD Bank_Name NVARCHAR(255) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Financial_Document]') AND name = 'Bank_Account_Number')
        BEGIN
            ALTER TABLE dbo.Financial_Document ADD Bank_Account_Number NVARCHAR(100) NULL;
        END

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
        END

        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Capex_Investment]') AND type in (N'U'))
        BEGIN
            CREATE TABLE dbo.Capex_Investment (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Year INT NOT NULL DEFAULT YEAR(GETDATE()),
                Name NVARCHAR(255) NOT NULL,
                Category NVARCHAR(100) NOT NULL,
                Budget_Amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                Engaged_Amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                Realized_Amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                Status NVARCHAR(50) NOT NULL DEFAULT 'Planifié',
                Expected_Delivery_Date DATE NULL,
                Observation NVARCHAR(MAX) NULL,
                Created_At DATETIME2 DEFAULT GETDATE()
            );
        END

        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Capex_SubItem]') AND type in (N'U'))
        BEGIN
            CREATE TABLE dbo.Capex_SubItem (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Capex_ID INT NOT NULL FOREIGN KEY REFERENCES dbo.Capex_Investment(ID) ON DELETE CASCADE,
                Designation NVARCHAR(255) NOT NULL,
                Amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                Qty INT NULL DEFAULT 1,
                Unit_Price DECIMAL(18,2) NULL,
                Purchase_Date DATE NULL,
                Notes NVARCHAR(MAX) NULL
            );
        END

        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Capex_Approach_Cost]') AND type in (N'U'))
        BEGIN
            CREATE TABLE dbo.Capex_Approach_Cost (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Capex_ID INT NOT NULL FOREIGN KEY REFERENCES dbo.Capex_Investment(ID) ON DELETE CASCADE,
                Designation NVARCHAR(255) NOT NULL,
                Amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                Created_At DATETIME2 DEFAULT GETDATE()
            );
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Capex_Investment]') AND name = 'Origin_Type')
        BEGIN
            ALTER TABLE dbo.Capex_Investment ADD Origin_Type NVARCHAR(20) DEFAULT 'Local';
            ALTER TABLE dbo.Capex_Investment ADD Currency NVARCHAR(10) DEFAULT 'DZD';
            ALTER TABLE dbo.Capex_Investment ADD Exchange_Rate DECIMAL(18,4) DEFAULT 1.0000;
            ALTER TABLE dbo.Capex_Investment ADD Base_Currency_Amount DECIMAL(18,2) DEFAULT 0.00;
            ALTER TABLE dbo.Capex_Investment ADD Customs_Duty_Type NVARCHAR(20) DEFAULT 'percentage';
            ALTER TABLE dbo.Capex_Investment ADD Customs_Duty_Value DECIMAL(18,2) DEFAULT 0.00;
            ALTER TABLE dbo.Capex_Investment ADD Freight_Amount DECIMAL(18,2) DEFAULT 0.00;
            ALTER TABLE dbo.Capex_Investment ADD Total_Approach_Cost DECIMAL(18,2) DEFAULT 0.00;
        END

        -- --------------------------------------------------------------------
        -- STOCK & SAP INVENTORY TABLE
        -- --------------------------------------------------------------------
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Stock_Item]') AND type in (N'U'))
        BEGIN
            CREATE TABLE dbo.Stock_Item (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Code_Article NVARCHAR(50) NOT NULL,
                Designation NVARCHAR(255) NOT NULL,
                Division NVARCHAR(20) NOT NULL DEFAULT '8660',
                Magasin NVARCHAR(20) NOT NULL DEFAULT '33',
                Categorie NVARCHAR(20) NOT NULL DEFAULT 'MP' CHECK (Categorie IN ('MP', 'PF', 'PD', 'AUX')),
                Is_Tracked BIT NOT NULL DEFAULT 1,
                Is_Important BIT NOT NULL DEFAULT 0,
                Famille NVARCHAR(100) NULL,
                Type_Article NVARCHAR(20) NOT NULL DEFAULT 'ROH',
                Unite NVARCHAR(20) NOT NULL DEFAULT 'PCE',
                Stock_Actuel DECIMAL(18,3) NOT NULL DEFAULT 0.000,
                Stock_Utilisation_Libre DECIMAL(18,3) NOT NULL DEFAULT 0.000,
                Stock_Controle_Qualite DECIMAL(18,3) NOT NULL DEFAULT 0.000,
                Stock_Non_Libre DECIMAL(18,3) NOT NULL DEFAULT 0.000,
                Stock_Transit DECIMAL(18,3) NOT NULL DEFAULT 0.000,
                Valeur_Non_Libre DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                Stock_Securite DECIMAL(18,3) NOT NULL DEFAULT 100.000,
                Emplacement NVARCHAR(100) NULL DEFAULT 'Magasin 33',
                Prix_Unitaire_Estime DECIMAL(18,2) NULL,
                Fournisseur_Principal NVARCHAR(150) NULL,
                Statut NVARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE' CHECK (Statut IN ('DISPONIBLE', 'BAS', 'CRITIQUE', 'RUPTURE')),
                Created_At DATETIME2 DEFAULT GETDATE(),
                Updated_At DATETIME2 DEFAULT GETDATE()
            );

            CREATE NONCLUSTERED INDEX IX_Stock_Item_Code ON dbo.Stock_Item (Code_Article);
            CREATE NONCLUSTERED INDEX IX_Stock_Item_Category ON dbo.Stock_Item (Categorie, Is_Tracked);
            CREATE NONCLUSTERED INDEX IX_Stock_Item_Magasin ON dbo.Stock_Item (Magasin);
        END

        -- Drop any single-column unique constraint on Code_Article if created previously
        DECLARE @stockUqConstraint NVARCHAR(256);
        SELECT @stockUqConstraint = k.name
        FROM sys.key_constraints k
        INNER JOIN sys.index_columns ic ON k.parent_object_id = ic.object_id AND k.unique_index_id = ic.index_id
        INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE k.parent_object_id = OBJECT_ID('dbo.Stock_Item') AND k.type = 'UQ' AND c.name = 'Code_Article';

        IF @stockUqConstraint IS NOT NULL
        BEGIN
            EXEC('ALTER TABLE dbo.Stock_Item DROP CONSTRAINT ' + @stockUqConstraint);
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Stock_Item]') AND name = 'Valeur_Non_Libre')
        BEGIN
            ALTER TABLE dbo.Stock_Item ADD Valeur_Non_Libre DECIMAL(18,2) NOT NULL DEFAULT 0.00;
        END

        -- --------------------------------------------------------------------
        -- STOCK WATCHLIST (PERMANENT REMEMBERED IMPORTANT ARTICLES)
        -- --------------------------------------------------------------------
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Stock_Watchlist]') AND type in (N'U'))
        BEGIN
            CREATE TABLE dbo.Stock_Watchlist (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Code_Article NVARCHAR(50) NOT NULL,
                Magasin NVARCHAR(20) NULL,
                Is_Important BIT NOT NULL DEFAULT 1,
                Is_Tracked BIT NOT NULL DEFAULT 1,
                Notes NVARCHAR(255) NULL,
                Created_At DATETIME2 DEFAULT GETDATE(),
                Updated_At DATETIME2 DEFAULT GETDATE()
            );

            CREATE NONCLUSTERED INDEX IX_Stock_Watchlist_Code ON dbo.Stock_Watchlist (Code_Article, Magasin);
        END

        -- --------------------------------------------------------------------
        -- PRODUITS FINIS & MRP BOM TABLES
        -- --------------------------------------------------------------------
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Produit_Fini]') AND type in (N'U'))
        BEGIN
            CREATE TABLE dbo.Produit_Fini (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Code_Produit NVARCHAR(50) NOT NULL UNIQUE,
                Nom_Produit NVARCHAR(255) NOT NULL,
                Famille NVARCHAR(100) NOT NULL,
                Programme_Mensuel DECIMAL(18,2) NOT NULL DEFAULT 5000,
                Jours_Ouvres_Mois INT NOT NULL DEFAULT 22,
                Created_At DATETIME2 DEFAULT GETDATE()
            );
        END

        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Produit_Fini_Composant]') AND type in (N'U'))
        BEGIN
            CREATE TABLE dbo.Produit_Fini_Composant (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Produit_Fini_ID INT NOT NULL FOREIGN KEY REFERENCES dbo.Produit_Fini(ID) ON DELETE CASCADE,
                Position INT NOT NULL DEFAULT 1,
                Code_Article NVARCHAR(50) NOT NULL,
                Designation NVARCHAR(255) NOT NULL,
                Quantite_Par_Produit DECIMAL(18,4) NOT NULL DEFAULT 1.0000,
                Unite NVARCHAR(20) NOT NULL DEFAULT 'PCE',
                Remarque NVARCHAR(255) NULL
            );
        END

        -- --------------------------------------------------------------------
        -- PRODUCTION MENSUELLE SAP MCBA TABLE
        -- --------------------------------------------------------------------
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Production_Monthly_MCBA]') AND type in (N'U'))
        BEGIN
            CREATE TABLE dbo.Production_Monthly_MCBA (
                ID INT IDENTITY(1,1) PRIMARY KEY,
                Code_Article NVARCHAR(50) NOT NULL,
                Designation NVARCHAR(255) NOT NULL,
                Famille_Diametre NVARCHAR(50) NOT NULL DEFAULT 'Autres',
                Mois NVARCHAR(20) NOT NULL,
                Annee INT NOT NULL,
                Mois_Num INT NOT NULL,
                Qte_Entree DECIMAL(18,4) NOT NULL DEFAULT 0,
                Qte_Sortie DECIMAL(18,4) NOT NULL DEFAULT 0,
                Qte_Stock DECIMAL(18,4) NOT NULL DEFAULT 0,
                Val_Entree DECIMAL(18,2) NOT NULL DEFAULT 0,
                Val_Sortie DECIMAL(18,2) NOT NULL DEFAULT 0,
                Val_Stock DECIMAL(18,2) NOT NULL DEFAULT 0,
                Unite NVARCHAR(20) NOT NULL DEFAULT 'PCE',
                Magasin NVARCHAR(50) NULL,
                Division NVARCHAR(50) NULL,
                Type_Article NVARCHAR(50) NULL,
                Groupe_Marchandises NVARCHAR(100) NULL,
                Created_At DATETIME2 DEFAULT GETDATE(),
                Updated_At DATETIME2 DEFAULT GETDATE()
            );

            CREATE NONCLUSTERED INDEX IX_ProdMCBA_Article_Mois ON dbo.Production_Monthly_MCBA (Code_Article, Mois);
            CREATE NONCLUSTERED INDEX IX_ProdMCBA_Annee ON dbo.Production_Monthly_MCBA (Annee);
            CREATE NONCLUSTERED INDEX IX_ProdMCBA_Diametre ON dbo.Production_Monthly_MCBA (Famille_Diametre);
        END
      `);
    } catch (migErr) {
      console.error("[MSSQL Migration note]:", migErr);
    }

    return true;
  } catch (err) {
    console.error("[MSSQL] Failed to connect to SQL Server. Falling back to internal JSON persistence.", err);
    isConnected = false;
    pool = null;
    return false;
  }
}
