import React, { useState, useEffect } from 'react';
import { Database, Table, RefreshCw, Search, Server, ShieldCheck, HardDrive, Layers, ArrowRight } from 'lucide-react';
import { User } from '../types';

interface DatabaseExplorerProps {
  currentUser: User;
  initialTable?: string;
}

interface TableInfo {
  table_name: string;
  schema_name: string;
  row_count: number;
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: string;
}

export const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({
  currentUser,
  initialTable = 'Capex_Investment',
}) => {
  const [engineInfo, setEngineInfo] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>(initialTable);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [fullTableName, setFullTableName] = useState<string>('dbo.Capex_Investment');

  const fetchTablesList = async () => {
    try {
      const res = await fetch('/api/db-explorer/tables');
      if (res.ok) {
        const data = await res.json();
        setEngineInfo(data.engine || '');
        setIsConnected(data.isConnected || false);
        setTables(data.tables || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTableData = async (tableName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/db-explorer/data?table=${tableName}`);
      if (res.ok) {
        const data = await res.json();
        setColumns(data.columns || []);
        setRows(data.rows || []);
        setFullTableName(data.full_table_name || `dbo.${tableName}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTablesList();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  const filteredRows = rows.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(r).some((val) =>
      val !== null && val !== undefined && String(val).toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6 w-full mx-auto">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
            <Database size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white">Explorateur Base de Données (Database Viewer)</h2>
              <span className={`px-2.5 py-0.5 text-xs font-black rounded-full border ${
                isConnected
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {isConnected ? '🟢 SQL Server Direct' : '🟡 JSON Store Active'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Moteur : <span className="font-mono text-sky-300 font-bold">{engineInfo}</span> | Inspection en direct des tables et colonnes
            </p>
          </div>
        </div>

        <button
          onClick={() => { fetchTablesList(); fetchTableData(selectedTable); }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-xs"
        >
          <RefreshCw size={15} />
          <span>Actualiser Base</span>
        </button>
      </div>

      {/* TABLES SELECTOR BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
        {tables.map((t) => {
          const isSelected = selectedTable === t.table_name;
          return (
            <button
              key={t.table_name}
              onClick={() => setSelectedTable(t.table_name)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-500/30 shadow-md scale-[1.02]'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono opacity-70 uppercase">{t.schema_name}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {t.row_count} lignes
                </span>
              </div>
              <div className="font-extrabold text-xs mt-1 truncate" title={t.table_name}>
                {t.table_name}
              </div>
            </button>
          );
        })}
      </div>

      {/* TABLE DATA & SCHEMA SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Sub-Header */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <Table className="text-sky-600" size={18} />
              <h3 className="font-black text-sm text-slate-900">
                Table : <span className="font-mono text-sky-700">{fullTableName}</span>
              </h3>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                {filteredRows.length} enregistrements
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {columns.length} colonnes déclarées dans le schéma
            </p>
          </div>

          {/* Search Filter */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer les lignes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            />
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Chargement de la table SQL...</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">Aucune ligne trouvée dans cette table</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead className="bg-slate-900 text-white font-bold text-[11px]">
                <tr>
                  {columns.map((col) => (
                    <th key={col.name} className="px-3.5 py-3 border-r border-slate-800 whitespace-nowrap">
                      <div>{col.name}</div>
                      <span className="text-[9px] font-normal text-sky-300 lowercase font-sans block">{col.type}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px]">
                {filteredRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-sky-50/50 transition-colors">
                    {columns.map((col) => {
                      const val = row[col.name];
                      const formattedVal = val === null || val === undefined ? (
                        <span className="text-slate-400 italic font-sans text-[10px]">NULL</span>
                      ) : typeof val === 'boolean' ? (
                        val ? 'TRUE' : 'FALSE'
                      ) : (
                        String(val)
                      );

                      return (
                        <td key={col.name} className="px-3.5 py-2.5 max-w-xs truncate border-r border-slate-100 font-semibold" title={String(val)}>
                          {formattedVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
