import React, { useState, useEffect } from 'react';
import { Database, Copy, Download, Check, X, Code2, Server, Terminal, Play, Cpu } from 'lucide-react';

interface SqlServerScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlServerScriptModal: React.FC<SqlServerScriptModalProps> = ({ isOpen, onClose }) => {
  const [scriptContent, setScriptContent] = useState<string>('Loading SQL Server script...');
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'script'>('install');

  const directCmd = `sqlcmd -S "localhost\\SQLEXPRESS" -E -I -i schema_sqlserver.sql`;

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
    if (isOpen) {
      fetch('/api/sql-script')
        .then((res) => res.text())
        .then((text) => setScriptContent(text))
        .catch(() => setScriptContent('-- Error loading SQL script.'));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(directCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema_sqlserver.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Microsoft SQL Server Installation & Schema</h3>
              <p className="text-xs text-slate-400">
                Target: <span className="font-mono text-sky-300">localhost\SQLEXPRESS</span> (Windows Authentication)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500 transition-colors shadow-xs"
            >
              <Download size={14} />
              <span>Download .sql</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Header */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-950 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('install')}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'install'
                ? 'border-sky-500 text-sky-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play size={14} />
            <span>Direct Installation (localhost\SQLEXPRESS)</span>
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'script'
                ? 'border-sky-500 text-sky-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 size={14} />
            <span>Full T-SQL Script</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'install' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/90 text-slate-200">
            {/* Method 1: Batch file */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                  <Terminal size={15} />
                  <span>Méthode 1 : Exécution Automatique via Fichier .bat</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                  Recommandé (1-Click)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Un fichier batch <code className="text-sky-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded">install_sqlserver.bat</code> est inclus à la racine du projet.
              </p>
              <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 pl-1">
                <li>Ouvrez le dossier du projet sur votre PC.</li>
                <li>Double-cliquez sur <strong className="text-white">install_sqlserver.bat</strong> (ou exécutez-le en tant qu'administrateur).</li>
                <li>Le script se connecte à <code className="text-sky-300 font-mono">localhost\SQLEXPRESS</code> avec votre Authentification Windows et crée la base <code className="text-sky-300 font-mono">ProcurementDB</code> automatiquement.</li>
              </ol>
            </div>

            {/* Method 2: Command Line */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                  <Cpu size={15} />
                  <span>Méthode 2 : Commande Directe Terminal (PowerShell / CMD)</span>
                </span>
                <button
                  onClick={handleCopyCmd}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 border border-sky-500/30 transition-colors"
                >
                  {copiedCmd ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedCmd ? 'Copié !' : 'Copier la commande'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-300">
                Ouvrez PowerShell ou l'invite de commande dans le dossier de votre projet et collez :
              </p>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between">
                <code>{directCmd}</code>
              </div>
              <p className="text-[11px] text-slate-400">
                <strong className="text-slate-300">-S "localhost\SQLEXPRESS"</strong> : Instance SQL Server Local &nbsp;|&nbsp;
                <strong className="text-slate-300">-E</strong> : Windows Authentication (Trusted) &nbsp;|&nbsp;
                <strong className="text-slate-300">-i</strong> : Fichier T-SQL
              </p>
            </div>

            {/* Method 3: SSMS */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <Server size={15} />
                <span>Méthode 3 : SQL Server Management Studio (SSMS)</span>
              </span>
              <p className="text-xs text-slate-300">
                1. Ouvrez SSMS et connectez-vous à <code className="text-sky-300 font-mono">localhost\SQLEXPRESS</code> avec Windows Authentication.<br />
                2. Ouvrez le fichier <code className="text-sky-300 font-mono">schema_sqlserver.sql</code> et appuyez sur <strong className="text-white">F5 (Execute)</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 bg-slate-950/90 font-mono text-xs text-sky-300 leading-relaxed border-b border-slate-800 select-all">
            <div className="flex justify-end mb-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copié !' : 'Copier le script T-SQL'}</span>
              </button>
            </div>
            <pre className="whitespace-pre-wrap">{scriptContent}</pre>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 text-slate-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server size={14} className="text-sky-400" />
            <span>Target: Microsoft SQL Server 2016 / 2019 / 2022 / Express Edition</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-slate-200 text-xs font-semibold rounded-md hover:bg-slate-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

