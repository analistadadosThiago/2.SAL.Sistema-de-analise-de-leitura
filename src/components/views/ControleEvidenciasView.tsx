import React, { useState, useMemo } from 'react';
import { Camera, FileSpreadsheet, Printer, Play, BarChart3 } from 'lucide-react';
import { ReadingRecord, MONTH_NAMES } from '../../types/reading';
import { exportToExcel, printReport, formatPercent } from '../../utils/exportUtils';
import { Pagination } from '../common/Pagination';

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

  // Obligatory "Gerar" button state
  const [hasGenerated, setHasGenerated] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    ano: 'TODOS',
    mes: 'TODOS',
    matr: 'TODOS',
    ulDe: '',
    ulPara: '',
  });

  const [activeTab, setActiveTab] = useState<'completo' | 'razao'>('completo');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

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
    setCurrentPage(1);
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

  // Compute leiturista / UL stats for accurate Solicitadas & Realizadas
  const leituristaStats = useMemo(() => {
    const stats = new Map<string, { solicitadas: number; realizadas: number }>();
    filteredRecords.forEach((r) => {
      const key = `${r.ano}_${r.mes}_${r.matr}`;
      const cur = stats.get(key) || { solicitadas: 0, realizadas: 0 };
      const isSolicitada = (r.digitacao || 0) >= 2;
      if (isSolicitada) {
        cur.solicitadas++;
        if ((r.foto || '').toUpperCase() === 'OK') {
          cur.realizadas++;
        }
      }
      stats.set(key, cur);
    });
    return stats;
  }, [filteredRecords]);

  // Full table rows
  const fullRows = useMemo(() => {
    return filteredRecords.map((r) => {
      const key = `${r.ano}_${r.mes}_${r.matr}`;
      const stat = leituristaStats.get(key) || { solicitadas: 1, realizadas: 1 };
      
      const solicitadas = stat.solicitadas;
      const realizadas = stat.realizadas;
      const naoRealizadas = Math.max(0, solicitadas - realizadas);
      const indicador = solicitadas > 0 ? (realizadas / solicitadas) * 100 : 0;

      return {
        id: r.id,
        mes: r.mes,
        ano: r.ano,
        razao: r.rz || 'RZ01',
        ul: r.ul || r.rz_ul_lv || '-',
        solicitadas,
        realizadas,
        naoRealizadas,
        matr: r.matr,
        cod: r.nl || '0000',
        leitura: r.l_atual,
        dig: r.digitacao,
        indicador,
      };
    });
  }, [filteredRecords, leituristaStats]);

  // Report by Razão
  const relatorioPorRazao = useMemo(() => {
    const map = new Map<string, { solicitadas: number; realizadas: number; totalLeituras: number }>();

    filteredRecords.forEach((r) => {
      const rz = r.rz || 'RZ01';
      const cur = map.get(rz) || { solicitadas: 0, realizadas: 0, totalLeituras: 0 };
      cur.totalLeituras++;

      const isSolicitada = (r.digitacao || 0) >= 2;
      if (isSolicitada) {
        cur.solicitadas++;
        if ((r.foto || '').toUpperCase() === 'OK') {
          cur.realizadas++;
        }
      }
      map.set(rz, cur);
    });

    return Array.from(map.entries()).map(([razao, d]) => {
      const naoRealizadas = Math.max(0, d.solicitadas - d.realizadas);
      const indicador = d.solicitadas > 0 ? (d.realizadas / d.solicitadas) * 100 : 0;
      return {
        razao,
        totalLeituras: d.totalLeituras,
        solicitadas: d.solicitadas,
        realizadas: d.realizadas,
        naoRealizadas,
        indicador,
      };
    });
  }, [filteredRecords]);

  // Row styling function based on INDICADOR:
  // 0,00% a 0,40% = Verde Escuro
  // 0,41% a 0,49% = Amarelo Escuro
  // Acima de 0,50% = Vermelho Escuro com letras em NEGRITO
  const getRowStyle = (indicador: number) => {
    if (indicador <= 0.40) {
      return 'bg-emerald-950/40 text-emerald-200 border-b border-emerald-900/30';
    }
    if (indicador <= 0.49) {
      return 'bg-amber-950/40 text-amber-200 border-b border-amber-900/30';
    }
    return 'bg-rose-950/60 text-rose-100 font-bold border-b border-rose-900/40';
  };

  const paginatedFullRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return fullRows.slice(start, start + pageSize);
  }, [fullRows, currentPage, pageSize]);

  const totalPages = Math.ceil(fullRows.length / pageSize) || 1;

  const handleExportExcel = () => {
    if (activeTab === 'completo') {
      const data = fullRows.map((r) => ({
        MES: r.mes,
        ANO: r.ano,
        RAZÃO: r.razao,
        UL: r.ul,
        SOLICITADAS: r.solicitadas,
        REALIZADAS: r.realizadas,
        'NÃO-REALIZADAS': r.naoRealizadas,
        MATR: r.matr,
        COD: r.cod,
        LEITURA: r.leitura,
        DIG: r.dig,
        INDICADOR: formatPercent(r.indicador),
      }));
      exportToExcel(data, `Controle_Evidencias_Completo_${activeFilters.mes}_${activeFilters.ano}`);
    } else {
      const data = relatorioPorRazao.map((r) => ({
        RAZÃO: r.razao,
        'TOTAL LEITURAS': r.totalLeituras,
        SOLICITADAS: r.solicitadas,
        REALIZADAS: r.realizadas,
        'NÃO-REALIZADAS': r.naoRealizadas,
        INDICADOR: formatPercent(r.indicador),
      }));
      exportToExcel(data, `Controle_Evidencias_Por_Razao_${activeFilters.mes}_${activeFilters.ano}`);
    }
  };

  return (
    <div className="space-y-6">
      
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

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Gerar Relatório</span>
            </button>
          </div>
        </form>
      </div>

      {/* Main Content Area */}
      {hasGenerated && (
        <div className="space-y-5">
          
          {/* Conditional Color Legend */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
              Legenda do Indicador:
            </span>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                0,00% a 0,40% (Verde Escuro)
              </span>
              <span className="px-2.5 py-1 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                0,41% a 0,49% (Amarelo Escuro)
              </span>
              <span className="px-2.5 py-1 rounded bg-rose-950/90 text-rose-200 font-bold border border-rose-800/60">
                Acima de 0,50% (Vermelho Escuro - Negrito)
              </span>
            </div>
          </div>

          {/* Internal Tabs & Export Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              
              {/* Tab Selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveTab('completo')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'completo'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Relatório Completo ({fullRows.length})
                </button>
                <button
                  onClick={() => setActiveTab('razao')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'razao'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Relatório Por Razão ({relatorioPorRazao.length})
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar Excel</span>
                </button>
                <button
                  onClick={printReport}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-300" />
                  <span>Imprimir / PDF</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Relatório Completo */}
            {activeTab === 'completo' && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                      <tr>
                        <th className="py-2.5 px-3">MES</th>
                        <th className="py-2.5 px-3">ANO</th>
                        <th className="py-2.5 px-3">RAZÃO</th>
                        <th className="py-2.5 px-3">UL</th>
                        <th className="py-2.5 px-3 text-right">SOLICITADAS</th>
                        <th className="py-2.5 px-3 text-right">REALIZADAS</th>
                        <th className="py-2.5 px-3 text-right">NÃO-REALIZADAS</th>
                        <th className="py-2.5 px-3">MATR</th>
                        <th className="py-2.5 px-3">COD</th>
                        <th className="py-2.5 px-3 text-right">LEITURA</th>
                        <th className="py-2.5 px-3 text-center">DIG</th>
                        <th className="py-2.5 px-3 text-right">INDICADOR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono tabular-nums">
                      {paginatedFullRows.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-xs text-slate-500">
                            Nenhum registro de evidência atende aos filtros.
                          </td>
                        </tr>
                      ) : (
                        paginatedFullRows.map((row) => (
                          <tr key={row.id} className={`${getRowStyle(row.indicador)} hover:brightness-110 transition-colors`}>
                            <td className="py-2 px-3 font-sans">{row.mes}</td>
                            <td className="py-2 px-3">{row.ano}</td>
                            <td className="py-2 px-3">{row.razao}</td>
                            <td className="py-2 px-3 font-semibold">{row.ul}</td>
                            <td className="py-2 px-3 text-right">{row.solicitadas}</td>
                            <td className="py-2 px-3 text-right">{row.realizadas}</td>
                            <td className="py-2 px-3 text-right">{row.naoRealizadas}</td>
                            <td className="py-2 px-3">{row.matr}</td>
                            <td className="py-2 px-3">{row.cod}</td>
                            <td className="py-2 px-3 text-right">{row.leitura.toLocaleString('pt-BR')}</td>
                            <td className="py-2 px-3 text-center">{row.dig}</td>
                            <td className="py-2 px-3 text-right font-bold">
                              {formatPercent(row.indicador)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={fullRows.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                />
              </>
            )}

            {/* Tab 2: Relatório Por Razão */}
            {activeTab === 'razao' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                    <tr>
                      <th className="py-3 px-4">RAZÃO SOCIAL / POLO</th>
                      <th className="py-3 px-4 text-right">TOTAL LEITURAS</th>
                      <th className="py-3 px-4 text-right">SOLICITADAS (DIG &ge; 2)</th>
                      <th className="py-3 px-4 text-right text-emerald-400">REALIZADAS (FOTO OK)</th>
                      <th className="py-3 px-4 text-right text-rose-400">NÃO-REALIZADAS</th>
                      <th className="py-3 px-4 text-right">INDICADOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono tabular-nums">
                    {relatorioPorRazao.map((row) => (
                      <tr key={row.razao} className={`${getRowStyle(row.indicador)} hover:brightness-110 transition-colors`}>
                        <td className="py-3 px-4 font-sans font-semibold">{row.razao}</td>
                        <td className="py-3 px-4 text-right">{row.totalLeituras.toLocaleString('pt-BR')}</td>
                        <td className="py-3 px-4 text-right">{row.solicitadas.toLocaleString('pt-BR')}</td>
                        <td className="py-3 px-4 text-right">{row.realizadas.toLocaleString('pt-BR')}</td>
                        <td className="py-3 px-4 text-right">{row.naoRealizadas.toLocaleString('pt-BR')}</td>
                        <td className="py-3 px-4 text-right font-bold text-sm">
                          {formatPercent(row.indicador)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

          {/* Gráfico Analítico de Evidências */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Gráfico Analítico: Indicador de Evidências por Razão</span>
              </h4>
              <span className="text-xs text-slate-400 font-mono">% Cumprimento</span>
            </div>

            <div className="space-y-3 pt-2">
              {relatorioPorRazao.map((r) => {
                const barWidth = Math.min(100, Math.max(5, Math.round(r.indicador)));
                return (
                  <div key={r.razao} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-200 font-medium">{r.razao}</span>
                      <div className="flex items-center gap-3 font-mono tabular-nums">
                        <span className="text-slate-400">{r.realizadas} de {r.solicitadas} solicitadas</span>
                        <span className="font-bold text-cyan-400">{formatPercent(r.indicador)}</span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
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
