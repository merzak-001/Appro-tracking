-- ============================================================================
-- SQL SERVER (T-SQL) DATABASE SCHEMA FOR PROCUREMENT ORDER TRACKING SYSTEM
-- Compatible with Microsoft SQL Server 2016 / 2019 / 2022 / Express Edition
-- ============================================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ProcurementDB')
BEGIN
    CREATE DATABASE ProcurementDB;
END
GO

USE ProcurementDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

-- ----------------------------------------------------------------------------
-- CREATE TABLES IF NOT EXISTS (SAFE PRESERVATION OF EXISTING DATA)
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 1. USERS & RBAC TABLE
-- ----------------------------------------------------------------------------
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
END;

-- ----------------------------------------------------------------------------
-- 2. FOURNISSEUR (SUPPLIER) TABLE
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Fournisseur]') AND type in (N'U'))
BEGIN
CREATE TABLE dbo.Fournisseur (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL,
    Address NVARCHAR(255) NULL,
    Country NVARCHAR(100) NOT NULL DEFAULT 'Algeria',
    RC NVARCHAR(100) NULL,
    NIF NVARCHAR(100) NULL,
    Created_At DATETIME2 DEFAULT GETDATE()
);
END;

-- ----------------------------------------------------------------------------
-- 3. COMMANDE LOCALE (LOCAL ORDERS) TABLE
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Local_Order]') AND type in (N'U'))
BEGIN
CREATE TABLE dbo.Local_Order (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    N_Order NVARCHAR(50) NOT NULL UNIQUE,
    Etablir_par NVARCHAR(100) NOT NULL,
    Objet_de_commande NVARCHAR(255) NOT NULL,
    Fournisseur_ID INT NOT NULL,
    Date DATE NOT NULL,
    Observation NVARCHAR(MAX) NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Draft', 'Pending', 'In Progress', 'Active', 'Completed', 'Cancelled')),
    Total_HT DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    Total_TVA DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    Total_TTC DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    Created_At DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Local_Order_Fournisseur FOREIGN KEY (Fournisseur_ID) REFERENCES dbo.Fournisseur(ID) ON DELETE CASCADE
);
END;

-- ----------------------------------------------------------------------------
-- 4. LIGNES DE COMMANDE (LOCAL ORDER LINES) TABLE
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Local_Order_Line]') AND type in (N'U'))
BEGIN
CREATE TABLE dbo.Local_Order_Line (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Order_ID INT NOT NULL,
    Position INT NOT NULL DEFAULT 1,
    Designation NVARCHAR(255) NOT NULL,
    Qty DECIMAL(18, 3) NOT NULL CHECK (Qty >= 0),
    Unite NVARCHAR(50) NOT NULL DEFAULT 'piece',
    Unit_Price DECIMAL(18, 2) NOT NULL CHECK (Unit_Price >= 0),
    TVA_Percentage DECIMAL(5, 2) NOT NULL DEFAULT 19.00,
    Total_HT AS (CAST(Qty * Unit_Price AS DECIMAL(18,2))) PERSISTED,
    Montant_TVA AS (CAST((Qty * Unit_Price) * (TVA_Percentage / 100.0) AS DECIMAL(18,2))) PERSISTED,
    Total_TTC AS (CAST((Qty * Unit_Price) + ((Qty * Unit_Price) * (TVA_Percentage / 100.0)) AS DECIMAL(18,2))) PERSISTED,
    CONSTRAINT FK_Local_Order_Line_Order FOREIGN KEY (Order_ID) REFERENCES dbo.Local_Order(ID) ON DELETE CASCADE
);
END;

-- ----------------------------------------------------------------------------
-- 5. LIVRAISON (LOCAL DELIVERIES) TABLE
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Local_Delivery]') AND type in (N'U'))
BEGIN
CREATE TABLE dbo.Local_Delivery (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Order_ID INT NOT NULL,
    Line_ID INT NOT NULL,
    Delivered_Qty DECIMAL(18, 3) NOT NULL CHECK (Delivered_Qty > 0),
    Delivery_Date DATE NOT NULL,
    Delivery_Note_Number NVARCHAR(100) NOT NULL,
    Created_At DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Local_Delivery_Order FOREIGN KEY (Order_ID) REFERENCES dbo.Local_Order(ID),
    CONSTRAINT FK_Local_Delivery_Line FOREIGN KEY (Line_ID) REFERENCES dbo.Local_Order_Line(ID)
);
END;

-- ----------------------------------------------------------------------------
-- 6. COMMANDE ÉTRANGÈRE (FOREIGN ORDERS) TABLE
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Foreign_Order]') AND type in (N'U'))
BEGIN
CREATE TABLE dbo.Foreign_Order (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Code NVARCHAR(50) NOT NULL UNIQUE,
    Date DATE NOT NULL,
    Proforma_Ref NVARCHAR(100) NOT NULL,
    Proforma_Date DATE NOT NULL,
    Mode_Paiement NVARCHAR(100) NULL,
    Amount DECIMAL(18, 2) NOT NULL,
    Currency NVARCHAR(10) NOT NULL DEFAULT 'EUR' CHECK (Currency IN ('EUR', 'USD', 'GBP', 'CHF', 'CAD', 'CNY', 'DZD')),
    Fournisseur_ID INT NOT NULL,
    Country NVARCHAR(100) NOT NULL,
    Estimated_Time_Delivery DATE NOT NULL,
    Num_Expeditions INT NOT NULL DEFAULT 1,
    Destination_Type NVARCHAR(50) NOT NULL DEFAULT 'Port',
    Status NVARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active', 'In Customs', 'Delivered', 'Cancelled')),
    Created_At DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Foreign_Order_Fournisseur FOREIGN KEY (Fournisseur_ID) REFERENCES dbo.Fournisseur(ID) ON DELETE CASCADE
);
END;

-- ----------------------------------------------------------------------------
-- 7. FOREIGN ORDER LINES TABLE
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Foreign_Order_Line]') AND type in (N'U'))
BEGIN
CREATE TABLE dbo.Foreign_Order_Line (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Foreign_Order_ID INT NOT NULL,
    Position INT NOT NULL DEFAULT 1,
    Designation NVARCHAR(255) NOT NULL,
    Qty DECIMAL(18, 3) NOT NULL,
    Unite NVARCHAR(50) NOT NULL DEFAULT 'piece',
    Unit_Price DECIMAL(18, 2) NOT NULL,
    Total_Price AS (CAST(Qty * Unit_Price AS DECIMAL(18,2))) PERSISTED,
    CONSTRAINT FK_Foreign_Order_Line_Order FOREIGN KEY (Foreign_Order_ID) REFERENCES dbo.Foreign_Order(ID) ON DELETE CASCADE
);
END;

-- ----------------------------------------------------------------------------
-- 8. EXPÉDITION (FOREIGN EXPEDITIONS) TABLE
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Foreign_Expedition]') AND type in (N'U'))
BEGIN
CREATE TABLE dbo.Foreign_Expedition (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Foreign_Order_ID INT NOT NULL,
    Expedition_Code NVARCHAR(50) NOT NULL,
    N_Facture NVARCHAR(100) NOT NULL,
    Date_Facture DATE NOT NULL,
    N_BL_LTA NVARCHAR(100) NOT NULL,
    Montant DECIMAL(18, 2) NOT NULL,
    Incoterm NVARCHAR(20) NOT NULL CHECK (Incoterm IN ('FOB', 'CFR', 'CPT', 'EXW', 'FCA', 'FAS', 'CIF', 'CIP', 'DAP', 'DPU', 'DDP')),
    Port_Aeroport_Destination NVARCHAR(100) NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'In Transit' CHECK (Status IN ('In Transit', 'In Customs', 'Delivered', 'Pending', 'Cancelled')),
    Created_At DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Foreign_Expedition_Order FOREIGN KEY (Foreign_Order_ID) REFERENCES dbo.Foreign_Order(ID) ON DELETE CASCADE
);
END;

-- ----------------------------------------------------------------------------
-- 9. EXPEDITION LINES (MANY-TO-MANY RESOLUTION)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Expedition_Line]') AND type in (N'U'))
BEGIN
CREATE TABLE dbo.Expedition_Line (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Expedition_ID INT NOT NULL,
    Foreign_Line_ID INT NOT NULL,
    Shipped_Qty DECIMAL(18, 3) NOT NULL,
    CONSTRAINT FK_Expedition_Line_Expedition FOREIGN KEY (Expedition_ID) REFERENCES dbo.Foreign_Expedition(ID) ON DELETE CASCADE,
    CONSTRAINT FK_Expedition_Line_ForeignLine FOREIGN KEY (Foreign_Line_ID) REFERENCES dbo.Foreign_Order_Line(ID)
);
END;
GO

-- ============================================================================
-- STORED PROCEDURES FOR AUTO-NUMBERING LOGIC
-- ============================================================================

IF OBJECT_ID('dbo.sp_GenerateLocalOrderNumber', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GenerateLocalOrderNumber;
GO
CREATE PROCEDURE dbo.sp_GenerateLocalOrderNumber
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @YearSuffix NVARCHAR(2) = RIGHT(CAST(YEAR(GETDATE()) AS NVARCHAR(4)), 2);
    DECLARE @MaxNum INT = 149; -- Default starting sequence
    
    SELECT @MaxNum = ISNULL(MAX(CAST(SUBSTRING(N_Order, 4, CHARINDEX('L', N_Order) - 4) AS INT)), 149)
    FROM dbo.Local_Order
    WHERE N_Order LIKE 'S' + @YearSuffix + '-%L';

    DECLARE @NextNum INT = @MaxNum + 1;
    SELECT 'S' + @YearSuffix + '-' + CAST(@NextNum AS NVARCHAR(10)) + 'L' AS NextOrderNumber;
END;
GO

IF OBJECT_ID('dbo.sp_GenerateForeignOrderNumber', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GenerateForeignOrderNumber;
GO
CREATE PROCEDURE dbo.sp_GenerateForeignOrderNumber
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @YearSuffix NVARCHAR(2) = RIGHT(CAST(YEAR(GETDATE()) AS NVARCHAR(4)), 2);
    DECLARE @MaxNum INT = 19; -- Default starting sequence
    
    SELECT @MaxNum = ISNULL(MAX(CAST(SUBSTRING(Code, 4, CHARINDEX('E', Code) - 4) AS INT)), 19)
    FROM dbo.Foreign_Order
    WHERE Code LIKE 'S' + @YearSuffix + '-%E';

    DECLARE @NextNum INT = @MaxNum + 1;
    IF @NextNum > 99
        THROW 50000, 'Foreign order sequence limit (99) reached for current year.', 1;

    DECLARE @FormattedNum NVARCHAR(2) = RIGHT('0' + CAST(@NextNum AS NVARCHAR(2)), 2);
    SELECT 'S' + @YearSuffix + '-' + @FormattedNum + 'E' AS NextForeignCode;
END;
GO

-- ============================================================================
-- INITIAL SEED DATA
-- Default Users: All passwords set to '1010'
-- Roles: Admin, SAI, Visitor
-- ============================================================================

INSERT INTO dbo.Users (Username, Password, Full_Name, Role) VALUES
('salem.ferdjallah', '1010', 'Ferdjallah, Salem', 'Appro'),
('mohamed.brahimi', '1010', 'Brahimi, Mohamed', 'Appro'),
('abdelouahab.hadjadj', '1010', 'Hadjadj, Abdelouahab', 'Appro'),
('merzak.sai', '1010', 'Sai, Merzak', 'Appro'),
('admin', '1010', 'Administrateur System', 'Admin'),
('visitor.test', '1010', 'Visitor Test', 'Visitor');

-- Seed Suppliers
INSERT INTO dbo.Fournisseur (Name, Address, Country, RC, NIF) VALUES
('Maghreb Equipment & Outillage', 'Zone Industrielle Rouiba, Alger', 'Algeria', 'RC-2021-B-004821', '002116098234811'),
('SARL Industrial Solutions', '12 Boulevard des Martyrs, Oran', 'Algeria', 'RC-2019-B-019283', '001931029837192'),
('Siemens Industrial Technologies', 'Werner-von-Siemens-Straße 1, Munich', 'Germany', 'DE-813729182', 'NIF-DE9988112'),
('Schneider Electric SA', '35 Rue Joseph Monier, Rueil-Malmaison', 'France', 'FR-92000-8812', 'NIF-FR8819203');

-- Seed Sample Local Order S26-150L
INSERT INTO dbo.Local_Order (N_Order, Etablir_par, Objet_de_commande, Fournisseur_ID, Date, Observation, Status, Total_HT, Total_TVA, Total_TTC)
VALUES ('S26-150L', 'Karim Benali (SAI)', 'Fourniture de roulements et lubrifiants industriels', 1, '2026-08-01', 'Livraison urgente sur site Rouiba', 'In Progress', 450000.00, 85500.00, 535500.00);

INSERT INTO dbo.Local_Order_Line (Order_ID, Position, Designation, Qty, Unite, Unit_Price, TVA_Percentage) VALUES
(1, 1, 'Roulement à billes SKF 6205-2RSH', 100.000, 'piece', 2500.00, 19.00),
(1, 2, 'Huile Hydraulique ISO VG 46 (Fût 200L)', 5.000, 'drum', 40000.00, 19.00);

-- Seed Sample Foreign Order S26-20E
INSERT INTO dbo.Foreign_Order (Code, Date, Proforma_Ref, Proforma_Date, Amount, Currency, Fournisseur_ID, Country, Estimated_Time_Delivery, Status)
VALUES ('S26-20E', '2026-07-15', 'PRO-DE-2026-88', '2026-07-10', 125000.00, 'EUR', 3, 'Germany', '2026-08-25', 'Active');

INSERT INTO dbo.Foreign_Order_Line (Foreign_Order_ID, Position, Designation, Qty, Unite, Unit_Price) VALUES
(1, 1, 'Siemens PLC S7-1500 CPU 1516-3 PN/DP', 2.000, 'piece', 18500.00),
(1, 2, 'Variateur de vitesse SINAMICS G120 45kW', 4.000, 'piece', 22000.00);

-- Seed Foreign Expedition
INSERT INTO dbo.Foreign_Expedition (Foreign_Order_ID, Expedition_Code, N_Facture, Date_Facture, N_BL_LTA, Montant, Incoterm, Port_Aeroport_Destination)
VALUES (1, 'S26-20E-1ere', 'FAC-2026-00912', '2026-07-28', 'LH-772109283-LTA', 60000.00, 'CIP', 'Aéroport Houari Boumediene, Alger');

-- ----------------------------------------------------------------------------
-- 7. FINANCIAL DOCUMENTS (Demande de Chèque Ordinaire & Règlement de Facture)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Financial_Document]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Financial_Document (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Doc_Type NVARCHAR(50) NOT NULL, -- 'DEMANDE_CHEQUE', 'REGLEMENT_FACTURE', or 'REGULARISATION_CHEQUE'
        Ref_Number NVARCHAR(100) NOT NULL, -- e.g. 0011/SENSUS/DP/2026
        Date VARCHAR(10) NOT NULL, -- YYYY-MM-DD
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
        Status NVARCHAR(50) DEFAULT 'Brouillon',
        Created_At DATETIME DEFAULT GETDATE()
    );
END

-- Ensure columns exist if table already created
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Financial_Document]') AND name = 'Cheque_Number')
BEGIN
    ALTER TABLE dbo.Financial_Document ADD Cheque_Number NVARCHAR(100) NULL;
    ALTER TABLE dbo.Financial_Document ADD Cheque_Date VARCHAR(10) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Financial_Document]') AND name = 'Bank_Name')
BEGIN
    ALTER TABLE dbo.Financial_Document ADD Bank_Name NVARCHAR(255) NULL;
    ALTER TABLE dbo.Financial_Document ADD Bank_Account_Number NVARCHAR(100) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Financial_Document]') AND name = 'Status')
BEGIN
    ALTER TABLE dbo.Financial_Document ADD Status NVARCHAR(50) DEFAULT 'Brouillon';
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

-- ----------------------------------------------------------------------------
-- CAPEX INVESTMENTS TABLE
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- CAPEX SUB-ITEMS TABLE (DESIGNAIONS & DEBOURSED PURCHASES)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- CAPEX APPROACH COSTS TABLE (OTHER FRAIS D'APPROCHE FOR FOREIGN IMPORTS)
-- ----------------------------------------------------------------------------
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

-- Ensure columns exist in Capex_Investment
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

-- ----------------------------------------------------------------------------
-- 10. CONSULTATIONS & DEMANDES DE PRIX (RFQ)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Consultation]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Consultation (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Ref_Consultation NVARCHAR(50) NOT NULL UNIQUE,
        Date_Emission DATE NOT NULL,
        Date_Cloture DATE NOT NULL,
        Objet NVARCHAR(255) NOT NULL,
        Category NVARCHAR(100) NOT NULL,
        Demandeur NVARCHAR(100) NOT NULL,
        Estimation_Budget DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Currency NVARCHAR(10) NOT NULL DEFAULT 'DZD',
        Status NVARCHAR(50) NOT NULL DEFAULT 'En cours',
        Observation NVARCHAR(MAX) NULL,
        Fournisseur_Retenu NVARCHAR(150) NULL,
        Montant_Retenu_HT DECIMAL(18,2) NULL,
        Date_Decision_Attribution DATE NULL,
        Motif_Choix NVARCHAR(MAX) NULL,
        Created_At DATETIME2 DEFAULT GETDATE()
    );
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Consultation_Article]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Consultation_Article (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Consultation_ID INT NOT NULL FOREIGN KEY REFERENCES dbo.Consultation(ID) ON DELETE CASCADE,
        Position INT NOT NULL DEFAULT 1,
        Designation NVARCHAR(255) NOT NULL,
        Qty DECIMAL(18,3) NOT NULL,
        Unite NVARCHAR(50) NOT NULL DEFAULT 'piece',
        Specifications NVARCHAR(MAX) NULL,
        Prix_Estime DECIMAL(18,2) NULL
    );
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Consultation_Participant]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Consultation_Participant (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Consultation_ID INT NOT NULL FOREIGN KEY REFERENCES dbo.Consultation(ID) ON DELETE CASCADE,
        Supplier_ID INT NULL FOREIGN KEY REFERENCES dbo.Fournisseur(ID) ON DELETE SET NULL,
        Supplier_Name NVARCHAR(150) NOT NULL,
        Email NVARCHAR(150) NULL,
        Phone NVARCHAR(50) NULL,
        Date_Envoi_Demande DATE NOT NULL,
        Date_Reponse DATE NULL,
        Montant_Total_HT DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Currency NVARCHAR(10) NOT NULL DEFAULT 'DZD',
        Delai_Livraison_Jours INT NULL,
        Garantie_Mois INT NULL,
        Status_Offre NVARCHAR(50) NOT NULL DEFAULT 'En attente de réponse',
        Is_Winner BIT NOT NULL DEFAULT 0,
        Note_Technique DECIMAL(5,2) NULL,
        Note_Financiere DECIMAL(5,2) NULL,
        Score_Global DECIMAL(5,2) NULL,
        Notes NVARCHAR(MAX) NULL
    );
END

-- ----------------------------------------------------------------------------
-- 11. APPELS D'OFFRES & MARCHES (TENDERS)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Appel_Offre]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Appel_Offre (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        N_AO NVARCHAR(50) NOT NULL UNIQUE,
        Type NVARCHAR(100) NOT NULL DEFAULT 'National Ouvert',
        Objet NVARCHAR(255) NOT NULL,
        Direction_Emettrice NVARCHAR(100) NOT NULL,
        Budget_Previsionnel DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Currency NVARCHAR(10) NOT NULL DEFAULT 'DZD',
        Caution_Soumission DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Date_Publication DATE NOT NULL,
        Journal_Publication NVARCHAR(150) NULL,
        Date_Depot_Plis NVARCHAR(50) NOT NULL,
        Date_Ouverture_Plis NVARCHAR(50) NULL,
        Lieu_Depot NVARCHAR(255) NOT NULL,
        Statut NVARCHAR(50) NOT NULL DEFAULT 'Publication Avis',
        Ref_CPS NVARCHAR(100) NULL,
        Prix_Vente_DZD DECIMAL(18,2) NULL DEFAULT 5000.00,
        Fournisseur_Gagnant NVARCHAR(150) NULL,
        Montant_Attribue DECIMAL(18,2) NULL,
        Date_Attribution_Definitive DATE NULL,
        N_Marche_Contrat NVARCHAR(100) NULL,
        Delai_Realisation_Jours INT NULL,
        Observation NVARCHAR(MAX) NULL,
        Created_At DATETIME2 DEFAULT GETDATE()
    );
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Appel_Offre_Commission]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Appel_Offre_Commission (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        AO_ID INT NOT NULL FOREIGN KEY REFERENCES dbo.Appel_Offre(ID) ON DELETE CASCADE,
        Nom_Prenom NVARCHAR(150) NOT NULL,
        Qualite NVARCHAR(100) NOT NULL,
        Service_Direction NVARCHAR(100) NOT NULL,
        Presence BIT NOT NULL DEFAULT 1
    );
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Appel_Offre_Soumissionnaire]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Appel_Offre_Soumissionnaire (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        AO_ID INT NOT NULL FOREIGN KEY REFERENCES dbo.Appel_Offre(ID) ON DELETE CASCADE,
        Supplier_ID INT NULL FOREIGN KEY REFERENCES dbo.Fournisseur(ID) ON DELETE SET NULL,
        Nom_Soumissionnaire NVARCHAR(150) NOT NULL,
        Date_Retrait_CPS DATE NOT NULL,
        N_Recu_Paiement_CPS NVARCHAR(100) NULL,
        Date_Depot_Pli DATE NULL,
        Recevabilite_Admin NVARCHAR(50) NOT NULL DEFAULT 'En attente',
        Caution_Deposee BIT NOT NULL DEFAULT 0,
        Caution_Montant DECIMAL(18,2) NULL,
        Caution_Banque NVARCHAR(100) NULL,
        Note_Technique DECIMAL(5,2) NULL,
        Montant_Offre_Financiere DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Currency NVARCHAR(10) NOT NULL DEFAULT 'DZD',
        Delai_Propose_Jours INT NULL,
        Statut_Soumission NVARCHAR(50) NOT NULL DEFAULT 'Cahier Retiré',
        Observations NVARCHAR(MAX) NULL
    );
END

-- ----------------------------------------------------------------------------
-- 11. STOCK & SAP INVENTORY (867 SAP ARTICLES USINE SENSUS)
-- ----------------------------------------------------------------------------
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
END;

-- ----------------------------------------------------------------------------
-- 11B. STOCK WATCHLIST (PERMANENT REMEMBERED USER WATCHLIST)
-- ----------------------------------------------------------------------------
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
END;

-- ----------------------------------------------------------------------------
-- 12. PRODUITS FINIS & NOMENCLATURES BOM (MRP SITUATION APPRO)
-- ----------------------------------------------------------------------------
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
END;

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
END;

-- ----------------------------------------------------------------------------
-- 13. SUIVI DE PRODUCTION MENSUEL (SAP MCBA PRODUITS FINIS)
-- ----------------------------------------------------------------------------
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
        Qte_Entree DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
        Qte_Sortie DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
        Qte_Stock DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
        Val_Entree DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
        Val_Sortie DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
        Val_Stock DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
        Unite NVARCHAR(20) NOT NULL DEFAULT 'PCE',
        Magasin NVARCHAR(50) NULL DEFAULT '866034',
        Division NVARCHAR(50) NULL DEFAULT '8660',
        Type_Article NVARCHAR(50) NULL DEFAULT 'FERT',
        Groupe_Marchandises NVARCHAR(100) NULL,
        Created_At DATETIME2 DEFAULT GETDATE(),
        Updated_At DATETIME2 DEFAULT GETDATE()
    );

    CREATE NONCLUSTERED INDEX IX_ProdMCBA_Article_Mois ON dbo.Production_Monthly_MCBA (Code_Article, Mois);
    CREATE NONCLUSTERED INDEX IX_ProdMCBA_Annee ON dbo.Production_Monthly_MCBA (Annee);
    CREATE NONCLUSTERED INDEX IX_ProdMCBA_Diametre ON dbo.Production_Monthly_MCBA (Famille_Diametre);
END;

-- ----------------------------------------------------------------------------
-- 14. PRODUCTION BUDGET MCBA TABLE
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Production_Budget_MCBA]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Production_Budget_MCBA (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Annee INT NOT NULL DEFAULT 2026,
        Famille_Diametre NVARCHAR(100) NOT NULL,
        Budget_Qte DECIMAL(18,2) NOT NULL DEFAULT 0,
        Prix_Unitaire_KDA DECIMAL(18,5) NOT NULL DEFAULT 0,
        Updated_At DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT UQ_Prod_Budget_Annee_Famille UNIQUE (Annee, Famille_Diametre)
    );
END;

-- ----------------------------------------------------------------------------
-- 15. PRODUCTION NOTES MCBA TABLE
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Production_Notes_MCBA]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Production_Notes_MCBA (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Annee INT NOT NULL,
        Mois NVARCHAR(20) NOT NULL,
        Note_Text NVARCHAR(MAX) NULL,
        Updated_At DATETIME2 DEFAULT GETDATE()
    );
END;

PRINT 'SQL Server Database schema, triggers, stored procedures, and initial seed completed successfully.';
