import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Sparkles,
  ClipboardCheck,
  FileSpreadsheet,
  Printer,
  Play,
  RotateCcw,
  Hash,
  Gauge,
  Info,
} from 'lucide-react';
import { ReadingRecord, MONTH_NAMES } from '../../types/reading';
import { exportToExcel, exportToPdf, formatPercent } from '../../utils/exportUtils';
import { Pagination } from '../common/Pagination';

interface NosbViewProps {
  records: ReadingRecord[];
  mode?: 'impedimento' | 'simulacao' | 'consistencia';
}

export const NosbImpedimentoView: React.FC<NosbViewProps> = ({ records, mode = 'impedimento' }) => {
  const isSimulacao = mode === 'simulacao';
  const isConsistencia = mode === 'consistencia';

  const menuTitle = isConsistencia
    ? '3.3. Controle de Consistência'
    : isSimulacao
    ? '5.2. N’OSB SIMULAÇÃO'
    : "5.1. N'OSB – Impedimento";

  const fieldLabel = isConsistencia
    ? 'Motivo de Consistência'
    : isSimulacao
    ? 'Motivo Simulação'
    : 'Motivo Impedimento';

  const tabela1MotivoHeader = isConsistencia
    ? 'MOTIVO DA CONSISTENCIA'
    : isSimulacao
    ? 'MOTIVO SIMULAÇÃO'
    : 'MOTIVO IMPEDIMENTO';

  const tabela2MotivoHeader = isConsistencia ? 'CONSISTENCIA' : 'MOTIVO';

  // Helper to extract value from record according to active mode
  const getRecordMotivo = (r: ReadingRecord): string => {
    if (isConsistencia) return (r.consistencia || '').trim();
    if (isSimulacao) return (r.nosb_simulacao || '').trim();
    return (r.nosb_impedimento || '').trim();
  };

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
      const val = getRecordMotivo(r);
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [records, mode]);

  // Filters State
  const [filterAno, setFilterAno] = useState<string>('TODOS');
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [filterRazao, setFilterRazao] = useState<string>('TODAS');
  const [filterMatr, setFilterMatr] = useState<string>('TODOS');
  const [filterMotivo, setFilterMotivo] = useState<string>('TODOS');

  // Local table search inputs for Instalação and Medidor
  const [localSearchInst, setLocalSearchInst] = useState<string>('');
  const [localSearchMed, setLocalSearchMed] = useState<string>('');

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

  const handleReset = () => {
    setFilterAno('TODOS');
    setFilterMes('TODOS');
    setFilterRazao('TODAS');
    setFilterMatr('TODOS');
    setFilterMotivo('TODOS');
    setLocalSearchInst('');
    setLocalSearchMed('');
    setActiveFilters({
      ano: 'TODOS',
      mes: 'TODOS',
      razao: 'TODAS',
      matr: 'TODOS',
      motivo: 'TODOS',
    });
    setHasGenerated(false);
    setCurrentPage(1);
  };

  // Base filtered data
  const baseFilteredData = useMemo(() => {
    if (!hasGenerated) return [];

    return records.filter((r) => {
      if (activeFilters.ano !== 'TODOS' && String(r.ano) !== activeFilters.ano) return false;
      if (activeFilters.mes !== 'TODOS' && r.mes !== activeFilters.mes) return false;
      if (activeFilters.razao !== 'TODAS' && r.rz !== activeFilters.razao) return false;
      if (activeFilters.matr !== 'TODOS' && r.matr !== activeFilters.matr) return false;

      const rowMotivo = getRecordMotivo(r);
      if (activeFilters.motivo !== 'TODOS') {
        if (rowMotivo !== activeFilters.motivo) return false;
      } else {
        if (!rowMotivo) return false;
      }

      return true;
    });
  }, [records, hasGenerated, activeFilters, mode]);

  // TABELA 1 (NO TOPO): Relação Quantitativa por Razão e Motivo
  const relacaoQuantitativa = useMemo(() => {
    const map = new Map<string, { razao: string; motivo: string; quantidade: number }>();
    let totalInstalacoes = 0;

    baseFilteredData.forEach((r) => {
      const razao = r.rz || 'RZ01';
      const motivo = getRecordMotivo(r) || 'SEM ESPECIFICAÇÃO';
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
  }, [baseFilteredData, mode]);

  // TABELA 2 (LOGO ABAIXO): Relação de Dados Selecionados (with local Instalação / Medidor search)
  const dadosSelecionados = useMemo(() => {
    return baseFilteredData.filter((r) => {
      if (localSearchInst.trim()) {
        const qClean = localSearchInst.trim().toUpperCase().replace(/[^0-9]/g, '');
        const rClean = (r.instalacao || '').toUpperCase().replace(/[^0-9]/g, '');
        if (!rClean.includes(qClean)) return false;
      }
      if (localSearchMed.trim()) {
        const qClean = localSearchMed.trim().toUpperCase();
        const rClean = (r.medidor || '').toUpperCase();
        if (!rClean.includes(qClean)) return false;
      }
      return true;
    });
  }, [baseFilteredData, localSearchInst, localSearchMed]);

  // Pagination slice for Tabela 2
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return dadosSelecionados.slice(start, start + pageSize);
  }, [dadosSelecionados, currentPage, pageSize]);

  const totalPages = Math.ceil(dadosSelecionados.length / pageSize) || 1;

  const handleExportQuantitativo = () => {
    const data = relacaoQuantitativa.map((r) => ({
      RAZÃO: r.razao,
      [tabela1MotivoHeader]: r.motivo,
      'QUANTIDADE INSTALAÇÕES': r.quantidade,
      Indicador: formatPercent(r.percentual),
    }));
    exportToExcel(
      data,
      `${isConsistencia ? 'Consistencia' : isSimulacao ? 'NOSB_Simulacao' : 'NOSB_Impedimento'}_Resumo_${activeFilters.mes}_${activeFilters.ano}`,
      `${menuTitle} - Relação Quantitativa (${activeFilters.mes}/${activeFilters.ano})`
    );
  };

  const handleExportPdf = () => {
    const data = relacaoQuantitativa.map((item) => ({
      RAZÃO: item.razao,
      [tabela1MotivoHeader]: item.motivo,
      QUANTIDADE: item.quantidade,
      Indicador: formatPercent(item.percentual),
    }));
    exportToPdf(
      data,
      `${isConsistencia ? 'Consistencia' : isSimulacao ? 'NOSB_Simulacao' : 'NOSB_Impedimento'}_Resumo_${activeFilters.mes}_${activeFilters.ano}`,
      `${menuTitle} - Relação Quantitativa (${activeFilters.mes}/${activeFilters.ano})`
    );
  };

  const handleExportTabelaDados = () => {
    const data = dadosSelecionados.map((r) => ({
      MES: r.mes,
      ANO: r.ano,
      RAZÃO: r.rz,
      UL: r.rz_ul_lv || r.ul,
      INSTALAÇÃO: r.instalacao,
      MEDIDOR: r.medidor,
      REG: r.reg,
      TIPO: r.tipo,
      MATR: r.matr,
      COD: r.nl,
      LEITURA: r.l_atual,
      [tabela2MotivoHeader]: getRecordMotivo(r),
    }));
    exportToExcel(
      data,
      `${isConsistencia ? 'Consistencia' : isSimulacao ? 'NOSB_Simulacao' : 'NOSB_Impedimento'}_Dados_${activeFilters.mes}_${activeFilters.ano}`,
      `${menuTitle} - Relação de Dados Selecionados (${activeFilters.mes}/${activeFilters.ano})`
    );
  };

  const handleExportDadosPdf = () => {
    const data = dadosSelecionados.map((r) => ({
      MES: r.mes,
      ANO: r.ano,
      RAZÃO: r.rz,
      UL: r.rz_ul_lv || r.ul,
      INSTALAÇÃO: r.instalacao,
      MEDIDOR: r.medidor,
      REG: r.reg,
      TIPO: r.tipo,
      MATR: r.matr,
      COD: r.nl,
      LEITURA: r.l_atual,
      [tabela2MotivoHeader]: getRecordMotivo(r),
    }));
    exportToPdf(
      data,
      `${isConsistencia ? 'Consistencia' : isSimulacao ? 'NOSB_Simulacao' : 'NOSB_Impedimento'}_Dados_${activeFilters.mes}_${activeFilters.ano}`,
      `${menuTitle} - Relação de Dados Selecionados (${activeFilters.mes}/${activeFilters.ano})`
    );
  };

  // Filter summary string
  const filterSummary = useMemo(() => {
    const anoText = activeFilters.ano === 'TODOS' ? 'Todos' : activeFilters.ano;
    const mesText = activeFilters.mes === 'TODOS' ? 'Todos' : activeFilters.mes;
    const rzText = activeFilters.razao === 'TODAS' ? 'Todas' : activeFilters.razao;
    const matrText = activeFilters.matr === 'TODOS' ? 'Todas' : activeFilters.matr;
    const motText = activeFilters.motivo === 'TODOS' ? 'Todos' : activeFilters.motivo;
    return `Filtro: Ano: ${anoText} | Mês: ${mesText} | Razão: ${rzText} | Matr.: ${matrText} | ${fieldLabel}: ${motText} (${baseFilteredData.length} registros)`;
  }, [activeFilters, baseFilteredData.length, fieldLabel]);

  return (
    <div className="space-y-6">
      
      {/* Title at top */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
          {isConsistencia ? (
            <ClipboardCheck className="w-5 h-5 text-emerald-400" />
          ) : isSimulacao ? (
            <Sparkles className="w-5 h-5 text-cyan-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <span>{menuTitle}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {isConsistencia
            ? 'Controle, validação e auditoria dos registros de consistência das leituras.'
            : isSimulacao
            ? 'Controle e auditoria de registros com simulação de faturamento e leitura.'
            : 'Controle de impressão N’OSB por motivos de impedimento e divergências de campo.'}
        </p>
      </div>

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
                Razão (rz)
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
                {availableMatr.map((mat) => (
                  <option key={mat} value={mat}>{mat}</option>
                ))}
              </select>
            </div>

            {/* Motivo Selector */}
            <div>
              <label htmlFor="nosb-motivo" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 truncate" title={fieldLabel}>
                {fieldLabel}
              </label>
              <select
                id="nosb-motivo"
                value={filterMotivo}
                onChange={(e) => setFilterMotivo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="TODOS">Todos</option>
                {availableMotivos.map((mot) => (
                  <option key={mot} value={mot}>{mot}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
            {hasGenerated ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="font-mono text-[11px] text-slate-300">{filterSummary}</span>
              </div>
            ) : <div />}

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
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Gerar Relatório</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {hasGenerated && (
        <div className="space-y-6">
          
          {/* TABELA 1: Relação Quantitativa por Razão e Motivo */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Relação Quantitativa por Razão e Motivo</span>
                  <span className="text-xs font-mono text-cyan-400 font-normal">
                    ({relacaoQuantitativa.length} grupos consolidados)
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportQuantitativo}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  title="Exportar Resumo Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar Resumo Excel</span>
                </button>
                <button
                  onClick={handleExportPdf}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  title="Exportar PDF"
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
                    <th className="py-3 px-3.5">RAZÃO</th>
                    <th className="py-3 px-3.5">{tabela1MotivoHeader}</th>
                    <th className="py-3 px-3.5 text-right">QUANTIDADE DE INSTALAÇÕES</th>
                    <th className="py-3 px-3.5 text-right">Indicador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono tabular-nums text-slate-300">
                  {relacaoQuantitativa.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-xs text-slate-500">
                        Nenhum registro catalogado no filtro.
                      </td>
                    </tr>
                  ) : (
                    relacaoQuantitativa.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-200">{item.razao}</td>
                        <td className="py-2.5 px-3.5 font-sans text-amber-300 font-medium">{item.motivo}</td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-white text-sm">
                          {item.quantidade.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3.5 text-right text-cyan-400 font-semibold">
                          {formatPercent(item.percentual)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABELA 2: Relação de Dados Selecionados */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Relação de Dados Selecionados</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {dadosSelecionados.length} registros selecionados (25 por página)
                </span>
              </div>

              {/* Campos de busca local por INSTALAÇÃO e MEDIDOR */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                  <input
                    type="text"
                    value={localSearchInst}
                    onChange={(e) => {
                      setLocalSearchInst(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Filtrar Instalação..."
                    className="pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono w-36 sm:w-44"
                  />
                </div>

                <div className="relative">
                  <Gauge className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                  <input
                    type="text"
                    value={localSearchMed}
                    onChange={(e) => {
                      setLocalSearchMed(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Filtrar Medidor..."
                    className="pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono w-36 sm:w-44"
                  />
                </div>

                <button
                  onClick={handleExportTabelaDados}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  title="Exportar para Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar Excel</span>
                </button>
                <button
                  onClick={handleExportDadosPdf}
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
                    <th className="py-3 px-3.5">MES</th>
                    <th className="py-3 px-3.5">ANO</th>
                    <th className="py-3 px-3.5">RAZÃO</th>
                    <th className="py-3 px-3.5">UL</th>
                    <th className="py-3 px-3.5">INSTALAÇÃO</th>
                    <th className="py-3 px-3.5">MEDIDOR</th>
                    <th className="py-3 px-3.5 text-center">REG</th>
                    <th className="py-3 px-3.5">TIPO</th>
                    <th className="py-3 px-3.5">MATR</th>
                    <th className="py-3 px-3.5">COD</th>
                    <th className="py-3 px-3.5 text-right">LEITURA</th>
                    <th className="py-3 px-3.5 text-amber-300">{tabela2MotivoHeader}</th>
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
                        <td className="py-2.5 px-3.5 font-sans text-slate-200">{row.mes}</td>
                        <td className="py-2.5 px-3.5 text-slate-400">{row.ano}</td>
                        <td className="py-2.5 px-3.5 text-slate-300">{row.rz}</td>
                        <td className="py-2.5 px-3.5 text-cyan-400 font-semibold">{row.rz_ul_lv || row.ul}</td>
                        <td className="py-2.5 px-3.5 text-white font-semibold">{row.instalacao}</td>
                        <td className="py-2.5 px-3.5 text-slate-300">{row.medidor}</td>
                        <td className="py-2.5 px-3.5 text-center text-slate-400">{row.reg}</td>
                        <td className="py-2.5 px-3.5 font-sans text-slate-300">{row.tipo}</td>
                        <td className="py-2.5 px-3.5 text-slate-200">{row.matr}</td>
                        <td className="py-2.5 px-3.5">
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-950 text-rose-300 border border-rose-800/50">
                            {row.nl || '0000'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-medium text-slate-200">
                          {row.l_atual.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3.5 font-sans font-medium text-amber-300">
                          {getRecordMotivo(row) || 'Sem Registro'}
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
              totalItems={dadosSelecionados.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>

        </div>
      )}

    </div>
  );
};
