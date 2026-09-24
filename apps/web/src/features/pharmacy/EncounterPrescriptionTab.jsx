import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Pill, Plus, Trash2, CheckCircle2, AlertTriangle, Send,
  Sparkles, Clock, ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import apiClient from '@/lib/api-client';

const SIGNA_CHIPS = [
  '3x1 tablet sesudah makan',
  '2x1 tablet sesudah makan',
  '1x1 tablet malam hari',
  '3x1 tablet sebelum makan (ac)',
  '3x sehari 1 sendok takar',
  '3-4x sehari 1 tablet prn demam/nyeri',
  '2x1 kapsul (habiskan)',
  'Oleskan 2-3x sehari tipis',
];

export function EncounterPrescriptionTab({ encounterId, isReadOnly }) {
  const queryClient = useQueryClient();
  const [stagedItems, setStagedItems] = useState([]);
  const [selectedDrugId, setSelectedDrugId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [signa, setSigna] = useState('');
  const [durationDays, setDurationDays] = useState(3);
  const [notes, setNotes] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ─── Query Katalog Obat ──────────────────────────────────────────────────────
  const { data: drugsData } = useQuery({
    queryKey: ['pharmacy-drugs-catalogue'],
    queryFn: async () => {
      const res = await apiClient.get('/pharmacy/drugs', { params: { limit: 200 } });
      return res.data.data;
    },
  });

  const drugsList = drugsData || [];

  // ─── Query Resep Encounter Saat Ini ──────────────────────────────────────────
  const { data: existingPrescription, isLoading } = useQuery({
    queryKey: ['encounter-prescription', encounterId],
    queryFn: async () => {
      const res = await apiClient.get(`/pharmacy/prescriptions/by-encounter/${encounterId}`);
      return res.data.data;
    },
    enabled: !!encounterId,
  });

  const drugOptions = drugsList.map((d) => ({
    id: d.id,
    name: `${d.name} (${d.dosageForm}) — Stok: ${d.totalBatchStock || d.currentStock || 0}`,
  }));

  const handleDrugSelect = (drugId) => {
    setSelectedDrugId(drugId);
    const d = drugsList.find((item) => item.id === drugId);
    if (d?.defaultSigna) {
      setSigna(d.defaultSigna);
    }
  };

  const handleAddStagedItem = () => {
    if (!selectedDrugId) {
      setErrorMessage('Pilih obat terlebih dahulu');
      return;
    }
    if (!signa.trim()) {
      setErrorMessage('Aturan pakai (signa) wajib diisi');
      return;
    }
    if (Number(quantity) <= 0) {
      setErrorMessage('Jumlah obat harus lebih dari 0');
      return;
    }

    const drug = drugsList.find((d) => d.id === selectedDrugId);
    if (!drug) return;

    setStagedItems((prev) => [
      ...prev,
      {
        drugId: drug.id,
        drugName: drug.name,
        dosageForm: drug.dosageForm,
        unit: drug.unitCode || 'TAB',
        quantity: Number(quantity),
        signa: signa.trim(),
        durationDays: Number(durationDays) || undefined,
        notes: notes.trim() || undefined,
      },
    ]);

    // Reset input
    setSelectedDrugId('');
    setQuantity(10);
    setSigna('');
    setNotes('');
    setErrorMessage('');
  };

  const handleRemoveStagedItem = (index) => {
    setStagedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // ─── Mutation Kirim Resep ───────────────────────────────────────────────────
  const createPrescriptionMutation = useMutation({
    mutationFn: (data) => apiClient.post('/pharmacy/prescriptions', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['encounter-prescription', encounterId] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions-queue'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      setStagedItems([]);
      setSuccessMessage(`Resep ${res.data.data?.prescriptionNumber} berhasil dikirim ke antrian Farmasi!`);
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.error?.message || 'Gagal mengirim resep');
    },
  });

  const handleSendPrescription = () => {
    if (stagedItems.length === 0) {
      setErrorMessage('Tambahkan minimal 1 item obat ke daftar resep');
      return;
    }

    createPrescriptionMutation.mutate({
      encounterId,
      notes: prescriptionNotes,
      items: stagedItems.map((it) => ({
        drugId: it.drugId,
        quantity: it.quantity,
        signa: it.signa,
        durationDays: it.durationDays,
        notes: it.notes,
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-4 h-4 animate-spin text-primary" /> Memeriksa data resep encounter...
      </div>
    );
  }

  // Jika resep sudah dibuat sebelumnya
  if (existingPrescription) {
    const isDispensed = existingPrescription.status === 'DISPENSED';
    return (
      <div className="space-y-4 animate-in fade-in duration-150">
        <div className="p-4 bg-card border border-border rounded-xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Resep Telah Dibuat: <span className="font-mono text-primary">{existingPrescription.prescriptionNumber}</span>
                </h4>
                <p className="text-xs text-muted-foreground">
                  Waktu: {new Date(existingPrescription.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <Badge variant={isDispensed ? 'success' : 'warning'}>
              {existingPrescription.status}
            </Badge>
          </div>

          {/* Items Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="px-3 py-2">No</th>
                  <th className="px-3 py-2">Nama Obat</th>
                  <th className="px-3 py-2">Aturan Pakai (Signa)</th>
                  <th className="px-3 py-2 text-center">Jumlah</th>
                  <th className="px-3 py-2 text-center">Status Farmasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {existingPrescription.items?.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-medium text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-bold text-foreground">{item.drugName}</p>
                      <span className="text-[10px] text-muted-foreground">{item.dosageForm}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded text-[11px]">
                        {item.signa}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {isDispensed ? (
                        <Badge variant="success" className="text-[10px]">Telah Diserahkan</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700">Antrian Farmasi</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {existingPrescription.notes && (
            <p className="text-xs text-muted-foreground italic">
              Catatan Dokter: {existingPrescription.notes}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Jika resep belum dibuat (Form Input Dokter)
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {errorMessage && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2 text-xs text-destructive">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-xs text-green-700 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Box Input Resep Baru */}
      {!isReadOnly && (
        <div className="p-4 bg-card border border-border rounded-xl shadow-sm space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Pill className="w-4 h-4 text-primary" />
            Tulis Resep Obat Elektronik
          </h4>

          {/* Row 1: Pilih Obat */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Cari & Pilih Obat *</label>
            <SearchableSelect
              options={drugOptions}
              value={selectedDrugId}
              onChange={handleDrugSelect}
              placeholder=""
            />
          </div>

          {/* Row 2: Jumlah & Signa */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Jumlah (Qty) *</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-xs font-bold"
              />
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Aturan Pakai (Signa) *</label>
              <Input
                value={signa}
                onChange={(e) => setSigna(e.target.value)}
                className="text-xs font-medium"
              />
            </div>
          </div>

          {/* Signa Quick Preset Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Preset Cepat:
            </span>
            {SIGNA_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSigna(chip)}
                className="text-[10px] bg-muted hover:bg-primary/10 hover:text-primary px-2 py-1 rounded-md border border-border/80 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Row 3: Catatan & Tombol Tambah */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div className="sm:col-span-3 space-y-1.5">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <Button
                type="button"
                onClick={handleAddStagedItem}
                size="sm"
                className="w-full gap-1.5 font-bold text-xs shadow-sm h-9"
              >
                <Plus className="w-4 h-4" /> Tambah Obat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Staged Items List */}
      <div className="p-4 bg-card border border-border rounded-xl shadow-sm space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Daftar Obat Resep ({stagedItems.length} Item)
        </h4>

        {stagedItems.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-6">
            Belum ada obat yang dimasukkan ke dalam resep.
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="px-3 py-2">No</th>
                  <th className="px-3 py-2">Nama Obat & Sediaan</th>
                  <th className="px-3 py-2">Aturan Pakai</th>
                  <th className="px-3 py-2 text-center">Jumlah</th>
                  <th className="px-3 py-2">Catatan</th>
                  {!isReadOnly && <th className="px-3 py-2 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stagedItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-foreground">
                      {item.drugName} <span className="font-normal text-muted-foreground text-[10px]">({item.dosageForm})</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded text-[11px]">
                        {item.signa}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-bold">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground italic">
                      {item.notes || '—'}
                    </td>
                    {!isReadOnly && (
                      <td className="px-3 py-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStagedItem(idx)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Prescription Footer Action */}
        {!isReadOnly && stagedItems.length > 0 && (
          <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <Input
              value={prescriptionNotes}
              onChange={(e) => setPrescriptionNotes(e.target.value)}
              className="text-xs sm:w-80"
            />

            <Button
              onClick={handleSendPrescription}
              disabled={createPrescriptionMutation.isPending}
              className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              {createPrescriptionMutation.isPending ? 'Mengirim ke Farmasi...' : 'Kirim Resep ke Farmasi (💊)'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
