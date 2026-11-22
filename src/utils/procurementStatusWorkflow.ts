export interface StatusMeta {
  key: string;
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
  isClosed?: boolean;
  isNegative?: boolean;
}

/* =========================================================================
   APPELS D'OFFRES - STATUTS SIMPLES & INTUITIFS
   ========================================================================= */

export const APPEL_OFFRE_STATUS_LIST: StatusMeta[] = [
  {
    key: "Brouillon",
    label: "Brouillon (CDC en préparation)",
    shortLabel: "Brouillon",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    badgeBorder: "border-slate-300",
    description: "Cahier des charges en cours de préparation.",
  },
  {
    key: "En cours",
    label: "En cours (Réception des offres)",
    shortLabel: "En cours",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-800",
    badgeBorder: "border-blue-300",
    description: "Appel d'offres publié, réception des offres en cours.",
  },
  {
    key: "Évaluation COP",
    label: "Évaluation COP (Dépouillement des plis)",
    shortLabel: "Évaluation COP",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-900",
    badgeBorder: "border-amber-300",
    description: "Ouverture des plis et évaluation des offres par la commission.",
  },
  {
    key: "Attribué",
    label: "Attribué (Fournisseur retenu)",
    shortLabel: "Attribué",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-300",
    description: "Marché attribué au soumissionnaire retenu.",
  },
  {
    key: "Contrat Signé",
    label: "Contrat Signé (Marché notifié)",
    shortLabel: "Contrat Signé",
    badgeBg: "bg-green-100",
    badgeText: "text-green-950",
    badgeBorder: "border-green-500",
    description: "Contrat signé par les deux parties et en vigueur.",
    isClosed: true,
  },
  {
    key: "Infructueux",
    label: "Infructueux",
    shortLabel: "Infructueux",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-950",
    badgeBorder: "border-orange-300",
    description: "Procédure déclarée infructueuse.",
    isClosed: true,
    isNegative: true,
  },
  {
    key: "Annulé",
    label: "Annulé",
    shortLabel: "Annulé",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-950",
    badgeBorder: "border-rose-300",
    description: "Procédure d'appel d'offres annulée.",
    isClosed: true,
    isNegative: true,
  },
];

/* =========================================================================
   CONSULTATIONS (RFQ) - STATUTS SIMPLES & INTUITIFS
   ========================================================================= */

export const CONSULTATION_STATUS_LIST: StatusMeta[] = [
  {
    key: "En cours",
    label: "En cours (En attente des offres)",
    shortLabel: "En cours",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-800",
    badgeBorder: "border-blue-300",
    description: "Demandes envoyées, en attente des cotations.",
  },
  {
    key: "Évaluation",
    label: "Évaluation (Analyse des devis)",
    shortLabel: "Évaluation",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-900",
    badgeBorder: "border-amber-300",
    description: "Devis reçus, examen et comparaison des offres.",
  },
  {
    key: "Attribué",
    label: "Attribué (Fournisseur retenu)",
    shortLabel: "Attribué",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-950",
    badgeBorder: "border-emerald-400",
    description: "Fournisseur retenu et bon de commande / marché établi.",
    isClosed: true,
  },
  {
    key: "Infructueuse",
    label: "Infructueuse / Sans suite",
    shortLabel: "Infructueuse",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-950",
    badgeBorder: "border-orange-300",
    description: "Aucune offre convenable ou besoin annulé.",
    isClosed: true,
    isNegative: true,
  },
  {
    key: "Annulée",
    label: "Annulée",
    shortLabel: "Annulée",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-950",
    badgeBorder: "border-rose-300",
    description: "Consultation annulée.",
    isClosed: true,
    isNegative: true,
  },
];

/* =========================================================================
   HELPERS & SUIVI DES DÉLAIS
   ========================================================================= */

export function getAppelOffreStatusMeta(statusStr: string): StatusMeta {
  const normalized = (statusStr || "").toLowerCase().trim();
  const match = APPEL_OFFRE_STATUS_LIST.find(
    (s) => s.key.toLowerCase() === normalized || s.label.toLowerCase() === normalized
  );
  if (match) return match;

  if (normalized.includes("brouillon") || normalized.includes("cdc")) {
    return APPEL_OFFRE_STATUS_LIST[0];
  }
  if (normalized.includes("eval") || normalized.includes("cop") || normalized.includes("plis")) {
    return APPEL_OFFRE_STATUS_LIST[2];
  }
  if (normalized.includes("sign") || normalized.includes("contrat")) {
    return APPEL_OFFRE_STATUS_LIST[4];
  }
  if (normalized.includes("attrib")) {
    return APPEL_OFFRE_STATUS_LIST[3];
  }
  if (normalized.includes("infruct")) {
    return APPEL_OFFRE_STATUS_LIST[5];
  }
  if (normalized.includes("annul")) {
    return APPEL_OFFRE_STATUS_LIST[6];
  }

  return APPEL_OFFRE_STATUS_LIST[1]; // default 'En cours'
}

export function getConsultationStatusMeta(statusStr: string): StatusMeta {
  const normalized = (statusStr || "").toLowerCase().trim();
  const match = CONSULTATION_STATUS_LIST.find(
    (s) => s.key.toLowerCase() === normalized || s.label.toLowerCase() === normalized
  );
  if (match) return match;

  if (normalized.includes("eval") || normalized.includes("analys")) {
    return CONSULTATION_STATUS_LIST[1];
  }
  if (normalized.includes("attrib") || normalized.includes("retenu") || normalized.includes("clôtur")) {
    return CONSULTATION_STATUS_LIST[2];
  }
  if (normalized.includes("infruct")) {
    return CONSULTATION_STATUS_LIST[3];
  }
  if (normalized.includes("annul")) {
    return CONSULTATION_STATUS_LIST[4];
  }

  return CONSULTATION_STATUS_LIST[0]; // default 'En cours'
}

export interface DeadlineTracking {
  startDate: string;
  deadlineDate: string;
  totalDays: number;
  daysRemaining: number;
  daysElapsed: number;
  progressPct: number;
  isExpired: boolean;
  isUrgent: boolean;
  statusText: string;
  badgeColorClass: string;
}

export function calculateDeadlineInfo(
  startDateStr?: string,
  durationDays?: number,
  deadlineDateStr?: string
): DeadlineTracking {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let start = startDateStr ? new Date(startDateStr) : new Date();
  start.setHours(0, 0, 0, 0);

  let deadline: Date;
  let totalDays = durationDays || 0;

  if (deadlineDateStr) {
    deadline = new Date(deadlineDateStr);
    deadline.setHours(0, 0, 0, 0);
    if (!totalDays || totalDays <= 0) {
      const diffTime = deadline.getTime() - start.getTime();
      totalDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    }
  } else if (durationDays && durationDays > 0) {
    deadline = new Date(start);
    deadline.setDate(deadline.getDate() + durationDays);
  } else {
    totalDays = 30;
    deadline = new Date(start);
    deadline.setDate(deadline.getDate() + 30);
  }

  const diffToDeadlineMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffToDeadlineMs / (1000 * 60 * 60 * 24));

  const diffFromStartMs = now.getTime() - start.getTime();
  const daysElapsed = Math.max(0, Math.floor(diffFromStartMs / (1000 * 60 * 60 * 24)));

  const progressPct = totalDays > 0 ? Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100))) : 0;

  const isExpired = daysRemaining < 0;
  const isUrgent = daysRemaining >= 0 && daysRemaining <= 5;

  let statusText = "";
  let badgeColorClass = "";

  if (isExpired) {
    const absDays = Math.abs(daysRemaining);
    statusText = `Échu (+${absDays} j)`;
    badgeColorClass = "bg-rose-50 text-rose-800 border-rose-200";
  } else if (daysRemaining === 0) {
    statusText = "Expire Aujourd'hui";
    badgeColorClass = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
  } else if (isUrgent) {
    statusText = `J-${daysRemaining} (${daysRemaining} j restants)`;
    badgeColorClass = "bg-amber-50 text-amber-800 border-amber-200 font-bold";
  } else {
    statusText = `J-${daysRemaining} (${daysRemaining} j)`;
    badgeColorClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
  }

  return {
    startDate: start.toISOString().split("T")[0],
    deadlineDate: deadline.toISOString().split("T")[0],
    totalDays,
    daysRemaining,
    daysElapsed,
    progressPct,
    isExpired,
    isUrgent,
    statusText,
    badgeColorClass,
  };
}
