import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  X,
  Lock,
  UserCheck,
  CheckSquare,
  Square,
  Layers,
  Factory,
  CheckCircle2
} from 'lucide-react';
import { User, UserRole } from '../types';

interface UsersManagementProps {
  currentUser: User;
}

export const AVAILABLE_SYSTEM_PAGES = [
  { id: 'dashboard', label: 'Tableau de Bord', category: 'Général' },
  { id: 'suivi-production', label: 'Suivi Production', category: 'Production' },
  { id: 'stock-situation', label: 'Situation Stock', category: 'Appro' },
  { id: 'situation-appro', label: 'Situation Appro (MRP)', category: 'Appro' },
  { id: 'local-orders', label: 'Commandes Locales', category: 'Achats' },
  { id: 'deliveries', label: 'Livraisons Locales', category: 'Achats' },
  { id: 'foreign-orders', label: 'Commandes Étrangères', category: 'Achats' },
  { id: 'expeditions', label: 'Expéditions Étrangères', category: 'Achats' },
  { id: 'suppliers', label: 'Fournisseurs', category: 'Achats' },
  { id: 'financial-docs', label: 'Documents Financiers', category: 'Finances' },
  { id: 'foreign-financial-docs', label: 'Docs Financiers Étrangers', category: 'Finances' },
  { id: 'capex', label: 'Suivi Investissements CAPEX', category: 'Investissements' },
  { id: 'consultations', label: 'Consultations', category: 'Achats' },
  { id: 'appels-offre', label: "Appels d'Offres", category: 'Achats' },
  { id: 'parent-child-test', label: 'Parent / Enfant (Lab Test)', category: 'Lab' },
];

export const UsersManagement: React.FC<UsersManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form Fields
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('Appro');
  const [allowedPages, setAllowedPages] = useState<string[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setRole('Appro');
    setAllowedPages(AVAILABLE_SYSTEM_PAGES.map((p) => p.id));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.full_name);
    setRole(u.role);

    if (u.allowed_pages && Array.isArray(u.allowed_pages) && u.allowed_pages.length > 0) {
      setAllowedPages(u.allowed_pages);
    } else {
      const isBrahimi =
        u.username?.toLowerCase().includes('brahimi') ||
        u.full_name?.toLowerCase().includes('brahimi');
      const isSalem =
        u.username?.toLowerCase().includes('ferdjallah') ||
        u.full_name?.toLowerCase().includes('ferdjallah');

      if (isBrahimi) {
        setAllowedPages(['suivi-production']);
      } else if (isSalem) {
        setAllowedPages(['suivi-production', 'capex']);
      } else {
        setAllowedPages(AVAILABLE_SYSTEM_PAGES.map((p) => p.id));
      }
    }
    setIsModalOpen(true);
  };

  const handleTogglePage = (pageId: string) => {
    setAllowedPages((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  const handleSelectAllPages = () => {
    setAllowedPages(AVAILABLE_SYSTEM_PAGES.map((p) => p.id));
  };

  const handleDeselectAllPages = () => {
    setAllowedPages([]);
  };

  const handleOnlySuiviProduction = () => {
    setAllowedPages(['suivi-production']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !fullName) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          full_name: fullName,
          role,
          allowed_pages: allowedPages,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
      } else {
        const err = await res.json();
        alert(`Erreur: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser.id) {
      alert('Impossible de supprimer votre propre compte administrateur actif.');
      return;
    }
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const getUserPageBadges = (u: User) => {
    const isBrahimi =
      u.username?.toLowerCase().includes('brahimi') ||
      u.full_name?.toLowerCase().includes('brahimi');
    const pages = u.allowed_pages && u.allowed_pages.length > 0
      ? u.allowed_pages
      : isBrahimi
      ? ['suivi-production']
      : undefined;

    if (!pages) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          Toutes les pages (selon rôle)
        </span>
      );
    }

    if (pages.length === 1 && pages[0] === 'suivi-production') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
          <Factory size={12} className="text-emerald-700" />
          Suivi Production Uniquement
        </span>
      );
    }

    if (pages.length >= AVAILABLE_SYSTEM_PAGES.length) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
          Accès Complet ({pages.length} pages)
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1 max-w-[280px]">
        {pages.map((pId) => {
          const match = AVAILABLE_SYSTEM_PAGES.find((p) => p.id === pId);
          return (
            <span
              key={pId}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
            >
              {match ? match.label : pId}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full mx-auto">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-linear-to-br from-sky-600 to-indigo-700 text-white rounded-xl shadow-md flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Gestion des Utilisateurs & Autorisations
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Contrôlez les comptes utilisateurs et configurez les pages / modules accessibles pour chacun.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <UserPlus size={16} />
          <span>Ajouter un Utilisateur</span>
        </button>
      </div>

      {/* Role Definitions Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <ShieldCheck size={16} className="text-slate-700" />
            <span>1. Rôle Admin</span>
          </div>
          <p className="text-slate-600">
            Gestion complète des utilisateurs, attribution personnalisée des pages accessibles.
          </p>
        </div>

        <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-2 font-bold text-sky-900">
            <UserCheck size={16} className="text-sky-600" />
            <span>2. Rôle Approvisionnement / SAI</span>
          </div>
          <p className="text-sky-700">
            Accès opérationnel aux modules autorisés (achats, livraisons, stock, production).
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <ShieldAlert size={16} className="text-slate-500" />
            <span>3. Rôle Visiteur</span>
          </div>
          <p className="text-slate-600">
            Consultation en lecture seule des tableaux et synthèses autorisées.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Chargement des utilisateurs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Identifiant</th>
                  <th className="px-4 py-3">Nom Complet</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Pages / Modules Autorisés</th>
                  <th className="px-4 py-3">Mot de passe défaut</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-slate-400">#{u.id}</td>
                    <td className="px-4 py-3.5 font-bold font-mono text-sky-700">@{u.username}</td>
                    <td className="px-4 py-3.5 font-medium">{u.full_name}</td>
                    <td className="px-4 py-3.5">
                      {u.role === 'Admin' ? (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-900 text-white border border-slate-800">
                          Admin
                        </span>
                      ) : u.role === 'Chef Service' ? (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          Chef de Service
                        </span>
                      ) : u.role === 'Visitor' ? (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Visiteur
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                          Appro
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {getUserPageBadges(u)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">1010</td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded cursor-pointer"
                          title="Modifier les autorisations et informations"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ShieldCheck size={18} className="text-sky-400" />
                <span>{editingUser ? `Modifier l'utilisateur : @${editingUser.username}` : 'Créer un Compte Utilisateur'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {!editingUser && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Identifiant (Username) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: mohamed.brahimi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Brahimi, Mohamed"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rôle Système *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold focus:border-sky-500 focus:outline-none cursor-pointer"
                >
                  <option value="Admin">Admin (Gestion des utilisateurs & autorisations)</option>
                  <option value="Appro">Appro (Opérations d'achats, stock et suivi)</option>
                  <option value="Chef Service">Chef de Service (Validation et suivi)</option>
                  <option value="Visitor">Visiteur (Consultation seule)</option>
                </select>
              </div>

              {/* Page Permissions Management */}
              <div className="pt-2 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers size={15} className="text-indigo-600" />
                    <span>Pages et Modules Autorisés :</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-500">
                    {allowedPages.length} sélectionnée(s)
                  </span>
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={handleOnlySuiviProduction}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Factory size={12} />
                    <span>Seulement Suivi Production</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllPages}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-200 transition-colors cursor-pointer"
                  >
                    Tout Autoriser
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllPages}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Tout Décocher
                  </button>
                </div>

                {/* Checkbox grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-56 overflow-y-auto">
                  {AVAILABLE_SYSTEM_PAGES.map((page) => {
                    const isChecked = allowedPages.includes(page.id);
                    return (
                      <label
                        key={page.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-white border-sky-400 font-bold text-sky-950 shadow-2xs'
                            : 'bg-slate-100/60 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePage(page.id)}
                          className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 shrink-0"
                        />
                        <div className="flex flex-col">
                          <span>{page.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {page.category}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2 text-slate-500">
                <Lock size={15} className="text-sky-600 shrink-0" />
                <span>Mot de passe système par défaut : <strong className="font-mono text-slate-800">1010</strong></span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-sky-600 text-white hover:bg-sky-500 rounded-xl shadow-xs cursor-pointer"
                >
                  Enregistrer les Autorisations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
