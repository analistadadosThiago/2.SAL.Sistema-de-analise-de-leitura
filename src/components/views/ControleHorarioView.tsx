import React, { useState, useMemo } from 'react';
import { Clock, FileSpreadsheet, Printer, Play, Calendar, UserCheck } from 'lucide-react';
import { ReadingRecord, MONTH_NAMES } from '../../types/reading';
import { exportToExcel, printReport } from '../../utils/exportUtils';

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
  const [filterData, setFilterData] = useState<string>(''); // calendar input YYYY-MM-DD
  const [filterMatr, setFilterMatr] = useState<string>('TODOS');

  // Triggered on "Gerar"
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
      if (activeFilters.data && r.data_original && !r.data_original.includes(activeFilters.data)) return false;
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
      // Find earliest and latest hora_original
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
        cadenciaLeiturasHora: `${cadencia} leituras/hora`,
        tempoMedioPorLeitura: `${avgMinutesPerReading} min/leitura`,
      });
    });

    // Sort by data descending then matricula
    return results.sort((a, b) => b.data.localeCompare(a.data) || a.matricula.localeCompare(b.matricula));
  }, [records, hasGenerated, activeFilters]);

  const handleExportExcel = () => {
    const data = horarioRows.map((r) => ({
      MATRICULA: r.matricula,
      DATA: r.data,
      'HORA INICIAL': r.horaInicial,
      'HORA FINAL': r.horaFinal,
      'TEMPO DE SERVIÇO': r.tempoServico,
      'TOTAL LEITURAS': r.totalLeituras,
      'TEMPO DE ATIVIDADE / LEITURA': `${r.cadenciaLeiturasHora} (${r.tempoMedioPorLeitura})`,
    }));
    exportToExcel(data, `Controle_Horario_${activeFilters.mes}_${activeFilters.ano}`);
  };

  return (
    <div className="space-y-6">
      
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

            {/* Data (Calendário) */}
            <div>
              <label htmlFor="horario-data" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Data (data_original)
              </label>
              <div className="relative">
                <input
                  id="horario-data"
                  type="date"
                  value={filterData}
                  onChange={(e) => setFilterData(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                />
              </div>
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

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Gerar Controle de Horário</span>
            </button>
          </div>
        </form>
      </div>

      {/* Main Results Table */}
      {hasGenerated && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Auditoria de Jornada e Produtividade (Controle de Horário)</span>
              </h3>
              <span className="text-xs text-slate-400">
                {horarioRows.length} jornadas diárias consolidadas
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
                  <th className="py-3 px-4">MATRÍCULA</th>
                  <th className="py-3 px-4">DATA ORIGINAL</th>
                  <th className="py-3 px-4 text-cyan-400">HORA INICIAL (MÍN)</th>
                  <th className="py-3 px-4 text-cyan-400">HORA FINAL (MÁX)</th>
                  <th className="py-3 px-4">TEMPO DE SERVIÇO</th>
                  <th className="py-3 px-4 text-right">TOTAL LEITURAS</th>
                  <th className="py-3 px-4 text-right text-emerald-400">TEMPO DE ATIVIDADE / LEITURA (MÉDIA/H)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono tabular-nums text-slate-300">
                {horarioRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-slate-500">
                      Nenhum registro de data e hora encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  horarioRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                        {row.matricula}
                      </td>
                      <td className="py-2.5 px-4 text-slate-200 font-sans">{row.data}</td>
                      <td className="py-2.5 px-4 text-cyan-300 font-semibold">{row.horaInicial}</td>
                      <td className="py-2.5 px-4 text-cyan-300 font-semibold">{row.horaFinal}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-100">{row.tempoServico}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-white">
                        {row.totalLeituras.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-400 font-semibold">
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
