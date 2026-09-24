import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock, AlertTriangle, FileText, Activity, Stethoscope,
  Pill, X, ShieldAlert, CheckCircle2, Lock,
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api-client';

export function AmendedHistoryModal({ isOpen, onClose, encounterId }) {
  const { data: oldEncounter, isLoading } = useQuery({
    queryKey: ['encounter-detail', encounterId],
    queryFn: () => apiClient.get(`/encounters/${encounterId}`).then((r) => r.data.data),
    enabled: isOpen && !!encounterId,
  });

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} maxWidth="max-w-4xl">
      <DialogHeader className="border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                Arsip Rekam Medis Sebelum Revisi
                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700 bg-amber-50 font-mono">
                  VERSI AMENDED
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Dokumen audit trail PMK 24/2022 &bull; Status arsip historis tidak dapat diubah
              </p>
            </div>
          </div>
          <DialogClose onClick={onClose} />
        </div>
      </DialogHeader>

      <div className="overflow-y-auto max-h-[72vh] pr-1 space-y-4 py-2">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Memuat arsip data rekam medis...</p>
          </div>
        ) : !oldEncounter ? (
          <div className="py-12 text-center text-muted-foreground text-xs">
            Data riwayat rekam medis tidak ditemukan.
          </div>
        ) : (
          <>
            {/* ─── 1. Callout Alasan Amandemen ─────────────────────────────────── */}
            <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-950 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-bold text-xs uppercase tracking-wide text-amber-900">
                  Catatan Alasan Amandemen
                </span>
              </div>
              <p className="text-xs italic pl-6 font-medium text-amber-900">
                "{oldEncounter.amendmentReason || 'Tidak disertakan alasan spesifik'}"
              </p>
              <div className="text-[11px] text-amber-700/90 pl-6 flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-amber-200/60 mt-2">
                <span>Waktu Dibuat: <strong>{new Date(oldEncounter.createdAt).toLocaleString('id-ID')}</strong></span>
                {oldEncounter.finalizedAt && (
                  <span>Finalisasi Awal: <strong>{new Date(oldEncounter.finalizedAt).toLocaleString('id-ID')}</strong></span>
                )}
                <span>Dokter: <strong>{oldEncounter.practitionerTitle ? `${oldEncounter.practitionerTitle} ` : ''}{oldEncounter.practitionerName}</strong></span>
              </div>
            </div>

            {/* ─── 2. Ringkasan TTV & Fisik ─────────────────────────────────────── */}
            {oldEncounter.vitalSigns && (
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tanda-Tanda Vital & Pemeriksaan Fisik (Arsip)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-background rounded-lg border border-border/80">
                    <span className="text-[10px] text-muted-foreground block">Tekanan Darah</span>
                    <span className="font-mono font-semibold">
                      {oldEncounter.vitalSigns.systolic || '-'}/{oldEncounter.vitalSigns.diastolic || '-'} mmHg
                    </span>
                  </div>
                  <div className="p-2 bg-background rounded-lg border border-border/80">
                    <span className="text-[10px] text-muted-foreground block">Denyut Nadi</span>
                    <span className="font-mono font-semibold">{oldEncounter.vitalSigns.heartRate || '-'} x/m</span>
                  </div>
                  <div className="p-2 bg-background rounded-lg border border-border/80">
                    <span className="text-[10px] text-muted-foreground block">Laju Nafas</span>
                    <span className="font-mono font-semibold">{oldEncounter.vitalSigns.respiratoryRate || '-'} x/m</span>
                  </div>
                  <div className="p-2 bg-background rounded-lg border border-border/80">
                    <span className="text-[10px] text-muted-foreground block">Suhu Tubuh</span>
                    <span className="font-mono font-semibold">{oldEncounter.vitalSigns.temperature || '-'} °C</span>
                  </div>
                  <div className="p-2 bg-background rounded-lg border border-border/80">
                    <span className="text-[10px] text-muted-foreground block">Berat / Tinggi Badan</span>
                    <span className="font-mono font-semibold">
                      {oldEncounter.vitalSigns.weight || '-'} kg / {oldEncounter.vitalSigns.height || '-'} cm
                    </span>
                  </div>
                  <div className="p-2 bg-background rounded-lg border border-border/80">
                    <span className="text-[10px] text-muted-foreground block">SpO2</span>
                    <span className="font-mono font-semibold">{oldEncounter.vitalSigns.oxygenSaturation || '-'}%</span>
                  </div>
                  <div className="p-2 bg-background rounded-lg border border-border/80 sm:col-span-2">
                    <span className="text-[10px] text-muted-foreground block">Kesadaran & Triase</span>
                    <span className="font-semibold text-xs">
                      {oldEncounter.vitalSigns.consciousness || 'Compos Mentis'} &bull; Triase: {oldEncounter.vitalSigns.triage || 'HIJAU'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── 3. Catatan SOAP ──────────────────────────────────────────────── */}
            {oldEncounter.soapNotes && (
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Stethoscope className="w-3.5 h-3.5 text-primary" />
                  <span>Catatan SOAP (Arsip Versi Sebelumnya)</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-[11px] text-blue-700 block">S (Subjektif / Keluhan)</span>
                    <p className="bg-muted/30 p-2 rounded-lg text-foreground mt-0.5 whitespace-pre-wrap">
                      {oldEncounter.soapNotes.subjective || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-[11px] text-purple-700 block">O (Objektif / Fisik)</span>
                    <p className="bg-muted/30 p-2 rounded-lg text-foreground mt-0.5 whitespace-pre-wrap">
                      {oldEncounter.soapNotes.objective || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-[11px] text-amber-700 block">A (Asesmen / Diagnosa Klinis)</span>
                    <p className="bg-muted/30 p-2 rounded-lg text-foreground mt-0.5 whitespace-pre-wrap font-medium">
                      {oldEncounter.soapNotes.assessment || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-[11px] text-green-700 block">P (Planning / Rencana Terapi)</span>
                    <p className="bg-muted/30 p-2 rounded-lg text-foreground mt-0.5 whitespace-pre-wrap">
                      {oldEncounter.soapNotes.plan || '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── 4. Diagnosa ICD-10 ───────────────────────────────────────────── */}
            <div className="p-3.5 rounded-xl border border-border bg-background space-y-2">
              <span className="font-bold text-xs block text-foreground">
                Diagnosa ICD-10 Terinput ({oldEncounter.diagnoses?.length || 0})
              </span>
              {(oldEncounter.diagnoses || []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Tidak ada diagnosa ICD-10.</p>
              ) : (
                <div className="divide-y divide-border/60 text-xs">
                  {oldEncounter.diagnoses.map((d) => (
                    <div key={d.id} className="py-1.5 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-primary mr-2">{d.icd10Code}</span>
                        <span className="font-medium text-foreground">{d.icd10Name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {d.diagnosisType === 'PRIMARY' ? 'Primer' : d.diagnosisType === 'SECONDARY' ? 'Sekunder' : 'Komplikasi'} ({d.diagnosisCase || 'BARU'})
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── 5. Tindakan Medis ────────────────────────────────────────────── */}
            <div className="p-3.5 rounded-xl border border-border bg-background space-y-2">
              <span className="font-bold text-xs block text-foreground">
                Tindakan Medis ({oldEncounter.procedures?.length || 0})
              </span>
              {(oldEncounter.procedures || []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Tidak ada tindakan medis.</p>
              ) : (
                <div className="divide-y divide-border/60 text-xs">
                  {oldEncounter.procedures.map((p) => (
                    <div key={p.id} className="py-1.5 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-muted-foreground mr-2 text-[11px]">{p.procedureCode || '—'}</span>
                        <span className="font-semibold text-foreground">{p.procedureName}</span>
                        <span className="text-muted-foreground text-[11px] ml-2 font-mono">({p.quantity}x)</span>
                      </div>
                      <span className="font-mono font-semibold text-primary">
                        Rp {(Number(p.tariff || 0) * p.quantity).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>Arsip dibaca dalam mode read-only (tidak dapat dimodifikasi).</span>
        <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
          Tutup Arsip
        </Button>
      </div>
    </Dialog>
  );
}

export default AmendedHistoryModal;
