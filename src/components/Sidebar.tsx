import React from 'react';
import {
  LayoutDashboard,
  Search,
  Users,
  Camera,
  AlertTriangle,
  Clock,
  Route,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { ViewMenu } from '../types/reading';

interface SidebarProps {
  currentMenu: ViewMenu;
  onSelectMenu: (menu: ViewMenu) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  totalRecords: number;
}

interface MenuItem {
  id: ViewMenu;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'inicio', label: '1. Início (Dashboard)', icon: LayoutDashboard },
  { id: 'consulta', label: '2. Consulta Instalação/Medidor', icon: Search },
  { id: 'leiturista', label: '3. Controle de Leiturista', icon: Users },
  { id: 'evidencias', label: '4. Controle de Evidências', icon: Camera },
  { id: 'nosb', label: "5. N'OSB - Impedimento", icon: AlertTriangle },
  { id: 'horario', label: '6. Controle de Horário', icon: Clock },
  { id: 'sequencia', label: '7. Sequência de Leitura', icon: Route },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentMenu,
  onSelectMenu,
  isOpenMobile,
  onCloseMobile,
  totalRecords,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`no-print fixed md:static inset-y-0 left-0 z-40 w-64 lg:w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header in Sidebar */}
          <div className="flex md:hidden items-center justify-between px-4 py-4 border-b border-slate-800">
            <span className="font-bold text-sm text-white">Módulos do Sistema</span>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Navegação Operacional
            </div>

            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentMenu === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectMenu(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-800/60 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Sidebar Info Card */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 m-2 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="text-[11px] block text-slate-500">Registros em Memória</span>
                <span className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
                  {totalRecords} leituras
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
