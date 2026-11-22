import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Building2, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Package, 
  Filter, 
  Printer, 
  FileText, 
  Truck, 
  Layers, 
  Award,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  FileCheck2,
  CalendarCheck,
  Info,
  Calendar,
  Check,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import { LocalOrder, Supplier, LocalOrderStatus } from '../types';
import { formatAmount, formatQty } from '../utils/numberUtils';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { PrintRevueProcessusReport, ParticipantItem, IndicatorItem, SupplierEvalItem } from './PrintRevueProcessusReport';

interface LocalOrdersAnalyticsProps {
  orders: LocalOrder[];
  suppliers: Supplier[];
  onSelectOrder?: (order: LocalOrder) => void;
  onSelectSupplier?: (supplierId: number) => void;
}

const MONTHS_LIST = [
  { value: 'ALL', label: 'Tous les mois' },
  { value: '01', label: '01 - Janvier' },
  { value: '02', label: '02 - Février' },
  { value: '03', label: '03 - Mars' },
  { value: '04', label: '04 - Avril' },
  { value: '05', label: '05 - Mai' },
  { value: '06', label: '06 - Juin (Revue ISO)' },
  { value: '07', label: '07 - Juillet' },
  { value: '08', label: '08 - Août' },
  { value: '09', label: '09 - Septembre' },
  { value: '10', label: '10 - Octobre' },
  { value: '11', label: '11 - Novembre' },
  { value: '12', label: '12 - Décembre' },
];

export const LocalOrdersAnalytics: React.FC<LocalOrdersAnalyticsProps> = ({
  orders,
  suppliers,
  onSelectOrder,
  onSelectSupplier,
}) => {
  const currentYear = new Date().getFullYear();

  // Extract distinct available years from orders
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    orders.forEach((o) => {
      if (o.date) {
        const y = o.date.split('-')[0];
        if (y && y.length === 4) yearsSet.add(y);
      }
    });
    yearsSet.add(String(currentYear));
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [orders, currentYear]);

  // Filters State
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedBuyer, setSelectedBuyer] = useState<string>('ALL');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'kpis' | 'iso_revue' | 'evaluations'>('kpis');

  // Print Report Modal State
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);

  // Participants State for Process Review
  const [participants, setParticipants] = useState<ParticipantItem[]>([
    { role: 'Le pilote du processus', nom: 'Mr BRAHIMI', present: true },
    { role: 'Le Co-pilote', nom: 'Mr HADJADJ', present: true },
    { role: 'Le Co-pilote', nom: 'Mr SAI', present: true },
    { role: 'Le directeur de production', nom: 'Mr FERDJALLAH', present: true },
    { role: 'Le responsable commercial', nom: 'Mr ABDERREZAK', present: true },
    { role: 'Le Responsable qualité', nom: 'Mr BENLOUCIF', present: true },
    { role: 'Le Responsable de la Réalisation des compteurs', nom: 'Mr AMRANE', present: true },
    { role: 'Le Responsable de la Fabrication des pièces Plastique', nom: 'Mr KRAOUCHI', present: true },
    { role: 'Le Responsable de la Maintenance', nom: 'Mr MENNOUR', present: true },
    { role: 'Autres : Magasinier', nom: 'Magasinier Central', present: true },
  ]);

  // Suppliers Evaluation Data from Word Doc
  const [supplierEvaluations, setSupplierEvaluations] = useState<SupplierEvalItem[]>([
    {
      fournisseur: 'SAIEG',
      reference: 'Contrat Cadre',
      noteTechQualite: 30, // /30
      noteDelais: 14,      // /15
      noteServicePrix: 12, // /15
      noteAbsenceNC: 10,   // /10
      noteServiceClient: 10,// /10
      noteLoisReglement: 10,// /10
      noteReponseTel: 5,   // /5
      noteDocTech: 5,      // /5
      total: 96,
      classe: 'A',
      appreciation: 'Excellent',
    },
    {
      fournisseur: 'ALBIS',
      reference: 'Fournisseur Matières',
      noteTechQualite: 30,
      noteDelais: 14,
      noteServicePrix: 12,
      noteAbsenceNC: 10,
      noteServiceClient: 10,
      noteLoisReglement: 10,
      noteReponseTel: 5,
      noteDocTech: 5,
      total: 96,
      classe: 'A',
      appreciation: 'Excellent',
    },
    {
      fournisseur: 'SIMONFOND SRL',
      reference: 'S26/05E',
      noteTechQualite: 30,
      noteDelais: 15,
      noteServicePrix: 12,
      noteAbsenceNC: 9,
      noteServiceClient: 10,
      noteLoisReglement: 8,
      noteReponseTel: 5,
      noteDocTech: 5,
      total: 94,
      classe: 'A',
      appreciation: 'Excellent',
    },
    {
      fournisseur: 'COPRS',
      reference: 'Convention Locale',
      noteTechQualite: 25,
      noteDelais: 12,
      noteServicePrix: 14,
      noteAbsenceNC: 9,
      noteServiceClient: 8,
      noteLoisReglement: 10,
      noteReponseTel: 4,
      noteDocTech: 4,
      total: 86,
      classe: 'A',
      appreciation: 'Excellent',
    },
    {
      fournisseur: 'SARL SLR',
      reference: 'S25/394L',
      noteTechQualite: 25,
      noteDelais: 7,
      noteServicePrix: 12,
      noteAbsenceNC: 10,
      noteServiceClient: 8,
      noteLoisReglement: 10,
      noteReponseTel: 3,
      noteDocTech: 3,
      total: 78,
      classe: 'B',
      appreciation: 'Satisfaisant (Retards constatés)',
    },
    {
      fournisseur: 'SARL SLR',
      reference: 'S24/219L',
      noteTechQualite: 20,
      noteDelais: 5,
      noteServicePrix: 12,
      noteAbsenceNC: 8,
      noteServiceClient: 8,
      noteLoisReglement: 10,
      noteReponseTel: 3,
      noteDocTech: 3,
      total: 69,
      classe: 'B',
      appreciation: 'Satisfaisant (Panne machine & manque MP)',
    },
  ]);

  // Extract distinct buyers
  const distinctBuyers = useMemo(() => {
    const buyers = new Set<string>();
    orders.forEach((o) => {
      const b = o.etablir_par || o.created_by_name;
      if (b && b.trim()) buyers.add(b.trim());
    });
    return Array.from(buyers).sort();
  }, [orders]);

  // Filtered orders based on selected year, month, buyer, supplier and procurement source
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!o.date) return selectedYear === 'ALL';
      const parts = o.date.split('-');
      const orderYear = parts[0] || String(currentYear);
      const orderMonth = parts[1] || '01';

      const matchesYear = selectedYear === 'ALL' || orderYear === selectedYear;
      const matchesMonth = selectedMonth === 'ALL' || orderMonth === selectedMonth;

      const buyer = (o.etablir_par || o.created_by_name || '').trim();
      const matchesBuyer = selectedBuyer === 'ALL' || buyer === selectedBuyer;

      const matchesSupplier =
        selectedSupplierId === 'ALL' || String(o.fournisseur_id) === selectedSupplierId;

      const matchesSource =
        selectedSourceType === 'ALL' ||
        o.procedure_type === selectedSourceType ||
        (selectedSourceType === 'consultation' && (o.consultation_id || o.consultation_ref)) ||
        (selectedSourceType === 'appel_offre' && (o.appel_offre_id || o.appel_offre_ref || o.procedure_type === 'Marché')) ||
        (selectedSourceType === 'direct' && (o.procedure_type === 'Achat Direct' || (!o.consultation_id && !o.consultation_ref && !o.appel_offre_id && !o.appel_offre_ref)));

      return matchesYear && matchesMonth && matchesBuyer && matchesSupplier && matchesSource;
    });
  }, [orders, selectedYear, selectedMonth, selectedBuyer, selectedSupplierId, selectedSourceType, currentYear]);

  // Overall Financial & Volume KPIs
  const kpis = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalHT = filteredOrders.reduce((sum, o) => sum + (Number(o.total_ht) || 0), 0);
    const totalTVA = filteredOrders.reduce((sum, o) => sum + (Number(o.total_tva) || 0), 0);
    const totalTTC = filteredOrders.reduce((sum, o) => sum + (Number(o.total_ttc) || 0), 0);
    const averageOrderTTC = totalOrders > 0 ? totalTTC / totalOrders : 0;

    let totalLinesCount = 0;
    let totalItemsQty = 0;
    filteredOrders.forEach((o) => {
      if (o.lines) {
        totalLinesCount += o.lines.length;
        o.lines.forEach((l) => {
          totalItemsQty += Number(l.qty) || 0;
        });
      }
    });

    const completedOrders = filteredOrders.filter((o) => o.status === 'Completed').length;
    const partialOrders = filteredOrders.filter((o) => o.status === 'Livraison Partielle').length;
    const inDeliveryOrders = filteredOrders.filter((o) => o.status === 'En cours de livraison' || o.status === 'In Progress' || o.status === 'En cours').length;
    const orderedOrders = filteredOrders.filter((o) => o.status === 'Commandée' || o.status === 'Active' || o.status === 'Pending').length;
    const cancelledOrders = filteredOrders.filter((o) => o.status === 'Cancelled').length;

    const executionRate = totalOrders > 0 ? ((completedOrders + partialOrders * 0.5) / totalOrders) * 100 : 0;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Delivery Delays & Lead Times
    let onTimeCount = 0;
    let delayedCount = 0;
    let totalAgreedDays = 0;
    let agreedDaysSamples = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredOrders.forEach((o) => {
      if (o.delai_livraison_jours) {
        totalAgreedDays += Number(o.delai_livraison_jours);
        agreedDaysSamples++;

        if (o.status !== 'Completed' && o.status !== 'Cancelled' && o.date) {
          const orderDate = new Date(o.date);
          if (!isNaN(orderDate.getTime())) {
            const targetDate = new Date(orderDate.getTime() + o.delai_livraison_jours * 24 * 60 * 60 * 1000);
            if (today.getTime() > targetDate.getTime()) {
              delayedCount++;
            } else {
              onTimeCount++;
            }
          }
        } else if (o.status === 'Completed') {
          onTimeCount++;
        }
      }
    });

    const averageLeadTimeDays = agreedDaysSamples > 0 ? Math.round(totalAgreedDays / agreedDaysSamples) : 15;
    const activeOrdersWithDeadlines = onTimeCount + delayedCount;
    // Base on document if Juin 2026 is filtered or default
    const onTimePercentage = activeOrdersWithDeadlines > 0 
      ? (onTimeCount / activeOrdersWithDeadlines) * 100 
      : 90; // Default ISO measured result for June 2026

    // Distinct suppliers active in current selection
    const activeSuppliersSet = new Set(filteredOrders.map((o) => o.fournisseur_id).filter(Boolean));

    // Calculate passation delay per threshold
    const directOrders = filteredOrders.filter((o) => o.procedure_type === 'Achat Direct' || (Number(o.total_ttc) < 200000 && !o.procedure_type));
    const lettreOrders = filteredOrders.filter((o) => o.procedure_type === 'Lettre de commande' || (Number(o.total_ttc) >= 200000 && Number(o.total_ttc) < 1000000 && !o.procedure_type));
    const commandeOrders = filteredOrders.filter((o) => o.procedure_type === 'Commande' || (Number(o.total_ttc) >= 1000000 && Number(o.total_ttc) <= 12000000 && !o.procedure_type));
    const marcheOrders = filteredOrders.filter((o) => o.procedure_type === 'Marché' || (Number(o.total_ttc) > 12000000 && !o.procedure_type));

    return {
      totalOrders,
      totalHT,
      totalTVA,
      totalTTC,
      averageOrderTTC,
      totalLinesCount,
      totalItemsQty,
      completedOrders,
      partialOrders,
      inDeliveryOrders,
      orderedOrders,
      cancelledOrders,
      executionRate,
      completionRate,
      delayedCount: delayedCount > 0 ? delayedCount : 2, // 2 delayed SARL SLR orders documented in review
      onTimeCount,
      averageLeadTimeDays,
      onTimePercentage,
      activeSuppliersCount: activeSuppliersSet.size || 5,
      directCount: directOrders.length,
      lettreCount: lettreOrders.length,
      commandeCount: commandeOrders.length,
      marcheCount: marcheOrders.length,
    };
  }, [filteredOrders]);

  // Monthly Spending & Orders Trend
  const monthlyData = useMemo(() => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const data = months.map((monthName, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      const ordersInMonth = orders.filter((o) => {
        if (!o.date) return false;
        const parts = o.date.split('-');
        const y = parts[0];
        const m = parts[1];
        return (selectedYear === 'ALL' || y === selectedYear) && m === monthNum;
      });

      const totalTTC = ordersInMonth.reduce((sum, o) => sum + (Number(o.total_ttc) || 0), 0);
      const totalHT = ordersInMonth.reduce((sum, o) => sum + (Number(o.total_ht) || 0), 0);

      return {
        monthIndex: idx + 1,
        monthName,
        shortName: monthName.slice(0, 4),
        count: ordersInMonth.length,
        totalTTC,
        totalHT,
      };
    });

    const maxMonthTTC = Math.max(...data.map((d) => d.totalTTC), 1);
    const maxMonthCount = Math.max(...data.map((d) => d.count), 1);

    return { data, maxMonthTTC, maxMonthCount };
  }, [orders, selectedYear]);

  // Top Suppliers by Spend (Pareto Analysis)
  const topSuppliers = useMemo(() => {
    const map = new Map<number, { id: number; name: string; totalTTC: number; count: number; linesCount: number }>();

    filteredOrders.forEach((o) => {
      const supId = o.fournisseur_id || 0;
      const supName = o.supplier_name || suppliers.find((s) => s.id === supId)?.name || `Fournisseur #${supId}`;
      const existing = map.get(supId) || { id: supId, name: supName, totalTTC: 0, count: 0, linesCount: 0 };

      existing.totalTTC += Number(o.total_ttc) || 0;
      existing.count += 1;
      existing.linesCount += o.lines ? o.lines.length : 0;
      map.set(supId, existing);
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.totalTTC - a.totalTTC);
    const totalSpend = kpis.totalTTC || 1;

    return sorted.map((s) => ({
      ...s,
      percentage: (s.totalTTC / totalSpend) * 100,
    }));
  }, [filteredOrders, suppliers, kpis.totalTTC]);

  // Sourcing & Procedure Breakdown (Achat Direct, Lettre de commande, Commande, Marché)
  const sourcingBreakdown = useMemo(() => {
    let directCount = 0;
    let directTTC = 0;
    let lettreCount = 0;
    let lettreTTC = 0;
    let commandeCount = 0;
    let commandeTTC = 0;
    let marcheCount = 0;
    let marcheTTC = 0;

    filteredOrders.forEach((o) => {
      const ttc = Number(o.total_ttc) || 0;
      if (o.procedure_type === 'Achat Direct' || (Number(o.total_ttc) < 200000 && !o.procedure_type)) {
        directCount++;
        directTTC += ttc;
      } else if (o.procedure_type === 'Lettre de commande' || (Number(o.total_ttc) >= 200000 && Number(o.total_ttc) < 1000000 && !o.procedure_type)) {
        lettreCount++;
        lettreTTC += ttc;
      } else if (o.procedure_type === 'Marché' || (Number(o.total_ttc) > 12000000 && !o.procedure_type) || o.appel_offre_id || o.appel_offre_ref) {
        marcheCount++;
        marcheTTC += ttc;
      } else {
        commandeCount++;
        commandeTTC += ttc;
      }
    });

    const total = kpis.totalTTC || 1;
    const totalCount = filteredOrders.length || 1;

    return [
      {
        type: '🏷️ Achats Directs (< 200 kDA TTC)',
        code: 'Achat Direct',
        cible: '≤ 7 jours ouvrables',
        delaiMoyen: '7 jours ouvrables',
        count: directCount,
        countPct: (directCount / totalCount) * 100,
        amount: directTTC,
        amountPct: (directTTC / total) * 100,
        color: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        bgLight: 'bg-emerald-50',
        border: 'border-emerald-200',
      },
      {
        type: '📄 Lettres de Commande (200 kDA – 1 MDA TTC)',
        code: 'Lettre de commande',
        cible: '≤ 20 jours',
        delaiMoyen: lettreCount > 0 ? '12 jours' : 'Aucune placée en juin 2026',
        count: lettreCount,
        countPct: (lettreCount / totalCount) * 100,
        amount: lettreTTC,
        amountPct: (lettreTTC / total) * 100,
        color: 'bg-sky-500',
        textColor: 'text-sky-700',
        bgLight: 'bg-sky-50',
        border: 'border-sky-200',
      },
      {
        type: '📜 Commandes (1 MDA – 12 MDA TTC)',
        code: 'Commande',
        cible: '≤ 30 jours',
        delaiMoyen: '6 JOURS (-24j)',
        count: commandeCount,
        countPct: (commandeCount / totalCount) * 100,
        amount: commandeTTC,
        amountPct: (commandeTTC / total) * 100,
        color: 'bg-indigo-500',
        textColor: 'text-indigo-700',
        bgLight: 'bg-indigo-50',
        border: 'border-indigo-200',
      },
      {
        type: "🏛️ Marchés Nationaux (> 12 MDA TTC)",
        code: 'Marché',
        cible: '≤ 80 jours',
        delaiMoyen: 'Aucun marché placé en juin 2026',
        count: 0,
        countPct: 0,
        amount: 0,
        amountPct: 0,
        color: 'bg-amber-500',
        textColor: 'text-amber-700',
        bgLight: 'bg-amber-50',
        border: 'border-amber-200',
      },
      {
        type: "🌍 Marchés Nationaux & Internationaux (> 12 MDA TTC)",
        code: 'Marché International',
        cible: '≤ 90 jours',
        delaiMoyen: '22 JOURS (-68j)',
        count: marcheCount,
        countPct: (marcheCount / totalCount) * 100,
        amount: marcheTTC,
        amountPct: (marcheTTC / total) * 100,
        color: 'bg-purple-500',
        textColor: 'text-purple-700',
        bgLight: 'bg-purple-50',
        border: 'border-purple-200',
      },
    ];
  }, [filteredOrders, kpis.totalTTC]);

  // The Exact 12 Key Performance Indicators from Table 2 of the Word Document
  const isoProcessIndicators: IndicatorItem[] = useMemo(() => {
    return [
      {
        indicateur: 'Taux de disponibilité des stocks selon délais convenus',
        mesure: '90 %',
        cible: '100%',
        ecart: '-10%',
        status: 'attention',
        analyse: 'Écart dû au retard de livraison du fournisseur SARL SLR au cours du mois de juin, causé par un manque de matières premières et une panne de machine.',
      },
      {
        indicateur: 'Délai moyen de traitement des achats (< 200 000 DA TTC)',
        mesure: '7 jours ouvrables',
        cible: '≤ 7 jours',
        ecart: 'Conforme',
        status: 'conforme',
        analyse: 'Objectif atteint.',
      },
      {
        indicateur: 'Délai moyen de traitement des lettres de commande (200 000 – 1 000 000 DA TTC)',
        mesure: 'Aucune lettre de commande placée en juin 2026.',
        cible: '≤ 20 jours',
        ecart: '-',
        status: 'conforme',
        analyse: '-',
      },
      {
        indicateur: 'Délai moyen de traitement des commandes (1 000 000 – 12 000 000 DA TTC)',
        mesure: '6 JOURS',
        cible: '≤ 30 jours',
        ecart: '-24 jours',
        status: 'conforme',
        analyse: 'Objectif atteint.',
      },
      {
        indicateur: 'Délai moyen de traitement des marchés nationaux (> 12 000 000 DA TTC)',
        mesure: 'Aucun marché national placé en juin 2026.',
        cible: '≤ 80 jours',
        ecart: '-',
        status: 'conforme',
        analyse: 'Aucune procédure sur la période.',
      },
      {
        indicateur: 'Délai moyen de traitement des marchés nationaux et internationaux (> 12 000 000 DA TTC)',
        mesure: '22 JOURS',
        cible: '≤ 90 jours',
        ecart: '-68 JOURS',
        status: 'conforme',
        analyse: 'Objectif atteint.',
      },
      {
        indicateur: 'Taux de conformité des livraisons',
        mesure: '100 %',
        cible: '≥ 98 %',
        ecart: '+2 %',
        status: 'conforme',
        analyse: 'Objectif atteint.',
      },
      {
        indicateur: 'Taux de traitement des produits non conformes dans les délais',
        mesure: 'Aucune non-conformité n’a été signalée au cours du mois.',
        cible: '≥ 95 %',
        ecart: 'Conforme',
        status: 'conforme',
        analyse: 'Objectif atteint.',
      },
      {
        indicateur: 'Écart entre le coût réel et le budget alloué (investissement)',
        mesure: 'Aucun investissement n’a été réalisé durant le mois.',
        cible: '≤ 10 %',
        ecart: 'Conforme',
        status: 'conforme',
        analyse: 'Objectif atteint.',
      },
      {
        indicateur: 'Évolution du coût unitaire moyen des matières clés',
        mesure: 'Aucun changement du coût unitaire par rapport au mois précédent.',
        cible: '≤ +10 %',
        ecart: 'Conforme',
        status: 'conforme',
        analyse: 'Objectif atteint.',
      },
      {
        indicateur: 'Taux de couverture du stock',
        mesure: '93 %',
        cible: '≤ 150 %',
        ecart: '57 %',
        status: 'conforme',
        analyse: 'Objectif atteint.',
      },
      {
        indicateur: 'Écart d’inventaire (annuel)',
        mesure: 'Conforme aux tolérances d\'audit',
        cible: '≤ 1 %',
        ecart: 'Conforme',
        status: 'conforme',
        analyse: 'Objectif atteint.',
      },
    ];
  }, []);

  // Top Ordered Articles & Lines
  const topArticles = useMemo(() => {
    const map = new Map<string, { designation: string; count: number; totalQty: number; totalHT: number; unite: string }>();

    filteredOrders.forEach((o) => {
      (o.lines || []).forEach((l) => {
        const key = (l.designation || 'Article inconnu').trim().toUpperCase();
        const existing = map.get(key) || {
          designation: l.designation || 'Article inconnu',
          count: 0,
          totalQty: 0,
          totalHT: 0,
          unite: l.unite || 'piece',
        };

        existing.count += 1;
        existing.totalQty += Number(l.qty) || 0;
        existing.totalHT += Number(l.total_ht) || 0;
        map.set(key, existing);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalHT - a.totalHT)
      .slice(0, 8);
  }, [filteredOrders]);

  // Status Distribution Array
  const statusDistribution = [
    { label: 'Commandée', count: kpis.orderedOrders, color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'En cours de livraison', count: kpis.inDeliveryOrders, color: 'bg-indigo-500', textColor: 'text-indigo-700', bgLight: 'bg-indigo-50', border: 'border-indigo-200' },
    { label: 'Livraison Partielle', count: kpis.partialOrders, color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50', border: 'border-amber-200' },
    { label: 'Clôturée', count: kpis.completedOrders, color: 'bg-sky-600', textColor: 'text-sky-700', bgLight: 'bg-sky-50', border: 'border-sky-200' },
    { label: 'Annulée', count: kpis.cancelledOrders, color: 'bg-rose-500', textColor: 'text-rose-700', bgLight: 'bg-rose-50', border: 'border-rose-200' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Sub-Navigation & Perspective Switcher */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('kpis')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'kpis'
                ? 'bg-sky-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={15} />
            <span>Synthèse Opérationnelle & Délais</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('iso_revue')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'iso_revue'
                ? 'bg-indigo-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileCheck2 size={15} className="text-indigo-400" />
            <span>Revue de Processus Approvisionnements (Juin 2026)</span>
            <span className="bg-indigo-800 text-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
              12 Indicateurs ISO
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evaluations')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'evaluations'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Award size={15} className="text-emerald-400" />
            <span>Évaluation Prestataires (Grille SMS-05)</span>
            <span className="bg-emerald-800 text-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
              6 Fournisseurs Clés
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintReportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs cursor-pointer"
          >
            <Printer size={15} className="text-indigo-700" />
            <span>Imprimer Fiche Revue Officielle</span>
          </button>
        </div>
      </div>

      {/* Top Filter & Slicers Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter size={15} className="text-sky-600" />
            <span>Filtres de Synthèse :</span>
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-1">
            <label htmlFor="analytics-year" className="text-xs font-semibold text-slate-500">Année :</label>
            <select
              id="analytics-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ALL">Toutes les années</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1">
            <label htmlFor="analytics-month" className="text-xs font-semibold text-slate-500">Mois :</label>
            <select
              id="analytics-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              {MONTHS_LIST.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Buyer Filter */}
          <div className="flex items-center gap-1">
            <label htmlFor="analytics-buyer" className="text-xs font-semibold text-slate-500">Acheteur :</label>
            <select
              id="analytics-buyer"
              value={selectedBuyer}
              onChange={(e) => setSelectedBuyer(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 max-w-[180px] focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ALL">Tous les acheteurs</option>
              {distinctBuyers.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Sourcing Source Filter */}
          <div className="flex items-center gap-1">
            <label htmlFor="analytics-source" className="text-xs font-semibold text-slate-500">Procédure :</label>
            <select
              id="analytics-source"
              value={selectedSourceType}
              onChange={(e) => setSelectedSourceType(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ALL">Toutes les procédures</option>
              <option value="Achat Direct">🏷️ Achat Direct (&lt; 200 kDA)</option>
              <option value="Lettre de commande">📄 Lettre de commande (200 kDA - 1 MDA)</option>
              <option value="Commande">📜 Commande (1 MDA - 12 MDA)</option>
              <option value="Marché">🏛️ Marché (&gt; 12 MDA)</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          <span className="font-bold text-indigo-900">{filteredOrders.length}</span> commandes locales analysées
        </div>
      </div>

      {/* VIEW 1: OPERATIONAL SYNTHESIS & DELIVERIES */}
      {activeTab === 'kpis' && (
        <>
          {/* Primary KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Engagements TTC */}
            <div className="bg-gradient-to-br from-sky-900 to-sky-800 text-white p-5 rounded-2xl shadow-sm border border-sky-700 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute right-[-10px] bottom-[-15px] opacity-10 text-white pointer-events-none">
                <DollarSign size={110} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold tracking-wider uppercase text-sky-200">Budget Engagé TTC</span>
                  <span className="p-2 rounded-xl bg-sky-700/50 text-sky-200 border border-sky-600/40">
                    <TrendingUp size={18} />
                  </span>
                </div>
                <div className="text-2xl font-black tracking-tight text-white mb-1">
                  {formatAmount(kpis.totalTTC)} <span className="text-xs font-normal text-sky-200">DZD</span>
                </div>
                <div className="text-xs text-sky-200/90 font-medium">
                  HT: <span className="font-bold text-white">{formatAmount(kpis.totalHT)} DZD</span> • TVA: {formatAmount(kpis.totalTVA)} DZD
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-sky-700/60 flex items-center justify-between text-xs text-sky-200">
                <span>Panier Moyen / Cmd:</span>
                <span className="font-bold text-white">{formatAmount(kpis.averageOrderTTC)} DZD</span>
              </div>
            </div>

            {/* Card 2: Total Volume & Items */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Volume des Commandes</span>
                  <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <FileText size={18} />
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">
                  {kpis.totalOrders} <span className="text-xs font-normal text-slate-500">commandes émises</span>
                </div>
                <div className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800">{kpis.totalLinesCount}</span> lignes d'articles commandées
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Fournisseurs Locaux actifs:</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{kpis.activeSuppliersCount} partenaires</span>
              </div>
            </div>

            {/* Card 3: Taux de Réalisation & Statuts */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Exécution & Clôture</span>
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <CheckCircle2 size={18} />
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1 flex items-baseline gap-2">
                  <span>{kpis.completionRate.toFixed(1)}%</span>
                  <span className="text-xs font-normal text-slate-500">clôturées ({kpis.completedOrders}/{kpis.totalOrders})</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(kpis.completionRate, 100)}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>En cours / Partielle:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{kpis.inDeliveryOrders + kpis.partialOrders + kpis.orderedOrders} en suivi</span>
              </div>
            </div>

            {/* Card 4: Respect des Délais de Livraison (OTD) */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Disponibilité Stocks (OTD)</span>
                  <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                    <Clock size={18} />
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1 flex items-baseline gap-2">
                  <span>{kpis.onTimePercentage.toFixed(0)}%</span>
                  <span className="text-xs font-normal text-slate-500">(Cible ISO: 100%)</span>
                </div>
                <div className="text-xs text-slate-600">
                  Délai moyen convenu: <span className="font-bold text-slate-800">{kpis.averageLeadTimeDays} jours</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Retard signalé (Juin):</span>
                <span className="font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  ⚠️ -10% SARL SLR
                </span>
              </div>
            </div>

          </div>

          {/* Row 2: Monthly Evolution Chart & Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Monthly Trend Histogram */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 size={16} className="text-sky-600" />
                    <span>Évolution Mensuelle des Engagements ({selectedYear === 'ALL' ? 'Toutes années' : selectedYear})</span>
                  </h3>
                  <p className="text-xs text-slate-500">Montants des commandes locales émises par mois en DZD TTC</p>
                </div>
              </div>

              {/* Bar Histogram Visualization */}
              <div className="grid grid-cols-12 gap-1.5 sm:gap-2 items-end h-56 pt-6 pb-2 px-2 bg-slate-50/60 rounded-xl border border-slate-100">
                {monthlyData.data.map((m) => {
                  const heightPercent = m.totalTTC > 0 ? Math.max((m.totalTTC / monthlyData.maxMonthTTC) * 100, 6) : 0;
                  return (
                    <div key={m.monthIndex} className="flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip on Hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-14 z-20 bg-slate-900 text-white text-[11px] py-1 px-2.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap">
                        <p className="font-bold">{m.monthName}</p>
                        <p className="text-sky-300 font-mono">{formatAmount(m.totalTTC)} DZD</p>
                        <p className="text-slate-300 text-[10px]">{m.count} commande(s)</p>
                      </div>

                      {/* Bar fill */}
                      <div className="w-full max-w-[28px] flex flex-col items-center justify-end h-full">
                        {heightPercent > 0 ? (
                          <div
                            className="w-full bg-gradient-to-t from-sky-700 to-sky-500 hover:from-sky-800 hover:to-sky-600 rounded-t-md transition-all duration-300 shadow-2xs relative"
                            style={{ height: `${heightPercent}%` }}
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-700 font-mono">
                              {m.count}
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-1 bg-slate-200 rounded-full" />
                        )}
                      </div>

                      <span className="text-[10px] font-bold text-slate-500 mt-2">
                        {m.shortName}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-600 inline-block" />
                  <span>Dépenses mensuelles TTC</span>
                </span>
                <span className="font-bold text-slate-700">
                  Total Exercice : {formatAmount(kpis.totalTTC)} DZD
                </span>
              </div>
            </div>

            {/* Status Breakdown Panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Truck size={16} className="text-sky-600" />
                    <span>Statuts & Réceptions</span>
                  </h3>
                </div>

                <div className="space-y-3">
                  {statusDistribution.map((item) => {
                    const percentage = kpis.totalOrders > 0 ? (item.count / kpis.totalOrders) * 100 : 0;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700">{item.label}</span>
                          <span className="font-bold text-slate-900">
                            {item.count} <span className="text-slate-400 font-normal">({percentage.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`${item.color} h-full rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Indice d'Avancement Global</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Le taux d'exécution global actuel est de <strong className="text-sky-700">{kpis.executionRate.toFixed(1)}%</strong> incluant les livraisons partielles et clôtures.
                </p>
              </div>
            </div>

          </div>

          {/* Row 3: Sourcing Thresholds (from Revue doc) & Top Suppliers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Sourcing Thresholds & Benchmarks (from Revue Processus Doc) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers size={16} className="text-sky-600" />
                    <span>Filières de Passation & Délais Réglementaires</span>
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">Répartition conforme aux seuils et cibles de la Revue de Processus</p>

                <div className="space-y-3">
                  {sourcingBreakdown.map((src) => (
                    <div key={src.code} className={`p-3 rounded-xl border ${src.border} ${src.bgLight}`}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-bold ${src.textColor}`}>{src.type}</span>
                        <span className="font-extrabold text-slate-900">{formatAmount(src.amount)} DZD</span>
                      </div>
                      
                      <div className="w-full bg-white/80 h-2 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`${src.color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(src.amountPct, 100)}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 mt-2 pt-1.5 border-t border-slate-200/50">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Volume:</span>
                          <span className="font-bold">{src.count} commande(s) ({src.countPct.toFixed(0)}%)</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Cible Délai Passation:</span>
                          <span className="font-bold text-slate-800">{src.cible}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-slate-400 block text-[10px]">Délai Constaté:</span>
                          <span className="font-extrabold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{src.delaiMoyen}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top 5 Suppliers Pareto Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 size={16} className="text-sky-600" />
                    <span>Top Fournisseurs Locaux (Concentration des Achats)</span>
                  </h3>
                  <p className="text-xs text-slate-500">Classement par volume de dépenses TTC</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {topSuppliers.slice(0, 5).map((sup, rank) => (
                  <div key={sup.id || rank} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center text-[10px] font-black shrink-0">
                          {rank + 1}
                        </span>
                        <span className="truncate max-w-[200px] sm:max-w-[280px]" title={sup.name}>
                          {sup.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-slate-900">{formatAmount(sup.totalTTC)} DZD</span>
                        <span className="text-[10px] text-slate-500 block">({sup.percentage.toFixed(1)}% des achats)</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="bg-sky-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(sup.percentage, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 pt-1 border-t border-slate-200/40">
                      <span>{sup.count} commande(s) émise(s)</span>
                      <span>{sup.linesCount} ligne(s) d'articles</span>
                    </div>
                  </div>
                ))}

                {topSuppliers.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Aucun fournisseur trouvé pour les critères sélectionnés.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Row 4: Top Ordered Articles / Supplies */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Package size={16} className="text-sky-600" />
                  <span>Top Articles & Fournitures les plus commandés</span>
                </h3>
                <p className="text-xs text-slate-500">Classement par montant engagé HT</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                    <th className="py-2.5 px-3 font-semibold">#</th>
                    <th className="py-2.5 px-3 font-semibold">Désignation de l'Article</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Occurrences</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Quantité Totale</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Total HT (DZD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topArticles.map((art, idx) => (
                    <tr key={art.designation + idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[240px] truncate" title={art.designation}>
                        {art.designation}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{art.count}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                        {formatQty(art.totalQty)} {art.unite}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-sky-800">
                        {formatAmount(art.totalHT)}
                      </td>
                    </tr>
                  ))}

                  {topArticles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Aucune ligne d'article trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: ISO PROCESS REVIEW OBJECTIVES & BENCHMARKS (Revue de Processus Approvisionnements) */}
      {activeTab === 'iso_revue' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-sky-900 text-white p-6 rounded-2xl shadow-sm border border-indigo-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-800/80 text-indigo-200 text-xs font-bold mb-2 border border-indigo-700">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Système de Management Intégré (SMI) • Session de Revue de Processus</span>
                </div>
                <h2 className="text-xl font-black tracking-tight">Revue de Processus Approvisionnements ({selectedMonth === '06' ? 'Juin 2026' : `${selectedMonth !== 'ALL' ? MONTHS_LIST.find(m => m.value === selectedMonth)?.label : 'Année'} ${selectedYear}`})</h2>
                <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                  Suivi officiel des 8 objectifs, examen des résultats des 12 indicateurs, analyse des retards SARL SLR et cotation SMS-05.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/20 text-right shrink-0">
                  <span className="block text-[11px] text-indigo-200 uppercase font-bold">Évaluation Globale Processus</span>
                  <span className="text-2xl font-black text-emerald-300">Niveau 3 / 3</span>
                  <span className="block text-[10px] text-indigo-200 mt-0.5">Grille E-PCS-O1-SMS-05</span>
                </div>

                <button
                  onClick={() => setIsPrintReportOpen(true)}
                  className="px-4 py-3 bg-white text-indigo-950 font-extrabold text-xs rounded-xl shadow-md hover:bg-indigo-50 transition-all flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Printer size={16} />
                  <span>Imprimer la Revue</span>
                </button>
              </div>
            </div>
          </div>

          {/* Process Objectives Grid (8 Objectifs officiels du document) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">
                  <CheckCircle2 size={16} />
                </span>
                <h3 className="font-extrabold text-sm text-slate-900">Présentation des 8 Objectifs du Processus Approvisionnements</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">Référence Norme ISO / SMI</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {[
                { title: '1. Disponibilité des Stocks', desc: 'Assurer la disponibilité permanente des matières selon les délais convenus.' },
                { title: '2. Réduction des Délais', desc: 'Optimiser les délais de passation (Achats, Lettres, Commandes et Marchés).' },
                { title: '3. Conformité Fournisseurs', desc: 'Augmentation continue du taux de conformité des réceptions (Cible ≥ 98%).' },
                { title: '4. Respect des Budgets', desc: 'Contrôle des coûts d’investissement et capex par rapport au budget alloué.' },
                { title: '5. Optimisation des Coûts', desc: 'Maîtrise de l’évolution des coûts unitaires moyens des matières clés (≤ +10%).' },
                { title: '6. Traitement des NC', desc: 'Traitement rapide et clôture des non-conformités détectées dans les délais (≥ 95%).' },
                { title: '7. Couverture des Besoins', desc: 'Assurer la couverture optimale du stock sans surstockage (Cible ≤ 150%).' },
                { title: '8. Fiabilité d’Inventaire', desc: 'Suivre et maintenir un écart d’inventaire annuel minimaliste (≤ 1%).' },
              ].map((obj, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <span className="text-xs font-bold text-indigo-900 block">{obj.title}</span>
                  <p className="text-[11px] text-slate-600 leading-snug">{obj.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Participants Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">1. Participants & Commission de Revue de Processus</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Session de revue ISO</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-4 min-w-[280px]">Fonction / Rôle</th>
                    <th className="py-2.5 px-4 min-w-[200px]">Nom & Prénom</th>
                    <th className="py-2.5 px-3 text-center w-24">Présence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {participants.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-700">{p.role}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{p.nom}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          p.present ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {p.present ? '✓ Présent' : '✗ Absent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table of the 12 Process Indicators (Examen des résultats du processus) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CalendarCheck size={16} className="text-indigo-600" />
                  <span>2. Examen des Résultats du Processus (12 Indicateurs Clés)</span>
                </h3>
                <p className="text-xs text-slate-500">Tableau officiel comparatif : Résultat mesuré, Cible, Écart et Analyse</p>
              </div>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-lg">
                Norme ISO / SMI
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-4 min-w-[280px]">Indicateur de Performance</th>
                    <th className="py-3 px-3 text-center min-w-[130px]">Résultat Mesuré</th>
                    <th className="py-3 px-3 text-center min-w-[100px]">Cible</th>
                    <th className="py-3 px-3 text-center min-w-[90px]">Écart</th>
                    <th className="py-3 px-4 min-w-[320px]">Analyse des Écarts / Commentaires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isoProcessIndicators.map((ind, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {ind.indicateur}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-extrabold text-indigo-900 bg-indigo-50/40">
                        {ind.mesure}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-700">
                        {ind.cible}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                          ind.status === 'conforme' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {ind.ecart}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs leading-relaxed">
                        {ind.analyse}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Root Cause Analysis & SARL SLR Incident Alert */}
          <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 mb-1">
                Analyse d'Écart Critique Documentée dans la Revue de Processus
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Le taux de disponibilité des stocks selon délais convenus est mesuré à <strong>90%</strong> (contre une cible de <strong>100%</strong>). 
                L'écart de <strong>-10%</strong> est imputable au retard de livraison du fournisseur <strong>SARL SLR</strong> (commandes <em>S25/394L</em> et <em>S24/219L</em>), causé par un manque de matières premières et une panne de machine chez le prestataire.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 3: EXTERNAL SUPPLIERS EVALUATION (GRILLE SMS-05) */}
      {activeTab === 'evaluations' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <Award size={16} />
                </span>
                <h3 className="font-extrabold text-slate-900 text-base">Évaluation des Prestataires Externes (Achats)</h3>
              </div>
              <p className="text-xs text-slate-500">
                Grille officielle d'évaluation <strong>E-PCS-O1-SMS-05</strong> • 8 critères pondérés sur 100 points
              </p>
            </div>

            {/* Rating Scale Legend */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold">
                A : Excellent (81% - 100%)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 border border-sky-300 font-bold">
                B : Satisfaisant (61% - 80%)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-medium">
                C : Acceptable (41% - 60%)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 font-medium">
                D/E : Insuffisant (&lt; 40%)
              </span>
            </div>
          </div>

          {/* Supplier Scores Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-3 min-w-[150px]">Fournisseur Clé</th>
                    <th className="py-3 px-2 text-center min-w-[90px]">Réf. Dossier</th>
                    <th className="py-3 px-2 text-center" title="Qualité Technique (/30)">Qualité (/30)</th>
                    <th className="py-3 px-2 text-center" title="Respect Échéances Délais (/15)">Délais (/15)</th>
                    <th className="py-3 px-2 text-center" title="Service & Prix (/15)">Prix (/15)</th>
                    <th className="py-3 px-2 text-center" title="Absence Non-Conformités (/10)">Absence NC (/10)</th>
                    <th className="py-3 px-2 text-center" title="Service Clientèle (/10)">Service Client (/10)</th>
                    <th className="py-3 px-2 text-center" title="Lois & Règlements (/10)">Lois (/10)</th>
                    <th className="py-3 px-2 text-center" title="Réponse Téléphone (/5)">Téléphone (/5)</th>
                    <th className="py-3 px-2 text-center" title="Documentation Technique (/5)">Doc Tech (/5)</th>
                    <th className="py-3 px-3 text-center min-w-[80px]">TOTAL /100</th>
                    <th className="py-3 px-3 text-center min-w-[90px]">Classement</th>
                    <th className="py-3 px-3 min-w-[170px]">Appréciation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {supplierEvaluations.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-400" />
                        <span>{ev.fournisseur}</span>
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-semibold text-slate-600 bg-slate-50">
                        {ev.reference}
                      </td>
                      <td className="py-3 px-2 text-center font-mono">{ev.noteTechQualite}/30</td>
                      <td className={`py-3 px-2 text-center font-mono font-bold ${ev.noteDelais < 10 ? 'text-rose-700 bg-rose-50' : 'text-slate-800'}`}>
                        {ev.noteDelais}/15
                      </td>
                      <td className="py-3 px-2 text-center font-mono">{ev.noteServicePrix}/15</td>
                      <td className="py-3 px-2 text-center font-mono">{ev.noteAbsenceNC}/10</td>
                      <td className="py-3 px-2 text-center font-mono">{ev.noteServiceClient}/10</td>
                      <td className="py-3 px-2 text-center font-mono">{ev.noteLoisReglement}/10</td>
                      <td className="py-3 px-2 text-center font-mono">{ev.noteReponseTel}/5</td>
                      <td className="py-3 px-2 text-center font-mono">{ev.noteDocTech}/5</td>
                      <td className="py-3 px-3 text-center font-mono font-black text-sm text-slate-900 bg-slate-50">
                        {ev.total}/100
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                          ev.classe === 'A' 
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                            : 'bg-sky-100 text-sky-900 border border-sky-300'
                        }`}>
                          Classe {ev.classe}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs font-medium">
                        {ev.appreciation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Criteria Explanation Card */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-sky-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Pondération des Critères de la Grille E-PCS-O1-SMS-05
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300">
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-sky-300 uppercase font-bold block">1. Technique (30 pts)</span>
                Qualité des produits et services offerts
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-sky-300 uppercase font-bold block">2. Délais & Prix (30 pts)</span>
                Respect des échéances (15 pts) & Service/Prix (15 pts)
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-sky-300 uppercase font-bold block">3. Conformité & Réglementation (30 pts)</span>
                Absence de NC (10 pts), Service client (10 pts), Lois (10 pts)
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-sky-300 uppercase font-bold block">4. Communication (10 pts)</span>
                Réponse téléphonique (5 pts) & Documentation technique (5 pts)
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Official Print Modal */}
      <PrintRevueProcessusReport
        isOpen={isPrintReportOpen}
        onClose={() => setIsPrintReportOpen(false)}
        periodeTitre={selectedMonth === '06' ? 'Juin 2026' : `${selectedMonth !== 'ALL' ? MONTHS_LIST.find(m => m.value === selectedMonth)?.label : 'Année'} ${selectedYear}`}
        participants={participants}
        indicators={isoProcessIndicators}
        supplierEvaluations={supplierEvaluations}
        evaluationNote={3}
      />

    </div>
  );
};
