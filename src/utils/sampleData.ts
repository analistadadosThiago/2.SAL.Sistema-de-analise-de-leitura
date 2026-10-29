import { ReadingRecord } from '../types/reading';

export function generateSampleReadings(): ReadingRecord[] {
  const records: ReadingRecord[] = [];
  const leituristas = ['90412', '90415', '90420', '90433', '90448'];
  const razoes = ['RZ01 - Central', 'RZ02 - Norte', 'RZ03 - Sul', 'RZ04 - Leste'];
  const tipos = ['URBANO', 'URBANO', 'URBANO', 'POVOADO', 'RURAL'];
  
  const impedimentCodes = [
    '3201', '3205', '3245', '3301', '3312', '3313', '3369', '3370', '3374', '3379',
    '3901', '3902', '3903', '3904', '3905', '3906', '3907', '3908', '5101', '5102',
    '5103', '5104', '5105', '5106', '5107', '5108', '5109', '5127', '5260', '5558',
    '5800', '5802', '3376'
  ];

  const nosbReasons = [
    'PORTAO TRANCADO / CAO',
    'MEDIDOR DANIFICADO / EMBAÇADO',
    'DISJUNTOR DESLIGADO',
    'CAIXA LACRADA INACESSIVEL',
    'CONSUMO ELEVADO SUSPEITO',
    'RELOGIO PARADO / DEFEITO'
  ];

  const logradouros = [
    'Av. Brasil', 'Rua das Flores', 'Rua São Paulo', 'Rua Bahia', 'Av. Getúlio Vargas',
    'Rua das Palmeiras', 'Rua 7 de Setembro', 'Travessa Esperança', 'Rodovia Estadual km 14',
    'Estrada do Povoado Santo Antônio', 'Rua Tiradentes', 'Av. Independência'
  ];

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'];
  const anos = [2026, 2025];

  // Specific installation numbers to allow deep multi-month history for Menu 2 (Consulta)
  const targetInstalacoes = ['1002348910', '1002348911', '1002348912', '1005549012', '1008892144'];

  let globalIndex = 1;

  // Build sequential readings for multi-month tracking
  targetInstalacoes.forEach((inst, instIdx) => {
    let baseLeitura = 4520 + instIdx * 300;
    anos.forEach((ano) => {
      meses.forEach((mes, mIdx) => {
        const consumption = Math.floor(120 + Math.random() * 220);
        baseLeitura += consumption;
        const matr = leituristas[instIdx % leituristas.length];
        const rz = razoes[instIdx % razoes.length];
        const ulNum = 120100 + (instIdx % 4) * 10;
        const rzUlLv = `${ulNum}01`;

        // occasionally add impediment
        const hasImpediment = (mIdx === 2 && instIdx === 1) || (mIdx === 4 && instIdx === 3);
        const nlCode = hasImpediment ? impedimentCodes[(instIdx + mIdx) % impedimentCodes.length] : '0000';
        const hasNosb = hasImpediment || mIdx === 1;

        const day = (10 + (instIdx % 15)).toString().padStart(2, '0');
        const monthNum = (mIdx + 1).toString().padStart(2, '0');
        const hour = (8 + (instIdx % 8)).toString().padStart(2, '0');
        const minute = (10 + ((instIdx * 7 + mIdx * 12) % 45)).toString().padStart(2, '0');

        records.push({
          id: `sample-target-${globalIndex++}`,
          mes,
          ano,
          instalacao: inst,
          medidor: `MED-${882000 + instIdx * 115}`,
          reg: String(100 + instIdx * 10 + mIdx),
          rz,
          rz_ul_lv: rzUlLv,
          ul: String(ulNum),
          foto: hasImpediment ? 'NAO' : 'OK',
          tipo: tipos[instIdx % tipos.length],
          matr,
          nl: nlCode,
          data_original: `${ano}-${monthNum}-${day}`,
          hora_original: `${hour}:${minute}:00`,
          endereco: `${logradouros[instIdx % logradouros.length]}, Nº ${120 + instIdx * 45}`,
          l_atual: baseLeitura,
          consumo: consumption,
          nosb_impedimento: hasNosb ? nosbReasons[instIdx % nosbReasons.length] : '',
          nosb_simulacao: hasNosb ? 'SIMULADO PELA MEDIA' : 'NORMAL',
          digitacao: hasImpediment ? 2 : 1,
          cna: 'CNA-01',
          consistencia: hasImpediment ? 'REVISAR' : 'OK',
        });
      });
    });
  });

  // Now create ~450 operational field records spanning different ULs, leituristas and days
  const baseYear = 2026;
  const currentMonth = 'Março';
  const sampleDates = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06'];

  leituristas.forEach((matr, leituristaIndex) => {
    const rz = razoes[leituristaIndex % razoes.length];
    const baseUl = 120100 + leituristaIndex * 100;

    sampleDates.forEach((dataStr, dateIndex) => {
      // simulate 15 to 25 readings per day per leiturista in route order
      const readingsCount = 18;
      let currentHour = 7;
      let currentMinute = 30 + Math.floor(Math.random() * 15);

      for (let i = 0; i < readingsCount; i++) {
        // advance time 10-25 minutes
        currentMinute += 10 + Math.floor(Math.random() * 14);
        if (currentMinute >= 60) {
          currentHour += Math.floor(currentMinute / 60);
          currentMinute = currentMinute % 60;
        }

        const hh = currentHour.toString().padStart(2, '0');
        const mm = currentMinute.toString().padStart(2, '0');
        const ss = Math.floor(Math.random() * 60).toString().padStart(2, '0');

        const instId = `100${leituristaIndex}${dateIndex}${i.toString().padStart(3, '0')}`;
        const medId = `MED-${910000 + globalIndex}`;
        const ulCode = baseUl + Math.floor(i / 10) * 10;
        const ulSeq = String(ulCode * 100 + (i + 1));

        // 8% to 15% impediment rate to simulate realistic operations
        const isImpediment = (i % 7 === 0) || (i % 11 === 0 && leituristaIndex === 2);
        const nlCode = isImpediment ? impedimentCodes[(i + globalIndex) % impedimentCodes.length] : '0000';
        
        // Evidências: digitacao >= 2 is solicitada
        const digitacoes = isImpediment ? (Math.random() > 0.4 ? 2 : 3) : 1;
        const fotoStatus = isImpediment ? (Math.random() > 0.6 ? 'OK' : 'NAO') : 'OK';

        const isNosb = isImpediment || Math.random() > 0.85;
        const nosbMotivo = isNosb ? nosbReasons[(i + leituristaIndex) % nosbReasons.length] : '';

        const consumo = Math.floor(90 + Math.random() * 320);
        const leitura = 8000 + globalIndex * 15 + consumo;

        records.push({
          id: `sample-field-${globalIndex++}`,
          mes: currentMonth,
          ano: baseYear,
          instalacao: instId,
          medidor: medId,
          reg: String(i + 1),
          rz,
          rz_ul_lv: ulSeq,
          ul: String(ulCode),
          foto: fotoStatus,
          tipo: tipos[(i + leituristaIndex) % tipos.length],
          matr,
          nl: nlCode,
          data_original: dataStr,
          hora_original: `${hh}:${mm}:${ss}`,
          endereco: `${logradouros[(i + globalIndex) % logradouros.length]}, Nº ${20 + i * 18}`,
          l_atual: leitura,
          consumo,
          nosb_impedimento: nosbMotivo,
          nosb_simulacao: nosbMotivo ? 'SIMULADO' : 'NORMAL',
          digitacao: digitacoes,
          cna: `CNA-${10 + (i % 5)}`,
          consistencia: isImpediment ? 'REVISAR' : 'OK',
        });
      }
    });
  });

  return records;
}
