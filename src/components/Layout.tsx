import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Globe, 
  Truck, 
  Ship, 
  Building2, 
  Users, 
  Code2, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ShieldAlert, 
  UserCheck,
  CheckCircle2,
  Database,
  Languages,
  FileCheck,
  Layers,
  TrendingUp,
  MessageSquareQuote,
  Gavel,
  Boxes,
  Calculator,
  Factory,
  Clock,
  Calendar,
  Menu,
  X
} from 'lucide-react';
import { User, UserRole } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../translations';
import { SensusLogo } from './SensusLogo';

interface LayoutProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenSqlModal: () => void;
  productionUpdateTime?: string;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenSqlModal,
  productionUpdateTime,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('procurement_sidebar_collapsed');
      if (saved !== null) return JSON.parse(saved);
      return typeof window !== 'undefined' && window.innerWidth < 1440;
    } catch (e) {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stockMenuOpen, setStockMenuOpen] = useState(true);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>('');
  const { language, setLanguage, t, isRtl } = useLanguage();

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('procurement_sidebar_collapsed', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  useEffect(() => {
    const handleResize = () => {
      // Auto collapse on narrow laptop screens if not manually overridden
      if (window.innerWidth < 1200 && !collapsed) {
        setCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [collapsed]);

  useEffect(() => {
    const loadCompanyInfo = () => {
      fetch('/api/company-info')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.logo_url !== undefined) {
            setCompanyLogoUrl(data.logo_url);
          }
        })
        .catch(() => {});
    };

    loadCompanyInfo();

    window.addEventListener('company-info-updated', loadCompanyInfo);
    return () => window.removeEventListener('company-info-updated', loadCompanyInfo);
  }, []);

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { 
      id: 'stock-menu', 
      label: 'Situation Stock', 
      icon: Boxes, 
      roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'],
      subItems: [
        { id: 'stock-situation', label: 'Stock Matières & Pièces (MP / PD)' },
        { id: 'stock-produits-finis', label: 'Stock Produits Finis (PF)' },
      ]
    },
    { id: 'situation-appro', label: 'Situation Appro (MRP)', icon: Calculator, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'suivi-production', label: 'Suivi Production', icon: Factory, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'local-orders', label: t.localOrders, icon: FileText, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'deliveries', label: t.localDeliveries, icon: Truck, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'foreign-orders', label: t.foreignOrders, badge: 'Bientôt', icon: Globe, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'expeditions', label: t.foreignExpeditions, badge: 'Bientôt', icon: Ship, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'suppliers', label: t.suppliers, icon: Building2, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'financial-docs', label: t.financialDocs, icon: FileCheck, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'foreign-financial-docs', label: (t as any).foreignFinancialDocs || 'Docs Financiers Étrangers', icon: Globe, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'capex', label: 'Suivi Investissements CAPEX', icon: TrendingUp, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'parent-child-test', label: 'Parent / Enfant (Lab Test)', icon: Layers, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'consultations', label: 'Consultations', badge: 'Bientôt', icon: MessageSquareQuote, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'appels-offre', label: "Appels d'Offres", badge: 'Bientôt', icon: Gavel, roles: ['Admin', 'Appro', 'Chef Service', 'Visitor'] },
    { id: 'users', label: t.userManagement, icon: Users, roles: ['Admin'] },
  ];

  // Specific access restriction: user Salem.ferdjallah can only access Suivi de Production and CAPEX
  const isSalemFerdjallah =
    currentUser.username?.toLowerCase() === 'salem.ferdjallah' ||
    currentUser.username?.toLowerCase() === 'salem_ferdjallah' ||
    currentUser.full_name?.toLowerCase().includes('ferdjallah');

  const isBrahimiMohamed =
    currentUser.username?.toLowerCase() === 'mohamed.brahimi' ||
    currentUser.username?.toLowerCase().includes('brahimi') ||
    currentUser.full_name?.toLowerCase().includes('brahimi');

  const filteredNavItems = navItems.filter((item) => {
    // 1. Explicit admin permission configuration per user
    if (currentUser.allowed_pages && Array.isArray(currentUser.allowed_pages)) {
      if (currentUser.role === 'Admin' && item.id === 'users') return true;
      return currentUser.allowed_pages.includes(item.id);
    }
    // 2. Default Brahimi Mohamed restriction: ONLY Suivi Production
    if (isBrahimiMohamed) {
      return item.id === 'suivi-production';
    }
    // 3. Salem Ferdjallah fallback restriction
    if (isSalemFerdjallah) {
      return item.id === 'suivi-production' || item.id === 'capex';
    }
    return item.roles.includes(currentUser.role);
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentDateTimeStr = `${now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-sky-100 text-sky-800 border border-sky-200">Admin</span>;
      case 'Appro':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">Approvisionnement</span>;
      case 'Chef Service':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-purple-100 text-purple-800 border border-purple-200">Chef de Service</span>;
      case 'Visitor':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-800 border border-slate-200">Visiteur</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-800 border border-slate-200">{role || 'Utilisateur'}</span>;
    }
  };

  const getPageContextPill = () => {
    switch (activeTab) {
      case 'local-orders':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-900 border border-sky-300 text-xs font-bold shadow-2xs shrink-0">
            <FileText size={13} className="text-sky-600 shrink-0" />
            <span>Achats Locaux ({currentYear})</span>
            <span className="text-sky-300 font-normal">|</span>
            <Clock size={12} className="text-sky-600 shrink-0" />
            <span className="font-semibold text-sky-950">{currentDateTimeStr}</span>
          </div>
        );
      case 'foreign-orders':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-300 text-xs font-bold shadow-2xs shrink-0">
            <Globe size={13} className="text-blue-600 shrink-0" />
            <span>Achats Import ({currentYear})</span>
            <span className="text-blue-300 font-normal">|</span>
            <Clock size={12} className="text-blue-600 shrink-0" />
            <span className="font-semibold text-blue-950">{currentDateTimeStr}</span>
          </div>
        );
      case 'deliveries':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold shadow-2xs shrink-0">
            <Truck size={13} className="text-amber-600 shrink-0" />
            <span>Livraisons Locales ({currentYear})</span>
            <span className="text-amber-300 font-normal">|</span>
            <Clock size={12} className="text-amber-600 shrink-0" />
            <span className="font-semibold text-amber-950">{currentDateTimeStr}</span>
          </div>
        );
      case 'expeditions':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-300 text-xs font-bold shadow-2xs shrink-0">
            <Ship size={13} className="text-indigo-600 shrink-0" />
            <span>Expéditions & Transit ({currentYear})</span>
            <span className="text-indigo-300 font-normal">|</span>
            <Clock size={12} className="text-indigo-600 shrink-0" />
            <span className="font-semibold text-indigo-950">{currentDateTimeStr}</span>
          </div>
        );
      case 'suppliers':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 text-xs font-bold shadow-2xs shrink-0">
            <Building2 size={13} className="text-purple-600 shrink-0" />
            <span>Base Fournisseurs</span>
            <span className="text-purple-300 font-normal">|</span>
            <Clock size={12} className="text-purple-600 shrink-0" />
            <span className="font-semibold text-purple-950">{currentDateTimeStr}</span>
          </div>
        );
      case 'financial-docs':
      case 'foreign-financial-docs':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-2xs shrink-0">
            <FileCheck size={13} className="text-emerald-600 shrink-0" />
            <span>Documents Financiers ({currentYear})</span>
            <span className="text-emerald-300 font-normal">|</span>
            <Clock size={12} className="text-emerald-600 shrink-0" />
            <span className="font-semibold text-emerald-950">{currentDateTimeStr}</span>
          </div>
        );
      case 'suivi-production':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-2xs shrink-0">
            <Factory size={13} className="text-emerald-600 shrink-0" />
            <span>Production ({currentYear})</span>
            <span className="text-emerald-300 font-normal">|</span>
            <Clock size={12} className="text-emerald-600 shrink-0" />
            <span className="font-semibold text-emerald-950">{productionUpdateTime || currentDateTimeStr}</span>
          </div>
        );
      case 'stock-situation':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-300 text-xs font-bold shadow-2xs shrink-0">
            <Boxes size={13} className="text-teal-600 shrink-0" />
            <span>Stock Matières & Pièces (MP / PD)</span>
            <span className="text-teal-300 font-normal">|</span>
            <Clock size={12} className="text-teal-600 shrink-0" />
            <span className="font-semibold text-teal-950">{currentDateTimeStr}</span>
          </div>
        );
      case 'stock-produits-finis':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-300 text-xs font-bold shadow-2xs shrink-0">
            <Boxes size={13} className="text-indigo-600 shrink-0" />
            <span>Stock Produits Finis (PF)</span>
            <span className="text-indigo-300 font-normal">|</span>
            <Clock size={12} className="text-indigo-600 shrink-0" />
            <span className="font-semibold text-indigo-950">{currentDateTimeStr}</span>
          </div>
        );
      case 'situation-appro':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-900 border border-cyan-300 text-xs font-bold shadow-2xs shrink-0">
            <Calculator size={13} className="text-cyan-600 shrink-0" />
            <span>Calcul MRP / Appro</span>
            <span className="text-cyan-300 font-normal">|</span>
            <Clock size={12} className="text-cyan-600 shrink-0" />
            <span className="font-semibold text-cyan-950">{currentDateTimeStr}</span>
          </div>
        );
      case 'capex':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-900 border border-violet-300 text-xs font-bold shadow-2xs shrink-0">
            <TrendingUp size={13} className="text-violet-600 shrink-0" />
            <span>Investissements CAPEX ({currentYear})</span>
            <span className="text-violet-300 font-normal">|</span>
            <Clock size={12} className="text-violet-600 shrink-0" />
            <span className="font-semibold text-violet-950">{currentDateTimeStr}</span>
          </div>
        );
      case 'consultations':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 text-pink-900 border border-pink-300 text-xs font-bold shadow-2xs shrink-0">
            <MessageSquareQuote size={13} className="text-pink-600 shrink-0" />
            <span>Consultations RFQ</span>
            <span className="text-pink-300 font-normal">|</span>
            <Clock size={12} className="text-pink-600 shrink-0" />
            <span className="font-semibold text-pink-950">{currentDateTimeStr}</span>
          </div>
        );
      case 'appels-offre':
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-900 border border-orange-300 text-xs font-bold shadow-2xs shrink-0">
            <Gavel size={13} className="text-orange-600 shrink-0" />
            <span>Appels d'Offres</span>
            <span className="text-orange-300 font-normal">|</span>
            <Clock size={12} className="text-orange-600 shrink-0" />
            <span className="font-semibold text-orange-950">{currentDateTimeStr}</span>
          </div>
        );
      default:
        return (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-900 border border-sky-300 text-xs font-bold shadow-2xs shrink-0">
            <LayoutDashboard size={13} className="text-sky-600 shrink-0" />
            <span>Tableau de Bord ({currentYear})</span>
            <span className="text-sky-300 font-normal">|</span>
            <Clock size={12} className="text-sky-600 shrink-0" />
            <span className="font-semibold text-sky-950">{currentDateTimeStr}</span>
          </div>
        );
    }
  };

  const getTabHeaderTitle = (id: string) => {
    const item = navItems.find((n) => n.id === id);
    return item ? item.label : id.replace('-', ' ');
  };

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className={`flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden ${isRtl ? 'dir-rtl' : ''}`}>
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 ${
          collapsed ? 'lg:w-16 xl:w-20' : 'lg:w-56 xl:w-64'
        } ${
          mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } transition-all duration-300 ease-in-out bg-sky-950 text-sky-100 flex flex-col shadow-2xl border-r border-sky-800/40 shrink-0`}
      >
        {/* Brand Header */}
        <div className="h-14 sm:h-16 flex items-center justify-between px-3.5 border-b border-sky-800/50 bg-sky-950">
          {(!collapsed || mobileMenuOpen) && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="bg-white rounded-lg p-1 shrink-0 flex items-center justify-center">
                <SensusLogo logoUrl={companyLogoUrl} height={26} />
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-xs sm:text-sm tracking-tight text-white leading-tight truncate">{t.procurementTitle}</h1>
                <p className="text-[10px] sm:text-[11px] text-sky-200/80 font-medium truncate">{t.orderTrackerSub}</p>
              </div>
            </div>
          )}
          {collapsed && !mobileMenuOpen && (
            <div className="mx-auto bg-white rounded-lg p-1 flex items-center justify-center">
              <SensusLogo logoUrl={companyLogoUrl} height={24} />
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSidebar}
              className="hidden lg:block p-1.5 rounded-lg hover:bg-sky-800/50 text-sky-300 hover:text-white transition-colors"
              title={collapsed ? "Agrandir le menu" : "Réduire le menu (Mode 14 pouces)"}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-sky-800/50 text-sky-300 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const subItems = (item as any).subItems as { id: string; label: string }[] | undefined;
            const isSubActive = subItems ? subItems.some((s) => s.id === activeTab) : false;
            const isActive = activeTab === item.id || isSubActive;

            if (subItems) {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => {
                      if (collapsed && !mobileMenuOpen) {
                        setCollapsed(false);
                      }
                      setStockMenuOpen(!stockMenuOpen);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-sky-900/60 text-white border border-sky-600/40 font-bold'
                        : 'text-sky-200 hover:text-white hover:bg-sky-800/40'
                    }`}
                    title={collapsed && !mobileMenuOpen ? item.label : undefined}
                  >
                    <Icon size={18} className={`shrink-0 ${isActive ? 'text-sky-300' : 'text-sky-400'}`} />
                    {(!collapsed || mobileMenuOpen) && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">{item.label}</span>
                        <ChevronDown 
                          size={15} 
                          className={`text-sky-400 transition-transform duration-200 ${stockMenuOpen ? 'rotate-180' : ''}`} 
                        />
                      </div>
                    )}
                  </button>

                  {/* Submenu Dropdown */}
                  {(!collapsed || mobileMenuOpen) && stockMenuOpen && (
                    <div className="pl-6 pr-1 space-y-1 pt-0.5 border-l-2 border-sky-700/60 ml-4">
                      {subItems.map((sub) => {
                        const isCurrent = activeTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleNavClick(sub.id)}
                            className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                              isCurrent
                                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                                : 'text-sky-300 hover:text-white hover:bg-sky-800/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-sky-400'}`}></span>
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm border border-sky-400/40 font-bold'
                    : 'text-sky-200 hover:text-white hover:bg-sky-800/40'
                }`}
                title={collapsed && !mobileMenuOpen ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
              >
                <Icon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-sky-300'}`} />
                {(!collapsed || mobileMenuOpen) && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-1 shrink-0 text-[8px] font-black uppercase tracking-tight px-1.5 py-0.2 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/25 whitespace-nowrap">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Current User & Quick Role Switcher Footer */}
        <div className="p-2.5 border-t border-sky-800/50 bg-sky-950">
          {(!collapsed || mobileMenuOpen) ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-sky-900 border border-sky-700 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                    {(currentUser?.full_name || currentUser?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{currentUser?.full_name || currentUser?.username || 'Utilisateur'}</p>
                    <p className="text-[10px] text-sky-300 truncate">@{currentUser?.username || 'user'}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1 rounded text-sky-300 hover:text-rose-400 hover:bg-sky-900 transition-colors shrink-0"
                  title={t.logout}
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onLogout}
                className="p-1.5 rounded text-sky-300 hover:text-rose-400 hover:bg-sky-900"
                title={t.logout}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar Header */}
        <header className="min-h-14 sm:min-h-15 py-1.5 md:py-0 md:h-14 bg-white border-b border-slate-200 px-3 sm:px-5 flex items-center justify-between shadow-xs z-10 shrink-0 gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
              title="Open menu"
            >
              <Menu size={19} />
            </button>
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
              title={collapsed ? "Agrandir le menu" : "Réduire le menu (Mode 14 pouces)"}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 tracking-tight truncate">
              {getTabHeaderTitle(activeTab)}
            </h2>
            <div className="shrink-0">{getRoleBadge(currentUser.role)}</div>

            {/* Dynamic Page Module Context Badge with Date & Time */}
            {getPageContextPill()}
          </div>

          {/* Right Header Utilities: Language Selector & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <Languages size={14} className="text-slate-500 ml-1.5 mr-1 shrink-0" />
              <button
                onClick={() => setLanguage('fr')}
                className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all ${
                  language === 'fr'
                    ? 'bg-white text-sky-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                FR
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all ${
                  language === 'en'
                    ? 'bg-white text-sky-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ar')}
                className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all ${
                  language === 'ar'
                    ? 'bg-white text-sky-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                AR
              </button>
            </div>
          </div>
        </header>

        {/* Content Body Viewport */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-2.5 lg:p-3 xl:p-4 bg-slate-50/50 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};

