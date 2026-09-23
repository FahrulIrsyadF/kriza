import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Search, Plus, Sliders, AlertTriangle, Clock, RefreshCw,
  FileText, ArrowUpRight, ArrowDownRight, Layers, History, ChevronRight, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReceiveBatchModal } from './ReceiveBatchModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import apiClient from '@/lib/api-client';
import { useDebounce } from '@/hooks/useDebounce';

export function DrugStocksTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 350);
  const [dosageFilter, setDosageFilter] = useState('');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedDrugForAdjust, setSelectedDrugForAdjust] = useState(null);
  const [selectedDrugForDetail, setSelectedDrugForDetail] = useState(null);

  // ─── Query Katalog & Stok Obat ──────────────────────────────────────────────
  const { data: stocksData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pharmacy-stocks', debouncedSearchTerm, dosageFilter, criticalOnly],
    queryFn: async () => {
      const params = { limit: 200 };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (dosageFilter) params.dosageForm = dosageFilter;
      if (criticalOnly) params.criticalOnly = 'true';
      const res = await apiClient.get('/pharmacy/drugs', { params });
      return res.data;
    },
  });

  const drugsList = stocksData?.data || [];

  // ─── Query Detail Obat Terpilih (Batches & Movements) ────────────────────────
  const { data: drugDetail } = useQuery({
    queryKey: ['drug-detail', selectedDrugForDetail?.id],
    queryFn: async () => {
      if (!selectedDrugForDetail?.id) return null;
      const res = await apiClient.get(`/pharmacy/drugs/${selectedDrugForDetail.id}`);
      return res.data.data;
    },
    enabled: !!selectedDrugForDetail?.id,
  });

  const { data: drugMovements = [] } = useQuery({
    queryKey: ['drug-movements', selectedDrugForDetail?.id],
    queryFn: async () => {
      if (!selectedDrugForDetail?.id) return [];
      const res = await apiClient.get(`/pharmacy/drugs/${selectedDrugForDetail.id}/movements`);
      return res.data.data;
    },
    enabled: !!selectedDrugForDetail?.id,
  });

  return (
    <div className="space-y-4">
      {/* Action & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama / kode obat..."
              className="pl-9 pr-8 text-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Bentuk Sediaan */}
          <select
            value={dosageFilter}
            onChange={(e) => setDosageFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
          >
            <option value="">Semua Sediaan</option>
            <option value="TABLET">Tablet</option>
            <option value="KAPSUL">Kapsul</option>
            <option value="SIRUP">Sirup</option>
            <option value="SALEP">Salep</option>
            <option value="SALEP MATA">Salep Mata</option>
            <option value="TETES MATA">Tetes Mata</option>
            <option value="TETES TELINGA">Tetes Telinga</option>
            <option value="SACHET">Sachet</option>
            <option value="SUPPOSITORIA">Suppositoria</option>
            <option value="TURBUHALER">Turbuhaler</option>
            <option value="AMPUL">Ampul</option>
            <option value="VIAL">Vial</option>
            <option value="PCS">Alkes / Pcs</option>
          </select>

          {/* Toggle Stok Kritis */}
          <button
            onClick={() => setCriticalOnly(!criticalOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              criticalOnly
                ? 'bg-destructive/15 text-destructive border-destructive/30'
                : 'bg-muted/60 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Stok Kritis (≤ Min)
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1 text-xs"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            size="sm"
            onClick={() => setShowReceiveModal(true)}
            className="gap-1.5 shadow-sm font-semibold text-xs"
          >
            <Plus className="w-4 h-4" /> Penerimaan Batch Baru
          </Button>
        </div>
      </div>

      {/* Main Grid: Stocks Table + Detail Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Table Column */}
        <div className={`space-y-3 ${selectedDrugForDetail ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12 text-xs">No</TableHead>
                    <TableHead className="text-xs">Kode & Nama Obat</TableHead>
                    <TableHead className="text-xs">Bentuk Sediaan</TableHead>
                    <TableHead className="text-xs text-center">Stok Total</TableHead>
                    <TableHead className="text-xs text-center">Stok Min</TableHead>
                    <TableHead className="text-xs">ED Terdekat</TableHead>
                    <TableHead className="text-xs text-right">Harga Jual</TableHead>
                    <TableHead className="text-xs text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-xs">
                        <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        Memuat data stok obat...
                      </TableCell>
                    </TableRow>
                  ) : drugsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-xs">
                        Tidak ada data obat yang sesuai dengan pencarian
                      </TableCell>
                    </TableRow>
                  ) : (
                    drugsList.map((d, idx) => {
                      const totalStock = Number(d.totalBatchStock || d.currentStock || 0);
                      const isCritical = totalStock <= Number(d.minStock || 10);
                      const isSelected = selectedDrugForDetail?.id === d.id;

                      // ── Expiry warning logic ─────────────────────────────
                      let expiryStatus = null; // null | 'danger' | 'warning'
                      if (d.nearestExpiry) {
                        const now = new Date();
                        const ed = new Date(d.nearestExpiry);
                        const diffMs = ed - now;
                        const diffDays = diffMs / (1000 * 60 * 60 * 24);
                        if (diffDays <= 180) expiryStatus = 'danger';       // ≤ 6 bulan
                        else if (diffDays <= 365) expiryStatus = 'warning'; // ≤ 1 tahun
                      }

                      // ── Row bg priority: selected > critical/expiry ──────
                      let rowBg = '';
                      if (isSelected) {
                        rowBg = 'bg-primary/10';
                      } else if (isCritical || expiryStatus === 'danger') {
                        rowBg = 'bg-red-50 dark:bg-red-950/30';
                      } else if (expiryStatus === 'warning') {
                        rowBg = 'bg-amber-50 dark:bg-amber-950/25';
                      }

                      return (
                        <TableRow
                          key={d.id}
                          onClick={() => setSelectedDrugForDetail(d)}
                          className={`cursor-pointer transition-colors text-xs ${rowBg} ${!isSelected ? 'hover:brightness-95' : ''}`}
                        >
                          <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <p className="font-bold text-foreground">{d.name}</p>
                            <span className="font-mono text-[10px] text-muted-foreground">{d.code}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] bg-muted/50">
                              {d.dosageForm || 'TABLET'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold text-sm font-mono ${isCritical ? 'text-destructive' : 'text-foreground'}`}>
                              {totalStock}
                            </span>{' '}
                            <span className="text-[10px] text-muted-foreground">{d.unitCode || 'TAB'}</span>
                            {isCritical && (
                              <AlertTriangle className="w-3 h-3 text-destructive inline ml-1" />
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono text-muted-foreground">
                            {d.minStock || 10}
                          </TableCell>
                          <TableCell>
                            {d.nearestExpiry ? (
                              <span className={`text-[11px] font-mono font-semibold ${
                                expiryStatus === 'danger'
                                  ? 'text-destructive'
                                  : expiryStatus === 'warning'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-muted-foreground'
                              }`}>
                                {d.nearestExpiry}
                                {expiryStatus && (
                                  <Clock className={`w-3 h-3 inline ml-1 ${
                                    expiryStatus === 'danger' ? 'text-destructive' : 'text-amber-500'
                                  }`} />
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50 text-[10px]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            Rp {Number(d.sellingPrice || 0).toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedDrugForAdjust(d)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-600"
                                title="Koreksi / Penyesuaian Manual"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedDrugForDetail(d)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                title="Lihat Riwayat & Batch"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* ── Legend / Keterangan Warna ───────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground text-xs">Keterangan warna:</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded bg-red-200 dark:bg-red-900/60 border border-red-300/60 shrink-0" />
              <span>Stok kritis (≤ stok minimum) <em>atau</em> ED ≤ 6 bulan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300/60 shrink-0" />
              <span>ED antara 6 bulan — 1 tahun (perlu perhatian)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded bg-card border border-border shrink-0" />
              <span>Stok normal & ED aman (&gt; 1 tahun)</span>
            </div>
          </div>
        </div>

        {/* Detail Panel: Batches & Mutations (Right Side) */}
        {selectedDrugForDetail && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Drug Profile Card */}
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                    {selectedDrugForDetail.code}
                  </span>
                  <h3 className="font-bold text-base text-foreground mt-1">{selectedDrugForDetail.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Sediaan: {selectedDrugForDetail.dosageForm} • Kategori: {selectedDrugForDetail.category}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDrugForDetail(null)}
                  className="h-7 w-7 p-0 text-muted-foreground"
                >
                  ✕
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg">
                <div>
                  <p className="text-muted-foreground text-[10px]">Stok Total Saat Ini</p>
                  <p className="font-bold text-lg font-mono text-primary">
                    {selectedDrugForDetail.totalBatchStock || selectedDrugForDetail.currentStock || 0}{' '}
                    <span className="text-xs font-normal text-muted-foreground">{selectedDrugForDetail.unitCode}</span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Stok Minimum Safe</p>
                  <p className="font-bold text-lg font-mono text-muted-foreground">
                    {selectedDrugForDetail.minStock || 10}
                  </p>
                </div>
              </div>

              {selectedDrugForDetail.defaultSigna && (
                <div className="text-xs bg-primary/5 border border-primary/15 p-2 rounded-lg text-primary">
                  <span className="font-bold">Signa Default:</span> {selectedDrugForDetail.defaultSigna}
                </div>
              )}
            </div>

            {/* Batches List (FEFO Breakdown) */}
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Daftar Batch Aktif (FEFO)
              </h4>

              {drugDetail?.batches?.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">Belum ada data batch aktif.</p>
              ) : (
                <div className="space-y-2">
                  {drugDetail?.batches?.map((b) => {
                    let batchExpiryStatus = null;
                    if (b.expiryDate) {
                      const now = new Date();
                      const ed = new Date(b.expiryDate);
                      const diffDays = (ed - now) / (1000 * 60 * 60 * 24);
                      if (diffDays <= 0) batchExpiryStatus = 'expired';
                      else if (diffDays <= 180) batchExpiryStatus = 'danger';
                      else if (diffDays <= 365) batchExpiryStatus = 'warning';
                    }

                    return (
                      <div
                        key={b.id}
                        className={`p-2.5 rounded-lg text-xs space-y-1 border transition-colors ${
                          batchExpiryStatus === 'expired' || batchExpiryStatus === 'danger'
                            ? 'bg-red-50/70 dark:bg-red-950/25 border-red-200 dark:border-red-900/50'
                            : batchExpiryStatus === 'warning'
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                            : 'bg-muted/30 border-border'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-foreground">
                            {b.batchNumber || 'Tanpa No Batch'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {batchExpiryStatus === 'expired' && (
                              <Badge variant="destructive" className="text-[9px] py-0 px-1.5">
                                Expired
                              </Badge>
                            )}
                            {batchExpiryStatus === 'danger' && (
                              <Badge variant="destructive" className="text-[9px] py-0 px-1.5">
                                ED ≤ 6 bln
                              </Badge>
                            )}
                            {batchExpiryStatus === 'warning' && (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[9px] py-0 px-1.5 hover:bg-amber-500/20">
                                ED ≤ 1 thn
                              </Badge>
                            )}
                            <Badge variant={b.currentQty > 0 ? 'outline' : 'destructive'} className="text-[10px]">
                              Sisa: {b.currentQty}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>
                            Kedaluwarsa (ED):{' '}
                            <strong className={
                              batchExpiryStatus === 'expired' || batchExpiryStatus === 'danger'
                                ? 'text-destructive'
                                : batchExpiryStatus === 'warning'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-foreground'
                            }>
                              {b.expiryDate}
                            </strong>
                          </span>
                          <span>Lokasi: {b.storageLocation || '—'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stock Movement Log */}
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-primary" />
                Mutasi Terakhir (Audit Log)
              </h4>

              {drugMovements.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">Belum ada riwayat mutasi.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {drugMovements.map((m) => {
                    const isPlus = Number(m.quantity) > 0;
                    return (
                      <div
                        key={m.id}
                        className="p-2 bg-muted/20 border border-border/80 rounded-lg text-xs flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {isPlus ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />
                            )}
                            <span className="font-semibold text-foreground text-[11px]">
                              {m.movementType}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                            {m.reason || 'Mutasi sistem'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold text-xs ${isPlus ? 'text-green-600' : 'text-red-600'}`}>
                            {isPlus ? `+${m.quantity}` : m.quantity}
                          </span>
                          <p className="text-[9px] text-muted-foreground font-mono">
                            {new Date(m.movedAt).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Receive Batch Modal */}
      {showReceiveModal && (
        <ReceiveBatchModal
          drugsList={drugsList}
          onClose={() => setShowReceiveModal(false)}
        />
      )}

      {/* Stock Adjustment Modal */}
      {selectedDrugForAdjust && (
        <StockAdjustmentModal
          drug={selectedDrugForAdjust}
          batches={drugDetail?.batches || []}
          onClose={() => setSelectedDrugForAdjust(null)}
        />
      )}
    </div>
  );
}
