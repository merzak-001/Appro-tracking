import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Plus,
  Search,
  Printer,
  Trash2,
  Edit,
  X,
  Globe,
  Ship,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  Filter,
  CheckCircle,
  Eye,
  Copy,
  ChevronDown,
} from 'lucide-react';
import {
  ForeignFinancialDocument,
  ForeignFinancialDocType,
  ForeignDocAttachmentLine,
  User,
  ForeignOrder,
  ForeignExpedition,
  Supplier,
} from '../types';
import { formatNumber, numberToFrenchWords } from '../utils/numberUtils';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { PrintForeignFinancialDoc } from './PrintForeignFinancialDoc';
import { SearchableSelect } from './SearchableSelect';

interface ForeignFinancialDocumentsProps {
  currentUser: User;
  foreignOrders?: ForeignOrder[];
  foreignExpeditions?: ForeignExpedition[];
  suppliers?: Supplier[];
  onSelectTab?: (tab: string) => void;
}

const ALL_FOREIGN_DOC_TYPES: ForeignFinancialDocType[] = [
  'APUREMENT_IMPORTATION',
  'DEMANDE_CHEQUE_ETRANGER',
  'DEMANDE_CHEQUE_CERTIFIE_ETRANGER',
  'REGULARISATION_CHEQUE_ETRANGER',
  'REGULARISATION_CHEQUE_CERTIFIE_ETRANGER',
];

const INITIAL_MOCK_FOREIGN_DOCS: ForeignFinancialDocument[] = [
  {
    id: 1,
    ref_number: '0937 /SENSUS/DP/2026',
    date: '2026-06-22',
    location: 'EL-EULMA',
    doc_type: 'APUREMENT_IMPORTATION',
    objet: 'Apurement',
    order_ref: 'S26-20E-1ere',
    fournisseur_name: 'SIMONFOND/Italie',
    amount: 219985.92,
    currency: 'EUR',
    details_description: "Ce dossier concerne l'expédition de 22 176 corps DN15 pour compteur 420PC 15 objet de la commande S26/05E/1e expédition SIMONFOND/Italie.",
    signatory_title: 'LE DIRECTEUR DE PRODUCTION',
    attachments: [
      { id: 1, position: 1, label: '01 copie D10 N°', doc_number: '5100100002026DED026268I', doc_date: '2026-05-18' },
      { id: 2, position: 2, label: '01 Bon de réception N°', doc_number: '5002239738', doc_date: '2026-06-01' },
      { id: 3, position: 3, label: '01 copie Facture domiciliée N°', doc_number: '206', doc_date: '2026-04-16' },
    ],
  },
  {
    id: 2,
    ref_number: '0710 /SENSUS/DP/2026',
    date: '2026-05-11',
    location: 'EL-EULMA',
    doc_type: 'DEMANDE_CHEQUE_ETRANGER',
    objet: 'Demande de Chèque',
    beneficiary_name: 'CMA CGM',
    amount: 358840.78,
    currency: 'DA',
    details_description: "Ce chèque est destiné au règlement des frais de débarquement de deux (2) conteneurs TC20' contenant 22 176 corps DN15, Cette opération s'inscrit dans le cadre des commandes S26/05E/1E expédition, passées auprès du fournisseur SIMONFOND (Italie), et transportés par la compagnie maritime CMA CGM / Alger.",
    signatory_title: 'LE DIRECTEUR DE PRODUCTION',
  },
  {
    id: 3,
    ref_number: '772 /SENSUS/DP/2026',
    date: '2026-05-19',
    location: 'EL-EULMA',
    doc_type: 'DEMANDE_CHEQUE_CERTIFIE_ETRANGER',
    objet: 'Demande de Chèque certifié',
    beneficiary_name: 'MR LE RECEVEUR PRINCIPAL DES DOUANES ALGER PORT',
    amount: 7762996.00,
    currency: 'DA',
    details_description: "Ce montant est destiné au paiement des droits et taxes de dédouanement de la marchandise (22 176 corps DN 15) objet de commande S26/05E/1ère expédition SIMONFOND/Italie.",
    signatory_title: 'LE DIRECTEUR DE PRODUCTION',
  },
  {
    id: 4,
    ref_number: '938 /SENSUS/DP/2026',
    date: '2026-06-22',
    location: 'EL-EULMA',
    doc_type: 'REGULARISATION_CHEQUE_ETRANGER',
    objet: 'Régularisation de chèque',
    cheque_number: '4069559',
    cheque_date: '2026-05-11',
    amount: 358840.78,
    currency: 'DA',
    attachments: [
      { id: 4, position: 1, label: '01 Facture N°', doc_number: 'DZIM1989380', doc_date: '2026-05-07', amount: 358840.78 },
    ],
    details_description: "Ce Montant concerne le paiement les frais de débarquement de deux (2) conteneurs TC20' contenant 22 176 corps DN15, Cette opération s'inscrit dans le cadre des commandes S26/05E/1E expédition, passées auprès du fournisseur SIMONFOND (Italie), et transportés par la compagnie maritime CMA CGM / Alger.",
    signatory_title: 'LE DIRECTEUR DE PRODUCTION',
  },
  {
    id: 5,
    ref_number: '939 /SENSUS/DP/2026',
    date: '2026-06-22',
    location: 'EL-EULMA',
    doc_type: 'REGULARISATION_CHEQUE_CERTIFIE_ETRANGER',
    objet: 'Régularisation de chèque certifié',
    cheque_number: '2229675',
    cheque_date: '2026-05-19',
    amount: 7762996.00,
    currency: 'DA',
    attachments: [
      { id: 5, position: 1, label: '01 déclaration n°', doc_number: '55100100002026DED026268I', doc_date: '2026-05-18', amount: 7760996.00 },
      { id: 6, position: 2, label: '01 quittance n°', doc_number: '5100100002026DED055779 I', doc_date: '2026-05-31', amount: 7760996.00 },
      { id: 7, position: 3, label: '01 quittance n°', doc_number: '5100100002026DED055780 I', doc_date: '2026-05-31', amount: 2000.00 },
    ],
    details_description: "Ce Montant est destiné à régler les droits et taxes de dédouanement de la marchandise (22 176 corps DN 15) objet de commande S26/05E/1e expédition SIMONFOND/Italie.",
    signatory_title: 'LE DIRECTEUR DE PRODUCTION',
  },
];

export const ForeignFinancialDocuments: React.FC<ForeignFinancialDocumentsProps> = ({
  currentUser,
  foreignOrders = [],
  foreignExpeditions = [],
  suppliers = [],
  onSelectTab,
}) => {
  const [documents, setDocuments] = useState<ForeignFinancialDocument[]>(() => {
    const saved = localStorage.getItem('sensus_foreign_financial_docs');
    return saved ? JSON.parse(saved) : INITIAL_MOCK_FOREIGN_DOCS;
  });

  // Filter States
  const [selectedDocTypes, setSelectedDocTypes] = useState<ForeignFinancialDocType[]>(ALL_FOREIGN_DOC_TYPES);
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [amountFilter, setAmountFilter] = useState<'ALL' | '1M+' | '500K-1M' | 'UNDER_500K'>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ForeignFinancialDocument | null>(null);
  const [printDoc, setPrintDoc] = useState<ForeignFinancialDocument | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<ForeignFinancialDocument, 'id'>>({
    ref_number: '',
    date: new Date().toISOString().split('T')[0],
    location: 'EL-EULMA',
    doc_type: 'APUREMENT_IMPORTATION',
    objet: 'Apurement',
    order_ref: '',
    foreign_order_id: undefined,
    foreign_expedition_id: undefined,
    fournisseur_name: '',
    beneficiary_name: '',
    amount: 0,
    currency: 'EUR',
    cheque_number: '',
    cheque_date: new Date().toISOString().split('T')[0],
    details_description: '',
    attachments: [],
    signatory_title: 'LE DIRECTEUR DE PRODUCTION',
  });

  // Attachments form editing
  const [attLines, setAttLines] = useState<ForeignDocAttachmentLine[]>([]);

  useEffect(() => {
    localStorage.setItem('sensus_foreign_financial_docs', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (printDoc) setPrintDoc(null);
        else if (isModalOpen) setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, printDoc]);

  const canManage = currentUser.role === 'Admin' || currentUser.role === 'SAI' || currentUser.role === 'Chef Service';

  // Options for SearchableSelect
  const foreignOrderOptions = foreignOrders.map((o) => ({
    value: o.n_order,
    label: `${o.n_order} - ${o.supplier_name || 'Fournisseur Étranger'} (${o.country || ''})`,
    subLabel: `Proforma: ${o.proforma_ref || 'N/A'} • Devise: ${o.currency || 'EUR'}`,
    badge: 'Commande Étrangère',
  }));

  const foreignExpeditionOptions = foreignExpeditions.map((e) => {
    const parentOrder = foreignOrders.find((o) => o.id === e.foreign_order_id);
    const supplierName = parentOrder?.supplier_name || e.supplier_name || (suppliers.find(s => s.id === parentOrder?.supplier_id)?.name) || '';
    return {
      value: e.expedition_code,
      label: `${e.expedition_code} ${supplierName ? `— ${supplierName}` : ''}`,
      subLabel: `Facture: ${e.n_facture || 'N/A'} • BL/LTA: ${e.n_bl_lta || 'N/A'}${e.foreign_code ? ` • Cmd: ${e.foreign_code}` : ''}`,
      badge: 'Expédition Étrangère',
    };
  });

  const toggleDocType = (type: ForeignFinancialDocType) => {
    setSelectedDocTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleSelectAllTypes = () => {
    if (selectedDocTypes.length === ALL_FOREIGN_DOC_TYPES.length) {
      setSelectedDocTypes([]);
    } else {
      setSelectedDocTypes(ALL_FOREIGN_DOC_TYPES);
    }
  };

  // Lock body scroll when modal or print doc is open
  useEffect(() => {
    if (isModalOpen || printDoc !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, printDoc]);

  const handleOpenCreate = (type: ForeignFinancialDocType) => {
    let defaultObjet = 'Apurement';
    let defaultCurr = 'DA';
    let defaultBenef = '';
    let initialAtts: ForeignDocAttachmentLine[] = [];

    if (type === 'APUREMENT_IMPORTATION') {
      defaultObjet = 'Apurement';
      defaultCurr = 'EUR';
      initialAtts = [
        { position: 1, label: '01 copie D10 N°', doc_number: '', doc_date: new Date().toISOString().split('T')[0] },
        { position: 2, label: '01 Bon de réception N°', doc_number: '', doc_date: new Date().toISOString().split('T')[0] },
        { position: 3, label: '01 copie Facture domiciliée N°', doc_number: '', doc_date: new Date().toISOString().split('T')[0] },
      ];
    } else if (type === 'DEMANDE_CHEQUE_ETRANGER') {
      defaultObjet = 'Demande de Chèque';
      defaultBenef = 'CMA CGM';
      defaultCurr = 'DA';
    } else if (type === 'DEMANDE_CHEQUE_CERTIFIE_ETRANGER') {
      defaultObjet = 'Demande de Chèque certifié';
      defaultBenef = 'MR LE RECEVEUR PRINCIPAL DES DOUANES ALGER PORT';
      defaultCurr = 'DA';
    } else if (type === 'REGULARISATION_CHEQUE_ETRANGER') {
      defaultObjet = 'Régularisation de chèque';
      defaultCurr = 'DA';
      initialAtts = [
        { position: 1, label: '01 Facture N°', doc_number: '', doc_date: new Date().toISOString().split('T')[0] },
      ];
    } else if (type === 'REGULARISATION_CHEQUE_CERTIFIE_ETRANGER') {
      defaultObjet = 'Régularisation de chèque certifié';
      defaultCurr = 'DA';
      initialAtts = [
        { position: 1, label: '01 déclaration n°', doc_number: '', doc_date: new Date().toISOString().split('T')[0] },
        { position: 2, label: '01 quittance n°', doc_number: '', doc_date: new Date().toISOString().split('T')[0] },
      ];
    }

    const nextSeq = documents.length + 940;
    const refStr = `${String(nextSeq).padStart(4, '0')} /SENSUS/DP/${new Date().getFullYear()}`;

    setEditingDoc(null);
    setFormData({
      ref_number: refStr,
      date: new Date().toISOString().split('T')[0],
      location: 'EL-EULMA',
      doc_type: type,
      objet: defaultObjet,
      order_ref: '',
      expedition_ref: '',
      foreign_expedition_id: undefined,
      foreign_order_id: undefined,
      fournisseur_name: '',
      beneficiary_name: defaultBenef,
      amount: 0,
      currency: type === 'APUREMENT_IMPORTATION' ? 'EUR' : defaultCurr,
      cheque_number: '',
      cheque_date: new Date().toISOString().split('T')[0],
      details_description: '',
      attachments: initialAtts,
      signatory_title: 'LE DIRECTEUR DE PRODUCTION',
    });

    setAttLines(initialAtts);
    setIsCreateMenuOpen(false);
    setIsModalOpen(true);
  };

  const handleSelectForeignOrder = (orderCode: string) => {
    const found = foreignOrders.find((o) => o.n_order === orderCode);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        order_ref: found.n_order,
        foreign_order_id: found.id,
        fournisseur_name: found.supplier_name,
        currency: prev.doc_type === 'APUREMENT_IMPORTATION' ? (found.currency || 'EUR') : 'DA',
        details_description: prev.details_description || `Ce dossier concerne l'importation objet de la commande ${found.n_order} auprès du fournisseur ${found.supplier_name}.`,
      }));
    } else {
      setFormData((prev) => ({ ...prev, order_ref: orderCode }));
    }
  };

  const [expeditionFilter, setExpeditionFilter] = useState<string>('ALL');

  const handleSelectExpedition = (expeditionCode: string) => {
    const found = foreignExpeditions.find((e) => e.expedition_code === expeditionCode);
    if (found) {
      const parentOrder = foreignOrders.find(
        (o) => o.id === found.foreign_order_id || (found.foreign_code && (o.code === found.foreign_code || o.n_order === found.foreign_code))
      );
      const supplierFromList = suppliers.find(
        (s) => s.id === parentOrder?.fournisseur_id || s.id === (parentOrder as any)?.supplier_id || (parentOrder?.supplier_name && s.name.toLowerCase() === parentOrder.supplier_name.toLowerCase())
      );
      const supplierName = parentOrder?.supplier_name || found.supplier_name || supplierFromList?.name || '';
      const orderCode = parentOrder?.n_order || parentOrder?.code || found.foreign_code || '';

      setFormData((prev) => ({
        ...prev,
        expedition_ref: found.expedition_code,
        order_ref: found.expedition_code, // ONLY the expedition reference itself (e.g. S26-31E-2eme)
        foreign_expedition_id: found.id,
        foreign_order_id: found.foreign_order_id,
        fournisseur_name: supplierName,
        beneficiary_name: prev.beneficiary_name || (prev.doc_type === 'DEMANDE_CHEQUE_ETRANGER' ? 'CMA CGM' : supplierName),
        currency: prev.doc_type === 'APUREMENT_IMPORTATION' ? (parentOrder?.currency || 'EUR') : 'DA',
        amount: prev.amount > 0 ? prev.amount : (found.montant || 0),
        details_description: `Ce dossier concerne l'expédition ${found.expedition_code}${found.n_facture ? ` (Facture N° ${found.n_facture})` : ''}${found.n_bl_lta ? ` (BL/LTA: ${found.n_bl_lta})` : ''}${orderCode ? ` objet de la commande ${orderCode}` : ''}${supplierName ? ` auprès du fournisseur ${supplierName}` : ''}.`,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        expedition_ref: expeditionCode,
        order_ref: expeditionCode,
      }));
    }
  };

  const handleEdit = (doc: ForeignFinancialDocument) => {
    setEditingDoc(doc);
    setFormData({
      ref_number: doc.ref_number,
      date: doc.date,
      location: doc.location || 'EL-EULMA',
      doc_type: doc.doc_type,
      objet: doc.objet,
      order_ref: doc.order_ref || '',
      foreign_order_id: doc.foreign_order_id,
      foreign_expedition_id: doc.foreign_expedition_id,
      fournisseur_name: doc.fournisseur_name || '',
      beneficiary_name: doc.beneficiary_name || '',
      amount: doc.amount,
      currency: doc.currency || 'DA',
      cheque_number: doc.cheque_number || '',
      cheque_date: doc.cheque_date || new Date().toISOString().split('T')[0],
      details_description: doc.details_description || '',
      attachments: doc.attachments || [],
      signatory_title: doc.signatory_title || 'LE DIRECTEUR DE PRODUCTION',
    });
    setAttLines(doc.attachments && doc.attachments.length > 0 ? doc.attachments : []);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce document financier étranger ?')) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAtts = attLines.filter((a) => a.doc_number.trim() !== '');

    if (editingDoc) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === editingDoc.id
            ? { ...d, ...formData, attachments: cleanAtts }
            : d
        )
      );
    } else {
      const newDoc: ForeignFinancialDocument = {
        id: Date.now(),
        ...formData,
        attachments: cleanAtts,
      };
      setDocuments((prev) => [newDoc, ...prev]);
    }

    setIsModalOpen(false);
  };

  const addAttLine = (labelPreset?: string) => {
    setAttLines((prev) => [
      ...prev,
      {
        position: prev.length + 1,
        label: labelPreset || 'Document N°',
        doc_number: '',
        doc_date: new Date().toISOString().split('T')[0],
      },
    ]);
  };

  const removeAttLine = (idx: number) => {
    setAttLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateAttLine = (idx: number, field: keyof ForeignDocAttachmentLine, value: any) => {
    setAttLines((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  // Filter logic matching FinancialDocuments.tsx 1-to-1
  const filteredDocs = documents.filter((doc) => {
    if (!selectedDocTypes.includes(doc.doc_type)) return false;

    if (supplierFilter !== 'ALL') {
      const docSupplier = (doc.fournisseur_name || doc.beneficiary_name || '').toLowerCase();
      if (!docSupplier.includes(supplierFilter.toLowerCase())) return false;
    }

    if (expeditionFilter !== 'ALL') {
      const docOrderRef = (doc.order_ref || '').toLowerCase();
      if (!docOrderRef.includes(expeditionFilter.toLowerCase())) return false;
    }

    if (startDate && doc.date < startDate) return false;
    if (endDate && doc.date > endDate) return false;

    if (amountFilter !== 'ALL') {
      const amt = doc.amount || 0;
      if (amountFilter === '1M+' && amt < 1000000) return false;
      if (amountFilter === '500K-1M' && (amt < 500000 || amt >= 1000000)) return false;
      if (amountFilter === 'UNDER_500K' && amt >= 500000) return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchRef = doc.ref_number.toLowerCase().includes(q);
      const matchObjet = doc.objet.toLowerCase().includes(q);
      const matchOrderRef = (doc.order_ref || '').toLowerCase().includes(q);
      const matchFournisseur = (doc.fournisseur_name || '').toLowerCase().includes(q);
      const matchBeneficiary = (doc.beneficiary_name || '').toLowerCase().includes(q);
      if (!matchRef && !matchObjet && !matchOrderRef && !matchFournisseur && !matchBeneficiary) {
        return false;
      }
    }

    return true;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDocTypes, supplierFilter, startDate, endDate, amountFilter, searchQuery]);

  const totalPages = Math.ceil(filteredDocs.length / pageSize) || 1;
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getDocTypeBadge = (type: ForeignFinancialDocType) => {
    switch (type) {
      case 'APUREMENT_IMPORTATION':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">📥 Apurement</span>;
      case 'DEMANDE_CHEQUE_ETRANGER':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-800 border border-blue-300">💳 Chèque Fret</span>;
      case 'DEMANDE_CHEQUE_CERTIFIE_ETRANGER':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-900 border border-amber-300">🏛️ Chèque Certifié Douanes</span>;
      case 'REGULARISATION_CHEQUE_ETRANGER':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-100 text-purple-800 border border-purple-300">🔄 Régul. Chèque Fret</span>;
      case 'REGULARISATION_CHEQUE_CERTIFIE_ETRANGER':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-900 border border-indigo-300">🔄 Régul. Douanes</span>;
    }
  };

  const getDocTypeLabel = (type: ForeignFinancialDocType) => {
    switch (type) {
      case 'APUREMENT_IMPORTATION': return "Apurement d'importation";
      case 'DEMANDE_CHEQUE_ETRANGER': return "Demande de Chèque Fret (Débarquement / Transport)";
      case 'DEMANDE_CHEQUE_CERTIFIE_ETRANGER': return "Chèque Certifié (Douanes Port)";
      case 'REGULARISATION_CHEQUE_ETRANGER': return "Régularisation Chèque Fret";
      case 'REGULARISATION_CHEQUE_CERTIFIE_ETRANGER': return "Régularisation Chèque Certifié Douanes";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full mx-auto">
      {/* Sub-Navigation Tabs: Docs Financiers Locaux & Étrangers */}
      {onSelectTab && (
        <div className="flex items-center space-x-2 bg-slate-200/80 p-1.5 rounded-2xl w-fit shadow-inner">
          <button
            type="button"
            onClick={() => onSelectTab('financial-docs')}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <FileCheck className="w-4 h-4 text-slate-500" />
            <span>📄 Docs Financiers Locaux</span>
          </button>
          <button
            type="button"
            className="px-4 py-2 text-xs font-bold rounded-xl bg-white text-slate-900 shadow-sm flex items-center space-x-2 transition-all cursor-default"
          >
            <Globe className="w-4 h-4 text-sky-600" />
            <span>🌐 Docs Financiers Étrangers</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
            <Globe className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Documents Financiers Étrangers</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Gestion & Impression des Notes pour le Contrôleur Financier (Apurements, Dédouanement & Chèques Importation)
            </p>
          </div>
        </div>

        {canManage && (
          <div className="relative">
            <button
              onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nouveau Document</span>
              <ChevronDown className="w-4 h-4 ml-1 opacity-80" />
            </button>

            {isCreateMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-30 py-2 divide-y divide-slate-100">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Sélectionner le type
                </div>
                {ALL_FOREIGN_DOC_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleOpenCreate(t)}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-sky-50 flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <span>{t.includes('APUREMENT') ? '📥' : t.includes('CERTIFIE') ? '🏛️' : t.includes('REGULARISATION') ? '🔄' : '💳'}</span>
                    <span>{getDocTypeLabel(t)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Realtime Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher N° Réf, Objet, Fournisseur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Multi-Select Type Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)}
                className="px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl hover:bg-slate-50 flex items-center space-x-2 bg-white transition-colors"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Types ({selectedDocTypes.length}/{ALL_FOREIGN_DOC_TYPES.length})</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isTypeFilterOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-30 p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Types de Document</span>
                    <button
                      type="button"
                      onClick={toggleSelectAllTypes}
                      className="text-[11px] font-bold text-sky-600 hover:underline"
                    >
                      {selectedDocTypes.length === ALL_FOREIGN_DOC_TYPES.length ? 'Tout décocher' : 'Tout cocher'}
                    </button>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {ALL_FOREIGN_DOC_TYPES.map((t) => (
                      <label key={t} className="flex items-center space-x-2.5 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedDocTypes.includes(t)}
                          onChange={() => toggleDocType(t)}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span className="font-medium text-slate-700">{getDocTypeLabel(t)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Filters Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors flex items-center space-x-1.5 ${
                showAdvancedFilters
                  ? 'bg-sky-50 text-sky-700 border-sky-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtres Avancés</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Expédition Étrangère</label>
              <select
                value={expeditionFilter}
                onChange={(e) => setExpeditionFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 bg-white outline-none"
              >
                <option value="ALL">Toutes les Expéditions</option>
                {foreignExpeditions.map((exp) => (
                  <option key={exp.id} value={exp.expedition_code}>
                    {exp.expedition_code} ({exp.n_facture || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Fournisseur / Bénéficiaire</label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 bg-white outline-none"
              >
                <option value="ALL">Tous les Fournisseurs</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Intervalle de Date</label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-1/2 px-2 py-1.5 text-xs border border-slate-300 rounded-xl outline-none"
                />
                <span className="text-slate-400 text-xs">à</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-1/2 px-2 py-1.5 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tranche de Montant</label>
              <select
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 bg-white outline-none"
              >
                <option value="ALL">Tous les Montants</option>
                <option value="1M+">Supérieur à 1 000 000 DA / EUR</option>
                <option value="500K-1M">Entre 500 000 DA et 1 000 000 DA</option>
                <option value="UNDER_500K">Moins de 500 000 DA</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Documents Table - Combined Reference & Objet Column */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3.5">N° Référence & Objet</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Type de Document</th>
                <th className="px-4 py-3.5">Expédition Étrangère</th>
                <th className="px-4 py-3.5">Fournisseur / Bénéficiaire</th>
                <th className="px-4 py-3.5 text-right">Montant Total</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                    Aucun document financier étranger ne correspond aux critères.
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Combined N° Référence & Objet Column (with Expedition Ref beside Objet) */}
                    <td className="px-4 py-3.5 space-y-0.5">
                      <div className="font-bold font-mono text-slate-900 text-sm">
                        {doc.ref_number}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium flex items-center flex-wrap gap-1">
                        <span>Objet : <strong className="text-slate-800">{doc.objet}</strong></span>
                        {doc.order_ref && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sky-100 text-sky-800 font-mono">
                            Réf Exp: {doc.order_ref}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      {formatDateDDMMYYYY(doc.date)}
                    </td>
                    <td className="px-4 py-3.5">
                      {getDocTypeBadge(doc.doc_type)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-mono text-[11px]">
                      {doc.order_ref || 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 font-medium">
                      {doc.beneficiary_name || doc.fournisseur_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold font-mono text-slate-900 text-sm whitespace-nowrap">
                      {formatNumber(doc.amount)} {doc.currency || 'DA'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setPrintDoc(doc)}
                          title="Imprimer / Visualiser"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleEdit(doc)}
                              title="Modifier"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              title="Supprimer"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 text-xs">
            <div className="text-slate-500">
              Affichage <span className="font-semibold text-slate-700">{((currentPage - 1) * pageSize) + 1}</span> à <span className="font-semibold text-slate-700">{Math.min(currentPage * pageSize, filteredDocs.length)}</span> sur <span className="font-semibold text-slate-700">{filteredDocs.length}</span> documents financiers étrangers
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                Précédent
              </button>
              <span className="text-slate-700 font-semibold px-2">
                Page {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold flex items-center space-x-2">
                <Globe className="w-5 h-5 text-sky-400" />
                <span>
                  {editingDoc ? 'Modifier Document Financier Étranger' : 'Créer Document Financier Étranger'}
                </span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Type de Document</label>
                  <select
                    value={formData.doc_type}
                    onChange={(e) => setFormData({ ...formData, doc_type: e.target.value as ForeignFinancialDocType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="APUREMENT_IMPORTATION">Apurement d'importation</option>
                    <option value="DEMANDE_CHEQUE_ETRANGER">Demande de Chèque Fret (Débarquement / Transport)</option>
                    <option value="DEMANDE_CHEQUE_CERTIFIE_ETRANGER">Chèque Certifié (Douanes)</option>
                    <option value="REGULARISATION_CHEQUE_ETRANGER">Régularisation Chèque Fret</option>
                    <option value="REGULARISATION_CHEQUE_CERTIFIE_ETRANGER">Régularisation Chèque Douanes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">N° Référence Note</label>
                  <input
                    type="text"
                    required
                    value={formData.ref_number}
                    onChange={(e) => setFormData({ ...formData, ref_number: e.target.value })}
                    placeholder="e.g. 0937 /SENSUS/DP/2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              {/* Mandatory Searchable Expedition Selection (Documents are created per Expedition) */}
              <div className="bg-sky-50/80 p-4 rounded-xl border border-sky-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sky-900 font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5">
                    <Ship className="w-4 h-4 text-sky-600" />
                    <span>Sélectionner l'Expédition Étrangère *</span>
                  </label>
                  <span className="text-[11px] font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                    Documents créés par Expédition
                  </span>
                </div>
                <SearchableSelect
                  options={foreignExpeditionOptions}
                  value={formData.expedition_ref || formData.order_ref || ''}
                  onChange={handleSelectExpedition}
                  placeholder="Rechercher l'expédition (ex: S26-20E-1ere, N° Facture, N° BL/LTA)..."
                />
              </div>

              {/* Auto-derived Expedition Details Summary Card */}
              {formData.order_ref && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-500">Expédition:</span>
                    <span className="font-bold font-mono text-sky-800 bg-sky-100 px-2 py-0.5 rounded">{formData.order_ref}</span>
                  </div>
                  {formData.fournisseur_name && (
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-500">Fournisseur:</span>
                      <span className="font-bold text-slate-800">{formData.fournisseur_name}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Objet de la Note</label>
                  <input
                    type="text"
                    required
                    value={formData.objet}
                    onChange={(e) => setFormData({ ...formData, objet: e.target.value })}
                    placeholder="e.g. Apurement, Demande de chèque..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Référence dans l'En-tête</label>
                  <input
                    type="text"
                    value={formData.order_ref}
                    onChange={(e) => setFormData({ ...formData, order_ref: e.target.value })}
                    placeholder="e.g. S26/05E/1E expedition"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none"
                  />
                </div>
              </div>

              {/* Fournisseur Étranger & Bénéficiaire (Bénéficiaire hidden for Apurement) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Fournisseur Étranger</label>
                  <input
                    type="text"
                    value={formData.fournisseur_name || ''}
                    onChange={(e) => setFormData({ ...formData, fournisseur_name: e.target.value })}
                    placeholder="Nom du fournisseur étranger..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-semibold bg-white outline-none"
                  />
                </div>

                {formData.doc_type !== 'APUREMENT_IMPORTATION' && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Bénéficiaire du Chèque</label>
                    <input
                      type="text"
                      value={formData.beneficiary_name || ''}
                      onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })}
                      placeholder="ex: CMA CGM, Receveur Principal des Douanes..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-semibold bg-white outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Montant & Devise */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Montant</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Devise</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-bold outline-none"
                  >
                    <option value="DA">DA (Dinar Algérien)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              {/* Amount in French Words Preview */}
              {formData.amount > 0 && (
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-sky-900 text-xs">
                  <span className="font-bold">Montant en lettres : </span>
                  <span className="italic">{numberToFrenchWords(formData.amount, formData.currency || 'DA')}</span>
                </div>
              )}

              {/* Cheque Info for Regularisation */}
              {(formData.doc_type === 'REGULARISATION_CHEQUE_ETRANGER' || formData.doc_type === 'REGULARISATION_CHEQUE_CERTIFIE_ETRANGER') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-sky-50/60 p-3 rounded-xl border border-sky-100">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">N° Chèque à régulariser</label>
                    <input
                      type="text"
                      value={formData.cheque_number}
                      onChange={(e) => setFormData({ ...formData, cheque_number: e.target.value })}
                      placeholder="e.g. 4069559"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Date du Chèque</label>
                    <input
                      type="date"
                      value={formData.cheque_date}
                      onChange={(e) => setFormData({ ...formData, cheque_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-800">Pièces Jointes (P.J.)</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => addAttLine('copie D10')}
                      className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-[11px] rounded-lg cursor-pointer"
                    >
                      + Copie D10
                    </button>
                    <button
                      type="button"
                      onClick={() => addAttLine('Bon de réception')}
                      className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-[11px] rounded-lg cursor-pointer"
                    >
                      + BR
                    </button>
                    <button
                      type="button"
                      onClick={() => addAttLine('copie Facture domiciliée')}
                      className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-[11px] rounded-lg cursor-pointer"
                    >
                      + Facture Domiciliée
                    </button>
                    <button
                      type="button"
                      onClick={() => addAttLine('quittance')}
                      className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-[11px] rounded-lg cursor-pointer"
                    >
                      + Quittance
                    </button>
                    <button
                      type="button"
                      onClick={() => addAttLine()}
                      className="px-2.5 py-1 bg-sky-600 text-white font-bold text-[11px] rounded-lg hover:bg-sky-700 transition-colors cursor-pointer"
                    >
                      + Autre P.J.
                    </button>
                  </div>
                </div>

                {attLines.map((line, idx) => (
                  <div key={idx} className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      placeholder="e.g. 01 copie D10 N°"
                      value={line.label}
                      onChange={(e) => updateAttLine(idx, 'label', e.target.value)}
                      className="w-1/3 px-2 py-1 border border-slate-300 rounded-lg outline-none"
                    />
                    <input
                      type="text"
                      placeholder="N° Document"
                      value={line.doc_number}
                      onChange={(e) => updateAttLine(idx, 'doc_number', e.target.value)}
                      className="w-1/3 px-2 py-1 border border-slate-300 rounded-lg font-mono outline-none"
                    />
                    <input
                      type="date"
                      value={line.doc_date || ''}
                      onChange={(e) => updateAttLine(idx, 'doc_date', e.target.value)}
                      className="w-1/4 px-2 py-1 border border-slate-300 rounded-lg outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttLine(idx)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Description Paragraph */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Paragraphe de détails (Corps du texte)</label>
                <textarea
                  rows={3}
                  value={formData.details_description}
                  onChange={(e) => setFormData({ ...formData, details_description: e.target.value })}
                  placeholder="Ce dossier concerne l'expédition de... / Ce chèque est destiné au règlement des frais..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PRINT MODAL VIEW */}
      {printDoc && (
        <PrintForeignFinancialDoc
          document={printDoc}
          onClose={() => setPrintDoc(null)}
        />
      )}

    </div>
  );
};
