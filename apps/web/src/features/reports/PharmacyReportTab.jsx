import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pill,
  AlertTriangle,
  Clock,
  Coins,
  FileSpreadsheet,
  Printer,
  TrendingUp,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/utils';
import { exportToExcel } from '@/lib/export-excel';
import { HorizontalBarMetric } from './ReportVisuals';
import { ReportPrintModal } from './ReportPrintModal';

export function PharmacyReportTab({ startDate, endDate, periodLabel }) {
  const [activeSubTab, setActiveSubTab] = useState('top-drugs'); // 'top-drugs' | 'low-stock' | 'expiring'
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Query Laporan Farmasi
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports-pharmacy', startDate, endDate],
    queryFn: async () => {
      const params = { startDate, endDate, limit: 15 };
      const res = await apiClient.get('/reports/pharmacy', { params });
      return res.data;
    },
  });

  const valuation = reportData?.data?.valuation || {
    totalAssetHna: 0,
    totalAssetSelling: 0,
    totalActiveBatches: 0,
  };
  const topDrugs = reportData?.data?.topDrugs || [];
  const lowStock = reportData?.data?.lowStock || [];
  const expiringBatches = reportData?.data?.expiringBatches || [];

  // Table Columns Definition based on active sub-tab
  const topDrugsColumns = [
    { key: 'rank', label: 'Peringkat', align: 'center' },
    { key: 'drugName', label: 'Nama Obat' },
    { key: 'unit', label: 'Satuan' },
    { key: 'totalQty', label: 'Total Keluar', align: 'right' },
    { key: 'prescriptionCount', label: 'Frekuensi Resep', align: 'right' },
    {
      key: 'totalValue',
      label: 'Estimasi Nilai (Rp)',
      align: 'right',
      format: (v) => formatRupiah(v),
    },
  ];

  const lowStockColumns = [
    { key: 'drugCode', label: 'Kode' },
    { key: 'drugName', label: 'Nama Obat' },
    { key: 'dosageForm', label: 'Sediaan' },
    { key: 'unitName', label: 'Satuan' },
    { key: 'minStock', label: 'Batas Minimum', align: 'right' },
    { key: 'currentStock', label: 'Stok Saat Ini', align: 'right' },
    { key: 'status', label: 'Status' },
  ];

  const expiringColumns = [
    { key: 'drugName', label: 'Nama Obat' },
    { key: 'batchNumber', label: 'No. Batch' },
    { key: 'unitName', label: 'Satuan' },
    { key: 'currentQty', label: 'Sisa Stok Batch', align: 'right' },
    { key: 'expiryDate', label: 'Tgl Kedaluwarsa' },
    {
      key: 'daysRemaining',
      label: 'Sisa Waktu (Hari)',
      align: 'right',
      format: (v) => `${v} hari lagi`,
    },
  ];

  // Ekspor Excel (.xlsx)
  const handleExportExcel = () => {
    if (activeSubTab === 'top-drugs') {
      exportToExcel({
        filename: `Laporan-Obat-Terbanyak-Diresepkan-${startDate}-sd-${endDate}`,
        sheetName: 'Top Obat Diresepkan',
        title: 'Laporan Obat Paling Banyak Diresepkan',
        period: periodLabel,
        columns: topDrugsColumns,
        data: topDrugs,
      });
    } else if (activeSubTab === 'low-stock') {
      exportToExcel({
        filename: `Laporan-Stok-Kritis-Obat-${startDate}-sd-${endDate}`,
        sheetName: 'Stok Kritis',
        title: 'Laporan Monitoring Stok Obat Menipis & Kritis',
        period: periodLabel,
        columns: lowStockColumns,
        data: lowStock,
      });
    } else {
      exportToExcel({
        filename: `Laporan-Batch-Mendekati-ED-${startDate}-sd-${endDate}`,
        sheetName: 'Mendekati ED',
        title: 'Laporan Radar Obat Mendekati Kedaluwarsa (< 90 Hari)',
        period: periodLabel,
        columns: expiringColumns,
        data: expiringBatches,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Nilai Aset Obat (HNA)</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {formatRupiah(valuation.totalAssetHna)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Modal pembelian persediaan aktif
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Potensi Nilai Jual</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-foreground mt-2">
            {formatRupiah(valuation.totalAssetSelling)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {valuation.totalActiveBatches} batch obat aktif
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Stok Menipis / Kritis</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
            {lowStock.length} <span className="text-sm font-semibold text-muted-foreground">Item</span>
          </p>
          <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">
            Mendekati atau di bawah batas minimum
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Mendekati Kedaluwarsa</span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-2">
            {expiringBatches.length} <span className="text-sm font-semibold text-muted-foreground">Batch</span>
          </p>
          <span className="text-[11px] text-red-600 font-medium mt-0.5 block">
            Jatuh tempo kurang dari 90 hari
          </span>
        </div>
      </div>

      {/* ─── 2. Sub-Tab & Action Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
        {/* Sub-Tabs */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveSubTab('top-drugs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'top-drugs'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-primary" />
            <span>Top Obat Diresepkan</span>
          </button>

          <button
            onClick={() => setActiveSubTab('low-stock')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'low-stock'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Stok Kritis ({lowStock.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('expiring')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'expiring'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-red-500" />
            <span>Mendekati ED ({expiringBatches.length})</span>
          </button>
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

      {/* ─── 3. Content Table based on Active Sub-Tab ───────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeSubTab === 'top-drugs' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="py-3 px-3.5 font-semibold text-center w-12">Rank</th>
                  <th className="py-3 px-3.5 font-semibold">Nama Obat</th>
                  <th className="py-3 px-3.5 font-semibold">Satuan</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Total Keluar</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Frekuensi Resep</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Estimasi Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      Memuat data obat terbanyak...
                    </td>
                  </tr>
                ) : topDrugs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      Belum ada data resep yang dikeluarkan pada periode ini
                    </td>
                  </tr>
                ) : (
                  topDrugs.map((row) => (
                    <tr key={row.drugId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3.5 text-center font-bold text-foreground">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-muted text-foreground text-xs font-mono font-bold">
                          {row.rank}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-foreground">
                        {row.drugName}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-muted-foreground">
                        {row.unit}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-primary">
                        {row.totalQty}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-muted-foreground">
                        {row.prescriptionCount}x
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-foreground">
                        {formatRupiah(row.totalValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeSubTab === 'low-stock' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="py-3 px-3.5 font-semibold">Kode</th>
                  <th className="py-3 px-3.5 font-semibold">Nama Obat</th>
                  <th className="py-3 px-3.5 font-semibold">Sediaan</th>
                  <th className="py-3 px-3.5 font-semibold">Satuan</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Batas Min</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Stok Aktual</th>
                  <th className="py-3 px-3.5 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                      Memuat data stok kritis...
                    </td>
                  </tr>
                ) : lowStock.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-emerald-600 font-semibold">
                      Semua stok obat dalam kondisi aman di atas batas minimum
                    </td>
                  </tr>
                ) : (
                  lowStock.map((row) => (
                    <tr key={row.drugId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono text-muted-foreground">
                        {row.drugCode || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-foreground">
                        {row.drugName}
                      </td>
                      <td className="py-2.5 px-3.5 text-muted-foreground">
                        {row.dosageForm || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-muted-foreground">
                        {row.unitName}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-muted-foreground">
                        {row.minStock}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {row.currentStock}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <Badge
                          variant={row.status === 'HABIS' ? 'destructive' : 'warning'}
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
          )}

          {activeSubTab === 'expiring' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="py-3 px-3.5 font-semibold">Nama Obat</th>
                  <th className="py-3 px-3.5 font-semibold">No. Batch</th>
                  <th className="py-3 px-3.5 font-semibold">Satuan</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Sisa Stok</th>
                  <th className="py-3 px-3.5 font-semibold">Tgl Kedaluwarsa</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Sisa Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      Memuat radar kedaluwarsa...
                    </td>
                  </tr>
                ) : expiringBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-emerald-600 font-semibold">
                      Tidak ada batch obat aktif yang kedaluwarsa dalam 90 hari ke depan
                    </td>
                  </tr>
                ) : (
                  expiringBatches.map((row) => (
                    <tr key={row.batchId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-foreground">
                        {row.drugName}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-primary font-semibold">
                        {row.batchNumber || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-muted-foreground">
                        {row.unitName}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-foreground">
                        {row.currentQty}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-red-600 dark:text-red-400 font-semibold">
                        {row.expiryDate}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <Badge variant="destructive" className="text-[10px] font-mono font-bold">
                          {row.daysRemaining} hari lagi
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── 4. Print Modal ─────────────────────────────────────────────────── */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={
          activeSubTab === 'top-drugs'
            ? 'Laporan Obat Paling Banyak Diresepkan'
            : activeSubTab === 'low-stock'
            ? 'Laporan Monitoring Stok Obat Kritis'
            : 'Laporan Batch Obat Mendekati Kedaluwarsa'
        }
        subtitle="Modul Farmasi & Pengendalian Persediaan Klinik Pratama Rawat Inap Rizani"
        period={periodLabel}
        summaryCards={[
          { label: 'Nilai Aset (HNA)', value: formatRupiah(valuation.totalAssetHna) },
          { label: 'Potensi Nilai Jual', value: formatRupiah(valuation.totalAssetSelling) },
          { label: 'Item Kritis', value: `${lowStock.length} Obat` },
          { label: 'Mendekati ED', value: `${expiringBatches.length} Batch` },
        ]}
        columns={
          activeSubTab === 'top-drugs'
            ? topDrugsColumns
            : activeSubTab === 'low-stock'
            ? lowStockColumns
            : expiringColumns
        }
        data={
          activeSubTab === 'top-drugs'
            ? topDrugs
            : activeSubTab === 'low-stock'
            ? lowStock
            : expiringBatches
        }
      />
    </div>
  );
}
