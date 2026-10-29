import React, { useState, useMemo } from 'react';
import { Camera, FileSpreadsheet, Printer, Play, RotateCcw, BarChart3, Info, User } from 'lucide-react';
import { ReadingRecord, MONTH_NAMES } from '../../types/reading';
import { exportToExcel, exportToPdf, formatPercent } from '../../utils/exportUtils';

interface ControleEvidenciasViewProps {
  records: ReadingRecord[];
}

export const ControleEvidenciasView: React.FC<ControleEvidenciasViewProps> = ({ records }) => {
  // Extract distinct filter values
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.ano && set.add(String(r.ano)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [records]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.mes && set.add(r.mes));
    return Array.from(set).sort((a, b) => {
      const idxA = MONTH_NAMES.indexOf(a);
      const idxB = MONTH_NAMES.indexOf(b);
      return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
    });
  }, [records]);

  const availableMatr = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.matr && set.add(r.matr));
    return Array.from(set).sort();
  }, [records]);

  // Filter state
  const [filterAno, setFilterAno] = useState<string>('TODOS');
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [filterMatr, setFilterMatr] = useState<string>('TODOS');
  const [filterUlDe, setFilterUlDe] = useState<string>('');
  const [filterUlPara, setFilterUlPara] = useState<string>('');

  // Hover state for interactive chart tooltip
  const [hoveredRazao, setHoveredRazao] = useState<string | null>(null);

  // Obligatory "Gerar" button state
  const [hasGenerated, setHasGenerated] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    ano: 'TODOS',
    mes: 'TODOS',
    matr: 'TODOS',
    ulDe: '',
    ulPara: '',
  });

  const handleUlDeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterUlDe(e.target.value.replace(/\D/g, '').slice(0, 8));
  };

  const handleUlParaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterUlPara(e.target.value.replace(/\D/g, '').slice(0, 8));
  };

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveFilters({
      ano: filterAno,
      mes: filterMes,
      matr: filterMatr,
      ulDe: filterUlDe.trim(),
      ulPara: filterUlPara.trim(),
    });
    setHasGenerated(true);
  };

  const handleReset = () => {
    setFilterAno('TODOS');
    setFilterMes('TODOS');
    setFilterMatr('TODOS');
    setFilterUlDe('');
    setFilterUlPara('');
    setActiveFilters({
      ano: 'TODOS',
      mes: 'TODOS',
      matr: 'TODOS',
      ulDe: '',
      ulPara: '',
    });
    setHasGenerated(false);
  };

  // Filtered operational records
  const filteredRecords = useMemo(() => {
    if (!hasGenerated) return [];

    return records.filter((r) => {
      if (activeFilters.ano !== 'TODOS' && String(r.ano) !== activeFilters.ano) return false;
      if (activeFilters.mes !== 'TODOS' && r.mes !== activeFilters.mes) return false;
      if (activeFilters.matr !== 'TODOS' && r.matr !== activeFilters.matr) return false;

      const ulNum = parseInt(String(r.rz_ul_lv || r.ul || '0').replace(/\D/g, ''), 10);
      if (activeFilters.ulDe) {
        const deNum = parseInt(activeFilters.ulDe, 10);
        if (!isNaN(deNum) && ulNum < deNum) return false;
      }
      if (activeFilters.ulPara) {
        const paraNum = parseInt(activeFilters.ulPara, 10);
        if (!isNaN(paraNum) && ulNum > paraNum) return false;
      }

      return true;
    });
  }, [records, hasGenerated, activeFilters]);

  // Relatório por Razão
  const relatorioPorRazao = useMemo(() => {
    const map = new Map<
      string,
      {
        totalLeituras: number;
        solicitadas: number;
        realizadas: number;
        matriculaStats: Map<string, { realizadas: number; naoRealizadas: number }>;
      }
    >();

    filteredRecords.forEach((r) => {
      const rz = r.rz || 'RZ01';
      const cur = map.get(rz) || {
        totalLeituras: 0,
        solicitadas: 0,
        realizadas: 0,
        matriculaStats: new Map<string, { realizadas: number; naoRealizadas: number }>(),
      };
      cur.totalLeituras++;

      const isSolicitada = (r.digitacao || 0) >= 2;
      const isFotoOk = (r.foto || '').toUpperCase() === 'OK';
      const matr = r.matr || 'SEM MATR';

      if (isSolicitada) {
        cur.solicitadas++;
        const matCur = cur.matriculaStats.get(matr) || { realizadas: 0, naoRealizadas: 0 };
        if (isFotoOk) {
          cur.realizadas++;
          matCur.realizadas++;
        } else {
          matCur.naoRealizadas++;
        }
        cur.matriculaStats.set(matr, matCur);
      }

      map.set(rz, cur);
    });

    return Array.from(map.entries()).map(([razao, d]) => {
      const naoRealizadas = Math.max(0, d.solicitadas - d.realizadas);
      const indicador = d.solicitadas > 0 ? (d.realizadas / d.solicitadas) * 100 : 0;

      const matriculas = Array.from(d.matriculaStats.entries())
        .map(([matr, s]) => ({ matr, ...s }))
        .sort((a, b) => b.realizadas - a.realizadas);

      return {
        razao,
        totalLeituras: d.totalLeituras,
        solicitadas: d.solicitadas,
        realizadas: d.realizadas,
        naoRealizadas,
        indicador,
        matriculas,
      };
    });
  }, [filteredRecords]);

  // REGRAS DE CORES NA TABELA "RELATÓRIO POR RAZÃO":
  // - Indicador de 0,00% a 40,00%: Linha em tom VERMELHO CLARO
  // - Indicador de 41,00% a 49,00%: Linha em tom AMARELO CLARO
  // - Indicador de 50,00% a 100,00%: Linha em tom VERDE CLARO
  const getRowStyle = (indicador: number) => {
    if (indicador <= 40.0) {
      return 'bg-red-500/20 text-red-100 border-b border-red-500/40 hover:bg-red-500/30';
    }
    if (indicador <= 49.99) {
      return 'bg-amber-500/20 text-amber-100 border-b border-amber-500/40 hover:bg-amber-500/30';
    }
    return 'bg-emerald-500/20 text-emerald-100 border-b border-emerald-500/40 hover:bg-emerald-500/30';
  };

  const handleExportExcel = () => {
    const data = relatorioPorRazao.map((r) => ({
      RAZAO: r.razao,
      'TOTAL LEITURAS': r.totalLeituras,
      SOLICITADAS: r.solicitadas,
      REALIZADAS: r.realizadas,
      'NÃO-REALIZADAS': r.naoRealizadas,
      INDICADOR: formatPercent(r.indicador),
    }));
    exportToExcel(
      data,
      `Controle_Evidencias_Por_Razao_${activeFilters.mes}_${activeFilters.ano}`,
      `Controle de Evidências por Razão (${activeFilters.mes}/${activeFilters.ano})`
    );
  };

  const handleExportPdf = () => {
    const data = relatorioPorRazao.map((r) => ({
      RAZAO: r.razao,
      'TOTAL LEITURAS': r.totalLeituras,
      SOLICITADAS: r.solicitadas,
      REALIZADAS: r.realizadas,
      'NÃO-REALIZADAS': r.naoRealizadas,
      INDICADOR: formatPercent(r.indicador),
    }));
    exportToPdf(
      data,
      `Controle_Evidencias_Por_Razao_${activeFilters.mes}_${activeFilters.ano}`,
      `Controle de Evidências por Razão (${activeFilters.mes}/${activeFilters.ano})`
    );
  };

  const maxSolicitadas = Math.max(...relatorioPorRazao.map((r) => r.solicitadas), 1);

  // Dynamic filter summary
  const filterSummary = useMemo(() => {
    const anoText = activeFilters.ano === 'TODOS' ? 'Todos' : activeFilters.ano;
    const mesText = activeFilters.mes === 'TODOS' ? 'Todos' : activeFilters.mes;
    const matrText = activeFilters.matr === 'TODOS' ? 'Todas' : activeFilters.matr;
    const ulText = activeFilters.ulDe || activeFilters.ulPara ? `UL: ${activeFilters.ulDe || 'Início'} a ${activeFilters.ulPara || 'Fim'}` : 'Todas as ULs';
    return `Filtro: Ano: ${anoText} | Mês: ${mesText} | Matrícula: ${matrText} | ${ulText} (${filteredRecords.length} registros analisados)`;
  }, [activeFilters, filteredRecords.length]);

  return (
    <div className="space-y-6">
      
      {/* Title at top */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
          <Camera className="w-5 h-5 text-cyan-400" />
          <span>4. Controle de Evidências</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Auditoria de fotos solicitadas (digitação &ge; 2) versus fotos efetivamente realizadas por polo/razão.
        </p>
      </div>

      {/* Filters Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            
            {/* Ano */}
            <div>
              <label htmlFor="evidencias-ano" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Ano
              </label>
              <select
                id="evidencias-ano"
                value={filterAno}
                onChange={(e) => setFilterAno(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="TODOS">Todos</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Mês */}
            <div>
              <label htmlFor="evidencias-mes" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Mês
              </label>
              <select
                id="evidencias-mes"
                value={filterMes}
                onChange={(e) => setFilterMes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="TODOS">Todos</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Matrícula */}
            <div>
              <label htmlFor="evidencias-matr" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Matrícula
              </label>
              <select
                id="evidencias-matr"
                value={filterMatr}
                onChange={(e) => setFilterMatr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="TODOS">Todas</option>
                {availableMatr.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* UL DE */}
            <div>
              <label htmlFor="evidencias-ul-de" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                UL DE
              </label>
              <input
                id="evidencias-ul-de"
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={filterUlDe}
                onChange={handleUlDeChange}
                placeholder="Ex: 120100"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              />
            </div>

            {/* UL PARA */}
            <div>
              <label htmlFor="evidencias-ul-para" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                UL PARA
              </label>
              <input
                id="evidencias-ul-para"
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={filterUlPara}
                onChange={handleUlParaChange}
                placeholder="Ex: 120999"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              />
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            {hasGenerated && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{filterSummary}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700/80 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Fazer nova pesquisa</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Gerar Relatório</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main Content Area */}
      {hasGenerated && (
        <div className="space-y-6">
          
          {/* Tabela Padronizada: Relatório Por Razão (Sem a caixa de legenda anterior) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">Relatório por Razão</h3>
                <span className="text-xs text-slate-400">
                  {relatorioPorRazao.length} razões com solicitações de fotos apuradas
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  title="Exportar para Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar Excel</span>
                </button>
                <button
                  onClick={handleExportPdf}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  title="Exportar para PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-300" />
                  <span>Exportar PDF</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-950/90 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <tr>
                    <th className="py-3 px-4">RAZAO</th>
                    <th className="py-3 px-4 text-right">TOTAL LEITURAS</th>
                    <th className="py-3 px-4 text-right">SOLICITADAS</th>
                    <th className="py-3 px-4 text-right">REALIZADAS</th>
                    <th className="py-3 px-4 text-right">NÃO-REALIZADAS</th>
                    <th className="py-3 px-4 text-right">INDICADOR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
                  {relatorioPorRazao.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-slate-500">
                        Nenhum registro encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    relatorioPorRazao.map((row) => (
                      <tr key={row.razao} className={`${getRowStyle(row.indicador)} transition-colors`}>
                        <td className="py-3 px-4 font-sans font-semibold text-white">{row.razao}</td>
                        <td className="py-3 px-4 text-right">{row.totalLeituras.toLocaleString('pt-BR')}</td>
                        <td className="py-3 px-4 text-right font-medium">{row.solicitadas.toLocaleString('pt-BR')}</td>
                        <td className="py-3 px-4 text-right font-bold">{row.realizadas.toLocaleString('pt-BR')}</td>
                        <td className="py-3 px-4 text-right font-bold">{row.naoRealizadas.toLocaleString('pt-BR')}</td>
                        <td className="py-3 px-4 text-right font-bold text-sm">
                          {formatPercent(row.indicador)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* GRÁFICO ANALÍTICO (Posição VERTICAL com barras empilhadas/lado a lado: Realizadas Verde, Não-Realizadas Vermelho) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    GRÁFICO ANALÍTICO
                  </h3>
                  <p className="text-xs text-slate-400">
                    Posição vertical comparando Fotos Realizadas (Verde) e Fotos Não-Realizadas (Vermelho) por Razão.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500" />
                  <span className="text-slate-300">Realizadas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-rose-500" />
                  <span className="text-slate-300">Não-Realizadas</span>
                </div>
              </div>
            </div>

            {/* Vertical Columns Container */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 items-end min-h-[260px] pt-4 pb-2 px-2 border-b border-slate-800">
              {relatorioPorRazao.map((r) => {
                const realizHeight = maxSolicitadas > 0 ? Math.max(8, Math.round((r.realizadas / maxSolicitadas) * 190)) : 0;
                const naoRealizHeight = maxSolicitadas > 0 ? Math.max(8, Math.round((r.naoRealizadas / maxSolicitadas) * 190)) : 0;
                const isHovered = hoveredRazao === r.razao;

                return (
                  <div
                    key={r.razao}
                    className="flex flex-col items-center gap-2 cursor-pointer group relative"
                    onMouseEnter={() => setHoveredRazao(r.razao)}
                    onMouseLeave={() => setHoveredRazao(null)}
                  >
                    {/* Top percentage label */}
                    <span className="text-[11px] font-mono font-bold text-cyan-300">
                      {formatPercent(r.indicador)}
                    </span>

                    {/* Vertical Bars (Side by Side) */}
                    <div className="flex items-end gap-1.5 h-[200px] w-full justify-center bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80 group-hover:border-slate-700 transition-colors">
                      {/* Realizadas (Verde) */}
                      <div
                        className="w-1/2 max-w-[20px] bg-emerald-500 rounded-t-md transition-all duration-300 hover:brightness-110 shadow-sm"
                        style={{ height: `${realizHeight}px` }}
                        title={`Realizadas: ${r.realizadas}`}
                      />
                      {/* Não-Realizadas (Vermelho) */}
                      <div
                        className="w-1/2 max-w-[20px] bg-rose-500 rounded-t-md transition-all duration-300 hover:brightness-110 shadow-sm"
                        style={{ height: `${naoRealizHeight}px` }}
                        title={`Não-Realizadas: ${r.naoRealizadas}`}
                      />
                    </div>

                    {/* Bottom Razão Label */}
                    <span className="text-xs font-semibold text-slate-300 truncate max-w-[90px] text-center" title={r.razao}>
                      {r.razao}
                    </span>

                    {/* Tooltip with Matrícula Breakdown */}
                    {isHovered && r.matriculas.length > 0 && (
                      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 p-3 bg-slate-900 border border-cyan-800 rounded-lg shadow-2xl text-xs space-y-1.5 z-30 pointer-events-none">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-cyan-300 font-semibold text-[11px]">
                          <span className="truncate">{r.razao}</span>
                          <span>{r.indicador.toFixed(1)}%</span>
                        </div>
                        <div className="text-[11px] text-slate-300 flex justify-between font-mono">
                          <span className="text-emerald-400 font-bold">{r.realizadas} Realizadas</span>
                          <span className="text-rose-400 font-bold">{r.naoRealizadas} Pendentes</span>
                        </div>
                        <div className="pt-1 border-t border-slate-800/80 max-h-32 overflow-y-auto space-y-1 font-mono text-[10px]">
                          {r.matriculas.map((mat) => (
                            <div key={mat.matr} className="flex justify-between text-slate-300">
                              <span>Matr. {mat.matr}</span>
                              <span>
                                <strong className="text-emerald-400">{mat.realizadas}</strong> / <strong className="text-rose-400">{mat.naoRealizadas}</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
