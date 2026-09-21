import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  CreditCard,
  QrCode,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  Filter,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/utils';
import { exportToExcel } from '@/lib/export-excel';
import {
  TrendBarChart,
  SegmentedDistributionBar,
  HorizontalBarMetric,
} from './ReportVisuals';
import { ReportPrintModal } from './ReportPrintModal';

const PAYMENT_COLORS = {
  TUNAI: 'bg-emerald-500',
  TRANSFER: 'bg-blue-500',
  QRIS: 'bg-purple-500',
  DEBIT: 'bg-amber-500',
  BPJS: 'bg-teal-500',
  ASURANSI: 'bg-indigo-500',
};

export function RevenueReportTab({ startDate, endDate, periodLabel }) {
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [page, setPage] = useState(1);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Query Laporan Pendapatan
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports-revenue', startDate, endDate, paymentMethod, page],
    queryFn: async () => {
      const params = {
        startDate,
        endDate,
        paymentMethod: paymentMethod !== 'ALL' ? paymentMethod : undefined,
        page,
        limit: 50,
      };
      const res = await apiClient.get('/reports/revenue', { params });
      return res.data;
    },
  });

  const summary = reportData?.data?.summary || {
    totalRevenue: 0,
    transactionCount: 0,
    totalInvoiced: 0,
    totalDiscount: 0,
    totalReceivables: 0,
    totalPaidInvoices: 0,
    totalUnpaidInvoices: 0,
  };

  const methodBreakdown = reportData?.data?.methodBreakdown || [];
  const categoryBreakdown = reportData?.data?.categoryBreakdown || [];
  const dailyTrend = reportData?.data?.dailyTrend || [];
  const items = reportData?.data?.items || [];
  const meta = reportData?.meta || { total: 0, totalPages: 1 };

  // Table Columns Definition
  const tableColumns = [
    { key: '_index', label: 'No' },
    {
      key: 'paidAt',
      label: 'Waktu Pembayaran',
      format: (val) =>
        val
          ? new Date(val).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-',
    },
    { key: 'paymentNumber', label: 'No. Kuitansi' },
    { key: 'invoiceNumber', label: 'No. Tagihan' },
    { key: 'patientMrn', label: 'No. RM' },
    { key: 'patientName', label: 'Nama Pasien' },
    { key: 'paymentMethod', label: 'Metode Bayar' },
    { key: 'bankName', label: 'Bank / Channel' },
    { key: 'referenceNumber', label: 'No. Ref / Approval' },
    { key: 'cashierName', label: 'Kasir' },
    {
      key: 'amount',
      label: 'Jumlah Pembayaran',
      align: 'right',
      format: (val) => formatRupiah(val),
    },
  ];

  // Ekspor Excel (.xlsx)
  const handleExportExcel = () => {
    exportToExcel({
      filename: `Laporan-Pendapatan-Kasir-Klinik-Rizani-${startDate}-sd-${endDate}`,
      sheetName: 'Pendapatan Kasir',
      title: 'Laporan Rekapitulasi Pendapatan & Kasir',
      period: periodLabel,
      columns: tableColumns,
      data: items,
    });
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Omzet Masuk</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {formatRupiah(summary.totalRevenue)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {summary.transactionCount} transaksi pembayaran diterima
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Nilai Tagihan</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-foreground mt-2">
            {formatRupiah(summary.totalInvoiced)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {summary.totalPaidInvoices} invoice berstatus lunas
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Sisa Piutang Pasien</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
            {formatRupiah(summary.totalReceivables)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {summary.totalUnpaidInvoices} tagihan belum lunas / pending
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Potongan / Diskon</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-foreground mt-2">
            {formatRupiah(summary.totalDiscount)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Total diskon layanan & obat
          </span>
        </div>
      </div>

      {/* ─── 2. Visual Charts Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tren Pendapatan Harian */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">Tren Penerimaan Kas Harian</h3>
              <p className="text-xs text-muted-foreground">
                Arus kas masuk yang dibukukan kasir per hari
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
              {formatRupiah(summary.totalRevenue)}
            </span>
          </div>
          <TrendBarChart
            data={dailyTrend}
            dataKey="totalAmount"
            labelKey="date"
            height={180}
            barColor="bg-emerald-500"
            hoverColor="hover:bg-emerald-400"
            isCurrency={true}
            emptyMessage="Belum ada transaksi pembayaran pada rentang tanggal ini"
          />
        </div>

        {/* Kategori Pendapatan (Tindakan vs Obat vs Admin) */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Breakdown Kategori Layanan</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Komposisi omzet tindakan vs farmasi
            </p>
            <HorizontalBarMetric
              items={categoryBreakdown.map((c) => ({
                name:
                  c.itemType === 'PROCEDURE'
                    ? 'Tindakan Medis / Konsul'
                    : c.itemType === 'DRUG'
                    ? 'Obat & Alkes Farmasi'
                    : 'Administrasi & Lainnya',
                total: c.totalAmount,
                percentage:
                  summary.totalInvoiced > 0
                    ? ((c.totalAmount / summary.totalInvoiced) * 100).toFixed(0)
                    : 0,
              }))}
              titleKey="name"
              valueKey="total"
              subValueKey="percentage"
              colorClass="bg-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ─── 3. Segmented Payment Method Distribution ───────────────────────── */}
      <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-1">
          Distribusi Saluran & Metode Pembayaran
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Proporsi penerimaan kas berdasarkan metode pembayaran pasien
        </p>
        <SegmentedDistributionBar
          segments={methodBreakdown.map((m) => ({
            label: m.paymentMethod,
            value: m.totalAmount,
            amount: m.totalAmount,
            color: PAYMENT_COLORS[m.paymentMethod] || 'bg-primary',
          }))}
        />
      </div>

      {/* ─── 4. Filters & Action Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
        {/* Filters */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
            className="h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">Semua Metode Pembayaran</option>
            <option value="TUNAI">Tunai</option>
            <option value="TRANSFER">Transfer Bank</option>
            <option value="QRIS">QRIS</option>
            <option value="DEBIT">Kartu Debit</option>
            <option value="BPJS">BPJS Kesehatan</option>
            <option value="ASURANSI">Asuransi Swasta</option>
          </select>
        </div>

        {/* Action Buttons: Export Excel & Print */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </Button>
        </div>
      </div>

      {/* ─── 5. Detailed Transactions Table ─────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="py-3 px-3.5 font-semibold">No</th>
                <th className="py-3 px-3.5 font-semibold">Waktu Pembayaran</th>
                <th className="py-3 px-3.5 font-semibold">No. Kuitansi</th>
                <th className="py-3 px-3.5 font-semibold">No. Tagihan</th>
                <th className="py-3 px-3.5 font-semibold">No. RM</th>
                <th className="py-3 px-3.5 font-semibold">Nama Pasien</th>
                <th className="py-3 px-3.5 font-semibold">Metode</th>
                <th className="py-3 px-3.5 font-semibold">Bank / Ref</th>
                <th className="py-3 px-3.5 font-semibold">Kasir</th>
                <th className="py-3 px-3.5 font-semibold text-right">Jumlah (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-muted-foreground">
                    Memuat data transaksi pembayaran...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada data transaksi yang sesuai dengan filter
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-muted-foreground">
                      {(page - 1) * 50 + idx + 1}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-muted-foreground whitespace-nowrap">
                      {row.paidAt
                        ? new Date(row.paidAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-primary whitespace-nowrap">
                      {row.paymentNumber}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-muted-foreground whitespace-nowrap">
                      {row.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-muted-foreground">
                      {row.patientMrn}
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-foreground">
                      {row.patientName}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold border-primary/20 bg-primary/5"
                      >
                        {row.paymentMethod}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3.5 text-muted-foreground font-mono">
                      {row.bankName || row.referenceNumber || '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-muted-foreground">
                      {row.cashierName || 'Kasir'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-foreground">
                      {formatRupiah(row.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs">
            <span className="text-muted-foreground">
              Halaman {page} dari {meta.totalPages} ({meta.total} transaksi)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── 6. Print Modal ─────────────────────────────────────────────────── */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Laporan Rekapitulasi Pendapatan & Kasir"
        subtitle="Rincian arus kas masuk, invoice, dan metode pembayaran Klinik Pratama Rawat Inap Rizani"
        period={periodLabel}
        summaryCards={[
          { label: 'Total Omzet Masuk', value: formatRupiah(summary.totalRevenue) },
          { label: 'Total Transaksi', value: `${summary.transactionCount} Transaksi` },
          { label: 'Total Piutang', value: formatRupiah(summary.totalReceivables) },
          { label: 'Total Diskon', value: formatRupiah(summary.totalDiscount) },
        ]}
        columns={[
          { key: '_index', label: 'No', align: 'center' },
          {
            key: 'paidAt',
            label: 'Waktu',
            format: (v) => (v ? new Date(v).toLocaleDateString('id-ID') : '-'),
          },
          { key: 'paymentNumber', label: 'No. Kuitansi' },
          { key: 'invoiceNumber', label: 'No. Tagihan' },
          { key: 'patientMrn', label: 'No. RM' },
          { key: 'patientName', label: 'Nama Pasien' },
          { key: 'paymentMethod', label: 'Metode' },
          { key: 'cashierName', label: 'Kasir' },
          {
            key: 'amount',
            label: 'Jumlah',
            align: 'right',
            format: (v) => formatRupiah(v),
          },
        ]}
        data={items}
      />
    </div>
  );
}
