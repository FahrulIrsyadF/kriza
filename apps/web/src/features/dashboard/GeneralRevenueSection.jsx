import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  Banknote,
  QrCode,
  TrendingUp,
  Receipt,
  Calendar,
  ArrowUpRight,
  RefreshCw,
  CreditCard,
  Building2,
  Stethoscope,
  Pill,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Helper format mata uang Rupiah
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num || 0);
}

// Helper format jam WIB (HH:mm)
function formatTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function GeneralRevenueSection() {
  const todayIso = new Date().toISOString().substring(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayIso);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['daily-general-revenue', selectedDate],
    queryFn: async () => {
      const res = await apiClient.get('/billing/daily-general-revenue', {
        params: { date: selectedDate },
      });
      return res.data.data;
    },
    refetchInterval: 30000, // auto refetch setiap 30 detik untuk update kasir real-time
  });

  const summary = data?.summary || {
    totalRevenue: 0,
    totalTransactions: 0,
    cashAmount: 0,
    nonCashAmount: 0,
    averageTicket: 0,
    unpaidCount: 0,
    totalUnpaidAmount: 0,
  };

  const paymentMethods = data?.paymentMethods || [];
  const serviceBreakdown = data?.serviceBreakdown || [];
  const recentTransactions = data?.recentTransactions || [];
  const weeklyTrend = data?.weeklyTrend || [];

  // Hitung nilai tertinggi di weekly trend untuk scaling tinggi bar chart
  const maxWeeklyRevenue = Math.max(
    ...weeklyTrend.map((t) => t.revenue || 0),
    1
  );

  return (
    <div className="space-y-4 mb-8">
      {/* ─── Header Section ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Laporan Keuangan Harian — Pasien Umum
              </h3>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px] font-semibold gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Kas Masuk
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Penerimaan kas, pembayaran tunai & non-tunai langsung dari pasien mandiri/umum
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-muted/50 border border-border px-2.5 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-foreground font-medium focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-2.5 rounded-xl text-xs gap-1.5"
            title="Muat ulang data kasir"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>

          <Link
            to="/billing"
            className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors border border-primary/20"
          >
            Modul Kasir
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Indikator Database Offline / Kendala Jaringan */}
      {data?.dbOffline && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-xs font-medium">
          <span className="font-bold">⚠️ Catatan Jaringan:</span>
          <span>Koneksi database sedang mengalami kendala jaringan. Menampilkan struktur laporan default.</span>
        </div>
      )}

      {/* ─── 4 Top KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Pendapatan Umum */}
        <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
              Total Kas Diterima
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {formatRupiah(summary.totalRevenue)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground font-mono">{summary.totalTransactions}</span>
            <span>transaksi lunas</span>
            {selectedDate === todayIso && (
              <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Hari Ini
              </span>
            )}
          </div>
        </div>

        {/* 2. Penerimaan Tunai */}
        <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
              Penerimaan Tunai (Cash)
            </span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 font-mono">
            {formatRupiah(summary.cashAmount)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Uang fisik di kasir</span>
            <span className="font-semibold text-blue-600">
              {summary.totalRevenue > 0
                ? `${Math.round((summary.cashAmount / summary.totalRevenue) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* 3. Penerimaan Non-Tunai */}
        <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
              Penerimaan Non-Tunai
            </span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 font-mono">
            {formatRupiah(summary.nonCashAmount)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>QRIS, Transfer, EDC</span>
            <span className="font-semibold text-purple-600">
              {summary.totalRevenue > 0
                ? `${Math.round((summary.nonCashAmount / summary.totalRevenue) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* 4. Rata-rata per Transaksi */}
        <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
              Rata-rata / Pasien
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 font-mono">
            {formatRupiah(summary.averageTicket)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Average revenue/visit</span>
            {summary.unpaidCount > 0 && (
              <span className="text-[10px] text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded font-semibold">
                {summary.unpaidCount} belum lunas
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Middle Grid: Breakdown & 7-Day Trend ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel Kiri: Metode Pembayaran & Komposisi Layanan */}
        <Card className="rounded-2xl">
          <CardHeader className="py-4 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Rincian Pembayaran & Komposisi Layanan
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                {paymentMethods.length} metode aktif
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            {/* 1. Bar Metode Pembayaran */}
            <div>
              <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5">
                Metode Pembayaran
              </p>
              {paymentMethods.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic">
                  Belum ada transaksi pembayaran pasien umum pada tanggal ini.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {paymentMethods.map((m) => (
                    <div key={m.paymentMethod} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">
                            {m.paymentMethod === 'TUNAI'
                              ? '💵 Tunai'
                              : m.paymentMethod === 'QRIS'
                              ? '📱 QRIS'
                              : m.paymentMethod === 'TRANSFER'
                              ? '🏦 Transfer Bank'
                              : m.paymentMethod === 'DEBIT'
                              ? '💳 Kartu Debit'
                              : m.paymentMethod}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ({m.count}x)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground font-mono">
                            {formatRupiah(m.totalAmount)}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground w-8 text-right">
                            {m.percentage}%
                          </span>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            m.paymentMethod === 'TUNAI'
                              ? 'bg-emerald-500'
                              : m.paymentMethod === 'QRIS'
                              ? 'bg-purple-500'
                              : m.paymentMethod === 'TRANSFER'
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, m.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Komposisi Layanan (Tindakan vs Obat vs Konsultasi) */}
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5">
                Sumber Pendapatan Pasien Umum
              </p>
              {serviceBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1 italic">
                  Belum ada rincian item tagihan.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {serviceBreakdown.map((s) => (
                    <div
                      key={s.itemType}
                      className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground truncate">
                          {s.label}
                        </span>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {s.percentage}%
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground font-mono mt-1.5">
                        {formatRupiah(s.totalAmount)}
                      </p>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {s.count} item tercatat
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Panel Kanan: Tren Pendapatan 7 Hari Terakhir */}
        <Card className="rounded-2xl flex flex-col">
          <CardHeader className="py-4 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Tren Pendapatan Pasien Umum (7 Hari Terakhir)
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                H-6 s.d. Hari Ini
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between">
            <p className="text-xs text-muted-foreground mb-4">
              Visualisasi pergerakan kas masuk pasien umum setiap harinya untuk memantau omset dan kunjungan harian klinik:
            </p>

            {/* Visual Bar Chart 7 Hari */}
            <div className="grid grid-cols-7 gap-2 items-end h-44 pb-2 border-b border-border/60">
              {weeklyTrend.map((day) => {
                const isSelected = day.date === selectedDate;
                const heightPercent =
                  maxWeeklyRevenue > 0
                    ? Math.max(6, Math.round((day.revenue / maxWeeklyRevenue) * 100))
                    : 6;

                return (
                  <div
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    className={`flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group transition-all`}
                    title={`${day.dayName}, ${day.date}: ${formatRupiah(day.revenue)} (${day.transactions} transaksi)`}
                  >
                    {/* Tooltip nominal on hover */}
                    <span className="text-[9px] font-mono font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full">
                      {day.revenue > 0 ? `${Math.round(day.revenue / 1000)}k` : '0'}
                    </span>

                    {/* Bar visual */}
                    <div className="w-full max-w-[32px] rounded-t-lg bg-muted/60 flex items-end overflow-hidden h-32">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isSelected
                            ? 'bg-emerald-500 shadow-md shadow-emerald-500/20'
                            : 'bg-primary/70 group-hover:bg-primary'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    {/* Label Hari */}
                    <span
                      className={`text-[11px] font-bold ${
                        isSelected
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    >
                      {day.dayName}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono -mt-1">
                      {day.date.substring(8, 10)}/{day.date.substring(5, 7)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Tanggal Terpilih ({selectedDate})
              </span>
              <span className="font-mono text-foreground font-bold">
                Total 7 Hari: {formatRupiah(weeklyTrend.reduce((s, d) => s + (d.revenue || 0), 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Bottom Table: Transaksi Pembayaran Pasien Umum Hari Ini ─────────── */}
      <Card className="rounded-2xl">
        <CardHeader className="py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Daftar Pembayaran Pasien Umum ({selectedDate})
            </CardTitle>
            <span className="text-xs font-semibold text-muted-foreground">
              {recentTransactions.length} transaksi ditampilkan
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs font-medium">Belum ada transaksi pasien umum pada tanggal ini</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                Transaksi pembayaran yang diproses kasir akan muncul secara real-time di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                    <th className="py-2.5 px-4 text-left font-semibold">Waktu</th>
                    <th className="py-2.5 px-4 text-left font-semibold">No. Kuitansi / Invoice</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Pasien (RM)</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Poliklinik</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Metode Bayar</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Nominal Diterima</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Kasir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {formatTime(tx.paidAt)} WIB
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-foreground block">
                          {tx.paymentNumber}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {tx.invoiceNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-foreground block">{tx.patientName}</span>
                        <span className="text-[10px] text-primary font-mono font-semibold">
                          RM: {tx.patientMrn}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {tx.polyclinicName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            tx.paymentMethod === 'TUNAI'
                              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300'
                              : tx.paymentMethod === 'QRIS'
                              ? 'bg-purple-500/10 text-purple-700 border-purple-300'
                              : tx.paymentMethod === 'TRANSFER'
                              ? 'bg-blue-500/10 text-blue-700 border-blue-300'
                              : 'bg-amber-500/10 text-amber-700 border-amber-300'
                          }`}
                        >
                          {tx.paymentMethod}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatRupiah(tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {tx.cashierName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
