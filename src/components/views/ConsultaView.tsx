import React, { useState, useMemo } from 'react';
import { Search, Hash, Gauge, FileSpreadsheet, Activity, AlertCircle, RotateCcw, Printer, TrendingUp } from 'lucide-react';
import { ReadingRecord, MONTH_ORDER } from '../../types/reading';
import { exportToExcel, exportToPdf, printReport } from '../../utils/exportUtils';

interface ConsultaViewProps {
  records: ReadingRecord[];
}

export const ConsultaView: React.FC<ConsultaViewProps> = ({ records }) => {
  const [searchInstalacao, setSearchInstalacao] = useState('');
  const [searchMedidor, setSearchMedidor] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [activeQuery, setActiveQuery] = useState<{ inst: string; med: string }>({ inst: '', med: '' });

  // Permite números, pontos e traços, qualquer quantidade de caracteres
  const handleInstalacaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInstalacao(e.target.value);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInstalacao.trim() && !searchMedidor.trim()) {
      alert('Por favor, informe a Instalação ou o Medidor para pesquisar.');
      return;
    }
    setActiveQuery({ inst: searchInstalacao.trim(), med: searchMedidor.trim().toUpperCase() });
    setHasSearched(true);
  };

  const handleReset = () => {
    setSearchInstalacao('');
    setSearchMedidor('');
    setActiveQuery({ inst: '', med: '' });
    setHasSearched(false);
  };

  // Filtered and sorted results: MES (calendar order), ANO (ascending)
  const results = useMemo(() => {
    if (!hasSearched && !activeQuery.inst && !activeQuery.med) {
      return [];
    }

    return records
      .filter((r) => {
        let match = true;
        if (activeQuery.inst) {
          const qClean = activeQuery.inst.toUpperCase();
          const rClean = (r.instalacao || '').toUpperCase();
          const qDigits = qClean.replace(/[^0-9]/g, '');
          const rDigits = rClean.replace(/[^0-9]/g, '');

          const instMatches = rClean.includes(qClean) || (qDigits.length > 0 && rDigits.includes(qDigits));
          match = match && instMatches;
        }
        if (activeQuery.med) {
          match = match && (r.medidor || '').toUpperCase().includes(activeQuery.med);
        }
        return match;
      })
      .sort((a, b) => {
        const anoA = Number(a.ano) || 0;
        const anoB = Number(b.ano) || 0;
        if (anoA !== anoB) return anoA - anoB;

        const mesKeyA = (a.mes || '').toLowerCase().trim();
        const mesKeyB = (b.mes || '').toLowerCase().trim();
        const orderA = MONTH_ORDER[mesKeyA] || 99;
        const orderB = MONTH_ORDER[mesKeyB] || 99;
        return orderA - orderB;
      });
  }, [records, hasSearched, activeQuery]);

  // Histórico de COD (Tabela detalhando CÓDIGO e OCORRÊNCIA)
  const codFrequency = useMemo(() => {
    const counts: { [key: string]: number } = {};
    results.forEach((r) => {
      const cod = r.nl ? String(r.nl).trim() : '0000 (Sem impedimento)';
      counts[cod] = (counts[cod] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([codigo, ocorrencia]) => ({ codigo, ocorrencia }))
      .sort((a, b) => b.ocorrencia - a.ocorrencia);
  }, [results]);

  // Progressão de consumo em formato de tabela
  const progressaoConsumo = useMemo(() => {
    return results.map((r, idx) => {
      const prevConsumo = idx > 0 ? results[idx - 1].consumo : r.consumo;
      const variacao = prevConsumo > 0 ? ((r.consumo - prevConsumo) / prevConsumo) * 100 : 0;
      return {
        mes: r.mes,
        ano: r.ano,
        leitura: r.l_atual,
        consumo: r.consumo,
        variacao,
        data: r.data_original,
      };
    });
  }, [results]);

  // Exportação Excel com cabeçalho obrigatório SAL e data/hora
  const handleExportExcel = () => {
    // Exact requested sequence:
    // MES | ANO | UL | INSTALAÇÃO | MEDIDOR | REG | MATR | NL | LEITURA | CONSUMO | DIG | FOTO | NOSB.IMP | NOSB.SIM
    const dataToExport = results.map((r) => ({
      MES: r.mes,
      ANO: r.ano,
      UL: r.rz_ul_lv || r.ul || '',
      INSTALAÇÃO: r.instalacao,
      MEDIDOR: r.medidor,
      REG: r.reg,
      MATR: r.matr,
      NL: r.nl || '0000',
      LEITURA: r.l_atual,
      CONSUMO: r.consumo,
      DIG: r.digitacao,
      FOTO: r.foto || 'OK',
      'NOSB.IMP': r.nosb_impedimento || '',
      'NOSB.SIM': r.nosb_simulacao || '',
    }));

    exportToExcel(
      dataToExport,
      `Consulta_${activeQuery.inst || activeQuery.med || 'Instalacao'}`,
      `Consulta de Instalação (${activeQuery.inst || activeQuery.med})`
    );
  };

  const handleExportPdf = () => {
    const dataToExport = results.map((r) => ({
      MES: r.mes,
      ANO: r.ano,
      UL: r.rz_ul_lv || r.ul || '',
      INSTALAÇÃO: r.instalacao,
      MEDIDOR: r.medidor,
      REG: r.reg,
      MATR: r.matr,
      NL: r.nl || '0000',
      LEITURA: r.l_atual,
      CONSUMO: r.consumo,
      DIG: r.digitacao,
      FOTO: r.foto || 'OK',
      'NOSB.IMP': r.nosb_impedimento || '',
      'NOSB.SIM': r.nosb_simulacao || '',
    }));

    exportToPdf(
      dataToExport,
      `Consulta_${activeQuery.inst || activeQuery.med || 'Instalacao'}`,
      `Consulta de Instalação (${activeQuery.inst || activeQuery.med})`
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Menu Title at top */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
          <Search className="w-5 h-5 text-cyan-400" />
          <span>2. Consulta de Instalação/Medidor</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Pesquisa avançada com histórico cronológico, conferência de fotos e evolução de consumo.
        </p>
      </div>

      {/* Hidden print header element populated by printReport */}
      <div id="print-report-header" className="hidden print:block" />

      {/* Search Bar Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Input 1: Instalação (números, pontos, traços, qualquer quantidade) */}
            <div>
              <label htmlFor="search-instalacao" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Instalação
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  id="search-instalacao"
                  type="text"
                  value={searchInstalacao}
                  onChange={handleInstalacaoChange}
                  placeholder="Informe a instalação (ex: 1002348910 ou 100.234-89)"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono transition-all"
                />
              </div>
            </div>

            {/* Input 2: Medidor */}
            <div>
              <label htmlFor="search-medidor" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Medidor
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Gauge className="w-4 h-4" />
                </div>
                <input
                  id="search-medidor"
                  type="text"
                  value={searchMedidor}
                  onChange={(e) => setSearchMedidor(e.target.value)}
                  placeholder="Informe o medidor (ex: MED-882000)"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono transition-all"
                />
              </div>
            </div>

          </div>

          {/* Action buttons: Pesquisar Registro & Fazer nova pesquisa */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700/80 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Fazer nova pesquisa</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
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
          <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Resultado da Consulta</span>
                <span className="text-xs font-mono text-cyan-400 font-normal">
                  ({results.length} ocorrências cronológicas)
                </span>
              </h3>
            </div>

            {results.length > 0 && (
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
            )}
          </div>

          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 space-y-1.5">
                <AlertCircle className="w-7 h-7 text-slate-500 mx-auto mb-1" />
                <p className="font-semibold text-slate-200 text-sm">Nenhum registro encontrado</p>
                <p>Verifique o termo digitado e tente novamente.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                {/* Exact Sequence: MES | ANO | UL | INSTALAÇÃO | MEDIDOR | REG | MATR | NL | LEITURA | CONSUMO | DIG | FOTO | NOSB.IMP | NOSB.SIM */}
                <thead className="bg-slate-950/90 sticky top-0 z-10 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <tr>
                    <th className="py-3 px-3.5">MES</th>
                    <th className="py-3 px-3.5">ANO</th>
                    <th className="py-3 px-3.5">UL</th>
                    <th className="py-3 px-3.5">INSTALAÇÃO</th>
                    <th className="py-3 px-3.5">MEDIDOR</th>
                    <th className="py-3 px-3.5 text-center">REG</th>
                    <th className="py-3 px-3.5">MATR</th>
                    <th className="py-3 px-3.5">NL</th>
                    <th className="py-3 px-3.5 text-right">LEITURA</th>
                    <th className="py-3 px-3.5 text-right text-emerald-400">CONSUMO</th>
                    <th className="py-3 px-3.5 text-center">DIG</th>
                    <th className="py-3 px-3.5 text-center">FOTO</th>
                    <th className="py-3 px-3.5">NOSB.IMP</th>
                    <th className="py-3 px-3.5">NOSB.SIM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300 tabular-nums">
                  {results.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-sans font-medium text-slate-200">{row.mes}</td>
                      <td className="py-2.5 px-3.5 text-slate-400">{row.ano}</td>
                      <td className="py-2.5 px-3.5 text-cyan-400 font-semibold">{row.rz_ul_lv || row.ul || '-'}</td>
                      <td className="py-2.5 px-3.5 text-white font-semibold">{row.instalacao}</td>
                      <td className="py-2.5 px-3.5 text-slate-300">{row.medidor}</td>
                      <td className="py-2.5 px-3.5 text-center text-slate-400">{row.reg}</td>
                      <td className="py-2.5 px-3.5 text-slate-300">{row.matr}</td>
                      <td className="py-2.5 px-3.5">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          row.nl && row.nl !== '0000' && row.nl !== ''
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                            : 'text-slate-400'
                        }`}>
                          {row.nl || '0000'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-semibold text-slate-100">
                        {row.l_atual.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-emerald-400 font-bold">
                        {row.consumo.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3.5 text-center text-slate-300">{row.digitacao}</td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (row.foto || '').toUpperCase() === 'OK'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                        }`}>
                          {row.foto || 'OK'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 font-sans text-slate-400 truncate max-w-[150px]" title={row.nosb_impedimento}>
                        {row.nosb_impedimento || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 truncate max-w-[120px]" title={row.nosb_simulacao}>
                        {row.nosb_simulacao || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Lower Analytics: Histórico de COD e Progressão de consumo em tabela/planilha */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Histórico de COD (Tabela: CÓDIGO e OCORRÊNCIA) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Histórico de COD
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                {codFrequency.length} tipos de ocorrência
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <tr>
                    <th className="py-2 px-3">CÓDIGO (NL)</th>
                    <th className="py-2 px-3 text-right">OCORRÊNCIA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                  {codFrequency.map((item) => (
                    <tr key={item.codigo} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 text-cyan-300 font-semibold">{item.codigo}</td>
                      <td className="py-2 px-3 text-right font-bold text-white">{item.ocorrencia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Progressão de consumo (Tabela / Planilha com evolução) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Progressão de consumo
              </h4>
              <span className="text-xs text-slate-400 font-mono">Evolução Histórica</span>
            </div>

            <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <tr>
                    <th className="py-2 px-3">COMPETÊNCIA</th>
                    <th className="py-2 px-3 text-right">LEITURA</th>
                    <th className="py-2 px-3 text-right text-emerald-400">CONSUMO</th>
                    <th className="py-2 px-3 text-right">DATA LEITURA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                  {progressaoConsumo.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-sans font-medium text-slate-200">
                        {p.mes}/{p.ano}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        {p.leitura.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-400">
                        {p.consumo.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 font-sans">
                        {p.data || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
