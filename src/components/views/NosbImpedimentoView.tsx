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
  BarChart3,
  Layers,
  Users,
  Filter,
} from 'lucide-react';
import { ReadingRecord, MONTH_NAMES } from '../../types/reading';
import { exportToExcel, exportToPdf, formatPercent } from '../../utils/exportUtils';
import { Pagination } from '../common/Pagination';

interface NosbViewProps {
  records: ReadingRecord[];
  mode?: 'impedimento' | 'simulacao' | 'consistencia';
}

interface GroupedPorLeituristaMotivo {
  id: string;
  mes: string;
  ano: string;
  razao: string;
  ul: string;
  matr: string;
  motivo: string;
  quantidade: number;
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

  // Helper to extract value from record according to active mode, strictly excluding "FATURADA"
  const getRecordMotivo = (r: ReadingRecord): string => {
    let val = '';
    if (isConsistencia) val = (r.consistencia || '').trim();
    else if (isSimulacao) val = (r.nosb_simulacao || '').trim();
    else val = (r.nosb_impedimento || '').trim();

    // FILTRAGEM DE "FATURADA": ocultar / excluir registros cujo motivo seja "Faturada"
    if (!val || val.toUpperCase() === 'FATURADA') {
      return '';
    }
    return val;
  };

  // Extract options (excluding "FATURADA")
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
      if (val && val.toUpperCase() !== 'FATURADA') set.add(val);
    });
    return Array.from(set).sort();
  }, [records, mode]);

  // Filters State
  const [filterAno, setFilterAno] = useState<string>('TODOS');
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [filterRazao, setFilterRazao] = useState<string>('TODAS');
  const [filterMatr, setFilterMatr] = useState<string>('TODOS');
  const [filterMotivo, setFilterMotivo] = useState<string>('TODOS');

  // Tabs for the second section: 'analitico' vs 'leiturista'
  const [activeTab, setActiveTab] = useState<'analitico' | 'leiturista'>('analitico');

  // Local search inputs and motive dropdown for Dados por Leiturista
  const [localSearchInst, setLocalSearchInst] = useState<string>('');
  const [localSearchMed, setLocalSearchMed] = useState<string>('');
  const [localSearchMatr, setLocalSearchMatr] = useState<string>('');
  const [filterLeituristaMotivo, setFilterLeituristaMotivo] = useState<string>('TODOS');

  // Triggered on "Gerar"
  const [hasGenerated, setHasGenerated] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    ano: 'TODOS',
    mes: 'TODOS',
    razao: 'TODAS',
    matr: 'TODOS',
    motivo: 'TODOS',
  });

  const [currentPageAnalitico, setCurrentPageAnalitico] = useState(1);
  const [currentPageLeiturista, setCurrentPageLeiturista] = useState(1);
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
    setCurrentPageAnalitico(1);
    setCurrentPageLeiturista(1);
  };

  const handleReset = () => {
    setFilterAno('TODOS');
    setFilterMes('TODOS');
    setFilterRazao('TODAS');
    setFilterMatr('TODOS');
    setFilterMotivo('TODOS');
    setLocalSearchInst('');
    setLocalSearchMed('');
    setLocalSearchMatr('');
    setFilterLeituristaMotivo('TODOS');
    setActiveFilters({
      ano: 'TODOS',
      mes: 'TODOS',
      razao: 'TODAS',
      matr: 'TODOS',
      motivo: 'TODOS',
    });
    setHasGenerated(false);
    setCurrentPageAnalitico(1);
    setCurrentPageLeiturista(1);
  };

  // Base filtered data strictly excluding "FATURADA"
  const baseFilteredData = useMemo(() => {
    if (!hasGenerated) return [];

    return records.filter((r) => {
      if (activeFilters.ano !== 'TODOS' && String(r.ano) !== activeFilters.ano) return false;
      if (activeFilters.mes !== 'TODOS' && r.mes !== activeFilters.mes) return false;
      if (activeFilters.razao !== 'TODAS' && r.rz !== activeFilters.razao) return false;
      if (activeFilters.matr !== 'TODOS' && r.matr !== activeFilters.matr) return false;

      const rowMotivo = getRecordMotivo(r);
      // Se for vazio ou "FATURADA", exclui rigorosamente
      if (!rowMotivo || rowMotivo.toUpperCase() === 'FATURADA') return false;

      if (activeFilters.motivo !== 'TODOS') {
        if (rowMotivo !== activeFilters.motivo) return false;
      }

      return true;
    });
  }, [records, hasGenerated, activeFilters, mode]);

  // TABELA 1: Relação Quantitativa por Razão e Motivo
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

  // Gráfico de Colunas Verticais: Top Ocorrências por Motivo
  const motivosChartData = useMemo(() => {
    const map = new Map<string, number>();
    baseFilteredData.forEach((r) => {
      const mot = getRecordMotivo(r);
      if (mot) {
        map.set(mot, (map.get(mot) || 0) + 1);
      }
    });

    const list = Array.from(map.entries())
      .map(([motivo, count]) => ({
        motivo,
        count,
        pct: baseFilteredData.length > 0 ? (count / baseFilteredData.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return list.slice(0, 8); // Top 8 motivos
  }, [baseFilteredData, mode]);

  // TABELA 2: Relação de Dados Selecionados (Analítico)
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

  // TABELA 2: Nova Aba "Dados por Leiturista"
  // Estrutura exata: MÊS | ANO | RAZÃO | UL | MATR | CONSISTENCIA (ou MOTIVO) | QUANTIDADE
  const allLeituristaGrouped = useMemo(() => {
    const map = new Map<string, GroupedPorLeituristaMotivo>();

    baseFilteredData.forEach((r) => {
      const mes = r.mes || '-';
      const ano = String(r.ano || '-');
      const razao = r.rz || 'RZ01';
      const ul = r.rz_ul_lv || r.ul || '-';
      const matr = r.matr || '-';
      const motivo = getRecordMotivo(r) || '-';

      const key = `${mes}__${ano}__${razao}__${ul}__${matr}__${motivo}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantidade += 1;
      } else {
        map.set(key, {
          id: key,
          mes,
          ano,
          razao,
          ul,
          matr,
          motivo,
          quantidade: 1,
        });
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => b.quantidade - a.quantidade);
    return list;
  }, [baseFilteredData, mode]);

  // Lista dinâmica de motivos presentes exclusivamente na tabela de dados por leiturista
  const motivosPresentesNaTabelaLeiturista = useMemo(() => {
    const set = new Set<string>();
    allLeituristaGrouped.forEach((item) => {
      if (item.motivo && item.motivo !== '-') {
        set.add(item.motivo);
      }
    });
    return Array.from(set).sort();
  }, [allLeituristaGrouped]);

  // Tabela filtrada por Matrícula e pelo Menu Suspenso de Motivo
  const dadosPorLeiturista = useMemo(() => {
    return allLeituristaGrouped.filter((item) => {
      if (localSearchMatr.trim() && !item.matr.toUpperCase().includes(localSearchMatr.trim().toUpperCase())) {
        return false;
      }
      if (filterLeituristaMotivo !== 'TODOS' && item.motivo !== filterLeituristaMotivo) {
        return false;
      }
      return true;
    });
  }, [allLeituristaGrouped, localSearchMatr, filterLeituristaMotivo]);

  // Pagination for Analítico
  const paginatedDataAnalitico = useMemo(() => {
    const start = (currentPageAnalitico - 1) * pageSize;
    return dadosSelecionados.slice(start, start + pageSize);
  }, [dadosSelecionados, currentPageAnalitico, pageSize]);

  const totalPagesAnalitico = Math.ceil(dadosSelecionados.length / pageSize) || 1;

  // Pagination for Dados por Leiturista
  const paginatedDataLeiturista = useMemo(() => {
    const start = (currentPageLeiturista - 1) * pageSize;
    return dadosPorLeiturista.slice(start, start + pageSize);
  }, [dadosPorLeiturista, currentPageLeiturista, pageSize]);

  const totalPagesLeiturista = Math.ceil(dadosPorLeiturista.length / pageSize) || 1;

  // Exports
  const handleExportQuantitativo = () => {
    const data = relacaoQuantitativa.map((r) => ({
      RAZÃO: r.razao,
      [tabela1MotivoHeader]: r.motivo,
      'QUANTIDADE DE INSTALAÇÕES': r.quantidade,
      INDICADOR: formatPercent(r.percentual),
    }));
    exportToExcel(
      data,
      `Resumo_${mode}_${activeFilters.mes}_${activeFilters.ano}`,
      `Resumo Quantitativo (${mode})`
    );
  };

  const handleExportPdf = () => {
    const data = relacaoQuantitativa.map((r) => ({
      RAZÃO: r.razao,
      [tabela1MotivoHeader]: r.motivo,
      QUANTIDADE: r.quantidade,
      INDICADOR: formatPercent(r.percentual),
    }));
    exportToPdf(
      data,
      `Resumo_${mode}_${activeFilters.mes}_${activeFilters.ano}`,
      `Resumo Quantitativo (${mode})`
    );
  };

  const handleExportTabelaDados = () => {
    const data = dadosSelecionados.map((r) => ({
      MES: r.mes,
      ANO: r.ano,
      RAZÃO: r.rz,
      UL: r.rz_ul_lv || r.ul || '',
      INSTALAÇÃO: r.instalacao,
      MEDIDOR: r.medidor,
      REG: r.reg,
      TIPO: r.tipo,
      MATR: r.matr,
      COD: r.nl || '',
      LEITURA: r.l_atual,
      [tabela2MotivoHeader]: getRecordMotivo(r),
    }));
    exportToExcel(
      data,
      `Dados_${mode}_${activeFilters.mes}_${activeFilters.ano}`,
      `Relatório de Dados (${mode})`
    );
  };

  const handleExportDadosPdf = () => {
    const data = dadosSelecionados.map((r) => ({
      MES: r.mes,
      ANO: r.ano,
      RAZÃO: r.rz,
      UL: r.rz_ul_lv || r.ul || '',
      INSTALAÇÃO: r.instalacao,
      MEDIDOR: r.medidor,
      MATR: r.matr,
      COD: r.nl || '',
      LEITURA: r.l_atual,
      [tabela2MotivoHeader]: getRecordMotivo(r),
    }));
    exportToPdf(
      data,
      `Dados_${mode}_${activeFilters.mes}_${activeFilters.ano}`,
      `Relatório de Dados (${mode})`
    );
  };

  const handleExportLeituristaExcel = () => {
    const data = dadosPorLeiturista.map((r) => ({
      MÊS: r.mes,
      ANO: r.ano,
      RAZÃO: r.razao,
      UL: r.ul,
      MATR: r.matr,
      [tabela2MotivoHeader]: r.motivo,
      QUANTIDADE: r.quantidade,
    }));
    exportToExcel(
      data,
      `Dados_Por_Leiturista_${mode}_${activeFilters.mes}_${activeFilters.ano}`,
      `Dados por Leiturista (${mode})`
    );
  };

  const handleExportLeituristaPdf = () => {
    const data = dadosPorLeiturista.map((r) => ({
      MÊS: r.mes,
      ANO: r.ano,
      RAZÃO: r.razao,
      UL: r.ul,
      MATR: r.matr,
      [tabela2MotivoHeader]: r.motivo,
      QUANTIDADE: r.quantidade,
    }));
    exportToPdf(
      data,
      `Dados_Por_Leiturista_${mode}_${activeFilters.mes}_${activeFilters.ano}`,
      `Dados por Leiturista (${mode})`
    );
  };

  const filterSummary = useMemo(() => {
    const anoText = activeFilters.ano === 'TODOS' ? 'Todos' : activeFilters.ano;
    const mesText = activeFilters.mes === 'TODOS' ? 'Todos' : activeFilters.mes;
    const rzText = activeFilters.razao === 'TODAS' ? 'Todas' : activeFilters.razao;
    const matrText = activeFilters.matr === 'TODOS' ? 'Todas' : activeFilters.matr;
    const motText = activeFilters.motivo === 'TODOS' ? 'Todos (excl. Faturada)' : activeFilters.motivo;
    return `Filtro: Ano: ${anoText} | Mês: ${mesText} | Razão: ${rzText} | Matr.: ${matrText} | Motivo: ${motText} (${baseFilteredData.length} registros válidos)`;
  }, [activeFilters, baseFilteredData.length]);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
          {isConsistencia ? (
            <ClipboardCheck className="w-5 h-5 text-cyan-400" />
          ) : isSimulacao ? (
            <Sparkles className="w-5 h-5 text-cyan-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <span>{menuTitle}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {isConsistencia
            ? 'Auditoria consolidada de consistência com exclusão automática de faturadas e visão por leiturista.'
            : isSimulacao
            ? 'Impressões e auditoria de N’OSB com simulação sem faturadas e agrupamento por leiturista.'
            : 'Controle de impedimentos e emissão de N’OSB operacional sem faturadas e visão por leiturista.'}
        </p>
      </div>

      {/* Filter Form Panel */}
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

            {/* Motivo Selector (Sem 'Faturada') */}
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
                <option value="TODOS">Todos (exceto Faturada)</option>
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
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700/80 transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nova Pesquisa</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
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
          
          {/* GRÁFICO DE COLUNAS VERTICAIS: Ocorrências por Motivo */}
          {motivosChartData.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Distribuição dos Principais Motivos (Colunas Verticais)
                  </h3>
                </div>
                <span className="text-xs font-mono text-cyan-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                  {motivosChartData.length} motivos mais frequentes
                </span>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="min-w-[500px] flex items-end justify-around gap-4 h-[250px] pt-10 pb-3 px-2 border-b border-slate-800">
                  {motivosChartData.map((item) => {
                    const maxVal = motivosChartData[0]?.count || 1;
                    const colHeight = Math.max(12, Math.round((item.count / maxVal) * 100));

                    return (
                      <div
                        key={item.motivo}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-[55px] max-w-[110px]"
                      >
                        {/* Quantidade e percentual fixados permanentemente no topo da coluna */}
                        <div className="flex flex-col items-center mb-1.5 leading-none">
                          <span className="font-bold font-mono text-xs sm:text-sm text-cyan-300 tabular-nums">
                            {item.count.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold mt-0.5">
                            {formatPercent(item.pct)}
                          </span>
                        </div>

                        {/* Barra Vertical Encorpada */}
                        <div className="w-full flex justify-center h-[160px] items-end">
                          <div
                            className="w-full max-w-[52px] min-w-[34px] bg-gradient-to-t from-cyan-700 via-cyan-500 to-emerald-400 rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-lg shadow-cyan-950/40"
                            style={{ height: `${colHeight}%` }}
                          />
                        </div>

                        {/* Rótulo na base */}
                        <div className="mt-2 text-center w-full">
                          <span className="text-[11px] font-semibold text-slate-300 block truncate max-w-[95px] mx-auto" title={item.motivo}>
                            {item.motivo}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
                  type="button"
                  onClick={handleExportQuantitativo}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  title="Exportar Resumo Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar Resumo Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
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
                        Nenhum registro para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    relacaoQuantitativa.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3.5 text-slate-200">{item.razao}</td>
                        <td className="py-2.5 px-3.5 font-sans font-medium text-amber-300">{item.motivo}</td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-white">
                          {item.quantidade.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-semibold text-cyan-300">
                          {formatPercent(item.percentual)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABELA 2: Relação de Dados com Abas "Dados Analíticos" e "Dados por Leiturista" */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            
            {/* Nav Tabs & Local Search */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('analitico')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'analitico'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Relação de Dados Selecionados</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/30 font-mono">
                    {dadosSelecionados.length}
                  </span>
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
                  <span>Dados por Leiturista</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/30 font-mono">
                    {dadosPorLeiturista.length}
                  </span>
                </button>
              </div>

              {/* Action Buttons for active tab */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
                {activeTab === 'analitico' ? (
                  <>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                      <input
                        type="text"
                        value={localSearchInst}
                        onChange={(e) => {
                          setLocalSearchInst(e.target.value);
                          setCurrentPageAnalitico(1);
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
                          setCurrentPageAnalitico(1);
                        }}
                        placeholder="Filtrar Medidor..."
                        className="pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono w-36 sm:w-44"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleExportTabelaDados}
                      className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      title="Exportar para Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Exportar Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportDadosPdf}
                      className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      title="Exportar para PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-300" />
                      <span>Exportar PDF</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <Users className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                      <input
                        type="text"
                        value={localSearchMatr}
                        onChange={(e) => {
                          setLocalSearchMatr(e.target.value);
                          setCurrentPageLeiturista(1);
                        }}
                        placeholder="Filtrar Matrícula..."
                        className="pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono w-32 sm:w-40"
                      />
                    </div>

                    {/* Menu Suspenso Dinâmico para Filtrar por Motivo */}
                    <div className="relative flex items-center">
                      <Filter className="w-3.5 h-3.5 absolute left-2.5 text-cyan-400 pointer-events-none" />
                      <select
                        value={filterLeituristaMotivo}
                        onChange={(e) => {
                          setFilterLeituristaMotivo(e.target.value);
                          setCurrentPageLeiturista(1);
                        }}
                        className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 max-w-[210px] truncate cursor-pointer font-medium"
                        title="Filtrar por Motivo"
                      >
                        <option value="TODOS">Todos os Motivos ({motivosPresentesNaTabelaLeiturista.length})</option>
                        {motivosPresentesNaTabelaLeiturista.map((mot) => (
                          <option key={mot} value={mot}>
                            {mot}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportLeituristaExcel}
                      className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      title="Exportar Dados por Leiturista (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Exportar Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportLeituristaPdf}
                      className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      title="Exportar Dados por Leiturista PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-300" />
                      <span>Exportar PDF</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* TAB CONTENT 1: Relação de Dados Selecionados (Analítico) */}
            {activeTab === 'analitico' && (
              <>
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
                      {paginatedDataAnalitico.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-xs text-slate-500">
                            Nenhum registro encontrado para os critérios selecionados.
                          </td>
                        </tr>
                      ) : (
                        paginatedDataAnalitico.map((row) => (
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
                  currentPage={currentPageAnalitico}
                  totalPages={totalPagesAnalitico}
                  totalItems={dadosSelecionados.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPageAnalitico}
                />
              </>
            )}

            {/* TAB CONTENT 2: Nova Aba "Dados por Leiturista" */}
            {/* Estrutura: MÊS | ANO | RAZÃO | UL | MATR | CONSISTENCIA (ou MOTIVO) | QUANTIDADE */}
            {activeTab === 'leiturista' && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-950/90 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                      <tr>
                        <th className="py-3 px-3.5">MÊS</th>
                        <th className="py-3 px-3.5">ANO</th>
                        <th className="py-3 px-3.5">RAZÃO</th>
                        <th className="py-3 px-3.5">UL</th>
                        <th className="py-3 px-3.5">MATR</th>
                        <th className="py-3 px-3.5 text-amber-300">{tabela2MotivoHeader}</th>
                        <th className="py-3 px-3.5 text-right text-cyan-300">QUANTIDADE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300 tabular-nums">
                      {paginatedDataLeiturista.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-xs text-slate-500">
                            Nenhum registro agrupado encontrado para os critérios selecionados.
                          </td>
                        </tr>
                      ) : (
                        paginatedDataLeiturista.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3.5 font-sans text-slate-200">{row.mes}</td>
                            <td className="py-2.5 px-3.5 text-slate-400">{row.ano}</td>
                            <td className="py-2.5 px-3.5 text-slate-300">{row.razao}</td>
                            <td className="py-2.5 px-3.5 text-cyan-400 font-semibold">{row.ul}</td>
                            <td className="py-2.5 px-3.5 text-white font-semibold">{row.matr}</td>
                            <td className="py-2.5 px-3.5 font-sans font-medium text-amber-300">{row.motivo}</td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-cyan-300">
                              {row.quantidade.toLocaleString('pt-BR')}
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
                  totalItems={dadosPorLeiturista.length}
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
