import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Calendar, Plus, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import apiClient from '@/lib/api-client';

export function ReceiveBatchModal({ drugsList = [], onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    drugId: '',
    batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
    expiryDate: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    initialQty: 100,
    purchasePrice: 0,
    sellingPrice: 0,
    supplierName: '',
    storageLocation: 'GUDANG_FARMASI',
    notes: '',
  });

  const [errorMessage, setErrorMessage] = useState('');

  const drugOptions = drugsList.map((d) => ({
    id: d.id,
    name: `${d.name} (${d.dosageForm || 'TAB'}) — Stok: ${d.totalBatchStock || d.currentStock || 0}`,
  }));

  const handleDrugSelect = (drugId) => {
    const selected = drugsList.find((d) => d.id === drugId);
    setFormData((prev) => ({
      ...prev,
      drugId,
      purchasePrice: selected ? Number(selected.basePrice || 0) : 0,
      sellingPrice: selected ? Number(selected.sellingPrice || 0) : 0,
    }));
  };

  const receiveMutation = useMutation({
    mutationFn: (data) => apiClient.post('/pharmacy/drugs/batches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-drugs'] });
      onClose();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.error?.message || 'Gagal menyimpan penerimaan batch obat');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.drugId) {
      setErrorMessage('Pilih obat terlebih dahulu');
      return;
    }
    if (!formData.expiryDate) {
      setErrorMessage('Tanggal kedaluwarsa (ED) wajib diisi');
      return;
    }
    if (Number(formData.initialQty) <= 0) {
      setErrorMessage('Jumlah penerimaan harus lebih besar dari 0');
      return;
    }

    setErrorMessage('');
    receiveMutation.mutate({
      ...formData,
      initialQty: Number(formData.initialQty),
      purchasePrice: Number(formData.purchasePrice),
      sellingPrice: Number(formData.sellingPrice),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card text-card-foreground border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Input Penerimaan Batch Obat Baru</h2>
              <p className="text-xs text-muted-foreground">Catat nomor lot/batch pengadaan, tanggal kedaluwarsa & stok masuk</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2.5 text-xs text-destructive">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pilih Obat */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Pilih Obat Dari Katalog *</label>
            <SearchableSelect
              options={drugOptions}
              value={formData.drugId}
              onChange={handleDrugSelect}
              placeholder="Ketik nama obat untuk mencari..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nomor Batch */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nomor Batch / Lot</label>
              <Input
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="Contoh: BATCH-2026-081"
                className="font-mono text-xs"
              />
            </div>

            {/* Tanggal Kedaluwarsa (ED) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Tanggal Kedaluwarsa (ED) *</label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Jumlah Masuk */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Jumlah Diterima *</label>
              <Input
                type="number"
                min="1"
                value={formData.initialQty}
                onChange={(e) => setFormData({ ...formData, initialQty: e.target.value })}
                className="text-xs font-bold"
                required
              />
            </div>

            {/* Harga Beli Dasar */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Harga Beli / HNA (Rp)</label>
              <Input
                type="number"
                min="0"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                className="text-xs font-mono"
              />
            </div>

            {/* Harga Jual */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Harga Jual (Rp)</label>
              <Input
                type="number"
                min="0"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Suplier / Distributor */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">PBF / Distributor (Opsional)</label>
              <Input
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                placeholder="Nama PBF / Distributor pengirim"
                className="text-xs"
              />
            </div>

            {/* Lokasi Gudang */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Lokasi Penyimpanan</label>
              <Input
                value={formData.storageLocation}
                onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                placeholder="GUDANG_FARMASI"
                className="text-xs font-mono"
              />
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Catatan Tambahan</label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Misal: Faktur No. 1234, pengadaan bulanan"
              className="text-xs"
            />
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-border flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={receiveMutation.isPending}
              className="gap-1.5 shadow-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              {receiveMutation.isPending ? 'Menyimpan...' : 'Simpan Batch Obat'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
