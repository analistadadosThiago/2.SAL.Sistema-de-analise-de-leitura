import React, { useState, useMemo } from 'react';
import { Clock, FileSpreadsheet, Printer, Play, RotateCcw, UserCheck, Info } from 'lucide-react';
import { ReadingRecord, MONTH_NAMES } from '../../types/reading';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';

interface ControleHorarioViewProps {
  records: ReadingRecord[];
}

interface HorarioGroupRow {
  matricula: string;
  data: string;
  horaInicial: string;
  horaFinal: string;
  tempoServico: string; // HH:MM
  tempoServicoMinutos: number;
  totalLeituras: number;
  cadenciaLeiturasHora: string;
  tempoMedioPorLeitura: string;
}

/**
 * Robust date matching utility handling all Google Sheets representations
 */
function matchesSelectedDate(rawDateVal: any, selectedYMD: string): boolean {
  if (!selectedYMD) return true;
  if (!rawDateVal) return false;

  const raw = String(rawDateVal).trim();
  if (raw === selectedYMD || raw.startsWith(selectedYMD)) return true;

  const parts = selectedYMD.split('-');
  if (parts.length !== 3) return false;

  const selYearNum = parseInt(parts[0], 10);
  const selMonthNum = parseInt(parts[1], 10);
  const selDayNum = parseInt(parts[2], 10);

  // Format 1: DD/MM/YYYY or DD-MM-YYYY
  const brMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const d = parseInt(brMatch[1], 10);
    const m = parseInt(brMatch[2], 10);
    const y = parseInt(brMatch[3], 10);
    if (d === selDayNum && m === selMonthNum && y === selYearNum) {
      return true;
    }
  }

  // Format 2: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (d === selDayNum && m === selMonthNum && y === selYearNum) {
      return true;
    }
  }

  // Format 3: Substring search (e.g. "02/03/2026" inside timestamp)
  const brTarget = `${String(selDayNum).padStart(2, '0')}/${String(selMonthNum).padStart(2, '0')}/${selYearNum}`;
  if (raw.includes(brTarget)) return true;

  // Format 4: Standard Date Parse
  const parsed = Date.parse(raw);
  if (!isNaN(parsed)) {
    const dt = new Date(parsed);
    if (
      (dt.getUTCFullYear() === selYearNum && dt.getUTCMonth() + 1 === selMonthNum && dt.getUTCDate() === selDayNum) ||
      (dt.getFullYear() === selYearNum && dt.getMonth() + 1 === selMonthNum && dt.getDate() === selDayNum)
    ) {
      return true;
    }
  }

  return false;
}

export const ControleHorarioView: React.FC<ControleHorarioViewProps> = ({ records }) => {
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
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [filterData, setFilterData] = useState<string>(''); // YYYY-MM-DD
  const [filterMatr, setFilterMatr] = useState<string>('TODOS');

  // Triggered on "Gerar Relatório"
  const [hasGenerated, setHasGenerated] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    ano: 'TODOS',
    mes: 'TODOS',
    data: '',
    matr: 'TODOS',
  });

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveFilters({
      ano: filterAno,
      mes: filterMes,
      data: filterData,
      matr: filterMatr,
    });
    setHasGenerated(true);
  };

  const handleReset = () => {
    setFilterAno('TODOS');
    setFilterMes('TODOS');
    setFilterData('');
    setFilterMatr('TODOS');
    setActiveFilters({
      ano: 'TODOS',
      mes: 'TODOS',
      data: '',
      matr: 'TODOS',
    });
    setHasGenerated(false);
  };

  // Convert time string "HH:MM:SS" or "HH:MM" to total seconds from midnight
  const parseTimeToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(':').map((p) => parseInt(p, 10));
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    return h * 3600 + m * 60 + s;
  };

  // Group by MATRICULA and DATA
  const horarioRows = useMemo(() => {
    if (!hasGenerated) return [];

    const filtered = records.filter((r) => {
      if (activeFilters.ano !== 'TODOS' && String(r.ano) !== activeFilters.ano) return false;
      if (activeFilters.mes !== 'TODOS' && r.mes !== activeFilters.mes) return false;
      if (activeFilters.matr !== 'TODOS' && r.matr !== activeFilters.matr) return false;
      if (activeFilters.data && !matchesSelectedDate(r.data_original, activeFilters.data)) return false;
      return true;
    });

    const groups = new Map<string, { matricula: string; data: string; records: ReadingRecord[] }>();

    filtered.forEach((r) => {
      const mat = r.matr || 'SEM_MATR';
      const dt = r.data_original || 'SEM_DATA';
      const key = `${mat}__${dt}`;

      const cur = groups.get(key) || { matricula: mat, data: dt, records: [] };
      cur.records.push(r);
      groups.set(key, cur);
    });

    const results: HorarioGroupRow[] = [];

    groups.forEach((group) => {
      let minSec = Infinity;
      let maxSec = -Infinity;
      let minTimeStr = '--:--';
      let maxTimeStr = '--:--';

      group.records.forEach((rec) => {
        const timeStr = rec.hora_original || '';
        if (timeStr) {
          const sec = parseTimeToSeconds(timeStr);
          if (sec < minSec) {
            minSec = sec;
            minTimeStr = timeStr.slice(0, 8);
          }
          if (sec > maxSec) {
            maxSec = sec;
            maxTimeStr = timeStr.slice(0, 8);
          }
        }
      });

      let diffMinutes = 0;
      if (minSec !== Infinity && maxSec !== -Infinity && maxSec >= minSec) {
        diffMinutes = Math.round((maxSec - minSec) / 60);
      }

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      const formattedTempoServico = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      const totalLeituras = group.records.length;
      const totalHours = diffMinutes / 60;
      const cadencia = totalHours > 0 ? (totalLeituras / totalHours).toFixed(1) : totalLeituras.toString();
      const avgMinutesPerReading = totalLeituras > 0 ? (diffMinutes / totalLeituras).toFixed(1) : '0';

      results.push({
        matricula: group.matricula,
        data: group.data,
        horaInicial: minTimeStr,
        horaFinal: maxTimeStr,
        tempoServico: `${formattedTempoServico}h`,
        tempoServicoMinutos: diffMinutes,
        totalLeituras,
        cadenciaLeiturasHora: `${cadencia} L/H`,
        tempoMedioPorLeitura: `${avgMinutesPerReading} min/l`,
      });
    });

    return results.sort((a, b) => b.data.localeCompare(a.data) || a.matricula.localeCompare(b.matricula));
  }, [records, hasGenerated, activeFilters]);

  const handleExportExcel = () => {
    const data = horarioRows.map((r) => ({
      MATRÍCULA: r.matricula,
      DATA: r.data,
      'HORA INICIAL': r.horaInicial,
      'HORA FINAL': r.horaFinal,
      'TEMPO DE SERVIÇO': r.tempoServico,
      'TOTAL LEITURAS': r.totalLeituras,
      'TEMPO (L/H)': `${r.cadenciaLeiturasHora} (${r.tempoMedioPorLeitura})`,
    }));
    exportToExcel(
      data,
      `Controle_Horario_${activeFilters.mes}_${activeFilters.ano}`,
      `Relatório de Horário (${activeFilters.mes}/${activeFilters.ano})`
    );
  };

  const handleExportPdf = () => {
    const data = horarioRows.map((r) => ({
      MATRÍCULA: r.matricula,
      DATA: r.data,
      'HORA INICIAL': r.horaInicial,
      'HORA FINAL': r.horaFinal,
      'TEMPO DE SERVIÇO': r.tempoServico,
      'TOTAL LEITURAS': r.totalLeituras,
      'TEMPO (L/H)': `${r.cadenciaLeiturasHora} (${r.tempoMedioPorLeitura})`,
    }));
    exportToPdf(
      data,
      `Controle_Horario_${activeFilters.mes}_${activeFilters.ano}`,
      `Relatório de Horário (${activeFilters.mes}/${activeFilters.ano})`
    );
  };

  const filterSummary = useMemo(() => {
    const anoText = activeFilters.ano === 'TODOS' ? 'Todos' : activeFilters.ano;
    const mesText = activeFilters.mes === 'TODOS' ? 'Todos' : activeFilters.mes;
    const matrText = activeFilters.matr === 'TODOS' ? 'Todas' : activeFilters.matr;
    const dataText = activeFilters.data ? `Data: ${activeFilters.data}` : 'Todas as Datas';
    return `Filtro: Ano: ${anoText} | Mês: ${mesText} | ${dataText} | Matrícula: ${matrText} (${horarioRows.length} jornadas identificadas)`;
  }, [activeFilters, horarioRows.length]);

  return (
    <div className="space-y-6">
      
      {/* Title at top */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-cyan-400" />
          <span>6. Controle de Horário</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Auditoria de jornada diária, primeira e última leitura e velocidade de atendimento operacional.
        </p>
      </div>

      {/* Filter Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            
            {/* Ano */}
            <div>
              <label htmlFor="horario-ano" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Ano
              </label>
              <select
                id="horario-ano"
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
              <label htmlFor="horario-mes" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Mês
              </label>
              <select
                id="horario-mes"
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

            {/* DATA */}
            <div>
              <label htmlFor="horario-data" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                DATA
              </label>
              <input
                id="horario-data"
                type="date"
                value={filterData}
                onChange={(e) => setFilterData(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              />
            </div>

            {/* Matrícula */}
            <div>
              <label htmlFor="horario-matr" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Matrícula
              </label>
              <select
                id="horario-matr"
                value={filterMatr}
                onChange={(e) => setFilterMatr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="TODOS">Todas as Matrículas</option>
                {availableMatr.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
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
                <span>Gerar Relatório</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main Results Table: Relatório de Horário (Padronizada) */}
      {hasGenerated && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Relatório de Horário</span>
              </h3>
              <span className="text-xs text-slate-400">
                {horarioRows.length} jornadas consolidadas
              </span>
            </div>

            <div className="flex items-center gap-2">
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
              <thead className="bg-slate-950/90 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                <tr>
                  <th className="py-3 px-4">MATRÍCULA</th>
                  <th className="py-3 px-4">DATA</th>
                  <th className="py-3 px-4 text-cyan-400">HORA INICIAL</th>
                  <th className="py-3 px-4 text-cyan-400">HORA FINAL</th>
                  <th className="py-3 px-4">TEMPO DE SERVIÇO</th>
                  <th className="py-3 px-4 text-right">TOTAL LEITURAS</th>
                  <th className="py-3 px-4 text-right text-emerald-400">TEMPO (L/H)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums text-slate-300">
                {horarioRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-slate-500">
                      Nenhum registro encontrado para a data e filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  horarioRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                        {row.matricula}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-sans">{row.data}</td>
                      <td className="py-3 px-4 text-cyan-300 font-semibold">{row.horaInicial}</td>
                      <td className="py-3 px-4 text-cyan-300 font-semibold">{row.horaFinal}</td>
                      <td className="py-3 px-4 font-bold text-slate-100">{row.tempoServico}</td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        {row.totalLeituras.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold">
                        <span>{row.cadenciaLeiturasHora}</span>
                        <span className="text-slate-500 font-normal ml-2">({row.tempoMedioPorLeitura})</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
