import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Receipt, CreditCard, Banknote, QrCode, Search,
  Filter, CheckCircle2, Clock, AlertCircle, Printer,
  RefreshCw, FileText, ArrowRight, ShieldCheck, User,
  Calendar, Layers, Sparkles, RotateCw
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import { PaymentModal } from './PaymentModal';
import { ReceiptPrintModal } from './ReceiptPrintModal';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { dialog } from '@/context/DialogContext';

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('unpaid'); // 'unpaid' | 'history'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active Modals state
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [selectedInvoiceDetailId, setSelectedInvoiceDetailId] = useState(null);
  const [selectedPaymentReceipt, setSelectedPaymentReceipt] = useState(null);
  const [syncingRegId, setSyncingRegId] = useState(null);

  // ─── 1. Query Dashboard KPIs ────────────────────────────────────────────────
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['billing-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/billing/stats');
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const stats = statsData || {
    totalRevenue: 0,
    totalTransactions: 0,
    unpaidCount: 0,
    totalUnpaidAmount: 0,
    paidCountToday: 0,
    methodBreakdown: [],
  };

  // ─── 2. Query Invoices (Antrian Tagihan) ─────────────────────────────────────
  const { data: invoicesData, isLoading: isLoadingInvoices, refetch: refetchInvoices } = useQuery({
    queryKey: ['billing-invoices', search, statusFilter, activeTab, startDate, endDate],
    queryFn: async () => {
      const params = {
        search: search || undefined,
        status: activeTab === 'unpaid' ? 'UNPAID' : statusFilter !== 'ALL' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 50,
      };
      const res = await apiClient.get('/billing/invoices', { params });
      return res.data;
    },
  });

  const invoices = invoicesData?.data || [];

  // ─── 3. Query Payments (Riwayat Pembayaran) ──────────────────────────────────
  const { data: paymentsData, isLoading: isLoadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['billing-payments', search, startDate, endDate],
    queryFn: async () => {
      const params = {
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 50,
      };
      const res = await apiClient.get('/billing/payments', { params });
      return res.data;
    },
    enabled: activeTab === 'history',
  });

  const payments = paymentsData?.data || [];

  // ─── Refresh All Data ───────────────────────────────────────────────────────
  const handleRefresh = async () => {
    await Promise.all([refetchStats(), refetchInvoices(), refetchPayments()]);
  };

  // ─── Pembayaran Berhasil Callback ───────────────────────────────────────────
  const handlePaymentSuccess = (receipt) => {
    setSelectedInvoiceForPayment(null);
    setSelectedPaymentReceipt(receipt);
    handleRefresh();
  };

  // ─── Sinkronkan Tagihan dari Layanan Poli & Resep Farmasi ────────────────────
  const handleSyncInvoice = async (registrationId, invoiceNumber) => {
    if (!registrationId) {
      dialog.alert('Data registrasi tidak ditemukan untuk sinkronisasi tagihan.', {
        title: 'Sinkronisasi Gagal',
        variant: 'danger',
      });
      return;
    }

    setSyncingRegId(registrationId);
    try {
      await apiClient.post(`/billing/invoices/sync/${registrationId}`, {});
      await handleRefresh();
      dialog.alert(
        `Tagihan ${invoiceNumber ? `(${invoiceNumber})` : ''} berhasil disinkronkan dari tindakan medis poli dan resep obat farmasi terbaru.`,
        {
          title: 'Sinkronisasi Berhasil',
          variant: 'success',
        }
      );
    } catch (err) {
      dialog.alert(
        err.response?.data?.error?.message || 'Gagal menyinkronkan tagihan dari layanan poli/farmasi',
        {
          title: 'Gagal Sinkronisasi',
          variant: 'danger',
        }
      );
    } finally {
      setSyncingRegId(null);
    }
  };

  return (
    <AppLayout
      title="Kasir, Billing & Pembayaran"
      subtitle="Manajemen tagihan terintegrasi RME dan Farmasi, transaksi kasir multi-metode, dan penerbitan kuitansi resmi"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5"
            title="Muat ulang data kasir"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ─── 1. TOP KPI SUMMARY CARDS ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pendapatan Hari Ini */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm hover:border-border/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Pendapatan Hari Ini</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold font-mono text-foreground mt-2">
              {formatRupiah(stats.totalRevenue)}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {stats.totalTransactions} transaksi pembayaran
            </p>
          </div>

          {/* Card 2: Tagihan Belum Lunas */}
          <div
            onClick={() => {
              setActiveTab('unpaid');
              setStatusFilter('UNPAID');
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'unpaid'
                ? 'bg-amber-500/5 border-amber-500/40 shadow-sm'
                : 'bg-card border-border hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Tagihan Menunggu</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold font-mono text-amber-700 dark:text-amber-400 mt-2">
              {stats.unpaidCount} <span className="text-sm font-semibold text-muted-foreground">Pasien</span>
            </p>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">
              Total: {formatRupiah(stats.totalUnpaidAmount)}
            </p>
          </div>

          {/* Card 3: Transaksi Selesai Hari Ini */}
          <div
            onClick={() => setActiveTab('history')}
            className="p-4 rounded-xl border border-border bg-card shadow-sm hover:border-border/80 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Lunas Hari Ini</span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold font-mono text-foreground mt-2">
              {stats.paidCountToday} <span className="text-sm font-semibold text-muted-foreground">Invoice</span>
            </p>
            <p className="text-[11px] text-primary font-medium mt-0.5">
              Layanan & resep selesai
            </p>
          </div>

          {/* Card 4: Metode Bayar Terbanyak / Quick Summary */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Metode Pembayaran</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1 text-xs">
              {stats.methodBreakdown && stats.methodBreakdown.length > 0 ? (
                stats.methodBreakdown.slice(0, 2).map((m) => (
                  <div key={m.paymentMethod} className="flex justify-between items-center text-muted-foreground">
                    <span className="font-semibold text-foreground">{m.paymentMethod}</span>
                    <span className="font-mono text-[11px]">{formatRupiah(m.totalAmount)} ({m.count}x)</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground mt-2">Belum ada transaksi hari ini</p>
              )}
            </div>
          </div>
        </div>

        {/* ─── 2. NAVIGATION TABS & FILTER BAR ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          {/* Main Tabs */}
          <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl border border-border shrink-0">
            <button
              onClick={() => setActiveTab('unpaid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'unpaid'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Antrian Tagihan</span>
              {stats.unpaidCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {stats.unpaidCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Receipt className="w-4 h-4 text-primary" />
              <span>Riwayat Transaksi & Kuitansi</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl justify-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari no. tagihan / pasien / no. RM..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {activeTab === 'history' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="ALL">Semua Status</option>
                <option value="PAID">Lunas</option>
                <option value="PARTIAL">Sebagian</option>
                <option value="UNPAID">Belum Lunas</option>
              </select>
            )}
          </div>
        </div>

        {/* ─── 3. TAB 1: ANTRIAN TAGIHAN (BELUM LUNAS) ────────────────────────── */}
        {activeTab === 'unpaid' && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground">Daftar Tagihan Menunggu Pembayaran</h3>
                <p className="text-xs text-muted-foreground">
                  Tagihan yang terbentuk dari resep dokter dan tindakan medis poli
                </p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                Total: <span className="font-mono text-foreground font-bold">{invoices.length}</span> antrian
              </span>
            </div>

            {isLoadingInvoices ? (
              <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <span>Memuat antrian tagihan kasir...</span>
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-base">Tidak ada antrian tagihan tertunda</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Semua tagihan pasien saat ini telah lunas diproses.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-3 px-4">No. Tagihan</th>
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Pasien & No. RM</th>
                      <th className="py-3 px-4">Layanan / Poli</th>
                      <th className="py-3 px-4">Penjamin</th>
                      <th className="py-3 px-4 text-right">Total Tagihan</th>
                      <th className="py-3 px-4 text-right">Sisa Bayar</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-foreground block">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Reg: {inv.registrationNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(inv.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          <span className="block text-[10px]">
                            {new Date(inv.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-foreground text-sm block">
                            {inv.patientName}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {inv.patientMrn}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-foreground block">
                            {inv.polyclinicName || 'Poliklinik Umum'}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {inv.practitionerName || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.paymentScheme === 'BPJS'
                                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {inv.paymentScheme || 'UMUM'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-muted-foreground">
                          {formatRupiah(inv.finalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-primary text-sm">
                          {formatRupiah(inv.balanceAmount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.status === 'PARTIAL'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                : 'bg-red-500/15 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {inv.status === 'PARTIAL' ? 'Sebagian' : 'Belum Bayar'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.status !== 'PAID' && inv.registrationId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSyncInvoice(inv.registrationId, inv.invoiceNumber)}
                                disabled={syncingRegId === inv.registrationId}
                                className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 border-blue-200 dark:border-blue-800"
                                title="Sinkronkan ulang tagihan jika ada perubahan tindakan poli atau resep farmasi"
                              >
                                <RotateCw className={`w-3.5 h-3.5 ${syncingRegId === inv.registrationId ? 'animate-spin' : ''}`} />
                                <span className="hidden lg:inline ml-1">Sinkron</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedInvoiceDetailId(inv.id)}
                              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                              title="Lihat rincian item tagihan"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="hidden md:inline ml-1">Detail</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setSelectedInvoiceForPayment(inv)}
                              className="h-8 px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Bayar</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── 4. TAB 2: RIWAYAT TRANSAKSI & KUITANSI ─────────────────────────── */}
        {activeTab === 'history' && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground">Riwayat Pembayaran & Kuitansi Kasir</h3>
                <p className="text-xs text-muted-foreground">
                  Semua transaksi yang telah berhasil dibayarkan dan diterbitkan kuitansi
                </p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                Total: <span className="font-mono text-foreground font-bold">{payments.length}</span> transaksi
              </span>
            </div>

            {isLoadingPayments ? (
              <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <span>Memuat riwayat transaksi...</span>
              </div>
            ) : payments.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
                <Receipt className="w-8 h-8 opacity-40" />
                <p>Belum ada riwayat transaksi pembayaran pada filter ini</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-3 px-4">No. Kuitansi</th>
                      <th className="py-3 px-4">Waktu Transaksi</th>
                      <th className="py-3 px-4">Pasien & No. RM</th>
                      <th className="py-3 px-4">No. Tagihan</th>
                      <th className="py-3 px-4">Metode Bayar</th>
                      <th className="py-3 px-4 text-right">Nominal Bayar</th>
                      <th className="py-3 px-4">Petugas Kasir</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-foreground">
                            {p.paymentNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(p.paidAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          <span className="block text-[10px]">
                            {new Date(p.paidAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-foreground block">
                            {p.patientName}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {p.patientMrn}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {p.invoiceNumber}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground border border-border">
                            {p.paymentMethod}
                            {p.bankName && ` (${p.bankName})`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                          {formatRupiah(p.amount)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {p.cashierName || 'Kasir'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const res = await apiClient.get(`/billing/payments/${p.id}`);
                                  setSelectedPaymentReceipt(res.data.data);
                                } catch (err) {
                                  dialog.alert('Gagal memuat kuitansi', {
                                    title: 'Kuitansi Gagal',
                                    variant: 'danger',
                                  });
                                }
                              }}
                              className="h-8 px-2.5 text-xs gap-1 shadow-sm"
                            >
                              <Printer className="w-3.5 h-3.5 text-primary" />
                              <span>Kuitansi</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedInvoiceDetailId(p.invoiceId)}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                              title="Lihat rincian invoice"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODALS ──────────────────────────────────────────────────────────── */}
      {/* 1. Payment Modal */}
      {selectedInvoiceForPayment && (
        <PaymentModal
          invoice={selectedInvoiceForPayment}
          onClose={() => setSelectedInvoiceForPayment(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* 2. Official Receipt Print Modal */}
      {selectedPaymentReceipt && (
        <ReceiptPrintModal
          payment={selectedPaymentReceipt}
          onClose={() => setSelectedPaymentReceipt(null)}
        />
      )}

      {/* 3. Invoice Detail Modal */}
      {selectedInvoiceDetailId && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceDetailId}
          onClose={() => setSelectedInvoiceDetailId(null)}
          onPay={(inv) => setSelectedInvoiceForPayment(inv)}
          onSynced={handleRefresh}
          onPrintReceipt={async (pmt) => {
            try {
              const res = await apiClient.get(`/billing/payments/${pmt.id}`);
              setSelectedInvoiceDetailId(null);
              setSelectedPaymentReceipt(res.data.data);
            } catch (err) {
              setSelectedInvoiceDetailId(null);
              setSelectedPaymentReceipt(pmt);
            }
          }}
        />
      )}
    </AppLayout>
  );
}
