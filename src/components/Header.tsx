import React from 'react';
import { RefreshCw, Menu } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onToggleMobileSidebar: () => void;
  onNavigateHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onToggleMobileSidebar,
  onNavigateHome,
}) => {
  return (
    <header className="no-print h-20 sm:h-22 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0">
      
      {/* Brand Zone: Enlarged, Crisp, and Clickable Official Logo to return to Dashboard */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          title="Abrir navegação"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center p-1 rounded-xl hover:bg-slate-800/40 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          title="Ir para o Dashboard (Início)"
        >
          <img
            src="/assets/aistudio/LOGO_SAL_4ee1b044.png"
            alt="SAL - Sistema de Análise de Leitura"
            className="h-14 sm:h-16 md:h-18 max-h-18 w-auto object-contain drop-shadow transition-transform duration-200 group-hover:scale-[1.02] group-active:scale-95"
            style={{
              imageRendering: '-webkit-optimize-contrast',
            }}
          />
        </button>
      </div>

      {/* Action Zone: Trocar Planilha */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenSettings}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all whitespace-nowrap active:scale-95 cursor-pointer"
          title="Conectar ou trocar planilha do Google Sheets"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Trocar Planilha</span>
        </button>
      </div>

    </header>
  );
};
