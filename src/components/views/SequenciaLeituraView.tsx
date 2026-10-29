import React, { useState, useMemo } from 'react';
import { Route, FileSpreadsheet, Printer, Play, Search, MapPin, ArrowDownUp } from 'lucide-react';
import { ReadingRecord, MONTH_NAMES } from '../../types/reading';
import { exportToExcel, printReport } from '../../utils/exportUtils';
import { Pagination } from '../common/Pagination';

interface SequenciaLeituraViewProps {
  records: ReadingRecord[];
}

export const SequenciaLeituraView: React.FC<SequenciaLeituraViewProps> = ({ records }) => {
  // Extract options
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

  // Filters State
  const [filterAno, setFilterAno] = useState<string>('TODOS');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]); // Multi-select
  const [filterMatr, setFilterMatr] = useState<string>('TODOS');
  const [filterUlDe, setFilterUlDe] = useState<string>('');
  const [filterUlPara, setFilterUlPara] = useState<string>('');

  // Local route search input
  const [localSearch, setLocalSearch] = useState<string>('');

  // Active state on clicking "Gerar"
  const [hasGenerated, setHasGenerated] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    ano: 'TODOS',
    months: [] as string[],
    matr: 'TODOS',
    ulDe: '',
    ulPara: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const handleUlDeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterUlDe(e.target.value.replace(/\D/g, '').slice(0, 8));
  };

  const handleUlParaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterUlPara(e.target.value.replace(/\D/g, '').slice(0, 8));
  };

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const handleSelectAllMonths = () => {
    if (selectedMonths.length === availableMonths.length) {
      setSelectedMonths([]);
    } else {
      setSelectedMonths([...availableMonths]);
    }
  };

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveFilters({
      ano: filterAno,
      months: [...selectedMonths],
      matr: filterMatr,
      ulDe: filterUlDe.trim(),
      ulPara: filterUlPara.trim(),
    });
    setHasGenerated(true);
    setCurrentPage(1);
  };

  // Sorted records: Descending order by Data and Hora
  const sortedSequencia = useMemo(() => {
    if (!hasGenerated) return [];

    const filtered = records.filter((r) => {
      if (activeFilters.ano !== 'TODOS' && String(r.ano) !== activeFilters.ano) return false;
      if (activeFilters.months.length > 0 && !activeFilters.months.includes(r.mes)) return false;
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

    // Ordenação decrescente por Data e Hora
    return filtered.sort((a, b) => {
      const dateA = a.data_original || '';
      const dateB = b.data_original || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      const timeA = a.hora_original || '';
      const timeB = b.hora_original || '';
      return timeB.localeCompare(timeA);
    });
  }, [records, hasGenerated, activeFilters]);

  // Find index of matching localSearch for highlighting and route neighbors
  const highlightedIndex = useMemo(() => {
    const q = localSearch.trim().toUpperCase();
    if (!q || sortedSequencia.length === 0) return -1;
    return sortedSequencia.findIndex(
      (r) => r.instalacao.includes(q) || r.medidor.toUpperCase().includes(q)
    );
  }, [sortedSequencia, localSearch]);

  // Route neighbors around highlightedIndex (-2, -1, [match], +1, +2)
  const routeNeighbors = useMemo(() => {
    if (highlightedIndex === -1) return [];
    const start = Math.max(0, highlightedIndex - 2);
    const end = Math.min(sortedSequencia.length, highlightedIndex + 3);
    return sortedSequencia.slice(start, end).map((item, idx) => ({
      item,
      isTarget: start + idx === highlightedIndex,
      relativeIndex: start + idx - highlightedIndex,
    }));
  }, [sortedSequencia, highlightedIndex]);

  // Pagination slice
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedSequencia.slice(start, start + pageSize);
  }, [sortedSequencia, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedSequencia.length / pageSize) || 1;

  const handleExportExcel = () => {
    const data = sortedSequencia.map((r) => ({
      MES: r.mes,
      ANO: r.ano,
      RAZÃO: r.rz,
      UL: r.ul || r.rz_ul_lv,
      INSTALAÇÃO: r.instalacao,
      MEDIDOR: r.medidor,
      REGISTRO: r.reg,
      MATR: r.matr,
      HORA: r.hora_original,
      DATA: r.data_original,
      ENDEREÇO: r.endereco,
    }));
    exportToExcel(data, `Sequencia_Leitura_${activeFilters.ano}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Filter Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            
            {/* Ano */}
            <div>
              <label htmlFor="seq-ano" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Ano
              </label>
              <select
                id="seq-ano"
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

            {/* Matrícula */}
            <div>
              <label htmlFor="seq-matr" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Matrícula
              </label>
              <select
                id="seq-matr"
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
              <label htmlFor="seq-ul-de" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                UL DE (até 8 dígitos)
              </label>
              <input
                id="seq-ul-de"
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
              <label htmlFor="seq-ul-para" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                UL PARA (até 8 dígitos)
              </label>
              <input
                id="seq-ul-para"
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

          {/* Mês (Múltiplo / Multi-select) */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Mês (Seleção Múltipla)
              </label>
              <button
                type="button"
                onClick={handleSelectAllMonths}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
              >
                {selectedMonths.length === availableMonths.length ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 rounded-lg border border-slate-800">
              {availableMonths.map((m) => {
                const isSelected = selectedMonths.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMonth(m)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      isSelected
                        ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Gerar Sequência</span>
            </button>
          </div>
        </form>
      </div>

      {hasGenerated && (
        <div className="space-y-6">
          
          {/* Local Search for Highlighting and Route Neighbors */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                <Search className="w-4 h-4" />
                <span>Localizar Instalação / Medidor e Visualizar Vizinhos de Rota</span>
              </div>

              <div className="w-full sm:w-80 relative">
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Digitar Instalação ou Medidor..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                />
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Route Neighbors Display Panel */}
            {highlightedIndex !== -1 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Janela Sequencial de Rota (Posição {highlightedIndex + 1} de {sortedSequencia.length})
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Registros vizinhos cronológicos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-mono">
                  {routeNeighbors.map(({ item, isTarget, relativeIndex }) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-lg border transition-all ${
                        isTarget
                          ? 'bg-cyan-950/80 border-cyan-500 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400 text-cyan-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 text-[10px]">
                        <span className={`font-semibold ${isTarget ? 'text-cyan-300' : 'text-slate-500'}`}>
                          {relativeIndex === 0 ? '▶ ALVO BUSCADO' : `Vizinho (${relativeIndex > 0 ? `+${relativeIndex}` : relativeIndex})`}
                        </span>
                        <span className="tabular-nums">{item.hora_original}</span>
                      </div>
                      <div className="font-bold text-white text-xs truncate" title={item.instalacao}>
                        Inst: {item.instalacao}
                      </div>
                      <div className="text-[11px] truncate text-slate-400" title={item.medidor}>
                        Med: {item.medidor}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-1">
                        Reg: {item.reg} · UL: {item.ul}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Table (25 por página, ordenação decrescente por Data e Hora) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Route className="w-4 h-4 text-cyan-400" />
                  <span>Sequência Cronológica de Leitura (Ordem Decrescente)</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {sortedSequencia.length} leituras em rota ordenada (25 por página)
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
                    <th className="py-2.5 px-3">MES</th>
                    <th className="py-2.5 px-3">ANO</th>
                    <th className="py-2.5 px-3">RAZÃO</th>
                    <th className="py-2.5 px-3">UL</th>
                    <th className="py-2.5 px-3">INSTALAÇÃO</th>
                    <th className="py-2.5 px-3">MEDIDOR</th>
                    <th className="py-2.5 px-3 text-center">REGISTRO</th>
                    <th className="py-2.5 px-3">MATR</th>
                    <th className="py-2.5 px-3 text-cyan-400 flex items-center gap-1">
                      <ArrowDownUp className="w-3 h-3" />
                      HORA
                    </th>
                    <th className="py-2.5 px-3 text-cyan-400">DATA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300 tabular-nums">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-xs text-slate-500">
                        Nenhum registro encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => {
                      const isTargetMatch =
                        localSearch.trim() &&
                        (row.instalacao.includes(localSearch.trim()) ||
                          row.medidor.toUpperCase().includes(localSearch.trim().toUpperCase()));

                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors ${
                            isTargetMatch
                              ? 'bg-cyan-950/70 border-y-2 border-cyan-400 text-cyan-100 font-bold'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2 px-3 font-sans text-slate-200">{row.mes}</td>
                          <td className="py-2 px-3 text-slate-400">{row.ano}</td>
                          <td className="py-2 px-3 text-slate-300">{row.rz}</td>
                          <td className="py-2 px-3 text-cyan-400 font-semibold">{row.ul || row.rz_ul_lv}</td>
                          <td className="py-2 px-3 text-white font-semibold flex items-center gap-1.5">
                            {isTargetMatch && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 animate-ping" />}
                            {row.instalacao}
                          </td>
                          <td className="py-2 px-3 text-slate-300">{row.medidor}</td>
                          <td className="py-2 px-3 text-center text-slate-400">{row.reg}</td>
                          <td className="py-2 px-3 text-slate-200">{row.matr}</td>
                          <td className="py-2 px-3 text-cyan-300 font-semibold">{row.hora_original}</td>
                          <td className="py-2 px-3 font-sans text-slate-200">{row.data_original}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedSequencia.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>

        </div>
      )}

    </div>
  );
};
