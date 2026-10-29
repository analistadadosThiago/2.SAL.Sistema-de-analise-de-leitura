import React, { useState } from 'react';
import {
  LayoutDashboard,
  Search,
  Users,
  Camera,
  AlertTriangle,
  Clock,
  Route,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ClipboardCheck,
  SlidersHorizontal,
  FileText,
  Printer,
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

interface MenuCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMenu,
  onSelectMenu,
  isOpenMobile,
  onCloseMobile,
  totalRecords,
  isCollapsed,
  onToggleCollapse,
}) => {
  // Category expanded state (default all expanded)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    controles: true,
    relatorios: true,
    impressoes: true,
  });

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const topMenuItems: MenuItem[] = [
    { id: 'inicio', label: '1. Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'consulta', label: '2. Consulta de instalação/medidor', shortLabel: 'Consulta', icon: Search },
  ];

  const categories: MenuCategory[] = [
    {
      id: 'controles',
      title: 'CONTROLES',
      icon: SlidersHorizontal,
      items: [
        { id: 'leiturista', label: '3.1. Controle de Leiturista', shortLabel: 'Leiturista', icon: Users },
        { id: 'evidencias', label: '3.2. Controle de Evidência', shortLabel: 'Evidência', icon: Camera },
        { id: 'consistencia', label: '3.3. Controle de Consistência', shortLabel: 'Consistência', icon: ClipboardCheck },
      ],
    },
    {
      id: 'relatorios',
      title: 'RELATÓRIOS',
      icon: FileText,
      items: [
        { id: 'horario', label: '4.1. Controle de Horário', shortLabel: 'Horário', icon: Clock },
        { id: 'sequencia', label: '4.2. Sequência de Leitura', shortLabel: 'Sequência', icon: Route },
      ],
    },
    {
      id: 'impressoes',
      title: 'IMPRESSÕES',
      icon: Printer,
      items: [
        { id: 'nosb', label: "5.1. 5. N'OSB – Impedimento", shortLabel: "N'OSB Imp.", icon: AlertTriangle },
        { id: 'nosb_simulacao', label: "5.2. 5.1. N’OSB SIMULAÇÃO", shortLabel: "N'OSB Sim.", icon: Sparkles },
      ],
    },
  ];

  const renderMenuItem = (item: MenuItem, isSubItem: boolean = false) => {
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
          isCollapsed
            ? 'justify-center py-2.5 px-0'
            : isSubItem
            ? 'justify-between px-3 py-2 pl-7'
            : 'justify-between px-3 py-2.5'
        } ${
          isActive
            ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-800/70 font-semibold shadow-sm'
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

        {/* Floating Tooltip in collapsed mode */}
        {isCollapsed && (
          <div className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-white whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {item.label}
          </div>
        )}
      </button>
    );
  };

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
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Sidebar Top: Logo & Toggle */}
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-800/80 shrink-0">
            {!isCollapsed ? (
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/aistudio/LOGO_SAL_4ee1b044.png"
                  alt="SAL"
                  className="h-8 w-auto object-contain"
                  style={{ imageRendering: '-webkit-optimize-contrast' }}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Selecione menus
                </span>
              </div>
            ) : (
              <div className="mx-auto flex flex-col items-center">
                <img
                  src="/assets/aistudio/LOGO_SAL_4ee1b044.png"
                  alt="SAL"
                  className="h-7 w-auto object-contain"
                  style={{ imageRendering: '-webkit-optimize-contrast' }}
                />
              </div>
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

          {/* Navigation Items (Categorized & Scrollable) */}
          <div className="flex-1 py-3 px-2 space-y-3 overflow-y-auto">
            
            {/* Top Principal Menus: 1. Dashboard & 2. Consulta */}
            <div className="space-y-1">
              {topMenuItems.map((item) => renderMenuItem(item, false))}
            </div>

            {/* Categories */}
            {categories.map((cat) => {
              const CatIcon = cat.icon;
              const isExpanded = expandedCategories[cat.id] ?? true;
              const hasActiveChild = cat.items.some((it) => it.id === currentMenu);

              return (
                <div key={cat.id} className="pt-1.5 border-t border-slate-800/60 first:border-t-0 first:pt-0">
                  
                  {/* Category Header */}
                  {!isCollapsed ? (
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <CatIcon className={`w-3.5 h-3.5 ${hasActiveChild ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span>CATEGORIA: {cat.title}</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                          isExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="my-1.5 border-t border-slate-800 text-center">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter block py-0.5">
                        {cat.title.slice(0, 4)}
                      </span>
                    </div>
                  )}

                  {/* Submenu Items */}
                  {(isExpanded || isCollapsed) && (
                    <div className="mt-0.5 space-y-1">
                      {cat.items.map((subItem) => renderMenuItem(subItem, true))}
                    </div>
                  )}
                </div>
              );
            })}

          </div>

          {/* Sidebar Footer Stats */}
          {!isCollapsed && totalRecords > 0 && (
            <div className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0">
              <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Base Conectada</span>
                <span className="font-semibold text-cyan-400">
                  {totalRecords.toLocaleString('pt-BR')} reg.
                </span>
              </div>
            </div>
          )}

        </div>
      </aside>
    </>
  );
};
