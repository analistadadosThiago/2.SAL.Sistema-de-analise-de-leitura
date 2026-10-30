import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Layers,
  Filter,
  User,
  Info,
  Play,
  RotateCcw,
} from 'lucide-react';
import { ReadingRecord, IMPEDIMENT_CODES, MONTH_NAMES } from '../../types/reading';
import { formatPercent } from '../../utils/exportUtils';

interface DashboardViewProps {
  records: ReadingRecord[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ records }) => {
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

  const availableRazoes = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.rz && set.add(r.rz));
    return Array.from(set).sort();
  }, [records]);

  // Filter form state
  const [filterAno, setFilterAno] = useState<string>('TODOS');
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [filterRazao, setFilterRazao] = useState<string>('TODAS');

  // Active committed filters upon clicking "Gerar Relatório"
  const [hasGenerated, setHasGenerated] = useState<boolean>(true);
  const [activeFilters, setActiveFilters] = useState({
    ano: 'TODOS',
    mes: 'TODOS',
    razao: 'TODAS',
  });

  // Hover state for tooltip on the horizontal bar chart
  const [hoveredRazao, setHoveredRazao] = useState<string | null>(null);

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveFilters({
      ano: filterAno,
      mes: filterMes,
      razao: filterRazao,
    });
    setHasGenerated(true);
  };

  const handleReset = () => {
    setFilterAno('TODOS');
    setFilterMes('TODOS');
    setFilterRazao('TODAS');
    setActiveFilters({
      ano: 'TODOS',
      mes: 'TODOS',
      razao: 'TODAS',
    });
    setHasGenerated(false);
  };

  // Filter records based on active filters
  const filteredRecords = useMemo(() => {
    if (!hasGenerated) return [];

    return records.filter((r) => {
      if (activeFilters.ano !== 'TODOS' && String(r.ano) !== activeFilters.ano) return false;
      if (activeFilters.mes !== 'TODOS' && r.mes !== activeFilters.mes) return false;
      if (activeFilters.razao !== 'TODAS' && r.rz !== activeFilters.razao) return false;
      return true;
    });
  }, [records, hasGenerated, activeFilters]);

  // Primary Metrics
  const metrics = useMemo(() => {
    const totalLeituras = filteredRecords.length;
    let naoRealizadas = 0;

    filteredRecords.forEach((r) => {
      const code = String(r.nl || '').trim();
      if (IMPEDIMENT_CODES.has(code)) {
        naoRealizadas++;
      }
    });

    const realizadas = Math.max(0, totalLeituras - naoRealizadas);
    const percImpedimentos = realizadas > 0 ? (naoRealizadas / realizadas) * 100 : 0;

    return {
      totalLeituras,
      naoRealizadas,
      realizadas,
      percImpedimentos,
    };
  }, [filteredRecords]);

  // 1º PRIMEIRO: Análise de tipo de Leitura (3 Cards divididos pelo campo 'tipo')
  const breakdownByTipo = useMemo(() => {
    const map = new Map<string, { total: number; naoRealizadas: number; realizadas: number }>();

    filteredRecords.forEach((r) => {
      let t = (r.tipo || 'OUTROS').toUpperCase().trim();
      if (t.includes('URB')) t = 'URBANO';
      else if (t.includes('POV')) t = 'POVOADO';
      else if (t.includes('RUR')) t = 'RURAL';

      const cur = map.get(t) || { total: 0, naoRealizadas: 0, realizadas: 0 };
      cur.total++;
      if (IMPEDIMENT_CODES.has(String(r.nl || '').trim())) {
        cur.naoRealizadas++;
      } else {
        cur.realizadas++;
      }
      map.set(t, cur);
    });

    const entries = Array.from(map.entries());
    const order = ['URBANO', 'POVOADO', 'RURAL'];
    entries.sort((a, b) => {
      const idxA = order.indexOf(a[0]);
      const idxB = order.indexOf(b[0]);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b[1].total - a[1].total;
    });

    return entries.slice(0, 3).map(([tipo, d]) => ({
      tipo,
      total: d.total,
      realizadas: d.realizadas,
      naoRealizadas: d.naoRealizadas,
      pct: d.realizadas > 0 ? (d.naoRealizadas / d.realizadas) * 100 : 0,
    }));
  }, [filteredRecords]);

  // 2º DEPOIS: Gráfico de Barras Horizontais "Impedimentos por Razão"
  const impedimentosByRazao = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        naoRealizadas: number;
        realizadas: number;
        matriculaMap: Map<string, number>;
      }
    >();

    filteredRecords.forEach((r) => {
      const rz = r.rz || 'Não Informado';
      const cur = map.get(rz) || {
        total: 0,
        naoRealizadas: 0,
        realizadas: 0,
        matriculaMap: new Map<string, number>(),
      };

      cur.total++;
      const code = String(r.nl || '').trim();
      if (IMPEDIMENT_CODES.has(code)) {
        cur.naoRealizadas++;
        const mat = r.matr || 'SEM MATR';
        cur.matriculaMap.set(mat, (cur.matriculaMap.get(mat) || 0) + 1);
      } else {
        cur.realizadas++;
      }

      map.set(rz, cur);
    });

    return Array.from(map.entries())
      .map(([rz, d]) => {
        const sortedMatriculas = Array.from(d.matriculaMap.entries())
          .map(([matr, count]) => ({ matr, count }))
          .sort((a, b) => b.count - a.count);

        return {
          rz,
          total: d.total,
          naoRealizadas: d.naoRealizadas,
          realizadas: d.realizadas,
          pct: d.realizadas > 0 ? (d.naoRealizadas / d.realizadas) * 100 : 0,
          matriculas: sortedMatriculas,
        };
      })
      .sort((a, b) => b.naoRealizadas - a.naoRealizadas);
  }, [filteredRecords]);

  const maxRazaoNl = Math.max(...impedimentosByRazao.map((x) => x.naoRealizadas), 1);

  // Dynamic filter textual summary
  const filterSummary = useMemo(() => {
    const anoText = activeFilters.ano === 'TODOS' ? 'Todos os Anos' : activeFilters.ano;
    const mesText = activeFilters.mes === 'TODOS' ? 'Todos os Meses' : activeFilters.mes;
    const rzText = activeFilters.razao === 'TODAS' ? 'Todas as Razões' : activeFilters.razao;
    return `Exibindo dados para: Ano: ${anoText} | Mês: ${mesText} | Razão: ${rzText} (${filteredRecords.length.toLocaleString('pt-BR')} registros analisados)`;
  }, [activeFilters, filteredRecords.length]);

  return (
    <div className="space-y-6">
      
      {/* Title at top */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <span>1. Dashboard</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Visão panorâmica de leituras a realizar, índices de impedimento e análise estratificada por tipo e razão.
        </p>
      </div>

      {/* Top Filter Bar with "Gerar Relatório" and "Nova Pesquisa" */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
              <Filter className="w-4 h-4 text-cyan-400" />
              <span>Selecione Filtros:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Ano Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <label htmlFor="dash-ano" className="text-slate-400 font-medium">Ano:</label>
                <select
                  id="dash-ano"
                  value={filterAno}
                  onChange={(e) => setFilterAno(e.target.value)}
                  className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono transition-all"
                >
                  <option value="TODOS">Todos os Anos</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Mês Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <label htmlFor="dash-mes" className="text-slate-400 font-medium">Mês:</label>
                <select
                  id="dash-mes"
                  value={filterMes}
                  onChange={(e) => setFilterMes(e.target.value)}
                  className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono transition-all"
                >
                  <option value="TODOS">Todos os Meses</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Razão Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <label htmlFor="dash-razao" className="text-slate-400 font-medium">Razão (rz):</label>
                <select
                  id="dash-razao"
                  value={filterRazao}
                  onChange={(e) => setFilterRazao(e.target.value)}
                  className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono transition-all max-w-[200px]"
                >
                  <option value="TODAS">Todas as Razões</option>
                  {availableRazoes.map((rz) => (
                    <option key={rz} value={rz}>{rz}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons: Gerar Relatório e Nova Pesquisa */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            {hasGenerated && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="font-mono text-[11px] text-slate-300">{filterSummary}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700/80 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nova Pesquisa</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-sm"
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
          
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Leituras a Realizar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Leituras a Realizar
                </span>
                <Layers className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-bold font-mono text-white tabular-nums">
                {metrics.totalLeituras.toLocaleString('pt-BR')}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Total de instalações mapeadas no filtro
              </p>
            </div>

            {/* Card 2: Leituras Não Realizadas */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                  Não Realizadas
                </span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-bold font-mono text-rose-400 tabular-nums">
                {metrics.naoRealizadas.toLocaleString('pt-BR')}
              </div>
              <p className="text-[11px] text-rose-300/70 mt-1">
                Impedimentos de leitura catalogados
              </p>
            </div>

            {/* Card 3: Leituras Realizadas */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Leituras Realizadas
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-bold font-mono text-emerald-400 tabular-nums">
                {metrics.realizadas.toLocaleString('pt-BR')}
              </div>
              <p className="text-[11px] text-emerald-300/70 mt-1">
                Total a realizar menos não realizadas
              </p>
            </div>

            {/* Card 4: % de Impedimentos */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  % Impedimentos
                </span>
                <TrendingDown className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-bold font-mono text-amber-400 tabular-nums">
                {formatPercent(metrics.percImpedimentos)}
              </div>
              <p className="text-[11px] text-amber-300/70 mt-1">
                (Não Realizadas / Realizadas)
              </p>
            </div>

          </div>

          {/* 1º PRIMEIRO: Análise de tipo de Leitura (Urbano / Povoado / Rural) */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Análise de tipo de Leitura
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {breakdownByTipo.map((item) => (
                <div
                  key={item.tipo}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                    <span className="text-sm font-bold text-white tracking-wide">
                      {item.tipo}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-cyan-300">
                      {formatPercent(item.pct)} imped.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-[11px] text-slate-500 block font-sans">Total Leitura</span>
                      <span className="text-base font-semibold text-slate-100 tabular-nums">
                        {item.total.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-emerald-400/80 block font-sans">Realizadas</span>
                      <span className="text-base font-semibold text-emerald-400 tabular-nums">
                        {item.realizadas.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-rose-400/80 block font-sans">Não Realizadas</span>
                      <span className="text-base font-semibold text-rose-400 tabular-nums">
                        {item.naoRealizadas.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-amber-400/80 block font-sans">% Impedimento</span>
                      <span className="text-base font-semibold text-amber-400 tabular-nums">
                        {formatPercent(item.pct)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2º DEPOIS: Gráfico de Barras VERTICAIS ("em pé") "Impedimentos por Razão" */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Impedimentos por Razão
                  </h3>
                  <p className="text-xs text-slate-400">
                    Gráfico vertical com exibição do total de impedimentos no topo de cada coluna e detalhamento por Matrícula ao passar o cursor.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {impedimentosByRazao.length} Razões identificadas
              </span>
            </div>

            {impedimentosByRazao.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">Nenhum registro para os filtros selecionados.</p>
            ) : (
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[600px] flex items-end justify-around gap-4 h-[300px] pt-10 pb-4 px-2 border-b border-slate-800">
                  {impedimentosByRazao.map((item) => {
                    const colHeightPercent = Math.max(10, Math.round((item.naoRealizadas / maxRazaoNl) * 100));
                    const isHovered = hoveredRazao === item.rz;

                    return (
                      <div
                        key={item.rz}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer min-w-[55px] max-w-[120px]"
                        onMouseEnter={() => setHoveredRazao(item.rz)}
                        onMouseLeave={() => setHoveredRazao(null)}
                      >
                        {/* Número Total de Impedimentos no TOPO da coluna */}
                        <div className="mb-2 text-center">
                          <span className="font-bold font-mono text-xs text-rose-400 tabular-nums block">
                            {item.naoRealizadas.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 block">
                            {formatPercent(item.pct)}
                          </span>
                        </div>

                        {/* Coluna Vertical Encorpada "em pé" */}
                        <div className="w-full flex justify-center h-[200px] items-end">
                          <div
                            className="w-full max-w-[56px] min-w-[36px] bg-gradient-to-t from-rose-700 via-rose-500 to-amber-400 rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-lg shadow-rose-950/40"
                            style={{ height: `${colHeightPercent}%` }}
                          />
                        </div>

                        {/* Rótulo da Razão na base */}
                        <div className="mt-2 text-center">
                          <span className="font-semibold text-xs text-slate-200 block truncate max-w-[90px]" title={item.rz}>
                            {item.rz}
                          </span>
                        </div>

                        {/* Tooltip com detalhamento por Matrícula */}
                        {isHovered && item.matriculas.length > 0 && (
                          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 p-3 bg-slate-900 border border-cyan-800 rounded-xl shadow-2xl text-xs space-y-2 z-40 animate-fadeIn pointer-events-none">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[11px] font-semibold text-cyan-300">
                              <span className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                Detalhamento por Matrícula ({item.rz})
                              </span>
                              <span>{item.matriculas.length} matr.</span>
                            </div>

                            <div className="text-[11px] text-slate-300 flex justify-between font-mono pb-1 border-b border-slate-800">
                              <span>Total Leituras: <strong>{item.total.toLocaleString('pt-BR')}</strong></span>
                              <span className="text-rose-400 font-bold">{item.naoRealizadas} imp.</span>
                            </div>

                            <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px]">
                              {item.matriculas.map((mat) => (
                                <div
                                  key={mat.matr}
                                  className="flex items-center justify-between px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px]"
                                >
                                  <span className="text-slate-300">Matr. <strong>{mat.matr}</strong></span>
                                  <span className="text-rose-400 font-bold tabular-nums">
                                    {mat.count} imp.
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
            )}
          </div>

        </div>
      )}

    </div>
  );
};
