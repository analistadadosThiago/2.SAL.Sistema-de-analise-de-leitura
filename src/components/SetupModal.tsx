import React, { useState } from 'react';
import { Database, Link2, CheckCircle2, AlertCircle, FileSpreadsheet, ArrowRight, ShieldCheck, Sparkles, HelpCircle } from 'lucide-react';
import { fetchGoogleSheetData, SheetParseResult } from '../utils/googleSheets';
import { generateSampleReadings } from '../utils/sampleData';
import { ReadingRecord } from '../types/reading';

interface SetupModalProps {
  isOpen: boolean;
  onSuccess: (data: ReadingRecord[], sheetInfo: { url: string; rows: number; mappedCount: number }) => void;
  onClose?: () => void;
  currentUrl?: string;
  isInitial?: boolean;
}

const REQUIRED_COLUMNS = [
  { key: 'mes', label: 'Mes' },
  { key: 'ano', label: 'Ano' },
  { key: 'instalacao', label: 'instalacao' },
  { key: 'medidor', label: 'medidor' },
  { key: 'reg', label: 'reg' },
  { key: 'rz', label: 'rz' },
  { key: 'rz_ul_lv', label: 'rz_ul_lv' },
  { key: 'ul', label: 'ul' },
  { key: 'foto', label: 'foto' },
  { key: 'tipo', label: 'tipo' },
  { key: 'matr', label: 'matr' },
  { key: 'nl', label: 'nl' },
  { key: 'data_original', label: 'data_original' },
  { key: 'hora_original', label: 'hora_original' },
  { key: 'endereco', label: 'endereco' },
  { key: 'l_atual', label: 'l_atual' },
  { key: 'consumo', label: 'consumo' },
  { key: 'nosb_impedimento', label: 'nosb_impedimento' },
  { key: 'nosb_simulacao', label: 'nosb_simulacao' },
  { key: 'digitacao', label: 'digitacao' },
  { key: 'cna', label: 'cna' },
  { key: 'consistencia', label: 'consistencia' },
];

export const SetupModal: React.FC<SetupModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  currentUrl = '',
  isInitial = false,
}) => {
  const [sheetUrl, setSheetUrl] = useState(currentUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  if (!isOpen) return null;

  const handleLoadSheet = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sheetUrl.trim()) {
      setErrorMessage('Por favor, informe o link completo da planilha do Google Sheets.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result: SheetParseResult = await fetchGoogleSheetData(sheetUrl.trim());
      onSuccess(result.records, {
        url: sheetUrl.trim(),
        rows: result.totalRows,
        mappedCount: Object.keys(result.mappedColumns).length,
      });
    } catch (err: any) {
      console.error('Falha ao carregar Google Sheets:', err);
      setErrorMessage(err.message || 'Falha ao processar os dados da planilha. Verifique as permissões de compartilhamento.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemo = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setTimeout(() => {
      const demoData = generateSampleReadings();
      onSuccess(demoData, {
        url: 'https://docs.google.com/spreadsheets/d/demo-sal-operacional-base/edit',
        rows: demoData.length,
        mappedCount: 22,
      });
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 sm:p-8 my-8 text-slate-100">
        
        {/* Header Title */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                SAL <span className="text-slate-400 text-sm font-normal">| Conexão de Dados</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Vincule sua planilha pública do Google Sheets ou inicie com a base de demonstração.
              </p>
            </div>
          </div>

          {!isInitial && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-sm px-2.5 py-1 rounded-md hover:bg-slate-800 transition-colors"
            >
              Fechar
            </button>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleLoadSheet} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Link da Planilha do Google Sheets (Pública)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-mono"
                disabled={isLoading}
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/70 text-rose-200 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <strong className="font-semibold block mb-0.5">Aviso de Carregamento</strong>
                {errorMessage}
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto flex-1 px-5 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processando Google GViz API...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Carregar Base de Dados</span>
                  <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-sm font-medium border border-slate-700/80 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Base Demonstrativa (500+ leituras)</span>
            </button>
          </div>
        </form>

        {/* Toggle Sharing Instructions */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              Como configurar o compartilhamento público no Google Sheets?
            </span>
            <span className="text-[11px] underline">{showGuide ? 'Ocultar' : 'Ver instruções'}</span>
          </button>

          {showGuide && (
            <div className="mt-3 p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 text-[10px] font-mono flex items-center justify-center font-bold mt-0.5 shrink-0">1</span>
                Abra sua planilha no Google Drive e clique no botão azul <strong>Compartilhar</strong> (canto superior direito).
              </p>
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 text-[10px] font-mono flex items-center justify-center font-bold mt-0.5 shrink-0">2</span>
                Em <em>Acesso geral</em>, altere de "Restrito" para <strong>"Qualquer pessoa com o link"</strong> no perfil <strong>Leitor</strong>.
              </p>
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 text-[10px] font-mono flex items-center justify-center font-bold mt-0.5 shrink-0">3</span>
                Clique em <strong>Copiar link</strong> e cole no campo acima.
              </p>
            </div>
          )}
        </div>

        {/* Required Columns Schema Overview */}
        <div className="mt-5 pt-4 border-t border-slate-800/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              Mapeamento Automático de Colunas ({REQUIRED_COLUMNS.length} campos)
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Reconhecimento Inteligente
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-950/50 rounded-lg border border-slate-800/80 text-[11px] font-mono text-slate-400">
            {REQUIRED_COLUMNS.map((col) => (
              <span key={col.key} className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                {col.label}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
