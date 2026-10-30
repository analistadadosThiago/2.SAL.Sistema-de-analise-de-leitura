import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { SetupModal } from './components/SetupModal';
import { DashboardView } from './components/views/DashboardView';
import { ConsultaView } from './components/views/ConsultaView';
import { ControleLeituristaView } from './components/views/ControleLeituristaView';
import { ControleEvidenciasView } from './components/views/ControleEvidenciasView';
import { NosbImpedimentoView } from './components/views/NosbImpedimentoView';
import { ControleHorarioView } from './components/views/ControleHorarioView';
import { SequenciaLeituraView } from './components/views/SequenciaLeituraView';
import { ReadingRecord, ViewMenu } from './types/reading';
import { FileSpreadsheet } from 'lucide-react';

const LOCAL_STORAGE_SHEET_KEY = 'sal_last_sheet_url';
const SESSION_RECORDS_KEY = 'sal_session_records';
const SESSION_SHEET_INFO_KEY = 'sal_session_sheet_info';
const SESSION_MENU_KEY = 'sal_session_menu';

export default function App() {
  // Initialize records from sessionStorage if available to guarantee stability
  const [records, setRecords] = useState<ReadingRecord[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(SESSION_RECORDS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao restaurar registros da sessão:', e);
    }
    return [];
  });

  const [sheetInfo, setSheetInfo] = useState<{ url: string; rows: number; mappedCount: number } | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(SESSION_SHEET_INFO_KEY);
        if (cached) return JSON.parse(cached);
      }
    } catch (e) {}
    return null;
  });

  // Current active menu initialized from sessionStorage so user stays exactly where they are
  const [currentMenu, setCurrentMenu] = useState<ViewMenu>(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedMenu = sessionStorage.getItem(SESSION_MENU_KEY) as ViewMenu;
        if (savedMenu) return savedMenu;
      }
    } catch (e) {}
    return 'inicio';
  });

  // Only open setup if there are no records loaded
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(SESSION_RECORDS_KEY);
        if (cached && JSON.parse(cached)?.length > 0) {
          return false;
        }
      }
    } catch (e) {}
    return true;
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const savedUrl = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_SHEET_KEY) || '' : '';

  // Synchronize menu changes into session storage
  const handleSelectMenu = (menu: ViewMenu) => {
    setCurrentMenu(menu);
    try {
      sessionStorage.setItem(SESSION_MENU_KEY, menu);
    } catch (e) {}
  };

  const handleDataLoaded = (
    newRecords: ReadingRecord[],
    info: { url: string; rows: number; mappedCount: number }
  ) => {
    setRecords(newRecords);
    setSheetInfo(info);
    setIsSetupOpen(false);

    try {
      sessionStorage.setItem(SESSION_RECORDS_KEY, JSON.stringify(newRecords));
      sessionStorage.setItem(SESSION_SHEET_INFO_KEY, JSON.stringify(info));
    } catch (e) {
      console.warn('SessionStorage quota exceeded, keeping state in memory:', e);
    }

    if (info.url && !info.url.includes('demo-sal')) {
      localStorage.setItem(LOCAL_STORAGE_SHEET_KEY, info.url);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Google Sheets Connection Modal: Only opens if explicitly triggered or if no data */}
      <SetupModal
        isOpen={isSetupOpen}
        onSuccess={handleDataLoaded}
        onClose={records.length > 0 ? () => setIsSetupOpen(false) : undefined}
        currentUrl={sheetInfo?.url || savedUrl}
        isInitial={records.length === 0}
      />

      {/* Main App Layout (Visible after data load) */}
      {records.length > 0 ? (
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          
          {/* Topbar Header (Fixed Top) */}
          <Header
            onOpenSettings={() => setIsSetupOpen(true)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            onNavigateHome={() => handleSelectMenu('inicio')}
          />

          <div className="flex-1 flex overflow-hidden min-h-0">
            
            {/* Lateral Navigation Sidebar with Collapsible capability */}
            <Sidebar
              currentMenu={currentMenu}
              onSelectMenu={handleSelectMenu}
              isOpenMobile={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              totalRecords={records.length}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Viewport Content Area: Never unmounts or resets unexpectedly */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950 print-area flex flex-col justify-between">
              <div className="max-w-7xl mx-auto w-full flex-1">
                {currentMenu === 'inicio' && <DashboardView records={records} />}
                {currentMenu === 'consulta' && <ConsultaView records={records} />}
                {currentMenu === 'leiturista' && <ControleLeituristaView records={records} />}
                {currentMenu === 'evidencias' && <ControleEvidenciasView records={records} />}
                {currentMenu === 'consistencia' && <NosbImpedimentoView records={records} mode="consistencia" />}
                {currentMenu === 'nosb' && <NosbImpedimentoView records={records} mode="impedimento" />}
                {currentMenu === 'nosb_simulacao' && <NosbImpedimentoView records={records} mode="simulacao" />}
                {currentMenu === 'horario' && <ControleHorarioView records={records} />}
                {currentMenu === 'sequencia' && <SequenciaLeituraView records={records} />}
              </div>
            </main>

          </div>

          {/* Universal Footer fixed in all views */}
          <Footer />

        </div>
      ) : (
        /* Clean initial splash state background while user enters sheet */
        <div className="min-h-screen flex flex-col justify-between p-6">
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <img
              src="/assets/aistudio/LOGO_SAL_4ee1b044.png"
              alt="SAL Logo"
              className="h-24 w-auto object-contain mb-5 drop-shadow-xl"
              style={{ imageRendering: '-webkit-optimize-contrast' }}
            />
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              SAL – Sistema de Análise de Leitura
            </h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Sistema profissional para análise, auditoria de evidências e controle operacional de rotas de leitura.
            </p>
            <button
              type="button"
              onClick={() => setIsSetupOpen(true)}
              className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition-all active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Conectar Base do Google Sheets</span>
            </button>
          </div>

          {/* Guaranteed Footer in splash */}
          <Footer />
        </div>
      )}

    </div>
  );
}
