export interface ReadingRecord {
  id: string;
  mes: string;              // e.g. "Janeiro", "01"
  ano: string | number;     // e.g. "2026", 2026
  instalacao: string;       // up to 10 digits
  medidor: string;          // Meter ID e.g. "MED-994821"
  reg: string;              // Registro / Sequencial
  rz: string;               // Razão e.g. "01", "RZ-NORTE"
  rz_ul_lv: string;         // UI / Código de rota e.g. "12034055"
  ul: string;               // Unidade de Leitura e.g. "1203"
  foto: string;             // "OK", "NAO", "PENDENTE"
  tipo: string;             // "URBANO", "POVOADO", "RURAL", etc.
  matr: string;             // Matrícula do leiturista e.g. "90412"
  nl: string;               // Código de Não Leitura / Impedimento
  data_original: string;    // YYYY-MM-DD or DD/MM/YYYY
  hora_original: string;    // HH:MM:SS or HH:MM
  endereco: string;         // Logradouro / Endereço
  l_atual: number;          // Leitura atual
  consumo: number;          // Consumo apurado (kWh/m³)
  nosb_impedimento: string; // Motivo do impedimento de impressão
  nosb_simulacao: string;   // Dados de simulação
  digitacao: number;        // Contador de digitação (e.g. 1, 2, 3...)
  cna: string;              // Código CNA
  consistencia: string;     // Status de consistência ("OK", "REVISAR", etc.)
  [key: string]: any;
}

export type CanonicalField =
  | 'mes'
  | 'ano'
  | 'instalacao'
  | 'medidor'
  | 'reg'
  | 'rz'
  | 'rz_ul_lv'
  | 'ul'
  | 'foto'
  | 'tipo'
  | 'matr'
  | 'nl'
  | 'data_original'
  | 'hora_original'
  | 'endereco'
  | 'l_atual'
  | 'consumo'
  | 'nosb_impedimento'
  | 'nosb_simulacao'
  | 'digitacao'
  | 'cna'
  | 'consistencia';

export type ViewMenu =
  | 'inicio'
  | 'consulta'
  | 'leiturista'
  | 'evidencias'
  | 'nosb'
  | 'horario'
  | 'sequencia';

// Códigos oficiais de impedimento para Leituras Não Realizadas
export const IMPEDIMENT_CODES = new Set([
  '3201', '3205', '3245', '3301', '3312', '3313', '3369', '3370', '3374', '3379',
  '3901', '3902', '3903', '3904', '3905', '3906', '3907', '3908', '5101', '5102',
  '5103', '5104', '5105', '5106', '5107', '5108', '5109', '5127', '5260', '5558',
  '5800', '5802', '3376'
]);

export const MONTH_ORDER: { [key: string]: number } = {
  'janeiro': 1, 'jan': 1, '1': 1, '01': 1,
  'fevereiro': 2, 'fev': 2, '2': 2, '02': 2,
  'março': 3, 'marco': 3, 'mar': 3, '3': 3, '03': 3,
  'abril': 4, 'abr': 4, '4': 4, '04': 4,
  'maio': 5, 'mai': 5, '5': 5, '05': 5,
  'junho': 6, 'jun': 6, '6': 6, '06': 6,
  'julho': 7, 'jul': 7, '7': 7, '07': 7,
  'agosto': 8, 'ago': 8, '8': 8, '08': 8,
  'setembro': 9, 'set': 9, '9': 9, '09': 9,
  'outubro': 10, 'out': 10, '10': 10,
  'novembro': 11, 'nov': 11, '11': 11,
  'dezembro': 12, 'dez': 12, '12': 12,
};

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
