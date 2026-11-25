export type UserRole = 'Admin' | 'Appro' | 'Chef Service' | 'Visitor';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  password?: string;
  allowed_pages?: string[];
  created_at?: string;
}

export interface Supplier {
  id: number;
  name: string;
  address: string;
  country: string;
  rc: string;
  nif: string;
  created_at?: string;
}

export type UnitType = 'kg' | 'liter' | 'piece' | 'box' | 'meter' | 'roll' | 'pack' | 'set' | 'ton' | 'drum' | 'unit';

export interface LocalOrderLine {
  id?: number;
  order_id?: number;
  position: number;
  designation: string;
  is_multiline?: boolean;
  qty: number;
  unite: UnitType;
  unit_price: number;
  tva_percentage: number;
  total_ht: number; // Computed: qty * unit_price
  montant_tva: number; // Computed: total_ht * tva_percentage / 100
  total_ttc: number; // Computed: total_ht + montant_tva
}

export type LocalOrderStatus = 'Draft' | 'Pending' | 'In Progress' | 'Active' | 'Commandée' | 'En cours' | 'Livraison Partielle' | 'En cours de livraison' | 'Completed' | 'Cancelled';

export interface SupplierEvaluation {
  id?: number;
  supplier_id: number;
  order_id?: number;
  order_code?: string;
  evaluator_name: string;
  evaluation_date: string;
  profile_type?: 'standard' | 'fournitures' | 'prestations' | 'equipements' | string;
  qualite_score: number;
  delais_score: number;
  prix_score: number;
  conformite_score: number;
  sav_score: number;
  support_score: number;
  communication_score: number;
  reclamations_score: number;
  total_score: number;
  classification: 'A' | 'B' | 'C' | 'D' | 'E';
  commentaires?: string;
  created_at?: string;
}

export type ProcedureType = 'Achat Direct' | 'Lettre de commande' | 'Commande' | 'Marché';

export interface LocalOrder {
  id: number;
  n_order: string; // Format: S[YY]-[NUM]L, e.g., S26-150L
  etablir_par: string;
  objet_de_commande: string;
  fournisseur_id: number;
  supplier_name?: string;
  date: string;
  observation: string;
  status: LocalOrderStatus;
  created_by_name?: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  created_at?: string;
  lines: LocalOrderLine[];
  delai_livraison_jours?: number;
  procedure_type?: ProcedureType | string; // 'Achat Direct' | 'Lettre de commande' | 'Commande' | 'Marché'
  // Link to Consultation or Appel d'Offres
  procurement_source_type?: 'consultation' | 'appel_offre' | 'none';
  consultation_id?: number;
  consultation_ref?: string;
  appel_offre_id?: number;
  appel_offre_ref?: string;
}

export interface LocalDelivery {
  id?: number;
  order_id: number;
  local_order_id?: number;
  n_order?: string;
  line_id: number;
  designation?: string;
  unite?: string;
  ordered_qty?: number;
  delivered_qty: number;
  unit_price?: number;
  original_unit_price?: number;
  total_ht?: number;
  delivery_date: string;
  delivery_note_number: string; // N° Bon de Livraison
  movement_code?: '103' | '104' | string;
  material_doc_number?: string;
  sap_order_number?: string;
  item_code?: string;
  supplier_name?: string;
  created_at?: string;
}

export interface SAPOrderMapping {
  id?: number;
  sap_order_number: string;
  local_order_id: number;
  local_order_number: string;
  created_at?: string;
}

export interface ForeignOrderLine {
  id?: number;
  foreign_order_id?: number;
  position: number;
  designation: string;
  qty: number;
  unite: UnitType;
  unit_price: number;
  total_price: number;
}

export type CurrencyType = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CAD' | 'CNY' | 'DA' | 'DZD';

export type IncotermType = 
  | 'EXW' 
  | 'FCA' 
  | 'FAS' 
  | 'FOB' 
  | 'CFR' 
  | 'CIF' 
  | 'CIP' 
  | 'CPT' 
  | 'DAP' 
  | 'DPU' 
  | 'DDP'
  | string;

export interface CompanyInfo {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  rc?: string;
  nif?: string;
  nis?: string;
  ai?: string;
  art?: string;
  rib?: string;
  banque?: string;
  logo_url?: string;
}

export interface ExpeditionLine {
  id?: number;
  expedition_id?: number;
  foreign_line_id: number;
  designation?: string;
  shipped_qty: number;
}

export interface ForeignOrder {
  id: number;
  code: string; // Format: S[YY]-[NUM]E, e.g. S26-20E (01-99)
  date: string;
  proforma_ref: string;
  proforma_date: string;
  mode_paiement?: string;
  amount: number;
  currency: CurrencyType;
  fournisseur_id: number;
  supplier_name?: string;
  country: string;
  estimated_time_delivery: string;
  status: 'Active' | 'In Customs' | 'Delivered' | 'Cancelled';
  created_at?: string;
  lines: ForeignOrderLine[];
  num_expeditions?: number;
  destination_type?: string;
  // Link to Consultation or Appel d'Offres
  procurement_source_type?: 'consultation' | 'appel_offre' | 'none';
  consultation_id?: number;
  consultation_ref?: string;
  appel_offre_id?: number;
  appel_offre_ref?: string;
}

export interface ShippedLineItem {
  id?: number;
  expedition_id?: number;
  foreign_line_id: number;
  designation?: string;
  shipped_qty: number;
  unit_price?: number;
}

export type ExpeditionStatus = 
  | 'In Transit' 
  | 'In Customs' 
  | 'Customs Cleared' 
  | 'Received at Warehouse'
  | string;

export interface ForeignExpedition {
  id: number;
  foreign_order_id: number;
  foreign_code?: string;
  expedition_code: string; // e.g. S26-01E-1ere, S26-01E-2eme
  n_facture: string;
  date_facture: string;
  n_bl_lta: string;
  montant: number;
  incoterm: IncotermType;
  port_aeroport_destination: string;
  status: 'In Transit' | 'In Customs' | 'Customs Cleared' | 'Received at Warehouse' | string;
  created_at?: string;
  shipped_lines?: ShippedLineItem[];
}

export interface DashboardKPIs {
  totalLocalOrders?: number;
  activeLocalOrders?: number;
  totalLocalAmountDZD?: number;
  totalForeignOrders?: number;
  activeForeignOrders?: number;
  totalForeignAmountEUR?: number;
  totalForeignAmountUSD?: number;
  pendingDeliveriesCount?: number;
  activeExpeditionsCount?: number;
  local?: any;
  foreign?: any;
  deliveries?: any;
  expeditions?: any;
  [key: string]: any;
}

export type FinancialDocType = 
  | 'DEMANDE_CHEQUE'
  | 'ORDRE_VIREMENT'
  | 'LETTRE_ACCORD_BANQUE'
  | 'LETTRE_ENGAGEMENT_BC'
  | 'DEMANDE_CHEQUE_CERTIFIE'
  | 'DEMANDE_VIREMENT'
  | 'REGLEMENT_FACTURE'
  | 'REGULARISATION_CHEQUE'
  | 'REGULARISATION_CHEQUE_CERTIFIE'
  | string;

export interface FinancialDocInvoiceLine {
  id?: string | number;
  document_id?: number | string;
  position: number;
  facture_number: string;
  facture_date: string;
  fournisseur_name: string;
  amount: number;
}

export interface FinancialDocArticleLine {
  id?: string | number;
  position: number;
  designation: string;
  unite: string;
  qty: number;
  unit_price: number;
  total_price: number;
}

export interface FinancialDocument {
  id: number;
  doc_type: FinancialDocType;
  ref_number: string;
  date: string;
  location: string;
  department: string;
  signatory_title: string;
  objet: string;
  fournisseur_id?: number;
  fournisseur_name?: string;
  supplier_name?: string;
  beneficiaire?: string;
  beneficiary_name?: string;
  montant?: number;
  amount?: number;
  montant_en_lettres?: string;
  amount_in_words?: string;
  description?: string;
  order_ref?: string;
  mode_paiement?: string;
  banque_nom?: string;
  bank_name?: string;
  compte_source?: string;
  compte_beneficiaire_rib?: string;
  bank_account_number?: string;
  pj_facture_ordonnancee?: boolean | string;
  pj_bon_arrivee?: boolean | string;
  pj_commande_copy?: boolean | string;
  status?: string;
  n_demande_cheque?: string;
  facture_proforma_ref?: string;
  facture_proforma_date?: string;
  cheque_number?: string;
  cheque_date?: string;
  local_order_id?: number;
  n_order?: string;
  date_order?: string;
  articles?: FinancialDocArticleLine[];
  invoice_lines?: FinancialDocInvoiceLine[];
  observation?: string;
  created_at?: string;
}

export type ForeignDocType = 
  | 'ENGAGEMENT_IMPORTATION'
  | 'DEMANDE_TRANSFERT_LC'
  | 'ORDRE_VIREMENT_DEVISE'
  | 'APUREMENT_IMPORTATION'
  | 'DEMANDE_CHEQUE_ETRANGER'
  | 'DEMANDE_CHEQUE_CERTIFIE_ETRANGER'
  | 'REGULARISATION_CHEQUE_ETRANGER'
  | 'REGULARISATION_CHEQUE_CERTIFIE_ETRANGER'
  | string;

export type ForeignFinancialDocType = ForeignDocType;

export interface ForeignDocAttachmentLine {
  id?: string | number;
  position: number;
  designation?: string;
  label?: string;
  n_doc?: string;
  doc_number?: string;
  date_doc?: string;
  doc_date?: string;
  montant?: number;
  amount?: number;
  currency?: string;
}

export interface ForeignFinancialDocument {
  id: number;
  doc_type: ForeignDocType;
  ref_number: string;
  date: string;
  foreign_order_id?: number;
  foreign_code?: string;
  foreign_expedition_id?: number;
  expedition_code?: string;
  fournisseur_id?: number;
  fournisseur_name?: string;
  supplier_name?: string;
  beneficiary_name?: string;
  beneficiaire?: string;
  amount?: number;
  country?: string;
  banque_domiciliation?: string;
  n_domiciliation?: string;
  date_domiciliation?: string;
  n_facture?: string;
  date_facture?: string;
  montant_devise?: number;
  currency?: string;
  incoterm?: string;
  mode_paiement?: string;
  objet?: string;
  location?: string;
  order_ref?: string;
  compte_bancaire_debit?: string;
  compte_beneficiaire_iban?: string;
  banque_beneficiaire?: string;
  swift_bic?: string;
  cheque_number?: string;
  cheque_date?: string;
  details_description?: string;
  attachments?: ForeignDocAttachmentLine[];
  signatory_title?: string;
  created_at?: string;
}

export type CapexCategory = 
  | 'Industriel'
  | 'Matériel Informatique'
  | 'Mobilier'
  | 'Utilités & Manutention';

export type CapexStatus = 
  | 'Planifié'
  | 'Engagé'
  | 'En Douane'
  | 'Réalisé'
  | 'Annulé';

export interface CapexSubItem {
  id?: string | number;
  capex_id?: number;
  designation: string;
  amount: number; // Engaged Amount in DA / DZD
  realized_amount?: number; // Realized Amount in DA / DZD (defaults to amount, editable)
  qty?: number;
  unit_price?: number;
  date?: string;
  notes?: string;
  is_realized?: boolean;
  origin_type?: 'Local' | 'Étranger';
  currency?: 'EUR' | 'USD' | 'DA' | 'DZD';
  exchange_rate?: number;
  base_currency_amount?: number;
}

export interface CapexApproachCost {
  id?: string | number;
  capex_id?: number;
  designation: string;
  amount: number;
}

export interface CapexItem {
  id: number;
  year: number;
  name: string;
  category: CapexCategory;
  budget_amount: number;
  engaged_amount: number;
  engagement_pct?: number;
  realized_amount: number;
  realization_pct?: number;
  status: CapexStatus;
  is_realized_confirmed?: boolean;
  expected_delivery_date?: string;
  observation?: string;
  created_at?: string;
  sub_items?: CapexSubItem[];
  origin_type?: 'Local' | 'Étranger';
  currency?: 'EUR' | 'USD' | 'DA' | 'DZD';
  exchange_rate?: number;
  base_currency_amount?: number;
  customs_duty_type?: 'percentage' | 'fixed';
  customs_duty_value?: number;
  freight_amount?: number;
  other_approach_costs?: CapexApproachCost[];
  total_approach_cost?: number;
}

/* =========================================================================
   CONSULTATIONS & DEMANDES DE PRIX (RFQ) TYPES
   ========================================================================= */

export type ConsultationStatus = 
  | 'Brouillon'
  | 'En cours'
  | 'Offres reçues'
  | 'En évaluation'
  | 'Offre Retenue'
  | 'Clôturée'
  | 'Annulée';

export interface ConsultationArticle {
  id: string | number;
  consultation_id?: number | string;
  position: number;
  designation: string;
  qty: number;
  unite: UnitType;
  specifications?: string;
  prix_estime?: number;
}

export type ParticipantOfferStatus = 
  | 'En attente de réponse'
  | 'Offre Reçue'
  | 'Offre Retenue'
  | 'Rejetée (Prix)'
  | 'Rejetée (Technique)'
  | 'Non Répondu';

export interface ConsultationArticleQuote {
  article_id: string | number;
  designation?: string;
  unit_price: number;
  total_price: number;
  tva_pct?: number;
  marque_modele?: string;
  conformite?: boolean;
}

export interface ConsultationParticipant {
  id: string | number;
  consultation_id?: number | string;
  supplier_id?: number;
  supplier_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  date_envoi_demande: string;
  date_reponse?: string;
  montant_total_ht: number;
  montant_total_ttc?: number;
  currency: CurrencyType;
  delai_livraison_jours?: number;
  garantie_mois?: number;
  modalite_paiement?: string;
  status_offre: ParticipantOfferStatus;
  is_winner?: boolean;
  note_technique?: number; // sur 100
  note_financiere?: number; // sur 100
  score_global?: number; // sur 100
  notes?: string;
  article_quotes?: ConsultationArticleQuote[];
}

export interface ConsultationItem {
  id: number;
  ref_consultation: string; // Format: CONS-[YY]-[NUM], e.g., CONS-26-0042
  date_emission: string;
  delai_jours?: number;
  date_cloture?: string;
  objet: string;
  category?: string;
  category_seuil?: 'ACHAT_DIRECT' | 'LETTRE_COMMANDE' | 'COMMANDE' | 'MARCHE';
  demandeur: string;
  estimation_budget?: number;
  currency?: CurrencyType;
  fournisseurs_consultes?: string;
  fournisseur_retenu?: string;
  montant_retenu?: number;
  status: ConsultationStatus | string;
  observation?: string;
  created_at?: string;
  articles?: ConsultationArticle[];
  participants?: ConsultationParticipant[];
  decision_attribution?: {
    date_decision?: string;
    fournisseur_retenu?: string;
    montant_retenu_ht?: number;
    motif_choix?: string;
    decision_par?: string;
  };
}

/* =========================================================================
   APPELS D'OFFRES & MARCHÉS (TENDERS) TYPES
   ========================================================================= */

export type AppelOffreType = 
  | 'National Ouvert'
  | 'National Restreint'
  | 'International Ouvert'
  | 'International Restreint'
  | 'Gré à Gré Après Consultation';

export type AppelOffreStatus = 
  | 'Brouillon'
  | 'En cours'
  | 'Évaluation COP'
  | 'Attribué'
  | 'Contrat Signé'
  | 'Infructueux'
  | 'Annulé'
  | string;

export type SoumissionnaireStatus = 
  | 'Cahier Retiré'
  | 'Pli Déposé'
  | 'Éliminé (Administratif)'
  | 'Éliminé (Technique)'
  | 'Qualifié Financier'
  | 'Attributaire Provisoire'
  | 'Attributaire Définitif'
  | 'Non Retenu';

export interface AppelOffreSoumissionnaire {
  id: string | number;
  ao_id?: number | string;
  supplier_id?: number;
  nom_soumissionnaire: string;
  contact_person?: string;
  telephone?: string;
  email?: string;
  date_retrait_cps: string;
  n_recu_paiement_cps?: string;
  date_depot_pli?: string;
  heure_depot_pli?: string;
  recevabilite_admin: 'Conforme' | 'Non Conforme' | 'En attente';
  caution_deposee: boolean;
  caution_montant?: number;
  caution_banque?: string;
  note_technique?: number; // note /100
  seuil_technique_atteint?: boolean;
  montant_offre_financiere: number;
  currency: CurrencyType;
  delai_propose_jours?: number;
  note_financiere?: number; // note /100
  score_global?: number; // note /100
  rang?: number; // 1, 2, 3...
  statut_soumission: SoumissionnaireStatus;
  observations?: string;
}

export interface CommissionMember {
  nom_prenom: string;
  qualite: 'Président' | 'Membre Rapporteur' | 'Membre Technique' | 'Membre Financier' | 'Observateur';
  service_direction: string;
  presence?: boolean;
}

export interface AppelOffreArticle {
  id?: string | number;
  ao_id?: number | string;
  lot_number?: number | string;
  position: number;
  designation: string;
  qty: number;
  unite: UnitType | string;
  specifications?: string;
  prix_estime?: number;
}

export interface AppelOffreItem {
  id: number;
  n_ao: string; // Format: AO-[NAT/INT]-[YY]/[NUM]
  type: AppelOffreType | string;
  objet: string;
  direction_emettrice: string;
  budget_previsionnel: number;
  currency?: CurrencyType;
  caution_soumission?: number;
  date_publication: string;
  delai_jours?: number;
  journal_publication?: string;
  date_depot_plis: string;
  date_ouverture_plis?: string;
  lieu_depot?: string;
  statut: AppelOffreStatus | string;
  fournisseur_gagnant?: string;
  montant_attribue?: number;
  n_marche_contrat?: string;
  observation?: string;
  created_at?: string;
  articles?: AppelOffreArticle[];
  cahier_charges?: {
    ref_cps?: string;
    prix_vente_dzd?: number;
    delai_clarification_jours?: number;
  };
  commission_cop?: {
    membres: CommissionMember[];
    date_seance_cop?: string;
    pv_ref?: string;
  };
  soumissionnaires?: AppelOffreSoumissionnaire[];
  attribution?: {
    date_attribution_provisoire?: string;
    date_attribution_definitive?: string;
    fournisseur_gagnant?: string;
    montant_attribue?: number;
    delai_realisation_jours?: number;
    delai_recours_jours?: number;
    n_marche_contrat?: string;
  };
}

/* =========================================================================
   STOCK & SITUATION APPRO / MRP TYPES
   ========================================================================= */

export type StockStatusType = 'DISPONIBLE' | 'BAS' | 'CRITIQUE' | 'RUPTURE';

export type StockCategory = 'MP' | 'PF' | 'AUX' | 'PD';

export interface StockItem {
  id: string | number;
  code_article: string; // Article (Code SAP)
  designation: string; // Désignation article
  division?: string; // Division (8660)
  magasin?: string; // Magasin (31, 33, 34, 35)
  unite: UnitType | string; // Unité de qté base (PCE, KG, M...)
  stock_actuel: number; // A utilisation libre
  stock_utilisation_libre?: number; // A utilisation libre
  stock_controle_qualite?: number; // En contrôle qualité
  stock_non_libre?: number; // Stock non libre
  stock_transit?: number; // Stock en transit
  valeur_non_libre?: number; // Valeur non libre
  type_article?: string; // Type d'article (ROH, HALB, FERT, HIBE, ZFER, VERP, HAWA, ZHAL)
  
  // Dashboard & Planning fields
  categorie?: StockCategory | string; // MP, PF, AUX, PD
  is_tracked?: boolean; // Actif sur le tableau de bord
  is_important?: boolean; // Article prioritaire ⭐
  famille?: string;
  // Thresholds & Inventory Planning
  point_rupture?: number; // Point de rupture critique (seuil d'urgence)
  stock_securite?: number; // Stock de sécurité (tampon aléas)
  point_reorder?: number; // Point de commande (ROP = Consommation Délai + SS)
  lead_time_months?: number; // Délai d'approvisionnement estimé (en mois)

  emplacement?: string;
  prix_unitaire_estime?: number;
  fournisseur_principal?: string;
  dernier_arrivage?: string;
  statut?: StockStatusType;
  
  // MB51 movement analysis & MCBA monthly stock sync
  latest_month?: string;
  avg_monthly_sortie?: number;
  coverage_months?: number;
  alert_reason?: string;
  health_status?: 'RUPTURE' | 'CRITIQUE' | 'BAS' | 'DISPONIBLE' | 'SURSTOCK';
  mb51_frequency?: number;
  mb51_total_entrees?: number;
  mb51_total_sorties?: number;
  mb51_net_flow?: number;
  mb51_trend?: 'ENTREE_PLUS' | 'SORTIE_PLUS' | 'EQUILIBRE';
  is_purchased?: boolean; // Articles achetés externes (Mvt 103 / 105)
  mb51_movement_codes?: string[];
  mb51_purchased_count?: number;
  history_records?: { mois: string; stock: number; sortie: number; entree: number }[];
  
  created_at?: string;
  updated_at?: string;
}

export interface BomComponent {
  id: string;
  code_article: string;
  designation: string;
  quantite_par_produit: number; // Ratio par unité de produit fini (ex: 1, 2, 4...)
  unite: UnitType | string;
  remarque?: string;
}

export interface ProduitFini {
  id: string | number;
  code_produit: string;
  nom_produit: string; // Ex: "Compteur Gaz G4", "Compteur Eau DN15"
  famille?: string;
  programme_mensuel: number; // Ex: 10 000 unités / mois
  jours_ouvres_mois?: number; // Ex: 22 jours ouvrés
  composants: BomComponent[];
  created_at?: string;
  updated_at?: string;
}

export interface SituationApproRow {
  code_article: string;
  designation: string;
  famille?: string;
  unite: string;
  stock_actuel: number;
  ratio_par_produit: number;
  besoin_mensuel_total: number;
  besoin_journalier: number;
  autonomie_jours: number;
  date_rupture_estimee: string;
  statut_couverture: 'COUVERT' | 'VIGILANCE' | 'CRITIQUE' | 'RUPTURE_IMMINENTE';
  solde_apres_programme: number;
  quantite_a_commander_1mois: number;
  quantite_a_commander_2mois: number;
  quantite_a_commander_3mois: number;
}

export interface ProductionMonthlyRecord {
  id?: string | number;
  code_article: string;
  designation: string;
  famille_diametre: string; // Ex: 'DN 15', 'DN 20', 'DN 30', 'DN 40', 'DN 50', 'DN 65', 'DN 80', 'DN 100', 'DN 125', 'DN 150', 'DN 200', 'Autres'
  mois: string; // Ex: '01.2026', '08.2026'
  annee: number; // Ex: 2026
  mois_num: number; // 1 to 12
  qte_entree: number; // Production (QtéEnt.SV)
  qte_sortie: number; // Ventes / Sorties (Sortie)
  qte_stock: number; // Stock fin de mois
  val_entree: number; // Valeur entrée DZD
  val_sortie: number; // Valeur sortie DZD
  val_stock: number; // Valeur stock DZD
  unite?: string; // 'PCE'
  magasin?: string; // '866034'
  division?: string; // '8660'
  type_article?: string; // 'FERT'
  groupe_marchandises?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductionMonthlyDataPoint {
  mois: string;
  annee: number;
  mois_num: number;
  qte_entree: number;
  qte_sortie: number;
  qte_stock: number;
  val_entree: number; // DZD
  val_sortie: number; // DZD
  val_stock: number; // DZD
}

export interface ProductionArticleAggregation {
  code_article: string;
  designation: string;
  famille_diametre: string;
  unite: string;
  monthsData: Record<string, ProductionMonthlyDataPoint>; // Key: "08.2026"
  // Stock Initial (Report N-1) - Empty if no data for previous year
  stock_initial_qte?: number | null;
  stock_initial_val?: number | null;
  has_previous_year_data: boolean;
  total_disponible_qte?: number | null;
  total_disponible_val?: number | null;
  // Cumuls Year-to-Date (exercice en cours)
  cumul_qte_entree: number;
  cumul_val_entree: number; // DZD
  cumul_qte_sortie: number;
  cumul_val_sortie: number; // DZD
  dernier_stock_qte: number;
  dernier_stock_val: number; // DZD
  dernier_mois: string;
}

export interface ProductionDiameterGroup {
  famille_diametre: string; // Ex: 'DN 15'
  modelCount: number;
  articles: ProductionArticleAggregation[];
  monthsData: Record<string, ProductionMonthlyDataPoint>; // Sum of all models for each month
  // Stock Initial (Report N-1) - Empty if no data for previous year
  stock_initial_qte?: number | null;
  stock_initial_val?: number | null;
  has_previous_year_data: boolean;
  total_disponible_qte?: number | null;
  total_disponible_val?: number | null;
  // Cumuls Year-to-Date (exercice en cours)
  cumul_qte_entree: number;
  cumul_val_entree: number; // DZD
  cumul_qte_sortie: number;
  cumul_val_sortie: number; // DZD
  dernier_stock_qte: number;
  dernier_stock_val: number; // DZD
  dernier_mois: string;
}

export interface ProductionBudgetItem {
  id?: number | string;
  annee: number;
  famille_diametre: string;
  budget_qte: number; // Annual budget in units (Pièces)
  prix_unitaire_kda: number; // Standard unit price in kDA (PU)
  prevision_cloture_qte?: number; // Forecasted year-end closing quantity
  updated_at?: string;
}

export interface ProductionMonthlyNote {
  id?: number | string;
  annee: number;
  mois: string; // e.g. '07.2026'
  note: string; // Operational commentary / explanations
  updated_at?: string;
}

export interface ProductionComparativeMetrics {
  month_val_N: number;
  month_val_N1: number;
  month_diff: number;
  month_growth_pct: number;
  cumul_val_N: number;
  cumul_val_N1: number;
  cumul_diff: number;
  cumul_growth_pct: number;
}

export interface ProductionComparativeArticle {
  code_article: string;
  designation: string;
  famille_diametre: string;
  unite: string;
  qte: ProductionComparativeMetrics;
  val: ProductionComparativeMetrics; // DZD
  stock_qte_N: number;
  stock_val_N: number;
}

export interface ProductionComparativeGroup {
  famille_diametre: string;
  modelCount: number;
  articles: ProductionComparativeArticle[];
  qte: ProductionComparativeMetrics;
  val: ProductionComparativeMetrics; // DZD
  stock_qte_N: number;
  stock_val_N: number;
}

export interface ProductionComparativeSummary {
  yearN: number;
  yearN1: number;
  cutoffMonthNum: number;
  cutoffMonthStr: string;
  groups: ProductionComparativeGroup[];
  totals: {
    qte: ProductionComparativeMetrics;
    val: ProductionComparativeMetrics;
    stock_qte_N: number;
    stock_val_N: number;
  };
  distinctYears: number[];
}
