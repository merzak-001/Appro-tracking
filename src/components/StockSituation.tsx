import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Boxes, 
  Search, 
  Upload, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Save, 
  FileSpreadsheet, 
  ArrowUpDown,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Star,
  Package,
  Wrench,
  Cog,
  Layers,
  Sparkles,
  Activity,
  Archive,
  BarChart3,
  CheckSquare,
  Square,
  Undo2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StockItem, StockStatusType, StockCategory } from '../types';

interface StockSituationProps {
  onNavigateToAppro?: () => void;
}

export const StockSituation: React.FC<StockSituationProps> = ({ onNavigateToAppro }) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Scope Mode: 'IMPORTANT_ONLY' (⭐ Mes Articles Importants) vs 'ALL_CATALOG' (📋 Tous les Articles)
  const [scopeMode, setScopeMode] = useState<'IMPORTANT_ONLY' | 'ALL_CATALOG'>('IMPORTANT_ONLY');
  
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL'); // 'ALL' | 'MP' | 'PF' | 'PD' | 'AUX'
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMagasin, setSelectedMagasin] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof StockItem>('code_article');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Multi-selection checkboxes
  const [selectedRowCodes, setSelectedRowCodes] = useState<Set<string>>(new Set());

  // Staged Pending Importance changes: maps uppercase code_article -> boolean
  const [pendingImportance, setPendingImportance] = useState<Record<string, boolean>>({});
  const [isSavingPending, setIsSavingPending] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Modal State for Item Details / Quick Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [modalForm, setModalForm] = useState({
    code_article: '',
    designation: '',
    division: '8660',
    magasin: '33',
    categorie: 'MP' as StockCategory,
    is_important: false,
    is_tracked: true,
    famille: 'Matières Premières (ROH)',
    type_article: 'ROH',
    unite: 'PCE',
    stock_actuel: '' as number | '',
    stock_utilisation_libre: '' as number | '',
    stock_controle_qualite: 0 as number | '',
    stock_non_libre: 0 as number | '',
    stock_transit: 0 as number | '',
    stock_securite: '' as number | '',
    emplacement: 'Magasin 33',
    prix_unitaire_estime: '' as number | '',
    fournisseur_principal: '',
  });

  // Modal State for Detail View
  const [viewingItem, setViewingItem] = useState<StockItem | null>(null);

  // Modal State for Excel Import Preview
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreviewItems, setImportPreviewItems] = useState<Partial<StockItem>[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'upsert'>('replace');
  const [importFileName, setImportFileName] = useState('');
  const [importPreviewFilter, setImportPreviewFilter] = useState<'ALL' | 'IMPORTANT' | 'POSITIVE'>('ALL');
  const [importSearchQuery, setImportSearchQuery] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Stock from backend
  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stock');
      if (res.ok) {
        const data = await res.json();
        setStockItems(data);
      }
    } catch (err) {
      console.error('Failed to load stock items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  // Compute status for an item
  const getItemStatus = (item: StockItem): StockStatusType => {
    const act = Number(item.stock_actuel !== undefined ? item.stock_actuel : item.stock_utilisation_libre) || 0;
    const sec = Number(item.stock_securite) || 100;

    if (act <= 0) return 'RUPTURE';
    if (act < 100) return 'CRITIQUE';
    if (act <= sec) return 'BAS';
    return 'DISPONIBLE';
  };

  // Helper: Get effective is_important (considering local pending stage)
  const getEffectiveImportant = (item: StockItem): boolean => {
    const code = item.code_article.trim().toUpperCase();
    if (pendingImportance[code] !== undefined) {
      return pendingImportance[code];
    }
    return !!item.is_important;
  };

  // Toggle Important / Starred status Locally (No lag, no server call until user clicks Save)
  const handleToggleImportant = (item: StockItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const code = item.code_article.trim().toUpperCase();
    const currVal = getEffectiveImportant(item);
    const nextVal = !currVal;

    setPendingImportance((prev) => {
      const updated = { ...prev };
      // If setting back to the initial database value, clear from pending
      if (nextVal === !!item.is_important) {
        delete updated[code];
      } else {
        updated[code] = nextVal;
      }
      return updated;
    });
  };

  // Bulk mark / unmark selected checkboxes
  const handleBulkMarkSelected = (markAsImportant: boolean) => {
    if (selectedRowCodes.size === 0) return;
    setPendingImportance((prev) => {
      const updated = { ...prev };
      selectedRowCodes.forEach((code) => {
        const item = stockItems.find((i) => i.code_article.trim().toUpperCase() === code);
        if (item) {
          if (markAsImportant === !!item.is_important) {
            delete updated[code];
          } else {
            updated[code] = markAsImportant;
          }
        }
      });
      return updated;
    });
    setSelectedRowCodes(new Set());
  };

  // Save all pending changes to backend in a single transaction
  const handleSavePendingImportance = async () => {
    const pendingKeys = Object.keys(pendingImportance);
    if (pendingKeys.length === 0) return;

    setIsSavingPending(true);
    try {
      const updates = pendingKeys.map((code) => ({
        code_article: code,
        is_important: pendingImportance[code],
      }));

      const res = await fetch('/api/stock/bulk-update-importance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        // Optimistically apply to stockItems
        setStockItems((prev) =>
          prev.map((i) => {
            const code = i.code_article.trim().toUpperCase();
            if (pendingImportance[code] !== undefined) {
              return { ...i, is_important: pendingImportance[code] };
            }
            return i;
          })
        );
        const count = pendingKeys.length;
        setPendingImportance({});
        setSaveSuccessMsg(`✅ ${count} article(s) enregistré(s) avec succès !`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        alert('Erreur lors de l\'enregistrement des modifications.');
      }
    } catch (err) {
      console.error('Error saving pending importance:', err);
      alert('Erreur de communication avec le serveur.');
    } finally {
      setIsSavingPending(false);
    }
  };

  // Cancel all pending changes
  const handleCancelPendingImportance = () => {
    setPendingImportance({});
  };

  // Categorize helper
  const detectCategory = (typeArt: string, designation: string): { cat: StockCategory; fam: string } => {
    const t = typeArt.toUpperCase().trim();
    const d = designation.toLowerCase().trim();

    if (t === 'FERT' || t === 'ZFER' || d.startsWith('compteur') || d.includes('produit fini')) {
      return { cat: 'PF', fam: 'Produits Finis (FERT)' };
    }
    if (
      t === 'HIBE' ||
      t === 'VERP' ||
      d.includes('carton') ||
      d.includes('etiquette') ||
      d.includes('palette') ||
      d.includes('adhesif') ||
      d.includes('film') ||
      d.includes('huile') ||
      d.includes('emballage') ||
      d.includes('plombage')
    ) {
      return { cat: 'AUX', fam: 'Matériel Auxiliaire & Emballage (AUX)' };
    }
    if (
      t === 'HALB' ||
      t === 'ZHAL' ||
      t === 'HAWA' ||
      d.includes('mecanisme') ||
      d.includes('totalisateur') ||
      d.includes('sous-ensemble') ||
      d.includes('kit') ||
      d.includes('module') ||
      d.includes('capteur') ||
      d.includes('corp')
    ) {
      return { cat: 'PD', fam: 'Pièces Détachées & Sous-Ensembles (PD)' };
    }
    return { cat: 'MP', fam: 'Matières Premières & Composants (MP)' };
  };

  // Distinct Magasins
  const magasinsList = useMemo(() => {
    const set = new Set<string>();
    stockItems.forEach((i) => {
      if (i.magasin) set.add(String(i.magasin).trim());
    });
    return Array.from(set).sort();
  }, [stockItems]);

  // Base scope items: Important vs All
  // Note: in IMPORTANT_ONLY, keep items that were originally important OR newly added in pending so they don't disappear while clicking!
  const scopedBaseItems = useMemo(() => {
    if (scopeMode === 'IMPORTANT_ONLY') {
      return stockItems.filter((i) => {
        const code = i.code_article.trim().toUpperCase();
        return i.is_important || pendingImportance[code] === true;
      });
    }
    return stockItems;
  }, [stockItems, scopeMode, pendingImportance]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return scopedBaseItems
      .filter((item) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.code_article.toLowerCase().includes(q) ||
          item.designation.toLowerCase().includes(q) ||
          (item.magasin && String(item.magasin).toLowerCase().includes(q)) ||
          (item.emplacement && item.emplacement.toLowerCase().includes(q)) ||
          (item.type_article && item.type_article.toLowerCase().includes(q));

        // Category Filter
        let matchesCategory = true;
        if (selectedCategory === 'MP') matchesCategory = item.categorie === 'MP' || (!item.categorie && item.type_article === 'ROH');
        else if (selectedCategory === 'PF') matchesCategory = item.categorie === 'PF' || item.type_article === 'FERT' || item.type_article === 'ZFER';
        else if (selectedCategory === 'PD') matchesCategory = item.categorie === 'PD' || item.type_article === 'HALB' || item.type_article === 'ZHAL';
        else if (selectedCategory === 'AUX') matchesCategory = item.categorie === 'AUX' || item.type_article === 'HIBE' || item.type_article === 'VERP';

        // Status Filter
        const currentStatus = getItemStatus(item);
        let matchesStatus = true;
        if (selectedStatus === 'DISPONIBLE') matchesStatus = currentStatus === 'DISPONIBLE';
        else if (selectedStatus === 'RUPTURE') matchesStatus = currentStatus === 'RUPTURE';
        else if (selectedStatus === 'CRITIQUE') matchesStatus = currentStatus === 'CRITIQUE';
        else if (selectedStatus === 'BAS') matchesStatus = currentStatus === 'BAS';

        const matchesMagasin = selectedMagasin === 'ALL' || String(item.magasin) === selectedMagasin;

        return matchesSearch && matchesCategory && matchesStatus && matchesMagasin;
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? '';
        const valB = b[sortField] ?? '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
  }, [scopedBaseItems, searchQuery, selectedCategory, selectedStatus, selectedMagasin, sortField, sortDirection]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, scopeMode, selectedCategory, selectedStatus, selectedMagasin, pageSize]);

  // Paginated Items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

  // Counts & Stats
  const stats = useMemo(() => {
    let mpQty = 0, pfQty = 0, pdQty = 0, auxQty = 0;
    let mpCount = 0, pfCount = 0, pdCount = 0, auxCount = 0;
    let totalLibreQty = 0;

    const sourceList = scopeMode === 'IMPORTANT_ONLY' ? stockItems.filter(i => i.is_important) : stockItems;

    sourceList.forEach((item) => {
      const libre = Number(item.stock_actuel !== undefined ? item.stock_actuel : item.stock_utilisation_libre) || 0;
      totalLibreQty += libre;
      const cat = item.categorie || detectCategory(item.type_article || 'ROH', item.designation).cat;

      if (cat === 'MP') { mpCount++; mpQty += libre; }
      else if (cat === 'PF') { pfCount++; pfQty += libre; }
      else if (cat === 'PD') { pdCount++; pdQty += libre; }
      else if (cat === 'AUX') { auxCount++; auxQty += libre; }
    });

    const totalInDb = stockItems.length;
    const importantCount = stockItems.filter((i) => i.is_important).length;

    return {
      totalInDb,
      importantCount,
      totalLibreQty,
      mpCount, mpQty,
      pfCount, pfQty,
      pdCount, pdQty,
      auxCount, auxQty,
    };
  }, [stockItems, scopeMode]);

  // Handle Sort
  const handleSort = (field: keyof StockItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Open Modal for Create or Edit
  const openModal = (item?: StockItem) => {
    if (item) {
      setEditingItem(item);
      const catInfo = detectCategory(item.type_article || 'ROH', item.designation);
      setModalForm({
        code_article: item.code_article,
        designation: item.designation,
        division: item.division || '8660',
        magasin: item.magasin || '33',
        categorie: (item.categorie as StockCategory) || catInfo.cat,
        is_important: !!item.is_important,
        is_tracked: item.is_tracked !== false,
        famille: item.famille || catInfo.fam,
        type_article: item.type_article || 'ROH',
        unite: item.unite || 'PCE',
        stock_actuel: item.stock_actuel,
        stock_utilisation_libre: item.stock_utilisation_libre ?? item.stock_actuel,
        stock_controle_qualite: item.stock_controle_qualite ?? 0,
        stock_non_libre: item.stock_non_libre ?? 0,
        stock_transit: item.stock_transit ?? 0,
        stock_securite: item.stock_securite ?? 100,
        emplacement: item.emplacement || `Magasin ${item.magasin || '33'}`,
        prix_unitaire_estime: item.prix_unitaire_estime ?? '',
        fournisseur_principal: item.fournisseur_principal ?? '',
      });
    } else {
      setEditingItem(null);
      setModalForm({
        code_article: '',
        designation: '',
        division: '8660',
        magasin: '33',
        categorie: 'MP',
        is_important: false,
        is_tracked: true,
        famille: 'Matières Premières (ROH)',
        type_article: 'ROH',
        unite: 'PCE',
        stock_actuel: '',
        stock_utilisation_libre: '',
        stock_controle_qualite: 0,
        stock_non_libre: 0,
        stock_transit: 0,
        stock_securite: 100,
        emplacement: 'Magasin 33',
        prix_unitaire_estime: '',
        fournisseur_principal: '',
      });
    }
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.code_article || !modalForm.designation) {
      alert('Veuillez renseigner le code et la désignation.');
      return;
    }

    const payload: Partial<StockItem> = {
      code_article: modalForm.code_article.trim(),
      designation: modalForm.designation.trim(),
      division: modalForm.division,
      magasin: modalForm.magasin,
      categorie: modalForm.categorie,
      is_important: modalForm.is_important,
      is_tracked: true,
      famille: modalForm.famille,
      type_article: modalForm.type_article,
      unite: modalForm.unite || 'PCE',
      stock_actuel: Number(modalForm.stock_actuel) || 0,
      stock_utilisation_libre: Number(modalForm.stock_utilisation_libre !== '' ? modalForm.stock_utilisation_libre : modalForm.stock_actuel) || 0,
      stock_controle_qualite: Number(modalForm.stock_controle_qualite) || 0,
      stock_non_libre: Number(modalForm.stock_non_libre) || 0,
      stock_transit: Number(modalForm.stock_transit) || 0,
      stock_securite: Number(modalForm.stock_securite) || 100,
      emplacement: modalForm.emplacement,
      prix_unitaire_estime: modalForm.prix_unitaire_estime ? Number(modalForm.prix_unitaire_estime) : undefined,
      fournisseur_principal: modalForm.fournisseur_principal || undefined,
    };

    try {
      if (editingItem) {
        const res = await fetch(`/api/stock/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          await fetchStock();
          setIsModalOpen(false);
        }
      } else {
        const res = await fetch('/api/stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          await fetchStock();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Error saving item:', err);
      alert('Erreur lors de l\'enregistrement.');
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article du stock ?')) return;

    try {
      const res = await fetch(`/api/stock/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStockItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Erreur lors de la suppression.');
    }
  };

  // Handle Excel Upload with auto-recognition of remembered watchlist
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawData || rawData.length === 0) {
          alert('Le fichier Excel est vide ou non reconnu.');
          return;
        }

        // Retrieve remembered important codes from database
        const rememberedCodes = new Set<string>();
        try {
          const wlRes = await fetch('/api/stock/watchlist');
          if (wlRes.ok) {
            const wlData = await wlRes.json();
            if (Array.isArray(wlData.watchlist)) {
              wlData.watchlist.forEach((w: { code_article: string }) => {
                if (w.code_article) rememberedCodes.add(String(w.code_article).trim().toUpperCase());
              });
            }
          }
        } catch {
          stockItems.filter((i) => i.is_important).forEach((i) => {
            if (i.code_article) rememberedCodes.add(String(i.code_article).trim().toUpperCase());
          });
        }

        const parsed: Partial<StockItem>[] = rawData.map((row, idx) => {
          const normalized: { [key: string]: any } = {};
          Object.keys(row).forEach((k) => {
            const cleanKey = k.toLowerCase().trim().replace(/[\s_\-]/g, '');
            normalized[cleanKey] = row[k];
          });

          const code =
            row['Article'] ||
            normalized['article'] ||
            normalized['codearticle'] ||
            normalized['code'] ||
            normalized['reference'] ||
            normalized['ref'] ||
            `000${idx + 1}`;

          const des =
            row['Désignation article'] ||
            normalized['designationarticle'] ||
            normalized['designation'] ||
            normalized['nom'] ||
            normalized['description'] ||
            'Article';

          const div = row['Division'] || normalized['division'] || '8660';
          const mag = String(row['Magasin'] || normalized['magasin'] || '33').trim();
          const unit = String(row['Unité de qté base'] || normalized['unitedeqtebase'] || normalized['unite'] || 'PCE').trim();

          const libre = Number(
            row['A utilisation libre'] !== undefined && row['A utilisation libre'] !== ''
              ? row['A utilisation libre']
              : (normalized['autilisationlibre'] || normalized['stockactuel'] || normalized['stock'] || 0)
          ) || 0;

          const qc = Number(row['En contrôle qualité'] || normalized['encontrolequalite'] || 0) || 0;
          const nonLibre = Number(row['Stock non libre'] || normalized['stocknonlibre'] || 0) || 0;
          const transit = Number(row['Stock en transit'] || normalized['stockentransit'] || 0) || 0;
          const valNonLibre = Number(row['Valeur non libre'] || normalized['valeurnonlibre'] || 0) || 0;
          const typeArt = String(row['Type d\'article'] || normalized['typedarticle'] || 'ROH').trim().toUpperCase();

          let statut: StockStatusType = 'DISPONIBLE';
          if (libre <= 0) statut = 'RUPTURE';
          else if (libre < 100) statut = 'CRITIQUE';
          else if (libre < 500) statut = 'BAS';

          const { cat, fam } = detectCategory(typeArt, String(des));
          const codeClean = String(code).trim().toUpperCase();
          const isImportant = rememberedCodes.has(codeClean);

          return {
            id: idx + 1,
            code_article: String(code).trim(),
            designation: String(des).trim(),
            division: String(div).trim(),
            magasin: mag,
            emplacement: mag ? `Magasin ${mag}` : 'Magasin Central',
            categorie: cat,
            is_important: isImportant,
            is_tracked: true,
            famille: fam,
            type_article: typeArt,
            unite: unit,
            stock_actuel: libre,
            stock_utilisation_libre: libre,
            stock_controle_qualite: qc,
            stock_non_libre: nonLibre,
            stock_transit: transit,
            valeur_non_libre: valNonLibre,
            stock_securite: libre > 1000 ? Math.round(libre * 0.2) : 100,
            statut: statut,
          };
        });

        setImportPreviewItems(parsed);
        setImportPreviewFilter('ALL');
        setImportSearchQuery('');
        setIsImportModalOpen(true);
      } catch (error) {
        console.error('Error reading excel file:', error);
        alert('Erreur lors de la lecture du fichier Excel SAP.');
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (importPreviewItems.length === 0) return;

    try {
      setImportLoading(true);
      const res = await fetch('/api/stock/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: importPreviewItems,
          mode: importMode,
        }),
      });

      if (res.ok) {
        await fetchStock();
        setIsImportModalOpen(false);
        const count = importPreviewItems.length;
        const impCount = importPreviewItems.filter(i => i.is_important).length;
        setImportPreviewItems([]);
        alert(`✅ Base de données mise à jour : ${count} articles synchronisés (${impCount} articles importants ⭐) !`);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`❌ Erreur lors de l'enregistrement en base : ${errorData.error || res.statusText}`);
      }
    } catch (err: any) {
      console.error('Error importing stock items:', err);
      alert('❌ Erreur de communication avec le serveur.');
    } finally {
      setImportLoading(false);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: StockStatusType) => {
    switch (status) {
      case 'DISPONIBLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Disponible
          </span>
        );
      case 'BAS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Stock Bas
          </span>
        );
      case 'CRITIQUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            Critique
          </span>
        );
      case 'RUPTURE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Rupture
          </span>
        );
    }
  };

  // Category Badge Component
  const renderCategoryBadge = (cat?: StockCategory) => {
    switch (cat) {
      case 'MP':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">MP</span>;
      case 'PF':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">PF</span>;
      case 'PD':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">PD</span>;
      case 'AUX':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">AUX</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">AUTRE</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. CLEAN TOP HEADER */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
            <Boxes size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Suivi des Stocks SAP</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono font-semibold">
                {stats.totalInDb} articles
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Gérez votre stock usine et sélectionnez vos articles clés à suivre au quotidien.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {stats.pendingCount > 0 && (
            <button
              onClick={handleSavePendingImportance}
              disabled={isSavingPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 animate-pulse"
            >
              {isSavingPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Enregistrer ({stats.pendingCount})</span>
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Upload size={14} />
            <span>Importer Excel SAP</span>
          </button>

          <button
            onClick={() => openModal()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Ajouter Article</span>
          </button>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION TOAST */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. USER-FRIENDLY SCOPE SWITCHER (2 SIMPLE TABS) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setScopeMode('IMPORTANT_ONLY')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              scopeMode === 'IMPORTANT_ONLY'
                ? 'bg-amber-400 text-slate-950 shadow-xs font-extrabold ring-1 ring-amber-500/40'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Star size={14} className={scopeMode === 'IMPORTANT_ONLY' ? 'fill-slate-950 text-slate-950' : 'text-amber-500'} />
            <span>⭐ Mes Articles Importants ({stats.importantCount})</span>
          </button>

          <button
            onClick={() => setScopeMode('ALL_CATALOG')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              scopeMode === 'ALL_CATALOG'
                ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive size={14} />
            <span>📋 Tous les Articles SAP ({stats.totalInDb})</span>
          </button>
        </div>

        <div className="px-3 text-xs text-slate-500 flex items-center gap-1.5">
          <span className="font-semibold">Stock Physique Total :</span>
          <span className="font-mono font-bold text-slate-900 text-sm">
            {stats.totalLibreQty.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 uppercase">unités</span>
        </div>
      </div>

      {/* 3. FOUR KPI CARDS (CATEGORIES) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: MP */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'MP' ? 'ALL' : 'MP')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            selectedCategory === 'MP'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Boxes size={15} />
              Matières Premières
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">MP</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-lg font-mono font-extrabold text-slate-900">
              {stats.mpQty.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">{stats.mpCount} réf.</div>
          </div>
        </div>

        {/* Card 2: PF */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'PF' ? 'ALL' : 'PF')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            selectedCategory === 'PF'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Package size={15} />
              Produits Finis
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">PF</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-lg font-mono font-extrabold text-slate-900">
              {stats.pfQty.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">{stats.pfCount} réf.</div>
          </div>
        </div>

        {/* Card 3: PD */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'PD' ? 'ALL' : 'PD')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            selectedCategory === 'PD'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/20'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Cog size={15} />
              Pièces Détachées
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">PD</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-lg font-mono font-extrabold text-slate-900">
              {stats.pdQty.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">{stats.pdCount} réf.</div>
          </div>
        </div>

        {/* Card 4: AUX */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'AUX' ? 'ALL' : 'AUX')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            selectedCategory === 'AUX'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Layers size={15} />
              Matériel Auxiliaire
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">AUX</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-lg font-mono font-extrabold text-slate-900">
              {stats.auxQty.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">{stats.auxCount} réf.</div>
          </div>
        </div>
      </div>

      {/* 4. CLEAN SEARCH & FILTER BAR + BULK ACTION TOOLBAR */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par code article (ex: 00013271) ou désignation..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Toutes Catégories</option>
            <option value="MP">MP - Matières Premières</option>
            <option value="PF">PF - Produits Finis</option>
            <option value="PD">PD - Pièces Détachées</option>
            <option value="AUX">AUX - Matériel Auxiliaire</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tous les Statuts</option>
            <option value="DISPONIBLE">🟢 Disponible</option>
            <option value="BAS">🟡 Stock Bas</option>
            <option value="CRITIQUE">🟠 Critique</option>
            <option value="RUPTURE">🔴 Rupture (0)</option>
          </select>

          {/* Magasin Filter */}
          {magasinsList.length > 0 && (
            <select
              value={selectedMagasin}
              onChange={(e) => setSelectedMagasin(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les Magasins</option>
              {magasinsList.map((mag) => (
                <option key={mag} value={mag}>
                  Magasin {mag}
                </option>
              ))}
            </select>
          )}

          {(searchQuery || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedMagasin !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setSelectedMagasin('ALL');
              }}
              className="px-3 py-2 text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl font-bold transition-colors flex items-center gap-1"
              title="Réinitialiser tous les filtres"
            >
              <X size={13} />
              <span>Effacer filtres</span>
            </button>
          )}
        </div>
      </div>

      {/* BULK SELECTION ACTION BAR */}
      {selectedRowCodes.size > 0 && (
        <div className="bg-slate-900 text-white p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold font-mono">
              {selectedRowCodes.size} article(s) sélectionné(s)
            </span>
            <span className="text-slate-300">sur la page</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkMarkSelected(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Star size={13} className="fill-slate-950" />
              <span>Marquer comme Importants ⭐</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkMarkSelected(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Star size={13} className="text-slate-400" />
              <span>Retirer des Importants</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRowCodes(new Set())}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white"
            >
              Désélectionner tout
            </button>
          </div>
        </div>
      )}

      {/* 5. MAIN TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                {/* Master Checkbox */}
                <th className="py-3 px-2 text-center w-10">
                  <input
                    type="checkbox"
                    checked={paginatedItems.length > 0 && paginatedItems.every((i) => selectedRowCodes.has(i.code_article.trim().toUpperCase()))}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setSelectedRowCodes((prev) => {
                        const updated = new Set(prev);
                        paginatedItems.forEach((i) => {
                          const code = i.code_article.trim().toUpperCase();
                          if (isChecked) updated.add(code);
                          else updated.delete(code);
                        });
                        return updated;
                      });
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Sélectionner tous les articles affichés"
                  />
                </th>
                <th className="py-3 px-3 text-center w-14">⭐ Suivi</th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors"
                  onClick={() => handleSort('code_article')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Code Article</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors"
                  onClick={() => handleSort('designation')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Désignation Article</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center">Catégorie</th>
                <th className="py-3 px-2 text-center">Magasin</th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                  onClick={() => handleSort('stock_actuel')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Stock Disponible</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center">Statut</th>
                <th className="py-3 px-2 text-center">Unité</th>
                <th className="py-3 px-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <RefreshCw size={24} className="animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Chargement des articles en cours...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    {scopeMode === 'IMPORTANT_ONLY' ? (
                      <div className="max-w-md mx-auto space-y-2 py-4">
                        <Star size={40} className="mx-auto text-amber-400 fill-amber-100 mb-1" />
                        <p className="font-bold text-slate-800 text-sm">
                          Vous n'avez pas encore d'articles importants ⭐
                        </p>
                        <p className="text-xs text-slate-500">
                          Basculez sur la liste complète pour cliquer sur l'étoile <strong>⭐</strong> des articles que vous souhaitez surveiller sur ce tableau de bord.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={() => setScopeMode('ALL_CATALOG')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Archive size={14} />
                            <span>Voir tous les articles SAP ({stats.totalInDb})</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Boxes size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700">Aucun article ne correspond à votre recherche</p>
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory('ALL');
                            setSelectedStatus('ALL');
                            setSelectedMagasin('ALL');
                          }}
                          className="mt-2 text-blue-600 hover:underline text-xs font-semibold"
                        >
                          Réinitialiser les filtres
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const status = getItemStatus(item);
                  const libre = Number(item.stock_actuel !== undefined ? item.stock_actuel : item.stock_utilisation_libre) || 0;
                  const cat = item.categorie || detectCategory(item.type_article || 'ROH', item.designation).cat;
                  const codeClean = item.code_article.trim().toUpperCase();
                  const isImp = getEffectiveImportant(item);
                  const isPending = pendingImportance[codeClean] !== undefined;
                  const isChecked = selectedRowCodes.has(codeClean);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isChecked ? 'bg-blue-50/50' : isImp ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedRowCodes((prev) => {
                              const updated = new Set(prev);
                              if (checked) updated.add(codeClean);
                              else updated.delete(codeClean);
                              return updated;
                            });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* ⭐ STAR BUTTON (LOCAL STAGE) */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleToggleImportant(item, e)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer relative ${
                              isImp
                                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs'
                                : 'bg-slate-50 text-slate-300 border-slate-200 hover:text-amber-500 hover:bg-amber-50'
                            }`}
                            title={isImp ? "Retirer de vos articles importants ⭐ (Cliquer pour basculer)" : "Ajouter à vos articles importants ⭐ (Cliquer pour basculer)"}
                          >
                            <Star size={15} className={isImp ? "fill-slate-950 text-slate-950" : ""} />
                            {isPending && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white animate-pulse" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Code SAP */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{item.code_article}</span>
                          {isPending && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-sans font-bold border border-blue-200">
                              Modifié
                            </span>
                          )}
                          {scopeMode === 'IMPORTANT_ONLY' && !isImp && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-sans font-semibold border border-rose-200">
                              Sera retiré
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {item.designation}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-2 text-center">
                        {renderCategoryBadge(cat)}
                      </td>

                      {/* Magasin */}
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.magasin ? `Mag. ${item.magasin}` : '-'}
                        </span>
                      </td>

                      {/* Stock Libre */}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-slate-900">
                        <span className={libre === 0 ? 'text-slate-300' : 'text-slate-900'}>
                          {libre.toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-2 text-center">
                        {renderStatusBadge(status)}
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-2 text-center uppercase font-mono text-[10px] text-slate-500 font-semibold">
                        {item.unite || 'PCE'}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingItem(item)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                            title="Détails complets"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => openModal(item)}
                            className="p-1 text-slate-400 hover:text-amber-600 rounded-md hover:bg-amber-50 transition-colors"
                            title="Modifier"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteItem(item.id, e)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Affichage de{' '}
            <span className="font-bold text-slate-900">
              {filteredItems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{' '}
            à{' '}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * pageSize, filteredItems.length)}
            </span>{' '}
            sur <span className="font-bold text-slate-900">{filteredItems.length}</span> articles
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-100"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 font-semibold">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-100"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. STICKY FLOATING BOTTOM BAR FOR PENDING STAGED CHANGES */}
      {stats.pendingCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-400/20 text-amber-400 rounded-lg">
              <Star size={18} className="fill-amber-400 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-white">
                {stats.pendingCount} article(s) modifié(s) en attente
              </p>
              <p className="text-[11px] text-slate-400">
                Vos choix sont prêts. Cliquez sur enregistrer pour valider d'un coup.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            <button
              type="button"
              onClick={handleCancelPendingImportance}
              disabled={isSavingPending}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1"
            >
              <Undo2 size={13} />
              <span>Annuler</span>
            </button>

            <button
              type="button"
              onClick={handleSavePendingImportance}
              disabled={isSavingPending}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all ring-2 ring-emerald-400/30"
            >
              {isSavingPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Enregistrer ({stats.pendingCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. MODAL: EXCEL IMPORT PREVIEW */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-emerald-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-emerald-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Mise à Jour de l'Inventaire SAP ({importPreviewItems.length} articles détectés)
                  </h2>
                  <p className="text-[10px] text-emerald-200/80">Fichier : {importFileName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-emerald-300 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-400/30 flex items-start gap-2.5">
                <Star size={18} className="text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
                <div className="text-slate-800 text-[11px] leading-relaxed">
                  <p className="font-bold text-amber-950">
                    ⭐ Vos Articles Importants sont mémorisés :
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Cliquez sur l'étoile <strong>⭐</strong> des articles ci-dessous pour les ajouter ou les retirer de votre liste prioritaire. Vos choix restent enregistrés pour tous vos futurs imports.
                  </p>
                </div>
              </div>

              {/* Mode Selector */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="font-bold text-slate-800">Mode de mise à jour :</div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Remplacer tout l'inventaire (Recommandé)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-emerald-700">
                    <input
                      type="radio"
                      name="importMode"
                      value="upsert"
                      checked={importMode === 'upsert'}
                      onChange={() => setImportMode('upsert')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Mettre à jour & Ajouter</span>
                  </label>
                </div>
              </div>

              {/* Filters & Search in Modal */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setImportPreviewFilter('ALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      importPreviewFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tous ({importPreviewItems.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportPreviewFilter('IMPORTANT')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      importPreviewFilter === 'IMPORTANT'
                        ? 'bg-amber-400 text-slate-950 shadow-2xs font-extrabold'
                        : 'text-amber-800 hover:text-amber-950 font-bold'
                    }`}
                  >
                    <Star size={12} className={importPreviewFilter === 'IMPORTANT' ? 'fill-slate-950' : 'fill-amber-500 text-amber-500'} />
                    <span>⭐ Marqués Importants ({importPreviewItems.filter((i) => i.is_important).length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportPreviewFilter('POSITIVE')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      importPreviewFilter === 'POSITIVE'
                        ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Activity size={12} className="text-emerald-600" />
                    <span>Avec Stock ({importPreviewItems.filter((i) => Number(i.stock_actuel) > 0).length})</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={importSearchQuery}
                    onChange={(e) => setImportSearchQuery(e.target.value)}
                    placeholder="Chercher code ou nom..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-2 text-center w-12">⭐ Suivi</th>
                      <th className="py-2 px-2.5">Code SAP</th>
                      <th className="py-2 px-2.5">Désignation</th>
                      <th className="py-2 px-2 text-center">Cat.</th>
                      <th className="py-2 px-2 text-center">Mag.</th>
                      <th className="py-2 px-2.5 text-right">Stock Libre</th>
                      <th className="py-2 px-2 text-center">Unité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreviewItems
                      .filter((item) => {
                        if (importPreviewFilter === 'IMPORTANT' && !item.is_important) return false;
                        if (importPreviewFilter === 'POSITIVE' && Number(item.stock_actuel) <= 0) return false;
                        if (importSearchQuery) {
                          const q = importSearchQuery.toLowerCase();
                          const matchCode = item.code_article?.toLowerCase().includes(q);
                          const matchDes = item.designation?.toLowerCase().includes(q);
                          if (!matchCode && !matchDes) return false;
                        }
                        return true;
                      })
                      .map((item, idx) => {
                        const isImp = !!item.is_important;
                        return (
                          <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isImp ? 'bg-amber-50/60 font-semibold' : ''}`}>
                            <td className="py-1.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setImportPreviewItems((prev) =>
                                    prev.map((p) =>
                                      p.code_article?.trim().toUpperCase() === item.code_article?.trim().toUpperCase()
                                        ? { ...p, is_important: !p.is_important }
                                        : p
                                    )
                                  );
                                }}
                                className={`p-1 rounded-md border transition-all cursor-pointer ${
                                  isImp
                                    ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-amber-500 hover:bg-amber-50'
                                }`}
                                title={isImp ? "Retirer des articles importants" : "Marquer comme article important ⭐"}
                              >
                                <Star size={13} className={isImp ? "fill-slate-950 text-slate-950" : ""} />
                              </button>
                            </td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900">{item.code_article}</td>
                            <td className="py-1.5 px-2.5 text-slate-800 truncate max-w-[240px]">{item.designation}</td>
                            <td className="py-1.5 px-2 text-center">{renderCategoryBadge(item.categorie)}</td>
                            <td className="py-1.5 px-2 text-center font-mono">{item.magasin}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                              {Number(item.stock_actuel).toLocaleString()}
                            </td>
                            <td className="py-1.5 px-2 text-center uppercase text-[10px] text-slate-500">{item.unite}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="text-slate-500 text-[11px]">
                {importPreviewItems.length} articles à synchroniser
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importLoading}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {importLoading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Confirmer la Mise à Jour ({importPreviewItems.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: ITEM DETAILS */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes size={18} className="text-blue-400" />
                <h2 className="text-sm font-bold text-white">Détails Article : {viewingItem.code_article}</h2>
              </div>
              <button onClick={() => setViewingItem(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="font-bold text-sm text-slate-900">{viewingItem.designation}</div>
                <div className="text-slate-500 mt-1 flex items-center gap-2">
                  <span>Type : <strong>{viewingItem.type_article}</strong></span>
                  <span>•</span>
                  <span>Catégorie : {renderCategoryBadge(viewingItem.categorie)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <div className="text-blue-700 font-medium text-[11px]">Stock Libre (Utilisable)</div>
                  <div className="text-lg font-mono font-bold text-blue-950 mt-0.5">
                    {Number(viewingItem.stock_utilisation_libre ?? viewingItem.stock_actuel).toLocaleString()} {viewingItem.unite}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <div className="text-emerald-700 font-medium text-[11px]">Magasin</div>
                  <div className="text-lg font-mono font-bold text-emerald-950 mt-0.5">
                    Magasin {viewingItem.magasin || '33'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-medium text-[11px]">Contrôle Qualité</div>
                  <div className="text-sm font-mono font-bold text-slate-800 mt-0.5">
                    {Number(viewingItem.stock_controle_qualite || 0).toLocaleString()} {viewingItem.unite}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-medium text-[11px]">Stock Non Libre</div>
                  <div className="text-sm font-mono font-bold text-slate-800 mt-0.5">
                    {Number(viewingItem.stock_non_libre || 0).toLocaleString()} {viewingItem.unite}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingItem(null)}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: CREATE / EDIT ARTICLE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                {editingItem ? `Modifier Article : ${editingItem.code_article}` : 'Ajouter un Nouvel Article'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Code Article SAP *</label>
                  <input
                    type="text"
                    required
                    value={modalForm.code_article}
                    onChange={(e) => setModalForm({ ...modalForm, code_article: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    placeholder="Ex: 00013271"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catégorie *</label>
                  <select
                    value={modalForm.categorie}
                    onChange={(e) => setModalForm({ ...modalForm, categorie: e.target.value as StockCategory })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="MP">MP - Matières Premières</option>
                    <option value="PF">PF - Produits Finis</option>
                    <option value="PD">PD - Pièces Détachées</option>
                    <option value="AUX">AUX - Matériel Auxiliaire</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Désignation de l'article *</label>
                <input
                  type="text"
                  required
                  value={modalForm.designation}
                  onChange={(e) => setModalForm({ ...modalForm, designation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                  placeholder="Ex: Corps compteur 15mm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Libre *</label>
                  <input
                    type="number"
                    step="any"
                    value={modalForm.stock_actuel}
                    onChange={(e) => setModalForm({ ...modalForm, stock_actuel: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Magasin</label>
                  <input
                    type="text"
                    value={modalForm.magasin}
                    onChange={(e) => setModalForm({ ...modalForm, magasin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="33"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unité</label>
                  <input
                    type="text"
                    value={modalForm.unite}
                    onChange={(e) => setModalForm({ ...modalForm, unite: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                    placeholder="PCE"
                  />
                </div>
              </div>

              {/* Checkbox Important */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modal_important"
                  checked={modalForm.is_important}
                  onChange={(e) => setModalForm({ ...modalForm, is_important: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="modal_important" className="font-bold text-amber-950 cursor-pointer flex items-center gap-1">
                  <Star size={14} className="fill-amber-500 text-amber-500" />
                  <span>Marquer comme Article Important (Favori)</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>{editingItem ? 'Enregistrer Modifications' : 'Créer l\'Article'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
