import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
    (this as any).setState({ errorInfo });
  }

  public handleReset = () => {
    try {
      localStorage.removeItem('procurement_active_tab');
    } catch (e) {}
    window.location.reload();
  };

  public handleFullReset = () => {
    try {
      localStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-4">
              <AlertTriangle size={28} className="shrink-0" />
              <div>
                <h2 className="text-lg font-bold">Une erreur inattendue est survenue</h2>
                <p className="text-xs text-slate-400">Le composant React a rencontré une exception.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-rose-300 overflow-x-auto max-h-48">
              <p className="font-bold">{this.state.error?.toString()}</p>
              {this.state.errorInfo && (
                <pre className="mt-2 text-[10px] text-slate-400 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <RefreshCw size={14} />
                <span>Actualiser la Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleFullReset}
                className="px-4 py-2.5 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer border border-slate-700"
              >
                <span>Réinitialiser les Données Locales (Cache)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
