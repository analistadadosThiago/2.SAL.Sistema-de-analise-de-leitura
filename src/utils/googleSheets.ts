import { ReadingRecord, CanonicalField } from '../types/reading';

export interface SheetParseResult {
  records: ReadingRecord[];
  totalRows: number;
  mappedColumns: { [key: string]: string };
  sheetTitle?: string;
  sourceUrl: string;
}

/**
 * Extracts spreadsheet ID and optional GID from various Google Sheets URL formats
 */
export function extractSpreadsheetInfo(url: string): { id: string | null; gid: string | null } {
  if (!url) return { id: null, gid: null };
  const trimmed = url.trim();

  // If user passed just the alphanumeric ID (typically 40+ chars)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return { id: trimmed, gid: null };
  }

  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);

  return {
    id: idMatch ? idMatch[1] : null,
    gid: gidMatch ? gidMatch[1] : null,
  };
}

/**
 * Normalizes string keys for column matching (removes accents, spaces, underscores, lowercase)
 */
function normalizeKey(str: string): string {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Canonical column map targets
 */
const CANONICAL_FIELDS: CanonicalField[] = [
  'mes',
  'ano',
  'instalacao',
  'medidor',
  'reg',
  'rz',
  'rz_ul_lv',
  'ul',
  'foto',
  'tipo',
  'matr',
  'nl',
  'data_original',
  'hora_original',
  'endereco',
  'l_atual',
  'consumo',
  'nosb_impedimento',
  'nosb_simulacao',
  'digitacao',
  'cna',
  'consistencia',
];

/**
 * Common variations for each target field
 */
const FIELD_ALIASES: Record<string, string[]> = {
  mes: ['mes', 'month', 'mesano', 'mesleitura', 'nm_mes'],
  ano: ['ano', 'year', 'anoleitura', 'nr_ano'],
  instalacao: ['instalacao', 'inst', 'instal', 'nrinstalacao', 'idinstalacao', 'uc', 'instalacaonr'],
  medidor: ['medidor', 'meter', 'nrmedidor', 'numeromedidor', 'equipamento', 'med'],
  reg: ['reg', 'registro', 'nrreg', 'seq', 'sequencial', 'sequencia'],
  rz: ['rz', 'razao', 'cdrazao', 'codigorazao', 'razao_social'],
  rz_ul_lv: ['rzullv', 'ui', 'rzul', 'rotaleitura', 'rota', 'ui_leitura', 'codul'],
  ul: ['ul', 'unidadeleitura', 'unid', 'nrul'],
  foto: ['foto', 'evidencia', 'fotoleitura', 'statusfoto', 'temfoto'],
  tipo: ['tipo', 'categoria', 'tipocliente', 'classe', 'tpleitura'],
  matr: ['matr', 'matricula', 'leiturista', 'nrmatr', 'codleiturista', 'matrleiturista'],
  nl: ['nl', 'cod', 'codnl', 'naoleitura', 'impedimento', 'codimpedimento', 'motivo_nl'],
  data_original: ['dataoriginal', 'data', 'dtoriginal', 'dataleitura', 'dt_leitura', 'datalida'],
  hora_original: ['horaoriginal', 'hora', 'hroriginal', 'horaleitura', 'hr_leitura', 'horalida'],
  endereco: ['endereco', 'logradouro', 'rua', 'localidade', 'bairro'],
  l_atual: ['latual', 'leitura', 'leituraatual', 'valleitura', 'lida', 'leit_atual'],
  consumo: ['consumo', 'cons', 'consumomedido', 'consumokwh', 'consumo_m3'],
  nosb_impedimento: ['nosbimpedimento', 'nosbimp', 'motivo', 'motivoimpedimento', 'nosb_motivo', 'obs_impedimento'],
  nosb_simulacao: ['nosbsimulacao', 'nosbsim', 'simulacao', 'nosb_sim', 'obs_simulacao'],
  digitacao: ['digitacao', 'dig', 'nrdigitacao', 'tentativas', 'contadordig'],
  cna: ['cna', 'codigocna', 'cdcna'],
  consistencia: ['consistencia', 'statusconsistencia', 'consist', 'validacao'],
};

/**
 * Fetches and parses a public Google Sheet using the Google Visualization API (GViz)
 */
export async function fetchGoogleSheetData(rawUrl: string): Promise<SheetParseResult> {
  const { id, gid } = extractSpreadsheetInfo(rawUrl);

  if (!id) {
    throw new Error('Link inválido. Certifique-se de colar a URL completa da planilha do Google Sheets (ex: https://docs.google.com/spreadsheets/d/.../edit).');
  }

  const gvizUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json${gid ? `&gid=${gid}` : ''}`;

  let response: Response;
  try {
    response = await fetch(gvizUrl);
  } catch (err: any) {
    throw new Error('Falha de conexão com os servidores do Google. Verifique sua conexão e se a planilha possui permissão pública de Leitor.');
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Planilha não encontrada. Verifique se o ID ou URL da planilha está correto.');
    }
    if (response.status === 403 || response.status === 401) {
      throw new Error('Acesso negado. A planilha precisa ser compartilhada publicamente: clique em Compartilhar > Qualquer pessoa com o link > Leitor.');
    }
    throw new Error(`Erro ao acessar planilha Google (Status ${response.status}).`);
  }

  const text = await response.text();

  // GViz returns json wrapped in google.visualization.Query.setResponse(...)
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1) {
    // Attempt fallback to CSV if text is not GViz JSON
    return fetchCsvFallback(id, gid, rawUrl);
  }

  try {
    const jsonStr = text.substring(start, end + 1);
    const gvizData = JSON.parse(jsonStr);

    if (gvizData.status === 'error') {
      const msg = gvizData.errors?.[0]?.detailed_message || gvizData.errors?.[0]?.message || 'Erro no retorno da API do Google.';
      throw new Error(`Google Sheets API: ${msg}. Verifique se a planilha está pública.`);
    }

    const table = gvizData.table;
    if (!table || !table.cols || !table.rows) {
      throw new Error('A planilha retornou uma estrutura de dados vazia.');
    }

    // Determine header mapping
    // Strategy 1: check table.cols labels
    let headerLabels: string[] = table.cols.map((c: any) => c.label || '');
    let dataRowStartIndex = 0;

    // Strategy 2: if cols labels are mostly empty (e.g. "A", "B" or ""), inspect row 0
    const emptyLabelsCount = headerLabels.filter((l) => !l || /^[A-Z]{1,2}$/.test(l)).length;
    if (emptyLabelsCount > headerLabels.length / 2 && table.rows.length > 0) {
      const row0Labels = table.rows[0].c.map((cell: any) => (cell?.v !== null && cell?.v !== undefined ? String(cell.v) : ''));
      const hasRecognizableHeaders = row0Labels.some((lbl: string) => {
        const n = normalizeKey(lbl);
        return Object.values(FIELD_ALIASES).some((aliasList) => aliasList.includes(n));
      });

      if (hasRecognizableHeaders) {
        headerLabels = row0Labels;
        dataRowStartIndex = 1;
      }
    }

    // Build column index map: CanonicalField -> columnIndex
    const columnIndexMap: Partial<Record<CanonicalField, number>> = {};
    const mappedLabels: { [key: string]: string } = {};

    headerLabels.forEach((label, colIndex) => {
      const norm = normalizeKey(label);
      if (!norm) return;

      for (const field of CANONICAL_FIELDS) {
        if (columnIndexMap[field] === undefined) {
          const aliases = FIELD_ALIASES[field] || [field];
          if (aliases.includes(norm) || norm.includes(field)) {
            columnIndexMap[field] = colIndex;
            mappedLabels[field] = label || field;
            break;
          }
        }
      }
    });

    // Parse data rows
    const records: ReadingRecord[] = [];
    const rows = table.rows.slice(dataRowStartIndex);

    rows.forEach((rowObj: any, index: number) => {
      const cells = rowObj.c || [];
      if (!cells || cells.length === 0) return;

      const getVal = (colIdx: number | undefined): any => {
        if (colIdx === undefined || !cells[colIdx]) return '';
        const cell = cells[colIdx];
        if (cell.f !== undefined && cell.f !== null) return cell.f;
        if (cell.v !== undefined && cell.v !== null) return cell.v;
        return '';
      };

      // Extract raw installation / meter
      const instalacaoRaw = String(getVal(columnIndexMap.instalacao) || '').trim();
      const medidorRaw = String(getVal(columnIndexMap.medidor) || '').trim();

      // Skip completely empty lines
      if (!instalacaoRaw && !medidorRaw) {
        return;
      }

      // Safe number parsers
      const parseNum = (val: any, fallback = 0): number => {
        if (typeof val === 'number') return isNaN(val) ? fallback : val;
        const str = String(val).replace(/\./g, '').replace(',', '.').trim();
        const n = parseFloat(str);
        return isNaN(n) ? fallback : n;
      };

      const record: ReadingRecord = {
        id: `rec-${index}-${instalacaoRaw || medidorRaw}`,
        mes: String(getVal(columnIndexMap.mes) || 'Janeiro').trim(),
        ano: String(getVal(columnIndexMap.ano) || new Date().getFullYear()).trim(),
        instalacao: instalacaoRaw,
        medidor: medidorRaw,
        reg: String(getVal(columnIndexMap.reg) || index + 1).trim(),
        rz: String(getVal(columnIndexMap.rz) || 'RZ01').trim(),
        rz_ul_lv: String(getVal(columnIndexMap.rz_ul_lv) || getVal(columnIndexMap.ul) || '').trim(),
        ul: String(getVal(columnIndexMap.ul) || '').trim(),
        foto: String(getVal(columnIndexMap.foto) || 'OK').trim().toUpperCase(),
        tipo: String(getVal(columnIndexMap.tipo) || 'URBANO').trim().toUpperCase(),
        matr: String(getVal(columnIndexMap.matr) || '00000').trim(),
        nl: String(getVal(columnIndexMap.nl) || '0000').trim(),
        data_original: String(getVal(columnIndexMap.data_original) || '').trim(),
        hora_original: String(getVal(columnIndexMap.hora_original) || '').trim(),
        endereco: String(getVal(columnIndexMap.endereco) || '').trim(),
        l_atual: parseNum(getVal(columnIndexMap.l_atual)),
        consumo: parseNum(getVal(columnIndexMap.consumo)),
        nosb_impedimento: String(getVal(columnIndexMap.nosb_impedimento) || '').trim(),
        nosb_simulacao: String(getVal(columnIndexMap.nosb_simulacao) || '').trim(),
        digitacao: parseNum(getVal(columnIndexMap.digitacao), 1),
        cna: String(getVal(columnIndexMap.cna) || '').trim(),
        consistencia: String(getVal(columnIndexMap.consistencia) || 'OK').trim(),
      };

      records.push(record);
    });

    if (records.length === 0) {
      throw new Error('A planilha foi acessada, mas não foram encontradas linhas válidas de registros de leitura.');
    }

    return {
      records,
      totalRows: records.length,
      mappedColumns: mappedLabels,
      sourceUrl: rawUrl,
    };
  } catch (err: any) {
    if (err.message && err.message.includes('Google Sheets API')) {
      throw err;
    }
    // Attempt CSV fallback
    return fetchCsvFallback(id, gid, rawUrl);
  }
}

/**
 * Fallback parser using public CSV export
 */
async function fetchCsvFallback(id: string, gid: string | null, rawUrl: string): Promise<SheetParseResult> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
  const resp = await fetch(csvUrl);
  if (!resp.ok) {
    throw new Error('Não foi possível ler a planilha via GViz nem via exportação CSV. Por favor, verifique se a planilha está compartilhada publicamente com qualquer pessoa que tenha o link.');
  }

  const csvText = await resp.text();
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('A planilha CSV está vazia ou sem linhas de dados suficientes.');
  }

  // Simple CSV row parser handling quotes
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCsvLine(lines[0]);
  const columnIndexMap: Partial<Record<CanonicalField, number>> = {};
  const mappedLabels: { [key: string]: string } = {};

  headers.forEach((header, colIdx) => {
    const norm = normalizeKey(header);
    for (const field of CANONICAL_FIELDS) {
      if (columnIndexMap[field] === undefined) {
        const aliases = FIELD_ALIASES[field] || [field];
        if (aliases.includes(norm) || norm.includes(field)) {
          columnIndexMap[field] = colIdx;
          mappedLabels[field] = header;
          break;
        }
      }
    }
  });

  const records: ReadingRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const getVal = (colIdx: number | undefined) => (colIdx !== undefined && row[colIdx] !== undefined ? row[colIdx] : '');
    const instalacaoRaw = getVal(columnIndexMap.instalacao);
    const medidorRaw = getVal(columnIndexMap.medidor);

    if (!instalacaoRaw && !medidorRaw) continue;

    const parseNum = (val: string, fallback = 0): number => {
      const n = parseFloat(val.replace(/\./g, '').replace(',', '.').trim());
      return isNaN(n) ? fallback : n;
    };

    records.push({
      id: `csv-${i}-${instalacaoRaw || medidorRaw}`,
      mes: getVal(columnIndexMap.mes) || 'Janeiro',
      ano: getVal(columnIndexMap.ano) || new Date().getFullYear().toString(),
      instalacao: instalacaoRaw,
      medidor: medidorRaw,
      reg: getVal(columnIndexMap.reg) || String(i),
      rz: getVal(columnIndexMap.rz) || 'RZ01',
      rz_ul_lv: getVal(columnIndexMap.rz_ul_lv) || getVal(columnIndexMap.ul) || '',
      ul: getVal(columnIndexMap.ul) || '',
      foto: (getVal(columnIndexMap.foto) || 'OK').toUpperCase(),
      tipo: (getVal(columnIndexMap.tipo) || 'URBANO').toUpperCase(),
      matr: getVal(columnIndexMap.matr) || '00000',
      nl: getVal(columnIndexMap.nl) || '0000',
      data_original: getVal(columnIndexMap.data_original) || '',
      hora_original: getVal(columnIndexMap.hora_original) || '',
      endereco: getVal(columnIndexMap.endereco) || '',
      l_atual: parseNum(getVal(columnIndexMap.l_atual)),
      consumo: parseNum(getVal(columnIndexMap.consumo)),
      nosb_impedimento: getVal(columnIndexMap.nosb_impedimento),
      nosb_simulacao: getVal(columnIndexMap.nosb_simulacao),
      digitacao: parseNum(getVal(columnIndexMap.digitacao), 1),
      cna: getVal(columnIndexMap.cna),
      consistencia: getVal(columnIndexMap.consistencia) || 'OK',
    });
  }

  return {
    records,
    totalRows: records.length,
    mappedColumns: mappedLabels,
    sourceUrl: rawUrl,
  };
}
