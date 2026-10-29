import React, { useState, useMemo, useEffect } from 'react';
import { Route, FileSpreadsheet, Printer, Play, RotateCcw, Search, ArrowUp, Info } from 'lucide-react';
import { ReadingRecord, MONTH_NAMES } from '../../types/reading';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
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

  // Filters State: Ano e Mês (seleção simples) lado a lado
  const [filterAno, setFilterAno] = useState<string>('TODOS');
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [filterMatr, setFilterMatr] = useState<string>('TODOS');
  const [filterUlDe, setFilterUlDe] = useState<string>('');
  const [filterUlPara, setFilterUlPara] = useState<string>('');

  // Local route search input
  const [localSearch, setLocalSearch] = useState<string>('');

  // Active state on clicking "Gerar"
  const [hasGenerated, setHasGenerated] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    ano: 'TODOS',
    mes: 'TODOS',
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

  const handleReset = () => {
    setFilterAno('TODOS');
    setFilterMes('TODOS');
    setFilterMatr('TODOS');
    setFilterUlDe('');
    setFilterUlPara('');
    setLocalSearch('');
    setActiveFilters({
      ano: 'TODOS',
      mes: 'TODOS',
      matr: 'TODOS',
      ulDe: '',
      ulPara: '',
    });
    setHasGenerated(false);
    setCurrentPage(1);
  };

  // Sorted records: Ordenação CRESCENTE por Horário (do menor para o maior)
  const sortedSequencia = useMemo(() => {
    if (!hasGenerated) return [];

    const filtered = records.filter((r) => {
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

    // Ordenação do menor horário para o maior (ordem crescente)
    return filtered.sort((a, b) => {
      const dateA = a.data_original || '';
      const dateB = b.data_original || '';
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      const timeA = a.hora_original || '';
      const timeB = b.hora_original || '';
      return timeA.localeCompare(timeB); // Crescente
    });
  }, [records, hasGenerated, activeFilters]);

  // Find index of matching localSearch
  const highlightedGlobalIndex = useMemo(() => {
    const q = localSearch.trim().toUpperCase();
    if (!q || sortedSequencia.length === 0) return -1;
    return sortedSequencia.findIndex(
      (r) => (r.instalacao || '').includes(q) || (r.medidor || '').toUpperCase().includes(q)
    );
  }, [sortedSequencia, localSearch]);

  // Auto navigate to the page containing the searched target row
  useEffect(() => {
    if (highlightedGlobalIndex !== -1) {
      const targetPage = Math.floor(highlightedGlobalIndex / pageSize) + 1;
      setCurrentPage(targetPage);
    }
  }, [highlightedGlobalIndex, pageSize]);

  // Pagination slice
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedSequencia.slice(start, start + pageSize);
  }, [sortedSequencia, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedSequencia.length / pageSize) || 1;

  // Exact Sequence: MES | ANO | RAZÃO | UL | INSTALAÇÃO | MEDIDOR | REGISTRO | LEITURA | MATR | HORA | DATA
  const handleExportExcel = () => {
    const data = sortedSequencia.map((r) => ({
      MES: r.mes,
      ANO: r.ano,
      RAZÃO: r.rz,
      UL: r.rz_ul_lv,
      INSTALAÇÃO: r.instalacao,
      MEDIDOR: r.medidor,
      REGISTRO: r.reg,
      LEITURA: r.l_atual,
      MATR: r.matr,
      HORA: r.hora_original,
      DATA: r.data_original,
    }));
    exportToExcel(
      data,
      `Sequencia_Leitura_${activeFilters.mes}_${activeFilters.ano}`,
      `Sequência de Leitura (${activeFilters.mes}/${activeFilters.ano})`
    );
  };

  const handleExportPdf = () => {
    const data = sortedSequencia.map((r) => ({
      MES: r.mes,
      ANO: r.ano,
      RAZÃO: r.rz,
      UL: r.rz_ul_lv,
      INSTALAÇÃO: r.instalacao,
      MEDIDOR: r.medidor,
      REGISTRO: r.reg,
      LEITURA: r.l_atual,
      MATR: r.matr,
      HORA: r.hora_original,
      DATA: r.data_original,
    }));
    exportToPdf(
      data,
      `Sequencia_Leitura_${activeFilters.mes}_${activeFilters.ano}`,
      `Sequência de Leitura (${activeFilters.mes}/${activeFilters.ano})`
    );
  };

  const filterSummary = useMemo(() => {
    const anoText = activeFilters.ano === 'TODOS' ? 'Todos' : activeFilters.ano;
    const mesText = activeFilters.mes === 'TODOS' ? 'Todos' : activeFilters.mes;
    const matrText = activeFilters.matr === 'TODOS' ? 'Todas' : activeFilters.matr;
    const ulText = activeFilters.ulDe || activeFilters.ulPara ? `UL: ${activeFilters.ulDe || 'Início'} a ${activeFilters.ulPara || 'Fim'}` : 'Todas as ULs';
    return `Filtro: Ano: ${anoText} | Mês: ${mesText} | Matrícula: ${matrText} | ${ulText} (${sortedSequencia.length} leituras em sequência crescente)`;
  }, [activeFilters, sortedSequencia.length]);

  return (
    <div className="space-y-6">
      
      {/* Title at top */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
          <Route className="w-5 h-5 text-cyan-400" />
          <span>7. Sequência de Leitura</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Auditoria de rota sequencial ordenada por horário crescente com destaque direto de vizinhos de rota na tabela.
        </p>
      </div>

      {/* Filter Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            
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

            {/* Mês (Seleção Simples ao lado do Ano) */}
            <div>
              <label htmlFor="seq-mes" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Mês
              </label>
              <select
                id="seq-mes"
                value={filterMes}
                onChange={(e) => setFilterMes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="TODOS">Todos os Meses</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
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
                <span>Gerar Sequência</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {hasGenerated && (
        <div className="space-y-6">
          
          {/* Table: Sequência de Leitura (Com destaque direto de vizinhos de rota em VERDE CLARO) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Route className="w-4 h-4 text-cyan-400" />
                  <span>Sequência de Leitura</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {sortedSequencia.length} leituras em ordem crescente de horário (25 por página)
                </span>
              </div>

              {/* Local Search for Highlighting Route Neighbors directly in table */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-80">
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Destacar Instalação / Medidor e vizinhos..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500 pointer-events-none" />
                </div>

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
                {/* Exact Sequence: MES | ANO | RAZÃO | UL | INSTALAÇÃO | MEDIDOR | REGISTRO | LEITURA | MATR | HORA | DATA */}
                <thead className="bg-slate-950/90 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <tr>
                    <th className="py-3 px-3.5">MES</th>
                    <th className="py-3 px-3.5">ANO</th>
                    <th className="py-3 px-3.5">RAZÃO</th>
                    <th className="py-3 px-3.5">UL</th>
                    <th className="py-3 px-3.5">INSTALAÇÃO</th>
                    <th className="py-3 px-3.5">MEDIDOR</th>
                    <th className="py-3 px-3.5 text-center">REGISTRO</th>
                    <th className="py-3 px-3.5 text-right">LEITURA</th>
                    <th className="py-3 px-3.5">MATR</th>
                    <th className="py-3 px-3.5 text-cyan-400 flex items-center gap-1">
                      <ArrowUp className="w-3 h-3" />
                      HORA
                    </th>
                    <th className="py-3 px-3.5 text-cyan-400">DATA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300 tabular-nums">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-xs text-slate-500">
                        Nenhum registro encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idxOnPage) => {
                      const globalIdx = (currentPage - 1) * pageSize + idxOnPage;
                      const hasSearch = Boolean(localSearch.trim() && highlightedGlobalIndex !== -1);
                      const isExactTarget = hasSearch && globalIdx === highlightedGlobalIndex;
                      const diff = hasSearch ? globalIdx - highlightedGlobalIndex : 999;
                      const isNeighbor = hasSearch && Math.abs(diff) > 0 && Math.abs(diff) <= 2;

                      // DESTAQUE DA LINHA PESQUISADA E DOS VIZINHOS DE ROTA EM VERDE CLARO
                      let rowStyle = 'hover:bg-slate-800/40 transition-colors';
                      let statusBadge = null;

                      if (isExactTarget) {
                        rowStyle = 'bg-emerald-500/35 text-white font-bold border-l-4 border-l-emerald-400 transition-colors';
                        statusBadge = (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-emerald-600 text-white font-sans uppercase tracking-wider shrink-0">
                            Alvo
                          </span>
                        );
                      } else if (isNeighbor) {
                        rowStyle = 'bg-emerald-500/15 text-emerald-100 font-semibold border-l-2 border-l-emerald-400/60 transition-colors';
                        statusBadge = (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-sans tracking-wide shrink-0">
                            Vizinho {diff > 0 ? `+${diff}` : diff}
                          </span>
                        );
                      }

                      return (
                        <tr key={row.id} className={rowStyle}>
                          <td className="py-2.5 px-3.5 font-sans text-slate-200">{row.mes}</td>
                          <td className="py-2.5 px-3.5 text-slate-400">{row.ano}</td>
                          <td className="py-2.5 px-3.5 text-slate-300">{row.rz}</td>
                          <td className="py-2.5 px-3.5 text-cyan-400 font-semibold">{row.rz_ul_lv || row.ul}</td>
                          <td className="py-2.5 px-3.5 font-semibold text-white">
                            <div className="flex items-center">
                              <span>{row.instalacao}</span>
                              {statusBadge}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-300">{row.medidor}</td>
                          <td className="py-2.5 px-3.5 text-center text-slate-400">{row.reg}</td>
                          <td className="py-2.5 px-3.5 text-right font-medium text-slate-100">{row.l_atual.toLocaleString('pt-BR')}</td>
                          <td className="py-2.5 px-3.5 text-slate-200">{row.matr}</td>
                          <td className="py-2.5 px-3.5 text-cyan-300 font-semibold">{row.hora_original}</td>
                          <td className="py-2.5 px-3.5 font-sans text-slate-200">{row.data_original}</td>
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
