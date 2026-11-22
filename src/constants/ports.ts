import { IncotermType } from '../types';

export const ALGERIAN_PORTS = [
  "Port d'Alger",
  "Port de Skikda",
  "Port d'Annaba",
  "Port de Djen Djen (Jijel)",
  "Port de Béjaïa",
  "Port d'Oran",
  "Port d'Arzew",
  "Port de Mostaganem",
  "Port de Ghazaouet",
  "Port de Tenes",
];

export const ALGERIAN_AIRPORTS = [
  "Aéroport Houari Boumediene (Alger)",
  "Aéroport Ahmed Ben Bella (Oran)",
  "Aéroport Mohamed Boudiaf (Constantine)",
  "Aéroport Rabah Bitat (Annaba)",
  "Aéroport Abane Ramdane (Béjaïa)",
  "Aéroport Ferhat Abbas (Jijel)",
  "Aéroport Zenata (Tlemcen)",
  "Aéroport Hassi Messaoud",
  "Aéroport Chlef",
  "Aéroport Biskra",
];

export const ALL_INCOTERMS: { code: IncotermType; label: string }[] = [
  { code: 'FOB', label: 'FOB - Free On Board (Franco à bord)' },
  { code: 'CFR', label: 'CFR - Cost and Freight (Coût et fret)' },
  { code: 'CPT', label: 'CPT - Carriage Paid To (Port payé jusqu\'à)' },
  { code: 'EXW', label: 'EXW - Ex Works (Départ usine)' },
  { code: 'FCA', label: 'FCA - Free Carrier (Franco transporteur)' },
  { code: 'FAS', label: 'FAS - Free Alongside Ship (Franco le long du navire)' },
  { code: 'CIF', label: 'CIF - Cost, Insurance and Freight (Coût, assurance et fret)' },
  { code: 'CIP', label: 'CIP - Carriage and Insurance Paid (Port payé, assurance comprise)' },
  { code: 'DAP', label: 'DAP - Delivered At Place (Rendu au lieu de destination)' },
  { code: 'DPU', label: 'DPU - Delivered at Place Unloaded (Rendu au lieu de destination déchargé)' },
  { code: 'DDP', label: 'DDP - Delivered Duty Paid (Rendu droits acquittés)' },
];
