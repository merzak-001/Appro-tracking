import React, { useState, useEffect } from 'react';
import { Building2, X, AlertCircle, Globe, MapPin } from 'lucide-react';
import { Supplier } from '../types';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newSupplier?: Supplier) => void;
  editingSupplier?: Supplier | null;
  initialType?: 'Local' | 'Étranger';
  existingSuppliers?: Supplier[];
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingSupplier = null,
  initialType = 'Local',
  existingSuppliers = [],
}) => {
  const [supplierType, setSupplierType] = useState<'Local' | 'Étranger'>('Local');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('Algeria');
  const [rc, setRc] = useState('');
  const [nif, setNif] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (editingSupplier) {
      const c = (editingSupplier.country || '').toLowerCase().trim();
      const isLocal = c === 'algeria' || c === 'algérie' || c === 'algerie' || c === 'dz' || !c;
      const type = isLocal ? 'Local' : 'Étranger';
      setSupplierType(type);
      setName(editingSupplier.name);
      setAddress(editingSupplier.address || '');
      setCountry(isLocal ? 'Algeria' : editingSupplier.country);
      setRc(editingSupplier.rc || '');
      setNif(editingSupplier.nif || '');
    } else {
      setSupplierType(initialType);
      setName('');
      setAddress('');
      setCountry(initialType === 'Local' ? 'Algeria' : 'France');
      setRc('');
      setNif('');
    }
    setErrorMsg(null);
  }, [editingSupplier, isOpen, initialType]);

  const duplicateWarning = React.useMemo(() => {
    if (!existingSuppliers || existingSuppliers.length === 0) return null;
    const cleanName = name.trim().toLowerCase();
    const cleanRc = rc.trim();
    const cleanNif = nif.trim().replace(/\s+/g, '');

    const found = existingSuppliers.find((s) => {
      if (editingSupplier && s.id === editingSupplier.id) return false;
      const sameName = cleanName && s.name.trim().toLowerCase() === cleanName;
      const sameRc = cleanRc && s.rc && s.rc.trim() === cleanRc;
      const sameNif = cleanNif && s.nif && s.nif.trim().replace(/\s+/g, '') === cleanNif;
      return sameName || sameRc || sameNif;
    });

    if (found) {
      return `Attention : Un fournisseur similaire existe déjà en base ("${found.name}"${found.nif ? `, NIF: ${found.nif}` : ''}).`;
    }
    return null;
  }, [name, rc, nif, existingSuppliers, editingSupplier]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Le nom du fournisseur est obligatoire.');
      return false;
    }

    if (supplierType === 'Étranger') {
      const c = country.trim().toLowerCase();
      if (!c) {
        setErrorMsg('Veuillez préciser le pays d\'origine du fournisseur étranger.');
        return false;
      }
      if (c === 'algeria' || c === 'algérie' || c === 'algerie' || c === 'dz') {
        setErrorMsg('Pour un fournisseur Algérien, veuillez sélectionner "Fournisseur Local".');
        return false;
      }
    }

    // Validate RC if Local and provided
    if (supplierType === 'Local' && rc.trim()) {
      const cleanRc = rc.trim();
      const rcRegex = /^\d{2}[ABab]\d{7}$/;
      if (!rcRegex.test(cleanRc)) {
        setErrorMsg('Format du RC invalide. Format requis : 2 chiffres + A ou B + 7 chiffres (ex: 05B0086023).');
        return false;
      }
    }

    // Validate NIF if Local and provided
    if (supplierType === 'Local' && nif.trim()) {
      const cleanNif = nif.trim().replace(/\s+/g, '');
      const nifRegex = /^(\d{15}|\d{20})$/;
      if (!nifRegex.test(cleanNif)) {
        setErrorMsg('Format du NIF invalide. Doit comporter exactement 15 ou 20 chiffres.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formattedRc = supplierType === 'Local' ? rc.trim().toUpperCase() : '';
    const formattedNif = supplierType === 'Local' ? nif.trim().replace(/\s+/g, '') : '';
    const finalCountry = supplierType === 'Local' ? 'Algeria' : country.trim();

    const payload = {
      name: name.trim(),
      address: address.trim(),
      country: finalCountry,
      rc: formattedRc,
      nif: formattedNif,
    };

    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedSupplier = await res.json();
        onSuccess(savedSupplier);
        onClose();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Erreur lors de l\'enregistrement du fournisseur.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erreur serveur lors de l\'enregistrement.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="text-sky-400" size={20} />
            <h3 className="font-bold text-base">
              {editingSupplier ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{duplicateWarning}</span>
            </div>
          )}

          {/* Supplier Type Selector */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Type de Fournisseur *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSupplierType('Local');
                  setCountry('Algeria');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  supplierType === 'Local'
                    ? 'bg-sky-50 text-sky-900 border-sky-600 ring-2 ring-sky-500/20 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <MapPin size={16} className={supplierType === 'Local' ? 'text-sky-600' : 'text-slate-400'} />
                <span>📍 Local (Algérie)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSupplierType('Étranger');
                  if (country === 'Algeria' || country === 'Algérie') setCountry('France');
                  setRc('');
                  setNif('');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  supplierType === 'Étranger'
                    ? 'bg-amber-50 text-amber-900 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Globe size={16} className={supplierType === 'Étranger' ? 'text-amber-600' : 'text-slate-400'} />
                <span>🌍 Étranger (International)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Nom de l'entreprise *</label>
            <input
              type="text"
              required
              placeholder={supplierType === 'Local' ? "ex: SARL Maghreb Outillage" : "ex: Siemens AG, Schneider Electric..."}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-sky-500 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Adresse</label>
            <input
              type="text"
              placeholder={supplierType === 'Local' ? "ex: Zone Industrielle Rouiba, Alger" : "ex: Frankfurt, Germany / Lyon, France"}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
            />
          </div>

          {/* Pays field logic: Fixed for Local, Editable & Mandatory for Étranger */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {supplierType === 'Local' ? 'Pays' : 'Pays d\'Origine *'}
            </label>
            {supplierType === 'Local' ? (
              <div className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-100 font-bold text-slate-700 flex items-center justify-between">
                <span>🇩🇿 Algérie (Automatique)</span>
                <span className="text-[10px] font-semibold text-slate-500">Fixe</span>
              </div>
            ) : (
              <input
                type="text"
                required
                placeholder="ex: Allemagne, France, Italie, Chine, Espagne, Turquie..."
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white font-medium text-slate-900"
              />
            )}
          </div>

          {/* RC and NIF logic: Shown ONLY for Local suppliers */}
          {supplierType === 'Local' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  RC (Registre de Commerce)
                </label>
                <input
                  type="text"
                  placeholder="ex: 05B0086023"
                  value={rc}
                  onChange={(e) => setRc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono uppercase bg-white"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  2 chiffres + A/B + 7 chiffres
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  NIF (Ident. Fiscale)
                </label>
                <input
                  type="text"
                  placeholder="ex: 002116098234567"
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono bg-white"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Exactement 15 ou 20 chiffres
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/70 border border-amber-200 text-amber-900 rounded-xl text-[11px]">
              ℹ️ Les fournisseurs internationaux n'ont pas de numéro RC ou NIF Algérien.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-xs transition-colors"
            >
              Enregistrer Fournisseur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
