import React, { useState, useMemo } from 'react';
import { Search, Hash, Gauge, FileSpreadsheet, Activity, AlertCircle } from 'lucide-react';
import { ReadingRecord, MONTH_ORDER } from '../../types/reading';
import { exportToExcel } from '../../utils/exportUtils';

interface ConsultaViewProps {
  records: ReadingRecord[];
}

export const ConsultaView: React.FC<ConsultaViewProps> = ({ records }) => {
  const [searchInstalacao, setSearchInstalacao] = useState('');
  const [searchMedidor, setSearchMedidor] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [activeQuery, setActiveQuery] = useState<{ inst: string; med: string }>({ inst: '', med: '' });

  // Restrict installation input to numbers up to 10 digits
  const handleInstalacaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setSearchInstalacao(val);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveQuery({ inst: searchInstalacao.trim(), med: searchMedidor.trim().toUpperCase() });
    setHasSearched(true);
  };

  // Find sample installations to offer quick pick
  const quickSamples = useMemo(() => {
    const list: string[] = [];
    for (const r of records) {
      if (r.instalacao && !list.includes(r.instalacao)) {
        list.push(r.instalacao);
        if (list.length >= 4) break;
      }
    }
    return list;
  }, [records]);

  // Filtered and sorted results: MES (calendar order), ANO (ascending)
  const results = useMemo(() => {
    if (!hasSearched && !activeQuery.inst && !activeQuery.med) {
      return [];
    }

    return records
      .filter((r) => {
        let match = true;
        if (activeQuery.inst) {
          match = match && r.instalacao.includes(activeQuery.inst);
        }
        if (activeQuery.med) {
          match = match && r.medidor.toUpperCase().includes(activeQuery.med);
        }
        return match;
      })
      .sort((a, b) => {
        // ANO ascending
        const anoA = Number(a.ano) || 0;
        const anoB = Number(b.ano) || 0;
        if (anoA !== anoB) return anoA - anoB;

        // MES calendar order
        const mesKeyA = (a.mes || '').toLowerCase().trim();
        const mesKeyB = (b.mes || '').toLowerCase().trim();
        const orderA = MONTH_ORDER[mesKeyA] || 99;
        const orderB = MONTH_ORDER[mesKeyB] || 99;
        return orderA - orderB;
      });
  }, [records, hasSearched, activeQuery]);

  // Quantitative history of COD (nl)
  const codFrequency = useMemo(() => {
    const counts: { [key: string]: number } = {};
    results.forEach((r) => {
      const cod = r.nl ? String(r.nl).trim() : '0000 (Sem impedimento)';
      counts[cod] = (counts[cod] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }, [results]);

  // Consumption progression points
  const maxConsumo = useMemo(() => {
    return Math.max(...results.map((r) => r.consumo || 0), 10);
  }, [results]);

  const handleExport = () => {
    const dataToExport = results.map((r) => ({
      MES: r.mes,
      ANO: r.ano,
      UI: r.rz_ul_lv,
      INSTALAÇÃO: r.instalacao,
      MEDIDOR: r.medidor,
      REG: r.reg,
      MATR: r.matr,
      COD: r.nl,
      LEITURA: r.l_atual,
      CONSUMO: r.consumo,
      DIG: r.digitacao,
      'NOSB.IMP': r.nosb_impedimento,
      'NOSB.SIM': r.nosb_simulacao,
      CNA: r.cna,
    }));
    exportToExcel(dataToExport, `Consulta_${activeQuery.inst || activeQuery.med || 'Geral'}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Search Bar Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Input 1: Instalação */}
            <div>
              <label htmlFor="search-instalacao" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Instalação (apenas números, até 10 dígitos)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  id="search-instalacao"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={searchInstalacao}
                  onChange={handleInstalacaoChange}
                  placeholder="Ex: 1002348910"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>
            </div>

            {/* Input 2: Medidor */}
            <div>
              <label htmlFor="search-medidor" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Medidor
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Gauge className="w-4 h-4" />
                </div>
                <input
                  id="search-medidor"
                  type="text"
                  value={searchMedidor}
                  onChange={(e) => setSearchMedidor(e.target.value)}
                  placeholder="Ex: MED-882000"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            {quickSamples.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="text-slate-500">Sugestões de teste:</span>
                <div className="flex flex-wrap gap-1">
                  {quickSamples.map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        setSearchInstalacao(sample);
                        setActiveQuery({ inst: sample, med: '' });
                        setHasSearched(true);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] transition-colors"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap ml-auto"
            >
              <Search className="w-4 h-4" />
              <span>Pesquisar Registro</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results Table Section */}
      {hasSearched && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Resultado da Consulta</span>
                <span className="text-xs font-mono text-cyan-400 font-normal">
                  ({results.length} ocorrências ordenadas cronologicamente)
                </span>
              </h3>
            </div>

            {results.length > 0 && (
              <button
                onClick={handleExport}
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar Excel</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                <AlertCircle className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                <p className="font-semibold text-slate-300">Nenhum registro encontrado</p>
                <p>Verifique o número da instalação ou medidor digitado.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-950/80 sticky top-0 z-10 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">MES</th>
                    <th className="py-2.5 px-3">ANO</th>
                    <th className="py-2.5 px-3">UI (RZ_UL_LV)</th>
                    <th className="py-2.5 px-3">INSTALAÇÃO</th>
                    <th className="py-2.5 px-3">MEDIDOR</th>
                    <th className="py-2.5 px-3">REG</th>
                    <th className="py-2.5 px-3">MATR</th>
                    <th className="py-2.5 px-3">COD (NL)</th>
                    <th className="py-2.5 px-3 text-right">LEITURA</th>
                    <th className="py-2.5 px-3 text-right">CONSUMO</th>
                    <th className="py-2.5 px-3 text-center">DIG</th>
                    <th className="py-2.5 px-3">NOSB.IMP</th>
                    <th className="py-2.5 px-3">NOSB.SIM</th>
                    <th className="py-2.5 px-3">CNA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300 tabular-nums">
                  {results.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200">{row.mes}</td>
                      <td className="py-2.5 px-3 text-slate-400">{row.ano}</td>
                      <td className="py-2.5 px-3 text-cyan-400 font-semibold">{row.rz_ul_lv || '-'}</td>
                      <td className="py-2.5 px-3 text-white">{row.instalacao}</td>
                      <td className="py-2.5 px-3 text-slate-300">{row.medidor}</td>
                      <td className="py-2.5 px-3 text-slate-400">{row.reg}</td>
                      <td className="py-2.5 px-3 text-slate-300">{row.matr}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          row.nl && row.nl !== '0000' && row.nl !== ''
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                            : 'text-slate-400'
                        }`}>
                          {row.nl || '0000'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-100">
                        {row.l_atual.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">
                        {row.consumo.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-300">{row.digitacao}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 truncate max-w-[150px]" title={row.nosb_impedimento}>
                        {row.nosb_impedimento || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 truncate max-w-[120px]" title={row.nosb_simulacao}>
                        {row.nosb_simulacao || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{row.cna || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Lower Analytics: Histórico Quantitativo de COD e Gráfico de Consumo */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Histórico Quantitativo de COD */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Histórico Quantitativo de COD (nl)
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                {codFrequency.length} códigos distintos
              </span>
            </div>

            <div className="space-y-2.5">
              {codFrequency.map((item) => (
                <div key={item.code} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="font-mono text-slate-300">
                    Código <strong className="text-cyan-300">{item.code}</strong>
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-100 font-semibold tabular-nums">{item.count}</span>
                    <span className="text-slate-500">ocorrências</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico de Progressão do Consumo */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Progressão do Consumo no Tempo
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                Consumo Medido (kWh / m³)
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {results.map((r) => {
                const barWidth = Math.max(6, Math.round((r.consumo / maxConsumo) * 100));
                return (
                  <div key={r.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">
                        {r.mes}/{r.ano}
                      </span>
                      <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                        {r.consumo.toLocaleString('pt-BR')} unid.
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
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
