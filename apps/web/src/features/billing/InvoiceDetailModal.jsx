import React, { useState } from 'react';
import {
  FileText, X, CheckCircle2, Clock, Printer, CreditCard,
  User, Tag, AlertCircle, Percent, Plus, Trash2, RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import { dialog } from '@/context/DialogContext';

export function InvoiceDetailModal({ invoiceId, onClose, onPay, onPrintReceipt, onSynced }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountVal, setDiscountVal] = useState(0);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  React.useEffect(() => {
    if (!invoiceId) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/billing/invoices/${invoiceId}`);
        setInvoice(res.data.data);
        setDiscountVal(parseFloat(res.data.data.discountAmount || '0'));
      } catch (err) {
        setErrorMsg('Gagal memuat detail invoice');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [invoiceId]);

  const handleUpdateDiscount = async () => {
    setSavingDiscount(true);
    try {
      const res = await apiClient.put(`/billing/invoices/${invoiceId}`, {
        discountAmount: discountVal,
      });
      setInvoice(res.data.data);
      setIsEditingDiscount(false);
    } catch (err) {
      dialog.alert('Gagal memperbarui diskon: ' + (err.response?.data?.error?.message || err.message), {
        title: 'Gagal Update Diskon',
        variant: 'danger',
      });
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleSync = async () => {
    if (!invoice?.registrationId) {
      dialog.alert('Data registrasi tidak ditemukan untuk sinkronisasi tagihan.', {
        title: 'Gagal Sinkronisasi',
        variant: 'danger',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const res = await apiClient.post(`/billing/invoices/sync/${invoice.registrationId}`);
      setInvoice(res.data.data);
      setDiscountVal(parseFloat(res.data.data.discountAmount || '0'));
      dialog.alert('Tagihan berhasil disinkronkan dari tindakan medis poli dan resep farmasi terbaru.', {
        title: 'Sinkronisasi Berhasil',
        variant: 'success',
      });
      onSynced?.();
    } catch (err) {
      dialog.alert('Gagal menyinkronkan tagihan: ' + (err.response?.data?.error?.message || err.message), {
        title: 'Gagal Sinkronisasi',
        variant: 'danger',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!invoiceId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card text-card-foreground border border-border w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Detail Tagihan Layanan</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {invoice ? invoice.invoiceNumber : 'Memuat...'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Memuat rincian tagihan...
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
              {errorMsg}
            </div>
          ) : invoice ? (
            <>
              {/* Top Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                  <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Pasien & Rekam Medis
                  </span>
                  <p className="font-bold text-sm text-foreground">{invoice.patientName}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    No. RM: {invoice.patientMrn}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                    Penjamin: {invoice.paymentScheme || 'UMUM'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                  <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Unit Layanan & Dokter
                  </span>
                  <p className="font-semibold text-xs text-foreground">
                    {invoice.polyclinicName || 'Poliklinik Umum'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {invoice.practitionerName || '-'}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-1">
                    Reg: {invoice.registrationNumber}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">Status Tagihan</span>
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        invoice.status === 'PAID'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : invoice.status === 'PARTIAL'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          : 'bg-red-500/15 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {invoice.status === 'PAID' ? 'Lunas' : invoice.status === 'PARTIAL' ? 'Sebagian' : 'Belum Lunas'}
                    </span>
                    <p className="text-base font-extrabold font-mono text-foreground mt-1">
                      {formatRupiah(invoice.finalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-4 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
                  <span>Rincian Layanan & Resep Obat</span>
                  <span>Subtotal</span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="border-b border-border/80 bg-muted/20 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2 px-4 w-10">No</th>
                      <th className="py-2 px-4">Item Layanan / Obat</th>
                      <th className="py-2 px-4">Kategori</th>
                      <th className="py-2 px-4 text-center w-16">Qty</th>
                      <th className="py-2 px-4 text-right w-24">Tarif</th>
                      <th className="py-2 px-4 text-right w-28">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {invoice.items?.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-muted/20">
                        <td className="py-2 px-4 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-4 font-medium text-foreground">
                          {it.itemName}
                          {it.notes && (
                            <span className="text-[10px] text-muted-foreground block italic">
                              {it.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-muted font-medium text-muted-foreground">
                            {it.itemType === 'PROCEDURE' ? 'Tindakan' : it.itemType === 'DRUG' ? 'Obat' : 'Konsultasi'}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center font-semibold">{it.quantity}</td>
                        <td className="py-2 px-4 text-right font-mono text-muted-foreground">
                          {formatRupiah(it.unitPrice)}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-foreground">
                          {formatRupiah(it.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Subtotals & Balances Calculation */}
                <div className="bg-muted/30 p-4 border-t border-border space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Kotor</span>
                    <span className="font-mono font-semibold">{formatRupiah(invoice.totalAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>Diskon / Potongan</span>
                      {invoice.status !== 'PAID' && !isEditingDiscount && (
                        <button
                          onClick={() => setIsEditingDiscount(true)}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Ubah
                        </button>
                      )}
                    </div>
                    {isEditingDiscount ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          size="sm"
                          value={discountVal}
                          onChange={(e) => setDiscountVal(parseFloat(e.target.value) || 0)}
                          className="h-7 w-28 text-xs font-mono"
                        />
                        <Button
                          size="xs"
                          onClick={handleUpdateDiscount}
                          disabled={savingDiscount}
                          className="h-7 px-2 text-[11px]"
                        >
                          Simpan
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setIsEditingDiscount(false)}
                          className="h-7 px-2 text-[11px]"
                        >
                          Batal
                        </Button>
                      </div>
                    ) : (
                      <span className="font-mono text-emerald-600 font-semibold">
                        - {formatRupiah(invoice.discountAmount)}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between text-foreground font-bold text-sm pt-2 border-t border-border">
                    <span>Total Tagihan Bersih</span>
                    <span className="font-mono text-primary text-base">
                      {formatRupiah(invoice.finalAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between text-muted-foreground pt-1">
                    <span>Sudah Dibayar</span>
                    <span className="font-mono font-semibold text-emerald-600">
                      {formatRupiah(invoice.paidAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between text-foreground font-bold pt-1">
                    <span>Sisa Tagihan (Piutang)</span>
                    <span className="font-mono text-destructive">
                      {formatRupiah(invoice.balanceAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Riwayat Pembayaran (Payments History) */}
              {invoice.payments && invoice.payments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Riwayat Pembayaran ({invoice.payments.length})
                  </h4>
                  <div className="divide-y divide-border border border-border rounded-xl overflow-hidden text-xs">
                    {invoice.payments.map((p) => (
                      <div key={p.id} className="p-3 bg-card flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">{p.paymentNumber}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700">
                              {p.paymentMethod}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(p.paidAt).toLocaleString('id-ID')} • Kasir: {p.cashierName || 'Kasir'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-foreground">
                            {formatRupiah(p.amount)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onPrintReceipt?.(p)}
                            className="gap-1 h-7 text-xs"
                          >
                            <Printer className="w-3.5 h-3.5" /> Kuitansi
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-border bg-muted/40 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Tutup
            </Button>
            {invoice && invoice.status !== 'PAID' && invoice.registrationId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 border-blue-200 dark:border-blue-800"
                title="Tarik ulang rincian tindakan medis poli dan resep obat farmasi terbaru"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sinkronkan Tagihan</span>
              </Button>
            )}
          </div>
          {invoice && invoice.status !== 'PAID' && (
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onPay?.(invoice);
              }}
              className="gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <CreditCard className="w-4 h-4" /> Proses Pembayaran Sekarang
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
