import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sliders, AlertTriangle, X, ShieldAlert, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/api-client';

export function StockAdjustmentModal({ drug, batches = [], onClose }) {
  const queryClient = useQueryClient();
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id || '');
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [reason, setReason] = useState('Koreksi Hitung Fisik');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];
  const currentBatchQty = Number(selectedBatch?.currentQty || 0);
  const newBatchQty = currentBatchQty + Number(adjustmentQty);

  const adjustMutation = useMutation({
    mutationFn: (data) => apiClient.post('/pharmacy/drugs/adjustment', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      queryClient.invalidateQueries({ queryKey: ['drug-detail', drug?.id] });
      queryClient.invalidateQueries({ queryKey: ['drug-movements', drug?.id] });
      onClose();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.error?.message || 'Gagal menyimpan penyesuaian stok');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBatchId) {
      setErrorMessage('Pilih batch obat yang akan disesuaikan');
      return;
    }
    if (Number(adjustmentQty) === 0) {
      setErrorMessage('Jumlah penyesuaian tidak boleh 0');
      return;
    }
    if (newBatchQty < 0) {
      setErrorMessage(`Stok akhir tidak boleh kurang dari 0 (sisa batch saat ini: ${currentBatchQty})`);
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Alasan penyesuaian wajib diisi');
      return;
    }

    setErrorMessage('');
    adjustMutation.mutate({
      drugId: drug.id,
      batchId: selectedBatchId,
      quantity: Number(adjustmentQty),
      reason,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card text-card-foreground border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Penyesuaian Manual Stok Obat</h2>
              <p className="text-xs text-muted-foreground">{drug?.name} ({drug?.dosageForm})</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2.5 text-xs text-destructive">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pilih Batch */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Pilih Batch yang Disesuaikan *</label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber || 'Batch Tanpa No'} (ED: {b.expiryDate}) — Stok: {b.currentQty}
                </option>
              ))}
            </select>
          </div>

          {/* Kalkulasi Penyesuaian */}
          <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Stok Saat Ini:</span>
              <span className="font-bold text-foreground">{currentBatchQty}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground">Perubahan (+ / -):</span>
              <div className="w-32">
                <Input
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  placeholder="Contoh: -5 atau 10"
                  className="text-right font-bold text-xs"
                />
              </div>
            </div>
            <div className="flex justify-between text-xs font-bold border-t border-border pt-2">
              <span>Estimasi Stok Baru:</span>
              <span className={`font-mono ${newBatchQty < 0 ? 'text-destructive' : 'text-primary'}`}>
                {newBatchQty}
              </span>
            </div>
          </div>

          {/* Alasan */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Alasan Penyesuaian *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Koreksi Hitung Fisik">Koreksi Selisih Hitung Fisik</option>
              <option value="Obat Rusak / Pecah">Obat Rusak / Pecah / Terkontaminasi</option>
              <option value="Kadaluwarsa Dibuang">Obat Kadaluwarsa (Pemusnahan)</option>
              <option value="Koreksi Salah Input Resep">Koreksi Salah Input Transaksi</option>
              <option value="Lainnya">Alasan Khusus Lainnya</option>
            </select>
          </div>

          {/* Catatan Tambahan */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Keterangan / Catatan Tambahan</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jelaskan detail jika diperlukan"
              className="text-xs"
            />
          </div>

          {/* Footer Action */}
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={adjustMutation.isPending}
              className="gap-1.5 font-semibold"
            >
              <Check className="w-4 h-4" />
              {adjustMutation.isPending ? 'Menyimpan...' : 'Terapkan Penyesuaian'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
