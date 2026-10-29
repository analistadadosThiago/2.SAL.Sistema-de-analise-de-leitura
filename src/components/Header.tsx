import React from 'react';
import { RefreshCw, Menu } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="no-print h-16 sm:h-18 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0">
      
      {/* Brand Zone with clean, high-crisp official Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          title="Abrir navegação"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center">
          <img
            src="/assets/aistudio/LOGO_SAL_4ee1b044.png"
            alt="SAL - Sistema de Análise de Leitura"
            className="h-12 sm:h-14 w-auto object-contain drop-shadow"
            style={{
              imageRendering: '-webkit-optimize-contrast',
            }}
          />
        </div>
      </div>

      {/* Action Zone: Trocar Planilha */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenSettings}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all whitespace-nowrap active:scale-95"
          title="Conectar ou trocar planilha do Google Sheets"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Trocar Planilha</span>
        </button>
      </div>

    </header>
  );
};
