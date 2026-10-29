import React from 'react';
import { Database, RefreshCw, Printer, ShieldCheck, Menu } from 'lucide-react';
import { printReport } from '../utils/exportUtils';

interface HeaderProps {
  totalRecords: number;
  sheetUrl?: string;
  onOpenSettings: () => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalRecords,
  sheetUrl,
  onOpenSettings,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="no-print h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      
      {/* Zone 1: Brand Zone (Single-line wordmark with mobile trigger) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          title="Abrir navegação"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-cyan-600 flex items-center justify-center font-bold text-slate-950 text-sm tracking-wider shadow-sm">
            SAL
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            Sistema de Análise de Leitura
          </span>
        </div>
      </div>

      {/* Zone 2: Sheet and Data telemetry */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-slate-500">Base Ativa:</span>
          <span className="text-cyan-400 font-semibold tabular-nums">{totalRecords} registros</span>
        </div>
        <span className="text-slate-700" aria-hidden="true">|</span>
        <div className="flex items-center gap-1 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Google Sheets Conectado</span>
        </div>
      </div>

      {/* Zone 3: Primary Action Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => printReport()}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors whitespace-nowrap"
          title="Imprimir relatório / Salvar como PDF"
        >
          <Printer className="w-3.5 h-3.5 text-slate-300" />
          <span>Imprimir / PDF</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium shadow-sm transition-colors whitespace-nowrap"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Trocar Planilha</span>
        </button>
      </div>

    </header>
  );
};
