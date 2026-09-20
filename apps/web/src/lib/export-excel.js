/**
 * Utility untuk mengekspor data laporan ke format Microsoft Excel (.xlsx)
 * Menggunakan dynamic import SheetJS agar tidak membebani initial bundle load.
 */

import { dialog } from '@/context/DialogContext';

export async function exportToExcel({
  filename = 'laporan-klinik.xlsx',
  sheetName = 'Laporan',
  title = '',
  period = '',
  columns = [],
  data = [],
}) {
  try {
    // Dynamic import untuk code-splitting
    const XLSX = await import('xlsx');

    // Susun baris header dokumen klinik jika ada judul
    const sheetData = [];

    if (title) {
      sheetData.push([title.toUpperCase()]);
      if (period) sheetData.push([`Periode: ${period}`]);
      sheetData.push([]); // Baris kosong pemisah
    }

    // Header tabel
    sheetData.push(columns.map((c) => c.label));

    // Data rows
    data.forEach((row, idx) => {
      const rowData = columns.map((col) => {
        if (col.key === '_index') return idx + 1;
        const val = row[col.key];
        if (typeof col.format === 'function') {
          return col.format(val, row);
        }
        return val !== null && val !== undefined ? val : '';
      });
      sheetData.push(rowData);
    });

    // Buat worksheet dan workbook
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto-fit lebar kolom (estimasi karakter)
    const colWidths = columns.map((col, colIdx) => {
      let maxLen = col.label.length;
      data.forEach((row) => {
        const val = col.key === '_index' ? '123' : String(row[col.key] || '');
        if (val.length > maxLen) maxLen = Math.min(val.length, 45);
      });
      return { wch: Math.max(maxLen + 3, 10) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)); // Max 31 chars for sheet name

    // Simpan file .xlsx
    const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, cleanFilename);
    return true;
  } catch (error) {
    console.error('Gagal mengekspor data ke Excel:', error);
    dialog.alert('Terjadi kesalahan saat membuat file Excel: ' + error.message, {
      title: 'Ekspor Excel Gagal',
      variant: 'danger',
    });
    return false;
  }
}
