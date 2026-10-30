import React, { useState, useMemo } from 'react';
import { Camera, FileSpreadsheet, Printer, Play, RotateCcw, BarChart3, Info, User, Users, Layers, Search } from 'lucide-react';
import { ReadingRecord, MONTH_NAMES } from '../../types/reading';
import { exportToExcel, exportToPdf, formatPercent } from '../../utils/exportUtils';
import { Pagination } from '../common/Pagination';

interface ControleEvidenciasViewProps {
  records: ReadingRecord[];
}

interface RelacaoLeituristaEvidencia {
  id: string;
  ano: string;
  mes: string;
  matr: string;
  solicitadas: number;
  realizadas: number;
  naoRealizadas: number;
  indicador: number; // (realizadas / solicitadas) * 100
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

  // Active section tab in lower analytics: 'grafico' vs 'leiturista'
  const [activeTab, setActiveTab] = useState<'grafico' | 'leiturista'>('grafico');

  // Search filter for Relação por Leiturista
  const [searchLeituristaMatr, setSearchLeituristaMatr] = useState('');
  const [currentPageLeiturista, setCurrentPageLeiturista] = useState(1);
  const pageSize = 20;

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
    setCurrentPageLeiturista(1);
  };

  const handleReset = () => {
    setFilterAno('TODOS');
    setFilterMes('TODOS');
    setFilterMatr('TODOS');
    setFilterUlDe('');
    setFilterUlPara('');
    setSearchLeituristaMatr('');
    setActiveFilters({
      ano: 'TODOS',
      mes: 'TODOS',
      matr: 'TODOS',
      ulDe: '',
      ulPara: '',
    });
    setHasGenerated(false);
    setCurrentPageLeiturista(1);
  };

  // Filtered dataset
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

  // NOVA FUNCIONALIDADE: Relação por Leiturista consolidada
  // Colunas: ANO, MÊS, MATR, SOLICITADAS, REALIZADAS, NÃO-REALIZADAS, INDICADOR
  // Ordenado em ordem decrescente pelo Indicador (do maior para o menor)
  const relacaoPorLeiturista = useMemo(() => {
    const map = new Map<string, { ano: string; mes: string; matr: string; solicitadas: number; realizadas: number }>();

    filteredRecords.forEach((r) => {
      const isSolicitada = (r.digitacao || 0) >= 2;
      if (!isSolicitada) return;

      const ano = String(r.ano || '-');
      const mes = r.mes || '-';
      const matr = r.matr || 'SEM MATR';
      const key = `${ano}__${mes}__${matr}`;

      const cur = map.get(key) || { ano, mes, matr, solicitadas: 0, realizadas: 0 };
      cur.solicitadas++;

      const isFotoOk = (r.foto || '').toUpperCase() === 'OK';
      if (isFotoOk) {
        cur.realizadas++;
      }

      map.set(key, cur);
    });

    const list: RelacaoLeituristaEvidencia[] = Array.from(map.values()).map((item) => {
      const naoRealizadas = Math.max(0, item.solicitadas - item.realizadas);
      const indicador = item.solicitadas > 0 ? (item.realizadas / item.solicitadas) * 100 : 0;
      return {
        id: `${item.ano}_${item.mes}_${item.matr}`,
        ano: item.ano,
        mes: item.mes,
        matr: item.matr,
        solicitadas: item.solicitadas,
        realizadas: item.realizadas,
        naoRealizadas,
        indicador,
      };
    });

    // Ordenação estritamente decrescente pelo Indicador
    list.sort((a, b) => b.indicador - a.indicador);

    return list;
  }, [filteredRecords]);

  // Filtered by local search for Tab 2
  const filteredRelacaoLeiturista = useMemo(() => {
    if (!searchLeituristaMatr.trim()) return relacaoPorLeiturista;
    const q = searchLeituristaMatr.trim().toUpperCase();
    return relacaoPorLeiturista.filter((item) => item.matr.toUpperCase().includes(q));
  }, [relacaoPorLeiturista, searchLeituristaMatr]);

  const paginatedLeiturista = useMemo(() => {
    const start = (currentPageLeiturista - 1) * pageSize;
    return filteredRelacaoLeiturista.slice(start, start + pageSize);
  }, [filteredRelacaoLeiturista, currentPageLeiturista, pageSize]);

  const totalPagesLeiturista = Math.ceil(filteredRelacaoLeiturista.length / pageSize) || 1;

  // REGRAS DE CORES NA TABELA "RELATÓRIO POR RAZÃO":
  const getRowStyle = (indicador: number) => {
    if (indicador <= 40.0) {
      return 'bg-red-500/20 text-red-100 border-b border-red-500/40 hover:bg-red-500/30';
    }
    if (indicador <= 49.99) {
      return 'bg-amber-500/20 text-amber-100 border-b border-amber-500/40 hover:bg-amber-500/30';
    }
    return 'bg-emerald-500/20 text-emerald-100 border-b border-emerald-500/40 hover:bg-emerald-500/30';
  };

  const handleExportExcelRazao = () => {
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

  const handleExportPdfRazao = () => {
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

  const handleExportExcelLeiturista = () => {
    const data = relacaoPorLeiturista.map((r) => ({
      ANO: r.ano,
      MÊS: r.mes,
      MATR: r.matr,
      SOLICITADAS: r.solicitadas,
      REALIZADAS: r.realizadas,
      'NÃO-REALIZADAS': r.naoRealizadas,
      INDICADOR: formatPercent(r.indicador),
    }));
    exportToExcel(
      data,
      `Controle_Evidencias_Por_Leiturista_${activeFilters.mes}_${activeFilters.ano}`,
      `Controle de Evidências por Leiturista (${activeFilters.mes}/${activeFilters.ano})`
    );
  };

  const handleExportPdfLeiturista = () => {
    const data = relacaoPorLeiturista.map((r) => ({
      ANO: r.ano,
      MÊS: r.mes,
      MATR: r.matr,
      SOLICITADAS: r.solicitadas,
      REALIZADAS: r.realizadas,
      'NÃO-REALIZADAS': r.naoRealizadas,
      INDICADOR: formatPercent(r.indicador),
    }));
    exportToPdf(
      data,
      `Controle_Evidencias_Por_Leiturista_${activeFilters.mes}_${activeFilters.ano}`,
      `Controle de Evidências por Leiturista (${activeFilters.mes}/${activeFilters.ano})`
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
          <span>3.2. Controle de Evidência</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Auditoria de fotos solicitadas (digitação &ge; 2) versus fotos efetivamente realizadas por polo/razão e leiturista.
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
                UL DE (até 8 dígitos)
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
                UL PARA (até 8 dígitos)
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
            {hasGenerated ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{filterSummary}</span>
              </div>
            ) : <div />}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700/80 transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Fazer nova pesquisa</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Gerar Relatório</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {hasGenerated && (
        <div className="space-y-6">
          
          {/* TABELA SUPERIOR: RELATÓRIO POR RAZÃO */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>Relatório por Razão</span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcelRazao}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  title="Exportar para Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPdfRazao}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
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
                    <th className="py-3 px-3.5">RAZAO</th>
                    <th className="py-3 px-3.5 text-right">TOTAL LEITURAS</th>
                    <th className="py-3 px-3.5 text-right text-cyan-300">SOLICITADAS</th>
                    <th className="py-3 px-3.5 text-right text-emerald-300">REALIZADAS</th>
                    <th className="py-3 px-3.5 text-right text-rose-300">NÃO-REALIZADAS</th>
                    <th className="py-3 px-3.5 text-right font-bold text-white">INDICADOR</th>
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
                      <tr key={row.razao} className={`transition-colors ${getRowStyle(row.indicador)}`}>
                        <td className="py-2.5 px-3.5 font-bold">{row.razao}</td>
                        <td className="py-2.5 px-3.5 text-right">{row.totalLeituras.toLocaleString('pt-BR')}</td>
                        <td className="py-2.5 px-3.5 text-right font-semibold">{row.solicitadas.toLocaleString('pt-BR')}</td>
                        <td className="py-2.5 px-3.5 text-right font-semibold">{row.realizadas.toLocaleString('pt-BR')}</td>
                        <td className="py-2.5 px-3.5 text-right font-semibold">{row.naoRealizadas.toLocaleString('pt-BR')}</td>
                        <td className="py-2.5 px-3.5 text-right font-bold">{formatPercent(row.indicador)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SEÇÃO COM ABAS: GRÁFICO ANALÍTICO vs RELAÇÃO POR LEITURISTA */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            
            {/* Header com Abas e Ações */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('grafico')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'grafico'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Gráfico Analítico</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('leiturista')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'leiturista'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Relação por Leiturista</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/30 font-mono">
                    {relacaoPorLeiturista.length}
                  </span>
                </button>
              </div>

              {/* Legenda do Gráfico ou Ações da Tabela */}
              {activeTab === 'grafico' ? (
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
              ) : (
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                    <input
                      type="text"
                      value={searchLeituristaMatr}
                      onChange={(e) => {
                        setSearchLeituristaMatr(e.target.value);
                        setCurrentPageLeiturista(1);
                      }}
                      placeholder="Filtrar Matrícula..."
                      className="pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono w-36 sm:w-44"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExportExcelLeiturista}
                    className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    title="Exportar Relação por Leiturista Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Exportar Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdfLeiturista}
                    className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    title="Exportar Relação por Leiturista PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-300" />
                    <span>Exportar PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* TAB CONTENT 1: GRÁFICO ANALÍTICO COM VALORES FIXOS NO TOPO */}
            {activeTab === 'grafico' && (
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 items-end min-h-[350px] pt-10 pb-4 px-3 border-b border-slate-800 overflow-x-auto">
                  {relatorioPorRazao.map((r) => {
                    const realizHeight = maxSolicitadas > 0 ? Math.max(12, Math.round((r.realizadas / maxSolicitadas) * 220)) : 0;
                    const naoRealizHeight = maxSolicitadas > 0 ? Math.max(12, Math.round((r.naoRealizadas / maxSolicitadas) * 220)) : 0;

                    return (
                      <div
                        key={r.razao}
                        className="flex flex-col items-center gap-2 group min-w-[75px]"
                      >
                        {/* Rótulo FIXO no topo do grupo: Indicador % */}
                        <div className="text-center mb-1 pointer-events-none">
                          <span className="text-xs font-mono font-bold text-cyan-300 block">
                            {formatPercent(r.indicador)}
                          </span>
                        </div>

                        {/* Colunas Lado a Lado com valores FIXOS no topo */}
                        <div className="flex items-end gap-2.5 h-[240px] w-full justify-center bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 group-hover:border-slate-700 transition-colors">
                          {/* Coluna Realizadas (Verde) */}
                          <div className="flex flex-col items-center justify-end h-full w-1/2">
                            <span className="text-[11px] font-bold font-mono text-emerald-400 mb-1 tabular-nums">
                              {r.realizadas}
                            </span>
                            <div
                              className="w-full max-w-[36px] min-w-[20px] bg-gradient-to-t from-emerald-700 to-emerald-400 rounded-t-md transition-all duration-300 hover:brightness-110 shadow-sm"
                              style={{ height: `${realizHeight}px` }}
                            />
                          </div>

                          {/* Coluna Não-Realizadas (Vermelho) */}
                          <div className="flex flex-col items-center justify-end h-full w-1/2">
                            <span className="text-[11px] font-bold font-mono text-rose-400 mb-1 tabular-nums">
                              {r.naoRealizadas}
                            </span>
                            <div
                              className="w-full max-w-[36px] min-w-[20px] bg-gradient-to-t from-rose-700 to-rose-400 rounded-t-md transition-all duration-300 hover:brightness-110 shadow-sm"
                              style={{ height: `${naoRealizHeight}px` }}
                            />
                          </div>
                        </div>

                        {/* Rótulo da Razão na base */}
                        <span className="text-xs font-bold text-slate-200 truncate max-w-[95px] text-center" title={r.razao}>
                          {r.razao}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: RELAÇÃO POR LEITURISTA */}
            {/* Estrutura: ANO, MÊS, MATR, SOLICITADAS, REALIZADAS, NÃO-REALIZADAS, INDICADOR */}
            {/* Ordenação decrescente pelo Indicador */}
            {activeTab === 'leiturista' && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-950/90 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                      <tr>
                        <th className="py-3 px-3.5 whitespace-nowrap">ANO</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">MÊS</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">MATR</th>
                        <th className="py-3 px-3.5 text-right whitespace-nowrap text-cyan-300">SOLICITADAS</th>
                        <th className="py-3 px-3.5 text-right whitespace-nowrap text-emerald-300">REALIZADAS</th>
                        <th className="py-3 px-3.5 text-right whitespace-nowrap text-rose-300">NÃO-REALIZADAS</th>
                        <th className="py-3 px-3.5 text-right whitespace-nowrap text-amber-300 font-bold">INDICADOR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300 tabular-nums">
                      {paginatedLeiturista.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-xs text-slate-500">
                            Nenhum registro encontrado para os critérios selecionados.
                          </td>
                        </tr>
                      ) : (
                        paginatedLeiturista.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3.5 text-slate-400 whitespace-nowrap">{row.ano}</td>
                            <td className="py-2.5 px-3.5 font-sans text-slate-200 whitespace-nowrap">{row.mes}</td>
                            <td className="py-2.5 px-3.5 text-white font-semibold whitespace-nowrap">{row.matr}</td>
                            <td className="py-2.5 px-3.5 text-right text-slate-200">{row.solicitadas.toLocaleString('pt-BR')}</td>
                            <td className="py-2.5 px-3.5 text-right font-medium text-emerald-400">{row.realizadas.toLocaleString('pt-BR')}</td>
                            <td className="py-2.5 px-3.5 text-right font-medium text-rose-400">{row.naoRealizadas.toLocaleString('pt-BR')}</td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-amber-400">
                              {formatPercent(row.indicador)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={currentPageLeiturista}
                  totalPages={totalPagesLeiturista}
                  totalItems={filteredRelacaoLeiturista.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPageLeiturista}
                />
              </>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
