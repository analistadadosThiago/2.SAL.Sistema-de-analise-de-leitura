import React, { useState } from 'react';
import { Database, Link2, AlertCircle, FileSpreadsheet, ArrowRight, HelpCircle } from 'lucide-react';
import { fetchGoogleSheetData, SheetParseResult } from '../utils/googleSheets';
import { ReadingRecord } from '../types/reading';
import { Footer } from './Footer';

interface SetupModalProps {
  isOpen: boolean;
  onSuccess: (data: ReadingRecord[], sheetInfo: { url: string; rows: number; mappedCount: number }) => void;
  onClose?: () => void;
  currentUrl?: string;
  isInitial?: boolean;
}

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="flex-1 flex items-center justify-center py-6">
        <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 sm:p-8 text-slate-100">
          
          {/* Header with clean official Logo (crisp rendering) */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <img
                src="/assets/aistudio/LOGO_SAL_4ee1b044.png"
                alt="SAL"
                className="h-14 w-auto object-contain drop-shadow"
                style={{
                  imageRendering: '-webkit-optimize-contrast',
                }}
              />
              <p className="text-xs text-slate-400 max-w-sm">
                Conexão com a base de dados pública do Google Sheets para inicialização das análises operacionais.
              </p>
            </div>

            {!isInitial && onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 rounded-md hover:bg-slate-800 transition-colors"
              >
                Fechar
              </button>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleLoadSheet} className="space-y-4">
            <div>
              <label htmlFor="modal-sheet-url" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Link da Planilha do Google Sheets (Pública)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Link2 className="w-4 h-4" />
                </div>
                <input
                  id="modal-sheet-url"
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-5 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 disabled:opacity-50 active:scale-98"
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
                    <ArrowRight className="w-4 h-4 ml-1 opacity-80" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Instructions Guide */}
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
              <span className="text-[11px] underline text-cyan-400">{showGuide ? 'Ocultar' : 'Ver instruções'}</span>
            </button>

            {showGuide && (
              <div className="mt-3 p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 text-[10px] font-mono flex items-center justify-center font-bold mt-0.5 shrink-0">1</span>
                  Abra sua planilha no Google Drive e clique no botão <strong>Compartilhar</strong> (canto superior direito).
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 text-[10px] font-mono flex items-center justify-center font-bold mt-0.5 shrink-0">2</span>
                  Em <em>Acesso geral</em>, selecione <strong>"Qualquer pessoa com o link"</strong> no perfil <strong>Leitor</strong>.
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 text-[10px] font-mono flex items-center justify-center font-bold mt-0.5 shrink-0">3</span>
                  Clique em <strong>Copiar link</strong> e cole no campo acima.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Guaranteed footer in modal / initial connection screen */}
      <Footer />
    </div>
  );
};
