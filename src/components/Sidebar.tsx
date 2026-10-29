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
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ViewMenu } from '../types/reading';

interface SidebarProps {
  currentMenu: ViewMenu;
  onSelectMenu: (menu: ViewMenu) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  totalRecords: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface MenuItem {
  id: ViewMenu;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'inicio', label: '1. Dashboard', shortLabel: 'Dash', icon: LayoutDashboard },
  { id: 'consulta', label: '2. Consulta de instalação/medidor', shortLabel: 'Consulta', icon: Search },
  { id: 'leiturista', label: '3. Controle de Leiturista', shortLabel: 'Leiturista', icon: Users },
  { id: 'evidencias', label: '4. Controle de Evidências', shortLabel: 'Evidências', icon: Camera },
  { id: 'nosb', label: "5. N'OSB - Impedimento", shortLabel: "N'OSB Imp.", icon: AlertTriangle },
  { id: 'nosb_simulacao', label: "5.1. N’OSB SIMULAÇÃO", shortLabel: "N'OSB Sim.", icon: Sparkles },
  { id: 'horario', label: '6. Controle de Horário', shortLabel: 'Horário', icon: Clock },
  { id: 'sequencia', label: '7. Sequência de Leitura', shortLabel: 'Sequência', icon: Route },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentMenu,
  onSelectMenu,
  isOpenMobile,
  onCloseMobile,
  totalRecords,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`no-print fixed md:static inset-y-0 left-0 z-40 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64 lg:w-72'
        } ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          
          {/* Sidebar Header & Collapse Toggle */}
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-800/80">
            {!isCollapsed ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Selecione menus
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mx-auto">
                Menus
              </span>
            )}

            {/* Desktop Collapse / Expand Button */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4 text-cyan-400" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 py-3 px-2 space-y-1.5 overflow-y-auto">
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
                  title={item.label}
                  className={`w-full flex items-center rounded-lg text-xs font-medium transition-all group relative ${
                    isCollapsed ? 'justify-center py-2.5 px-0' : 'justify-between px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-800/60 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : 'truncate'}`}>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  
                  {!isCollapsed && isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  )}

                  {/* Tooltip on collapsed hover */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-950 text-slate-200 text-xs rounded-md shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Sidebar Info Card */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-950/40 m-2 rounded-lg">
            <div className={`flex items-center gap-2 text-xs text-slate-400 ${isCollapsed ? 'justify-center' : ''}`}>
              <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
              {!isCollapsed && (
                <div className="truncate">
                  <span className="text-[10px] block text-slate-500 uppercase tracking-wider">Base Ativa</span>
                  <span className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
                    {totalRecords} leituras
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
