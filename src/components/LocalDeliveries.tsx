import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Trash2, 
  X, 
  AlertTriangle,
  Eye,
  CheckCircle2,
  PackageCheck,
  Building2,
  Calendar,
  FileText,
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Activity,
  Layers,
  DollarSign,
  CheckCircle,
  Clock,
  Boxes,
  ListFilter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  RotateCcw,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  History,
  Info,
  Target,
  Table,
  Sliders,
  PlusCircle,
  Sparkles,
  EyeOff,
  CheckSquare,
  Square,
  Pencil,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  Check,
  Database
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  CartesianGrid 
} from 'recharts';
import { LocalDelivery, LocalOrder, User, SAPOrderMapping } from '../types';
import { parseSAPFileContent, ParsedSAPRow } from '../utils/sapParser';

const ITEM_COLORS = [
  '#0284c7', // Sky Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#e11d48', // Rose
  '#84cc16', // Lime
  '#3b82f6', // Blue
];
import { SearchableSelect } from './SearchableSelect';
import { DateInputDDMMYYYY } from './DateInputDDMMYYYY';
import { useLanguage } from '../context/LanguageContext';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { formatAmount, formatQty } from '../utils/numberUtils';

const extractYear = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (/^\d{4}/.test(str)) {
    return str.substring(0, 4);
  }
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) return parts[2];
    if (parts[0].length === 4) return parts[0];
  }
  return '';
};

const extractMonth = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (/^\d{4}[-\/]\d{2}/.test(str)) {
    return str.substring(5, 7);
  }
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      return parts[1].padStart(2, '0');
    }
  }
  return '';
};

const isPartialOrderStatus = (status?: string) => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return s === 'livraison partielle' || s === 'partielle' || s === 'partial delivery';
};

const normalizeStr = (s?: string | null): string => {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

const isSameOrder = (dOrder: any, targetOrder: any, dOrderNum?: string, targetOrderNum?: string): boolean => {
  if (dOrder !== undefined && dOrder !== null && targetOrder !== undefined && targetOrder !== null) {
    if (String(dOrder).trim() === String(targetOrder).trim()) return true;
  }
  if (dOrderNum && targetOrderNum) {
    const num1 = dOrderNum.trim().toLowerCase();
    const num2 = targetOrderNum.trim().toLowerCase();
    if (num1 && num2 && num1 === num2) return true;
  }
  return false;
};

const isSameLine = (dLineId: any, targetLineId: any, dDesig?: string, targetDesig?: string): boolean => {
  if (
    dLineId !== undefined &&
    dLineId !== null &&
    targetLineId !== undefined &&
    targetLineId !== null &&
    Number(dLineId) > 0 &&
    Number(targetLineId) > 0
  ) {
    if (String(dLineId).trim() === String(targetLineId).trim()) return true;
  }
  if (dDesig && targetDesig) {
    const n1 = normalizeStr(dDesig);
    const n2 = normalizeStr(targetDesig);
    if (n1 && n2 && (n1 === n2 || n1.includes(n2) || n2.includes(n1))) return true;
  }
  return false;
};

interface LocalDeliveriesProps {
  currentUser: User;
  orders: LocalOrder[];
  deliveries: LocalDelivery[];
  loading: boolean;
  onRefresh: () => void;
  onSelectTab?: (tab: string) => void;
}

interface DeliveryItemInput {
  line_id: number;
  designation: string;
  unite: string;
  ordered_qty: number;
  delivered_this_month: number;
  delivered_this_year: number;
  previous_delivered: number;
  remaining_qty: number;
  delivered_qty: number;
  unit_price: number;
  original_unit_price: number;
}

export const LocalDeliveries: React.FC<LocalDeliveriesProps> = ({
  currentUser,
  orders = [],
  deliveries = [],
  loading,
  onRefresh,
  onSelectTab,
}) => {
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<'table' | 'analytics'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDeliveryDetail, setSelectedDeliveryDetail] = useState<LocalDelivery | null>(null);
  const [isPriceWarningOpen, setIsPriceWarningOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(7);

  const [analyticsOrderId, setAnalyticsOrderId] = useState<number | null>(null);

  // Default to Current Year for Analytics (e.g. 2026) to prevent cluttered charts
  const [analyticsYearFilter, setAnalyticsYearFilter] = useState<string>(new Date().getFullYear().toString());
  
  // Option 1: Selected / Visible items for Line Chart (All active by default)
  const [activeLineItems, setActiveLineItems] = useState<string[] | null>(null);

  // Line Chart Granularity (Monthly by default vs Detailed by Delivery Date)
  const [lineChartGranularity, setLineChartGranularity] = useState<'month' | 'day'>('month');

  // Item filter for Monthly Year-over-Year Comparison Bar Chart (Chart 2)
  const [comparisonItemFilter, setComparisonItemFilter] = useState<string>('all');

  const toggleItemVisibility = (itemName: string, allItems: string[]) => {
    const currentActive = activeLineItems === null ? allItems : activeLineItems;
    if (currentActive.includes(itemName)) {
      setActiveLineItems(currentActive.filter((i) => i !== itemName));
    } else {
      setActiveLineItems([...currentActive, itemName]);
    }
  };

  // Table Sorting and Multi-Filter State
  type SortField = 'delivery_note_number' | 'delivery_date' | 'n_order' | 'supplier_name' | 'designation' | 'delivered_qty' | 'unit_price' | 'total_ht';
  type SortOrder = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('delivery_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedOrderFilter, setSelectedOrderFilter] = useState<string>('all');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');

  // Unique Filter Options (Strictly for orders with status "Livraison Partielle" from database)
  const uniqueOrderNumbers = useMemo(() => {
    const set = new Set<string>();
    (orders || []).forEach((o) => {
      if (isPartialOrderStatus(o.status) && o.n_order && o.n_order.trim()) {
        set.add(o.n_order.trim());
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  const uniqueSuppliers = useMemo(() => {
    const set = new Set<string>();
    (orders || []).forEach((o) => {
      if (isPartialOrderStatus(o.status)) {
        const name = o.supplier_name || o.etablir_par;
        if (name && name.trim()) set.add(name.trim());
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  const uniqueYears = useMemo(() => {
    const set = new Set<string>();

    // 1. Extract years from all actual delivery records in the database
    (deliveries || []).forEach((d) => {
      const y = extractYear(d.delivery_date || d.created_at);
      if (y && y.length === 4 && /^\d{4}$/.test(y)) {
        set.add(y);
      }
    });

    // 2. Extract years from orders in the database
    (orders || []).forEach((o) => {
      const y = extractYear(o.created_at || o.order_date || o.date_bc);
      if (y && y.length === 4 && /^\d{4}$/.test(y)) {
        set.add(y);
      }
    });

    // 3. Include current year if nothing found
    if (set.size === 0) {
      set.add(new Date().getFullYear().toString());
    }

    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [deliveries, orders]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} className="text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity ml-1 inline" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={13} className="text-sky-600 font-bold ml-1 inline" />
    ) : (
      <ArrowDown size={13} className="text-sky-600 font-bold ml-1 inline" />
    );
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedAnalyticsOrderNumbers([]);
    setSelectedOrderFilter('all');
    setSelectedSupplierFilter('all');
    setSelectedYearFilter('all');
    setCurrentPage(1);
  };

  // Filter orders eligible for delivery recording - Strictly ONLY orders with status "Livraison Partielle"
  const eligibleOrders = useMemo(() => {
    return (orders || [])
      .filter((o) => isPartialOrderStatus(o.status))
      .sort((a, b) => {
        const dateA = a.created_at || a.order_date || a.date_bc || '';
        const dateB = b.created_at || b.order_date || b.date_bc || '';
        if (dateB !== dateA) return dateB.localeCompare(dateA);
        return (b.id || 0) - (a.id || 0);
      });
  }, [orders]);

  // Modal Form State
  const [selectedOrderId, setSelectedOrderId] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItemInput[]>([]);

  const canEdit = currentUser.role === 'Appro' || currentUser.role === 'Admin';

  // SAP Import & Mapping State
  const [isSapModalOpen, setIsSapModalOpen] = useState(false);
  const [sapFile, setSapFile] = useState<File | null>(null);
  const [sapParsedRows, setSapParsedRows] = useState<ParsedSAPRow[]>([]);
  const [sapOrderMappings, setSapOrderMappings] = useState<Record<string, { orderId: number; orderNumber: string }>>({});
  const [savedDbMappings, setSavedDbMappings] = useState<SAPOrderMapping[]>([]);
  const [isParsingSap, setIsParsingSap] = useState(false);
  const [isImportingSap, setIsImportingSap] = useState(false);
  const [sapImportStep, setSapImportStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [sapImportSuccessMessage, setSapImportSuccessMessage] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearingDeliveries, setIsClearingDeliveries] = useState(false);

  const loadSavedMappings = async () => {
    try {
      const res = await fetch('/api/local-deliveries/sap-mappings');
      if (res.ok) {
        const data = await res.json();
        setSavedDbMappings(data || []);
      }
    } catch (e) {
      console.error('Error loading SAP mappings:', e);
    }
  };

  useEffect(() => {
    loadSavedMappings();
  }, []);

  const handleClearAllDeliveries = async () => {
    setIsClearingDeliveries(true);
    try {
      const res = await fetch('/api/local-deliveries/clear-all', { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
        setIsClearConfirmOpen(false);
      }
    } catch (e) {
      console.error('Error clearing deliveries:', e);
    } finally {
      setIsClearingDeliveries(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSapFile(file);
    setIsParsingSap(true);
    setSapImportSuccessMessage(null);

    const reader = new FileReader();
    const isBinary = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (content) {
          const parsed = parseSAPFileContent(content as any);
          setSapParsedRows(parsed);

          const initialMappings: Record<string, { orderId: number; orderNumber: string }> = {};
          const uniqueSapOrders = Array.from(new Set(parsed.map((r) => r.poNum).filter(Boolean)));

          uniqueSapOrders.forEach((po) => {
            const saved = savedDbMappings.find((m) => m.sap_order_number === po);
            if (saved) {
              initialMappings[po] = {
                orderId: saved.local_order_id,
                orderNumber: saved.local_order_number,
              };
            } else {
              const matchingOrder = orders.find(
                (o) =>
                  o.n_order === po ||
                  (o.objet_de_commande && o.objet_de_commande.includes(po))
              );
              if (matchingOrder) {
                initialMappings[po] = {
                  orderId: matchingOrder.id,
                  orderNumber: matchingOrder.n_order,
                };
              }
            }
          });

          setSapOrderMappings(initialMappings);
          setSapImportStep('mapping');
        }
      } catch (err: any) {
        alert("Erreur lors de la lecture du fichier SAP: " + (err?.message || String(err)));
      } finally {
        setIsParsingSap(false);
      }
    };

    if (isBinary) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const uniqueSapOrdersInFile = useMemo(() => {
    return Array.from(new Set(sapParsedRows.map((r) => r.poNum).filter(Boolean)));
  }, [sapParsedRows]);

  const mappedDeliveryItemsToImport = useMemo(() => {
    const items: any[] = [];
    sapParsedRows.forEach((row) => {
      const mapping = sapOrderMappings[row.poNum];
      if (!mapping || !mapping.orderId) return;

      const targetOrder = orders.find((o) => o.id === mapping.orderId);
      if (!targetOrder) return;

      let matchedLine = targetOrder.lines?.find((l) =>
        isSameLine(l.id, undefined, l.designation, row.designation)
      );

      if (!matchedLine && targetOrder.lines && targetOrder.lines.length > 0) {
        matchedLine = targetOrder.lines[0];
      }

      const lineId = matchedLine ? matchedLine.id : 0;
      const unitPrice = matchedLine ? matchedLine.unit_price : 0;

      items.push({
        order_id: targetOrder.id,
        n_order: targetOrder.n_order,
        line_id: lineId,
        designation: row.designation,
        unite: row.uom || (matchedLine ? matchedLine.unite : 'PCE'),
        delivered_qty: row.qty,
        delivery_date: row.date,
        delivery_note_number: row.ref || row.matDoc || 'BL-SAP',
        movement_code: row.moveCode,
        material_doc_number: row.matDoc,
        sap_order_number: row.poNum,
        item_code: row.itemCode,
        unit_price: unitPrice,
      });
    });
    return items;
  }, [sapParsedRows, sapOrderMappings, orders]);

  const handleConfirmSapImport = async () => {
    if (mappedDeliveryItemsToImport.length === 0) {
      alert("Aucune ligne valide à importer. Veuillez vérifier le mappage des commandes.");
      return;
    }

    setIsImportingSap(true);
    try {
      const newMappingsToSave = Object.keys(sapOrderMappings)
        .filter((sapPo) => Boolean(sapOrderMappings[sapPo]?.orderId))
        .map((sapPo) => ({
          sap_order_number: sapPo,
          local_order_id: sapOrderMappings[sapPo].orderId,
          local_order_number: sapOrderMappings[sapPo].orderNumber,
        }));

      const res = await fetch('/api/local-deliveries/import-sap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: mappedDeliveryItemsToImport,
          newMappings: newMappingsToSave,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setSapImportSuccessMessage(
          `Importation réussie : ${result.insertedCount} lignes importées (avec annulations 104 et réceptions 103).`
        );
        onRefresh();
        loadSavedMappings();
        setTimeout(() => {
          setIsSapModalOpen(false);
          setSapParsedRows([]);
          setSapFile(null);
          setSapImportStep('upload');
          setSapImportSuccessMessage(null);
        }, 2200);
      } else {
        const err = await res.json();
        alert("Erreur lors de l'importation: " + (err.error || "Erreur serveur"));
      }
    } catch (err: any) {
      alert("Erreur de connexion: " + (err?.message || String(err)));
    } finally {
      setIsImportingSap(false);
    }
  };

  // Selected order numbers for Analytics filtering. Empty array [] means ALL orders selected.
  const [selectedAnalyticsOrderNumbers, setSelectedAnalyticsOrderNumbers] = useState<string[]>([]);
  // Metric unit mode: 'qty' (default) or 'amount' (Montant DA TTC)
  const [analyticsMetricMode, setAnalyticsMetricMode] = useState<'qty' | 'amount'>('qty');

  // Search dropdown state
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
  const [orderDropdownSearch, setOrderDropdownSearch] = useState('');

  // Refs for closing order dropdown on click outside
  const orderDropdownRef = useRef<HTMLDivElement>(null);
  const analyticsOrderDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTableDropdown = orderDropdownRef.current && orderDropdownRef.current.contains(target);
      const isInsideAnalyticsDropdown = analyticsOrderDropdownRef.current && analyticsOrderDropdownRef.current.contains(target);
      if (isOrderDropdownOpen && !isInsideTableDropdown && !isInsideAnalyticsDropdown) {
        setIsOrderDropdownOpen(false);
      }
    };
    if (isOrderDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOrderDropdownOpen]);

  // Global Escape Key Listener for all popups, forms, and dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (isOrderDropdownOpen) {
          setIsOrderDropdownOpen(false);
        } else if (isPriceWarningOpen) {
          setIsPriceWarningOpen(false);
        } else if (isClearConfirmOpen) {
          setIsClearConfirmOpen(false);
        } else if (isDetailOpen) {
          setIsDetailOpen(false);
        } else if (isModalOpen) {
          setIsModalOpen(false);
        } else if (isSapModalOpen) {
          setIsSapModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOrderDropdownOpen,
    isPriceWarningOpen,
    isClearConfirmOpen,
    isDetailOpen,
    isModalOpen,
    isSapModalOpen,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const currentOrder = eligibleOrders.find((o) => o.id === selectedOrderId) || eligibleOrders[0];

  const toggleAnalyticsOrderSelection = (ordNum: string) => {
    setSelectedAnalyticsOrderNumbers((prev) => {
      if (prev.includes(ordNum)) {
        return prev.filter((n) => n !== ordNum);
      } else {
        return [...prev, ordNum];
      }
    });
  };

  const selectAllAnalyticsOrders = () => {
    setSelectedAnalyticsOrderNumbers([]);
  };

  const orderDropdownOptions = useMemo(() => {
    const optionsMap = new Map<string, string>();

    // Show ONLY orders with status "Livraison Partielle" from database
    (orders || []).forEach((o) => {
      if (isPartialOrderStatus(o.status) && o.n_order && o.n_order.trim()) {
        const sup = o.supplier_name || o.etablir_par || 'Fournisseur';
        optionsMap.set(o.n_order.trim(), sup);
      }
    });

    const list = Array.from(optionsMap.entries())
      .map(([ordNum, supplierName]) => ({
        ordNum,
        supplierName,
      }))
      .sort((a, b) => a.ordNum.localeCompare(b.ordNum));

    if (!orderDropdownSearch.trim()) return list;

    const search = orderDropdownSearch.toLowerCase().trim();
    return list.filter(
      (item) => item.ordNum.toLowerCase().includes(search) || item.supplierName.toLowerCase().includes(search)
    );
  }, [orders, orderDropdownSearch]);

  const analyticsFilteredOrders = useMemo(() => {
    // Strictly filter to ONLY orders marked as "Livraison Partielle"
    let list = (orders || []).filter((o) => isPartialOrderStatus(o.status));

    if (analyticsYearFilter !== 'all') {
      list = list.filter((o) => {
        const orderYear = extractYear(o.created_at || o.order_date || o.date_bc);
        if (orderYear === analyticsYearFilter) return true;
        // Check if any deliveries of this order took place in this year
        return (deliveries || []).some((d) => {
          const isMatch = (d.local_order_id || d.order_id) === o.id || (d.n_order && o.n_order && d.n_order.trim() === o.n_order.trim());
          const dYear = extractYear(d.delivery_date || d.created_at);
          return isMatch && dYear === analyticsYearFilter;
        });
      });
    }

    if (selectedAnalyticsOrderNumbers.length > 0) {
      list = list.filter((o) => o.n_order && selectedAnalyticsOrderNumbers.includes(o.n_order.trim()));
    }

    return list;
  }, [orders, deliveries, analyticsYearFilter, selectedAnalyticsOrderNumbers]);

  const analyticsFilteredDeliveries = useMemo(() => {
    // Only include deliveries for the partial orders
    const partialOrderIds = new Set(analyticsFilteredOrders.map((o) => o.id));
    const partialOrderNums = new Set(analyticsFilteredOrders.map((o) => (o.n_order || '').trim()).filter(Boolean));

    let list = (deliveries || []).filter((d) => {
      const parentOrderId = d.local_order_id || d.order_id;
      const isIdMatch = parentOrderId && partialOrderIds.has(parentOrderId);
      const isNumMatch = d.n_order && partialOrderNums.has(d.n_order.trim());
      return isIdMatch || isNumMatch;
    });

    if (analyticsYearFilter !== 'all') {
      list = list.filter((d) => {
        const delivYear = extractYear(d.delivery_date || d.created_at);
        return delivYear === analyticsYearFilter;
      });
    }

    return list;
  }, [deliveries, analyticsFilteredOrders, analyticsYearFilter]);

  // Analytics Computations (supporting Qty & Amount)
  const analyticsData = useMemo(() => {
    const targetDeliveries = analyticsFilteredDeliveries;
    const targetOrders = analyticsFilteredOrders;

    const totalBlCount = targetDeliveries.length;

    // Quantity Metrics
    const totalDeliveredItemsCount = targetDeliveries.reduce((sum, d) => sum + (d.delivered_qty || 0), 0);
    const totalOrderedItemsCount = targetOrders.reduce((sum, o) => {
      const lineSum = (o.lines || []).reduce((lSum, l) => lSum + (l.qty || 0), 0);
      return sum + lineSum;
    }, 0);
    const overallQtyFulfillmentRate = totalOrderedItemsCount > 0 ? (totalDeliveredItemsCount / totalOrderedItemsCount) * 100 : 0;

    // Financial Metrics (Amount DA TTC)
    const totalDeliveredValTTC = targetDeliveries.reduce((sum, d) => {
      const lineTotalHT = (d.delivered_qty || 0) * (d.unit_price || 0);
      return sum + lineTotalHT * 1.19;
    }, 0);
    const totalOrderedValTTC = targetOrders.reduce((sum, o) => sum + (Number(o.total_ttc) || 0), 0);
    const overallValFulfillmentRate = totalOrderedValTTC > 0 ? (totalDeliveredValTTC / totalOrderedValTTC) * 100 : 0;

    // Active metric rates & values depending on mode
    const activeFulfillmentRate = analyticsMetricMode === 'qty' ? overallQtyFulfillmentRate : overallValFulfillmentRate;

    // Timeline data per distinct item - Each item has its own line, not summed together
    const itemNamesSet = new Set<string>();
    const timePointsSet = new Set<string>();
    const itemTimelineMap: Record<string, Record<string, number>> = {};
    const itemPriceMap: Record<string, number> = {};

    // Collect delivered values
    targetDeliveries.forEach((d) => {
      const timeKey = d.delivery_date ? d.delivery_date.substring(0, 7) : '2026-08';
      const itemName = d.designation?.trim() || 'Article';
      const qty = d.delivered_qty || 0;
      const unitPrice = d.unit_price || 0;
      if (unitPrice > 0) itemPriceMap[itemName] = unitPrice;

      const amount = qty * unitPrice * 1.19;
      const val = analyticsMetricMode === 'qty' ? qty : amount;

      itemNamesSet.add(itemName);
      timePointsSet.add(timeKey);

      if (!itemTimelineMap[timeKey]) {
        itemTimelineMap[timeKey] = {};
      }
      itemTimelineMap[timeKey][itemName] = (itemTimelineMap[timeKey][itemName] || 0) + val;
    });

    // Collect item total delivered volume to sort uniqueItems by activity (Top items first)
    const itemTotalVolumeMap: Record<string, number> = {};
    targetDeliveries.forEach((d) => {
      const name = d.designation?.trim() || 'Article';
      const qty = d.delivered_qty || 0;
      const amount = qty * (d.unit_price || 0) * 1.19;
      const val = analyticsMetricMode === 'qty' ? qty : amount;
      itemTotalVolumeMap[name] = (itemTotalVolumeMap[name] || 0) + val;
    });

    // Collect item designations & unit prices from orders
    targetOrders.forEach((o) => {
      (o.lines || []).forEach((l) => {
        if (l.designation) {
          const name = l.designation.trim();
          itemNamesSet.add(name);
          if (l.unit_price && !itemPriceMap[name]) itemPriceMap[name] = l.unit_price;
        }
      });
    });

    // Sort unique items by most active delivered volume first!
    const uniqueItems = Array.from(itemNamesSet).sort(
      (a, b) => (itemTotalVolumeMap[b] || 0) - (itemTotalVolumeMap[a] || 0)
    );

    if (timePointsSet.size === 0) {
      ['2026-07', '2026-08', '2026-09', '2026-10'].forEach((m) => timePointsSet.add(m));
    }

    const sortedTimePoints = Array.from(timePointsSet).sort();

    const timelineData = sortedTimePoints.map((tKey) => {
      const row: Record<string, any> = { month: tKey };
      uniqueItems.forEach((itemName) => {
        row[itemName] = Math.round(itemTimelineMap[tKey]?.[itemName] || 0);
      });
      return row;
    });

    // Top suppliers data - Qty & Amount
    const supplierQtyMap: Record<string, number> = {};
    const supplierAmountMap: Record<string, number> = {};

    targetDeliveries.forEach((d) => {
      const ord = targetOrders.find((o) => o.id === (d.local_order_id || d.order_id) || (d.n_order && o.n_order === d.n_order));
      const sName = d.supplier_name || ord?.supplier_name || ord?.etablir_par || 'Fournisseur Inconnu';
      const qty = d.delivered_qty || 0;
      const amount = qty * (d.unit_price || 0) * 1.19;

      supplierQtyMap[sName] = (supplierQtyMap[sName] || 0) + qty;
      supplierAmountMap[sName] = (supplierAmountMap[sName] || 0) + amount;
    });

    const supplierNames = Array.from(new Set([...Object.keys(supplierQtyMap), ...Object.keys(supplierAmountMap)]));

    const supplierData = supplierNames
      .map((sName) => ({
        supplier: sName.length > 18 ? `${sName.substring(0, 18)}...` : sName,
        fullName: sName,
        val: analyticsMetricMode === 'qty' ? Math.round(supplierQtyMap[sName] || 0) : Math.round(supplierAmountMap[sName] || 0),
        qty: Math.round(supplierQtyMap[sName] || 0),
        montant: Math.round(supplierAmountMap[sName] || 0),
      }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 6);

    const topSupplier = supplierData[0] || { fullName: 'Aucun', val: 0, qty: 0, montant: 0 };

    // Progression breakdown of partial orders
    let tierUnder25 = 0;
    let tier25to50 = 0;
    let tier50to75 = 0;
    let tierAbove75 = 0;

    targetOrders.forEach((o) => {
      const totalOrdered = (o.lines || []).reduce((s, l) => s + (l.qty || 0), 0);
      const totalDeliv = targetDeliveries
        .filter((d) => (d.local_order_id || d.order_id) === o.id || (d.n_order && o.n_order === d.n_order))
        .reduce((s, d) => s + (d.delivered_qty || 0), 0);
      const rate = totalOrdered > 0 ? (totalDeliv / totalOrdered) * 100 : 0;

      if (rate < 25) tierUnder25++;
      else if (rate < 50) tier25to50++;
      else if (rate < 75) tier50to75++;
      else tierAbove75++;
    });

    const statusPieData = [
      { name: 'Avancement > 75%', value: tierAbove75, color: '#10b981' },
      { name: 'Avancement 50% - 75%', value: tier50to75, color: '#0284c7' },
      { name: 'Avancement 25% - 50%', value: tier25to50, color: '#f59e0b' },
      { name: 'Avancement < 25%', value: tierUnder25, color: '#ef4444' },
    ].filter((item) => item.value > 0);

    return {
      totalBlCount,
      totalDeliveredValTTC,
      totalOrderedValTTC,
      totalDeliveredItemsCount,
      totalOrderedItemsCount,
      overallQtyFulfillmentRate,
      overallValFulfillmentRate,
      activeFulfillmentRate,
      timelineData,
      uniqueItems,
      sortedTimePoints,
      itemPriceMap,
      supplierData,
      topSupplier,
      statusPieData,
    };
  }, [analyticsFilteredDeliveries, analyticsFilteredOrders, analyticsMetricMode]);

  // All unique item designations across all historical deliveries and orders
  const allUniqueItemDesignations = useMemo(() => {
    const set = new Set<string>();
    (deliveries || []).forEach((d) => {
      if (d.designation?.trim()) set.add(d.designation.trim());
    });
    (orders || []).forEach((o) => {
      (o.lines || []).forEach((l) => {
        if (l.designation?.trim()) set.add(l.designation.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [deliveries, orders]);

  // Monthly Year-over-Year Comparison Data (This Year vs Last Year by Month, with Item Selection)
  // Calculates ALL quantities of that item delivered in the past year vs this year (does NOT follow order number)
  const monthlyComparisonData = useMemo(() => {
    const currentYear = analyticsYearFilter !== 'all' ? parseInt(analyticsYearFilter, 10) : new Date().getFullYear();
    const previousYear = currentYear - 1;
    const currYearStr = currentYear.toString();
    const prevYearStr = previousYear.toString();

    const MONTH_DEFS = [
      { num: '01', label: 'Jan' },
      { num: '02', label: 'Fév' },
      { num: '03', label: 'Mar' },
      { num: '04', label: 'Avr' },
      { num: '05', label: 'Mai' },
      { num: '06', label: 'Juin' },
      { num: '07', label: 'Juil' },
      { num: '08', label: 'Août' },
      { num: '09', label: 'Sep' },
      { num: '10', label: 'Oct' },
      { num: '11', label: 'Nov' },
      { num: '12', label: 'Déc' },
    ];

    let targetDeliveries = deliveries || [];
    if (comparisonItemFilter !== 'all') {
      targetDeliveries = targetDeliveries.filter(
        (d) => d.designation && isSameLine(undefined, undefined, d.designation, comparisonItemFilter)
      );
    }

    let totalCurrYearVal = 0;
    let totalPrevYearVal = 0;

    const chartData = MONTH_DEFS.map((m) => {
      let currVal = 0;
      let prevVal = 0;

      targetDeliveries.forEach((d) => {
        const dateStr = d.delivery_date || d.created_at || '';
        const dYear = extractYear(dateStr);
        const dMonth = extractMonth(dateStr);

        if (dMonth === m.num) {
          const qty = d.delivered_qty || 0;
          const amount = qty * (d.unit_price || 0) * 1.19;
          const val = analyticsMetricMode === 'qty' ? qty : amount;

          if (dYear === currYearStr) {
            currVal += val;
          } else if (dYear === prevYearStr) {
            prevVal += val;
          }
        }
      });

      totalCurrYearVal += currVal;
      totalPrevYearVal += prevVal;

      let monthGrowthText: string | null = null;
      let monthGrowthColor: string = '#64748b';

      if (prevVal > 0) {
        const pct = ((currVal - prevVal) / prevVal) * 100;
        if (pct > 0) {
          monthGrowthText = `+${pct >= 100 ? Math.round(pct) : pct.toFixed(0)}%`;
          monthGrowthColor = '#10b981'; // Emerald Green
        } else if (pct < 0) {
          monthGrowthText = `${pct <= -100 ? Math.round(pct) : pct.toFixed(0)}%`;
          monthGrowthColor = '#ef4444'; // Red
        } else {
          monthGrowthText = `0%`;
          monthGrowthColor = '#64748b'; // Neutral Slate
        }
      } else if (currVal > 0) {
        monthGrowthText = `+100%`;
        monthGrowthColor = '#10b981'; // Emerald Green
      }

      return {
        month: m.label,
        monthNum: m.num,
        [currYearStr]: Math.round(currVal),
        [prevYearStr]: Math.round(prevVal),
        monthGrowthText,
        monthGrowthColor,
      };
    });

    const growthRate = totalPrevYearVal > 0 
      ? ((totalCurrYearVal - totalPrevYearVal) / totalPrevYearVal) * 100 
      : null;

    return {
      chartData,
      totalCurrYearVal: Math.round(totalCurrYearVal),
      totalPrevYearVal: Math.round(totalPrevYearVal),
      growthRate,
      currYearStr,
      prevYearStr,
    };
  }, [deliveries, analyticsYearFilter, comparisonItemFilter, analyticsMetricMode]);

  // List of all partial orders
  const partialOrdersList = useMemo(() => {
    return (orders || []).filter((o) => isPartialOrderStatus(o.status));
  }, [orders]);

  // Find the partial order that received the latest delivery (by most recent delivery date, fallback to order date)
  const latestPartialOrder = useMemo(() => {
    if (partialOrdersList.length === 0) return null;

    return [...partialOrdersList].sort((a, b) => {
      const delivsA = (deliveries || []).filter(
        (d) => (d.local_order_id || d.order_id) === a.id || (d.n_order && a.n_order && d.n_order.trim() === a.n_order.trim())
      );
      let maxDateA = '';
      delivsA.forEach((d) => {
        const dt = d.delivery_date || d.created_at || '';
        if (dt > maxDateA) maxDateA = dt;
      });
      if (!maxDateA) maxDateA = a.created_at || a.order_date || a.date_bc || '';

      const delivsB = (deliveries || []).filter(
        (d) => (d.local_order_id || d.order_id) === b.id || (d.n_order && b.n_order && d.n_order.trim() === b.n_order.trim())
      );
      let maxDateB = '';
      delivsB.forEach((d) => {
        const dt = d.delivery_date || d.created_at || '';
        if (dt > maxDateB) maxDateB = dt;
      });
      if (!maxDateB) maxDateB = b.created_at || b.order_date || b.date_bc || '';

      if (maxDateB !== maxDateA) return maxDateB.localeCompare(maxDateA);
      return (b.id || 0) - (a.id || 0);
    })[0];
  }, [partialOrdersList, deliveries]);

  // Active targeted order for Line Chart & Item Breakdown (Defaults to Latest Order with Deliveries)
  const lineChartOrder = useMemo(() => {
    if (analyticsOrderId) {
      const found = partialOrdersList.find((o) => o.id === analyticsOrderId);
      if (found) return found;
    }
    if (analyticsFilteredOrders && analyticsFilteredOrders.length > 0) {
      return [...analyticsFilteredOrders].sort((a, b) => {
        const delivsA = (deliveries || []).filter(
          (d) => (d.local_order_id || d.order_id) === a.id || (d.n_order && a.n_order && d.n_order.trim() === a.n_order.trim())
        );
        let maxDateA = '';
        delivsA.forEach((d) => {
          const dt = d.delivery_date || d.created_at || '';
          if (dt > maxDateA) maxDateA = dt;
        });
        if (!maxDateA) maxDateA = a.created_at || a.order_date || a.date_bc || '';

        const delivsB = (deliveries || []).filter(
          (d) => (d.local_order_id || d.order_id) === b.id || (d.n_order && b.n_order && d.n_order.trim() === b.n_order.trim())
        );
        let maxDateB = '';
        delivsB.forEach((d) => {
          const dt = d.delivery_date || d.created_at || '';
          if (dt > maxDateB) maxDateB = dt;
        });
        if (!maxDateB) maxDateB = b.created_at || b.order_date || b.date_bc || '';

        if (maxDateB !== maxDateA) return maxDateB.localeCompare(maxDateA);
        return (b.id || 0) - (a.id || 0);
      })[0];
    }
    return latestPartialOrder;
  }, [analyticsOrderId, analyticsFilteredOrders, partialOrdersList, latestPartialOrder, deliveries]);

  // Timeline and Delivery Data Specifically for the Latest / Selected Order
  const lineChartOrderData = useMemo(() => {
    if (!lineChartOrder) {
      return {
        order: null,
        isLatest: false,
        timelineData: [],
        uniqueItems: [],
        totalDeliveredQty: 0,
        totalOrderedQty: 0,
        fulfillmentRate: 0,
        deliveriesCount: 0,
      };
    }

    const isLatest = Boolean(latestPartialOrder && lineChartOrder.id === latestPartialOrder.id);

    // Deliveries specifically for this order
    const orderDelivs = (deliveries || []).filter(
      (d) =>
        (d.local_order_id || d.order_id) === lineChartOrder.id ||
        (d.n_order && lineChartOrder.n_order === d.n_order)
    );

    // Unique Items for this order from order lines
    const itemNamesSet = new Set<string>();
    (lineChartOrder.lines || []).forEach((l) => {
      if (l.designation?.trim()) itemNamesSet.add(l.designation.trim());
    });
    orderDelivs.forEach((d) => {
      if (d.designation?.trim()) itemNamesSet.add(d.designation.trim());
    });
    const uniqueItems = Array.from(itemNamesSet);

    // Distinct delivery dates/months for this order
    const timeMap: Record<string, Record<string, number>> = {};
    const dateKeysSet = new Set<string>();

    orderDelivs.forEach((d) => {
      const dDate = d.delivery_date ? d.delivery_date.substring(0, 10) : '';
      let timeKey = 'Date N/A';
      if (dDate) {
        timeKey = lineChartGranularity === 'month' ? dDate.substring(0, 7) : dDate;
      }
      const itemName = d.designation?.trim() || 'Article';
      const qty = d.delivered_qty || 0;
      const amount = qty * (d.unit_price || 0) * 1.19;
      const val = analyticsMetricMode === 'qty' ? qty : amount;

      dateKeysSet.add(timeKey);
      if (!timeMap[timeKey]) timeMap[timeKey] = {};
      timeMap[timeKey][itemName] = (timeMap[timeKey][itemName] || 0) + val;
    });

    const sortedKeys = Array.from(dateKeysSet).sort();

    const timelineData = sortedKeys.map((key) => {
      let formattedLabel = key;
      if (key !== 'Date N/A') {
        if (lineChartGranularity === 'month') {
          const monthIdx = parseInt(key.substring(5, 7), 10) - 1;
          const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
          const yr = key.substring(0, 4);
          formattedLabel = `${monthNames[monthIdx] || key.substring(5, 7)} ${yr}`;
        } else {
          formattedLabel = formatDateDDMMYYYY(key);
        }
      }
      const row: Record<string, any> = { date: formattedLabel, rawKey: key };
      uniqueItems.forEach((itemName) => {
        row[itemName] = Math.round(timeMap[key]?.[itemName] || 0);
      });
      return row;
    });

    // Order Totals
    const totalOrderedQty = (lineChartOrder.lines || []).reduce((s, l) => s + (l.qty || 0), 0);
    const totalDeliveredQty = orderDelivs.reduce((s, d) => s + (d.delivered_qty || 0), 0);
    const fulfillmentRate = totalOrderedQty > 0 ? (totalDeliveredQty / totalOrderedQty) * 100 : 0;

    return {
      order: lineChartOrder,
      isLatest,
      timelineData,
      uniqueItems,
      totalDeliveredQty,
      totalOrderedQty,
      fulfillmentRate,
      deliveriesCount: orderDelivs.length,
    };
  }, [lineChartOrder, latestPartialOrder, deliveries, analyticsMetricMode, lineChartGranularity]);

  // Dropdown items for Bar Chart: extracted directly from the selected order
  const barChartDropdownItems = useMemo(() => {
    if (lineChartOrderData.uniqueItems && lineChartOrderData.uniqueItems.length > 0) {
      return lineChartOrderData.uniqueItems;
    }
    return allUniqueItemDesignations;
  }, [lineChartOrderData.uniqueItems, allUniqueItemDesignations]);

  // Automatically default the Bar Chart comparison item to the first item of the selected order
  useEffect(() => {
    if (barChartDropdownItems.length > 0) {
      setComparisonItemFilter(barChartDropdownItems[0]);
    }
  }, [barChartDropdownItems]);

  // Selected Order Object for Line Item Analytics Breakdown (Synced with lineChartOrder)
  const selectedAnalyticsOrderObj = lineChartOrder;

  // Populate line items when order changes or modal opens
  const updateDeliveryItemsForOrder = (orderId: number | string, targetDate?: string) => {
    if (!orderId) {
      setDeliveryItems([]);
      return;
    }

    const ord = (orders || []).find(
      (o) => String(o.id) === String(orderId) || (o.n_order && String(o.n_order).trim() === String(orderId).trim())
    ) || eligibleOrders.find((o) => String(o.id) === String(orderId));

    if (!ord) {
      setDeliveryItems([]);
      return;
    }

    const dateToUse = targetDate || deliveryDate || new Date().toISOString().split('T')[0];
    const targetYear = extractYear(dateToUse) || new Date().getFullYear().toString();
    const targetMonth = extractMonth(dateToUse) || String(new Date().getMonth() + 1).padStart(2, '0');

    let rawLines = ord.lines || [];
    // If order lines are empty in order object, fallback to unique items recorded in deliveries for this order
    if (rawLines.length === 0) {
      const pastDelivs = (deliveries || []).filter(
        (d) => isSameOrder(d.local_order_id || d.order_id, ord.id, d.n_order, ord.n_order)
      );
      const itemMap = new Map<string, any>();
      pastDelivs.forEach((d) => {
        const key = d.designation?.trim() || 'Article';
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            id: d.line_id || Math.floor(Math.random() * 100000),
            designation: key,
            unite: d.unite || 'U',
            qty: Number(d.ordered_qty) || Number(d.delivered_qty) || 0,
            unit_price: Number(d.unit_price) || 0,
          });
        }
      });
      rawLines = Array.from(itemMap.values());
    }

    const items: DeliveryItemInput[] = rawLines.map((line, idx) => {
      const lineId = line.id || idx + 1;
      const itemDeliveries = (deliveries || []).filter(
        (d) =>
          isSameOrder(d.local_order_id || d.order_id, ord.id, d.n_order, ord.n_order) &&
          isSameLine(d.line_id, lineId, d.designation, line.designation)
      );

      let prevDelivered = 0;
      let deliveredThisMonth = 0;
      let deliveredThisYear = 0;

      itemDeliveries.forEach((d) => {
        const qty = Number(d.delivered_qty) || 0;
        const dYear = extractYear(d.delivery_date || d.created_at);
        const dMonth = extractMonth(d.delivery_date || d.created_at);

        prevDelivered += qty;
        if (dYear === targetYear) {
          deliveredThisYear += qty;
          if (dMonth === targetMonth) {
            deliveredThisMonth += qty;
          }
        }
      });

      const lineOrderedQty = Number(line.qty) || 0;
      const remaining = Math.max(0, lineOrderedQty - prevDelivered);

      return {
        line_id: lineId,
        designation: line.designation || 'Article',
        unite: line.unite || 'U',
        ordered_qty: lineOrderedQty,
        delivered_this_month: deliveredThisMonth,
        delivered_this_year: deliveredThisYear,
        previous_delivered: prevDelivered,
        remaining_qty: remaining,
        delivered_qty: 0,
        unit_price: Number(line.unit_price) || 0,
        original_unit_price: Number(line.unit_price) || 0,
      };
    });

    setDeliveryItems(items);
  };

  // Edit Delivery Modal State
  const [editingDelivery, setEditingDelivery] = useState<LocalDelivery | null>(null);
  const [editDeliveryNoteNumber, setEditDeliveryNoteNumber] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editDeliveredQty, setEditDeliveredQty] = useState<number | string>('');
  const [editUnitPrice, setEditUnitPrice] = useState<number | string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleOpenModal = () => {
    if (eligibleOrders.length > 0) {
      const firstOrd = eligibleOrders[0];
      setSelectedOrderId(firstOrd.id);
      updateDeliveryItemsForOrder(firstOrd.id);
    } else {
      setDeliveryItems([]);
    }
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setDeliveryNoteNumber('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (deliv: LocalDelivery) => {
    setEditingDelivery(deliv);
    setEditDeliveryNoteNumber(deliv.delivery_note_number || '');
    setEditDeliveryDate(deliv.delivery_date || new Date().toISOString().split('T')[0]);
    setEditDeliveredQty(deliv.delivered_qty || '');
    setEditUnitPrice(deliv.unit_price || 0);
    setIsEditModalOpen(true);
  };

  const handleSaveEditDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDelivery) return;

    if (!editDeliveryNoteNumber.trim()) {
      alert('Veuillez renseigner le N° de Bon de Livraison (BL).');
      return;
    }

    const qtyNum = Number(editDeliveredQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Veuillez renseigner une quantité livrée valide supérieure à 0.');
      return;
    }

    try {
      const res = await fetch(`/api/local-deliveries/${editingDelivery.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_note_number: editDeliveryNoteNumber.trim(),
          delivery_date: editDeliveryDate,
          delivered_qty: qtyNum,
          unit_price: Number(editUnitPrice) || 0,
        }),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingDelivery(null);
        onRefresh();
      } else {
        const err = await res.json();
        alert(`Erreur: ${err.error || 'Impossible de mettre à jour la livraison.'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau lors de la mise à jour de la livraison.');
    }
  };

  const handleOrderChange = (ordId: number) => {
    setSelectedOrderId(ordId);
    updateDeliveryItemsForOrder(ordId);
  };

  const handleItemQtyChange = (lineId: number, val: number) => {
    setDeliveryItems((prev) =>
      prev.map((item) => (item.line_id === lineId ? { ...item, delivered_qty: val } : item))
    );
  };

  const handleItemPriceChange = (lineId: number, val: number) => {
    setDeliveryItems((prev) =>
      prev.map((item) => (item.line_id === lineId ? { ...item, unit_price: val } : item))
    );
  };

  const executeSaveDeliveries = async () => {
    const validItems = deliveryItems.filter((item) => Number(item.delivered_qty) > 0);
    if (validItems.length === 0) {
      alert('Veuillez entrer une quantité livrée supérieure à 0 pour au moins un article.');
      return;
    }

    const currentOrd = (orders || []).find((o) => o.id === selectedOrderId);

    try {
      const batchPayload = validItems.map((item) => ({
        order_id: selectedOrderId,
        n_order: currentOrd?.n_order || '',
        line_id: item.line_id,
        designation: item.designation,
        unite: item.unite,
        delivered_qty: Number(item.delivered_qty),
        unit_price: Number(item.unit_price) || 0,
        delivery_date: deliveryDate,
        delivery_note_number: deliveryNoteNumber.trim(),
      }));

      const res = await fetch('/api/local-deliveries/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveries: batchPayload }),
      });

      if (res.ok) {
        setIsPriceWarningOpen(false);
        setIsModalOpen(false);
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        const err = await res.json();
        alert(`Erreur: ${err.error || 'Impossible d\'enregistrer les bons de livraison.'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'enregistrement des livraisons.');
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      alert('Veuillez sélectionner une commande.');
      return;
    }
    if (!deliveryNoteNumber || !deliveryNoteNumber.trim()) {
      alert('Veuillez obligatoirement renseigner le champ N° Bon de Livraison (BL).');
      return;
    }

    const itemsToDeliver = deliveryItems.filter((i) => (Number(i.delivered_qty) || 0) > 0);
    if (itemsToDeliver.length === 0) {
      alert('Veuillez obligatoirement saisir la quantité livrée (supérieure à 0) pour au moins un article.');
      return;
    }

    const hasPriceChange = itemsToDeliver.some((i) => i.unit_price !== i.original_unit_price);
    if (hasPriceChange) {
      setIsPriceWarningOpen(true);
    } else {
      executeSaveDeliveries();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bon de livraison ?')) return;
    try {
      const res = await fetch(`/api/local-deliveries/${id}`, { method: 'DELETE' });
      if (res.ok && onRefresh) await onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredDeliveries = useMemo(() => {
    // Strictly filter to ONLY deliveries belonging to orders with status "Livraison Partielle"
    const partialOrdersList = (orders || []).filter((o) => isPartialOrderStatus(o.status));
    const partialOrderIds = new Set<string | number>(
      partialOrdersList.flatMap((o) => [o.id, Number(o.id), String(o.id)].filter((v) => v !== undefined && v !== null))
    );
    const partialOrderNums = new Set(
      partialOrdersList.map((o) => (o.n_order || '').trim().toLowerCase()).filter(Boolean)
    );

    let result = (deliveries || [])
      .filter((d) => {
        const parentOrderId = d.local_order_id || d.order_id;
        const isIdMatch =
          parentOrderId !== undefined &&
          (partialOrderIds.has(parentOrderId) ||
            partialOrderIds.has(Number(parentOrderId)) ||
            partialOrderIds.has(String(parentOrderId)));
        const isNumMatch = d.n_order && partialOrderNums.has(d.n_order.trim().toLowerCase());
        return isIdMatch || isNumMatch;
      })
      .map((d) => {
        const parentOrder = (orders || []).find(
          (o) =>
            String(o.id) === String(d.local_order_id || d.order_id) ||
            (d.n_order && o.n_order && o.n_order.trim().toLowerCase() === d.n_order.trim().toLowerCase())
        );
        const supplierName = d.supplier_name || parentOrder?.supplier_name || parentOrder?.etablir_par || 'N/A';
        const totalHT = (d.delivered_qty || 0) * (d.unit_price || 0);
        return {
          ...d,
          n_order: d.n_order || parentOrder?.n_order || '',
          supplier_name: supplierName,
          total_ht: totalHT,
        };
      });

    // Filter by Selected Order Numbers (Multi-select searchable dropdown)
    if (selectedAnalyticsOrderNumbers.length > 0) {
      result = result.filter((d) => {
        const dOrd = (d.n_order || '').trim().toLowerCase();
        const dSap = (d.sap_order_number || '').trim().toLowerCase();
        const matchesOrd = selectedAnalyticsOrderNumbers.some((sel) => sel.trim().toLowerCase() === dOrd);
        const matchesSap = selectedAnalyticsOrderNumbers.some((sel) => sel.trim().toLowerCase() === dSap);
        if (matchesOrd || matchesSap) return true;

        const parentOrder = (orders || []).find((o) => String(o.id) === String(d.local_order_id || d.order_id));
        if (
          parentOrder?.n_order &&
          selectedAnalyticsOrderNumbers.some((sel) => sel.trim().toLowerCase() === parentOrder.n_order.trim().toLowerCase())
        ) {
          return true;
        }
        return false;
      });
    }

    // Filter by Supplier
    if (selectedSupplierFilter !== 'all') {
      const targetSup = selectedSupplierFilter.toLowerCase().trim();
      result = result.filter((d) => {
        const sup = (d.supplier_name || '').toLowerCase().trim();
        return sup === targetSup;
      });
    }

    // Filter by Year
    if (selectedYearFilter !== 'all') {
      result = result.filter((d) => extractYear(d.delivery_date || d.created_at) === selectedYearFilter);
    }

    // Search filter (N° BL, N° Commande, Designation, Fournisseur)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter((d) => {
        const blNum = (d.delivery_note_number || '').toLowerCase();
        const nOrd = (d.n_order || '').toLowerCase();
        const desig = (d.designation || '').toLowerCase();
        const sup = (d.supplier_name || '').toLowerCase();
        return blNum.includes(search) || nOrd.includes(search) || desig.includes(search) || sup.includes(search);
      });
    }

    // Interactive Sorting
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'delivery_date') {
        aVal = aVal || '';
        bVal = bVal || '';
      } else if (sortField === 'delivered_qty' || sortField === 'unit_price' || sortField === 'total_ht') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [deliveries, orders, selectedAnalyticsOrderNumbers, selectedSupplierFilter, selectedYearFilter, searchTerm, sortField, sortOrder]);

  // Dynamic Table KPIs calculated directly on filtered deliveries & selected orders
  const tableKpis = useMemo(() => {
    let totalPositiveQty = 0;
    let totalCancelledQty = 0;
    let count103 = 0;
    let count104 = 0;
    let totalNetHT = 0;

    const distinctOrders = new Set<string>();
    const distinctBLs = new Set<string>();

    filteredDeliveries.forEach((d) => {
      const qty = d.delivered_qty || 0;
      const mvt = String(d.movement_code || '').trim();
      const is104 = mvt === '104' || qty < 0;

      if (is104) {
        count104++;
        totalCancelledQty += Math.abs(qty);
      } else {
        count103++;
        totalPositiveQty += qty;
      }

      totalNetHT += (d.total_ht || qty * (d.unit_price || 0));

      if (d.n_order) distinctOrders.add(d.n_order.trim());
      if (d.delivery_note_number) distinctBLs.add(d.delivery_note_number.trim());
    });

    const netQty = totalPositiveQty - totalCancelledQty;
    const netTTC = totalNetHT * 1.19;

    // Calculate total ordered quantity for the distinct orders in view
    let totalOrderedQty = 0;
    const targetOrders = (orders || []).filter((o) => o.n_order && distinctOrders.has(o.n_order.trim()));
    targetOrders.forEach((o) => {
      (o.lines || []).forEach((l) => {
        totalOrderedQty += (l.qty || 0);
      });
    });

    const executionRate = totalOrderedQty > 0 ? Math.min(100, Math.round((netQty / totalOrderedQty) * 100)) : null;

    return {
      totalRows: filteredDeliveries.length,
      count103,
      count104,
      totalPositiveQty,
      totalCancelledQty,
      netQty,
      totalNetHT,
      netTTC,
      distinctOrdersCount: distinctOrders.size,
      distinctBLsCount: distinctBLs.size,
      executionRate,
    };
  }, [filteredDeliveries, orders]);

  const totalPages = Math.ceil(filteredDeliveries.length / pageSize) || 1;
  const paginatedDeliveries = filteredDeliveries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-3 w-full mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="text-sky-600" size={18} />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Bons de Livraison</h2>
          </div>
          <p className="text-[11px] text-slate-500">
            Suivi des réceptions par commande
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => {
                setSapImportStep('upload');
                setSapFile(null);
                setSapParsedRows([]);
                setSapImportSuccessMessage(null);
                loadSavedMappings();
                setIsSapModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors shrink-0"
              title="Importer et migrer les réceptions depuis le fichier SAP (Excel/MHTML)"
            >
              <Upload size={14} />
              <span>Importer SAP</span>
            </button>

            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-xs transition-colors shrink-0"
            >
              <Plus size={15} />
              <span>Nouveau BL</span>
            </button>

            <button
              onClick={() => setIsClearConfirmOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors shrink-0"
              title="Supprimer toutes les livraisons pour réimporter à neuf"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Vider Registre</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Top View Switcher Tabs (Table vs Analytics) */}
      <div className="flex items-center justify-between bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveView('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'table'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ListFilter size={14} />
            <span>📋 Registre</span>
          </button>
          <button
            onClick={() => setActiveView('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'analytics'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 size={14} />
            <span>📊 Analyse</span>
          </button>
        </div>

        <div className="text-[11px] font-semibold text-slate-500 pr-3 hidden sm:block">
          {deliveries.length} BL(s) au total
        </div>
      </div>

      {/* TAB 1: REGISTRE DES LIVRAISONS & TABLE */}
      {activeView === 'table' && (
        <div className="space-y-3">

          {/* Enhanced Multi-Filter Control Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Filter size={15} className="text-sky-600" />
                <span>Filtres et Sélection des Réceptions</span>
              </div>

              {(searchTerm || selectedOrderFilter !== 'all' || selectedSupplierFilter !== 'all' || selectedYearFilter !== 'all') && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded transition-colors"
                >
                  <RotateCcw size={13} />
                  <span>Réinitialiser les filtres</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filter 1: Searchable Multi-Select Order Dropdown */}
              <div className="space-y-1 relative">
                <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ShoppingBag size={12} className="text-sky-600" />
                    <span>N° Commande & Fournisseur</span>
                  </span>
                </label>
                <div ref={orderDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsOrderDropdownOpen(!isOrderDropdownOpen)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 shadow-2xs transition-all"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <ShoppingBag size={13} className="text-sky-600 shrink-0" />
                      <span className="truncate">
                        {selectedAnalyticsOrderNumbers.length === 0
                          ? `Toutes les commandes (${orderDropdownOptions.length})`
                          : `${selectedAnalyticsOrderNumbers.length} BC sélectionné(s)`}
                      </span>
                    </div>
                    <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform ${isOrderDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOrderDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-2 max-h-72 overflow-hidden flex flex-col">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Rechercher BC ou Fournisseur..."
                          value={orderDropdownSearch}
                          onChange={(e) => setOrderDropdownSearch(e.target.value)}
                          className="w-full pl-7 pr-2 py-1 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50"
                        />
                        <Search size={13} className="absolute left-2 top-2 text-slate-400" />
                      </div>

                      <div className="flex items-center justify-between px-1 text-[10px]">
                        <button
                          type="button"
                          onClick={selectAllAnalyticsOrders}
                          className="font-bold text-sky-600 hover:underline"
                        >
                          Tout Sélectionner
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAnalyticsOrderNumbers([])}
                          className="font-medium text-slate-500 hover:text-rose-600"
                        >
                          Tout Réinitialiser
                        </button>
                      </div>

                      <div className="overflow-y-auto space-y-1 pr-1 flex-1 min-h-0">
                        {orderDropdownOptions.length === 0 ? (
                          <div className="p-3 text-center text-slate-400 text-xs">Aucune commande</div>
                        ) : (
                          orderDropdownOptions.map((item) => {
                            const isSelected = selectedAnalyticsOrderNumbers.includes(item.ordNum);
                            return (
                              <div
                                key={item.ordNum}
                                onClick={() => {
                                  toggleAnalyticsOrderSelection(item.ordNum);
                                  setCurrentPage(1);
                                }}
                                className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors border ${
                                  isSelected
                                    ? 'bg-sky-50 border-sky-200 text-sky-900 font-bold'
                                    : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="h-3 w-3 text-sky-600 rounded border-slate-300 focus:ring-sky-500 shrink-0 pointer-events-none"
                                  />
                                  <span className="font-mono font-bold text-slate-900">BC N° {item.ordNum}</span>
                                </div>
                                <span className="text-[10px] font-semibold text-sky-800 bg-sky-100/60 px-1.5 py-0.5 rounded truncate max-w-[130px] ml-1">
                                  {item.supplierName}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter 2: Supplier Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Building2 size={12} className="text-sky-600" />
                  <span>Fournisseur</span>
                </label>
                <select
                  value={selectedSupplierFilter}
                  onChange={(e) => {
                    setSelectedSupplierFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-semibold text-slate-800"
                >
                  <option value="all">🏢 Tous les fournisseurs ({uniqueSuppliers.length})</option>
                  {uniqueSuppliers.map((supName) => (
                    <option key={supName} value={supName}>
                      {supName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 3: Year Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Calendar size={12} className="text-sky-600" />
                  <span>Année de Livraison</span>
                </label>
                <select
                  value={selectedYearFilter}
                  onChange={(e) => {
                    setSelectedYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium text-slate-800"
                >
                  <option value="all">📅 Toutes les années</option>
                  {uniqueYears.map((year) => (
                    <option key={year} value={year}>
                      Année {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Text Search */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Search size={12} className="text-sky-600" />
                  <span>Recherche Rapide</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="N° BL, Article..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                  <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Deliveries Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs">Chargement des livraisons...</div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Truck size={32} className="mx-auto text-slate-300" />
                <p className="text-sm font-medium">{t.noDeliveriesFound}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th
                        onClick={() => handleSort('delivery_note_number')}
                        className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                      >
                        <div className="flex items-center gap-1">
                          <span>{t.blNumber}</span>
                          {renderSortIcon('delivery_note_number')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('delivery_date')}
                        className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                      >
                        <div className="flex items-center gap-1">
                          <span>{t.deliveryDate}</span>
                          {renderSortIcon('delivery_date')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('n_order')}
                        className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                      >
                        <div className="flex items-center gap-1">
                          <span>{t.orderNumber}</span>
                          {renderSortIcon('n_order')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('supplier_name')}
                        className="px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                      >
                        <div className="flex items-center gap-1">
                          <span>Fournisseur</span>
                          {renderSortIcon('supplier_name')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('designation')}
                        className="px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                      >
                        <div className="flex items-center gap-1">
                          <span>{t.itemDesignation}</span>
                          {renderSortIcon('designation')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('delivered_qty')}
                        className="px-3 py-2 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>{t.deliveredQty}</span>
                          {renderSortIcon('delivered_qty')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('unit_price')}
                        className="px-3 py-2 text-right min-w-[110px] whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>{t.unitPriceLabel}</span>
                          {renderSortIcon('unit_price')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('total_ht')}
                        className="px-3 py-2 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Montant HT</span>
                          {renderSortIcon('total_ht')}
                        </div>
                      </th>
                      <th className="px-3 py-2 text-center">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {paginatedDeliveries.map((d) => {
                      const totalHT = d.total_ht || (Number(d.delivered_qty) || 0) * (Number(d.unit_price) || 0);

                      // Find parent order and line
                      const parentOrder = (orders || []).find(
                        (o) => isSameOrder(o.id, d.local_order_id || d.order_id, o.n_order, d.n_order)
                      );
                      const matchingLine = parentOrder?.lines?.find(
                        (l) => isSameLine(l.id, d.line_id, l.designation, d.designation)
                      );
                      const lineOrderedQty = Number(matchingLine?.qty) || Number(d.ordered_qty) || 0;

                      // Find all deliveries for this specific order & article
                      const itemDeliveries = (deliveries || []).filter(
                        (del) =>
                          isSameOrder(
                            del.local_order_id || del.order_id,
                            parentOrder?.id || d.local_order_id || d.order_id,
                            del.n_order,
                            d.n_order || parentOrder?.n_order
                          ) &&
                          isSameLine(del.line_id, d.line_id || matchingLine?.id, del.designation, d.designation)
                      );

                      // Chronological cumulative sum UP TO THIS SPECIFIC DELIVERY
                      const dDateStr = d.delivery_date || d.created_at || '';
                      const dId = Number(d.id) || 0;

                      const deliveriesUpToThis = itemDeliveries.filter((del) => {
                        const delDateStr = del.delivery_date || del.created_at || '';
                        const delId = Number(del.id) || 0;
                        if (delDateStr < dDateStr) return true;
                        if (delDateStr > dDateStr) return false;
                        if (delId && dId) return delId <= dId;
                        return true;
                      });

                      const cumulAtThisDelivery = deliveriesUpToThis.reduce(
                        (sum, del) => sum + (Number(del.delivered_qty) || 0),
                        0
                      );
                      const remainingAtThisDelivery = Math.max(0, lineOrderedQty - cumulAtThisDelivery);
                      const percentAtThisDelivery =
                        lineOrderedQty > 0
                          ? Math.min(100, Math.round((cumulAtThisDelivery / lineOrderedQty) * 100))
                          : 0;

                      const is104 = d.movement_code === '104' || Number(d.delivered_qty) < 0;

                      return (
                        <tr key={d.id} className={`transition-colors ${is104 ? 'bg-rose-50/40 hover:bg-rose-50/80' : 'hover:bg-slate-50'}`}>
                          <td className="px-3 py-2 font-bold font-mono text-sky-800">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{d.delivery_note_number}</span>
                              {is104 && (
                                <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded bg-rose-100 text-rose-800 border border-rose-300">
                                  Annulation 104
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatDateDDMMYYYY(d.delivery_date)}</td>
                          <td className="px-3 py-2 font-mono font-bold text-sky-700">
                            <div className="flex items-center gap-1">
                              <span>{d.n_order || 'N/A'}</span>
                              {d.sap_order_number && (
                                <span className="text-[9px] font-mono text-slate-400" title={`N° SAP: ${d.sap_order_number}`}>
                                  (SAP: {d.sap_order_number})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800 max-w-[130px] truncate" title={d.supplier_name}>{d.supplier_name || 'N/A'}</td>
                          <td className="px-3 py-2 font-medium max-w-xs truncate" title={d.designation}>
                            <div>
                              <span>{d.designation || 'Article'}</span>
                              {d.item_code && (
                                <span className="block text-[10px] font-mono text-slate-400">Code: {d.item_code}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                            <div className="flex flex-col items-end gap-0.5">
                              {is104 ? (
                                <span className="font-extrabold text-rose-700 text-xs bg-rose-100/80 px-2 py-0.5 rounded border border-rose-300 inline-flex items-center gap-1">
                                  <AlertTriangle size={11} className="text-rose-600 shrink-0" />
                                  {formatQty(d.delivered_qty)} {d.unite || 'U'}
                                </span>
                              ) : (
                                <span className="font-extrabold text-emerald-700 text-xs bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200/60 inline-flex items-center">
                                  +{formatQty(d.delivered_qty)} {d.unite || 'U'}
                                </span>
                              )}
                              {lineOrderedQty > 0 ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span
                                    className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1"
                                    title="Cumul net livré jusqu'à ce BL inclus / Total commandé"
                                  >
                                    <span>Cumul à ce BL: <strong className="text-slate-900">{formatQty(cumulAtThisDelivery)}</strong> / {formatQty(lineOrderedQty)}</span>
                                    <span className={`font-black ${percentAtThisDelivery >= 100 ? 'text-emerald-700' : 'text-sky-700'}`}>
                                      ({percentAtThisDelivery}%)
                                    </span>
                                  </span>
                                  <span
                                    className="text-[9px] font-semibold text-amber-800 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/70 flex items-center gap-1"
                                    title="Quantité restante nette à livrer à ce moment précis"
                                  >
                                    <span>Reste à ce moment:</span>
                                    <strong className="text-amber-950 font-bold">{formatQty(remainingAtThisDelivery)} {d.unite || 'U'}</strong>
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                  Cumul net: {formatQty(cumulAtThisDelivery)} {d.unite || 'U'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono min-w-[110px] whitespace-nowrap">
                            {d.unit_price ? (
                              <span className={d.unit_price !== d.original_unit_price ? 'text-amber-600 font-bold' : ''}>
                                {formatAmount(d.unit_price)} DA
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-bold font-mono text-slate-900 whitespace-nowrap">
                            {formatAmount(totalHT)} DA
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedDeliveryDetail(d);
                                  setIsDetailOpen(true);
                                }}
                                className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                                title="Voir les détails de la livraison"
                              >
                                <Eye size={14} />
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => handleOpenEditModal(d)}
                                  className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                  title="Modifier la livraison"
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => handleDelete(d.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Supprimer la livraison"
                                >
                                  <Trash2 size={14} />
                                </button>
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
            <div className="flex flex-col sm:flex-row items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs gap-2">
              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                <span>
                  Affichage <span className="font-semibold text-slate-700">{filteredDeliveries.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1}</span> à <span className="font-semibold text-slate-700">{Math.min(currentPage * pageSize, filteredDeliveries.length)}</span> sur <span className="font-semibold text-slate-700">{filteredDeliveries.length}</span> BL(s)
                </span>
                <span className="text-slate-300">|</span>
                <label className="flex items-center gap-1">
                  <span>Lignes:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-semibold text-slate-700 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value={6}>6 (14")</option>
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                  </select>
                </label>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center space-x-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-0.5 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                  >
                    Précédent
                  </button>
                  <span className="text-slate-700 font-semibold px-1 text-xs">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-0.5 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANALYTICS & GRAPHIQUES */}
      {activeView === 'analytics' && (
        <div className="space-y-6">
          {/* Analytics Filters Header: Year, Multi-Order Dropdown & Unit Mode Switcher */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Year Filter: Default Current Year (2026) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-sky-600" />
                    <span>Exercice / Année</span>
                  </span>
                  <span className="text-[10px] text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full font-mono font-semibold border border-sky-200">
                    {analyticsYearFilter === 'all' ? 'Toutes les années' : `Année ${analyticsYearFilter}`}
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={analyticsYearFilter}
                    onChange={(e) => setAnalyticsYearFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value={new Date().getFullYear().toString()}>
                      📅 {new Date().getFullYear()} (Année en cours - Par défaut)
                    </option>
                    {uniqueYears
                      .filter((y) => y !== new Date().getFullYear().toString())
                      .map((year) => (
                        <option key={year} value={year}>
                          📅 Année {year}
                        </option>
                      ))}
                    <option value="all">🌐 Toutes les années confondues</option>
                  </select>
                </div>
              </div>

              {/* Requirement 1: Searchable Multi-Select Order Dropdown with Supplier Name beside it */}
              <div className="space-y-1 relative">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ShoppingBag size={13} className="text-sky-600" />
                    <span>N° Commande & Fournisseur</span>
                  </span>
                  <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full font-mono font-semibold border border-amber-200">
                    {selectedAnalyticsOrderNumbers.length === 0
                      ? `Partielles (${orderDropdownOptions.length})`
                      : `${selectedAnalyticsOrderNumbers.length} / ${orderDropdownOptions.length}`}
                  </span>
                </label>

                <div ref={analyticsOrderDropdownRef} className="relative">
                  {/* Dropdown Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsOrderDropdownOpen(!isOrderDropdownOpen)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 shadow-2xs transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ShoppingBag size={15} className="text-sky-600 shrink-0" />
                      <span className="truncate">
                        {selectedAnalyticsOrderNumbers.length === 0
                          ? `📦 Toutes les commandes (${orderDropdownOptions.length})`
                          : `📦 ${selectedAnalyticsOrderNumbers.length} sélectionnée(s)`}
                      </span>
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isOrderDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Popover Searchable Dropdown Menu */}
                  {isOrderDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-2.5 max-h-80 overflow-hidden flex flex-col">
                      {/* Search Bar inside Dropdown */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Rechercher N° BC ou Fournisseur..."
                          value={orderDropdownSearch}
                          onChange={(e) => setOrderDropdownSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50"
                        />
                        <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                      </div>

                      {/* Dropdown Header Actions */}
                      <div className="flex items-center justify-between px-1 text-[11px]">
                        <button
                          type="button"
                          onClick={selectAllAnalyticsOrders}
                          className="font-bold text-sky-600 hover:text-sky-700 hover:underline"
                        >
                          Tout Sélectionner
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAnalyticsOrderNumbers([])}
                          className="font-medium text-slate-500 hover:text-rose-600"
                        >
                          Tout Désélectionner
                        </button>
                      </div>

                      {/* Options List with Order Number & Supplier Name beside it */}
                      <div className="overflow-y-auto space-y-1 pr-1 flex-1 min-h-0">
                        {orderDropdownOptions.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-xs">Aucune commande trouvée pour cette année</div>
                        ) : (
                          orderDropdownOptions.map((item) => {
                            const isSelected = selectedAnalyticsOrderNumbers.includes(item.ordNum);
                            return (
                              <div
                                key={item.ordNum}
                                onClick={() => toggleAnalyticsOrderSelection(item.ordNum)}
                                className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                                  isSelected
                                    ? 'bg-sky-50 border-sky-200 text-sky-900 font-bold'
                                    : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="h-3.5 w-3.5 text-sky-600 rounded border-slate-300 focus:ring-sky-500 shrink-0 pointer-events-none"
                                  />
                                  <span className="font-mono font-bold text-slate-900">BC N° {item.ordNum}</span>
                                </div>
                                <span className="text-[11px] font-semibold text-sky-800 bg-sky-100/60 px-2 py-0.5 rounded truncate max-w-[140px] ml-2">
                                  {item.supplierName}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Requirement 2: Metric Mode Switcher Toggle (Quantités by default vs Montant) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Boxes size={13} className="text-sky-600" />
                  <span>Unité de Mesure des Graphiques</span>
                </label>
                <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold w-full">
                  <button
                    type="button"
                    onClick={() => setAnalyticsMetricMode('qty')}
                    className={`flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      analyticsMetricMode === 'qty'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Boxes size={14} />
                    <span>📦 Quantités (Unités)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsMetricMode('amount')}
                    className={`flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      analyticsMetricMode === 'amount'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <DollarSign size={14} />
                    <span>💵 Montant (DA TTC)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Top Analytics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">
                {analyticsMetricMode === 'qty' ? 'Taux d\'Avancement Quantitatif' : 'Taux de Réalisation Financier'}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-sky-700 font-mono">
                  {analyticsData.activeFulfillmentRate.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {analyticsMetricMode === 'qty' ? 'des quantités commandées' : 'du montant total TTC'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-sky-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, analyticsData.activeFulfillmentRate)}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Fournisseur le Plus Actif</span>
              <div className="text-base font-bold text-slate-900 truncate mt-1" title={analyticsData.topSupplier.fullName}>
                {analyticsData.topSupplier.fullName}
              </div>
              <div className="text-xs font-bold text-emerald-700 font-mono mt-0.5">
                {analyticsMetricMode === 'qty'
                  ? `${formatQty(analyticsData.topSupplier.qty)} Unités Livrées`
                  : `${formatAmount(analyticsData.topSupplier.montant)} DA Livrés`}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">
                {analyticsMetricMode === 'qty' ? 'Quantités d\'Articles Livrées' : 'Volume Financier Réceptionné'}
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {analyticsMetricMode === 'qty'
                  ? `${formatQty(analyticsData.totalDeliveredItemsCount)} Unités`
                  : `${formatAmount(analyticsData.totalDeliveredValTTC)} DA`}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {analyticsMetricMode === 'qty' ? 'Total unités reçues' : 'Total valeur TTC reçue'}
              </div>
            </div>
          </div>

          {/* Recharts Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Évolution des Livraisons de la Dernière Commande par Article */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <TrendingUp size={18} className="text-sky-600" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      Évolution des Livraisons par Article
                    </h3>
                    {lineChartOrderData.isLatest ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                        <Sparkles size={11} className="text-emerald-600" />
                        <span>⭐ Dernière Commande</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        BC N° {lineChartOrderData.order?.n_order}
                      </span>
                    )}
                  </div>

                  {lineChartOrderData.order && (
                    <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                      <span>
                        Commande N° <strong className="font-mono text-slate-800">{lineChartOrderData.order.n_order}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Fournisseur : <strong className="text-slate-800">{lineChartOrderData.order.supplier_name || 'Fournisseur'}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Date : <strong className="font-mono text-slate-700">{formatDateDDMMYYYY(lineChartOrderData.order.order_date || lineChartOrderData.order.created_at)}</strong>
                      </span>
                      <span>•</span>
                      <span className="font-mono font-bold text-emerald-700">
                        Avancement : {lineChartOrderData.fulfillmentRate.toFixed(1)}%
                      </span>
                    </p>
                  )}
                </div>

                {/* Granularity View Mode Toggle (Monthly by default vs Detailed Delivery Dates) */}
                <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-bold shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setLineChartGranularity('month')}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                      lineChartGranularity === 'month'
                        ? 'bg-white text-sky-700 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Affichage cumulé par mois"
                  >
                    <Calendar size={12} />
                    <span>Par Mois</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLineChartGranularity('day')}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                      lineChartGranularity === 'day'
                        ? 'bg-white text-sky-700 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Affichage détaillé par date de livraison (BL)"
                  >
                    <Clock size={12} />
                    <span>Détail par Date</span>
                  </button>
                </div>
              </div>

              {/* Compact Item Toggle Chips (Click to activate/deactivate an item to prevent clutter) */}
              {lineChartOrderData.uniqueItems.length > 1 && (() => {
                const currentActive = activeLineItems === null ? lineChartOrderData.uniqueItems : activeLineItems;
                return (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Articles :
                    </span>
                    {lineChartOrderData.uniqueItems.map((itemName, idx) => {
                      const isVisible = currentActive.includes(itemName);
                      const baseColor = ITEM_COLORS[idx % ITEM_COLORS.length];
                      return (
                        <button
                          key={itemName}
                          type="button"
                          onClick={() => toggleItemVisibility(itemName, lineChartOrderData.uniqueItems)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                            !isVisible
                              ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-50 hover:opacity-80'
                              : 'bg-white text-slate-800 border-slate-300 shadow-2xs hover:border-sky-400'
                          }`}
                          title={!isVisible ? `Cliquer pour afficher : ${itemName}` : `Cliquer pour masquer : ${itemName}`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: !isVisible ? '#94a3b8' : baseColor }}
                          />
                          <span className="truncate max-w-[160px]">{itemName}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {lineChartOrderData.timelineData.length === 0 || lineChartOrderData.uniqueItems.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-50/50 rounded-xl space-y-1">
                  <span>Aucune livraison enregistrée pour cette commande</span>
                  <span className="text-[11px] text-slate-400 font-mono">(Commande en attente de première réception)</span>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartOrderData.timelineData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => (analyticsMetricMode === 'qty' ? `${v}` : `${(v / 1000).toFixed(0)}k`)}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          analyticsMetricMode === 'qty'
                            ? `${Number(value).toLocaleString()} unités`
                            : `${Number(value).toLocaleString()} DA`,
                          name,
                        ]}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={40} 
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                      />
                      {lineChartOrderData.uniqueItems
                        .filter((itemName) => (activeLineItems === null ? lineChartOrderData.uniqueItems : activeLineItems).includes(itemName))
                        .map((itemName) => {
                          const idx = lineChartOrderData.uniqueItems.indexOf(itemName);
                          const baseColor = ITEM_COLORS[idx % ITEM_COLORS.length];
                          return (
                            <Line
                              key={itemName}
                              type="monotone"
                              dataKey={itemName}
                              name={itemName.length > 25 ? `${itemName.substring(0, 25)}...` : itemName}
                              stroke={baseColor}
                              strokeWidth={2.5}
                              dot={{ r: 3.5 }}
                              activeDot={{ r: 6 }}
                            />
                          );
                        })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 2: Comparatif Mensuel Année N vs Année N-1 (avec sélection d'article & % sur les barres) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <BarChart3 size={18} className="text-sky-600" />
                    <span>
                      Comparatif Mensuel : {monthlyComparisonData.currYearStr} vs {monthlyComparisonData.prevYearStr}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {analyticsMetricMode === 'qty' ? 'Quantités réceptionnées par mois' : 'Volume financier TTC (DA)'}
                  </p>
                </div>

                {/* Item Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 font-sans">
                    Article :
                  </span>
                  <select
                    value={comparisonItemFilter}
                    onChange={(e) => setComparisonItemFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sky-500 max-w-[220px] truncate shadow-2xs"
                  >
                    {barChartDropdownItems.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                    <option value="all">📦 Tous les articles</option>
                  </select>
                </div>
              </div>

              {/* Quick Summary comparison badge */}
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans font-bold uppercase">
                      Total {monthlyComparisonData.currYearStr}
                    </span>
                    <span className="font-extrabold text-sky-700">
                      {analyticsMetricMode === 'qty'
                        ? `${formatQty(monthlyComparisonData.totalCurrYearVal)} u`
                        : `${formatAmount(monthlyComparisonData.totalCurrYearVal)} DA`}
                    </span>
                  </div>
                  <span className="text-slate-300">vs</span>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans font-bold uppercase">
                      Total {monthlyComparisonData.prevYearStr}
                    </span>
                    <span className="font-bold text-slate-600">
                      {analyticsMetricMode === 'qty'
                        ? `${formatQty(monthlyComparisonData.totalPrevYearVal)} u`
                        : `${formatAmount(monthlyComparisonData.totalPrevYearVal)} DA`}
                    </span>
                  </div>
                </div>

                {monthlyComparisonData.growthRate !== null && (
                  <div
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                      monthlyComparisonData.growthRate >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {monthlyComparisonData.growthRate >= 0 ? '+' : ''}
                    {monthlyComparisonData.growthRate.toFixed(1)}%
                  </div>
                )}
              </div>

              {monthlyComparisonData.chartData.every(
                (d) => d[monthlyComparisonData.currYearStr] === 0 && d[monthlyComparisonData.prevYearStr] === 0
              ) ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs bg-slate-50/50 rounded-xl">
                  Aucune livraison enregistrée pour {monthlyComparisonData.currYearStr} et {monthlyComparisonData.prevYearStr}
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyComparisonData.chartData}
                      margin={{ top: 25, right: 20, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          analyticsMetricMode === 'qty' ? `${v}` : `${(v / 1000).toFixed(0)}k`
                        }
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          analyticsMetricMode === 'qty'
                            ? `${Number(value).toLocaleString()} unités`
                            : `${Number(value).toLocaleString()} DA`,
                          `Année ${name}`,
                        ]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      />
                      <Bar
                        dataKey={monthlyComparisonData.currYearStr}
                        name={`${monthlyComparisonData.currYearStr} (En cours)`}
                        fill="#0284c7"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                        label={(props: any) => {
                          const { x, y, width, index } = props;
                          const item = monthlyComparisonData.chartData[index];
                          if (!item || !item.monthGrowthText) return null;
                          return (
                            <text
                              x={x + width / 2}
                              y={Math.max(14, y - 6)}
                              fill={item.monthGrowthColor}
                              textAnchor="middle"
                              fontSize={10}
                              fontWeight="800"
                              fontFamily="monospace"
                            >
                              {item.monthGrowthText}
                            </text>
                          );
                        }}
                      />
                      <Bar
                        dataKey={monthlyComparisonData.prevYearStr}
                        name={`${monthlyComparisonData.prevYearStr} (Précédente)`}
                        fill="#94a3b8"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 3: Tranches d'Avancement des Commandes Partielles */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <PieIcon size={18} className="text-amber-500" />
                  <span>Tranches d'Avancement des Commandes Partielles</span>
                </h3>
              </div>

              {analyticsData.statusPieData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                  Aucune donnée disponible
                </div>
              ) : (
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {analyticsData.statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val} commande(s)`, 'Nombre']} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 4: Avancement Détaillé des Articles par Commande */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Layers size={18} className="text-sky-600" />
                  <span>Avancement des Articles par Commande</span>
                </h3>
              </div>

              <div>
                <SearchableSelect
                  options={analyticsFilteredOrders.map((o) => ({
                    value: o.id,
                    label: `${o.n_order} - ${o.supplier_name || o.etablir_par || 'Fournisseur'}`,
                    subLabel: o.objet_de_commande,
                  }))}
                  value={selectedAnalyticsOrderObj?.id || 0}
                  onChange={(val) => setAnalyticsOrderId(Number(val))}
                  placeholder="Choisir une commande..."
                  searchPlaceholder="Rechercher BC..."
                />
              </div>

              {selectedAnalyticsOrderObj && selectedAnalyticsOrderObj.lines && selectedAnalyticsOrderObj.lines.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {selectedAnalyticsOrderObj.lines.map((line, idx) => {
                    const itemDeliveries = (deliveries || []).filter((d) => {
                      const isOrderMatch = isSameOrder(
                        d.local_order_id || d.order_id,
                        selectedAnalyticsOrderObj.id,
                        d.n_order,
                        selectedAnalyticsOrderObj.n_order
                      );
                      const isLineMatch = isSameLine(d.line_id, line.id, d.designation, line.designation);
                      return isOrderMatch && isLineMatch;
                    });

                    const lineDelivered = itemDeliveries.reduce((sum, d) => sum + (Number(d.delivered_qty) || 0), 0);
                    const lineOrderedQty = Number(line.qty) || 0;
                    const percent = lineOrderedQty > 0 ? Math.min(100, Math.round((lineDelivered / lineOrderedQty) * 100)) : 0;

                    return (
                      <div key={line.id || idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="flex justify-between items-center font-semibold gap-2">
                          <span className="text-slate-800 font-bold truncate max-w-[220px]" title={line.designation}>
                            {line.designation}
                          </span>
                          <div className="flex items-center gap-2 font-mono shrink-0">
                            <span className="text-slate-700 font-extrabold text-xs">
                              {formatQty(lineDelivered)} / {formatQty(line.qty)} {line.unite}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-black border ${
                                percent >= 100
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : percent > 0
                                  ? 'bg-sky-100 text-sky-800 border-sky-300'
                                  : 'bg-slate-200 text-slate-600 border-slate-300'
                              }`}
                            >
                              {percent}%
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              percent >= 100 ? 'bg-emerald-600' : 'bg-sky-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-lg">
                  Sélectionnez une commande pour visualiser l'avancement par article.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY DETAILS MODAL */}
      {isDetailOpen && selectedDeliveryDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDetailOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Truck className="text-sky-400" size={18} />
                <div>
                  <h3 className="font-bold text-sm sm:text-base font-mono">
                    Détails du Bon de Livraison: {selectedDeliveryDetail.delivery_note_number}
                  </h3>
                  <p className="text-[11px] text-slate-300">Reçu le {formatDateDDMMYYYY(selectedDeliveryDetail.delivery_date)}</p>
                </div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-100 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1">
                    <FileText size={12} /> Commande Associée
                  </span>
                  <p className="text-base font-extrabold font-mono text-sky-950">
                    {selectedDeliveryDetail.n_order || 'N/A'}
                  </p>
                </div>

                <div className="bg-slate-100/70 p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <Calendar size={12} /> Date de Réception BL
                  </span>
                  <p className="text-base font-extrabold font-mono text-slate-900">
                    {formatDateDDMMYYYY(selectedDeliveryDetail.delivery_date)}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Information Article</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block">Désignation:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedDeliveryDetail.designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Unité:</span>
                    <span className="font-bold text-slate-800">{selectedDeliveryDetail.unite}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-slate-200 pt-3 font-mono">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Quantité Commandée</span>
                    <span className="font-extrabold text-slate-800 text-sm">
                      {selectedDeliveryDetail.ordered_qty ? selectedDeliveryDetail.ordered_qty.toLocaleString('fr-FR') : '-'} {selectedDeliveryDetail.unite}
                    </span>
                  </div>

                  <div className="bg-emerald-50/90 p-2.5 rounded-lg border border-emerald-300">
                    <span className="text-[10px] text-emerald-800 block uppercase font-bold">Livrée dans ce BL</span>
                    <span className="font-extrabold text-emerald-900 text-sm">
                      +{selectedDeliveryDetail.delivered_qty.toLocaleString('fr-FR')} {selectedDeliveryDetail.unite}
                    </span>
                  </div>

                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 block uppercase font-bold">Cumul à ce BL</span>
                    <span className="font-extrabold text-emerald-950 text-sm">
                      {(() => {
                        const d = selectedDeliveryDetail;
                        const parentOrder = (orders || []).find((o) => isSameOrder(o.id, d.local_order_id || d.order_id, o.n_order, d.n_order));
                        const matchingLine = parentOrder?.lines?.find((l) => isSameLine(l.id, d.line_id, l.designation, d.designation));
                        const itemDeliveries = (deliveries || []).filter(
                          (del) =>
                            isSameOrder(del.local_order_id || del.order_id, parentOrder?.id || d.local_order_id || d.order_id, del.n_order, d.n_order || parentOrder?.n_order) &&
                            isSameLine(del.line_id, d.line_id || matchingLine?.id, del.designation, d.designation)
                        );
                        const dDateStr = d.delivery_date || d.created_at || '';
                        const dId = Number(d.id) || 0;
                        const upTo = itemDeliveries.filter((del) => {
                          const delDateStr = del.delivery_date || del.created_at || '';
                          const delId = Number(del.id) || 0;
                          if (delDateStr < dDateStr) return true;
                          if (delDateStr > dDateStr) return false;
                          if (delId && dId) return delId <= dId;
                          return true;
                        });
                        const cum = upTo.reduce((s, del) => s + (Number(del.delivered_qty) || 0), 0);
                        return cum.toLocaleString('fr-FR');
                      })()} {selectedDeliveryDetail.unite}
                    </span>
                  </div>

                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-amber-800 block uppercase font-bold">Reste à ce moment</span>
                    <span className="font-extrabold text-amber-950 text-sm">
                      {(() => {
                        const d = selectedDeliveryDetail;
                        const parentOrder = (orders || []).find((o) => isSameOrder(o.id, d.local_order_id || d.order_id, o.n_order, d.n_order));
                        const matchingLine = parentOrder?.lines?.find((l) => isSameLine(l.id, d.line_id, l.designation, d.designation));
                        const lineOrderedQty = Number(matchingLine?.qty) || Number(d.ordered_qty) || 0;
                        const itemDeliveries = (deliveries || []).filter(
                          (del) =>
                            isSameOrder(del.local_order_id || del.order_id, parentOrder?.id || d.local_order_id || d.order_id, del.n_order, d.n_order || parentOrder?.n_order) &&
                            isSameLine(del.line_id, d.line_id || matchingLine?.id, del.designation, d.designation)
                        );
                        const dDateStr = d.delivery_date || d.created_at || '';
                        const dId = Number(d.id) || 0;
                        const upTo = itemDeliveries.filter((del) => {
                          const delDateStr = del.delivery_date || del.created_at || '';
                          const delId = Number(del.id) || 0;
                          if (delDateStr < dDateStr) return true;
                          if (delDateStr > dDateStr) return false;
                          if (delId && dId) return delId <= dId;
                          return true;
                        });
                        const cum = upTo.reduce((s, del) => s + (Number(del.delivered_qty) || 0), 0);
                        const left = Math.max(0, lineOrderedQty - cum);
                        return left.toLocaleString('fr-FR');
                      })()} {selectedDeliveryDetail.unite}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-lg flex justify-between items-center font-mono">
                  <span className="font-sans font-semibold text-slate-300">Montant HT de cette livraison:</span>
                  <span className="font-extrabold text-sky-400 text-sm">
                    {(selectedDeliveryDetail.delivered_qty * selectedDeliveryDetail.unit_price).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="px-5 py-2 bg-slate-800 text-white font-semibold rounded-lg text-xs hover:bg-slate-900"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* NEW BATCH DELIVERY MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Truck size={18} className="text-sky-400" />
                <span>Nouveau Bon de Livraison (Multi-Articles)</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-3 sm:p-4 overflow-y-auto space-y-3 text-xs flex-1">
              {eligibleOrders.length === 0 ? (
                <div className="p-3 bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-medium">
                  Aucune commande en Livraison Partielle disponible.
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Sélectionner la Commande Locale (Livraison Partielle) *</label>
                      <SearchableSelect
                        options={eligibleOrders.map((o) => ({
                          value: o.id,
                          label: `${o.n_order} - ${o.supplier_name || o.etablir_par || 'Fournisseur inconnu'}`,
                          subLabel: o.objet_de_commande,
                          badge: '🚚 Livraison Partielle',
                        }))}
                        value={selectedOrderId}
                        onChange={(val) => handleOrderChange(Number(val))}
                        placeholder="Sélectionner une commande en Livraison Partielle..."
                        searchPlaceholder="Rechercher N° commande ou fournisseur..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">N° Bon de Livraison (BL) *</label>
                        <input
                          type="text"
                          required
                          placeholder="ex: BL-2026-00412"
                          value={deliveryNoteNumber}
                          onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono font-bold bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Date de Réception BL *</label>
                        <DateInputDDMMYYYY
                          required
                          value={deliveryDate}
                          onChange={(val) => {
                            setDeliveryDate(val);
                            if (selectedOrderId) {
                              updateDeliveryItemsForOrder(selectedOrderId, val);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <PackageCheck size={14} className="text-sky-600" />
                        <span>Articles de la Commande ({currentOrder?.n_order})</span>
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        Visualisez l'historique et saisissez la quantité livrée pour ce bon
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl shadow-2xs bg-white overflow-hidden">
                      <div className="max-h-[260px] overflow-y-auto overflow-x-auto relative">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 z-10 shadow-2xs">
                            <tr>
                              <th className="px-2.5 py-1.5">
                                <div>Pos & Désignation</div>
                                <div className="text-[9px] text-slate-400 font-normal">Article & Unité</div>
                              </th>
                              <th className="px-2.5 py-1.5 text-right whitespace-nowrap">
                                <div>Total Commandé</div>
                                <div className="text-[9px] text-slate-400 font-normal">Qté Initiale</div>
                              </th>
                              <th className="px-2.5 py-1.5 text-right whitespace-nowrap text-sky-900 bg-sky-50/70">
                                <div>Livré ce Mois</div>
                                <div className="text-[9px] text-sky-600 font-normal">Mois Actuel</div>
                              </th>
                              <th className="px-2.5 py-1.5 text-right whitespace-nowrap text-indigo-900 bg-indigo-50/70">
                                <div>Livré cette Année</div>
                                <div className="text-[9px] text-indigo-600 font-normal">Cumul Année</div>
                              </th>
                              <th className="px-2.5 py-1.5 text-right whitespace-nowrap text-emerald-900 bg-emerald-50/70">
                                <div>Total Déjà Livré</div>
                                <div className="text-[9px] text-emerald-600 font-normal">Tous les BL</div>
                              </th>
                              <th className="px-2.5 py-1.5 text-right whitespace-nowrap text-amber-900 bg-amber-50/70">
                                <div>Solde Reste</div>
                                <div className="text-[9px] text-amber-600 font-normal">À Réceptionner</div>
                              </th>
                              <th className="px-2.5 py-1.5 text-right min-w-[125px] bg-sky-100/90 text-sky-950">
                                <div>Qte Livrée (Ce BL) *</div>
                                <div className="text-[9px] text-sky-700 font-normal">À Saisir</div>
                              </th>
                              <th className="px-2.5 py-1.5 text-right min-w-[110px]">
                                <div>Prix Unitaire</div>
                                <div className="text-[9px] text-slate-400 font-normal">(DA)</div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {deliveryItems.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="p-4 text-center text-slate-400 font-medium">
                                  Aucun article trouvé pour cette commande.
                                </td>
                              </tr>
                            ) : (
                              deliveryItems.map((item, idx) => (
                                <tr key={item.line_id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-2.5 py-1.5 font-medium">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-slate-400 font-bold">#{idx + 1}</span>
                                      <span className="font-bold text-slate-900">{item.designation}</span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-semibold font-mono uppercase mt-0.5 block">
                                      Unité: {item.unite || 'U'}
                                    </span>
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right font-mono whitespace-nowrap">
                                    <div className="font-bold text-slate-800">{formatQty(item.ordered_qty)}</div>
                                    <div className="text-[9px] text-slate-400 font-sans font-medium">{item.unite || 'U'}</div>
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right font-mono bg-sky-50/30 whitespace-nowrap">
                                    <div className="font-bold text-sky-800">{formatQty(item.delivered_this_month)}</div>
                                    <div className="text-[9px] text-sky-600/80 font-sans font-semibold">ce mois</div>
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right font-mono bg-indigo-50/30 whitespace-nowrap">
                                    <div className="font-bold text-indigo-800">{formatQty(item.delivered_this_year)}</div>
                                    <div className="text-[9px] text-indigo-600/80 font-sans font-semibold">cette année</div>
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right font-mono bg-emerald-50/30 whitespace-nowrap">
                                    <div className="font-bold text-emerald-800">{formatQty(item.previous_delivered)}</div>
                                    <div className="text-[9px] text-emerald-600/80 font-sans font-semibold">cumulé</div>
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right font-mono bg-amber-50/30 whitespace-nowrap">
                                    <div className="font-bold text-amber-800">{formatQty(item.remaining_qty)}</div>
                                    <div className="text-[9px] text-amber-600/80 font-sans font-semibold">restant</div>
                                  </td>
                                  <td className="px-2.5 py-1 bg-sky-50/60">
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={item.delivered_qty === 0 ? '' : item.delivered_qty}
                                      onChange={(e) => handleItemQtyChange(item.line_id, e.target.value === '' ? 0 : Number(e.target.value))}
                                      className="w-full min-w-[110px] px-2 py-1 text-xs text-right border border-sky-400 focus:border-sky-600 rounded-lg font-mono font-extrabold text-sky-950 bg-white focus:ring-2 focus:ring-sky-500 shadow-2xs"
                                      placeholder="0"
                                    />
                                    <span className="text-[9px] text-sky-700 font-semibold block text-right mt-0.5">Saisie BL</span>
                                  </td>
                                  <td className="px-2.5 py-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={item.unit_price}
                                      onChange={(e) => handleItemPriceChange(item.line_id, Number(e.target.value))}
                                      className={`w-full min-w-[100px] px-2 py-1 text-xs text-right border rounded-lg font-mono font-bold ${
                                        item.unit_price !== item.original_unit_price
                                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                                          : 'border-slate-300 text-slate-900 bg-white'
                                      }`}
                                    />
                                    <span className="text-[9px] text-slate-400 font-semibold block text-right mt-0.5">DA</span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between font-mono text-xs">
                    <span className="font-sans font-bold text-slate-300">RÉSUMÉ DE CE BON DE LIVRAISON</span>
                    <div>
                      <span>Articles Livrés: </span>
                      <span className="font-bold text-sky-400">
                        {deliveryItems.filter((i) => i.delivered_qty > 0).length} sur {deliveryItems.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
                    >
                      Enregistrer Bon de Livraison
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* EDIT DELIVERY MODAL */}
      {isEditModalOpen && editingDelivery && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditModalOpen(false);
              setEditingDelivery(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Pencil size={16} className="text-amber-400" />
                <span>Modifier la Livraison</span>
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingDelivery(null);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditDelivery} className="p-4 space-y-3 text-xs overflow-y-auto">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-slate-500 text-[10px]">
                  <span>Commande: <strong className="text-slate-800 font-mono">{editingDelivery.n_order}</strong></span>
                  <span>Unité: <strong className="text-slate-800 font-mono">{editingDelivery.unite || 'U'}</strong></span>
                </div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm">{editingDelivery.designation}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">N° Bon de Livraison (BL) *</label>
                <input
                  type="text"
                  required
                  value={editDeliveryNoteNumber}
                  onChange={(e) => setEditDeliveryNoteNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono font-bold bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="ex: BL-2026-00412"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date de Réception BL *</label>
                <DateInputDDMMYYYY
                  required
                  value={editDeliveryDate}
                  onChange={(val) => setEditDeliveryDate(val)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantité Livrée *</label>
                  <input
                    type="number"
                    required
                    min="0.001"
                    step="any"
                    value={editDeliveredQty}
                    onChange={(e) => setEditDeliveredQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-sky-400 font-mono font-extrabold text-sky-950 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prix Unitaire (DA)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editUnitPrice}
                    onChange={(e) => setEditUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono font-bold bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingDelivery(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 rounded-lg shadow-xs transition-colors"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRICE WARNING ATTENTION POPUP MODAL */}
      {isPriceWarningOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPriceWarningOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-amber-500 text-slate-950 px-6 py-4 flex items-center gap-3 font-bold">
              <AlertTriangle size={24} className="shrink-0" />
              <span>Attention : Modification du Prix Unitaire</span>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-800 leading-relaxed font-medium">
                Attention : vous avez modifié le prix unitaire sur un ou plusieurs articles par rapport au prix unitaire initial de la commande ! Êtes-vous sûr de vouloir enregistrer ces livraisons avec les nouveaux prix ?
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={executeSaveDeliveries}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
                >
                  Confirmer et enregistrer avec le nouveau prix
                </button>
                <button
                  onClick={() => setIsPriceWarningOpen(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  Annuler la modification de prix
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL DELIVERIES CONFIRMATION MODAL */}
      {isClearConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsClearConfirmOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-300 w-full max-w-md overflow-hidden">
            <div className="bg-rose-600 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-sm">
                <AlertTriangle size={20} />
                <span>Réinitialiser le Registre des Livraisons</span>
              </div>
              <button onClick={() => setIsClearConfirmOpen(false)} className="text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Êtes-vous sûr de vouloir <strong>supprimer toutes les livraisons et réceptions actuelles</strong> ? 
                Cette opération permet de nettoyer la base de données avant d'importer le fichier SAP propre.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 text-[11px]">
                ℹ️ Les commandes locales et leurs articles resteront intacts. Seul l'historique des bons de livraison sera vidé.
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsClearConfirmOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isClearingDeliveries}
                  onClick={handleClearAllDeliveries}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isClearingDeliveries ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Nettoyage en cours...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Confirmer la suppression</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAP IMPORT MODAL WIZARD */}
      {isSapModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSapModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-indigo-700 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet size={20} className="text-indigo-200" />
                <div>
                  <h3 className="font-bold text-sm">Assistant d'Importation & Synchronisation SAP</h3>
                  <p className="text-[11px] text-indigo-200">Import des réceptions (103) et annulations (104) depuis Excel/MHTML</p>
                </div>
              </div>
              <button
                onClick={() => setIsSapModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-indigo-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper Steps Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                  sapImportStep === 'upload' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {sapImportStep === 'upload' ? '1' : '✓'}
                </span>
                <span className={`font-semibold ${sapImportStep === 'upload' ? 'text-indigo-900' : 'text-slate-600'}`}>
                  1. Fichier SAP
                </span>
              </div>
              <div className="h-0.5 w-8 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                  sapImportStep === 'mapping' ? 'bg-indigo-600 text-white' : sapImportStep === 'preview' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {sapImportStep === 'preview' ? '✓' : '2'}
                </span>
                <span className={`font-semibold ${sapImportStep === 'mapping' ? 'text-indigo-900' : 'text-slate-600'}`}>
                  2. Mappage des Commandes
                </span>
              </div>
              <div className="h-0.5 w-8 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                  sapImportStep === 'preview' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  3
                </span>
                <span className={`font-semibold ${sapImportStep === 'preview' ? 'text-indigo-900' : 'text-slate-600'}`}>
                  3. Prévisualisation & Import
                </span>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-xs">
              {sapImportSuccessMessage && (
                <div className="mb-4 bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center gap-3 text-emerald-900 font-bold animate-in fade-in">
                  <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                  <span>{sapImportSuccessMessage}</span>
                </div>
              )}

              {/* STEP 1: UPLOAD FILE */}
              {sapImportStep === 'upload' && (
                <div className="space-y-4 max-w-xl mx-auto py-6">
                  <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 rounded-2xl p-8 text-center transition-colors">
                    <Upload size={36} className="mx-auto text-indigo-600 mb-3" />
                    <h4 className="text-sm font-bold text-slate-800 mb-1">
                      Sélectionnez ou déposez votre fichier SAP
                    </h4>
                    <p className="text-[11px] text-slate-500 mb-4">
                      Formats supportés : <strong>.MHTML</strong> (export standard SAP), <strong>.HTML</strong>, <strong>.XLSX</strong>, <strong>.XLS</strong>
                    </p>

                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-xs transition-colors">
                      <FileSpreadsheet size={16} />
                      <span>Parcourir mon ordinateur</span>
                      <input
                        type="file"
                        accept=".mhtml,.html,.htm,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                      />
                    </label>

                    {isParsingSap && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-indigo-700 font-semibold">
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Analyse et extraction du fichier en cours...</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1.5">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Info size={14} className="text-sky-600" />
                      <span>Fonctionnalités automatiques de l'import SAP :</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Détection automatique des codes mouvement <strong>103 (Réception)</strong> et <strong>104 (Annulation de réception)</strong>.</li>
                      <li>Gestion intelligente du solde cumulé : les annulations 104 sont déduites automatiquement.</li>
                      <li>Mémoire permanente : les correspondances entre les numéros de commande SAP et vos commandes locales sont enregistrées.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* STEP 2: ORDER MAPPING */}
              {sapImportStep === 'mapping' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                    <div>
                      <h4 className="font-bold text-indigo-950 text-xs sm:text-sm">
                        Association des Commandes SAP détectées
                      </h4>
                      <p className="text-[11px] text-indigo-800">
                        {uniqueSapOrdersInFile.length} numéro(s) de commande SAP trouvé(s) dans le fichier ({sapParsedRows.length} lignes d'opérations).
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-white text-indigo-800 rounded-lg font-bold border border-indigo-200 text-[11px]">
                      {Object.values(sapOrderMappings).filter((m: any) => Boolean(m && m.orderId)).length} / {uniqueSapOrdersInFile.length} Associées
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {uniqueSapOrdersInFile.map((sapPo) => {
                      const currentMapping = sapOrderMappings[sapPo];
                      const rowsForThisPo = sapParsedRows.filter(r => r.poNum === sapPo);
                      const recCount = rowsForThisPo.filter(r => r.moveCode === '103').length;
                      const annCount = rowsForThisPo.filter(r => r.moveCode === '104').length;
                      const sampleArticle = rowsForThisPo[0]?.designation || '';

                      return (
                        <div
                          key={sapPo}
                          className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            currentMapping && currentMapping.orderId
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : 'bg-white border-slate-200 shadow-2xs'
                          }`}
                        >
                          <div className="space-y-1 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                SAP N° {sapPo}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                ({rowsForThisPo.length} opér. : <strong className="text-emerald-700">{recCount} récept.</strong>, <strong className="text-rose-700">{annCount} annul.</strong>)
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 truncate max-w-md" title={sampleArticle}>
                              Exemple article: <span className="font-semibold text-slate-800">{sampleArticle}</span>
                            </p>
                          </div>

                          <div className="flex-1 max-w-md">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                              Associer à la commande locale (Livraison Partielle) :
                            </label>
                            <SearchableSelect
                              options={eligibleOrders.map((o) => ({
                                value: String(o.id),
                                label: `${o.n_order} - ${o.supplier_name || o.etablir_par || 'Fournisseur'} (${o.lines?.length || 0} art.)`,
                              }))}
                              value={currentMapping?.orderId ? String(currentMapping.orderId) : ''}
                              onChange={(val) => {
                                const selected = eligibleOrders.find((o) => String(o.id) === String(val));
                                setSapOrderMappings((prev) => ({
                                  ...prev,
                                  [sapPo]: selected
                                    ? { orderId: selected.id, orderNumber: selected.n_order }
                                    : { orderId: 0, orderNumber: '' },
                                }));
                              }}
                              placeholder="Rechercher une commande Livraison Partielle..."
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSapImportStep('upload')}
                      className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                    >
                      ← Revenir au fichier
                    </button>
                    <button
                      type="button"
                      onClick={() => setSapImportStep('preview')}
                      disabled={mappedDeliveryItemsToImport.length === 0}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>Continuer vers la prévisualisation ({mappedDeliveryItemsToImport.length} lignes)</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PREVIEW & CONFIRMATION */}
              {sapImportStep === 'preview' && (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Lignes</span>
                      <strong className="text-base font-extrabold text-slate-900 font-mono">{mappedDeliveryItemsToImport.length}</strong>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">Code 103 (Réceptions)</span>
                      <strong className="text-base font-extrabold text-emerald-800 font-mono">
                        {mappedDeliveryItemsToImport.filter(i => i.movement_code === '103').length}
                      </strong>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center">
                      <span className="text-[10px] font-bold text-rose-700 uppercase block">Code 104 (Annulations)</span>
                      <strong className="text-base font-extrabold text-rose-800 font-mono">
                        {mappedDeliveryItemsToImport.filter(i => i.movement_code === '104').length}
                      </strong>
                    </div>
                    <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5 text-center">
                      <span className="text-[10px] font-bold text-sky-700 uppercase block">Total Quantité Nette</span>
                      <strong className="text-base font-extrabold text-sky-900 font-mono">
                        {formatQty(mappedDeliveryItemsToImport.reduce((acc, curr) => acc + Number(curr.delivered_qty || 0), 0))}
                      </strong>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Mouvement</th>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Commande App</th>
                            <th className="px-3 py-2">Article</th>
                            <th className="px-3 py-2 text-right">Qté Saisie</th>
                            <th className="px-3 py-2">Doc. Article / BL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {mappedDeliveryItemsToImport.slice(0, 150).map((row, idx) => {
                            const is104 = row.movement_code === '104' || Number(row.delivered_qty) < 0;
                            return (
                              <tr key={idx} className={is104 ? 'bg-rose-50/70 text-rose-900' : 'hover:bg-slate-50'}>
                                <td className="px-3 py-1.5 whitespace-nowrap">
                                  {is104 ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-200 text-rose-900 border border-rose-300 inline-flex items-center gap-1">
                                      <AlertTriangle size={11} />
                                      104 (Annulation)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      103 (Réception)
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-1.5 whitespace-nowrap text-slate-600">{formatDateDDMMYYYY(row.delivery_date)}</td>
                                <td className="px-3 py-1.5 whitespace-nowrap font-bold font-mono text-sky-800">{row.n_order}</td>
                                <td className="px-3 py-1.5 max-w-xs truncate" title={row.designation}>{row.designation}</td>
                                <td className="px-3 py-1.5 text-right font-mono font-black whitespace-nowrap">
                                  <span className={is104 ? 'text-rose-700' : 'text-emerald-700'}>
                                    {row.delivered_qty > 0 ? `+${formatQty(row.delivered_qty)}` : formatQty(row.delivered_qty)} {row.unite || 'PCE'}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">{row.delivery_note_number}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {mappedDeliveryItemsToImport.length > 150 && (
                      <div className="p-2 bg-slate-50 text-center text-[11px] text-slate-500 font-semibold border-t border-slate-200">
                        Affichage des 150 premières lignes sur {mappedDeliveryItemsToImport.length} au total.
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSapImportStep('mapping')}
                      className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                    >
                      ← Modifier les associations
                    </button>
                    <button
                      type="button"
                      disabled={isImportingSap}
                      onClick={handleConfirmSapImport}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isImportingSap ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Importation en cours dans la base de données...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Confirmer & Enregistrer ({mappedDeliveryItemsToImport.length} lignes)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
