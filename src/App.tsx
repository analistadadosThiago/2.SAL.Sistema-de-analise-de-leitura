import React, { useState } from 'react';
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

export default function App() {
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [sheetInfo, setSheetInfo] = useState<{ url: string; rows: number; mappedCount: number } | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [currentMenu, setCurrentMenu] = useState<ViewMenu>('inicio');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const savedUrl = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_SHEET_KEY) || '' : '';

  const handleDataLoaded = (
    newRecords: ReadingRecord[],
    info: { url: string; rows: number; mappedCount: number }
  ) => {
    setRecords(newRecords);
    setSheetInfo(info);
    setIsSetupOpen(false);
    if (info.url && !info.url.includes('demo-sal')) {
      localStorage.setItem(LOCAL_STORAGE_SHEET_KEY, info.url);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Google Sheets Connection Modal */}
      <SetupModal
        isOpen={isSetupOpen}
        onSuccess={handleDataLoaded}
        onClose={records.length > 0 ? () => setIsSetupOpen(false) : undefined}
        currentUrl={savedUrl}
        isInitial={records.length === 0}
      />

      {/* Main App Layout (Visible after data load or if closed) */}
      {records.length > 0 ? (
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          
          {/* Topbar Header (Fixed Top) */}
          <Header
            onOpenSettings={() => setIsSetupOpen(true)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />

          <div className="flex-1 flex overflow-hidden min-h-0">
            
            {/* Lateral Navigation Sidebar with Collapsible capability */}
            <Sidebar
              currentMenu={currentMenu}
              onSelectMenu={(menu) => setCurrentMenu(menu)}
              isOpenMobile={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              totalRecords={records.length}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Viewport Content Area */}
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
              className="h-20 w-auto object-contain mb-5 drop-shadow-xl"
            />
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              SAL – Sistema de Análise de Leitura
            </h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Sistema profissional para análise, auditoria de evidências e controle operacional de rotas de leitura.
            </p>
            <button
              onClick={() => setIsSetupOpen(true)}
              className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition-all active:scale-95"
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
