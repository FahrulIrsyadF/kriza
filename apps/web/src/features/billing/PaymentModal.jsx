import React, { useState } from 'react';
import {
  CreditCard, Banknote, QrCode, ShieldCheck,
  AlertCircle, CheckCircle2, X, ArrowRight, Wallet,
  Receipt, User, FileText, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/utils';
import apiClient from '@/lib/api-client';

const PAYMENT_METHODS = [
  { id: 'TUNAI', name: 'Tunai (Cash)', icon: Banknote, desc: 'Pembayaran tunai kasir' },
  { id: 'TRANSFER', name: 'Transfer Bank', icon: CreditCard, desc: 'BCA, Mandiri, BRI, BNI' },
  { id: 'QRIS', name: 'QRIS Dinamis', icon: QrCode, desc: 'Scan QRIS e-wallet/m-banking' },
  { id: 'DEBIT', name: 'Kartu Debit / EDC', icon: Wallet, desc: 'Mesin EDC klinik' },
  { id: 'BPJS', name: 'Penjaminan BPJS', icon: ShieldCheck, desc: 'Klaim BPJS P-Care' },
  { id: 'ASURANSI', name: 'Asuransi Swasta', icon: ShieldCheck, desc: 'Prudential, AXA, Mandiri Inhealth, dll' },
];

export function PaymentModal({ invoice, onClose, onSuccess }) {
  const balance = parseFloat(invoice?.balanceAmount || invoice?.finalAmount || '0');

  const [paymentMethod, setPaymentMethod] = useState(
    invoice?.paymentScheme === 'BPJS' ? 'BPJS' : 'TUNAI'
  );
  const [amount, setAmount] = useState(balance);
  const [cashTendered, setCashTendered] = useState(balance);
  const [bankName, setBankName] = useState('BCA');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!invoice) return null;

  // Kalkulasi kembalian tunai
  const parsedAmount = parseFloat(amount) || 0;
  const parsedCash = parseFloat(cashTendered) || 0;
  const changeAmount = Math.max(0, parsedCash - parsedAmount);
  const isCashInsufficient = paymentMethod === 'TUNAI' && parsedCash < parsedAmount;

  // Shortcut chip buttons for cash
  const quickCashPresets = [
    { label: 'Uang Pas', value: parsedAmount },
    { label: 'Rp 20.000', value: 20000 },
    { label: 'Rp 50.000', value: 50000 },
    { label: 'Rp 100.000', value: 100000 },
    { label: 'Rp 200.000', value: 200000 },
    { label: 'Rp 500.000', value: 500000 },
  ].filter((p) => p.value >= parsedAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (parsedAmount <= 0) {
      setErrorMsg('Nominal pembayaran harus lebih besar dari Rp 0');
      return;
    }

    if (parsedAmount > balance + 0.01) {
      setErrorMsg(`Nominal bayar melebihi sisa tagihan (${formatRupiah(balance)})`);
      return;
    }

    if (paymentMethod === 'TUNAI' && parsedCash < parsedAmount) {
      setErrorMsg('Uang tunai yang diterima kurang dari total yang harus dibayar');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        invoiceId: invoice.id,
        paymentMethod,
        amount: parsedAmount,
        cashTendered: paymentMethod === 'TUNAI' ? parsedCash : parsedAmount,
        bankName: ['TRANSFER', 'DEBIT', 'QRIS'].includes(paymentMethod) ? bankName : null,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
      };

      const res = await apiClient.post('/billing/payments', payload);
      if (res.data.success) {
        onSuccess?.(res.data.data);
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error?.message ||
        err.message ||
        'Gagal memproses pembayaran. Periksa kembali input Anda.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card text-card-foreground border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                Proses Pembayaran Kasir
              </h2>
              <p className="text-xs text-muted-foreground">
                No. Tagihan: <span className="font-semibold text-foreground font-mono">{invoice.invoiceNumber}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content Body: 2 Columns */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[72vh]">
            {/* Left Column: Summary Tagihan & Rincian Item (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Patient Card */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">Data Pasien</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    {invoice.paymentScheme || 'UMUM'}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">{invoice.patientName}</h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    RM: {invoice.patientMrn} • Reg: {invoice.registrationNumber}
                  </p>
                </div>
                <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-2 flex justify-between">
                  <span>Poli: {invoice.polyclinicName || 'Poliklinik Umum'}</span>
                  <span>Dr: {invoice.practitionerName || '-'}</span>
                </div>
              </div>

              {/* Rincian Item Tagihan */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
                  <span>Rincian Layanan ({invoice.items?.length || 0})</span>
                  <span>Subtotal</span>
                </div>
                <div className="divide-y divide-border/60 max-h-48 overflow-y-auto text-xs">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((it, idx) => (
                      <div key={it.id || idx} className="p-3 flex justify-between items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{it.itemName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {it.quantity} x {formatRupiah(it.unitPrice)}
                            {it.itemType === 'DRUG' && ' (Farmasi)'}
                            {it.itemType === 'PROCEDURE' && ' (Tindakan)'}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-foreground shrink-0">
                          {formatRupiah(it.subtotal)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      Tidak ada rincian item
                    </div>
                  )}
                </div>

                {/* Subtotals & Balances */}
                <div className="bg-muted/30 p-3 space-y-1 text-xs border-t border-border">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Kotor</span>
                    <span className="font-mono">{formatRupiah(invoice.totalAmount)}</span>
                  </div>
                  {parseFloat(invoice.discountAmount || '0') > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Diskon / Potongan</span>
                      <span className="font-mono">- {formatRupiah(invoice.discountAmount)}</span>
                    </div>
                  )}
                  {parseFloat(invoice.paidAmount || '0') > 0 && (
                    <div className="flex justify-between text-blue-600 font-medium">
                      <span>Telah Dibayar Sebelumnya</span>
                      <span className="font-mono">{formatRupiah(invoice.paidAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-extrabold text-foreground pt-1.5 border-t border-border">
                    <span>Sisa Tagihan</span>
                    <span className="font-mono text-primary text-base">
                      {formatRupiah(balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Form Pembayaran (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Payment Method Selector Cards */}
              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wide block mb-2">
                  Pilih Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m.id);
                          if (m.id === 'TUNAI') {
                            setCashTendered(amount);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary shadow-sm ring-2 ring-primary/20'
                            : 'bg-card border-border hover:border-border/80 text-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-snug">{m.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{m.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Inputs Based on Selected Method */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-4">
                {/* Nominal yang Dibayarkan */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Nominal Bayar (Rp)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      max={balance}
                      value={amount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setAmount(val);
                        if (paymentMethod === 'TUNAI' && cashTendered < val) {
                          setCashTendered(val);
                        }
                      }}
                      className="font-mono text-base font-bold pl-10"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-xs">
                      Rp
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Maksimal pembayaran: {formatRupiah(balance)}
                  </p>
                </div>

                {/* IF TUNAI: Cash Tendered & Kembalian Calculator */}
                {paymentMethod === 'TUNAI' && (
                  <div className="space-y-3 pt-2 border-t border-border/80">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Uang Diterima dari Pasien (Rp)
                        </label>
                        <span className="text-[11px] text-muted-foreground">Shortcut Pecahan:</span>
                      </div>

                      {/* Quick Cash Buttons */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {quickCashPresets.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setCashTendered(preset.value)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                              cashTendered === preset.value
                                ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                                : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="relative">
                        <Input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                          className="font-mono text-base font-bold pl-10"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-xs">
                          Rp
                        </span>
                      </div>
                    </div>

                    {/* Live Kembalian Result Banner */}
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isCashInsufficient
                          ? 'bg-destructive/10 border-destructive/30 text-destructive'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isCashInsufficient ? (
                          <AlertCircle className="w-4 h-4 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        )}
                        <span className="text-xs font-semibold">
                          {isCashInsufficient ? 'Uang Masih Kurang' : 'Kembalian Pasien'}
                        </span>
                      </div>
                      <span className="font-mono font-extrabold text-base">
                        {isCashInsufficient
                          ? `- ${formatRupiah(parsedAmount - parsedCash)}`
                          : formatRupiah(changeAmount)}
                      </span>
                    </div>
                  </div>
                )}

                {/* IF TRANSFER / DEBIT / QRIS */}
                {['TRANSFER', 'DEBIT', 'QRIS'].includes(paymentMethod) && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/80">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Bank / Provider
                      </label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                      >
                        <option value="BCA">BCA (Bank Central Asia)</option>
                        <option value="Mandiri">Bank Mandiri</option>
                        <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                        <option value="BNI">BNI</option>
                        <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                        <option value="QRIS BCA">QRIS BCA Merchant</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        No. Referensi / Transaksi
                      </label>
                      <Input
                        placeholder="Contoh: TRF-892187 / Auth 1234"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* IF BPJS / ASURANSI */}
                {['BPJS', 'ASURANSI'].includes(paymentMethod) && (
                  <div className="space-y-2 pt-2 border-t border-border/80">
                    <label className="text-xs font-semibold text-foreground block">
                      {paymentMethod === 'BPJS' ? 'No. SEP / Kartu BPJS' : 'Nama Asuransi & No. Polis/Klaim'}
                    </label>
                    <Input
                      placeholder={
                        paymentMethod === 'BPJS'
                          ? 'No. Kartu BPJS atau Kode SEP Online'
                          : 'Contoh: Prudential - POL-10928192'
                      }
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {paymentMethod === 'BPJS'
                        ? 'Penjaminan resmi BPJS Kesehatan untuk pelayanan faskes tingkat pertama.'
                        : 'Biaya ditagihkan ke pihak asuransi penjamin pasien.'}
                    </p>
                  </div>
                )}

                {/* Catatan Kasir */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Catatan Kasir (Opsional)
                  </label>
                  <Input
                    placeholder="Catatan tambahan pembayaran..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] text-muted-foreground">Total yang akan dibayar:</p>
                <p className="text-base font-extrabold font-mono text-foreground leading-none">
                  {formatRupiah(parsedAmount)}
                </p>
              </div>
              <Button
                type="submit"
                size="default"
                disabled={isSubmitting || isCashInsufficient}
                className="gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSubmitting ? (
                  'Memproses...'
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Konfirmasi Pembayaran
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
