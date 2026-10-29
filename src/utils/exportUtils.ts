import * as XLSX from 'xlsx';

/**
 * Exports JSON data array directly to an .xlsx Excel spreadsheet
 */
export function exportToExcel(data: Record<string, any>[], fileName: string = 'Relatorio_SAL') {
  if (!data || data.length === 0) {
    alert('Nenhum dado disponível para exportação.');
    return;
  }

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SAL');
    
    // Auto calculate column widths
    const colWidths = Object.keys(data[0] || {}).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...data.slice(0, 50).map((row) => (row[key] !== undefined && row[key] !== null ? String(row[key]).length : 0))
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Erro ao exportar para Excel:', error);
    // Fallback to CSV
    exportToCsv(data, fileName);
  }
}

/**
 * Fallback CSV export
 */
export function exportToCsv(data: Record<string, any>[], fileName: string = 'Relatorio_SAL') {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((obj) =>
    headers.map((h) => {
      let val = obj[h] === undefined || obj[h] === null ? '' : String(obj[h]);
      if (val.includes('"') || val.includes(',') || val.includes('\n')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(';')
  );

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
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
 * Formats numbers in Brazilian currency/percentage format (e.g. 0,50%)
 */
export function formatPercent(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0,00%';
  return `${value.toFixed(2).replace('.', ',')}%`;
}

/**
 * Triggers clean document printing (styled via @media print in index.css)
 */
export function printReport() {
  window.print();
}
