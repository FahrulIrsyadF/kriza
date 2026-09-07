import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Pill, CheckCircle2, AlertTriangle, Printer, Clock, User,
  Calendar, Check, X, ShieldAlert, Sparkles, Box, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PrintEtiketModal } from './PrintEtiketModal';
import apiClient from '@/lib/api-client';

export function PrescriptionDispenseModal({ prescriptionId, onClose }) {
  const queryClient = useQueryClient();
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ─── Query Detail Resep ──────────────────────────────────────────────────────
  const { data: prescription, isLoading } = useQuery({
    queryKey: ['prescription-detail', prescriptionId],
    queryFn: async () => {
      const res = await apiClient.get(`/pharmacy/prescriptions/${prescriptionId}`);
      return res.data.data;
    },
    enabled: !!prescriptionId,
  });

  // ─── Mutation Dispense ────────────────────────────────────────────────────────
  const dispenseMutation = useMutation({
    mutationFn: () => apiClient.post(`/pharmacy/prescriptions/${prescriptionId}/dispense`, {}),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions-queue'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-detail', prescriptionId] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      setSuccessMessage('Obat berhasil diserahkan ke pasien dan stok otomatis dipotong (FEFO)!');
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.error?.message || 'Gagal memproses penyerahan obat');
    },
  });

  // ─── Mutation Cancel Resep ────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: (reason) => apiClient.post(`/pharmacy/prescriptions/${prescriptionId}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions-queue'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-detail', prescriptionId] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      onClose();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.error?.message || 'Gagal membatalkan resep');
    },
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-card p-6 rounded-xl border border-border shadow-xl flex items-center gap-3">
          <Clock className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm font-medium">Memuat rincian resep obat...</span>
        </div>
      </div>
    );
  }

  if (!prescription) return null;

  const isDispensed = prescription.status === 'DISPENSED';
  const isCancelled = prescription.status === 'CANCELLED';

  const totalPrice = prescription.items?.reduce((sum, it) => sum + Number(it.subtotal || 0), 0) || 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-card text-card-foreground border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    Verifikasi & Dispensing Resep
                  </h2>
                  <Badge variant={isDispensed ? 'success' : isCancelled ? 'destructive' : 'warning'}>
                    {prescription.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {prescription.prescriptionNumber} • Dibuat {new Date(prescription.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintModal(true)}
                className="gap-1.5 shadow-sm text-xs"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Etiket
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
            {/* Alert / Feedback */}
            {errorMessage && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2.5 text-xs text-destructive">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2.5 text-xs text-green-700 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Patient & Prescriber Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 border border-border p-4 rounded-xl">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Identitas Pasien</p>
                <p className="text-sm font-bold text-foreground mt-1">{prescription.patientName}</p>
                <p className="text-xs text-muted-foreground">
                  No. RM: <span className="font-mono font-semibold text-foreground">{prescription.patientMrn}</span> • {prescription.patientGender === 'L' ? 'Laki-laki' : 'Perempuan'}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dokter Penulis Resep</p>
                <p className="text-sm font-bold text-foreground mt-1">{prescription.practitionerName}</p>
                <p className="text-xs text-muted-foreground">{prescription.polyclinicName || 'Poli Umum'}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Petugas Farmasi</p>
                <p className="text-sm font-bold text-foreground mt-1">
                  {prescription.pharmacistName || 'Belum didispensasikan'}
                </p>
                {prescription.dispensedAt && (
                  <p className="text-xs text-green-600 font-medium">
                    Selesai: {new Date(prescription.dispensedAt).toLocaleTimeString('id-ID')}
                  </p>
                )}
              </div>
            </div>

            {/* Drug Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-primary" />
                  Daftar Obat yang Diresepkan ({prescription.items?.length || 0} Item)
                </h3>
                <span className="text-xs text-muted-foreground font-medium">
                  Alokasi Otomatis FEFO (First Expired, First Out)
                </span>
              </div>

              <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">No</th>
                      <th className="px-4 py-2.5">Nama Obat & Sediaan</th>
                      <th className="px-4 py-2.5">Aturan Pakai (Signa)</th>
                      <th className="px-4 py-2.5 text-center">Jumlah</th>
                      <th className="px-4 py-2.5 text-right">Harga Satuan</th>
                      <th className="px-4 py-2.5 text-right">Subtotal</th>
                      <th className="px-4 py-2.5 text-center">Status Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {prescription.items?.map((item, idx) => {
                      const isStockSufficient = Number(item.currentDrugStock || 0) >= Number(item.quantity);
                      return (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-muted-foreground">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-foreground text-sm leading-tight">{item.drugName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-muted-foreground">{item.dosageForm}</span>
                              {item.batchNumber && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-mono font-medium">
                                  Batch: {item.batchNumber} (ED: {item.expiryDate})
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-muted-foreground italic mt-0.5">Catatan: {item.notes}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-primary/10 text-primary font-bold px-2 py-1 rounded text-xs inline-block">
                              {item.signa}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-sm text-foreground">
                              {item.quantity}
                            </span>{' '}
                            <span className="text-muted-foreground">{item.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                            Rp {Number(item.unitPrice || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                            Rp {Number(item.subtotal || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isDispensed ? (
                              <Badge variant="success" className="gap-1">
                                <Check className="w-3 h-3" /> Diserahkan
                              </Badge>
                            ) : isStockSufficient ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                                Stok Cukup ({item.currentDrugStock})
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" /> Sisa {item.currentDrugStock}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted/40 border-t border-border font-bold">
                    <tr>
                      <td colSpan={5} className="px-4 py-2.5 text-right text-xs uppercase text-muted-foreground">
                        Total Biaya Resep:
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-primary">
                        Rp {totalPrice.toLocaleString('id-ID')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Doctor Notes */}
            {prescription.notes && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Instruksi Khusus Dokter:
                </p>
                <p className="mt-0.5">{prescription.notes}</p>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="px-6 py-4 border-t border-border bg-muted/40 flex items-center justify-between">
            <div>
              {!isDispensed && !isCancelled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
                  onClick={() => {
                    const reason = prompt('Masukkan alasan pembatalan resep:');
                    if (reason) cancelMutation.mutate(reason);
                  }}
                  disabled={cancelMutation.isPending}
                >
                  Batalkan Resep
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Button variant="outline" size="sm" onClick={onClose}>
                Tutup
              </Button>

              {!isDispensed && !isCancelled && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-semibold"
                  onClick={() => dispenseMutation.mutate()}
                  disabled={dispenseMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {dispenseMutation.isPending ? 'Memproses Dispense...' : 'Selesai Dispense & Potong Stok (FEFO)'}
                </Button>
              )}

              {isDispensed && (
                <Button
                  size="sm"
                  onClick={() => setShowPrintModal(true)}
                  className="gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Cetak Ulang Etiket
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Etiket Modal */}
      {showPrintModal && (
        <PrintEtiketModal
          prescription={prescription}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </>
  );
}
