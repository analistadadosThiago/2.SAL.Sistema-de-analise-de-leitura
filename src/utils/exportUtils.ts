import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Returns formatted current date/time string in Brazilian format: DD/MM/AAAA HH:mm:ss
 */
export function getCurrentDateTimeFormatted(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Exports JSON data array directly to an .xlsx Excel spreadsheet with mandatory SAL header and timestamp
 */
export function exportToExcel(
  data: Record<string, any>[],
  fileName: string = 'Relatorio_SAL',
  reportTitle?: string
) {
  if (!data || data.length === 0) {
    alert('Nenhum dado disponível para exportação.');
    return;
  }

  try {
    const timestamp = getCurrentDateTimeFormatted();
    const systemName = 'SAL – Sistema de Acompanhamento de Leitura';

    const headerRows = [
      [systemName],
      [reportTitle ? `Relatório: ${reportTitle}` : 'Relatório Operacional de Leitura'],
      [`Data e Hora da Pesquisa: ${timestamp}`],
      [], // blank line before table
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(headerRows);

    // Append table data starting from row 5
    XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A5' });

    // Calculate dynamic column widths
    const keys = Object.keys(data[0] || {});
    const colWidths = keys.map((key) => {
      const maxLen = Math.max(
        key.length,
        ...data.slice(0, 100).map((row) => (row[key] !== undefined && row[key] !== null ? String(row[key]).length : 0))
      );
      return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
    });
    if (colWidths[0]) {
      colWidths[0].wch = Math.max(colWidths[0].wch, 45);
    }
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SAL_Dados');

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar para Excel:', error);
    exportToCsv(data, fileName, reportTitle);
  }
}

/**
 * Exports data directly to a downloadable PDF file using jsPDF and jspdf-autotable
 * with mandatory SAL header, timestamp and professional table design.
 */
export function exportToPdf(
  data: Record<string, any>[],
  fileName: string = 'Relatorio_SAL',
  reportTitle: string = 'Relatório Operacional de Leitura'
) {
  if (!data || data.length === 0) {
    alert('Nenhum dado disponível para exportação em PDF.');
    return;
  }

  try {
    const keys = Object.keys(data[0]);
    const isWide = keys.length > 6;

    const doc = new jsPDF({
      orientation: isWide ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const timestamp = getCurrentDateTimeFormatted();
    const systemName = 'SAL – Sistema de Acompanhamento de Leitura';

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(systemName, 14, 14);

    // Subtitle & Timestamp
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Relatório: ${reportTitle}`, 14, 19.5);
    doc.text(`Data e Hora da Pesquisa: ${timestamp}`, 14, 24.5);

    // Separator Line
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.line(14, 27, pageWidth - 14, 27);

    // Map table headers and row cells
    const headers = keys;
    const bodyRows = data.map((item) =>
      headers.map((h) => (item[h] !== undefined && item[h] !== null ? String(item[h]) : ''))
    );

    autoTable(doc, {
      head: [headers],
      body: bodyRows,
      startY: 30,
      theme: 'grid',
      styles: {
        fontSize: headers.length > 10 ? 6.5 : headers.length > 7 ? 7.5 : 8.5,
        cellPadding: 1.8,
        textColor: [15, 23, 42],
        overflow: 'linebreak',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: headers.length > 10 ? 7 : headers.length > 7 ? 8 : 9,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14, bottom: 14 },
      didDrawPage: (dataObj) => {
        // Page footer on every page
        const str = `Página ${dataObj.pageNumber} | ${systemName} — ${timestamp}`;
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(str, 14, doc.internal.pageSize.getHeight() - 6);
      },
    });

    doc.save(`${fileName}.pdf`);
  } catch (err) {
    console.error('Erro ao gerar PDF com jsPDF:', err);
    printReport(reportTitle);
  }
}

/**
 * Fallback CSV export with SAL header
 */
export function exportToCsv(
  data: Record<string, any>[],
  fileName: string = 'Relatorio_SAL',
  reportTitle?: string
) {
  if (!data || data.length === 0) return;
  const timestamp = getCurrentDateTimeFormatted();
  const headers = Object.keys(data[0]);

  const metadataLines = [
    `SAL – Sistema de Acompanhamento de Leitura`,
    `Relatório: ${reportTitle || fileName}`,
    `Data e Hora da Pesquisa: ${timestamp}`,
    ``,
  ];

  const rows = data.map((obj) =>
    headers.map((h) => {
      let val = obj[h] === undefined || obj[h] === null ? '' : String(obj[h]);
      if (val.includes('"') || val.includes(';') || val.includes('\n')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(';')
  );

  const csvContent = '\uFEFF' + [...metadataLines, headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formats numbers in Brazilian percentage format (e.g. 0,50%)
 */
export function formatPercent(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0,00%';
  return `${value.toFixed(2).replace('.', ',')}%`;
}

/**
 * Triggers clean document printing/PDF fallback
 */
export function printReport(reportTitle?: string) {
  window.print();
}
