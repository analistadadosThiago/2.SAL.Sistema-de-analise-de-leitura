import React, { useState, useMemo } from 'react';
import { Users, FileSpreadsheet, Printer, BarChart3, Play } from 'lucide-react';
import { ReadingRecord, IMPEDIMENT_CODES, MONTH_NAMES } from '../../types/reading';
import { exportToExcel, printReport, formatPercent } from '../../utils/exportUtils';
import { Pagination } from '../common/Pagination';

interface ControleLeituristaViewProps {
  records: ReadingRecord[];
}

interface GroupedLeituristaRow {
  id: string;
  ano: string;
  mes: string;
  razao: string;
  ul: string;
  matr: string;
  leitUrb: number;
  leitPovoado: number;
  leitRural: number;
  leitTotal: number;
  impedimentos: number;
  indicador: number; // percentage
}

export const ControleLeituristaView: React.FC<ControleLeituristaViewProps> = ({ records }) => {
  // Extract options for dropdowns
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

  // Filter Form State
  const [filterAno, setFilterAno] = useState<string>('TODOS');
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [filterMatr, setFilterMatr] = useState<string>('TODOS');
  const [filterUlDe, setFilterUlDe] = useState<string>('');
  const [filterUlPara, setFilterUlPara] = useState<string>('');

  // Active query committed on clicking "Gerar"
  const [hasGenerated, setHasGenerated] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    ano: 'TODOS',
    mes: 'TODOS',
    matr: 'TODOS',
    ulDe: '',
    ulPara: '',
  });

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

  // Group and compute metrics based on activeFilters
  const { groupedRows, totals, chartData } = useMemo(() => {
    if (!hasGenerated) {
      return { groupedRows: [], totals: { urb: 0, pov: 0, rur: 0, total: 0 }, chartData: [] };
    }

    const filtered = records.filter((r) => {
      if (activeFilters.ano !== 'TODOS' && String(r.ano) !== activeFilters.ano) return false;
      if (activeFilters.mes !== 'TODOS' && r.mes !== activeFilters.mes) return false;
      if (activeFilters.matr !== 'TODOS' && r.matr !== activeFilters.matr) return false;

      // UL Range: check numeric value of rz_ul_lv or ul against UL DE and UL PARA
      const targetUlNum = parseInt(String(r.rz_ul_lv || r.ul || '0').replace(/\D/g, ''), 10);
      if (activeFilters.ulDe) {
        const deNum = parseInt(activeFilters.ulDe, 10);
        if (!isNaN(deNum) && targetUlNum < deNum) return false;
      }
      if (activeFilters.ulPara) {
        const paraNum = parseInt(activeFilters.ulPara, 10);
        if (!isNaN(paraNum) && targetUlNum > paraNum) return false;
      }

      return true;
    });

    // Grouping by ANO + MES + RAZAO + UL + MATR
    const groupMap = new Map<string, GroupedLeituristaRow>();
    let totalUrb = 0;
    let totalPov = 0;
    let totalRur = 0;

    filtered.forEach((r) => {
      const ano = String(r.ano || '');
      const mes = r.mes || '';
      const razao = r.rz || 'RZ01';
      const ul = r.ul || r.rz_ul_lv || '-';
      const matr = r.matr || '-';
      const key = `${ano}_${mes}_${razao}_${ul}_${matr}`;

      let row = groupMap.get(key);
      if (!row) {
        row = {
          id: key,
          ano,
          mes,
          razao,
          ul,
          matr,
          leitUrb: 0,
          leitPovoado: 0,
          leitRural: 0,
          leitTotal: 0,
          impedimentos: 0,
          indicador: 0,
        };
        groupMap.set(key, row);
      }

      const tipoUpper = (r.tipo || '').toUpperCase();
      if (tipoUpper.includes('POV')) {
        row.leitPovoado++;
        totalPov++;
      } else if (tipoUpper.includes('RUR')) {
        row.leitRural++;
        totalRur++;
      } else {
        row.leitUrb++;
        totalUrb++;
      }

      row.leitTotal++;

      if (IMPEDIMENT_CODES.has(String(r.nl || '').trim())) {
        row.impedimentos++;
      }
    });

    const rows: GroupedLeituristaRow[] = Array.from(groupMap.values()).map((row) => ({
      ...row,
      indicador: row.leitTotal > 0 ? (row.impedimentos / row.leitTotal) * 100 : 0,
    }));

    // Sort descending by impedimentos
    rows.sort((a, b) => b.impedimentos - a.impedimentos);

    // Prepare chart: top leituristas/ULs sorted descending by impedimentos
    const chart = rows.slice(0, 10).map((r) => ({
      label: `Matr. ${r.matr} (UL ${r.ul})`,
      impedimentos: r.impedimentos,
      total: r.leitTotal,
      indicador: r.indicador,
    }));

    return {
      groupedRows: rows,
      totals: {
        urb: totalUrb,
        pov: totalPov,
        rur: totalRur,
        total: totalUrb + totalPov + totalRur,
      },
      chartData: chart,
    };
  }, [records, hasGenerated, activeFilters]);

  // Pagination slice
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedRows.slice(start, start + pageSize);
  }, [groupedRows, currentPage, pageSize]);

  const totalPages = Math.ceil(groupedRows.length / pageSize) || 1;

  const handleExportExcel = () => {
    const exportData = groupedRows.map((r) => ({
      ANO: r.ano,
      MES: r.mes,
      RAZAO: r.razao,
      UL: r.ul,
      MATR: r.matr,
      'LEIT. URB': r.leitUrb,
      'LEIT. POVOADO': r.leitPovoado,
      'LEIT. RURAL': r.leitRural,
      'LEIT. TOTAL': r.leitTotal,
      IMPEDIMENTOS: r.impedimentos,
      'INDICADOR (INFM)': formatPercent(r.indicador),
    }));
    exportToExcel(exportData, `Controle_Leiturista_${activeFilters.mes}_${activeFilters.ano}`);
  };

  const maxChartImpedimentos = Math.max(...chartData.map((c) => c.impedimentos), 1);

  return (
    <div className="space-y-6">
      
      {/* Filters Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            
            {/* Ano */}
            <div>
              <label htmlFor="leiturista-ano" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Ano
              </label>
              <select
                id="leiturista-ano"
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
              <label htmlFor="leiturista-mes" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Mês
              </label>
              <select
                id="leiturista-mes"
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
              <label htmlFor="leiturista-matr" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Matrícula
              </label>
              <select
                id="leiturista-matr"
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
              <label htmlFor="leiturista-ul-de" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                UL DE (até 8 dígitos)
              </label>
              <input
                id="leiturista-ul-de"
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
              <label htmlFor="leiturista-ul-para" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                UL PARA (até 8 dígitos)
              </label>
              <input
                id="leiturista-ul-para"
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

      {/* 4 Cards no topo: Leit. Urb, Leit. Povoado, Leit. Rural e Total */}
      {hasGenerated && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Leit. Urbano
            </span>
            <div className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
              {totals.urb.toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Leit. Povoado
            </span>
            <div className="text-2xl font-bold font-mono text-blue-400 tabular-nums">
              {totals.pov.toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Leit. Rural
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {totals.rur.toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 block mb-1">
              Total de Leituras
            </span>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {totals.total.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      )}

      {/* Table & Chart Section */}
      {hasGenerated && (
        <div className="space-y-6">
          
          {/* Table: Relação de Impedimentos */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Relação de Impedimentos por Leiturista / UL</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {groupedRows.length} registros agrupados (20 por página)
                </span>
              </div>

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

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">ANO</th>
                    <th className="py-2.5 px-3">MES</th>
                    <th className="py-2.5 px-3">RAZAO</th>
                    <th className="py-2.5 px-3">UL</th>
                    <th className="py-2.5 px-3">MATR</th>
                    <th className="py-2.5 px-3 text-right">LEIT. URB</th>
                    <th className="py-2.5 px-3 text-right">LEIT. POVOADO</th>
                    <th className="py-2.5 px-3 text-right">LEIT. RURAL</th>
                    <th className="py-2.5 px-3 text-right">LEIT. TOTAL</th>
                    <th className="py-2.5 px-3 text-right text-rose-300">IMPEDIMENTOS</th>
                    <th className="py-2.5 px-3 text-right text-amber-300">INDICADOR (INFM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300 tabular-nums">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-xs text-slate-500">
                        Nenhum registro encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400">{row.ano}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-200">{row.mes}</td>
                        <td className="py-2.5 px-3 text-slate-300">{row.razao}</td>
                        <td className="py-2.5 px-3 text-cyan-400 font-semibold">{row.ul}</td>
                        <td className="py-2.5 px-3 text-white font-semibold">{row.matr}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">{row.leitUrb}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">{row.leitPovoado}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">{row.leitRural}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-100">{row.leitTotal}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                          {row.impedimentos}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400">
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
              totalItems={groupedRows.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Gráfico ordenado em ordem decrescente por impedimentos */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-400" />
                <span>Ranking Decrescente de Impedimentos por Leiturista / Rota</span>
              </h4>
              <span className="text-xs text-slate-400 font-mono">Top 10 Maiores Focos</span>
            </div>

            <div className="space-y-3 pt-2">
              {chartData.map((item) => {
                const barWidth = Math.max(5, Math.round((item.impedimentos / maxChartImpedimentos) * 100));
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-200 font-medium">{item.label}</span>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-rose-400 font-bold">{item.impedimentos} impedimentos</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-400">{item.total} leituras</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-amber-400 font-semibold">{formatPercent(item.indicador)}</span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-600 rounded-full transition-all duration-300"
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
