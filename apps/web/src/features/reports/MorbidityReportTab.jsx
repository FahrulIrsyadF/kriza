import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  FileSpreadsheet,
  Printer,
  Filter,
  BarChart3,
  Award,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { exportToExcel } from '@/lib/export-excel';
import { HorizontalBarMetric } from './ReportVisuals';
import { ReportPrintModal } from './ReportPrintModal';

export function MorbidityReportTab({ startDate, endDate, periodLabel }) {
  const [limit, setLimit] = useState(10);
  const [polyclinicId, setPolyclinicId] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Master Poliklinik untuk filter
  const { data: polyclinics = [] } = useQuery({
    queryKey: ['master-polyclinics-simple'],
    queryFn: async () => {
      const res = await apiClient.get('/master/polyclinics');
      return res.data.data.items || [];
    },
  });

  // Query Laporan Morbiditas
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports-morbidity', startDate, endDate, polyclinicId, limit],
    queryFn: async () => {
      const params = {
        startDate,
        endDate,
        polyclinicId: polyclinicId || undefined,
        limit,
      };
      const res = await apiClient.get('/reports/morbidity', { params });
      return res.data;
    },
  });

  const grandTotal = reportData?.data?.grandTotal || 0;
  const items = reportData?.data?.items || [];
  const top1Diagnosis = items[0] || null;

  // Table Columns Definition
  const tableColumns = [
    { key: 'rank', label: 'Peringkat', align: 'center' },
    { key: 'icd10Code', label: 'Kode ICD-10' },
    { key: 'icd10Name', label: 'Nama Penyakit / Diagnosa' },
    { key: 'kasusBaru', label: 'Kasus Baru', align: 'right' },
    { key: 'kasusLama', label: 'Kasus Lama', align: 'right' },
    { key: 'primaryCases', label: 'Diagnosa Primer', align: 'right' },
    { key: 'totalCases', label: 'Total Kasus', align: 'right' },
    {
      key: 'percentage',
      label: 'Proporsi (%)',
      align: 'right',
      format: (v) => `${v}%`,
    },
  ];

  // Ekspor Excel (.xlsx)
  const handleExportExcel = () => {
    exportToExcel({
      filename: `Laporan-Morbiditas-10-Besar-Penyakit-${startDate}-sd-${endDate}`,
      sheetName: 'Morbiditas ICD-10',
      title: `Laporan ${limit} Besar Morbiditas / Penyakit (ICD-10)`,
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
            <span className="text-xs font-semibold text-muted-foreground">Total Kasus Diagnosa</span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-foreground mt-2">{grandTotal}</p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Seluruh diagnosa encounter tuntas
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Penyakit Terbanyak (#1)</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground mt-2 truncate" title={top1Diagnosis?.icd10Name}>
            {top1Diagnosis ? top1Diagnosis.icd10Name : '-'}
          </p>
          <span className="text-[11px] text-amber-600 font-mono font-semibold mt-0.5 block">
            {top1Diagnosis ? `${top1Diagnosis.totalCases} kasus (${top1Diagnosis.percentage}%)` : '-'}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Akumulasi Kasus Baru</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {items.reduce((acc, i) => acc + i.kasusBaru, 0)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Dalam daftar {limit} penyakit teratas
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Akumulasi Kasus Lama</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-2">
            {items.reduce((acc, i) => acc + i.kasusLama, 0)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Kunjungan berulang / kronis
          </span>
        </div>
      </div>

      {/* ─── 2. Top Morbidity Progress Chart ─────────────────────────────────── */}
      <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Grafik Ranking {limit} Besar Morbiditas Penyakit
            </h3>
            <p className="text-xs text-muted-foreground">
              Distribusi frekuensi kasus diagnosa ICD-10 berdasarkan rekam medis dokter
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            Standar ICD-10 WHO
          </span>
        </div>

        <HorizontalBarMetric
          items={items.map((i) => ({
            code: i.icd10Code,
            name: i.icd10Name,
            total: i.totalCases,
            percentage: i.percentage,
          }))}
          titleKey="name"
          codeKey="code"
          valueKey="total"
          subValueKey="percentage"
          colorClass="bg-primary"
        />
      </div>

      {/* ─── 3. Filters & Action Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
          >
            <option value={10}>10 Besar Penyakit</option>
            <option value={20}>20 Besar Penyakit</option>
            <option value={50}>50 Besar Penyakit</option>
          </select>

          <select
            value={polyclinicId}
            onChange={(e) => setPolyclinicId(e.target.value)}
            className="h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Semua Poliklinik</option>
            {polyclinics.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
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
                <th className="py-3 px-3.5 font-semibold text-center w-12">Rank</th>
                <th className="py-3 px-3.5 font-semibold w-24">Kode ICD-10</th>
                <th className="py-3 px-3.5 font-semibold">Nama Diagnosa / Penyakit</th>
                <th className="py-3 px-3.5 font-semibold text-right">Kasus Baru</th>
                <th className="py-3 px-3.5 font-semibold text-right">Kasus Lama</th>
                <th className="py-3 px-3.5 font-semibold text-right">Diagnosa Primer</th>
                <th className="py-3 px-3.5 font-semibold text-right">Total Kasus</th>
                <th className="py-3 px-3.5 font-semibold text-right">Proporsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    Memuat data morbiditas ICD-10...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada data diagnosa pada rentang tanggal ini
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.icd10Code} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3.5 text-center font-bold text-foreground">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-mono font-bold ${
                          row.rank === 1
                            ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                            : row.rank <= 3
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {row.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-primary">
                      {row.icd10Code}
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-foreground">
                      {row.icd10Name}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {row.kasusBaru}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">
                      {row.kasusLama}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-muted-foreground">
                      {row.primaryCases}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-foreground">
                      {row.totalCases}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-muted-foreground">
                      {row.percentage}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 5. Print Modal ─────────────────────────────────────────────────── */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={`Laporan ${limit} Besar Morbiditas Penyakit (ICD-10)`}
        subtitle="Daftar pola penyakit terbanyak pada pasien rawat jalan Klinik Pratama Rawat Inap Rizani"
        period={periodLabel}
        summaryCards={[
          { label: 'Total Kasus Diagnosa', value: `${grandTotal} Kasus` },
          { label: 'Diagnosa Terbanyak', value: top1Diagnosis?.icd10Code || '-' },
          {
            label: 'Total Kasus Baru',
            value: `${items.reduce((acc, i) => acc + i.kasusBaru, 0)} Kasus`,
          },
          {
            label: 'Total Kasus Lama',
            value: `${items.reduce((acc, i) => acc + i.kasusLama, 0)} Kasus`,
          },
        ]}
        columns={tableColumns}
        data={items}
      />
    </div>
  );
}
