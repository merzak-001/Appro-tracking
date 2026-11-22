import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Printer,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Building,
  DollarSign,
  AlertCircle,
  X,
  FileCheck,
  ChevronRight,
  Eye,
  Copy,
  ChevronDown,
  Globe,
} from 'lucide-react';
import {
  FinancialDocument,
  FinancialDocType,
  FinancialDocInvoiceLine,
  User,
  LocalOrder,
  ForeignOrder,
  ForeignExpedition,
  Supplier,
} from '../types';
import { formatNumber } from '../utils/numberUtils';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { numberToFrenchWords } from '../utils/numberToFrenchWords';
import { PrintFinancialDoc } from './PrintFinancialDoc';
import { SearchableSelect } from './SearchableSelect';

interface FinancialDocumentsProps {
  currentUser: User;
  localOrders?: LocalOrder[];
  foreignOrders?: ForeignOrder[];
  foreignExpeditions?: ForeignExpedition[];
  suppliers?: Supplier[];
  onSelectTab?: (tab: string) => void;
}

export const FinancialDocuments: React.FC<FinancialDocumentsProps> = ({
  currentUser,
  localOrders = [],
  foreignOrders = [],
  foreignExpeditions: propExpeditions = [],
  suppliers = [],
  onSelectTab,
}) => {
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [expeditionsList, setExpeditionsList] = useState<ForeignExpedition[]>(propExpeditions);
  const [loading, setLoading] = useState(true);
  const ALL_DOC_TYPES: FinancialDocType[] = [
    'DEMANDE_CHEQUE',
    'DEMANDE_CHEQUE_CERTIFIE',
    'DEMANDE_VIREMENT',
    'REGLEMENT_FACTURE',
    'REGULARISATION_CHEQUE',
    'REGULARISATION_CHEQUE_CERTIFIE',
  ];

  const [selectedDocTypes, setSelectedDocTypes] = useState<FinancialDocType[]>(ALL_DOC_TYPES);
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [amountFilter, setAmountFilter] = useState<'ALL' | '1M+' | '500K-1M' | 'UNDER_500K'>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const toggleDocType = (type: FinancialDocType) => {
    setSelectedDocTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const toggleSelectAllTypes = () => {
    if (selectedDocTypes.length === ALL_DOC_TYPES.length) {
      setSelectedDocTypes([]);
    } else {
      setSelectedDocTypes(ALL_DOC_TYPES);
    }
  };

  // Sync propExpeditions or fetch from backend if empty
  useEffect(() => {
    if (propExpeditions && propExpeditions.length > 0) {
      setExpeditionsList(propExpeditions);
    } else {
      fetch('/api/foreign-expeditions')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setExpeditionsList(data))
        .catch((err) => console.error('Error fetching expeditions fallback:', err));
    }
  }, [propExpeditions]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<FinancialDocument | null>(null);
  const [printDoc, setPrintDoc] = useState<FinancialDocument | null>(null);
  const [isManualSupplier, setIsManualSupplier] = useState(false);

  // Supplier options from DB
  const supplierSelectOptions = suppliers.map((s) => ({
    value: s.name,
    label: s.name,
    subLabel: s.country ? `${s.country}${s.rc ? ` • RC: ${s.rc}` : ''}` : (s.rc ? `RC: ${s.rc}` : undefined),
    badge: s.nif ? `NIF: ${s.nif}` : undefined,
  }));

  // Local Order options from DB
  const localOrderSelectOptions = localOrders.map((o) => ({
    value: o.n_order,
    label: `${o.n_order} - ${o.objet_de_commande || ''}`,
    subLabel: `Fournisseur: ${o.supplier_name || 'N/A'} • (${formatNumber(o.total_ttc)} DA)`,
    badge: 'BC Local',
  }));

  // Foreign Expedition options from DB
  const expeditionSelectOptions = (expeditionsList || []).map((e) => ({
    value: e.expedition_code || `EXP-${e.id}`,
    label: `${e.expedition_code || `EXP-${e.id}`} ${e.invoice_number ? `(Facture: ${e.invoice_number})` : ''}`,
    subLabel: `Fournisseur: ${e.supplier_name || 'N/A'} • Statut: ${e.status || 'En transit'}`,
    badge: 'Expédition Étrangère',
  }));

  // Form State
  const [formData, setFormData] = useState<Omit<FinancialDocument, 'id'>>({
    doc_type: 'DEMANDE_CHEQUE',
    ref_number: '',
    date: new Date().toISOString().split('T')[0],
    location: 'EL- EULMA',
    department: 'DP',
    signatory_title: 'LE DIRECTEUR DE PRODUCTION',
    objet: 'Demande de Chèque',
    beneficiary_name: '',
    amount: 0,
    amount_in_words: '',
    description: '',
    order_ref: '',
    fournisseur_name: '',
    mode_paiement: 'chèque',
    cheque_number: '',
    cheque_date: new Date().toISOString().split('T')[0],
    bank_name: '',
    bank_account_number: '',
    pj_facture_ordonnancee: true,
    pj_bon_arrivee: '',
    pj_commande_copy: '',
    status: 'Brouillon',
    invoice_lines: [],
  });

  const canManage = currentUser.role === 'Admin' || currentUser.role === 'SAI' || currentUser.role === 'Chef Service';
  const isChefService = currentUser.role === 'Chef Service' || currentUser.role === 'Admin' || currentUser.role === 'SAI';

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/financial-documents');
      if (res.ok) {
        const data = await res.json();
        const normalized = (data || []).map((doc: FinancialDocument) => {
          let docType = doc.doc_type;
          const objetLower = (doc.objet || '').toLowerCase();
          const modeLower = (doc.mode_paiement || '').toLowerCase();
          if (docType === 'DEMANDE_CHEQUE' && (objetLower.includes('certifi') || modeLower.includes('certifi'))) {
            docType = 'DEMANDE_CHEQUE_CERTIFIE';
          } else if (docType === 'REGULARISATION_CHEQUE' && (objetLower.includes('certifi') || modeLower.includes('certifi'))) {
            docType = 'REGULARISATION_CHEQUE_CERTIFIE';
          }
          return { ...doc, doc_type: docType };
        });
        setDocuments(normalized);
      }
    } catch (err) {
      console.error('Error fetching financial documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Close modal or print preview on Escape (Echap) keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (printDoc) {
          setPrintDoc(null);
        } else if (isModalOpen) {
          setIsModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, printDoc]);

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

  // Fetch next ref number when opening create modal
  const handleOpenCreateModal = async (type: FinancialDocType) => {
    setEditingDoc(null);
    let nextRef = '';
    try {
      const res = await fetch('/api/financial-documents/next-number?dept=DP');
      if (res.ok) {
        const data = await res.json();
        nextRef = data.nextRef;
      }
    } catch (e) {
      console.error(e);
    }

    const defaultObjet =
      type === 'DEMANDE_CHEQUE'
        ? 'Demande de Chèque'
        : type === 'DEMANDE_CHEQUE_CERTIFIE'
        ? 'Demande de Chèque Certifié'
        : type === 'DEMANDE_VIREMENT'
        ? 'Demande de Virement'
        : type === 'REGULARISATION_CHEQUE'
        ? 'Régularisation de chèque'
        : type === 'REGULARISATION_CHEQUE_CERTIFIE'
        ? 'Régularisation de chèque certifié'
        : 'Règlement de facture';

    const defaultMode =
      type === 'DEMANDE_CHEQUE'
        ? 'chèque'
        : type === 'DEMANDE_CHEQUE_CERTIFIE' || type === 'REGULARISATION_CHEQUE_CERTIFIE'
        ? 'chèque certifié'
        : type === 'DEMANDE_VIREMENT' || type === 'REGLEMENT_FACTURE'
        ? 'virement'
        : 'chèque';

    setFormData({
      doc_type: type,
      ref_number: nextRef || `0001/SENSUS/DP/${new Date().getFullYear()}`,
      date: new Date().toISOString().split('T')[0],
      location: 'EL- EULMA',
      department: 'DP',
      signatory_title: 'LE DIRECTEUR DE PRODUCTION',
      objet: defaultObjet,
      beneficiary_name: '',
      amount: 0,
      amount_in_words: '',
      description: '',
      order_ref: '',
      fournisseur_name: '',
      mode_paiement: defaultMode,
      cheque_number: '',
      cheque_date: new Date().toISOString().split('T')[0],
      bank_name: '',
      bank_account_number: '',
      pj_facture_ordonnancee: true,
      pj_bon_arrivee: '',
      pj_commande_copy: '',
      status: 'Brouillon',
      invoice_lines:
        type === 'REGLEMENT_FACTURE' || type === 'REGULARISATION_CHEQUE' || type === 'REGULARISATION_CHEQUE_CERTIFIE'
          ? [
              {
                position: 1,
                facture_number: '',
                facture_date: new Date().toISOString().split('T')[0],
                fournisseur_name: '',
                amount: 0,
              },
            ]
          : [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (doc: FinancialDocument) => {
    setEditingDoc(doc);
    setFormData({
      doc_type: doc.doc_type,
      ref_number: doc.ref_number,
      date: doc.date,
      location: doc.location,
      department: doc.department,
      signatory_title: doc.signatory_title,
      objet: doc.objet,
      beneficiary_name: doc.beneficiary_name || '',
      amount: doc.amount || 0,
      amount_in_words: doc.amount_in_words || '',
      description: doc.description || '',
      order_ref: doc.order_ref || '',
      fournisseur_name: doc.fournisseur_name || '',
      mode_paiement: doc.mode_paiement || 'chèque',
      cheque_number: doc.cheque_number || '',
      cheque_date: doc.cheque_date || doc.date,
      bank_name: doc.bank_name || '',
      bank_account_number: doc.bank_account_number || '',
      pj_facture_ordonnancee: doc.pj_facture_ordonnancee !== false,
      pj_bon_arrivee: doc.pj_bon_arrivee || '',
      pj_commande_copy: doc.pj_commande_copy || '',
      status: doc.status || 'Brouillon',
      invoice_lines: doc.invoice_lines || [],
    });
    setIsModalOpen(true);
  };

  const handleDuplicateDoc = async (doc: FinancialDocument) => {
    setEditingDoc(null);
    let nextRef = '';
    try {
      const res = await fetch('/api/financial-documents/next-number?dept=DP');
      if (res.ok) {
        const data = await res.json();
        nextRef = data.nextRef;
      }
    } catch (e) {
      console.error(e);
    }

    setFormData({
      doc_type: doc.doc_type,
      ref_number: nextRef || `0001/SENSUS/DP/${new Date().getFullYear()}`,
      date: new Date().toISOString().split('T')[0],
      location: doc.location || 'EL- EULMA',
      department: doc.department || 'DP',
      signatory_title: doc.signatory_title || 'LE DIRECTEUR DE PRODUCTION',
      objet: doc.objet || '',
      beneficiary_name: doc.beneficiary_name || '',
      amount: doc.amount || 0,
      amount_in_words: doc.amount_in_words || '',
      description: doc.description || '',
      order_ref: doc.order_ref || '',
      fournisseur_name: doc.fournisseur_name || '',
      mode_paiement: doc.mode_paiement || 'chèque',
      cheque_number: doc.cheque_number || '',
      cheque_date: doc.cheque_date || doc.date,
      pj_facture_ordonnancee: doc.pj_facture_ordonnancee !== false,
      pj_bon_arrivee: doc.pj_bon_arrivee || '',
      pj_commande_copy: doc.pj_commande_copy || '',
      status: 'Brouillon',
      invoice_lines: doc.invoice_lines
        ? doc.invoice_lines.map((l, i) => ({
            ...l,
            id: undefined,
            document_id: undefined,
            position: i + 1,
          }))
        : [],
    });
    setIsModalOpen(true);
  };

  // Detect duplicate invoices for the same supplier across all existing documents
  const getDuplicateInvoiceWarnings = () => {
    if (!formData.invoice_lines || formData.invoice_lines.length === 0) return [];
    
    const warnings: {
      facture_number: string;
      fournisseur_name: string;
      existing_ref_number: string;
    }[] = [];

    formData.invoice_lines.forEach((line) => {
      const invNum = (line.facture_number || '').trim();
      if (!invNum) return;

      const lineSupplier = (line.fournisseur_name || formData.fournisseur_name || formData.beneficiary_name || '').trim();
      const lineSupplierLower = lineSupplier.toLowerCase();

      documents.forEach((existingDoc) => {
        if (editingDoc && existingDoc.id === editingDoc.id) return;

        const existingDocSupplier = (existingDoc.fournisseur_name || existingDoc.beneficiary_name || '').trim().toLowerCase();
        const isSameSupplier = !lineSupplierLower || !existingDocSupplier || lineSupplierLower === existingDocSupplier;

        if (isSameSupplier && existingDoc.invoice_lines && existingDoc.invoice_lines.length > 0) {
          const matchLine = existingDoc.invoice_lines.find(
            (exLine) => (exLine.facture_number || '').trim().toLowerCase() === invNum.toLowerCase()
          );

          if (matchLine) {
            const alreadyAdded = warnings.some(
              (w) => w.facture_number.toLowerCase() === invNum.toLowerCase() && w.existing_ref_number === existingDoc.ref_number
            );
            if (!alreadyAdded) {
              warnings.push({
                facture_number: invNum,
                fournisseur_name: lineSupplier || existingDoc.fournisseur_name || existingDoc.beneficiary_name || 'Fournisseur',
                existing_ref_number: existingDoc.ref_number,
              });
            }
          }
        }
      });
    });

    return warnings;
  };

  const duplicateWarnings = getDuplicateInvoiceWarnings();

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document financier ?')) return;
    try {
      const res = await fetch(`/api/financial-documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDocuments();
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  // Auto calculate French words when amount changes in form
  const handleAmountChange = (val: number) => {
    const french = numberToFrenchWords(val);
    setFormData((prev) => ({
      ...prev,
      amount: val,
      amount_in_words: french,
    }));
  };

  // Select an existing order to auto-populate or append to form
  const handleSelectOrderRef = (orderCode: string) => {
    if (!orderCode) return;

    const currentRefs = formData.order_ref
      ? formData.order_ref.split(',').map((r) => r.trim()).filter(Boolean)
      : [];

    const updatedRefs = currentRefs.includes(orderCode)
      ? currentRefs
      : [...currentRefs, orderCode];

    const joinedRefs = updatedRefs.join(', ');

    const local = localOrders.find((o) => o.n_order === orderCode);
    const foreign = foreignOrders.find((o) => o.code === orderCode);

    let supplierName = formData.fournisseur_name || '';
    if (!supplierName) {
      if (local) {
        const sup = suppliers.find((s) => s.id === local.fournisseur_id);
        supplierName = sup ? sup.name : '';
      } else if (foreign) {
        const sup = suppliers.find((s) => s.id === foreign.fournisseur_id);
        supplierName = sup ? sup.name : '';
      }
    }

    const pjCommande = updatedRefs.length === 1
      ? `01 Copie de commande N° ${updatedRefs[0]}.`
      : `Copie des commandes N° ${joinedRefs}.`;

    const descriptionText = updatedRefs.length === 1
      ? `Facture et bon de livraison concernant l'achat, bon de commande N° ${joinedRefs}.`
      : `Factures et bons de livraison concernant les achats, bons de commande N° ${joinedRefs}.`;

    setFormData((prev) => {
      const isReglement = prev.doc_type === 'REGLEMENT_FACTURE';
      return {
        ...prev,
        order_ref: joinedRefs,
        fournisseur_name: supplierName || prev.fournisseur_name,
        beneficiary_name: supplierName || prev.beneficiary_name,
        description: prev.description || descriptionText,
        pj_commande_copy: pjCommande,
        invoice_lines:
          isReglement && prev.invoice_lines && prev.invoice_lines.length > 0
            ? prev.invoice_lines.map((l) => ({
                ...l,
                fournisseur_name: supplierName || l.fournisseur_name,
              }))
            : prev.invoice_lines,
      };
    });
  };

  const handleRemoveOrderRef = (refToRemove: string) => {
    const currentRefs = formData.order_ref
      ? formData.order_ref.split(',').map((r) => r.trim()).filter((r) => r !== refToRemove)
      : [];

    const joinedRefs = currentRefs.join(', ');
    const pjCommande = currentRefs.length === 0
      ? ''
      : currentRefs.length === 1
      ? `01 Copie de commande N° ${currentRefs[0]}.`
      : `Copie des commandes N° ${joinedRefs}.`;

    setFormData((prev) => ({
      ...prev,
      order_ref: joinedRefs,
      pj_commande_copy: pjCommande,
    }));
  };

  // Add/remove dynamic invoice lines
  const handleAddInvoiceLine = () => {
    setFormData((prev) => ({
      ...prev,
      invoice_lines: [
        ...(prev.invoice_lines || []),
        {
          position: (prev.invoice_lines?.length || 0) + 1,
          facture_number: '',
          facture_date: new Date().toISOString().split('T')[0],
          fournisseur_name: prev.fournisseur_name || '',
          amount: 0,
        },
      ],
    }));
  };

  const handleRemoveInvoiceLine = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      invoice_lines: (prev.invoice_lines || [])
        .filter((_, i) => i !== idx)
        .map((l, newIdx) => ({ ...l, position: newIdx + 1 })),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (duplicateWarnings.length > 0) {
      const warningText = duplicateWarnings
        .map(
          (w) =>
            `• Facture N° ${w.facture_number} pour "${w.fournisseur_name}" (Existe déjà dans le document ${w.existing_ref_number})`
        )
        .join('\n');

      const confirmed = window.confirm(
        `⚠️ ATTENTION : FACTURE(S) EN DOUBLE DÉTECTÉE(S) !\n\n` +
          `La/les facture(s) suivante(s) est/sont déjà enregistrée(s) dans le système :\n\n` +
          `${warningText}\n\n` +
          `Voulez-vous vraiment continuer et enregistrer ce document avec des factures en double ?`
      );

      if (!confirmed) return;
    }

    try {
      const url = editingDoc
        ? `/api/financial-documents/${editingDoc.id}`
        : '/api/financial-documents';
      const method = editingDoc ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        invoice_lines: (formData.invoice_lines || []).map((line) => ({
          ...line,
          fournisseur_name: line.fournisseur_name || formData.fournisseur_name || formData.beneficiary_name || '',
        })),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchDocuments();
      } else {
        const errData = await res.json();
        alert(`Erreur: ${errData.error || 'Impossible d\'enregistrer'}`);
      }
    } catch (err) {
      console.error('Error saving document:', err);
    }
  };

  // Extract unique supplier/beneficiary options for filtering
  const uniqueSuppliers = Array.from(
    new Set(
      documents
        .map((d) => d.beneficiary_name || d.fournisseur_name)
        .concat(documents.flatMap((d) => (d.invoice_lines || []).map((l) => l.fournisseur_name)))
        .concat(suppliers.map((s) => s.name))
        .filter(Boolean) as string[]
    )
  ).sort();

  const isAnyFilterActive =
    selectedDocTypes.length < ALL_DOC_TYPES.length ||
    supplierFilter !== 'ALL' ||
    startDate !== '' ||
    endDate !== '' ||
    amountFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const resetAllFilters = () => {
    setSelectedDocTypes(ALL_DOC_TYPES);
    setSupplierFilter('ALL');
    setStartDate('');
    setEndDate('');
    setAmountFilter('ALL');
    setSearchQuery('');
  };

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    // Multi-select doc type filter
    if (selectedDocTypes.length > 0 && selectedDocTypes.length < ALL_DOC_TYPES.length) {
      if (!selectedDocTypes.includes(doc.doc_type)) return false;
    } else if (selectedDocTypes.length === 0) {
      return false;
    }

    // Supplier / Beneficiary filter
    if (supplierFilter !== 'ALL') {
      const matchBeneficiary = doc.beneficiary_name === supplierFilter;
      const matchSupplier = doc.fournisseur_name === supplierFilter;
      const matchLineSupplier = (doc.invoice_lines || []).some((l) => l.fournisseur_name === supplierFilter);
      if (!matchBeneficiary && !matchSupplier && !matchLineSupplier) return false;
    }

    // Date range filter
    if (startDate && doc.date < startDate) return false;
    if (endDate && doc.date > endDate) return false;

    // Amount range filter
    const docAmount =
      doc.doc_type === 'REGLEMENT_FACTURE' && doc.invoice_lines && doc.invoice_lines.length > 0
        ? doc.invoice_lines.reduce((s, l) => s + l.amount, 0)
        : doc.amount || 0;

    if (amountFilter === '1M+' && docAmount < 1000000) return false;
    if (amountFilter === '500K-1M' && (docAmount < 500000 || docAmount > 1000000)) return false;
    if (amountFilter === 'UNDER_500K' && docAmount >= 500000) return false;

    // Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchRef = doc.ref_number.toLowerCase().includes(q);
      const matchObjet = doc.objet.toLowerCase().includes(q);
      const matchBeneficiary = (doc.beneficiary_name || '').toLowerCase().includes(q);
      const matchSupplier = (doc.fournisseur_name || '').toLowerCase().includes(q);
      const matchOrder = (doc.order_ref || '').toLowerCase().includes(q);
      const matchCheque = (doc.cheque_number || '').toLowerCase().includes(q);
      const matchBank = (doc.bank_name || '').toLowerCase().includes(q) || (doc.bank_account_number || '').toLowerCase().includes(q);
      return matchRef || matchObjet || matchBeneficiary || matchSupplier || matchOrder || matchCheque || matchBank;
    }
    return true;
  });

  const totalAmount = filteredDocs.reduce((sum, d) => {
    if (d.doc_type === 'REGLEMENT_FACTURE' && d.invoice_lines && d.invoice_lines.length > 0) {
      return sum + d.invoice_lines.reduce((lSum, l) => lSum + l.amount, 0);
    }
    return sum + (d.amount || 0);
  }, 0);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDocTypes, supplierFilter, startDate, endDate, amountFilter, searchQuery]);

  const totalPages = Math.ceil(filteredDocs.length / pageSize) || 1;
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4 sm:space-y-6 w-full mx-auto">
      {/* Sub-Navigation Tabs: Docs Financiers Locaux & Étrangers */}
      {onSelectTab && (
        <div className="flex items-center space-x-2 bg-slate-200/80 p-1.5 rounded-2xl w-fit shadow-inner">
          <button
            type="button"
            className="px-4 py-2 text-xs font-bold rounded-xl bg-white text-slate-900 shadow-sm flex items-center space-x-2 transition-all cursor-default"
          >
            <FileCheck className="w-4 h-4 text-blue-600" />
            <span>📄 Docs Financiers Locaux</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('foreign-financial-docs')}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Globe className="w-4 h-4 text-slate-500" />
            <span>🌐 Docs Financiers Étrangers</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Documents Financiers</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Gestion et impression des Notes pour le Contrôleur Financier (Chèques, Chèques Certifiés, Virements & Règlements)
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="relative">
            <button
              onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
              className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs md:text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Document</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCreateMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCreateMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsCreateMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-30 p-2 space-y-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 font-bold uppercase text-[10px] tracking-wider text-slate-400">
                    💳 Demandes de Paiement
                  </div>
                  <button
                    onClick={() => { handleOpenCreateModal('DEMANDE_CHEQUE'); setIsCreateMenuOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 transition-colors font-medium"
                  >
                    <span>Demande de Chèque Normal</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Chèque</span>
                  </button>
                  <button
                    onClick={() => { handleOpenCreateModal('DEMANDE_CHEQUE_CERTIFIE'); setIsCreateMenuOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-900 transition-colors font-medium"
                  >
                    <span>Demande de Chèque Certifié</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">Certifié</span>
                  </button>
                  <button
                    onClick={() => { handleOpenCreateModal('DEMANDE_VIREMENT'); setIsCreateMenuOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-sky-50 text-slate-700 hover:text-sky-900 transition-colors font-medium"
                  >
                    <span>Demande de Virement Bancaire</span>
                    <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-bold">Virement</span>
                  </button>

                  <div className="px-3 py-1.5 font-bold uppercase text-[10px] tracking-wider text-slate-400 pt-1 border-t border-slate-100">
                    📄 Règlements de Facture
                  </div>
                  <button
                    onClick={() => { handleOpenCreateModal('REGLEMENT_FACTURE'); setIsCreateMenuOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 transition-colors font-medium"
                  >
                    <span>Règlement de Facture</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">Règlement</span>
                  </button>

                  <div className="px-3 py-1.5 font-bold uppercase text-[10px] tracking-wider text-slate-400 pt-1 border-t border-slate-100">
                    🔄 Régularisations
                  </div>
                  <button
                    onClick={() => { handleOpenCreateModal('REGULARISATION_CHEQUE'); setIsCreateMenuOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-purple-50 text-slate-700 hover:text-purple-900 transition-colors font-medium"
                  >
                    <span>Régularisation de Chèque Normal</span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">Régul.</span>
                  </button>
                  <button
                    onClick={() => { handleOpenCreateModal('REGULARISATION_CHEQUE_CERTIFIE'); setIsCreateMenuOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-teal-50 text-slate-700 hover:text-teal-900 transition-colors font-medium"
                  >
                    <span>Régularisation de Chèque Certifié</span>
                    <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">Régul. Certifié</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Docs</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">{documents.length}</h3>
          </div>
          <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Chèques</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {documents.filter((d) => d.doc_type === 'DEMANDE_CHEQUE').length}
            </h3>
          </div>
          <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Certifiés</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {documents.filter((d) => d.doc_type === 'DEMANDE_CHEQUE_CERTIFIE').length}
            </h3>
          </div>
          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-wider">Virements</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {documents.filter((d) => d.doc_type === 'DEMANDE_VIREMENT').length}
            </h3>
          </div>
          <div className="w-8 h-8 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center shrink-0">
            <Building className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">Règlements</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {documents.filter((d) => d.doc_type === 'REGLEMENT_FACTURE').length}
            </h3>
          </div>
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <FileCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">Régul. Chèques</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {documents.filter((d) => d.doc_type === 'REGULARISATION_CHEQUE').length}
            </h3>
          </div>
          <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">Régul. Certifiés</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {documents.filter((d) => d.doc_type === 'REGULARISATION_CHEQUE_CERTIFIE').length}
            </h3>
          </div>
          <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Multi-Select Type Filter & Status & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Document Type Multi-Select Dropdown Filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)}
            className="flex items-center space-x-2 px-3.5 py-2 text-xs md:text-sm font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 transition-all cursor-pointer shadow-xs"
          >
            <Filter className="w-4 h-4 text-blue-600" />
            <span>
              {selectedDocTypes.length === ALL_DOC_TYPES.length
                ? `Tous les Types (${documents.length})`
                : selectedDocTypes.length === 0
                ? 'Aucun Type Sélectionné'
                : `${selectedDocTypes.length} Type(s) Sélectionné(s)`}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isTypeFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTypeFilterOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setIsTypeFilterOpen(false)} />
              <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-30 p-3 space-y-2 text-xs animate-in fade-in zoom-in-95 duration-150">
                {/* Header: Select All / Deselect All */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Filtrer par Type</span>
                  <button
                    type="button"
                    onClick={toggleSelectAllTypes}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    {selectedDocTypes.length === ALL_DOC_TYPES.length ? 'Tout désélectionner' : 'Sélectionner Tout'}
                  </button>
                </div>

                {/* Checkboxes List for Document Types */}
                <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                  <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedDocTypes.includes('DEMANDE_CHEQUE')}
                      onChange={() => toggleDocType('DEMANDE_CHEQUE')}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="flex-1 font-medium text-slate-700">💳 Demande de Chèque</span>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                      {documents.filter((d) => d.doc_type === 'DEMANDE_CHEQUE').length}
                    </span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedDocTypes.includes('DEMANDE_CHEQUE_CERTIFIE')}
                      onChange={() => toggleDocType('DEMANDE_CHEQUE_CERTIFIE')}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="flex-1 font-medium text-slate-700">📜 Chèque Certifié</span>
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                      {documents.filter((d) => d.doc_type === 'DEMANDE_CHEQUE_CERTIFIE').length}
                    </span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedDocTypes.includes('DEMANDE_VIREMENT')}
                      onChange={() => toggleDocType('DEMANDE_VIREMENT')}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                    />
                    <span className="flex-1 font-medium text-slate-700">🏦 Demande de Virement</span>
                    <span className="text-[10px] font-bold bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded">
                      {documents.filter((d) => d.doc_type === 'DEMANDE_VIREMENT').length}
                    </span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedDocTypes.includes('REGLEMENT_FACTURE')}
                      onChange={() => toggleDocType('REGLEMENT_FACTURE')}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="flex-1 font-medium text-slate-700">📄 Règlement de Facture</span>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                      {documents.filter((d) => d.doc_type === 'REGLEMENT_FACTURE').length}
                    </span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedDocTypes.includes('REGULARISATION_CHEQUE')}
                      onChange={() => toggleDocType('REGULARISATION_CHEQUE')}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="flex-1 font-medium text-slate-700">🔄 Régularisation Chèque</span>
                    <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                      {documents.filter((d) => d.doc_type === 'REGULARISATION_CHEQUE').length}
                    </span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedDocTypes.includes('REGULARISATION_CHEQUE_CERTIFIE')}
                      onChange={() => toggleDocType('REGULARISATION_CHEQUE_CERTIFIE')}
                      className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className="flex-1 font-medium text-slate-700">📜🔄 Régul. Chèque Certifié</span>
                    <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">
                      {documents.filter((d) => d.doc_type === 'REGULARISATION_CHEQUE_CERTIFIE').length}
                    </span>
                  </label>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-medium">{filteredDocs.length} document(s)</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDocTypes(ALL_DOC_TYPES)}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Supplier Filter Select */}
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3.5 py-2 text-xs md:text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 max-w-[200px] truncate cursor-pointer"
          >
            <option value="ALL">Tous les Fournisseurs</option>
            {uniqueSuppliers.map((s) => (
              <option key={s} value={s}>
                🏢 {s}
              </option>
            ))}
          </select>

          {/* Toggle Advanced Filters (Date, Amount) */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3.5 py-2 text-xs md:text-sm font-bold rounded-xl border transition-all flex items-center space-x-1.5 cursor-pointer ${
              showAdvancedFilters || startDate || endDate || amountFilter !== 'ALL'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtres Avancés</span>
            {(startDate || endDate || amountFilter !== 'ALL') && (
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            )}
          </button>

          {/* Search Input Bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher Ref, Objet, Fournisseur, Chèque..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-200/50"
                title="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Reset All Filters Button */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
              title="Réinitialiser tous les filtres"
            >
              <X className="w-3.5 h-3.5" />
              <span>Effacer filtres</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Advanced Filters Drawer */}
      {showAdvancedFilters && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              📅 Date Début (Du)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              📅 Date Fin (Au)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              💰 Tranche de Montant
            </label>
            <select
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            >
              <option value="ALL">Tous les Montants</option>
              <option value="1M+">≥ 1,000,000 DA (Fort montant)</option>
              <option value="500K-1M">500,000 DA à 1,000,000 DA</option>
              <option value="UNDER_500K">&lt; 500,000 DA</option>
            </select>
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Chargement des documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-600">Aucun document financier trouvé.</p>
            <p className="text-xs text-slate-400 mt-1">Créez votre première demande de chèque, règlement de facture ou régularisation de chèque.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[1100px] text-left border-collapse">
              <thead>
<tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6 min-w-[260px]">Référence & Objet</th>
                  <th className="py-4 px-6 min-w-[220px]">Type de Document</th>
                  <th className="py-4 px-6 min-w-[220px] whitespace-nowrap">Bénéficiaire / Fournisseur</th>
                  <th className="py-4 px-6 min-w-[130px] whitespace-nowrap">Date</th>
                  <th className="py-4 px-6 min-w-[160px] whitespace-nowrap">Montant (DA)</th>
                  <th className="py-4 px-6 text-right min-w-[150px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedDocs.map((doc) => {
                  const docAmount =
                    doc.doc_type === 'REGLEMENT_FACTURE' && doc.invoice_lines && doc.invoice_lines.length > 0
                      ? doc.invoice_lines.reduce((sum, l) => sum + l.amount, 0)
                      : doc.amount || 0;

                  const badgeStyle =
                    doc.doc_type === 'DEMANDE_CHEQUE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : doc.doc_type === 'DEMANDE_CHEQUE_CERTIFIE'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/60 font-bold'
                      : doc.doc_type === 'DEMANDE_VIREMENT'
                      ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                      : doc.doc_type === 'REGULARISATION_CHEQUE'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                      : doc.doc_type === 'REGULARISATION_CHEQUE_CERTIFIE'
                      ? 'bg-teal-50 text-teal-700 border border-teal-200/60 font-bold'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60';

                  const badgeText =
                    doc.doc_type === 'DEMANDE_CHEQUE'
                      ? 'Chèque'
                      : doc.doc_type === 'DEMANDE_CHEQUE_CERTIFIE'
                      ? 'Chèque Certifié'
                      : doc.doc_type === 'DEMANDE_VIREMENT'
                      ? 'Virement'
                      : doc.doc_type === 'REGULARISATION_CHEQUE'
                      ? 'Régularisation'
                      : doc.doc_type === 'REGULARISATION_CHEQUE_CERTIFIE'
                      ? 'Régul. Chèque Certifié'
                      : 'Règlement de Facture';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 font-mono text-xs text-blue-700">{doc.ref_number}</div>
                        <div className="text-slate-600 text-xs mt-0.5 line-clamp-1 max-w-md font-medium" title={doc.objet}>
                          {doc.objet}
                        </div>
                        {doc.order_ref && (
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">Ref Commande: {doc.order_ref}</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeStyle}`}>
                          {badgeText}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800">
                          {doc.beneficiary_name || doc.fournisseur_name || (doc.invoice_lines && doc.invoice_lines[0]?.fournisseur_name) || 'N/A'}
                        </div>
                        {doc.invoice_lines && doc.invoice_lines.length > 1 && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            +{doc.invoice_lines.length - 1} autre(s) fournisseur(s)
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium text-xs whitespace-nowrap">
                        {formatDateDDMMYYYY(doc.date)}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900 font-mono text-xs whitespace-nowrap">
                        {formatNumber(docAmount)} DA
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setPrintDoc(doc)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                            title="Imprimer / Aperçu PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleDuplicateDoc(doc)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Dupliquer ce document"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(doc)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200/80 text-xs">
            <div className="text-slate-500">
              Affichage <span className="font-semibold text-slate-700">{((currentPage - 1) * pageSize) + 1}</span> à <span className="font-semibold text-slate-700">{Math.min(currentPage * pageSize, filteredDocs.length)}</span> sur <span className="font-semibold text-slate-700">{filteredDocs.length}</span> documents financiers
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">
                  {editingDoc ? 'Modifier le Document Financier' : 'Créer un NOUVEAU Document Financier'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Duplicate Invoice Alert Banner */}
              {duplicateWarnings.length > 0 && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-1 text-amber-900">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span>Avertissement : Facture(s) déjà enregistrée(s) dans le système !</span>
                  </div>
                  {duplicateWarnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-800 font-medium pl-7">
                      La facture <strong className="font-mono font-bold text-amber-950">N° {w.facture_number}</strong> pour le fournisseur <strong className="uppercase font-bold text-amber-950">{w.fournisseur_name}</strong> a déjà été enregistrée dans le document <strong className="font-mono font-bold text-amber-950">{w.existing_ref_number}</strong>.
                    </p>
                  ))}
                </div>
              )}
              


              {/* Type Switcher */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 p-1.5 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      doc_type: 'DEMANDE_CHEQUE',
                      objet: 'Demande de Chèque',
                      mode_paiement: 'chèque',
                      invoice_lines: [],
                    }))
                  }
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                    formData.doc_type === 'DEMANDE_CHEQUE'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  💳 Chèque
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      doc_type: 'DEMANDE_CHEQUE_CERTIFIE',
                      objet: 'Demande de Chèque Certifié',
                      mode_paiement: 'chèque certifié',
                      invoice_lines: [],
                    }))
                  }
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                    formData.doc_type === 'DEMANDE_CHEQUE_CERTIFIE'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📜 Chèque Certifié
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      doc_type: 'DEMANDE_VIREMENT',
                      objet: 'Demande de Virement',
                      mode_paiement: 'virement',
                      invoice_lines: [],
                    }))
                  }
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                    formData.doc_type === 'DEMANDE_VIREMENT'
                      ? 'bg-white text-sky-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏦 Virement
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      doc_type: 'REGLEMENT_FACTURE',
                      mode_paiement: 'virement',
                      invoice_lines: prev.invoice_lines.length > 0 ? prev.invoice_lines : [
                        {
                          position: 1,
                          facture_number: '',
                          facture_date: new Date().toISOString().split('T')[0],
                          fournisseur_name: '',
                          amount: 0,
                        },
                      ],
                    }))
                  }
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                    formData.doc_type === 'REGLEMENT_FACTURE'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📄 Règlement
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      doc_type: 'REGULARISATION_CHEQUE',
                      mode_paiement: 'chèque',
                      invoice_lines: prev.invoice_lines.length > 0 ? prev.invoice_lines : [
                        {
                          position: 1,
                          facture_number: '',
                          facture_date: new Date().toISOString().split('T')[0],
                          fournisseur_name: '',
                          amount: 0,
                        },
                      ],
                    }))
                  }
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                    formData.doc_type === 'REGULARISATION_CHEQUE'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔄 Régul. Chèque
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      doc_type: 'REGULARISATION_CHEQUE_CERTIFIE',
                      mode_paiement: 'chèque certifié',
                      invoice_lines: prev.invoice_lines.length > 0 ? prev.invoice_lines : [
                        {
                          position: 1,
                          facture_number: '',
                          facture_date: new Date().toISOString().split('T')[0],
                          fournisseur_name: '',
                          amount: 0,
                        },
                      ],
                    }))
                  }
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                    formData.doc_type === 'REGULARISATION_CHEQUE_CERTIFIE'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📜🔄 Régul. Certifié
                </button>
              </div>

              {/* Special Fields for Demande de Virement */}
              {formData.doc_type === 'DEMANDE_VIREMENT' && (
                <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center space-x-1.5">
                    <Building className="w-4 h-4 text-sky-600" />
                    <span>Informations Bancaires pour Virement</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nom de la Banque</label>
                      <input
                        type="text"
                        placeholder="ex: BEA, BNA, CPA..."
                        value={formData.bank_name || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bank_name: e.target.value }))}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">N° de Compte / RIB</label>
                      <input
                        type="text"
                        placeholder="ex: 002 00012 1234567890 45"
                        value={formData.bank_account_number || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bank_account_number: e.target.value }))}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Special Fields for Régularisation de Chèque / Chèque Certifié */}
              {(formData.doc_type === 'REGULARISATION_CHEQUE' || formData.doc_type === 'REGULARISATION_CHEQUE_CERTIFIE') && (
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center space-x-1.5">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                    <span>Informations du Chèque à Régulariser</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">N° du Chèque</label>
                      <input
                        type="text"
                        placeholder="ex: 2229845"
                        value={formData.cheque_number || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            cheque_number: val,
                          }));
                        }}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date du Chèque</label>
                      <input
                        type="date"
                        value={formData.cheque_date || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            cheque_date: val,
                          }));
                        }}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Grid 1: Ref & Date & Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">N° Référence</label>
                  <input
                    type="text"
                    required
                    value={formData.ref_number}
                    onChange={(e) => setFormData({ ...formData, ref_number: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lieu</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Link to References: Local Orders Only */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span>📦 Lier des Commandes Locales</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Sélectionner N° Commande Locale (BC)
                  </label>
                  <SearchableSelect
                    options={[{ value: '', label: '-- Ajouter une Commande Locale --' }, ...localOrderSelectOptions]}
                    value=""
                    onChange={(val) => handleSelectOrderRef(val)}
                    placeholder="Rechercher Commande Locale (N° BC)..."
                    searchPlaceholder="N° commande, fournisseur, objet..."
                  />
                </div>

                {formData.order_ref && (
                  <div className="flex flex-wrap items-center gap-2 mt-2 bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-bold">Commande(s) liée(s) :</span>
                    {formData.order_ref.split(',').map((r) => r.trim()).filter(Boolean).map((ref) => (
                      <span
                        key={ref}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-sm border bg-sky-50 text-sky-900 border-sky-300"
                      >
                        <span>📦 {ref}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOrderRef(ref)}
                          className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                          title="Supprimer cette référence"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Grid 2: Objet & Beneficiary/Fournisseur (Searchable Select from DB) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Objet</label>
                  <input
                    type="text"
                    required
                    value={formData.objet}
                    onChange={(e) => setFormData({ ...formData, objet: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      {formData.doc_type === 'DEMANDE_CHEQUE' ? 'Au Nom De (Bénéficiaire)' : 'Fournisseur'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsManualSupplier(!isManualSupplier)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline"
                    >
                      {isManualSupplier ? 'Choisir de la base de données' : 'Saisie manuelle'}
                    </button>
                  </div>

                  {isManualSupplier ? (
                    <input
                      type="text"
                      value={formData.beneficiary_name || formData.fournisseur_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          beneficiary_name: e.target.value,
                          fournisseur_name: e.target.value,
                        })
                      }
                      placeholder="ex: EURL FLASH GRAPHIC"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase font-semibold"
                    />
                  ) : (
                    <SearchableSelect
                      options={supplierSelectOptions}
                      value={formData.beneficiary_name || formData.fournisseur_name}
                      onChange={(selectedName) => {
                        const foundSup = suppliers.find((s) => s.name === selectedName);
                        setFormData({
                          ...formData,
                          fournisseur_id: foundSup ? foundSup.id : formData.fournisseur_id,
                          fournisseur_name: selectedName,
                          beneficiary_name: selectedName,
                        });
                      }}
                      placeholder="Rechercher un fournisseur (Nom, NIF, RC)..."
                      searchPlaceholder="Rechercher fournisseur par Nom, NIF, RC..."
                    />
                  )}
                </div>
              </div>

              {/* SINGLE AMOUNT IN FIGURES & WORDS (DEMANDE DE CHEQUE, CHEQUE CERTIFIE & VIREMENT) */}
              {(formData.doc_type === 'DEMANDE_CHEQUE' ||
                formData.doc_type === 'DEMANDE_CHEQUE_CERTIFIE' ||
                formData.doc_type === 'DEMANDE_VIREMENT') && (
                <div className="space-y-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/60">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">
                        Montant (DA)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={formData.amount !== undefined && formData.amount !== null && formData.amount !== 0 ? formData.amount : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleAmountChange(isNaN(val) ? 0 : val);
                        }}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            handleAmountChange(Number(val.toFixed(2)));
                          }
                        }}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold text-emerald-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">
                        Mode de Paiement
                      </label>
                      <select
                        value={formData.mode_paiement}
                        onChange={(e) => setFormData({ ...formData, mode_paiement: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-900 cursor-pointer"
                      >
                        <option value="chèque">Chèque</option>
                        <option value="chèque certifié">Chèque Certifié</option>
                        <option value="virement">Virement</option>
                        <option value="espèces">Espèces</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">
                      Montant en Lettres (Auto-généré)
                    </label>
                    <input
                      type="text"
                      value={formData.amount_in_words}
                      onChange={(e) => setFormData({ ...formData, amount_in_words: e.target.value })}
                      placeholder="Quinze mille deux cent trente-deux Dinars Algériens"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-emerald-300 rounded-xl focus:outline-none italic text-emerald-900 font-medium"
                    />
                  </div>
                </div>
              )}

              {/* INVOICE LINES TABLE (REGLEMENT & REGULARISATION) */}
              {(formData.doc_type === 'REGLEMENT_FACTURE' || formData.doc_type === 'REGULARISATION_CHEQUE' || formData.doc_type === 'REGULARISATION_CHEQUE_CERTIFIE') && (
                <div className="space-y-4 p-4 bg-blue-50/50 rounded-xl border border-blue-200/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-blue-900 uppercase">
                        Tableau des Factures à {formData.doc_type === 'REGULARISATION_CHEQUE' ? 'Régulariser' : 'Régler'}
                      </label>
                      <span className="text-[11px] text-blue-700 font-mono font-semibold">
                        Total HT: {formatNumber((formData.invoice_lines || []).reduce((sum, l) => sum + (l.amount || 0), 0), 2)} DA
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddInvoiceLine}
                      className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Ajouter Facture
                    </button>
                  </div>

                  {(formData.invoice_lines || []).map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg border border-blue-200 text-xs">
                      <div className="col-span-1 font-bold text-slate-500 text-center">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="N° Facture"
                          value={line.facture_number}
                          onChange={(e) => {
                            const newLines = [...(formData.invoice_lines || [])];
                            newLines[idx].facture_number = e.target.value;
                            setFormData({ ...formData, invoice_lines: newLines });
                          }}
                          className="w-full p-1.5 border border-slate-200 rounded font-mono"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="date"
                          value={line.facture_date}
                          onChange={(e) => {
                            const newLines = [...(formData.invoice_lines || [])];
                            newLines[idx].facture_date = e.target.value;
                            setFormData({ ...formData, invoice_lines: newLines });
                          }}
                          className="w-full p-1.5 border border-slate-200 rounded"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Montant (DA)"
                          value={line.amount !== undefined && line.amount !== null && line.amount !== 0 ? line.amount : ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const newLines = [...(formData.invoice_lines || [])];
                            newLines[idx].amount = isNaN(val) ? 0 : val;
                            setFormData({ ...formData, invoice_lines: newLines });
                          }}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              const newLines = [...(formData.invoice_lines || [])];
                              newLines[idx].amount = Number(val.toFixed(2));
                              setFormData({ ...formData, invoice_lines: newLines });
                            }
                          }}
                          className="w-full p-1.5 border border-slate-200 rounded font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveInvoiceLine(idx)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Attachments checklist (P.J.) */}
              {formData.doc_type === 'REGLEMENT_FACTURE' && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Pièces Jointes (P.J)</label>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.pj_facture_ordonnancee}
                        onChange={(e) => setFormData({ ...formData, pj_facture_ordonnancee: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>01 Facture dûment ordonnancée</span>
                    </label>
                    <div>
                      <input
                        type="text"
                        placeholder="ex: 01 Bon d'arrivée N° : 1373 du 18/03/2026."
                        value={formData.pj_bon_arrivee}
                        onChange={(e) => setFormData({ ...formData, pj_bon_arrivee: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="ex: 01 Copie de commande N° S26-099L du 18/03/2026."
                        value={formData.pj_commande_copy}
                        onChange={(e) => setFormData({ ...formData, pj_commande_copy: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Description Body Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Description / Texte explicatif
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ce montant est destiné au paiement d'achat..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Signatory Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Signataire</label>
                <input
                  type="text"
                  value={formData.signatory_title}
                  onChange={(e) => setFormData({ ...formData, signatory_title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none uppercase font-bold"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all"
                >
                  Enregistrer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {printDoc && (
        <PrintFinancialDoc
          document={printDoc}
          onClose={() => setPrintDoc(null)}
        />
      )}

    </div>
  );
};
