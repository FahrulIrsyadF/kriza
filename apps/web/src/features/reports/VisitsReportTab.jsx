import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Calendar,
  Building2,
  Stethoscope,
  CreditCard,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { exportToExcel } from '@/lib/export-excel';
import { TrendBarChart, HorizontalBarMetric } from './ReportVisuals';
import { ReportPrintModal } from './ReportPrintModal';

export function VisitsReportTab({ startDate, endDate, periodLabel }) {
  const [polyclinicId, setPolyclinicId] = useState('');
  const [visitType, setVisitType] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [page, setPage] = useState(1);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Master Poliklinik untuk filter
  const { data: polyclinics = [] } = useQuery({
    queryKey: ['master-polyclinics-simple'],
    queryFn: async () => {
      const res = await apiClient.get('/master/polyclinics');
      return res.data.data.items || [];
    },
  });

  // Query Laporan Kunjungan
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports-visits', startDate, endDate, polyclinicId, visitType, paymentMethod, page],
    queryFn: async () => {
      const params = {
        startDate,
        endDate,
        polyclinicId: polyclinicId || undefined,
        visitType: visitType !== 'ALL' ? visitType : undefined,
        paymentMethod: paymentMethod !== 'ALL' ? paymentMethod : undefined,
        page,
        limit: 50,
      };
      const res = await apiClient.get('/reports/visits', { params });
      return res.data;
    },
  });

  const summary = reportData?.data?.summary || {
    total: 0,
    baruCount: 0,
    lamaCount: 0,
    bpjsCount: 0,
    umumCount: 0,
    asuransiCount: 0,
    selesaiCount: 0,
    batalCount: 0,
  };

  const polyBreakdown = reportData?.data?.polyBreakdown || [];
  const dailyTrend = reportData?.data?.dailyTrend || [];
  const items = reportData?.data?.items || [];
  const meta = reportData?.meta || { total: 0, totalPages: 1 };

  // Table Columns Definition
  const tableColumns = [
    { key: '_index', label: 'No' },
    { key: 'registrationDate', label: 'Tgl Kunjungan' },
    { key: 'registrationNumber', label: 'No. Registrasi' },
    { key: 'queueNumber', label: 'Antrian' },
    { key: 'patientMrn', label: 'No. RM' },
    { key: 'patientName', label: 'Nama Pasien' },
    { key: 'polyclinicName', label: 'Poliklinik' },
    { key: 'practitionerName', label: 'Dokter Pemeriksa' },
    { key: 'visitType', label: 'Tipe' },
    { key: 'paymentMethod', label: 'Penjamin' },
    { key: 'status', label: 'Status' },
  ];

  // Ekspor Excel (.xlsx)
  const handleExportExcel = () => {
    exportToExcel({
      filename: `Laporan-Kunjungan-Klinik-Rizani-${startDate}-sd-${endDate}`,
      sheetName: 'Kunjungan Pasien',
      title: 'Laporan Kunjungan Pasien & Antrian Poliklinik',
      period: periodLabel,
      columns: tableColumns,
      data: items,
    });
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Kunjungan
          </span>
          <p className="text-2xl font-black font-mono text-foreground mt-1">{summary.total}</p>
          <span className="text-[10px] text-muted-foreground">Pasien terdaftar</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Pasien Baru
          </span>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.baruCount}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {summary.total > 0 ? `${((summary.baruCount / summary.total) * 100).toFixed(0)}% dari total` : '-'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Pasien Lama
          </span>
          <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
            {summary.lamaCount}
          </p>
          <span className="text-[10px] text-muted-foreground">Kunjungan ulang</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Peserta BPJS
          </span>
          <p className="text-2xl font-black font-mono text-primary mt-1">{summary.bpjsCount}</p>
          <span className="text-[10px] text-muted-foreground">Klaim BPJS</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Pasien Umum
          </span>
          <p className="text-2xl font-black font-mono text-foreground mt-1">{summary.umumCount}</p>
          <span className="text-[10px] text-muted-foreground">Mandiri / Tunai</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Selesai Dilayani
          </span>
          <p className="text-2xl font-black font-mono text-emerald-600 mt-1">{summary.selesaiCount}</p>
          <span className="text-[10px] text-muted-foreground">
            {summary.batalCount > 0 ? `${summary.batalCount} dibatalkan` : 'Layanan rampung'}
          </span>
        </div>
      </div>

      {/* ─── 2. Visual Charts Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tren Kunjungan Harian */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">Tren Kunjungan Harian Pasien</h3>
              <p className="text-xs text-muted-foreground">
                Fluktuasi volume pasien rawat jalan pada periode terpilih
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {dailyTrend.length} Hari Aktif
            </span>
          </div>
          <TrendBarChart
            data={dailyTrend}
            dataKey="total"
            labelKey="date"
            height={180}
            barColor="bg-primary"
            emptyMessage="Belum ada data kunjungan pada rentang tanggal ini"
          />
        </div>

        {/* Distribusi Poliklinik */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Distribusi Kunjungan per Poli</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Beban unit poliklinik rawat jalan
            </p>
            <HorizontalBarMetric
              items={polyBreakdown.map((p) => ({
                name: p.polyclinicName,
                total: p.count,
                percentage: summary.total > 0 ? ((p.count / summary.total) * 100).toFixed(0) : 0,
              }))}
              titleKey="name"
              valueKey="total"
              subValueKey="percentage"
              colorClass="bg-primary"
            />
          </div>
        </div>
      </div>

      {/* ─── 3. Filters & Action Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Poli Filter */}
          <select
            value={polyclinicId}
            onChange={(e) => {
              setPolyclinicId(e.target.value);
              setPage(1);
            }}
            className="h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Semua Poliklinik</option>
            {polyclinics.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Tipe Pasien Filter */}
          <select
            value={visitType}
            onChange={(e) => {
              setVisitType(e.target.value);
              setPage(1);
            }}
            className="h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">Semua Tipe Pasien</option>
            <option value="BARU">Pasien Baru</option>
            <option value="LAMA">Pasien Lama</option>
          </select>

          {/* Penjamin Filter */}
          <select
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
            className="h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">Semua Penjamin</option>
            <option value="UMUM">Umum (Tunai)</option>
            <option value="BPJS">BPJS Kesehatan</option>
            <option value="ASURANSI_SWASTA">Asuransi Swasta</option>
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

      {/* ─── 4. Detailed Data Table ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="py-3 px-3.5 font-semibold">No</th>
                <th className="py-3 px-3.5 font-semibold">Tgl Kunjungan</th>
                <th className="py-3 px-3.5 font-semibold">No. Registrasi</th>
                <th className="py-3 px-3.5 font-semibold">Antrian</th>
                <th className="py-3 px-3.5 font-semibold">No. RM</th>
                <th className="py-3 px-3.5 font-semibold">Nama Pasien</th>
                <th className="py-3 px-3.5 font-semibold">Poliklinik</th>
                <th className="py-3 px-3.5 font-semibold">Dokter</th>
                <th className="py-3 px-3.5 font-semibold">Tipe</th>
                <th className="py-3 px-3.5 font-semibold">Penjamin</th>
                <th className="py-3 px-3.5 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-xs text-muted-foreground">
                    Memuat data laporan kunjungan...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada data kunjungan yang sesuai dengan filter
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-muted-foreground">
                      {(page - 1) * 50 + idx + 1}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-muted-foreground whitespace-nowrap">
                      {row.registrationDate}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-foreground whitespace-nowrap">
                      {row.registrationNumber}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-primary">
                      {row.queueNumber || '-'}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-muted-foreground">
                      {row.patientMrn}
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-foreground">
                      {row.patientName}
                      <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                        ({row.patientGender === 'L' ? 'L' : 'P'})
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-foreground">{row.polyclinicName}</td>
                    <td className="py-2.5 px-3.5 text-muted-foreground">
                      {row.practitionerName || '-'}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <Badge
                        variant={row.visitType === 'BARU' ? 'emerald' : 'secondary'}
                        className="text-[10px] font-semibold"
                      >
                        {row.visitType}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <Badge
                        variant={row.paymentMethod === 'BPJS' ? 'info' : 'outline'}
                        className="text-[10px] font-semibold"
                      >
                        {row.paymentMethod}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <Badge
                        variant={
                          row.status === 'SELESAI'
                            ? 'emerald'
                            : row.status === 'BATAL'
                            ? 'destructive'
                            : 'warning'
                        }
                        className="text-[10px] font-semibold"
                      >
                        {row.status}
                      </Badge>
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
              Halaman {page} dari {meta.totalPages} ({meta.total} total kunjungan)
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

      {/* ─── 5. Print Modal ─────────────────────────────────────────────────── */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Laporan Kunjungan Pasien & Antrian Rawat Jalan"
        subtitle="Rekapitulasi registrasi pelayanan poliklinik Klinik Pratama Rawat Inap Rizani"
        period={periodLabel}
        summaryCards={[
          { label: 'Total Kunjungan', value: `${summary.total} Pasien` },
          { label: 'Pasien Baru', value: `${summary.baruCount} Pasien` },
          { label: 'Pasien Lama', value: `${summary.lamaCount} Pasien` },
          { label: 'Peserta BPJS', value: `${summary.bpjsCount} Pasien` },
        ]}
        columns={[
          { key: '_index', label: 'No', align: 'center' },
          { key: 'registrationDate', label: 'Tanggal' },
          { key: 'registrationNumber', label: 'No. Registrasi' },
          { key: 'patientMrn', label: 'No. RM' },
          { key: 'patientName', label: 'Nama Pasien' },
          { key: 'polyclinicName', label: 'Poliklinik' },
          { key: 'practitionerName', label: 'Dokter' },
          { key: 'visitType', label: 'Tipe' },
          { key: 'paymentMethod', label: 'Penjamin' },
          { key: 'status', label: 'Status' },
        ]}
        data={items}
      />
    </div>
  );
}
