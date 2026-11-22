import React, { useState, useEffect } from 'react';
import { Building, Edit2, Check, X, Shield, MapPin, FileText, Image as ImageIcon } from 'lucide-react';
import { CompanyInfo as CompanyInfoType, User } from '../types';
import { SensusLogo } from './SensusLogo';

interface CompanyInfoProps {
  currentUser: User;
}

export const CompanyInfo: React.FC<CompanyInfoProps> = ({ currentUser }) => {
  const [info, setInfo] = useState<CompanyInfoType>({
    name: 'Sensus SPA',
    rc: '05B0086023',
    art: '19208603930',
    nif: '000519008602385',
    nis: '00519200158942',
    address: 'BP 02 route de Batna el eulma',
    logo_url: '',
  });

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<CompanyInfoType>(info);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const canEdit = currentUser.role === 'SAI' || currentUser.role === 'Admin';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEditForm((prev) => ({ ...prev, logo_url: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/company-info');
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        setEditForm(data);
      }
    } catch (err) {
      console.error('Error fetching company info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/company-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        const updated = await res.json();
        setInfo(updated);
        setIsEditing(false);
        setSuccessMsg('Informations de l\'entreprise mises à jour avec succès.');
        window.dispatchEvent(new Event('company-info-updated'));
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Erreur lors de la sauvegarde des informations.');
      }
    } catch (err) {
      console.error('Error updating company info:', err);
      setErrorMsg('Erreur de connexion lors de la sauvegarde.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 text-xs">Chargement des informations de l'entreprise...</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-20 w-36 bg-white rounded-xl p-3 flex items-center justify-center shadow-lg shrink-0">
            <SensusLogo logoUrl={info.logo_url} height={44} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight">{info.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Entreprise Officielle
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <MapPin size={14} className="text-sky-400 shrink-0" />
              <span>{info.address}</span>
            </p>
          </div>
        </div>

        {canEdit && !isEditing && (
          <button
            onClick={() => {
              setEditForm(info);
              setIsEditing(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all shrink-0"
          >
            <Edit2 size={15} />
            <span>Modifier les Infos</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <Check size={16} className="text-sky-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <X size={16} className="text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Card */}
      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Building className="text-sky-600" size={18} />
              <span>Modifier les Identifiants Légaux</span>
            </h3>
            <span className="text-xs text-slate-500">Mise à jour directe du registre</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Raison Sociale / Nom *</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Adresse Complète *</label>
              <input
                type="text"
                required
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">RC (Registre de Commerce) *</label>
              <input
                type="text"
                required
                value={editForm.rc}
                onChange={(e) => setEditForm({ ...editForm, rc: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ART (Article d'Imposition) *</label>
              <input
                type="text"
                required
                value={editForm.art}
                onChange={(e) => setEditForm({ ...editForm, art: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">NIF (Identifiant Fiscal) *</label>
              <input
                type="text"
                required
                value={editForm.nif}
                onChange={(e) => setEditForm({ ...editForm, nif: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">NIS (Numéro d'Ident. Statistique) *</label>
              <input
                type="text"
                required
                value={editForm.nis}
                onChange={(e) => setEditForm({ ...editForm, nis: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="md:col-span-2 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <ImageIcon size={15} className="text-sky-600" />
                <span>Logo de la Société</span>
              </label>

              {/* Preview */}
              <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="w-28 h-12 bg-white rounded border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  <SensusLogo logoUrl={editForm.logo_url} height={38} />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-[11px] text-slate-500 font-medium">Aperçu du logo sélectionné</p>
                  {editForm.logo_url ? (
                    <button
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, logo_url: '' }))}
                      className="text-[11px] text-rose-600 hover:underline font-bold"
                    >
                      Réinitialiser (Utiliser le logo vectoriel par défaut)
                    </button>
                  ) : (
                    <p className="text-[11px] text-slate-400 font-medium">Logo vectoriel Sensus par défaut</p>
                  )}
                </div>
              </div>

              {/* File upload */}
              <div>
                <span className="block text-[11px] text-slate-600 mb-1 font-semibold">
                  Option 1 : Importer une image depuis votre ordinateur
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-600 file:text-white hover:file:bg-sky-700 cursor-pointer"
                />
              </div>

              {/* URL Input */}
              <div>
                <span className="block text-[11px] text-slate-600 mb-1 font-semibold">
                  Option 2 : Entrer un lien ou URL d'image
                </span>
                <input
                  type="text"
                  placeholder="https://exemple.com/mon-logo.png"
                  value={editForm.logo_url || ''}
                  onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check size={15} />
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 font-bold">
                <FileText size={20} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">RC (Registre Commerce)</span>
                <p className="text-base font-extrabold font-mono text-slate-900 mt-0.5">{info.rc}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold">
                <Shield size={20} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">ART (Article Imposition)</span>
                <p className="text-base font-extrabold font-mono text-slate-900 mt-0.5">{info.art}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 font-bold">
                <FileText size={20} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">NIF (Identifiant Fiscal)</span>
                <p className="text-base font-extrabold font-mono text-slate-900 mt-0.5">{info.nif}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 font-bold">
                <Shield size={20} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">NIS (Identifiant Statistique)</span>
                <p className="text-base font-extrabold font-mono text-slate-900 mt-0.5">{info.nis}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-3 md:col-span-2">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 font-bold mt-0.5">
                <MapPin size={20} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Adresse du Siège Social</span>
                <p className="text-sm font-bold text-slate-800 mt-1">{info.address}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
