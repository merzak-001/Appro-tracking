import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  Layout,
  Dashboard,
  LocalOrders,
  ForeignOrders,
  LocalDeliveries,
  ForeignExpeditions,
  Suppliers,
  UsersManagement,
  FinancialDocuments,
  ForeignFinancialDocuments,
  ParentChildWorkflowTest,
  CapexTracking,
  DatabaseExplorer,
  SqlServerScriptModal,
  SensusLogo,
  Consultations,
  AppelsOffre,
  StockSituation,
  SituationAppro,
  SuiviProduction,
} from './components';
import { 
  User, 
  Supplier, 
  LocalOrder, 
  LocalDelivery, 
  ForeignOrder, 
  ForeignExpedition, 
  DashboardKPIs,
  ProductionMonthlyRecord
} from './types';
import { getLatestProductionUpdateTime } from './utils/productionUtils';
import { Lock, LogIn, Database, Shield, FileCheck } from 'lucide-react';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('procurement_current_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('procurement_active_tab') || 'dashboard';
    } catch (e) {
      return 'dashboard';
    }
  });

  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('procurement_active_tab', activeTab);
    } catch (e) {
      console.error(e);
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentUser) {
      // 1. Explicit admin permission configuration per user
      if (currentUser.allowed_pages && Array.isArray(currentUser.allowed_pages) && currentUser.allowed_pages.length > 0) {
        if (!currentUser.allowed_pages.includes(activeTab) && !(currentUser.role === 'Admin' && activeTab === 'users')) {
          setActiveTab(currentUser.allowed_pages[0]);
          return;
        }
      }

      // 2. Default Brahimi Mohamed restriction
      const isBrahimi =
        currentUser.username?.toLowerCase() === 'mohamed.brahimi' ||
        currentUser.username?.toLowerCase().includes('brahimi') ||
        currentUser.full_name?.toLowerCase().includes('brahimi');
      if (isBrahimi && activeTab !== 'suivi-production') {
        setActiveTab('suivi-production');
        return;
      }

      // 3. Salem Ferdjallah fallback restriction
      const isSalem =
        currentUser.username?.toLowerCase() === 'salem.ferdjallah' ||
        currentUser.username?.toLowerCase() === 'salem_ferdjallah' ||
        currentUser.full_name?.toLowerCase().includes('ferdjallah');
      if (isSalem && activeTab !== 'suivi-production' && activeTab !== 'capex') {
        setActiveTab('suivi-production');
      }
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem('procurement_current_user', JSON.stringify(currentUser));
      } catch (e) {}
    } else {
      try {
        localStorage.removeItem('procurement_current_user');
      } catch (e) {}
    }
  }, [currentUser]);

  // Data States
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);
  const [localDeliveries, setLocalDeliveries] = useState<LocalDelivery[]>([]);
  const [foreignOrders, setForeignOrders] = useState<ForeignOrder[]>([]);
  const [foreignExpeditions, setForeignExpeditions] = useState<ForeignExpedition[]>([]);
  const [productionRecords, setProductionRecords] = useState<ProductionMonthlyRecord[]>([]);

  const latestProdUpdateStr = React.useMemo(() => {
    return getLatestProductionUpdateTime(productionRecords, new Date().getFullYear());
  }, [productionRecords]);

  const [loading, setLoading] = useState(true);

  // Login Modal State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const fetchAllData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [kpiRes, supRes, locOrdRes, locDelRes, forOrdRes, forExpRes, prodRes] = await Promise.all([
        fetch('/api/dashboard/kpis'),
        fetch('/api/suppliers'),
        fetch('/api/local-orders'),
        fetch('/api/local-deliveries'),
        fetch('/api/foreign-orders'),
        fetch('/api/foreign-expeditions'),
        fetch('/api/production-mcba'),
      ]);

      if (kpiRes.ok) setKpis(await kpiRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
      if (locOrdRes.ok) setLocalOrders(await locOrdRes.json());
      if (locDelRes.ok) setLocalDeliveries(await locDelRes.json());
      if (forOrdRes.ok) setForeignOrders(await forOrdRes.json());
      if (forExpRes.ok) setForeignExpeditions(await forExpRes.json());
      if (prodRes.ok) setProductionRecords(await prodRes.json());
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAllData(true);
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawUser = data.user || data;
        const normalizedUser: User = {
          id: rawUser.id || data.id || Date.now(),
          username: rawUser.username || data.username || loginUsername.trim(),
          full_name: rawUser.full_name || data.full_name || rawUser.username || loginUsername.trim(),
          role: rawUser.role || data.role || 'Appro',
        };
        setCurrentUser(normalizedUser);
      } else {
        const data = await res.json();
        setLoginError(data.error || 'Erreur lors de la connexion');
      }
    } catch (err) {
      setLoginError('Erreur de connexion au serveur');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-slate-100">
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-2">
              <div className="bg-white p-2.5 rounded-xl shadow-md inline-block">
                <SensusLogo height={38} />
              </div>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Sensus SPA</h1>
            <p className="text-xs text-sky-400 font-semibold">Système de Suivi des Commandes & Production</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs pt-2">
            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nom d'utilisateur / Username</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Entrez votre nom d'utilisateur"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-sky-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Mot de passe / Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn size={16} />
              <span>Se Connecter / Log In</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center text-[11px] text-slate-500 space-y-1">
            <p>Système de Suivi des Commandes & Livraisons Sensus SPA</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout
      currentUser={currentUser}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={() => setCurrentUser(null)}
      onOpenSqlModal={() => setIsSqlModalOpen(true)}
      productionUpdateTime={latestProdUpdateStr}
    >
      {activeTab === 'dashboard' && (
        <Dashboard
          kpis={kpis}
          localOrders={localOrders}
          foreignOrders={foreignOrders}
          localDeliveries={localDeliveries}
          suppliers={suppliers}
          loading={loading}
          currentUser={currentUser}
          onNavigate={(tab) => setActiveTab(tab)}
          onOpenNewLocalOrder={() => setActiveTab('local-orders')}
          onOpenNewForeignOrder={() => setActiveTab('foreign-orders')}
          onOpenSqlModal={() => setIsSqlModalOpen(true)}
        />
      )}

      {activeTab === 'stock-situation' && (
        <StockSituation 
          mode="components" 
          onNavigateToAppro={() => setActiveTab('situation-appro')} 
        />
      )}

      {activeTab === 'stock-produits-finis' && (
        <StockSituation 
          mode="finished_goods" 
          onNavigateToAppro={() => setActiveTab('situation-appro')} 
        />
      )}

      {activeTab === 'stock-pieces-achetees' && (
        <StockSituation 
          mode="purchased" 
          onNavigateToAppro={() => setActiveTab('situation-appro')} 
        />
      )}

      {activeTab === 'situation-appro' && (
        <SituationAppro 
          onNavigateToStock={() => setActiveTab('stock-situation')}
          onOpenNewConsultation={() => setActiveTab('consultations')}
        />
      )}

      {activeTab === 'suivi-production' && (
        <SuiviProduction currentUser={currentUser} />
      )}

      {activeTab === 'consultations' && (
        <Consultations currentUser={currentUser} />
      )}

      {activeTab === 'appels-offre' && (
        <AppelsOffre currentUser={currentUser} />
      )}

      {activeTab === 'local-orders' && (
        <LocalOrders
          currentUser={currentUser}
          suppliers={suppliers}
          orders={localOrders}
          loading={loading}
          onRefresh={fetchAllData}
          onSelectTab={setActiveTab}
        />
      )}

      {activeTab === 'foreign-orders' && (
        <ForeignOrders
          currentUser={currentUser}
          suppliers={suppliers}
          orders={foreignOrders}
          loading={loading}
          onRefresh={fetchAllData}
          onSelectTab={setActiveTab}
        />
      )}

      {activeTab === 'deliveries' && (
        <LocalDeliveries
          currentUser={currentUser}
          orders={localOrders}
          deliveries={localDeliveries}
          loading={loading}
          onRefresh={fetchAllData}
          onSelectTab={setActiveTab}
        />
      )}

      {activeTab === 'expeditions' && (
        <ForeignExpeditions
          currentUser={currentUser}
          orders={foreignOrders}
          expeditions={foreignExpeditions}
          loading={loading}
          onRefresh={fetchAllData}
          onSelectTab={setActiveTab}
        />
      )}

      {activeTab === 'suppliers' && (
        <Suppliers
          currentUser={currentUser}
          suppliers={suppliers}
          localOrders={localOrders}
          loading={loading}
          onRefresh={fetchAllData}
        />
      )}

      {activeTab === 'financial-docs' && (
        <FinancialDocuments
          currentUser={currentUser}
          localOrders={localOrders}
          foreignOrders={foreignOrders}
          foreignExpeditions={foreignExpeditions}
          suppliers={suppliers}
          onSelectTab={setActiveTab}
        />
      )}

      {activeTab === 'foreign-financial-docs' && (
        <ForeignFinancialDocuments
          currentUser={currentUser}
          foreignOrders={foreignOrders}
          foreignExpeditions={foreignExpeditions}
          suppliers={suppliers}
          onSelectTab={setActiveTab}
        />
      )}

      {activeTab === 'parent-child-test' && (
        <ParentChildWorkflowTest
          currentUser={currentUser}
          suppliers={suppliers}
        />
      )}

      {activeTab === 'capex' && (
        <CapexTracking
          currentUser={currentUser}
        />
      )}

      {activeTab === 'users' && currentUser.role === 'Admin' && (
        <UsersManagement currentUser={currentUser} />
      )}

      {/* SQL SERVER T-SQL SCHEMA MODAL */}
      <SqlServerScriptModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ErrorBoundary>
  );
}
