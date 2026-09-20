import React from 'react';
import { Printer, X } from 'lucide-react';
import { CLINIC_INFO, formatClinicContact } from '@/lib/clinic-info';
import { Button } from '@/components/ui/button';

export function ReportPrintModal({
  isOpen,
  onClose,
  title,
  subtitle,
  period,
  summaryCards = [],
  columns = [],
  data = [],
}) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal (Tidak Ikut Tercetak) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-muted/40 no-print">
          <div>
            <h3 className="text-sm font-bold text-foreground">Pratinjau Cetak Laporan Resmi</h3>
            <p className="text-xs text-muted-foreground">
              Format cetak resmi Klinik Pratama Rawat Inap Rizani
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5 font-semibold">
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Print Content Area (Diberi class printable-area sesuai panduan Sesi 9) */}
        <div className="flex-1 overflow-y-auto p-8 bg-white text-black font-sans printable-area">
          {/* 1. Official Letterhead / Kop Surat Resmi */}
          <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
            <div className="flex items-center gap-4">
              <img
                src="/icon_klinik.png"
                alt="Logo Klinik Rizani"
                className="w-16 h-16 object-contain shrink-0"
              />
              <div>
                <h1 className="text-xl font-black tracking-wide uppercase text-black leading-tight">
                  {CLINIC_INFO.legalName}
                </h1>
                <p className="text-xs text-black font-medium leading-snug mt-0.5">
                  {CLINIC_INFO.address}
                </p>
                <p className="text-[11px] text-black font-medium leading-snug">
                  {formatClinicContact()}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Document Title & Period */}
          <div className="text-center mb-6">
            <h2 className="text-base font-bold uppercase tracking-wider text-black underline underline-offset-4">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-gray-700 mt-1">{subtitle}</p>}
            <p className="text-xs font-semibold text-black mt-1">
              PERIODE: <span className="font-mono">{period || 'Semua Data'}</span>
            </p>
          </div>

          {/* 3. Summary Cards (Jika ada) */}
          {summaryCards.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {summaryCards.map((card, idx) => (
                <div key={idx} className="border border-gray-400 p-2.5 rounded text-center">
                  <span className="text-[10px] uppercase font-bold text-gray-700 block">
                    {card.label}
                  </span>
                  <span className="text-sm font-black font-mono text-black mt-0.5 block">
                    {card.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 4. Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-400 text-[11px]">
                  {columns.map((col, idx) => (
                    <th key={idx} className="p-2 border border-gray-400 font-bold text-black uppercase">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data && data.length > 0 ? (
                  data.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-gray-300">
                      {columns.map((col, colIdx) => {
                        let cellVal = row[col.key];
                        if (col.key === '_index') cellVal = rowIdx + 1;
                        if (typeof col.format === 'function') {
                          cellVal = col.format(row[col.key], row);
                        }
                        return (
                          <td
                            key={colIdx}
                            className={`p-2 border border-gray-300 ${
                              col.align === 'right' ? 'text-right' : 'text-left'
                            }`}
                          >
                            {cellVal !== null && cellVal !== undefined ? cellVal : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="p-4 text-center text-gray-500 italic border border-gray-300"
                    >
                      Tidak ada data yang tersedia pada periode ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 5. Tanda Tangan Resmi Klinik */}
          <div className="mt-12 flex justify-end">
            <div className="text-center text-xs min-w-[200px]">
              <p className="text-black">
                Paiton,{' '}
                {new Date().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-black font-semibold mt-1">Petugas Laporan / Penanggung Jawab,</p>
              <div className="h-16" />
              <p className="text-black font-bold underline">
                ( .................................................. )
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">Klinik Pratama Rawat Inap Rizani</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
