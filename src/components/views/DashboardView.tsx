import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Layers,
  Filter,
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

  // Filter states
  const [selectedYear, setSelectedYear] = useState<string>('TODOS');
  const [selectedMonth, setSelectedMonth] = useState<string>('TODOS');
  const [selectedRazao, setSelectedRazao] = useState<string>('TODAS');

  // Filter records based on active filters
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedYear !== 'TODOS' && String(r.ano) !== selectedYear) return false;
      if (selectedMonth !== 'TODOS' && r.mes !== selectedMonth) return false;
      if (selectedRazao !== 'TODAS' && r.rz !== selectedRazao) return false;
      return true;
    });
  }, [records, selectedYear, selectedMonth, selectedRazao]);

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

  // Breakdown by Razão for charts
  const impedimentosByRazao = useMemo(() => {
    const map = new Map<string, { total: number; naoRealizadas: number; realizadas: number }>();
    filteredRecords.forEach((r) => {
      const rz = r.rz || 'Não Informado';
      const cur = map.get(rz) || { total: 0, naoRealizadas: 0, realizadas: 0 };
      cur.total++;
      if (IMPEDIMENT_CODES.has(String(r.nl || '').trim())) {
        cur.naoRealizadas++;
      } else {
        cur.realizadas++;
      }
      map.set(rz, cur);
    });

    return Array.from(map.entries())
      .map(([rz, d]) => ({
        rz,
        total: d.total,
        naoRealizadas: d.naoRealizadas,
        realizadas: d.realizadas,
        pct: d.realizadas > 0 ? (d.naoRealizadas / d.realizadas) * 100 : 0,
      }))
      .sort((a, b) => b.naoRealizadas - a.naoRealizadas);
  }, [filteredRecords]);

  // Month-over-Month comparison
  const impedimentosByMonth = useMemo(() => {
    const map = new Map<string, { total: number; naoRealizadas: number; realizadas: number }>();
    records.forEach((r) => {
      if (selectedYear !== 'TODOS' && String(r.ano) !== selectedYear) return;
      if (selectedRazao !== 'TODAS' && r.rz !== selectedRazao) return;
      const m = r.mes || 'Outro';
      const cur = map.get(m) || { total: 0, naoRealizadas: 0, realizadas: 0 };
      cur.total++;
      if (IMPEDIMENT_CODES.has(String(r.nl || '').trim())) {
        cur.naoRealizadas++;
      } else {
        cur.realizadas++;
      }
      map.set(m, cur);
    });

    return Array.from(map.entries())
      .map(([mes, d]) => ({
        mes,
        total: d.total,
        naoRealizadas: d.naoRealizadas,
        realizadas: d.realizadas,
        pct: d.realizadas > 0 ? (d.naoRealizadas / d.realizadas) * 100 : 0,
      }))
      .sort((a, b) => {
        const idxA = MONTH_NAMES.indexOf(a.mes);
        const idxB = MONTH_NAMES.indexOf(b.mes);
        return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
      });
  }, [records, selectedYear, selectedRazao]);

  // 3 Bottom Cards divided by 'tipo'
  const breakdownByTipo = useMemo(() => {
    const map = new Map<string, { total: number; naoRealizadas: number; realizadas: number }>();
    
    // Seed default common types or extract from data
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
    // Ensure URBANO, POVOADO, RURAL representation if available
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

  const maxRazaoNl = Math.max(...impedimentosByRazao.map((x) => x.naoRealizadas), 1);
  const maxMonthNl = Math.max(...impedimentosByMonth.map((x) => x.naoRealizadas), 1);

  return (
    <div className="space-y-6">
      
      {/* Top Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>Filtros do Painel Executivo</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Ano Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <label htmlFor="filter-ano" className="text-slate-400 font-medium">Ano:</label>
              <select
                id="filter-ano"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="TODOS">Todos os Anos</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Mês Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <label htmlFor="filter-mes" className="text-slate-400 font-medium">Mês:</label>
              <select
                id="filter-mes"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="TODOS">Todos os Meses</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Razão Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <label htmlFor="filter-razao" className="text-slate-400 font-medium">Razão (rz):</label>
              <select
                id="filter-razao"
                value={selectedRazao}
                onChange={(e) => setSelectedRazao(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="TODAS">Todas as Razões</option>
                {availableRazoes.map((rz) => (
                  <option key={rz} value={rz}>{rz}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

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

      {/* Charts Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Impedimentos por Razão */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">
                  Impedimentos por Razão (rz)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">Total Razões: {impedimentosByRazao.length}</span>
            </div>

            <div className="space-y-3.5 pt-2">
              {impedimentosByRazao.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Nenhum dado encontrado para os filtros.</p>
              ) : (
                impedimentosByRazao.map((item) => {
                  const barWidth = Math.max(4, Math.round((item.naoRealizadas / maxRazaoNl) * 100));
                  return (
                    <div key={item.rz} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200 truncate max-w-[200px]" title={item.rz}>
                          {item.rz}
                        </span>
                        <div className="flex items-center gap-2 text-slate-400 font-mono tabular-nums">
                          <span className="text-rose-400 font-semibold">{item.naoRealizadas} imped.</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-300">{formatPercent(item.pct)}</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-300"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Chart 2: Comparativo Mês a Mês */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">
                  Comparativo Mês a Mês ({selectedYear === 'TODOS' ? 'Histórico Geral' : selectedYear})
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">Não Realizadas</span>
            </div>

            <div className="space-y-3.5 pt-2">
              {impedimentosByMonth.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Nenhum dado de mês catalogado.</p>
              ) : (
                impedimentosByMonth.map((item) => {
                  const barWidth = Math.max(4, Math.round((item.naoRealizadas / maxMonthNl) * 100));
                  return (
                    <div key={item.mes} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200">{item.mes}</span>
                        <div className="flex items-center gap-2 font-mono tabular-nums">
                          <span className="text-rose-400 font-semibold">{item.naoRealizadas} NL</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-emerald-400">{item.realizadas} Realiz.</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-amber-400">{formatPercent(item.pct)}</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-rose-500 rounded-full transition-all duration-300"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 3 Lower Cards: Divididos pelo campo 'tipo' */}
      <div>
        <div className="mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Segmentação por Tipo de Instalação (Urbano / Povoado / Rural)
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

    </div>
  );
};
