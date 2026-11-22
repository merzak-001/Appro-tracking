import path from "path";
import fs from "fs";
import { 
  User, 
  Supplier, 
  LocalOrder, 
  LocalDelivery, 
  ForeignOrder, 
  ForeignExpedition, 
  CompanyInfo, 
  FinancialDocument, 
  CapexItem, 
  ConsultationItem, 
  AppelOffreItem,
  StockItem,
  ProduitFini,
  SupplierEvaluation
} from "../../src/types";

export interface DataStore {
  users: User[];
  suppliers: Supplier[];
  localOrders: LocalOrder[];
  localDeliveries: LocalDelivery[];
  foreignOrders: ForeignOrder[];
  foreignExpeditions: ForeignExpedition[];
  companyInfo: CompanyInfo;
  financialDocuments: FinancialDocument[];
  capexInvestments?: CapexItem[];
  consultations?: ConsultationItem[];
  appelsOffres?: AppelOffreItem[];
  stockItems?: StockItem[];
  mb51_whitelist?: string[];
  stock_last_sync?: {
    timestamp: string;
    latest_month: string;
    source_mb51?: string;
    source_mcba?: string;
    total_tracked: number;
    ruptures: number;
    critiques: number;
    bas: number;
    disponibles: number;
  };
  produitsFinis?: ProduitFini[];
  supplierEvaluations?: SupplierEvaluation[];
}

export const DATA_FILE = path.join(process.cwd(), ".data_store.json");

export function getDefaultStore(): DataStore {
  const currentYear = new Date().getFullYear();
  const yearSuffix = String(currentYear).slice(-2);

  return {
    companyInfo: {
      name: "Sensus SPA",
      rc: "05B0086023",
      art: "19208603930",
      nif: "000519008602385",
      nis: "00519200158942",
      address: "BP 02 route de Batna el eulma",
      logo_url: "/logo.jpg",
    },
    users: [
      { id: 1, username: "salem.ferdjallah", full_name: "Ferdjallah, Salem", role: "Appro" as any, password: "1010", allowed_pages: ["suivi-production", "capex"], created_at: new Date().toISOString() },
      { id: 2, username: "mohamed.brahimi", full_name: "Brahimi, Mohamed", role: "Appro" as any, password: "1010", allowed_pages: ["suivi-production"], created_at: new Date().toISOString() },
      { id: 3, username: "abdelouahab.hadjadj", full_name: "Hadjadj, Abdelouahab", role: "Appro" as any, password: "1010", created_at: new Date().toISOString() },
      { id: 4, username: "merzak.sai", full_name: "Sai, Merzak", role: "Appro" as any, password: "1010", created_at: new Date().toISOString() },
      { id: 5, username: "admin", full_name: "Administrateur System", role: "Admin" as any, password: "1010", created_at: new Date().toISOString() },
      { id: 6, username: "visitor.test", full_name: "Visitor Test", role: "Visitor" as any, password: "1010", created_at: new Date().toISOString() },
    ],
    suppliers: [
      {
        id: 1,
        name: "Maghreb Equipment & Outillage",
        address: "Zone Industrielle Rouiba, Alger",
        country: "Algeria",
        rc: "RC-2021-B-004821",
        nif: "002116098234811",
        created_at: "2026-01-10T08:00:00.000Z",
      },
      {
        id: 2,
        name: "SARL Industrial Solutions",
        address: "12 Boulevard des Martyrs, Oran",
        country: "Algeria",
        rc: "RC-2019-B-019283",
        nif: "001931029837192",
        created_at: "2026-02-15T09:30:00.000Z",
      },
      {
        id: 3,
        name: "Siemens Industrial Technologies",
        address: "Werner-von-Siemens-Straße 1, Munich",
        country: "Germany",
        rc: "DE-813729182",
        nif: "NIF-DE9988112",
        created_at: "2026-03-01T10:00:00.000Z",
      },
      {
        id: 4,
        name: "Schneider Electric SA",
        address: "35 Rue Joseph Monier, Rueil-Malmaison",
        country: "France",
        rc: "FR-92000-8812",
        nif: "NIF-FR8819203",
        created_at: "2026-03-12T11:15:00.000Z",
      },
    ],
    localOrders: [
      {
        id: 1,
        n_order: `S${yearSuffix}-150L`,
        etablir_par: "Hadjadj, Abdelouahab",
        objet_de_commande: "Fourniture de roulements et lubrifiants industriels",
        fournisseur_id: 1,
        supplier_name: "Maghreb Equipment & Outillage",
        date: `${currentYear}-08-01`,
        observation: "Livraison urgente sur site Rouiba",
        status: "In Progress",
        total_ht: 450000.00,
        total_tva: 85500.00,
        total_ttc: 535500.00,
        created_at: new Date().toISOString(),
        lines: [
          {
            id: 1,
            order_id: 1,
            position: 1,
            designation: "Roulement à billes SKF 6205-2RSH",
            qty: 100,
            unite: "piece",
            unit_price: 2500.00,
            tva_percentage: 19.00,
            total_ht: 250000.00,
            montant_tva: 47500.00,
            total_ttc: 297500.00,
          },
          {
            id: 2,
            order_id: 1,
            position: 2,
            designation: "Huile Hydraulique ISO VG 46 (Fût 200L)",
            qty: 5,
            unite: "drum",
            unit_price: 40000.00,
            tva_percentage: 19.00,
            total_ht: 200000.00,
            montant_tva: 38000.00,
            total_ttc: 238000.00,
          },
        ],
      },
      {
        id: 2,
        n_order: `S${yearSuffix}-151L`,
        etablir_par: "Sai, Merzak",
        objet_de_commande: "Fourniture d'équipements de protection individuelle (EPI)",
        fournisseur_id: 2,
        supplier_name: "SARL Industrial Solutions",
        date: `${currentYear}-08-03`,
        observation: "Contrôle qualité à la réception",
        status: "Pending",
        total_ht: 180000.00,
        total_tva: 34200.00,
        total_ttc: 214200.00,
        created_at: new Date().toISOString(),
        lines: [
          {
            id: 3,
            order_id: 2,
            position: 1,
            designation: "Chaussures de sécurité S3 Taille 42",
            qty: 30,
            unite: "pair" as any,
            unit_price: 4500.00,
            tva_percentage: 19.00,
            total_ht: 135000.00,
            montant_tva: 25650.00,
            total_ttc: 160650.00,
          },
          {
            id: 4,
            order_id: 2,
            position: 2,
            designation: "Gants de manutention haute résistance",
            qty: 100,
            unite: "pair" as any,
            unit_price: 450.00,
            tva_percentage: 19.00,
            total_ht: 45000.00,
            montant_tva: 8550.00,
            total_ttc: 53550.00,
          },
        ],
      },
    ],
    localDeliveries: [
      {
        id: 1,
        order_id: 1,
        n_order: `S${yearSuffix}-150L`,
        line_id: 1,
        designation: "Roulement à billes SKF 6205-2RSH",
        unite: "piece",
        ordered_qty: 100,
        delivered_qty: 60,
        delivery_date: `${currentYear}-08-03`,
        delivery_note_number: "BL-2026-0811",
        created_at: new Date().toISOString(),
      },
    ],
    foreignOrders: [
      {
        id: 1,
        code: `S${yearSuffix}-20E`,
        date: `${currentYear}-07-15`,
        proforma_ref: "PRO-DE-2026-88",
        proforma_date: `${currentYear}-07-10`,
        amount: 125000.00,
        currency: "EUR",
        fournisseur_id: 3,
        supplier_name: "Siemens Industrial Technologies",
        country: "Germany",
        estimated_time_delivery: `${currentYear}-08-25`,
        status: "Active",
        created_at: new Date().toISOString(),
        lines: [
          {
            id: 1,
            foreign_order_id: 1,
            position: 1,
            designation: "Siemens PLC S7-1500 CPU 1516-3 PN/DP",
            qty: 2,
            unite: "piece",
            unit_price: 18500.00,
            total_price: 37000.00,
          },
          {
            id: 2,
            foreign_order_id: 1,
            position: 2,
            designation: "Variateur de vitesse SINAMICS G120 45kW",
            qty: 4,
            unite: "piece",
            unit_price: 22000.00,
            total_price: 88000.00,
          },
        ],
      },
    ],
    foreignExpeditions: [
      {
        id: 1,
        foreign_order_id: 1,
        foreign_code: `S${yearSuffix}-20E`,
        expedition_code: `S${yearSuffix}-20E-1ere`,
        n_facture: "FAC-2026-00912",
        date_facture: `${currentYear}-07-28`,
        n_bl_lta: "LH-772109283-LTA",
        montant: 60000.00,
        incoterm: "CIP",
        port_aeroport_destination: "Aéroport Houari Boumediene, Alger",
        status: "In Transit",
        created_at: new Date().toISOString(),
        shipped_lines: [
          { foreign_line_id: 1, designation: "Siemens PLC S7-1500 CPU 1516-3 PN/DP", shipped_qty: 2 },
          { foreign_line_id: 2, designation: "Variateur de vitesse SINAMICS G120 45kW", shipped_qty: 1 },
        ],
      },
    ],
    financialDocuments: [
      {
        id: 1,
        doc_type: "DEMANDE_CHEQUE",
        ref_number: `0011/SENSUS/DP/${currentYear}`,
        date: `${currentYear}-01-06`,
        location: "EL- EULMA",
        department: "DP",
        signatory_title: "LE DIRECTEUR DE PRODUCTION",
        objet: "Demande de Chèque",
        beneficiary_name: "EURL FLASH GRAPHIC",
        amount: 15232.00,
        amount_in_words: "Quinze mille deux cent trente-deux Dinars Algériens",
        description: `Ce montant est destiné au paiement d'achat d'un cliché graver pour la machine tompographie, conformément à l'objet du bon de commande S${yearSuffix}/006L, Eurl Flash Graphic/Alger.\n\nLa régularisation de cette opération se fera ultérieurement.`,
        order_ref: `S${yearSuffix}/006L`,
        fournisseur_name: "EURL FLASH GRAPHIC",
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        doc_type: "REGLEMENT_FACTURE",
        ref_number: `0045/SENSUS/DP/${currentYear}`,
        date: `${currentYear}-03-26`,
        location: "El Eulma",
        department: "DP",
        signatory_title: "LE DIRECTEUR DE PRODUCTION",
        objet: "Règlement de facture",
        mode_paiement: "virement",
        order_ref: `S${yearSuffix}-099L`,
        fournisseur_name: "SARL DJEMILA OFFICE",
        description: `Nous vous transmettons ci-joint, la facture concernant l'achat de 250 flacons de savons liquides objet de la commande S${yearSuffix}-099L, auprès du fournisseur SARL DJEMILA OFFICE à Sétif.`,
        pj_facture_ordonnancee: true,
        pj_bon_arrivee: `01 Bon d'arrivée N° : 1373 du 18/03/${currentYear}.`,
        pj_commande_copy: `01 Copie de commande N° S${yearSuffix}-099L du 18/03/${currentYear}.`,
        created_at: new Date().toISOString(),
        invoice_lines: [
          {
            id: 1,
            document_id: 2,
            position: 1,
            facture_number: `F0000145/${yearSuffix}`,
            facture_date: `${currentYear}-03-18`,
            fournisseur_name: "SARL DJEMILA OFFICE",
            amount: 35000.88,
          },
        ],
      },
    ],
    capexInvestments: [
      // Equipements de Production (Industriel) - Subtotal 190 700 KDA
      { id: 1, year: 2026, name: "Moule Boitier d'injection", category: "Industriel", budget_amount: 18000000, engaged_amount: 18000000, engagement_pct: 100, realized_amount: 18500000, realization_pct: 102.8, status: "Réalisé", expected_delivery_date: "2026-03-15", observation: "Importation avec frais d'approche", created_at: new Date().toISOString() },
      { id: 2, year: 2026, name: "Moule Pignon XN5", category: "Industriel", budget_amount: 12000000, engaged_amount: 12000000, engagement_pct: 100, realized_amount: 12300000, realization_pct: 102.5, status: "Réalisé", expected_delivery_date: "2026-04-10", observation: "Frais de port maritimes inclus", created_at: new Date().toISOString() },
      { id: 3, year: 2026, name: "Moule Roue d'indexage", category: "Industriel", budget_amount: 12000000, engaged_amount: 12000000, engagement_pct: 100, realized_amount: 12000000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-04-10", observation: "Reçu et conforme", created_at: new Date().toISOString() },
      { id: 4, year: 2026, name: "Moule turbine 274 T1", category: "Industriel", budget_amount: 11000000, engaged_amount: 11000000, engagement_pct: 100, realized_amount: 11400000, realization_pct: 103.6, status: "En Douane", expected_delivery_date: "2026-08-20", observation: "En dédouanement Port d'Alger", created_at: new Date().toISOString() },
      { id: 5, year: 2026, name: "Moule HRI", category: "Industriel", budget_amount: 10000000, engaged_amount: 10000000, engagement_pct: 100, realized_amount: 10000000, realization_pct: 100, status: "Engagé", expected_delivery_date: "2026-09-15", observation: "Commande validée avec fournisseur", created_at: new Date().toISOString() },
      { id: 6, year: 2026, name: "Banc Primates PT25", category: "Industriel", budget_amount: 40000000, engaged_amount: 40000000, engagement_pct: 100, realized_amount: 41200000, realization_pct: 103.0, status: "En Douane", expected_delivery_date: "2026-09-30", observation: "Banc d'essai haute précision", created_at: new Date().toISOString() },
      { id: 7, year: 2026, name: "Banc réglage Qmax reg 25 avec réservoir séparer", category: "Industriel", budget_amount: 5000000, engaged_amount: 5000000, engagement_pct: 100, realized_amount: 5000000, realization_pct: 100, status: "Engagé", expected_delivery_date: "2026-10-15", observation: "En cours d'assemblage usine", created_at: new Date().toISOString() },
      { id: 8, year: 2026, name: "Aspirateur matière plastique", category: "Industriel", budget_amount: 5000000, engaged_amount: 5000000, engagement_pct: 100, realized_amount: 5000000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-05-10", observation: "Installé sur ligne d'injection", created_at: new Date().toISOString() },
      { id: 9, year: 2026, name: "Pompe 400 V 50HZ 5,5 KW 2910 t/m Q(l/min) 100-500 H(m) 65-22 T 30 °C", category: "Industriel", budget_amount: 2000000, engaged_amount: 2000000, engagement_pct: 100, realized_amount: 2000000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-02-18", observation: "Pompe industrielle haute capacité", created_at: new Date().toISOString() },
      { id: 10, year: 2026, name: "Vanne de décharge DN 50 PN16", category: "Industriel", budget_amount: 700000, engaged_amount: 700000, engagement_pct: 100, realized_amount: 700000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-01-25", observation: "Livrée et installée", created_at: new Date().toISOString() },
      { id: 11, year: 2026, name: "Regloplas", category: "Industriel", budget_amount: 9000000, engaged_amount: 9000000, engagement_pct: 100, realized_amount: 9250000, realization_pct: 102.8, status: "En Douane", expected_delivery_date: "2026-09-05", observation: "Thermorégulateur moules", created_at: new Date().toISOString() },
      { id: 12, year: 2026, name: "Mélangeur matière plastique", category: "Industriel", budget_amount: 2000000, engaged_amount: 2000000, engagement_pct: 100, realized_amount: 2000000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-04-05", observation: "Opérationnel atelier d'injection", created_at: new Date().toISOString() },
      { id: 13, year: 2026, name: "Presse pneumatique", category: "Industriel", budget_amount: 4000000, engaged_amount: 4000000, engagement_pct: 100, realized_amount: 4000000, realization_pct: 100, status: "Engagé", expected_delivery_date: "2026-10-01", observation: "Presse de précision", created_at: new Date().toISOString() },
      { id: 14, year: 2026, name: "Chaine d'assemblage et approbation MID pour compteur 420+", category: "Industriel", budget_amount: 60000000, engaged_amount: 60000000, engagement_pct: 100, realized_amount: 0, realization_pct: 0, status: "Engagé", expected_delivery_date: "2026-11-30", observation: "Ligne principale MID 420+", created_at: new Date().toISOString() },

      // Equipements de manutention et de transport (Utilités & Manutention) - Subtotal 11 090 KDA
      { id: 15, year: 2026, name: "Gerber semi électrique 1,5T", category: "Utilités & Manutention", budget_amount: 450000, engaged_amount: 450000, engagement_pct: 100, realized_amount: 450000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-03-20", observation: "Gerbeur dépôt central", created_at: new Date().toISOString() },
      { id: 16, year: 2026, name: "Transpalette", category: "Utilités & Manutention", budget_amount: 140000, engaged_amount: 140000, engagement_pct: 100, realized_amount: 140000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-02-10", observation: "Transpalette manuel 2.5T", created_at: new Date().toISOString() },
      { id: 17, year: 2026, name: "Véhicule utilitaire", category: "Utilités & Manutention", budget_amount: 10000000, engaged_amount: 10000000, engagement_pct: 100, realized_amount: 10000000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-06-15", observation: "Fourgon de service et livraison", created_at: new Date().toISOString() },
      { id: 18, year: 2026, name: "Machine de cerclage", category: "Utilités & Manutention", budget_amount: 500000, engaged_amount: 500000, engagement_pct: 100, realized_amount: 500000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-04-18", observation: "Cerclage automatique palettes", created_at: new Date().toISOString() },

      // Equipements et systèmes informatiques (Matériel Informatique) - Subtotal 4 400 KDA
      { 
        id: 19, 
        year: 2026, 
        name: "Pc portable", 
        category: "Matériel Informatique", 
        budget_amount: 900000, 
        engaged_amount: 680000, 
        engagement_pct: 100, 
        realized_amount: 680000, 
        realization_pct: 100, 
        status: "Réalisé", 
        expected_delivery_date: "2026-02-28", 
        observation: "Laptops professionnels & imprimante en sous-achat", 
        created_at: new Date().toISOString(),
        sub_items: [
          { id: "sub-2", capex_id: 19, designation: "Imprimante Laser Couleur Multifonction", amount: 220000, qty: 1, unit_price: 220000, date: "2026-02-28", notes: "Acquis sur solde budget restant PC" }
        ]
      },
      { id: 20, year: 2026, name: "Système de télé-surveillance", category: "Matériel Informatique", budget_amount: 3000000, engaged_amount: 3000000, engagement_pct: 100, realized_amount: 3000000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-05-30", observation: "Caméras IP & NVR Usine", created_at: new Date().toISOString() },
      { id: 21, year: 2026, name: "Appareil photos", category: "Matériel Informatique", budget_amount: 180000, engaged_amount: 180000, engagement_pct: 100, realized_amount: 180000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-01-15", observation: "Contrôle qualité & documentation", created_at: new Date().toISOString() },
      { id: 22, year: 2026, name: "Écran 24 pouces", category: "Matériel Informatique", budget_amount: 100000, engaged_amount: 100000, engagement_pct: 100, realized_amount: 100000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-02-05", observation: "Écrans Full HD bureaux", created_at: new Date().toISOString() },
      { id: 23, year: 2026, name: "Impriment Multi fonction (photocopie/scanner/impression)", category: "Matériel Informatique", budget_amount: 220000, engaged_amount: 220000, engagement_pct: 100, realized_amount: 220000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-03-12", observation: "Imprimante réseau multifonction", created_at: new Date().toISOString() },

      // Mobilier de bureau (Mobilier) - Subtotal 1 800 KDA
      { id: 24, year: 2026, name: "Armoire vestiaires", category: "Mobilier", budget_amount: 1800000, engaged_amount: 1800000, engagement_pct: 100, realized_amount: 1800000, realization_pct: 100, status: "Réalisé", expected_delivery_date: "2026-04-01", observation: "Vestiaires métalliques personnel", created_at: new Date().toISOString() },
    ],
    consultations: [
      {
        id: 1,
        ref_consultation: "CONS-26-001",
        date_emission: "2026-01-15",
        demandeur: "Direction Approvisionnements",
        objet: "Fourniture d'outillage spécialisé et pinces pour atelier injection",
        category_seuil: "ACHAT_DIRECT",
        estimation_budget: 180000,
        fournisseurs_consultes: "Maghreb Equipment, Outillage Pro",
        fournisseur_retenu: "Maghreb Equipment & Outillage",
        montant_retenu: 165000,
        status: "Attribué",
        observation: "Attribution directe au moins-disant",
        created_at: "2026-01-15T09:00:00.000Z"
      },
      {
        id: 2,
        ref_consultation: "CONS-26-002",
        date_emission: "2026-02-02",
        demandeur: "Service Maintenance",
        objet: "Révision et fourniture de filtres hydrauliques pour compresseur",
        category_seuil: "LETTRE_COMMANDE",
        estimation_budget: 850000,
        fournisseurs_consultes: "SARL Industrial Solutions, Hydraulique Plus, ElecSud",
        fournisseur_retenu: "SARL Industrial Solutions",
        montant_retenu: 780000,
        status: "Attribué",
        observation: "3 devis reçus et analysés",
        created_at: "2026-02-02T10:00:00.000Z"
      },
      {
        id: 3,
        ref_consultation: "CONS-26-003",
        date_emission: "2026-03-01",
        demandeur: "Direction Production",
        objet: "Fourniture de 20 tonnes de résine plastique polymère",
        category_seuil: "COMMANDE",
        estimation_budget: 4500000,
        fournisseurs_consultes: "Plastique Algérie, Global Polymer SARL, EuroPlast",
        status: "En cours",
        observation: "Dépouillement des offres en cours",
        created_at: "2026-03-01T08:30:00.000Z"
      }
    ],
    appelsOffres: [
      {
        id: 1,
        n_ao: "AO-NAT-26/01",
        type: "National Ouvert",
        date_publication: "2026-01-20",
        date_depot_plis: "2026-02-25",
        direction_emettrice: "Direction Générale",
        objet: "Acquisition et installation d'un système de télé-surveillance et contrôle d'accès usine",
        budget_previsionnel: 15000000,
        caution_soumission: 150000,
        fournisseur_gagnant: "SARL Security Tech Algérie",
        montant_attribue: 13800000,
        n_marche_contrat: "CONTRAT-MARCHE-26-01",
        statut: "Attribué",
        observation: "Avis publié au BOMOP et quotidiens nationaux",
        created_at: "2026-01-20T08:00:00.000Z"
      },
      {
        id: 2,
        n_ao: "AO-INT-26/02",
        type: "International Ouvert",
        date_publication: "2026-02-15",
        date_depot_plis: "2026-04-15",
        direction_emettrice: "Direction Technique",
        objet: "Acquisition d'une ligne automatisée d'assemblage et de test pour compteurs",
        budget_previsionnel: 45000000,
        caution_soumission: 450000,
        statut: "En cours",
        observation: "Période de retrait du cahier des charges",
        created_at: "2026-02-15T09:00:00.000Z"
      }
    ],
    stockItems: [
      {
        id: 1,
        code_article: "ART-PL-001",
        designation: "Corps Supérieur Plastique G4",
        famille: "Composants Plastiques",
        unite: "piece",
        stock_actuel: 14500,
        stock_securite: 3000,
        emplacement: "Magasin Central - Allée A1",
        prix_unitaire_estime: 420,
        fournisseur_principal: "Plastik Industry Algérie",
        statut: "DISPONIBLE",
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        code_article: "ART-PL-002",
        designation: "Corps Inférieur Plastique G4",
        famille: "Composants Plastiques",
        unite: "piece",
        stock_actuel: 12200,
        stock_securite: 3000,
        emplacement: "Magasin Central - Allée A2",
        prix_unitaire_estime: 380,
        fournisseur_principal: "Plastik Industry Algérie",
        statut: "DISPONIBLE",
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        code_article: "ART-RC-003",
        designation: "Raccord Laiton Fileté 3/4\" DN20",
        famille: "Raccords & Robinetterie",
        unite: "piece",
        stock_actuel: 18000,
        stock_securite: 5000,
        emplacement: "Magasin Métaux - Allée B1",
        prix_unitaire_estime: 150,
        fournisseur_principal: "Fonderie & Usinage Moderne",
        statut: "BAS",
        updated_at: new Date().toISOString()
      },
      {
        id: 4,
        code_article: "ART-VS-004",
        designation: "Vis Inox M5x20 Autotaraudeuse",
        famille: "Visserie & Fixation",
        unite: "piece",
        stock_actuel: 24000,
        stock_securite: 10000,
        emplacement: "Magasin Quincaillerie - Rayon C3",
        prix_unitaire_estime: 15,
        fournisseur_principal: "Maghreb Fixation SARL",
        statut: "CRITIQUE",
        updated_at: new Date().toISOString()
      },
      {
        id: 5,
        code_article: "ART-JT-005",
        designation: "Joint Torique EPDM 45mm",
        famille: "Joints & Étanchéité",
        unite: "piece",
        stock_actuel: 32000,
        stock_securite: 4000,
        emplacement: "Magasin Caoutchouc - Rayon D1",
        prix_unitaire_estime: 45,
        fournisseur_principal: "Algerian Seal Systems",
        statut: "DISPONIBLE",
        updated_at: new Date().toISOString()
      },
      {
        id: 6,
        code_article: "ART-TT-006",
        designation: "Totalisateur Volumétrique 8 Rouleaux",
        famille: "Mécanique de Précision",
        unite: "piece",
        stock_actuel: 8500,
        stock_securite: 2000,
        emplacement: "Zone Stérile Assemblage - Rayon E1",
        prix_unitaire_estime: 950,
        fournisseur_principal: "Precision Metering Tech",
        statut: "BAS",
        updated_at: new Date().toISOString()
      },
      {
        id: 7,
        code_article: "ART-MB-007",
        designation: "Membrane Synthétique Élastomère",
        famille: "Membranes & Organes Mobiles",
        unite: "piece",
        stock_actuel: 9800,
        stock_securite: 2500,
        emplacement: "Magasin Caoutchouc - Rayon D2",
        prix_unitaire_estime: 280,
        fournisseur_principal: "Diaphragm Global Corp",
        statut: "DISPONIBLE",
        updated_at: new Date().toISOString()
      },
      {
        id: 8,
        code_article: "ART-EM-008",
        designation: "Carton d'Emballage Individuel G4",
        famille: "Packaging & Conditionnement",
        unite: "piece",
        stock_actuel: 16000,
        stock_securite: 3000,
        emplacement: "Hangar Emballages H1",
        prix_unitaire_estime: 65,
        fournisseur_principal: "Cartonnerie de l'Est",
        statut: "DISPONIBLE",
        updated_at: new Date().toISOString()
      },
      {
        id: 9,
        code_article: "ART-FD-009",
        designation: "Boîtier Fonderie Aluminium DN15",
        famille: "Fonderie Métallique",
        unite: "piece",
        stock_actuel: 4800,
        stock_securite: 1500,
        emplacement: "Magasin Métaux - Allée B2",
        prix_unitaire_estime: 1200,
        fournisseur_principal: "Fonderie & Usinage Moderne",
        statut: "BAS",
        updated_at: new Date().toISOString()
      },
      {
        id: 10,
        code_article: "ART-TB-010",
        designation: "Turbine Plastique Précision DN15",
        famille: "Composants Plastiques",
        unite: "piece",
        stock_actuel: 14200,
        stock_securite: 2000,
        emplacement: "Magasin Central - Allée A3",
        prix_unitaire_estime: 210,
        fournisseur_principal: "Plastik Industry Algérie",
        statut: "DISPONIBLE",
        updated_at: new Date().toISOString()
      }
    ],
    produitsFinis: [
      {
        id: 1,
        code_produit: "PF-GAZ-G4",
        nom_produit: "Compteur Gaz Volumétrique G4",
        famille: "Compteurs Gaz",
        programme_mensuel: 10000,
        jours_ouvres_mois: 22,
        composants: [
          { id: "c1", code_article: "ART-PL-001", designation: "Corps Supérieur Plastique G4", quantite_par_produit: 1, unite: "piece" },
          { id: "c2", code_article: "ART-PL-002", designation: "Corps Inférieur Plastique G4", quantite_par_produit: 1, unite: "piece" },
          { id: "c3", code_article: "ART-RC-003", designation: "Raccord Laiton Fileté 3/4\" DN20", quantite_par_produit: 2, unite: "piece" },
          { id: "c4", code_article: "ART-VS-004", designation: "Vis Inox M5x20 Autotaraudeuse", quantite_par_produit: 4, unite: "piece" },
          { id: "c5", code_article: "ART-JT-005", designation: "Joint Torique EPDM 45mm", quantite_par_produit: 2, unite: "piece" },
          { id: "c6", code_article: "ART-TT-006", designation: "Totalisateur Volumétrique 8 Rouleaux", quantite_par_produit: 1, unite: "piece" },
          { id: "c7", code_article: "ART-MB-007", designation: "Membrane Synthétique Élastomère", quantite_par_produit: 1, unite: "piece" },
          { id: "c8", code_article: "ART-EM-008", designation: "Carton d'Emballage Individuel G4", quantite_par_produit: 1, unite: "piece" }
        ],
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        code_produit: "PF-EAU-DN15",
        nom_produit: "Compteur Eau Divisionnaire DN15",
        famille: "Compteurs Eau",
        programme_mensuel: 5000,
        jours_ouvres_mois: 22,
        composants: [
          { id: "e1", code_article: "ART-FD-009", designation: "Boîtier Fonderie Aluminium DN15", quantite_par_produit: 1, unite: "piece" },
          { id: "e2", code_article: "ART-TB-010", designation: "Turbine Plastique Précision DN15", quantite_par_produit: 1, unite: "piece" },
          { id: "e3", code_article: "ART-RC-003", designation: "Raccord Laiton Fileté 3/4\" DN20", quantite_par_produit: 2, unite: "piece" },
          { id: "e4", code_article: "ART-VS-004", designation: "Vis Inox M5x20 Autotaraudeuse", quantite_par_produit: 4, unite: "piece" },
          { id: "e5", code_article: "ART-JT-005", designation: "Joint Torique EPDM 45mm", quantite_par_produit: 2, unite: "piece" },
          { id: "e6", code_article: "ART-TT-006", designation: "Totalisateur Volumétrique 8 Rouleaux", quantite_par_produit: 1, unite: "piece" },
          { id: "e7", code_article: "ART-EM-008", designation: "Carton d'Emballage Individuel G4", quantite_par_produit: 1, unite: "piece" }
        ],
        created_at: new Date().toISOString()
      }
    ]
  };
}

let store: DataStore = loadStore();

export function getStore(): DataStore {
  return store;
}

export function setStore(newStore: DataStore): void {
  store = newStore;
}

export function loadStore(): DataStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed: DataStore = JSON.parse(data);
      let needsSave = false;

      if (!parsed.capexInvestments || parsed.capexInvestments.length === 0) {
        parsed.capexInvestments = getDefaultStore().capexInvestments;
        needsSave = true;
      }
      if (!parsed.consultations) {
        parsed.consultations = getDefaultStore().consultations;
        needsSave = true;
      }
      if (!parsed.appelsOffres) {
        parsed.appelsOffres = getDefaultStore().appelsOffres;
        needsSave = true;
      }
      if (!parsed.stockItems || parsed.stockItems.length === 0) {
        parsed.stockItems = getDefaultStore().stockItems;
        needsSave = true;
      }
      if (!parsed.produitsFinis || parsed.produitsFinis.length === 0) {
        parsed.produitsFinis = getDefaultStore().produitsFinis;
        needsSave = true;
      }

      if (needsSave) {
        saveStore(parsed);
      }
      return parsed;
    }
  } catch (e) {
    console.error("Error loading data file:", e);
  }
  const defaultData = getDefaultStore();
  saveStore(defaultData);
  return defaultData;
}

export function saveStore(data: DataStore = store) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving data file:", e);
  }
}
