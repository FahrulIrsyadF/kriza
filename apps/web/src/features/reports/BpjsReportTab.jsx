import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { exportToExcel } from '@/lib/export-excel';
import { ReportPrintModal } from './ReportPrintModal';

export function BpjsReportTab({ startDate, endDate, periodLabel }) {
  const [polyclinicId, setPolyclinicId] = useState('');
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

  // Query Laporan BPJS
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports-bpjs', startDate, endDate, polyclinicId, page],
    queryFn: async () => {
      const params = {
        startDate,
        endDate,
        polyclinicId: polyclinicId || undefined,
        page,
        limit: 50,
      };
      const res = await apiClient.get('/reports/bpjs', { params });
      return res.data;
    },
  });

  const summary = reportData?.data?.summary || {
    totalBpjsVisits: 0,
    completedVisits: 0,
    referredExternal: 0,
    referredInternal: 0,
    nonReferred: 0,
    referralRate: 0,
  };

  const items = reportData?.data?.items || [];
  const meta = reportData?.meta || { total: 0, totalPages: 1 };

  // Table Columns Definition
  const tableColumns = [
    { key: '_index', label: 'No' },
    { key: 'registrationDate', label: 'Tgl Layanan' },
    { key: 'bpjsCardNumber', label: 'No. Kartu BPJS' },
    { key: 'patientMrn', label: 'No. RM' },
    { key: 'patientName', label: 'Nama Pasien' },
    { key: 'patientNik', label: 'NIK KTP' },
    { key: 'polyclinicName', label: 'Poli' },
    { key: 'practitionerName', label: 'Dokter Pemeriksa' },
    {
      key: 'primaryDiagnosis',
      label: 'Diagnosa Primer (ICD-10)',
      format: (_, row) =>
        row.primaryDiagnosisCode
          ? `${row.primaryDiagnosisCode} - ${row.primaryDiagnosisName || ''}`
          : '-',
    },
    {
      key: 'referralInfo',
      label: 'Status Rujukan',
      format: (_, row) =>
        row.referralType === 'EXTERNAL'
          ? `Rujuk RS: ${row.targetFacilityName || '-'} (${row.pcareNoRujukan || 'Manual'})`
          : row.referralType === 'INTERNAL'
          ? 'Konsul Internal'
          : 'Non-Rujukan (Tuntas)',
    },
  ];

  // Ekspor Excel (.xlsx)
  const handleExportExcel = () => {
    exportToExcel({
      filename: `Laporan-Rekonsiliasi-Pelayanan-BPJS-${startDate}-sd-${endDate}`,
      sheetName: 'Pelayanan BPJS',
      title: 'Laporan Rekonsiliasi Pelayanan Peserta BPJS Kesehatan',
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
            <span className="text-xs font-semibold text-muted-foreground">Kunjungan Peserta BPJS</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-foreground mt-2">
            {summary.totalBpjsVisits}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {summary.completedVisits} layanan terselesaikan
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Non-Rujukan (Tuntas di FKTP)</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {summary.nonReferred}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {summary.totalBpjsVisits > 0
              ? `${(((summary.totalBpjsVisits - summary.referredExternal) / summary.totalBpjsVisits) * 100).toFixed(1)}% rasio tuntas`
              : '-'}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Rujukan Keluar (RS)</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-2">
            {summary.referredExternal}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Dirujuk ke RS / faskes tingkat lanjut
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Rasio Rujukan (KBK)</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-foreground mt-2">
            {summary.referralRate}%
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Indikator Kapitasi Berbasis Komitmen
          </span>
        </div>
      </div>

      {/* ─── 2. Filters & Action Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
        {/* Filters */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Poli:</span>
          </div>

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

      {/* ─── 3. Detailed Data Table ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="py-3 px-3.5 font-semibold">No</th>
                <th className="py-3 px-3.5 font-semibold">Tgl Layanan</th>
                <th className="py-3 px-3.5 font-semibold">No. Kartu BPJS</th>
                <th className="py-3 px-3.5 font-semibold">No. RM</th>
                <th className="py-3 px-3.5 font-semibold">Nama Pasien</th>
                <th className="py-3 px-3.5 font-semibold">NIK</th>
                <th className="py-3 px-3.5 font-semibold">Poli</th>
                <th className="py-3 px-3.5 font-semibold">Dokter</th>
                <th className="py-3 px-3.5 font-semibold">Diagnosa Primer</th>
                <th className="py-3 px-3.5 font-semibold">Status Rujukan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-muted-foreground">
                    Memuat data rekonsiliasi BPJS...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada kunjungan peserta BPJS pada rentang tanggal ini
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
                    <td className="py-2.5 px-3.5 font-mono font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                      {row.bpjsCardNumber || '-'}
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
                    <td className="py-2.5 px-3.5 font-mono text-muted-foreground">
                      {row.patientNik || '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-foreground">{row.polyclinicName}</td>
                    <td className="py-2.5 px-3.5 text-muted-foreground">
                      {row.practitionerName || '-'}
                    </td>
                    <td className="py-2.5 px-3.5">
                      {row.primaryDiagnosisCode ? (
                        <div className="max-w-[200px] truncate" title={`${row.primaryDiagnosisCode} - ${row.primaryDiagnosisName}`}>
                          <span className="font-mono font-bold text-primary mr-1">
                            {row.primaryDiagnosisCode}
                          </span>
                          <span className="text-foreground">{row.primaryDiagnosisName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5">
                      {row.referralType === 'EXTERNAL' ? (
                        <Badge variant="warning" className="text-[10px] font-semibold gap-1">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Rujuk RS: {row.targetFacilityName || 'RS'}</span>
                        </Badge>
                      ) : row.referralType === 'INTERNAL' ? (
                        <Badge variant="purple" className="text-[10px] font-semibold">
                          Konsul Internal
                        </Badge>
                      ) : (
                        <Badge variant="emerald" className="text-[10px] font-semibold">
                          Tuntas (Non-Rujuk)
                        </Badge>
                      )}
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
              Halaman {page} dari {meta.totalPages} ({meta.total} kunjungan BPJS)
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

      {/* ─── 4. Print Modal ─────────────────────────────────────────────────── */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Laporan Rekonsiliasi Pelayanan Peserta BPJS Kesehatan"
        subtitle="Audit pelayanan rawat jalan FKTP untuk rekonsiliasi klaim Kapitasi & Non-Kapitasi"
        period={periodLabel}
        summaryCards={[
          { label: 'Total Peserta BPJS', value: `${summary.totalBpjsVisits} Pasien` },
          { label: 'Tuntas Non-Rujukan', value: `${summary.nonReferred} Pasien` },
          { label: 'Rujukan Keluar (RS)', value: `${summary.referredExternal} Pasien` },
          { label: 'Rasio Rujukan (KBK)', value: `${summary.referralRate}%` },
        ]}
        columns={tableColumns}
        data={items}
      />
    </div>
  );
}
