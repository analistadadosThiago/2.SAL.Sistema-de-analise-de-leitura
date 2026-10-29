import React, { useState, useMemo } from 'react';
import { AlertTriangle, FileSpreadsheet, Printer, Play } from 'lucide-react';
import { ReadingRecord, MONTH_NAMES } from '../../types/reading';
import { exportToExcel, printReport, formatPercent } from '../../utils/exportUtils';
import { Pagination } from '../common/Pagination';

interface NosbImpedimentoViewProps {
  records: ReadingRecord[];
}

export const NosbImpedimentoView: React.FC<NosbImpedimentoViewProps> = ({ records }) => {
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

  const availableRazoes = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.rz && set.add(r.rz));
    return Array.from(set).sort();
  }, [records]);

  const availableMatr = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.matr && set.add(r.matr));
    return Array.from(set).sort();
  }, [records]);

  const availableMotivos = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.nosb_impedimento && r.nosb_impedimento.trim()) {
        set.add(r.nosb_impedimento.trim());
      }
    });
    return Array.from(set).sort();
  }, [records]);

  // Filters State
  const [filterAno, setFilterAno] = useState<string>('TODOS');
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [filterRazao, setFilterRazao] = useState<string>('TODAS');
  const [filterMatr, setFilterMatr] = useState<string>('TODOS');
  const [filterMotivo, setFilterMotivo] = useState<string>('TODOS');

  // Triggered on "Gerar"
  const [hasGenerated, setHasGenerated] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    ano: 'TODOS',
    mes: 'TODOS',
    razao: 'TODAS',
    matr: 'TODOS',
    motivo: 'TODOS',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveFilters({
      ano: filterAno,
      mes: filterMes,
      razao: filterRazao,
      matr: filterMatr,
      motivo: filterMotivo,
    });
    setHasGenerated(true);
    setCurrentPage(1);
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    if (!hasGenerated) return [];

    return records.filter((r) => {
      // Must have some NOSB / impedimento or non-empty motivo if filter specifies, or all rows that have nosb_impedimento
      if (activeFilters.ano !== 'TODOS' && String(r.ano) !== activeFilters.ano) return false;
      if (activeFilters.mes !== 'TODOS' && r.mes !== activeFilters.mes) return false;
      if (activeFilters.razao !== 'TODAS' && r.rz !== activeFilters.razao) return false;
      if (activeFilters.matr !== 'TODOS' && r.matr !== activeFilters.matr) return false;

      const rowMotivo = (r.nosb_impedimento || '').trim();
      if (activeFilters.motivo !== 'TODOS') {
        if (rowMotivo !== activeFilters.motivo) return false;
      } else {
        // By default show records that have an impediment/nosb reason
        if (!rowMotivo) return false;
      }

      return true;
    });
  }, [records, hasGenerated, activeFilters]);

  // Relação Quantitativa resumindo por Razão, Motivo e Quantidade de instalações
  const relacaoQuantitativa = useMemo(() => {
    const map = new Map<string, { razao: string; motivo: string; quantidade: number }>();
    let totalInstalacoes = 0;

    filteredData.forEach((r) => {
      const razao = r.rz || 'RZ01';
      const motivo = r.nosb_impedimento || 'SEM MOTIVO ESPECIFICADO';
      const key = `${razao}__${motivo}`;

      const cur = map.get(key) || { razao, motivo, quantidade: 0 };
      cur.quantidade++;
      totalInstalacoes++;
      map.set(key, cur);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentual: totalInstalacoes > 0 ? (item.quantidade / totalInstalacoes) * 100 : 0,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredData]);

  // Pagination slice for Tabela 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  const handleExportTabela1 = () => {
    const data = filteredData.map((r) => ({
      MES: r.mes,
      ANO: r.ano,
      RAZÃO: r.rz,
      UL: r.ul || r.rz_ul_lv,
      INSTALAÇÃO: r.instalacao,
      MEDIDOR: r.medidor,
      REG: r.reg,
      TIPO: r.tipo,
      MATR: r.matr,
      COD: r.nl,
      LEITURA: r.l_atual,
      MOTIVO: r.nosb_impedimento,
    }));
    exportToExcel(data, `NOSB_Impedimento_${activeFilters.mes}_${activeFilters.ano}`);
  };

  const handleExportQuantitativo = () => {
    const data = relacaoQuantitativa.map((r) => ({
      RAZÃO: r.razao,
      MOTIVO: r.motivo,
      'QUANTIDADE INSTALAÇÕES': r.quantidade,
      PERCENTUAL: formatPercent(r.percentual),
    }));
    exportToExcel(data, `NOSB_Resumo_Quantitativo_${activeFilters.mes}_${activeFilters.ano}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Filter Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            
            {/* Ano */}
            <div>
              <label htmlFor="nosb-ano" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Ano
              </label>
              <select
                id="nosb-ano"
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
              <label htmlFor="nosb-mes" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Mês
              </label>
              <select
                id="nosb-mes"
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

            {/* Razão */}
            <div>
              <label htmlFor="nosb-razao" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Razão
              </label>
              <select
                id="nosb-razao"
                value={filterRazao}
                onChange={(e) => setFilterRazao(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="TODAS">Todas</option>
                {availableRazoes.map((rz) => (
                  <option key={rz} value={rz}>{rz}</option>
                ))}
              </select>
            </div>

            {/* Matrícula */}
            <div>
              <label htmlFor="nosb-matr" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Matrícula
              </label>
              <select
                id="nosb-matr"
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

            {/* Motivo */}
            <div>
              <label htmlFor="nosb-motivo" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Motivo Impedimento
              </label>
              <select
                id="nosb-motivo"
                value={filterMotivo}
                onChange={(e) => setFilterMotivo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="TODOS">Todos os Motivos</option>
                {availableMotivos.map((mot) => (
                  <option key={mot} value={mot}>{mot}</option>
                ))}
              </select>
            </div>

          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Gerar Tabela</span>
            </button>
          </div>
        </form>
      </div>

      {hasGenerated && (
        <div className="space-y-6">
          
          {/* Tabela 1: Relação de Dados Selecionados (25 por página) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Relação de Dados Selecionados (Controle de Impressão N'OSB)</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {filteredData.length} registros com impedimento (25 por página)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportTabela1}
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
                    <th className="py-2.5 px-3">REG</th>
                    <th className="py-2.5 px-3">TIPO</th>
                    <th className="py-2.5 px-3">MATR</th>
                    <th className="py-2.5 px-3">COD</th>
                    <th className="py-2.5 px-3 text-right">LEITURA</th>
                    <th className="py-2.5 px-3 text-amber-300">MOTIVO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300 tabular-nums">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-xs text-slate-500">
                        Nenhum registro encontrado para os critérios selecionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2 px-3 font-sans text-slate-200">{row.mes}</td>
                        <td className="py-2 px-3 text-slate-400">{row.ano}</td>
                        <td className="py-2 px-3 text-slate-300">{row.rz}</td>
                        <td className="py-2 px-3 text-cyan-400 font-semibold">{row.ul || row.rz_ul_lv}</td>
                        <td className="py-2 px-3 text-white font-semibold">{row.instalacao}</td>
                        <td className="py-2 px-3 text-slate-300">{row.medidor}</td>
                        <td className="py-2 px-3 text-slate-400">{row.reg}</td>
                        <td className="py-2 px-3 font-sans text-slate-300">{row.tipo}</td>
                        <td className="py-2 px-3 text-slate-200">{row.matr}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-950 text-rose-300 border border-rose-800/50">
                            {row.nl || '0000'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-200">
                          {row.l_atual.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2 px-3 font-sans font-medium text-amber-300">
                          {row.nosb_impedimento || 'Sem Motivo'}
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
              totalItems={filteredData.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Tabela 2: Relação Quantitativa resumindo por Razão, Motivo e Quantidade de instalações */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Relação Quantitativa por Razão e Motivo</span>
                  <span className="text-xs font-mono text-cyan-400 font-normal">
                    ({relacaoQuantitativa.length} grupos consolidados)
                  </span>
                </h4>
              </div>

              <button
                onClick={handleExportQuantitativo}
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar Resumo Excel</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <tr>
                    <th className="py-3 px-4">RAZÃO</th>
                    <th className="py-3 px-4">MOTIVO DO IMPEDIMENTO (NOSB)</th>
                    <th className="py-3 px-4 text-right">QUANTIDADE DE INSTALAÇÕES</th>
                    <th className="py-3 px-4 text-right">DISTRIBUIÇÃO (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono tabular-nums text-slate-300">
                  {relacaoQuantitativa.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-xs text-slate-500">
                        Nenhum motivo catalogado no filtro.
                      </td>
                    </tr>
                  ) : (
                    relacaoQuantitativa.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-sans font-semibold text-slate-200">{item.razao}</td>
                        <td className="py-2.5 px-4 font-sans text-amber-300 font-medium">{item.motivo}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-white text-sm">
                          {item.quantidade.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-4 text-right text-cyan-400 font-semibold">
                          {formatPercent(item.percentual)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
