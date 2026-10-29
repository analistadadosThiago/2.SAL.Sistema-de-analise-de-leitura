import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SetupModal } from './components/SetupModal';
import { DashboardView } from './components/views/DashboardView';
import { ConsultaView } from './components/views/ConsultaView';
import { ControleLeituristaView } from './components/views/ControleLeituristaView';
import { ControleEvidenciasView } from './components/views/ControleEvidenciasView';
import { NosbImpedimentoView } from './components/views/NosbImpedimentoView';
import { ControleHorarioView } from './components/views/ControleHorarioView';
import { SequenciaLeituraView } from './components/views/SequenciaLeituraView';
import { ReadingRecord, ViewMenu } from './types/reading';
import { Database, FileSpreadsheet, Sparkles } from 'lucide-react';
import { generateSampleReadings } from './utils/sampleData';

const LOCAL_STORAGE_SHEET_KEY = 'sal_last_sheet_url';

export default function App() {
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [sheetInfo, setSheetInfo] = useState<{ url: string; rows: number; mappedCount: number } | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [currentMenu, setCurrentMenu] = useState<ViewMenu>('inicio');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auto-load last saved URL or check localStorage
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

  const handleLoadDemoDirectly = () => {
    const demoData = generateSampleReadings();
    handleDataLoaded(demoData, {
      url: 'Base de Demonstração (Demonstração Operacional)',
      rows: demoData.length,
      mappedCount: 22,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Google Sheets Connection Modal / Initial Configuration Screen */}
      <SetupModal
        isOpen={isSetupOpen}
        onSuccess={handleDataLoaded}
        onClose={records.length > 0 ? () => setIsSetupOpen(false) : undefined}
        currentUrl={savedUrl}
        isInitial={records.length === 0}
      />

      {/* Main App Layout (Visible after initial data load or if closed) */}
      {records.length > 0 ? (
        <div className="flex-1 flex flex-col min-h-screen">
          
          {/* Top Bar Header */}
          <Header
            totalRecords={records.length}
            sheetUrl={sheetInfo?.url}
            onOpenSettings={() => setIsSetupOpen(true)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />

          <div className="flex-1 flex overflow-hidden">
            
            {/* Lateral Navigation Sidebar */}
            <Sidebar
              currentMenu={currentMenu}
              onSelectMenu={(menu) => setCurrentMenu(menu)}
              isOpenMobile={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              totalRecords={records.length}
            />

            {/* Viewport Content Area */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950 print-area">
              <div className="max-w-7xl mx-auto">
                {currentMenu === 'inicio' && <DashboardView records={records} />}
                {currentMenu === 'consulta' && <ConsultaView records={records} />}
                {currentMenu === 'leiturista' && <ControleLeituristaView records={records} />}
                {currentMenu === 'evidencias' && <ControleEvidenciasView records={records} />}
                {currentMenu === 'nosb' && <NosbImpedimentoView records={records} />}
                {currentMenu === 'horario' && <ControleHorarioView records={records} />}
                {currentMenu === 'sequencia' && <SequenciaLeituraView records={records} />}
              </div>
            </main>

          </div>

        </div>
      ) : (
        /* Clean initial splash state background while user enters sheet */
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-4 shadow-xl">
            <Database className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            SAL – Sistema de Análise de Leitura
          </h1>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Aguardando conexão com a planilha pública do Google Sheets para inicialização dos módulos operacionais.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSetupOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Conectar Google Sheets</span>
            </button>
            <button
              onClick={handleLoadDemoDirectly}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 flex items-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Base Demonstrativa</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
