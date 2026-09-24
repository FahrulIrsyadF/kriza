import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, FileText, Stethoscope, Plus, Trash2, CheckCircle2,
  AlertTriangle, Lock, ShieldAlert, HeartPulse, Scale, Clock,
  ArrowRight, Printer, Share2, Building, UserCheck, RefreshCw,
  Sparkles, Save, Edit3, CornerDownRight, Check, X, Pill, History,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReferralLetterModal } from './ReferralLetterModal';
import { AmendedHistoryModal } from './AmendedHistoryModal';
import { EncounterPrescriptionTab } from '@/features/pharmacy/EncounterPrescriptionTab';
import { dialog } from '@/context/DialogContext';
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

// ─── Auto-sync Formatters & Mergers ──────────────────────────────────────────
export function formatTtvString(ttv, bmiInfo) {
  if (!ttv) return '';
  const parts = [];
  if (ttv.systolic || ttv.diastolic) {
    parts.push(`TD: ${ttv.systolic || '-'}/${ttv.diastolic || '-'} mmHg`);
  }
  if (ttv.heartRate) {
    parts.push(`HR: ${ttv.heartRate} x/m`);
  }
  if (ttv.respiratoryRate) {
    parts.push(`RR: ${ttv.respiratoryRate} x/m`);
  }
  if (ttv.temperature) {
    parts.push(`Suhu: ${ttv.temperature} °C`);
  }
  if (ttv.oxygenSaturation) {
    parts.push(`SpO2: ${ttv.oxygenSaturation}%`);
  }

  const antro = [];
  if (ttv.weight) antro.push(`BB: ${ttv.weight} kg`);
  if (ttv.height) antro.push(`TB: ${ttv.height} cm`);
  // PERBAIKAN: IMT tidak disertakan sesuai permintaan user
  if (ttv.waistCircumference) antro.push(`LP: ${ttv.waistCircumference} cm`);

  const lines = [];
  if (parts.length > 0) {
    // PERBAIKAN: Hilangkan prefix label [TTV]
    lines.push(parts.join(' | '));
  }
  if (antro.length > 0) {
    // PERBAIKAN: Hilangkan prefix label [Antropometri]
    lines.push(antro.join(' | '));
  }
  if (ttv.consciousness && ttv.consciousness !== 'Compos Mentis') {
    lines.push(`Kesadaran: ${ttv.consciousness}`);
  }
  if (ttv.physicalExamNotes && ttv.physicalExamNotes.trim()) {
    lines.push(ttv.physicalExamNotes.trim());
  }

  return lines.join('\n');
}

export function syncTtvToObjective(currentObj = '', newTtvString = '') {
  if (!newTtvString) return currentObj;

  const lines = (currentObj || '').split('\n');
  const nonDefaultLines = lines.filter(
    (l) => l.trim() !== 'Keadaan umum baik, compos mentis.'
  );

  // Filter out any previous auto-generated TTV/Antropometri/Kesadaran/Status Fisik lines
  const manualLines = [];
  for (let i = 0; i < nonDefaultLines.length; i++) {
    const line = nonDefaultLines[i];
    const trimmed = line.trim();
    if (
      trimmed.startsWith('[TTV]') ||
      trimmed.startsWith('TTV:') ||
      trimmed.startsWith('[Antropometri]') ||
      trimmed.startsWith('Antropometri:') ||
      trimmed.startsWith('[Kesadaran]') ||
      trimmed.startsWith('Kesadaran:') ||
      trimmed.startsWith('[Status Fisik]') ||
      trimmed.startsWith('Status Fisik:') ||
      trimmed.startsWith('[Pemeriksaan Fisik]') ||
      /^TD:\s*[\d\-\/]+/i.test(trimmed) ||
      /^(TD|HR|RR|Suhu|SpO2):/i.test(trimmed) ||
      /^(BB:\s*[\d\.]+|TB:\s*[\d\.]+)/i.test(trimmed)
    ) {
      continue;
    }
    manualLines.push(line);
  }

  const manualText = manualLines.join('\n').replace(/^\n+|\n+$/g, '');
  if (!manualText) {
    return newTtvString;
  }
  return `${newTtvString}\n\n${manualText}`;
}

export function formatDiagnosesString(diagnosesList = [], pendingDiag = null) {
  const items = [...(diagnosesList || [])];

  if (pendingDiag?.icd10Code) {
    const alreadyInList = items.some((d) => d.icd10Code === pendingDiag.icd10Code);
    if (!alreadyInList) {
      items.push({
        icd10Code: pendingDiag.icd10Code,
        icd10Name: pendingDiag.icd10Name,
        diagnosisType: pendingDiag.diagnosisType || 'PRIMARY',
        diagnosisCase: pendingDiag.diagnosisCase || 'BARU',
      });
    }
  }

  if (items.length === 0) return '';

  const primaries = items.filter((d) => (d.diagnosisType || 'PRIMARY') === 'PRIMARY');
  const secondaries = items.filter((d) => d.diagnosisType === 'SECONDARY');
  const complications = items.filter((d) => d.diagnosisType === 'COMPLICATION');

  const formatItem = (d) => {
    const caseLabel = d.diagnosisCase ? ` (${d.diagnosisCase === 'BARU' ? 'Kasus Baru' : d.diagnosisCase === 'LAMA' ? 'Kasus Lama' : d.diagnosisCase})` : '';
    return `${d.icd10Code} - ${d.icd10Name || ''}${caseLabel}`.trim();
  };

  const sections = [];

  if (primaries.length === 1) {
    sections.push(`Primer : ${formatItem(primaries[0])}`);
  } else if (primaries.length > 1) {
    sections.push(`Primer :\n${primaries.map((d, i) => `${i + 1}. ${formatItem(d)}`).join('\n')}`);
  }

  if (secondaries.length === 1) {
    sections.push(`Sekunder : ${formatItem(secondaries[0])}`);
  } else if (secondaries.length > 1) {
    sections.push(`Sekunder :\n${secondaries.map((d, i) => `${i + 1}. ${formatItem(d)}`).join('\n')}`);
  }

  if (complications.length === 1) {
    sections.push(`Komplikasi : ${formatItem(complications[0])}`);
  } else if (complications.length > 1) {
    sections.push(`Komplikasi :\n${complications.map((d, i) => `${i + 1}. ${formatItem(d)}`).join('\n')}`);
  }

  return sections.join('\n');
}

export function syncDiagnosesToAssessment(currentAssessment = '', newDiagString = '') {
  if (!newDiagString) return currentAssessment;

  const lines = (currentAssessment || '').split('\n');
  const manualLines = [];
  let inDiagnosaBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      trimmed.startsWith('[Diagnosa Medis / ICD-10]') ||
      trimmed.startsWith('Diagnosa Medis:') ||
      trimmed.startsWith('Diagnosa / Asesmen Medis:') ||
      /^(Primer|Sekunder|Komplikasi)\s*:/i.test(trimmed)
    ) {
      inDiagnosaBlock = true;
      continue;
    }

    if (inDiagnosaBlock) {
      if (
        /^(\d+\.|\-)?\s*(\[.*?\])?\s*[A-Z][0-9]{2}/.test(trimmed) ||
        trimmed === ''
      ) {
        continue;
      } else {
        inDiagnosaBlock = false;
      }
    }

    // Filter out old bracketed format: 1. [Utama] A09 ...
    if (/^(\d+\.|\-)\s*\[(Utama|Sekunder|Komplikasi|PRIMARY|SECONDARY|COMPLICATION)\]/i.test(trimmed)) {
      continue;
    }

    // Filter out old clean format without Primer/Sekunder label: e.g. "1. A09 - ..." or "A09 - ..."
    if (/^(\d+\.|\-)?\s*[A-Z][0-9]{2}(\.[0-9A-Za-z]+)?\s*[\-—]/i.test(trimmed)) {
      continue;
    }

    manualLines.push(line);
  }

  const manualText = manualLines.join('\n').replace(/^\n+|\n+$/g, '');
  if (!manualText) {
    return newDiagString;
  }
  return `${newDiagString}\n\n${manualText}`;
}

export function EncounterWorkspace({ encounterId, onBack }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('soap'); // 'soap' (TTV, SOAP, Diagnosa, Tindakan) | 'resep' | 'disposisi'
  const [showReferralPrint, setShowReferralPrint] = useState(false);
  const [referralPrintData, setReferralPrintData] = useState(null);
  const [showAmendedModal, setShowAmendedModal] = useState(false);
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
    queryFn: () =>
      apiClient.get('/master/icd10', { params: { limit: 200 } }).then((r) => {
        const d = r.data?.data;
        return Array.isArray(d) ? d : (d?.items || []);
      }),
    staleTime: 300000,
  });

  // Query Master Procedures (limit dinaikkan agar seluruh master tindakan terambil)
  const { data: procedureList = [] } = useQuery({
    queryKey: ['master-procedures-all'],
    queryFn: () =>
      apiClient.get('/master/procedures', { params: { limit: 500 } }).then((r) => {
        const d = r.data?.data;
        return Array.isArray(d) ? d : (d?.items || []);
      }),
    staleTime: 300000,
  });

  // Query Master Poliklinik (untuk rujukan internal)
  const { data: polyclinicList = [] } = useQuery({
    queryKey: ['master-polyclinics-all'],
    queryFn: () =>
      apiClient.get('/master/polyclinics', { params: { limit: 50 } }).then((r) => {
        const d = r.data?.data;
        return Array.isArray(d) ? d : (d?.items || []);
      }),
    staleTime: 300000,
  });

  // Query Master Dokter (untuk rujukan internal)
  const { data: practitionerList = [] } = useQuery({
    queryKey: ['master-practitioners-all'],
    queryFn: () =>
      apiClient.get('/master/practitioners', { params: { limit: 50 } }).then((r) => {
        const d = r.data?.data;
        return Array.isArray(d) ? d : (d?.items || []);
      }),
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
        let initialObjective = encounter.soapNotes.objective || '';
        let initialAssessment = encounter.soapNotes.assessment || '';

        // Auto-populate TTV ke O jika O masih default atau kosong, dan data TTV sudah ada
        if ((!initialObjective || initialObjective === 'Keadaan umum baik, compos mentis.') && encounter.vitalSigns) {
          const bmi = calculateBMI(encounter.vitalSigns.weight, encounter.vitalSigns.height);
          const ttvStr = formatTtvString(encounter.vitalSigns, bmi);
          if (ttvStr) {
            initialObjective = ttvStr;
          }
        }

        // Auto-populate Diagnosa ke A jika A masih kosong, dan daftar diagnosa sudah ada
        if (!initialAssessment && (encounter.diagnoses || []).length > 0) {
          const diagStr = formatDiagnosesString(encounter.diagnoses);
          if (diagStr) {
            initialAssessment = diagStr;
          }
        }

        setSoapForm({
          subjective: encounter.soapNotes.subjective || '',
          objective: initialObjective,
          assessment: initialAssessment,
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
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['encounter-detail', encounterId] });
      setDiagInput({ icd10Id: '', icd10Code: '', icd10Name: '', diagnosisType: 'SECONDARY', diagnosisCase: 'BARU', notes: '' });
      
      // Auto-sync ke Assessment (A) saat diagnosa baru berhasil ditambahkan
      const updatedList = res.data?.data?.diagnoses || [...(encounter?.diagnoses || []), res.data?.data].filter(Boolean);
      const diagStr = formatDiagnosesString(updatedList);
      if (diagStr) {
        setSoapForm((prev) => ({
          ...prev,
          assessment: syncDiagnosesToAssessment(prev.assessment, diagStr),
        }));
      }
      flashSuccess('Diagnosa ICD-10 berhasil ditambahkan & disinkronkan ke Asesmen (A)');
    },
  });

  const deleteDiagnosisMutation = useMutation({
    mutationFn: (diagId) => apiClient.delete(`/encounters/${encounterId}/diagnoses/${diagId}`),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['encounter-detail', encounterId] });
      // Auto-sync update ke Assessment (A) saat diagnosa dihapus
      const updatedList = (encounter?.diagnoses || []).filter((d) => d.id !== deletedId);
      const diagStr = formatDiagnosesString(updatedList);
      setSoapForm((prev) => ({
        ...prev,
        assessment: syncDiagnosesToAssessment(prev.assessment, diagStr),
      }));
      flashSuccess('Diagnosa ICD-10 berhasil dihapus');
    },
  });

  const addProcedureMutation = useMutation({
    mutationFn: (data) =>
      apiClient.post(`/encounters/${encounterId}/procedures`, {
        ...data,
        procedureId: data.procedureId || null,
        procedureCode: data.procedureCode || null,
        notes: data.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-detail', encounterId] });
      setProcInput({ procedureId: '', procedureCode: '', procedureName: '', quantity: 1, tariff: 0, notes: '' });
      flashSuccess('Tindakan medis berhasil ditambahkan');
    },
    onError: (err) => {
      dialog.alert(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Gagal menambahkan tindakan medis', {
        title: 'Gagal Menambah Tindakan',
        variant: 'danger',
      });
    },
  });

  const deleteProcedureMutation = useMutation({
    mutationFn: (procId) => apiClient.delete(`/encounters/${encounterId}/procedures/${procId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-detail', encounterId] });
      flashSuccess('Tindakan medis berhasil dihapus');
    },
    onError: (err) => {
      dialog.alert(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Gagal menghapus tindakan medis', {
        title: 'Gagal Menghapus Tindakan',
        variant: 'danger',
      });
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

  // ─── Memoized Select Options (Harus diletakkan di top-level sebelum early return) ───
  const icd10Options = useMemo(() => {
    return icd10List.map((i) => ({
      id: i.code,
      name: `${i.code} — ${i.nameEn}${i.nameId ? ` (${i.nameId})` : ''}`,
      raw: i,
    }));
  }, [icd10List]);

  // Ambil tarif tindakan. Utamakan tarif penjamin jika bernilai > 0.
  // Jika tarif penjamin bernilai 0 atau belum ada, fallback ke tarif UMUM agar harga asli tindakan tetap tampil.
  const rawInsurance = (encounter?.paymentMethod || encounter?.patientInsuranceType || 'UMUM').toUpperCase();
  const patientInsuranceType = rawInsurance === 'ASURANSI_SWASTA' ? 'ASURANSI' : rawInsurance;

  const procedureOptions = useMemo(() => {
    return procedureList.map((p) => {
      const rates = p.rates || [];
      const matchedInsuranceRate = rates.find((r) => r.rateTypeCode?.toUpperCase() === patientInsuranceType);
      const umumRate = rates.find((r) => r.rateTypeCode?.toUpperCase() === 'UMUM');
      const firstRateWithTariff = rates.find((r) => Number(r.tariff || 0) > 0);

      let tariff = 0;
      if (matchedInsuranceRate && Number(matchedInsuranceRate.tariff || 0) > 0) {
        tariff = Number(matchedInsuranceRate.tariff);
      } else if (umumRate && Number(umumRate.tariff || 0) > 0) {
        tariff = Number(umumRate.tariff);
      } else if (firstRateWithTariff) {
        tariff = Number(firstRateWithTariff.tariff);
      } else if (matchedInsuranceRate) {
        tariff = Number(matchedInsuranceRate.tariff || 0);
      } else if (umumRate) {
        tariff = Number(umumRate.tariff || 0);
      } else if (rates[0]) {
        tariff = Number(rates[0].tariff || 0);
      }

      return {
        id: p.id,
        code: p.code,
        name: `${p.code ? p.code + ' - ' : ''}${p.name} (Rp ${tariff.toLocaleString('id-ID')})`,
        procedureName: p.name,
        tariff,
        raw: {
          ...p,
          tariff,
        },
      };
    });
  }, [procedureList, patientInsuranceType]);

  const polyclinicOptions = useMemo(() => {
    return polyclinicList.map((p) => ({ id: p.id, name: p.name }));
  }, [polyclinicList]);

  const practitionerOptions = useMemo(() => {
    return practitionerList.map((p) => ({
      id: p.id,
      name: `${p.title ? p.title + ' ' : ''}${p.name}`,
    }));
  }, [practitionerList]);

  // ─── Handlers & Auto-Sync ─────────────────────────────────────────────────────
  // PERBAIKAN: Input TTV otomatis masuk ke O (Objektif) pada SOAP dengan smart merge
  const handleTtvChange = (field, value) => {
    const nextTtv = { ...ttvForm, [field]: value };
    setTtvForm(nextTtv);

    const bmi = calculateBMI(
      field === 'weight' ? value : nextTtv.weight,
      field === 'height' ? value : nextTtv.height
    );
    const ttvStr = formatTtvString(nextTtv, bmi);
    if (ttvStr) {
      setSoapForm((prev) => ({
        ...prev,
        objective: syncTtvToObjective(prev.objective, ttvStr),
      }));
    }
  };

  const handleSyncTtvToO = () => {
    const bmi = calculateBMI(ttvForm.weight, ttvForm.height);
    const ttvStr = formatTtvString(ttvForm, bmi);
    if (ttvStr) {
      setSoapForm((prev) => ({
        ...prev,
        objective: syncTtvToObjective(prev.objective, ttvStr),
      }));
      flashSuccess('Nilai TTV berhasil disinkronkan ke Objektif (O)');
    } else {
      dialog.alert('Isi minimal salah satu parameter TTV terlebih dahulu.', {
        title: 'Parameter TTV Kosong',
        variant: 'warning',
      });
    }
  };

  // PERBAIKAN: Pemilihan Diagnosa ICD-10 otomatis masuk ke A (Asesmen) pada SOAP
  const handleSelectDiagnosis = (val, raw) => {
    const nextDiag = {
      ...diagInput,
      icd10Code: val,
      icd10Name: raw?.nameEn || raw?.name || val,
    };
    setDiagInput(nextDiag);

    if (val) {
      const diagStr = formatDiagnosesString(encounter?.diagnoses || [], nextDiag);
      setSoapForm((prev) => ({
        ...prev,
        assessment: syncDiagnosesToAssessment(prev.assessment, diagStr),
      }));
    }
  };

  const handleSyncDiagnosesToA = () => {
    const diagStr = formatDiagnosesString(encounter?.diagnoses || [], diagInput.icd10Code ? diagInput : null);
    if (diagStr) {
      setSoapForm((prev) => ({
        ...prev,
        assessment: syncDiagnosesToAssessment(prev.assessment, diagStr),
      }));
      flashSuccess('Diagnosa ICD-10 berhasil disinkronkan ke Asesmen (A)');
    } else {
      dialog.alert('Pilih atau tambahkan minimal satu diagnosa ICD-10 terlebih dahulu.', {
        title: 'Diagnosa Kosong',
        variant: 'warning',
      });
    }
  };

  // Simpan data klinis gabungan (TTV + SOAP)
  const handleSaveClinicalData = async () => {
    try {
      await Promise.all([
        saveTtvMutation.mutateAsync(ttvForm),
        saveSoapMutation.mutateAsync(soapForm),
      ]);
      flashSuccess('Pemeriksaan TTV & Catatan SOAP berhasil disimpan');
    } catch (err) {
      dialog.alert('Gagal menyimpan data klinis: ' + (err.response?.data?.error?.message || err.message), {
        title: 'Penyimpanan Gagal',
        variant: 'danger',
      });
    }
  };

  const handleSaveAllDraft = () => {
    saveTtvMutation.mutate(ttvForm);
    saveSoapMutation.mutate(soapForm);
    saveDispositionMutation.mutate(dispositionForm);
  };

  const handleFinalize = async () => {
    // 1. Validasi TTV
    const hasTtv =
      ttvForm.systolic &&
      ttvForm.diastolic &&
      ttvForm.heartRate &&
      ttvForm.temperature;

    if (!hasTtv) {
      if (activeTab !== 'soap') setActiveTab('soap');
      dialog.alert(
        'Tanda-Tanda Vital (TTV) wajib diisi lengkap (Tekanan Darah Sistol/Diastol, Nadi, dan Suhu Tubuh) sebelum finalisasi.',
        {
          title: 'Validasi TTV Belum Lengkap',
          variant: 'warning',
        }
      );
      setTimeout(() => {
        document.getElementById('section-ttv')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    // 2. Validasi SOAP (S, O, A, P wajib diisi semua)
    if (
      !soapForm.subjective?.trim() ||
      !soapForm.objective?.trim() ||
      !soapForm.assessment?.trim() ||
      !soapForm.plan?.trim()
    ) {
      if (activeTab !== 'soap') setActiveTab('soap');
      dialog.alert(
        'Catatan SOAP klinis (Subjektif, Objektif, Asesmen, dan Planning) wajib diisi lengkap sebelum finalisasi.',
        {
          title: 'Validasi SOAP Belum Lengkap',
          variant: 'warning',
        }
      );
      setTimeout(() => {
        document.getElementById('section-soap')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    // 3. Validasi Diagnosa ICD-10 (minimal 1)
    if ((encounter?.diagnoses || []).length === 0) {
      if (activeTab !== 'soap') setActiveTab('soap');
      dialog.alert(
        'Diagnosa medis (ICD-10) wajib diisi minimal 1 diagnosa sebelum finalisasi.',
        {
          title: 'Validasi Diagnosa Belum Ada',
          variant: 'warning',
        }
      );
      setTimeout(() => {
        document.getElementById('section-diagnosa')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    // 4. Validasi Tindakan Medis (minimal 1)
    if ((encounter?.procedures || []).length === 0) {
      if (activeTab !== 'soap') setActiveTab('soap');
      dialog.alert(
        'Tindakan medis / pelayanan wajib diisi minimal 1 tindakan sebelum finalisasi.',
        {
          title: 'Validasi Tindakan Medis Belum Ada',
          variant: 'warning',
        }
      );
      setTimeout(() => {
        document.getElementById('section-tindakan')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    const confirmed = await dialog.confirm(
      'Rekam medis akan dikunci dari pengeditan langsung dan status kunjungan pasien selesai. Lanjutkan finalisasi?',
      {
        title: 'Konfirmasi Finalisasi Rekam Medis',
        variant: 'danger',
        confirmText: 'Ya, Finalisasi & Kunci',
      }
    );

    if (confirmed) {
      try {
        await Promise.all([
          saveTtvMutation.mutateAsync(ttvForm),
          saveSoapMutation.mutateAsync(soapForm),
        ]);
        finalizeMutation.mutate();
      } catch (err) {
        dialog.alert(
          'Gagal menyimpan data klinis sebelum finalisasi: ' +
            (err.response?.data?.error?.message || err.response?.data?.message || err.message),
          {
            title: 'Gagal Finalisasi',
            variant: 'danger',
          }
        );
      }
    }
  };

  const handleAmend = async () => {
    const reason = await dialog.prompt('Masukkan alasan amandemen / revisi rekam medis:', {
      title: 'Buat Amandemen Rekam Medis',
      placeholder: 'Contoh: Revisi dosis terapi atas keluhan pasien...',
      confirmText: 'Kirim Amandemen',
    });
    if (reason && reason.trim().length >= 5) {
      amendMutation.mutate(reason.trim());
    } else if (reason !== null) {
      dialog.alert('Alasan amandemen wajib diisi minimal 5 karakter.', {
        title: 'Validasi Amandemen',
        variant: 'warning',
      });
    }
  };

  const handleOpenReferralPrint = async () => {
    if (encounter?.referral?.id) {
      try {
        const res = await apiClient.get(`/referrals/${encounter.referral.id}/print`);
        setReferralPrintData(res.data.data);
        setShowReferralPrint(true);
      } catch (err) {
        dialog.alert('Gagal memuat surat rujukan: ' + err.message, {
          title: 'Gagal Memuat Rujukan',
          variant: 'danger',
        });
      }
    } else {
      dialog.alert('Simpan data rujukan terlebih dahulu sebelum mencetak surat rujukan.', {
        title: 'Data Rujukan Belum Disimpan',
        variant: 'warning',
      });
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
                {encounter.paymentMethod || encounter.patientInsuranceType} {encounter.patientBpjsNumber ? `(${encounter.patientBpjsNumber})` : ''}
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
            <Button
              size="sm"
              onClick={handleFinalize}
              disabled={finalizeMutation.isPending}
              className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Finalisasi Rekam Medis
            </Button>
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

      {/* ─── AMENDED REVISION BANNER ────────────────────────────────────────── */}
      {encounter.amendedFromId && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <History className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-amber-900">
                  Rekam Medis Ini Merupakan Hasil Amandemen / Revisi
                </span>
                <Badge variant="outline" className="border-amber-400 bg-amber-100 text-amber-800 text-[10px] font-semibold">
                  Versi Aktif
                </Badge>
              </div>
              {encounter.amendmentReason && (
                <p className="text-xs text-amber-800/90 mt-0.5">
                  <span className="font-medium">Alasan Amandemen:</span> "{encounter.amendmentReason}"
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAmendedModal(true)}
            className="text-xs font-semibold border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900 shrink-0 gap-1.5"
          >
            <History className="w-3.5 h-3.5" /> Lihat Arsip Sebelum Revisi
          </Button>
        </div>
      )}

      {/* ─── 2. TAB NAVIGATION (RINGKAS & TERINTEGRASI) ────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-border overflow-x-auto no-scrollbar">
        {[
          {
            id: 'soap',
            label: 'Pemeriksaan & SOAP Klinis',
            icon: Stethoscope,
            count: (encounter.diagnoses || []).length ? `${(encounter.diagnoses || []).length} Diag` : (soapForm.subjective ? '✓' : null),
          },
          { id: 'resep', label: 'Resep Obat', icon: Pill, count: null },
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

      {/* ─── 3. TAB 1: PEMERIKSAAN & CATATAN SOAP KLINIS (TERPADU) ─────────── */}
      {activeTab === 'soap' && (
        <div className="space-y-4">
          {/* Navigasi Cepat Antar-Bagian Klinis */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-border bg-muted/20">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground mr-1">Navigasi Cepat:</span>
              <a
                href="#section-ttv"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-background border border-border hover:border-primary hover:text-primary transition-colors shadow-xs"
              >
                <HeartPulse className="w-3.5 h-3.5 text-primary" /> TTV & Fisik
                {ttvForm.systolic && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
              </a>
              <a
                href="#section-soap"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-background border border-border hover:border-primary hover:text-primary transition-colors shadow-xs"
              >
                <FileText className="w-3.5 h-3.5 text-primary" /> Catatan SOAP
                {soapForm.subjective && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
              </a>
              <a
                href="#section-diagnosa"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-background border border-border hover:border-primary hover:text-primary transition-colors shadow-xs"
              >
                <Stethoscope className="w-3.5 h-3.5 text-primary" /> Diagnosa ICD-10
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary">
                  {(encounter.diagnoses || []).length}
                </span>
              </a>
              <a
                href="#section-tindakan"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-background border border-border hover:border-primary hover:text-primary transition-colors shadow-xs"
              >
                <Activity className="w-3.5 h-3.5 text-primary" /> Tindakan Medis
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary">
                  {(encounter.procedures || []).length}
                </span>
              </a>
            </div>
          </div>

          {/* ── BAGIAN 1: TANDA-TANDA VITAL (TTV) & ANTROPOMETRI ── */}
          <Card id="section-ttv" className="rounded-2xl shadow-sm scroll-mt-4">
            <CardHeader className="py-3 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-primary" /> Tanda-Tanda Vital & Status Gizi
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 gap-1 font-semibold hidden sm:inline-flex">
                    <Sparkles className="w-3 h-3" /> Auto-sync ke Objektif (O)
                  </Badge>
                </span>
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
                      onChange={(e) => handleTtvChange('systolic', e.target.value)}
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
                      onChange={(e) => handleTtvChange('diastolic', e.target.value)}
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
                      onChange={(e) => handleTtvChange('heartRate', e.target.value)}
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
                      onChange={(e) => handleTtvChange('respiratoryRate', e.target.value)}
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
                      onChange={(e) => handleTtvChange('temperature', e.target.value)}
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
                      onChange={(e) => handleTtvChange('oxygenSaturation', e.target.value)}
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
                        onChange={(e) => handleTtvChange('weight', e.target.value)}
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
                        onChange={(e) => handleTtvChange('height', e.target.value)}
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
                        onChange={(e) => handleTtvChange('waistCircumference', e.target.value)}
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
                    onChange={(e) => handleTtvChange('consciousness', e.target.value)}
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
                    onChange={(e) => handleTtvChange('triage', e.target.value)}
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
                  onChange={(e) => handleTtvChange('physicalExamNotes', e.target.value)}
                  rows={3}
                  placeholder="Kepala, leher, thoraks, abdomen, ekstremitas, status dermatologis..."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </CardContent>
            {!isFinalized && (
              <CardFooter className="py-2.5 px-4 border-t border-border bg-muted/10 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveTtvMutation.mutate(ttvForm)}
                  disabled={saveTtvMutation.isPending}
                  className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Simpan TTV & Status Gizi
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* ── BAGIAN 2: CATATAN REKAM MEDIS SOAP ── */}
          <Card id="section-soap" className="rounded-2xl shadow-sm scroll-mt-4">
            <CardHeader className="py-3 border-b border-border bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Catatan Rekam Medis SOAP
                </CardTitle>
                {!isFinalized && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground mr-1">Preset Cepat:</span>
                    {QUICK_SOAP_PRESETS.map((p) => (
                      <Button
                        key={p.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const bmi = calculateBMI(ttvForm.weight, ttvForm.height);
                          const ttvStr = formatTtvString(ttvForm, bmi);
                          const diagStr = formatDiagnosesString(encounter?.diagnoses || []);
                          setSoapForm((prev) => ({
                            ...prev,
                            subjective: p.s,
                            objective: ttvStr ? `${ttvStr}\n\n${p.o}` : p.o,
                            assessment: diagStr ? `${diagStr}\n\n${p.label}` : p.label,
                            plan: p.p,
                          }));
                        }}
                        className="text-[10px] h-6 px-2 text-primary"
                      >
                        <Sparkles className="w-2.5 h-2.5 mr-1" /> {p.label}
                      </Button>
                    ))}
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
                    rows={5}
                    placeholder="Keluhan utama, riwayat penyakit sekarang, riwayat penyakit dahulu, riwayat pengobatan..."
                    className="w-full rounded-xl border border-input bg-background p-3 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* O: Objektif (Auto-sync dari TTV, tetap editable) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-purple-700 flex items-center gap-1">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-[11px]">O</span>
                      Objektif (Pemeriksaan Fisik / Status Lokalis) *
                    </label>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[9px] py-0 h-4 bg-purple-50 text-purple-700 border-purple-200">
                        Auto-sync TTV
                      </Badge>
                      {!isFinalized && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSyncTtvToO}
                          title="Sinkronkan ulang nilai TTV ke kolom Objektif"
                          className="h-5 px-1.5 text-[10px] text-purple-700 hover:bg-purple-100 gap-1"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Sync TTV
                        </Button>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={soapForm.objective}
                    disabled={isFinalized}
                    onChange={(e) => setSoapForm({ ...soapForm, objective: e.target.value })}
                    rows={5}
                    placeholder="Keadaan umum, hasil pemeriksaan fisik, status lokalis, hasil penunjang singkat..."
                    className="w-full rounded-xl border border-input bg-background p-3 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* A: Asesmen (Auto-sync dari Diagnosa, tetap editable) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-[11px]">A</span>
                      Asesmen (Analisa Medis / Diagnosa Kerja)
                    </label>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[9px] py-0 h-4 bg-amber-50 text-amber-700 border-amber-200">
                        Auto-sync Diagnosa
                      </Badge>
                      {!isFinalized && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSyncDiagnosesToA}
                          title="Sinkronkan ulang daftar diagnosa ICD-10 ke kolom Asesmen"
                          className="h-5 px-1.5 text-[10px] text-amber-700 hover:bg-amber-100 gap-1"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Sync Diagnosa
                        </Button>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={soapForm.assessment}
                    disabled={isFinalized}
                    onChange={(e) => setSoapForm({ ...soapForm, assessment: e.target.value })}
                    rows={5}
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
                    rows={5}
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
            {!isFinalized && (
              <CardFooter className="py-2.5 px-4 border-t border-border bg-muted/10 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveSoapMutation.mutate(soapForm)}
                  disabled={saveSoapMutation.isPending}
                  className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Simpan Catatan SOAP
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* ── BAGIAN 3: DIAGNOSA ICD-10 STANDARD ── */}
          <Card id="section-diagnosa" className="rounded-2xl shadow-sm scroll-mt-4">
            <CardHeader className="py-3 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-primary" /> Diagnosa Medis (ICD-10 Standard)
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 gap-1 font-semibold hidden sm:inline-flex">
                    <Sparkles className="w-3 h-3" /> Auto-sync ke Asesmen (A)
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {(encounter.diagnoses || []).length} Diagnosa Terinput
                </span>
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
                        onChange={handleSelectDiagnosis}
                        placeholder="Ketik kode (misal A09, I10) atau nama diagnosa..."
                        searchPlaceholder="Cari ICD-10..."
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Tipe Diagnosa</label>
                      <select
                        value={diagInput.diagnosisType}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          const nextDiag = { ...diagInput, diagnosisType: nextType };
                          setDiagInput(nextDiag);
                          if (nextDiag.icd10Code) {
                            const diagStr = formatDiagnosesString(encounter?.diagnoses || [], nextDiag);
                            setSoapForm((prev) => ({
                              ...prev,
                              assessment: syncDiagnosesToAssessment(prev.assessment, diagStr),
                            }));
                          }
                        }}
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
                          onChange={(e) => {
                            const nextCase = e.target.value;
                            const nextDiag = { ...diagInput, diagnosisCase: nextCase };
                            setDiagInput(nextDiag);
                            if (nextDiag.icd10Code) {
                              const diagStr = formatDiagnosesString(encounter?.diagnoses || [], nextDiag);
                              setSoapForm((prev) => ({
                                ...prev,
                                assessment: syncDiagnosesToAssessment(prev.assessment, diagStr),
                              }));
                            }
                          }}
                          className="w-full h-10 px-3 text-xs rounded-lg border border-input bg-background font-semibold"
                        >
                          <option value="BARU">Kasus Baru</option>
                          <option value="LAMA">Kasus Lama</option>
                        </select>
                        <Button
                          type="button"
                          onClick={() => {
                            if (!diagInput.icd10Code) {
                              dialog.alert('Pilih diagnosa ICD-10 terlebih dahulu', {
                                title: 'Diagnosa Belum Dipilih',
                                variant: 'warning',
                              });
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

          {/* ── BAGIAN 4: TINDAKAN MEDIS & LAYANAN ── */}
          <Card id="section-tindakan" className="rounded-2xl shadow-sm scroll-mt-4">
            <CardHeader className="py-3 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Tindakan Medis & Layanan
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {(encounter.procedures || []).length} Tindakan Terinput
                </span>
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
                            procedureCode: raw?.code || raw?.raw?.code || '',
                            procedureName: raw?.procedureName || raw?.raw?.name || val,
                            tariff: raw?.tariff ?? raw?.raw?.tariff ?? 0,
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
                            dialog.alert('Pilih tindakan terlebih dahulu', {
                              title: 'Tindakan Belum Dipilih',
                              variant: 'warning',
                            });
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

          {/* ── BAR AKSI BAWAH: SIMPAN DATA KLINIS & FINALISASI ── */}
          {!isFinalized && (
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Status Kelengkapan Data Rekam Medis (Syarat Finalisasi):</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 text-[11px] ${ttvForm.systolic && ttvForm.diastolic && ttvForm.heartRate && ttvForm.temperature ? 'text-green-600 font-bold' : 'text-amber-600 font-medium'}`}>
                    {ttvForm.systolic && ttvForm.diastolic && ttvForm.heartRate && ttvForm.temperature ? '✓' : '•'} TTV Lengkap
                  </span>
                  <span>&bull;</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] ${soapForm.subjective?.trim() && soapForm.objective?.trim() && soapForm.assessment?.trim() && soapForm.plan?.trim() ? 'text-green-600 font-bold' : 'text-amber-600 font-medium'}`}>
                    {soapForm.subjective?.trim() && soapForm.objective?.trim() && soapForm.assessment?.trim() && soapForm.plan?.trim() ? '✓' : '•'} SOAP Lengkap
                  </span>
                  <span>&bull;</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] ${(encounter.diagnoses || []).length > 0 ? 'text-green-600 font-bold' : 'text-amber-600 font-medium'}`}>
                    {(encounter.diagnoses || []).length > 0 ? '✓' : '•'} Diagnosa ICD-10 ({(encounter.diagnoses || []).length})
                  </span>
                  <span>&bull;</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] ${(encounter.procedures || []).length > 0 ? 'text-green-600 font-bold' : 'text-amber-600 font-medium'}`}>
                    {(encounter.procedures || []).length > 0 ? '✓' : '•'} Tindakan Medis ({(encounter.procedures || []).length})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveClinicalData}
                  disabled={saveTtvMutation.isPending || saveSoapMutation.isPending}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Save className="w-3.5 h-3.5" /> Simpan TTV & SOAP
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleFinalize}
                  disabled={finalizeMutation.isPending}
                  className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Finalisasi Rekam Medis
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 7. TAB 5: RESEP OBAT ELEKTRONIK (FARMASI) ───────────────────────── */}
      {activeTab === 'resep' && (
        <EncounterPrescriptionTab encounterId={encounterId} isReadOnly={isFinalized} />
      )}

      {/* ─── 8. TAB 6: TINDAK LANJUT & RUJUKAN (PCARE READY) ────────────────── */}
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

      {/* ─── MODAL AMANDEMEN ARSIP SEBELUM REVISI ──────────────────────────── */}
      {encounter.amendedFromId && (
        <AmendedHistoryModal
          isOpen={showAmendedModal}
          onClose={() => setShowAmendedModal(false)}
          encounterId={encounter.amendedFromId}
        />
      )}
    </div>
  );
}

export default EncounterWorkspace;
