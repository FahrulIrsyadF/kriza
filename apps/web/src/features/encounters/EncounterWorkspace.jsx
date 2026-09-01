import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, FileText, Stethoscope, Plus, Trash2, CheckCircle2,
  AlertTriangle, Lock, ShieldAlert, HeartPulse, Scale, Clock,
  ArrowRight, Printer, Share2, Building, UserCheck, RefreshCw,
  Sparkles, Save, Edit3, CornerDownRight, Check, X,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReferralLetterModal } from './ReferralLetterModal';
import apiClient from '@/lib/api-client';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calculateAge(birthDateStr) {
  if (!birthDateStr) return '—';
  const birth = new Date(birthDateStr);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  return `${years} Thn ${months} Bln`;
}

function calculateBMI(weight, height) {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  if (!w || !h || h <= 0) return { bmi: '—', category: '—', color: 'bg-muted text-muted-foreground' };
  const heightM = h / 100;
  const bmiVal = (w / (heightM * heightM)).toFixed(1);
  const bmiNum = parseFloat(bmiVal);

  let category = 'Normal';
  let color = 'bg-green-500/15 text-green-700 border-green-200';

  if (bmiNum < 18.5) {
    category = 'Underweight (Kurus)';
    color = 'bg-blue-500/15 text-blue-700 border-blue-200';
  } else if (bmiNum >= 18.5 && bmiNum < 25.0) {
    category = 'Normal (Ideal)';
    color = 'bg-green-500/15 text-green-700 border-green-200';
  } else if (bmiNum >= 25.0 && bmiNum < 30.0) {
    category = 'Overweight (Gemuk)';
    color = 'bg-amber-500/15 text-amber-700 border-amber-200';
  } else if (bmiNum >= 30.0 && bmiNum < 35.0) {
    category = 'Obesitas Tingkat I';
    color = 'bg-orange-500/15 text-orange-700 border-orange-200';
  } else {
    category = 'Obesitas Tingkat II (Morbid)';
    color = 'bg-red-500/15 text-red-700 border-red-200';
  }

  return { bmi: bmiVal, category, color };
}

const CONSCIOUSNESS_LIST = ['Compos Mentis', 'Apatis', 'Somnolen', 'Sopor', 'Koma'];
const TRIAGE_LIST = [
  { id: 'HIJAU', label: 'Hijau (Non-Gawat)', color: 'bg-green-500/15 text-green-700 border-green-300' },
  { id: 'KUNING', label: 'Kuning (Gawat Tidak Darurat)', color: 'bg-amber-500/15 text-amber-700 border-amber-300' },
  { id: 'MERAH', label: 'Merah (Gawat Darurat)', color: 'bg-red-500/15 text-red-700 border-red-300' },
  { id: 'HITAM', label: 'Hitam (Meninggal)', color: 'bg-slate-500/15 text-slate-700 border-slate-300' },
];

const DISPOSITION_LIST = [
  { id: 'PULANG_BEROBAT_JALAN', name: 'Pulang / Berobat Jalan' },
  { id: 'RUJUK_INTERNAL', name: 'Rujuk Internal (Konsul Antar-Poli)' },
  { id: 'RUJUK_EKSTERNAL', name: 'Rujuk Eksternal (Rumah Sakit / Spesialis)' },
  { id: 'KONTROL_ULANG', name: 'Jadwal Kontrol Ulang' },
  { id: 'PULANG_PAKSA', name: 'Pulang Atas Permintaan Sendiri (PAPS)' },
];

const TACC_OPTIONS = [
  { id: '-1', name: 'Tanpa TACC (Umum / Standar)' },
  { id: '1', name: 'T1 - Time (Waktu Kedatangan / Janji)' },
  { id: '2', name: 'T2 - Age (Usia Berisiko / Geriatri / Pediatri)' },
  { id: '3', name: 'T3 - Complication (Adanya Komplikasi Medis)' },
  { id: '4', name: 'T4 - Comorbidity (Penyakit Penyerta Kronis)' },
];

const QUICK_SOAP_PRESETS = [
  { label: 'ISPA / Batuk Pilek', s: 'Pasien mengeluh batuk, pilek, dan demam sejak 2 hari yang lalu. Tenggorokan terasa gatal dan nyeri menelan. Nafsu makan menurun.', o: 'KU: Cukup, CM. Faring hiperemis (+), tonsil T1/T1 tenang. Rhonki -/-, Wheezing -/-.', p: 'Terapi simtomatik, istirahat cukup, perbanyak minum air hangat.' },
  { label: 'Gastritis / Maag', s: 'Pasien mengeluh nyeri ulu hati, mual, dan kembung terutama setelah terlambat makan atau makan pedas sejak tadi malam.', o: 'KU: Baik, CM. Abdomen: Nyeri tekan regio epigastrium (+), bising usus normal, hepar/lien tidak teraba.', p: 'Antasida/PPI, edukasi pola makan teratur dan hindari makanan asam/pedas.' },
  { label: 'Hipertensi Rutin', s: 'Pasien kontrol rutin tensi darah. Kadang merasa tengkuk terasa berat dan pusing jika kurang tidur. Riwayat hipertensi terkontrol.', o: 'KU: Baik, CM. TD meningkat, Cor/Pulmo dalam batas normal. Edema ekstremitas (-).', p: 'Lanjutkan antihipertensi, kurangi konsumsi garam, diet rendah lemak.' },
];

export function EncounterWorkspace({ encounterId, onBack }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ttv'); // 'ttv' | 'soap' | 'diagnosa' | 'tindakan' | 'disposisi'
  const [showReferralPrint, setShowReferralPrint] = useState(false);
  const [referralPrintData, setReferralPrintData] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // ─── Query Encounter Detail ──────────────────────────────────────────────────
  const { data: encounter, isLoading, refetch } = useQuery({
    queryKey: ['encounter-detail', encounterId],
    queryFn: () => apiClient.get(`/encounters/${encounterId}`).then((r) => r.data.data),
    enabled: !!encounterId,
  });

  // Query Master ICD-10
  const { data: icd10List = [] } = useQuery({
    queryKey: ['master-icd10-all'],
    queryFn: () => apiClient.get('/master/icd10', { params: { limit: 200 } }).then((r) => r.data.data.items),
    staleTime: 300000,
  });

  // Query Master Procedures
  const { data: procedureList = [] } = useQuery({
    queryKey: ['master-procedures-all'],
    queryFn: () => apiClient.get('/master/procedures', { params: { limit: 100 } }).then((r) => r.data.data.items),
    staleTime: 300000,
  });

  // Query Master Poliklinik (untuk rujukan internal)
  const { data: polyclinicList = [] } = useQuery({
    queryKey: ['master-polyclinics-all'],
    queryFn: () => apiClient.get('/master/polyclinics', { params: { limit: 50 } }).then((r) => r.data.data.items),
    staleTime: 300000,
  });

  // Query Master Dokter (untuk rujukan internal)
  const { data: practitionerList = [] } = useQuery({
    queryKey: ['master-practitioners-all'],
    queryFn: () => apiClient.get('/master/practitioners', { params: { limit: 50 } }).then((r) => r.data.data.items),
    staleTime: 300000,
  });

  // ─── Form Local State ────────────────────────────────────────────────────────
  const [ttvForm, setTtvForm] = useState({
    systolic: '',
    diastolic: '',
    heartRate: '',
    respiratoryRate: '',
    temperature: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
    waistCircumference: '',
    consciousness: 'Compos Mentis',
    triage: 'HIJAU',
    physicalExamNotes: '',
  });

  const [soapForm, setSoapForm] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    prognosis: 'Bonam',
    notes: '',
  });

  const [diagInput, setDiagInput] = useState({
    icd10Id: '',
    icd10Code: '',
    icd10Name: '',
    diagnosisType: 'PRIMARY',
    diagnosisCase: 'BARU',
    notes: '',
  });

  const [procInput, setProcInput] = useState({
    procedureId: '',
    procedureCode: '',
    procedureName: '',
    quantity: 1,
    tariff: 0,
    notes: '',
  });

  const [dispositionForm, setDispositionForm] = useState({
    dispositionType: 'PULANG_BEROBAT_JALAN',
    followUpDate: '',
    followUpNotes: '',
    referral: {
      referralType: 'EXTERNAL',
      targetPolyclinicId: '',
      targetPractitionerId: '',
      internalConsultReason: '',
      targetFacilityName: '',
      targetFacilityCode: '',
      targetPolyclinicName: '',
      targetPolyclinicCode: '',
      referralReason: '',
      initialTherapy: '',
      transportation: 'Mandiri',
      pcareTaccCode: '-1',
      pcareTaccReason: '',
    },
  });

  // Sinkronisasi data saat encounter dimuat
  useEffect(() => {
    if (encounter) {
      if (encounter.vitalSigns) {
        setTtvForm({
          systolic: encounter.vitalSigns.systolic || '',
          diastolic: encounter.vitalSigns.diastolic || '',
          heartRate: encounter.vitalSigns.heartRate || '',
          respiratoryRate: encounter.vitalSigns.respiratoryRate || '',
          temperature: encounter.vitalSigns.temperature || '',
          oxygenSaturation: encounter.vitalSigns.oxygenSaturation || '',
          weight: encounter.vitalSigns.weight || '',
          height: encounter.vitalSigns.height || '',
          waistCircumference: encounter.vitalSigns.waistCircumference || '',
          consciousness: encounter.vitalSigns.consciousness || 'Compos Mentis',
          triage: encounter.vitalSigns.triage || 'HIJAU',
          physicalExamNotes: encounter.vitalSigns.physicalExamNotes || '',
        });
      }
      if (encounter.soapNotes) {
        setSoapForm({
          subjective: encounter.soapNotes.subjective || '',
          objective: encounter.soapNotes.objective || '',
          assessment: encounter.soapNotes.assessment || '',
          plan: encounter.soapNotes.plan || '',
          prognosis: encounter.soapNotes.prognosis || 'Bonam',
          notes: encounter.soapNotes.notes || '',
        });
      }
      if (encounter.disposition) {
        setDispositionForm((prev) => ({
          ...prev,
          dispositionType: encounter.disposition.dispositionType || 'PULANG_BEROBAT_JALAN',
          followUpDate: encounter.disposition.followUpDate || '',
          followUpNotes: encounter.disposition.followUpNotes || '',
          referral: encounter.referral
            ? {
                referralType: encounter.referral.referralType || 'EXTERNAL',
                targetPolyclinicId: encounter.referral.targetPolyclinicId || '',
                targetPractitionerId: encounter.referral.targetPractitionerId || '',
                internalConsultReason: encounter.referral.internalConsultReason || '',
                targetFacilityName: encounter.referral.targetFacilityName || '',
                targetFacilityCode: encounter.referral.targetFacilityCode || '',
                targetPolyclinicName: encounter.referral.targetPolyclinicName || '',
                targetPolyclinicCode: encounter.referral.targetPolyclinicCode || '',
                referralReason: encounter.referral.referralReason || '',
                initialTherapy: encounter.referral.initialTherapy || '',
                transportation: encounter.referral.transportation || 'Mandiri',
                pcareTaccCode: encounter.referral.pcareTaccCode || '-1',
                pcareTaccReason: encounter.referral.pcareTaccReason || '',
              }
            : prev.referral,
        }));
      }
    }
  }, [encounter]);

  // ─── Mutations ────────────────────────────────────────────────────────────────
  const saveTtvMutation = useMutation({
    mutationFn: (data) => apiClient.put(`/encounters/${encounterId}/vital-signs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-detail', encounterId] });
      flashSuccess('TTV & Status Gizi berhasil disimpan');
    },
  });

  const saveSoapMutation = useMutation({
    mutationFn: (data) => apiClient.put(`/encounters/${encounterId}/soap`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-detail', encounterId] });
      flashSuccess('Catatan SOAP berhasil disimpan');
    },
  });

  const addDiagnosisMutation = useMutation({
    mutationFn: (data) => apiClient.post(`/encounters/${encounterId}/diagnoses`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-detail', encounterId] });
      setDiagInput({ icd10Id: '', icd10Code: '', icd10Name: '', diagnosisType: 'SECONDARY', diagnosisCase: 'BARU', notes: '' });
      flashSuccess('Diagnosa ICD-10 berhasil ditambahkan');
    },
  });

  const deleteDiagnosisMutation = useMutation({
    mutationFn: (diagId) => apiClient.delete(`/encounters/${encounterId}/diagnoses/${diagId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-detail', encounterId] });
    },
  });

  const addProcedureMutation = useMutation({
    mutationFn: (data) => apiClient.post(`/encounters/${encounterId}/procedures`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-detail', encounterId] });
      setProcInput({ procedureId: '', procedureCode: '', procedureName: '', quantity: 1, tariff: 0, notes: '' });
      flashSuccess('Tindakan medis berhasil ditambahkan');
    },
  });

  const deleteProcedureMutation = useMutation({
    mutationFn: (procId) => apiClient.delete(`/encounters/${encounterId}/procedures/${procId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-detail', encounterId] });
    },
  });

  const saveDispositionMutation = useMutation({
    mutationFn: (data) => apiClient.put(`/encounters/${encounterId}/disposition`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-detail', encounterId] });
      flashSuccess('Status tindak lanjut & data rujukan berhasil disimpan');
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => apiClient.post(`/encounters/${encounterId}/finalize`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-detail', encounterId] });
      queryClient.invalidateQueries({ queryKey: ['encounters-doctor-queue'] });
      flashSuccess('Rekam Medis Berhasil Difinalisasi & Dikunci');
    },
  });

  const amendMutation = useMutation({
    mutationFn: (reason) => apiClient.post(`/encounters/${encounterId}/amend`, { amendmentReason: reason }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['encounters-doctor-queue'] });
      // Switch workspace to the new amended encounter ID
      if (res.data?.data?.id) {
        window.location.href = `/encounters?id=${res.data.data.id}`;
      }
    },
  });

  const flashSuccess = (msg) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleSaveAllDraft = () => {
    saveTtvMutation.mutate(ttvForm);
    saveSoapMutation.mutate(soapForm);
    saveDispositionMutation.mutate(dispositionForm);
  };

  const handleFinalize = () => {
    if (!soapForm.subjective || !soapForm.objective) {
      alert('Subjektif (Anamnesis) dan Objektif (Pemeriksaan Fisik) wajib diisi sebelum finalisasi.');
      return;
    }
    if ((encounter?.diagnoses || []).length === 0) {
      if (!confirm('Peringatan: Belum ada Diagnosa ICD-10 yang diinput. Yakin ingin melanjutkan finalisasi?')) {
        return;
      }
    }
    if (confirm('Konfirmasi Finalisasi: Rekam medis akan dikunci dari pengeditan langsung dan status kunjungan pasien selesai. Lanjutkan?')) {
      handleSaveAllDraft();
      finalizeMutation.mutate();
    }
  };

  const handleAmend = () => {
    const reason = prompt('Masukkan alasan amandemen / revisi rekam medis:');
    if (reason && reason.trim().length >= 5) {
      amendMutation.mutate(reason.trim());
    } else if (reason !== null) {
      alert('Alasan amandemen wajib diisi minimal 5 karakter');
    }
  };

  const handleOpenReferralPrint = async () => {
    if (encounter?.referral?.id) {
      try {
        const res = await apiClient.get(`/referrals/${encounter.referral.id}/print`);
        setReferralPrintData(res.data.data);
        setShowReferralPrint(true);
      } catch (err) {
        alert('Gagal memuat surat rujukan: ' + err.message);
      }
    } else {
      alert('Simpan data rujukan terlebih dahulu sebelum mencetak surat rujukan.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Membuka Rekam Medis Pasien...</p>
      </div>
    );
  }

  if (!encounter) return null;

  const isFinalized = encounter.status === 'FINALIZED';
  const isAmended = encounter.status === 'AMENDED';
  const bmiInfo = calculateBMI(ttvForm.weight, ttvForm.height);

  const icd10Options = icd10List.map((i) => ({
    id: i.code,
    name: `${i.code} — ${i.nameEn} ${i.nameId ? `(${i.nameId})` : ''}`,
    raw: i,
  }));

  const procedureOptions = procedureList.map((p) => ({
    id: p.id,
    name: `${p.code ? p.code + ' - ' : ''}${p.name} (Rp ${Number(p.tariff || 0).toLocaleString('id-ID')})`,
    raw: p,
  }));

  const polyclinicOptions = polyclinicList.map((p) => ({ id: p.id, name: p.name }));
  const practitionerOptions = practitionerList.map((p) => ({
    id: p.id,
    name: `${p.title ? p.title + ' ' : ''}${p.name}`,
  }));

  return (
    <div className="space-y-4">
      {/* ─── 1. TOP PATIENT HEADER BANNER ───────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card via-card to-primary/5 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary font-black text-xl flex items-center justify-center border border-primary/20 shrink-0">
            {encounter.patientName?.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-foreground leading-none">{encounter.patientName}</h2>
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                RM: {encounter.patientMrn}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {encounter.patientInsuranceType} {encounter.patientBpjsNumber ? `(${encounter.patientBpjsNumber})` : ''}
              </Badge>
              {isFinalized && (
                <Badge className="bg-green-600 text-white gap-1 text-[10px]">
                  <Lock className="w-3 h-3" /> TERKUNCI (FINAL)
                </Badge>
              )}
              {isAmended && (
                <Badge className="bg-amber-600 text-white gap-1 text-[10px]">
                  <Edit3 className="w-3 h-3" /> AMENDED (DIREVISI)
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
              <span>{encounter.patientGender}</span>
              <span>&bull;</span>
              <span>{calculateAge(encounter.patientBirthDate)}</span>
              <span>&bull;</span>
              <span>Poli: <strong>{encounter.polyclinicName}</strong></span>
              <span>&bull;</span>
              <span>Dokter: <strong>{encounter.practitionerTitle} {encounter.practitionerName}</strong></span>
            </p>

            {encounter.patientAllergiesNotes && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-destructive/10 text-destructive text-[11px] font-bold border border-destructive/20">
                <ShieldAlert className="w-3.5 h-3.5" />
                Alergi: {encounter.patientAllergiesNotes}
              </div>
            )}
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <Button variant="outline" size="sm" onClick={onBack} className="text-xs">
            &larr; Daftar Antrian
          </Button>

          {!isFinalized ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAllDraft}
                disabled={saveTtvMutation.isPending || saveSoapMutation.isPending}
                className="gap-1.5 text-xs"
              >
                <Save className="w-3.5 h-3.5" /> Simpan Draft
              </Button>
              <Button
                size="sm"
                onClick={handleFinalize}
                disabled={finalizeMutation.isPending}
                className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Finalisasi Rekam Medis
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAmend}
              className="gap-1.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 font-semibold"
            >
              <Edit3 className="w-3.5 h-3.5" /> Buat Amandemen Medis
            </Button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in-0 duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ─── 2. TAB NAVIGATION ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-border overflow-x-auto no-scrollbar">
        {[
          { id: 'ttv', label: 'Tanda Vital & Fisik', icon: HeartPulse, count: ttvForm.systolic ? '✓' : null },
          { id: 'soap', label: 'SOAP Klinis', icon: FileText, count: soapForm.subjective ? '✓' : null },
          { id: 'diagnosa', label: 'Diagnosa ICD-10', icon: Stethoscope, count: (encounter.diagnoses || []).length },
          { id: 'tindakan', label: 'Tindakan Medis', icon: Activity, count: (encounter.procedures || []).length },
          { id: 'disposisi', label: 'Tindak Lanjut & Rujukan', icon: Share2, count: dispositionForm.dispositionType !== 'PULANG_BEROBAT_JALAN' ? '!' : null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isCurrent = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
                isCurrent
                  ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── 3. TAB 1: TANDA-TANDA VITAL (TTV) & ANTROPOMETRI ─────────────────── */}
      {activeTab === 'ttv' && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="py-3 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-primary" /> Tanda-Tanda Vital & Status Gizi
              </span>
              {!isFinalized && (
                <Button size="sm" onClick={() => saveTtvMutation.mutate(ttvForm)} disabled={saveTtvMutation.isPending} className="h-7 text-xs gap-1">
                  <Save className="w-3 h-3" /> Simpan TTV
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Grid TTV */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-[11px] font-semibold block mb-1">Tekanan Darah (Sistol)</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={ttvForm.systolic}
                    disabled={isFinalized}
                    onChange={(e) => setTtvForm({ ...ttvForm, systolic: e.target.value })}
                    placeholder="120"
                    className="text-xs h-9 font-mono font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">mmHg</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1">Tekanan Darah (Diastol)</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={ttvForm.diastolic}
                    disabled={isFinalized}
                    onChange={(e) => setTtvForm({ ...ttvForm, diastolic: e.target.value })}
                    placeholder="80"
                    className="text-xs h-9 font-mono font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">mmHg</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1">Denyut Nadi</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={ttvForm.heartRate}
                    disabled={isFinalized}
                    onChange={(e) => setTtvForm({ ...ttvForm, heartRate: e.target.value })}
                    placeholder="80"
                    className="text-xs h-9 font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">x/m</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1">Laju Nafas (RR)</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={ttvForm.respiratoryRate}
                    disabled={isFinalized}
                    onChange={(e) => setTtvForm({ ...ttvForm, respiratoryRate: e.target.value })}
                    placeholder="20"
                    className="text-xs h-9 font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">x/m</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1">Suhu Tubuh</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={ttvForm.temperature}
                    disabled={isFinalized}
                    onChange={(e) => setTtvForm({ ...ttvForm, temperature: e.target.value })}
                    placeholder="36.5"
                    className="text-xs h-9 font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">°C</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1">Saturasi O2 (SpO2)</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={ttvForm.oxygenSaturation}
                    disabled={isFinalized}
                    onChange={(e) => setTtvForm({ ...ttvForm, oxygenSaturation: e.target.value })}
                    placeholder="98"
                    className="text-xs h-9 font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">%</span>
                </div>
              </div>
            </div>

            {/* Antropometri & Auto-BMI */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
              <p className="font-bold text-xs flex items-center gap-1.5 text-primary">
                <Scale className="w-4 h-4" /> Antropometri & Kalkulasi BMI Otomatis
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[11px] font-semibold block mb-1">Berat Badan (BB)</label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={ttvForm.weight}
                      disabled={isFinalized}
                      onChange={(e) => setTtvForm({ ...ttvForm, weight: e.target.value })}
                      placeholder="60"
                      className="text-xs h-9 font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground font-semibold">kg</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1">Tinggi Badan (TB)</label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.5"
                      value={ttvForm.height}
                      disabled={isFinalized}
                      onChange={(e) => setTtvForm({ ...ttvForm, height: e.target.value })}
                      placeholder="165"
                      className="text-xs h-9 font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground font-semibold">cm</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1">Lingkar Perut</label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={ttvForm.waistCircumference}
                      disabled={isFinalized}
                      onChange={(e) => setTtvForm({ ...ttvForm, waistCircumference: e.target.value })}
                      placeholder="75"
                      className="text-xs h-9 font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground font-semibold">cm</span>
                  </div>
                </div>

                {/* BMI Result Badge */}
                <div className="p-2.5 rounded-xl border border-border bg-background flex flex-col justify-center">
                  <span className="text-[10px] text-muted-foreground font-semibold">Indeks Massa Tubuh (BMI)</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-base font-black font-mono">{bmiInfo.bmi}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${bmiInfo.color}`}>
                      {bmiInfo.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kesadaran & Triase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold block mb-1">Tingkat Kesadaran (PCare)</label>
                <select
                  value={ttvForm.consciousness}
                  disabled={isFinalized}
                  onChange={(e) => setTtvForm({ ...ttvForm, consciousness: e.target.value })}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-input bg-background font-medium"
                >
                  {CONSCIOUSNESS_LIST.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1">Kategori Triase</label>
                <select
                  value={ttvForm.triage}
                  disabled={isFinalized}
                  onChange={(e) => setTtvForm({ ...ttvForm, triage: e.target.value })}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-input bg-background font-medium"
                >
                  {TRIAGE_LIST.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pemeriksaan Fisik */}
            <div>
              <label className="text-[11px] font-semibold block mb-1">Pemeriksaan Fisik Head to Toe / Status Lokalis</label>
              <textarea
                value={ttvForm.physicalExamNotes}
                disabled={isFinalized}
                onChange={(e) => setTtvForm({ ...ttvForm, physicalExamNotes: e.target.value })}
                rows={3}
                placeholder="Kepala, leher, thoraks, abdomen, ekstremitas, status dermatologis..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 4. TAB 2: SOAP CATATAN KLINIS ──────────────────────────────────── */}
      {activeTab === 'soap' && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="py-3 border-b border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Catatan Rekam Medis SOAP
              </CardTitle>
              {!isFinalized && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground mr-1">Preset Cepat:</span>
                  {QUICK_SOAP_PRESETS.map((p) => (
                    <Button
                      key={p.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSoapForm({ ...soapForm, subjective: p.s, objective: p.o, plan: p.p })}
                      className="text-[10px] h-6 px-2 text-primary"
                    >
                      <Sparkles className="w-2.5 h-2.5 mr-1" /> {p.label}
                    </Button>
                  ))}
                  <Button size="sm" onClick={() => saveSoapMutation.mutate(soapForm)} disabled={saveSoapMutation.isPending} className="h-7 text-xs gap-1 ml-2">
                    <Save className="w-3 h-3" /> Simpan SOAP
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* S: Subjektif */}
              <div>
                <label className="text-xs font-bold block mb-1 text-blue-700 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-[11px]">S</span>
                  Subjektif (Anamnesis / Keluhan Utama) *
                </label>
                <textarea
                  value={soapForm.subjective}
                  disabled={isFinalized}
                  onChange={(e) => setSoapForm({ ...soapForm, subjective: e.target.value })}
                  rows={4}
                  placeholder="Keluhan utama, riwayat penyakit sekarang, riwayat penyakit dahulu, riwayat pengobatan..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* O: Objektif */}
              <div>
                <label className="text-xs font-bold block mb-1 text-purple-700 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-[11px]">O</span>
                  Objektif (Pemeriksaan Fisik / Status Lokalis) *
                </label>
                <textarea
                  value={soapForm.objective}
                  disabled={isFinalized}
                  onChange={(e) => setSoapForm({ ...soapForm, objective: e.target.value })}
                  rows={4}
                  placeholder="Keadaan umum, hasil pemeriksaan fisik, status lokalis, hasil penunjang singkat..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* A: Asesmen */}
              <div>
                <label className="text-xs font-bold block mb-1 text-amber-700 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-[11px]">A</span>
                  Asesmen (Analisa Medis / Diagnosa Kerja)
                </label>
                <textarea
                  value={soapForm.assessment}
                  disabled={isFinalized}
                  onChange={(e) => setSoapForm({ ...soapForm, assessment: e.target.value })}
                  rows={4}
                  placeholder="Kesimpulan analisa dokter, differential diagnosis, status klinis..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* P: Plan */}
              <div>
                <label className="text-xs font-bold block mb-1 text-green-700 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-black text-[11px]">P</span>
                  Plan (Rencana Penatalaksanaan & Edukasi)
                </label>
                <textarea
                  value={soapForm.plan}
                  disabled={isFinalized}
                  onChange={(e) => setSoapForm({ ...soapForm, plan: e.target.value })}
                  rows={4}
                  placeholder="Rencana terapi obat, edukasi pola hidup, instruksi istirahat, diet khusus..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Prognosis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
              <div>
                <label className="text-[11px] font-semibold block mb-1">Prognosis Medis</label>
                <select
                  value={soapForm.prognosis}
                  disabled={isFinalized}
                  onChange={(e) => setSoapForm({ ...soapForm, prognosis: e.target.value })}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-input bg-background font-medium"
                >
                  {['Bonam', 'Malam', 'Dubia ad Bonam', 'Dubia ad Malam'].map((pr) => (
                    <option key={pr} value={pr}>{pr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1">Catatan Tambahan Dokter (Internal)</label>
                <Input
                  value={soapForm.notes}
                  disabled={isFinalized}
                  onChange={(e) => setSoapForm({ ...soapForm, notes: e.target.value })}
                  placeholder="Catatan rahasia medis dokter..."
                  className="text-xs h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 5. TAB 3: DIAGNOSA ICD-10 ──────────────────────────────────────── */}
      {activeTab === 'diagnosa' && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="py-3 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" /> Diagnosa Medis (ICD-10 Standard)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Input Add Diagnosis */}
            {!isFinalized && (
              <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                <p className="font-bold text-xs text-primary flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Tambah Diagnosa Baru
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold block mb-1">Cari Kode / Nama ICD-10 *</label>
                    <SearchableSelect
                      options={icd10Options}
                      value={diagInput.icd10Code}
                      onChange={(val, raw) =>
                        setDiagInput({
                          ...diagInput,
                          icd10Code: val,
                          icd10Name: raw?.nameEn || raw?.name || val,
                        })
                      }
                      placeholder="Ketik kode (misal A09, I10) atau nama diagnosa..."
                      searchPlaceholder="Cari ICD-10..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Tipe Diagnosa</label>
                    <select
                      value={diagInput.diagnosisType}
                      onChange={(e) => setDiagInput({ ...diagInput, diagnosisType: e.target.value })}
                      className="w-full h-10 px-3 text-xs rounded-lg border border-input bg-background font-semibold"
                    >
                      <option value="PRIMARY">PRIMARY (Utama)</option>
                      <option value="SECONDARY">SECONDARY (Sekunder)</option>
                      <option value="COMPLICATION">COMPLICATION (Komplikasi)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Kasus (PCare)</label>
                    <div className="flex gap-2">
                      <select
                        value={diagInput.diagnosisCase}
                        onChange={(e) => setDiagInput({ ...diagInput, diagnosisCase: e.target.value })}
                        className="w-full h-10 px-3 text-xs rounded-lg border border-input bg-background font-semibold"
                      >
                        <option value="BARU">Kasus Baru</option>
                        <option value="LAMA">Kasus Lama</option>
                      </select>
                      <Button
                        type="button"
                        onClick={() => {
                          if (!diagInput.icd10Code) {
                            alert('Pilih diagnosa ICD-10 terlebih dahulu');
                            return;
                          }
                          addDiagnosisMutation.mutate(diagInput);
                        }}
                        disabled={addDiagnosisMutation.isPending || !diagInput.icd10Code}
                        className="h-10 px-3 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* List Diagnosa */}
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Kode</TableHead>
                    <TableHead>Nama Diagnosa ICD-10</TableHead>
                    <TableHead className="w-32">Tipe</TableHead>
                    <TableHead className="w-28">Kasus</TableHead>
                    {!isFinalized && <TableHead className="w-16 text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(encounter.diagnoses || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                        Belum ada diagnosa ICD-10 yang ditambahkan
                      </TableCell>
                    </TableRow>
                  ) : (
                    encounter.diagnoses.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono font-bold text-xs text-primary">{d.icd10Code}</TableCell>
                        <TableCell className="font-medium text-xs">{d.icd10Name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              d.diagnosisType === 'PRIMARY'
                                ? 'bg-primary/10 text-primary border-primary/30 font-bold'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {d.diagnosisType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-[11px] font-semibold text-muted-foreground">{d.diagnosisCase}</span>
                        </TableCell>
                        {!isFinalized && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDiagnosisMutation.mutate(d.id)}
                              className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 6. TAB 4: TINDAKAN MEDIS ───────────────────────────────────────── */}
      {activeTab === 'tindakan' && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="py-3 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Tindakan Medis & Layanan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Input Add Procedure */}
            {!isFinalized && (
              <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                <p className="font-bold text-xs text-primary flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Tambah Tindakan Medis
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold block mb-1">Pilih Tindakan Medis *</label>
                    <SearchableSelect
                      options={procedureOptions}
                      value={procInput.procedureId}
                      onChange={(val, raw) =>
                        setProcInput({
                          ...procInput,
                          procedureId: val,
                          procedureCode: raw?.code || '',
                          procedureName: raw?.name || val,
                          tariff: raw?.tariff || 0,
                        })
                      }
                      placeholder="Pilih tindakan dari tarif klinik..."
                      searchPlaceholder="Cari tindakan..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Jumlah</label>
                    <Input
                      type="number"
                      min={1}
                      value={procInput.quantity}
                      onChange={(e) => setProcInput({ ...procInput, quantity: parseInt(e.target.value, 10) || 1 })}
                      className="text-xs h-10 font-mono"
                    />
                  </div>

                  <div>
                    <Button
                      type="button"
                      onClick={() => {
                        if (!procInput.procedureName) {
                          alert('Pilih tindakan terlebih dahulu');
                          return;
                        }
                        addProcedureMutation.mutate(procInput);
                      }}
                      disabled={addProcedureMutation.isPending || !procInput.procedureName}
                      className="w-full h-10 gap-1.5 text-xs font-semibold"
                    >
                      <Plus className="w-4 h-4" /> Tambah Tindakan
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* List Procedures */}
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Kode</TableHead>
                    <TableHead>Nama Tindakan Medis</TableHead>
                    <TableHead className="w-20 text-center">Jumlah</TableHead>
                    <TableHead className="w-32 text-right">Tarif</TableHead>
                    <TableHead className="w-32 text-right">Total</TableHead>
                    {!isFinalized && <TableHead className="w-16 text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(encounter.procedures || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                        Belum ada tindakan medis yang dicatat
                      </TableCell>
                    </TableRow>
                  ) : (
                    encounter.procedures.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.procedureCode || '—'}</TableCell>
                        <TableCell className="font-semibold text-xs">{p.procedureName}</TableCell>
                        <TableCell className="text-center font-mono">{p.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          Rp {Number(p.tariff || 0).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs text-primary">
                          Rp {(Number(p.tariff || 0) * p.quantity).toLocaleString('id-ID')}
                        </TableCell>
                        {!isFinalized && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteProcedureMutation.mutate(p.id)}
                              className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 7. TAB 5: TINDAK LANJUT & RUJUKAN (PCARE READY) ────────────────── */}
      {activeTab === 'disposisi' && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="py-3 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" /> Tindak Lanjut Pasien & Rujukan (PCare Ready)
              </CardTitle>
              <div className="flex items-center gap-2">
                {encounter.referral && (
                  <Button size="sm" variant="outline" onClick={handleOpenReferralPrint} className="h-7 text-xs gap-1.5 text-primary border-primary/30">
                    <Printer className="w-3.5 h-3.5" /> Cetak Surat Rujukan
                  </Button>
                )}
                {!isFinalized && (
                  <Button size="sm" onClick={() => saveDispositionMutation.mutate(dispositionForm)} disabled={saveDispositionMutation.isPending} className="h-7 text-xs gap-1">
                    <Save className="w-3 h-3" /> Simpan Status
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Pilih Status Pulang */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold block mb-1">Status Tindak Lanjut / Disposisi *</label>
                <select
                  value={dispositionForm.dispositionType}
                  disabled={isFinalized}
                  onChange={(e) =>
                    setDispositionForm({
                      ...dispositionForm,
                      dispositionType: e.target.value,
                      referral: {
                        ...dispositionForm.referral,
                        referralType: e.target.value === 'RUJUK_INTERNAL' ? 'INTERNAL' : 'EXTERNAL',
                      },
                    })
                  }
                  className="w-full h-10 px-3 text-xs rounded-lg border border-input bg-background font-bold text-primary"
                >
                  {DISPOSITION_LIST.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {dispositionForm.dispositionType === 'KONTROL_ULANG' && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Tanggal Rencana Kontrol</label>
                    <Input
                      type="date"
                      value={dispositionForm.followUpDate}
                      disabled={isFinalized}
                      onChange={(e) => setDispositionForm({ ...dispositionForm, followUpDate: e.target.value })}
                      className="text-xs h-10 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Catatan Kontrol</label>
                    <Input
                      value={dispositionForm.followUpNotes}
                      disabled={isFinalized}
                      onChange={(e) => setDispositionForm({ ...dispositionForm, followUpNotes: e.target.value })}
                      placeholder="Pemeriksaan lab ulang, evaluasi tensi..."
                      className="text-xs h-10"
                    />
                  </div>
                </>
              )}
            </div>

            {/* ── Form Rujukan Internal (Antar-Poli) ── */}
            {dispositionForm.dispositionType === 'RUJUK_INTERNAL' && (
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                <p className="font-bold text-xs text-primary flex items-center gap-1.5">
                  <Building className="w-4 h-4" /> Form Rujukan Internal (Konsultasi Antar-Poli Klinik)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Poli Tujuan *</label>
                    <SearchableSelect
                      options={polyclinicOptions}
                      value={dispositionForm.referral?.targetPolyclinicId}
                      disabled={isFinalized}
                      onChange={(val) =>
                        setDispositionForm({
                          ...dispositionForm,
                          referral: { ...dispositionForm.referral, targetPolyclinicId: val },
                        })
                      }
                      placeholder="Pilih Poli Tujuan..."
                      searchPlaceholder="Cari poli..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Dokter Tujuan (Opsional)</label>
                    <SearchableSelect
                      options={practitionerOptions}
                      value={dispositionForm.referral?.targetPractitionerId}
                      disabled={isFinalized}
                      onChange={(val) =>
                        setDispositionForm({
                          ...dispositionForm,
                          referral: { ...dispositionForm.referral, targetPractitionerId: val },
                        })
                      }
                      placeholder="Pilih Dokter Tujuan..."
                      searchPlaceholder="Cari dokter..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1">Alasan Permintaan Konsultasi Medis</label>
                  <textarea
                    value={dispositionForm.referral?.internalConsultReason}
                    disabled={isFinalized}
                    onChange={(e) =>
                      setDispositionForm({
                        ...dispositionForm,
                        referral: { ...dispositionForm.referral, internalConsultReason: e.target.value },
                      })
                    }
                    rows={3}
                    placeholder="Mohon evaluasi dan penatalaksanaan terkait gigi/kulit/kondisi lainnya..."
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* ── Form Rujukan Eksternal (Rumah Sakit / BPJS PCare) ── */}
            {dispositionForm.dispositionType === 'RUJUK_EKSTERNAL' && (
              <div className="p-4 rounded-xl border border-green-300 bg-green-500/5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs text-green-800 flex items-center gap-1.5">
                    <Building className="w-4 h-4" /> Form Rujukan Eksternal (Rumah Sakit / Faskes Lanjutan - PCare Ready)
                  </p>
                  {encounter.referral?.referralNumber && (
                    <span className="font-mono text-xs font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                      No. Rujukan: {encounter.referral.referralNumber}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Nama Rumah Sakit / Faskes Tujuan *</label>
                    <Input
                      value={dispositionForm.referral?.targetFacilityName}
                      disabled={isFinalized}
                      onChange={(e) =>
                        setDispositionForm({
                          ...dispositionForm,
                          referral: { ...dispositionForm.referral, targetFacilityName: e.target.value },
                        })
                      }
                      placeholder="Contoh: RSUD Dr. Soetomo Surabaya"
                      className="text-xs h-9 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Poli / Spesialis RS Tujuan *</label>
                    <Input
                      value={dispositionForm.referral?.targetPolyclinicName}
                      disabled={isFinalized}
                      onChange={(e) =>
                        setDispositionForm({
                          ...dispositionForm,
                          referral: { ...dispositionForm.referral, targetPolyclinicName: e.target.value },
                        })
                      }
                      placeholder="Contoh: Spesialis Penyakit Dalam / Jantung"
                      className="text-xs h-9 font-semibold"
                    />
                  </div>
                </div>

                {/* PCare TACC & Bridging Fields */}
                <div className="p-3 rounded-xl border border-green-200 bg-white/70 space-y-2.5">
                  <p className="text-[11px] font-bold text-green-700 uppercase tracking-wider">
                    Parameter Bridging BPJS P-Care
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Kategori TACC (Time, Age, Complication, Comorbidity)</label>
                      <select
                        value={dispositionForm.referral?.pcareTaccCode || '-1'}
                        disabled={isFinalized}
                        onChange={(e) =>
                          setDispositionForm({
                            ...dispositionForm,
                            referral: { ...dispositionForm.referral, pcareTaccCode: e.target.value },
                          })
                        }
                        className="w-full h-9 px-3 text-xs rounded-lg border border-input bg-background font-medium"
                      >
                        {TACC_OPTIONS.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Alasan TACC</label>
                      <Input
                        value={dispositionForm.referral?.pcareTaccReason || ''}
                        disabled={isFinalized}
                        onChange={(e) =>
                          setDispositionForm({
                            ...dispositionForm,
                            referral: { ...dispositionForm.referral, pcareTaccReason: e.target.value },
                          })
                        }
                        placeholder="Alasan rujukan spesifik TACC..."
                        className="text-xs h-9"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1">Alasan Rujukan / Indikasi Medis *</label>
                  <textarea
                    value={dispositionForm.referral?.referralReason}
                    disabled={isFinalized}
                    onChange={(e) =>
                      setDispositionForm({
                        ...dispositionForm,
                        referral: { ...dispositionForm.referral, referralReason: e.target.value },
                      })
                    }
                    rows={3}
                    placeholder="Indikasi medis permohonan penanganan spesialis lanjutan..."
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1">Terapi / Tindakan Awal yang Telah Diberikan Klinik</label>
                  <textarea
                    value={dispositionForm.referral?.initialTherapy}
                    disabled={isFinalized}
                    onChange={(e) =>
                      setDispositionForm({
                        ...dispositionForm,
                        referral: { ...dispositionForm.referral, initialTherapy: e.target.value },
                      })
                    }
                    rows={2}
                    placeholder="Obat/injeksi/tindakan stabilisasi yang sudah dilakukan..."
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── MODAL CETAK SURAT RUJUKAN ──────────────────────────────────────── */}
      {showReferralPrint && referralPrintData && (
        <ReferralLetterModal
          isOpen={showReferralPrint}
          onClose={() => setShowReferralPrint(false)}
          referralData={referralPrintData}
        />
      )}
    </div>
  );
}

export default EncounterWorkspace;
