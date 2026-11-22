/**
 * SENSUS SPA - Guide des 4 Catégories Réglementaires d'Achats & Marchés
 * 1. 0 à 200 000 DA : Achat
 * 2. 200 000 à 1 000 000 DA : Lettre de Commande
 * 3. 1 000 000 à 12 000 000 DA : Commande
 * 4. 12 000 000 DA et plus : Marché
 */

export type ThresholdCategory = 'ACHAT_DIRECT' | 'LETTRE_COMMANDE' | 'COMMANDE' | 'MARCHE';

export interface ProcurementThresholdInfo {
  category: ThresholdCategory;
  title: string;
  shortTitle: string;
  rangeLabel: string;
  minAmount: number;
  maxAmount: number | null;
  defaultAmount: number;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accentColor: string;
  iconName: string;
  description: string;
  workflowSteps: string[];
  mandatoryDocs: string[];
  recommendedModule: 'local-orders' | 'consultations' | 'appels-offre';
  isTenderRequired: boolean;
}

export const PROCUREMENT_THRESHOLDS: Record<ThresholdCategory, ProcurementThresholdInfo> = {
  ACHAT_DIRECT: {
    category: 'ACHAT_DIRECT',
    title: 'Achat',
    shortTitle: 'Achat',
    rangeLabel: '0 à 200 000 DA',
    minAmount: 0,
    maxAmount: 200000,
    defaultAmount: 150000,
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    accentColor: '#64748b',
    iconName: 'Receipt',
    description: 'Achat direct sur simple facture proforma, bon de caisse ou achat magasin.',
    workflowSteps: ['Expression du besoin', 'Validation hiérarchique', 'Achat / Facture'],
    mandatoryDocs: ['Facture proforma ou quittance', 'Bon de réception magasin'],
    recommendedModule: 'local-orders',
    isTenderRequired: false,
  },
  LETTRE_COMMANDE: {
    category: 'LETTRE_COMMANDE',
    title: 'Lettre de Commande',
    shortTitle: 'Lettre de Commande',
    rangeLabel: '200 000 à 1 000 000 DA',
    minAmount: 200000,
    maxAmount: 1000000,
    defaultAmount: 500000,
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-900',
    badgeBorder: 'border-sky-300',
    accentColor: '#0284c7',
    iconName: 'FileText',
    description: 'Consultation restreinte obligatoire avec recueil de minimum 3 devis comparatifs.',
    workflowSteps: ['Cahier des charges allégé', 'Demande à 3 fournisseurs min.', 'Comparatif des prix', 'Émission Lettre de Commande'],
    mandatoryDocs: ['3 Devis fournisseurs', 'Fiche comparative des prix', 'Lettre de Commande signée'],
    recommendedModule: 'consultations',
    isTenderRequired: false,
  },
  COMMANDE: {
    category: 'COMMANDE',
    title: 'Commande',
    shortTitle: 'Commande',
    rangeLabel: '1 000 000 à 12 000 000 DA',
    minAmount: 1000000,
    maxAmount: 12000000,
    defaultAmount: 3500000,
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-950',
    badgeBorder: 'border-indigo-300',
    accentColor: '#4f46e5',
    iconName: 'Layers',
    description: 'Procédure de consultation RFQ avec commission interne, tableau comparatif et PV de choix.',
    workflowSteps: ['Dossier technique & spécifications', 'Consultation RFQ multi-fournisseurs', 'Ouverture des cotations', 'PV de choix au moins-disant', 'Commande Sensus'],
    mandatoryDocs: ['Dossier RFQ', 'Offres techniques & financières', 'Tableau comparatif & scoring', 'PV de choix signé'],
    recommendedModule: 'consultations',
    isTenderRequired: false,
  },
  MARCHE: {
    category: 'MARCHE',
    title: 'Marché',
    shortTitle: 'Marché',
    rangeLabel: '12 000 000 DA et plus',
    minAmount: 12000000,
    maxAmount: null,
    defaultAmount: 25000000,
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-950',
    badgeBorder: 'border-purple-300',
    accentColor: '#7e22ce',
    iconName: 'Gavel',
    description: 'Procédure formelle de Marché / Appel d\'Offres avec publication légale (BOMOP/Presse), Cahier des charges CPS, Commission COP, caution bancaire et contrat de marché notifié.',
    workflowSteps: ['Élaboration CPS & validation', 'Publication avis de marché', 'Retrait cahiers & dépôts plis', 'Séance COP & dépouillement', 'Jugement & Attribution', 'Signature Contrat Marché'],
    mandatoryDocs: ['Cahier des Prescriptions Spéciales (CPS)', 'Avis de publication', 'Registre des plis & cautions', 'PV de séance COP', 'Contrat de Marché'],
    recommendedModule: 'appels-offre',
    isTenderRequired: true,
  },
};

export const PROCUREMENT_THRESHOLD_LIST: ProcurementThresholdInfo[] = [
  PROCUREMENT_THRESHOLDS.ACHAT_DIRECT,
  PROCUREMENT_THRESHOLDS.LETTRE_COMMANDE,
  PROCUREMENT_THRESHOLDS.COMMANDE,
  PROCUREMENT_THRESHOLDS.MARCHE,
];

/**
 * Récupère les infos d'une catégorie donnée
 */
export function getProcurementThresholdByCategory(category?: ThresholdCategory | string): ProcurementThresholdInfo {
  if (!category) return PROCUREMENT_THRESHOLDS.COMMANDE;
  if (category in PROCUREMENT_THRESHOLDS) {
    return PROCUREMENT_THRESHOLDS[category as ThresholdCategory];
  }
  return PROCUREMENT_THRESHOLDS.COMMANDE;
}

/**
 * Détermine la catégorie réglementaire à partir d'un montant (en DZD)
 */
export function getProcurementThreshold(amountDzd: number): ProcurementThresholdInfo {
  const cleanAmount = Number(amountDzd) || 0;

  if (cleanAmount >= 12000000) {
    return PROCUREMENT_THRESHOLDS.MARCHE;
  }
  if (cleanAmount >= 1000000) {
    return PROCUREMENT_THRESHOLDS.COMMANDE;
  }
  if (cleanAmount >= 200000) {
    return PROCUREMENT_THRESHOLDS.LETTRE_COMMANDE;
  }
  return PROCUREMENT_THRESHOLDS.ACHAT_DIRECT;
}

/**
 * Formate un montant en DA / DZD lisible
 */
export function formatProcurementAmount(amount: number, currency = 'DZD'): string {
  if (!amount || isNaN(amount)) return `0 ${currency}`;
  return `${amount.toLocaleString('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
}

