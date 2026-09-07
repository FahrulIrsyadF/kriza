import React from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CLINIC_INFO } from '@/lib/clinic-info';

export function PrintEtiketModal({ prescription, onClose }) {
  if (!prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Container Modal */}
      <div className="bg-card text-card-foreground border border-border w-full max-w-3xl rounded-xl shadow-2xl flex flex-col overflow-hidden my-8">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Cetak Etiket Obat (Stiker Pasien)</h3>
              <p className="text-xs text-muted-foreground">
                No. Resep: <span className="font-semibold text-foreground">{prescription.prescriptionNumber}</span> | Pasien: {prescription.patientName} ({prescription.patientMrn})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5 shadow-sm">
              <Printer className="w-4 h-4" /> Cetak Sekarang
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 max-h-[75vh] overflow-y-auto bg-muted/20 flex flex-col items-center print:p-0 print:max-h-none print:overflow-visible">
          <div className="printable-area grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {prescription.items?.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-white text-slate-900 border-2 border-slate-800 rounded-lg p-4 shadow-sm relative flex flex-col justify-between text-xs font-sans print:border-black print:p-3 print:m-1 print:break-inside-avoid"
                style={{ minHeight: '180px' }}
              >
                {/* Header Etiket */}
                <div className="border-b border-slate-400 pb-2 text-center">
                  <p className="font-extrabold text-[13px] tracking-wide uppercase text-blue-900">
                    {CLINIC_INFO.legalName}
                  </p>
                  <p className="text-[10px] text-slate-600 leading-tight">
                    {CLINIC_INFO.address}
                  </p>
                  <p className="text-[9px] text-slate-500 font-semibold mt-0.5">
                    TELP {CLINIC_INFO.phone} • HP {CLINIC_INFO.mobile}
                  </p>
                </div>

                {/* Body Etiket */}
                <div className="py-2.5 space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-800">
                    <span>No: {prescription.prescriptionNumber}</span>
                    <span>Tgl: {new Date().toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="text-[12px] font-bold text-slate-900 border-b border-dotted border-slate-300 pb-1">
                    Pasien: {prescription.patientName} ({prescription.patientMrn})
                  </div>

                  <div className="pt-1 text-center bg-blue-50/80 rounded p-1.5 border border-blue-200">
                    <p className="text-[13px] font-black text-blue-950 uppercase tracking-tight">
                      {item.signa}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-1 text-[11px] font-medium text-slate-700">
                    <span className="font-bold text-slate-900">{item.drugName}</span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold">{item.quantity} {item.unit}</span>
                  </div>

                  {item.notes && (
                    <p className="text-[10px] text-slate-600 italic">
                      Ket: {item.notes}
                    </p>
                  )}
                </div>

                {/* Footer Etiket */}
                <div className="border-t border-slate-300 pt-1 flex justify-between items-center text-[9px] text-slate-500 font-medium">
                  <span>Dokter: {prescription.practitionerName}</span>
                  <span className="font-bold text-red-700">SEBELUM / SESUDAH MAKAN</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="print:hidden px-6 py-3 border-t border-border bg-muted/30 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" /> Cetak ({prescription.items?.length || 0} Etiket)
          </Button>
        </div>
      </div>
    </div>
  );
}
