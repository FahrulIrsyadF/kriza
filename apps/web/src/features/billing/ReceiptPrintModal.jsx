import React, { useState, useEffect } from 'react';
import { Printer, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatRupiah, terbilang } from '@/lib/utils';
import { CLINIC_INFO, formatClinicContact } from '@/lib/clinic-info';
import apiClient from '@/lib/api-client';

export function ReceiptPrintModal({ payment: initialPayment, onClose }) {
  const [payment, setPayment] = useState(initialPayment);
  const [loading, setLoading] = useState(
    Boolean(initialPayment?.id && (!initialPayment?.patientName || !initialPayment?.items))
  );

  useEffect(() => {
    if (initialPayment?.id && (!initialPayment?.patientName || !initialPayment?.items)) {
      setLoading(true);
      apiClient
        .get(`/billing/payments/${initialPayment.id}`)
        .then((res) => {
          if (res.data?.data) {
            setPayment(res.data.data);
          }
        })
        .catch((err) => {
          console.error('Gagal mengambil data lengkap kuitansi:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setPayment(initialPayment);
      setLoading(false);
    }
  }, [initialPayment]);

  if (!payment && !loading) return null;

  const handlePrint = () => {
    window.print();
  };

  const isLunas =
    payment?.invoiceStatus === 'PAID' ||
    parseFloat(payment?.amount || '0') >= parseFloat(payment?.invoiceTotal || payment?.amount || '0');

  const printDate = payment?.paidAt
    ? new Date(payment.paidAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Modal Container (tidak ikut dicetak) */}
      <div className="bg-card text-card-foreground border border-border w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden my-6">
        {/* Header Modal Bar — hidden on print */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Kuitansi Resmi Klinik</h3>
              <p className="text-xs text-muted-foreground">
                No. Kuitansi:{' '}
                <span className="font-semibold text-foreground font-mono">
                  {payment?.paymentNumber}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} disabled={loading} className="gap-1.5 shadow-sm">
              <Printer className="w-4 h-4" /> Cetak Kuitansi
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Area — inilah yang dicetak */}
        <div className="p-6 max-h-[80vh] overflow-y-auto bg-muted/10 flex justify-center print:p-0 print:max-h-none print:overflow-visible">
          {loading ? (
            <div className="w-full max-w-xl bg-white text-slate-900 border border-slate-300 rounded-lg p-16 shadow-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-slate-500 font-medium">Memuat data kuitansi lengkap...</p>
            </div>
          ) : (
            <div
              className="printable-area w-full max-w-xl bg-white text-slate-900 border border-slate-300 rounded-lg p-8 shadow-sm text-xs font-sans print:border-none print:shadow-none print:rounded-none"
              id="printable-receipt"
            >
              {/* ─── KOP KLINIK ─── */}
              <div className="border-b-2 border-slate-800 pb-3 mb-3 text-center">
                <div className="flex items-center justify-center gap-3">
                  <img
                    src={CLINIC_INFO.logoPath}
                    alt={`Logo ${CLINIC_INFO.name}`}
                    className="w-14 h-14 object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="text-left">
                    <h1 className="font-black text-base text-slate-900 tracking-tight uppercase leading-tight">
                      {CLINIC_INFO.legalName}
                    </h1>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                      {CLINIC_INFO.address}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {formatClinicContact()}
                    </p>
                  </div>
                </div>
              </div>

              {/* ─── JUDUL KUITANSI ─── */}
              <div className="py-2.5 text-center">
                <h2 className="text-sm font-extrabold tracking-widest uppercase text-slate-800 border-b border-slate-300 inline-block pb-0.5">
                  BUKTI PEMBAYARAN / KUITANSI KASIR
                </h2>
              </div>

              {/* ─── INFO TRANSAKSI & PASIEN ─── */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] py-3 border-b border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Kuitansi</span>
                  <span className="font-mono font-bold text-slate-900">{payment?.paymentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Rekam Medis</span>
                  <span className="font-mono font-bold text-slate-900">{payment?.patientMrn || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Tagihan</span>
                  <span className="font-mono font-semibold text-slate-700">{payment?.invoiceNumber || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pasien</span>
                  <span className="font-bold text-slate-900">{payment?.patientName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Transaksi</span>
                  <span className="font-medium text-slate-700">
                    {payment?.paidAt
                      ? new Date(payment.paidAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Layanan / Poli</span>
                  <span className="font-medium text-slate-800">{payment?.polyclinicName || 'Poliklinik Umum'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Petugas Kasir</span>
                  <span className="font-medium text-slate-800">{payment?.cashierName || 'Kasir Klinik'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dokter Pemeriksa</span>
                  <span className="font-medium text-slate-800">{payment?.practitionerName || '—'}</span>
                </div>
              </div>

              {/* ─── TABEL RINCIAN BIAYA ─── */}
              <div className="py-3">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-700 font-bold">
                      <th className="py-1 w-8">No</th>
                      <th className="py-1">Uraian Tindakan / Obat</th>
                      <th className="py-1 text-center w-12">Qty</th>
                      <th className="py-1 text-right w-24">Tarif</th>
                      <th className="py-1 text-right w-28">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payment?.items && payment.items.length > 0 ? (
                      payment.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="py-1 text-slate-500">{idx + 1}</td>
                          <td className="py-1">
                            <span className="font-medium text-slate-800">{it.itemName}</span>
                            <span className="text-[9px] text-slate-400 block font-sans">
                              {it.itemType === 'PROCEDURE'
                                ? 'Tindakan Medis'
                                : it.itemType === 'DRUG'
                                ? 'Resep Farmasi'
                                : 'Layanan'}
                            </span>
                          </td>
                          <td className="py-1 text-center text-slate-600">{it.quantity}</td>
                          <td className="py-1 text-right text-slate-600 font-mono">
                            {formatRupiah(it.unitPrice)}
                          </td>
                          <td className="py-1 text-right font-mono font-medium text-slate-900">
                            {formatRupiah(it.subtotal)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-1 text-slate-500">1</td>
                        <td className="py-1 font-medium text-slate-800">
                          {payment?.notes || 'Layanan Poliklinik & Resep Obat'}
                        </td>
                        <td className="py-1 text-center text-slate-600">1</td>
                        <td className="py-1 text-right text-slate-600 font-mono">
                          {formatRupiah(payment?.amount)}
                        </td>
                        <td className="py-1 text-right font-mono font-medium text-slate-900">
                          {formatRupiah(payment?.amount)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ─── RINGKASAN PEMBAYARAN ─── */}
              <div className="border-t border-slate-300 pt-2 space-y-1 text-[11px]">
                {(payment?.invoiceSubtotal || payment?.invoiceTotal) && (
                  <div className="flex justify-between text-slate-600">
                    <span>Total Biaya Layanan</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatRupiah(payment.invoiceSubtotal || payment.invoiceTotal)}
                    </span>
                  </div>
                )}
                {parseFloat(payment?.discountAmount || '0') > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Diskon</span>
                    <span className="font-mono font-semibold">
                      - {formatRupiah(payment.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-bold text-slate-900 bg-slate-100 p-1.5 rounded">
                  <span>Jumlah yang Dibayar</span>
                  <span className="font-mono font-extrabold text-blue-900">
                    {formatRupiah(payment?.amount)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 pt-1">
                  <div>
                    <span>Metode Bayar: </span>
                    <span className="font-bold text-slate-800">{payment?.paymentMethod || 'TUNAI'}</span>
                    {payment?.bankName && <span className="ml-1">({payment.bankName})</span>}
                  </div>
                  {payment?.paymentMethod === 'TUNAI' && (
                    <div className="text-right">
                      <span>Diterima: </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatRupiah(payment.cashTendered)}
                      </span>
                      <span className="mx-1">•</span>
                      <span>Kembali: </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatRupiah(payment.changeAmount)}
                      </span>
                    </div>
                  )}
                  {payment?.referenceNumber && (
                    <div className="col-span-2">
                      <span>No. Referensi: </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {payment.referenceNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── TERBILANG ─── */}
              <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded text-[10px]">
                <span className="font-bold text-slate-600">Terbilang: </span>
                <span className="italic font-medium text-slate-800 capitalize">
                  {terbilang(payment?.amount)}
                </span>
              </div>

              {/* ─── TANDA TANGAN & STEMPEL ─── */}
              <div className="mt-6 pt-3 border-t border-slate-200 text-[10px]">
                <div className="grid grid-cols-3 gap-4">
                  {/* Kolom Kiri: Pasien */}
                  <div className="text-center flex flex-col justify-between h-28">
                    <div>
                      <p className="text-slate-500 invisible select-none leading-normal">&nbsp;</p>
                      <p className="text-slate-500 leading-normal">Pasien / Keluarga,</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 border-t border-slate-400 mx-2 pt-1 truncate">
                        ({payment?.patientName || 'Pasien / Keluarga'})
                      </p>
                    </div>
                  </div>

                  {/* Kolom Tengah: Stempel LUNAS */}
                  <div className="flex items-center justify-center">
                    {isLunas && (
                      <div className="border-2 border-emerald-600 text-emerald-700 font-extrabold text-sm px-4 py-2 rounded tracking-widest uppercase rotate-[-8deg] select-none opacity-80 whitespace-nowrap">
                        LUNAS
                      </div>
                    )}
                  </div>

                  {/* Kolom Kanan: Kasir */}
                  <div className="text-center flex flex-col justify-between h-28">
                    <div>
                      <p className="text-slate-500 leading-normal">
                        {CLINIC_INFO.cityForSignature}, {printDate}
                      </p>
                      <p className="text-slate-500 leading-normal">Petugas Kasir,</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 border-t border-slate-400 mx-2 pt-1 truncate">
                        ({payment?.cashierName || 'Kasir Klinik'})
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── FOOTER ─── */}
              <div className="mt-4 pt-2 border-t border-dotted border-slate-300 text-center text-[9px] text-slate-400 space-y-0.5">
                <p>Terima kasih telah mempercayakan kesehatan Anda kepada {CLINIC_INFO.name}.</p>
                <p>Dokumen ini merupakan bukti pembayaran sah yang dicetak melalui sistem KRIZA SIMRS.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions — hidden on print */}
        <div className="print:hidden px-6 py-3 border-t border-border bg-muted/40 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
          <Button size="sm" onClick={handlePrint} disabled={loading} className="gap-1.5 shadow-sm">
            <Printer className="w-4 h-4" /> Cetak Kuitansi
          </Button>
        </div>
      </div>
    </div>
  );
}
