import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Phone,
  CreditCard,
  AlertTriangle,
  HeartPulse,
  Eye,
  CheckCircle2,
  FileText,
  UserCheck,
  Building,
  X,
  UserPlus,
  ShieldAlert,
  MapPin,
  Sparkles,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import AppLayout from '@/components/layout/AppLayout';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

// ─── Reference Options (Matching Clinic Records) ─────────────────────────────
const GENDERS = ['Laki-laki', 'Perempuan'];
const BLOOD_TYPES = ['-', 'A', 'B', 'AB', 'O'];
const RHESUS_OPTIONS = ['+', '-'];
const IDENTITY_TYPES = ['KTP', 'SIM', 'PASPOR', 'KIA', 'BPJS', 'LAINNYA'];
const EDUCATION_OPTIONS = [
  '-',
  'Tidak/Belum Sekolah',
  'SD',
  'SMP',
  'SMA/SMK',
  'D3',
  'S1/D4',
  'S2',
  'S3',
];
const OCCUPATION_OPTIONS = [
  '-',
  'PNS/TNI/POLRI',
  'Karyawan Swasta',
  'Wiraswasta/Pedagang',
  'Petani/Peternak',
  'Buruh',
  'Ibu Rumah Tangga',
  'Pelajar/Mahasiswa',
  'Pensiunan',
  'Belum/Tidak Bekerja',
  'Lainnya',
];
const NATIONALITIES = ['WNI', 'WNA'];
const RELIGIONS = ['-', 'ISLAM', 'KRISTEN', 'KATHOLIK', 'HINDU', 'BUDDHA', 'KHONG HU CU', 'LAINNYA'];
const MARITAL_STATUSES = ['BELUM MENIKAH', 'MENIKAH', 'CERAI HIDUP', 'CERAI MATI'];
const ETHNICITIES = ['JAWA', 'MADURA', 'SUNDA', 'BATAK', 'TIONGHOA', 'BALI', 'LAINNYA'];
const LANGUAGES = ['INDONESIA', 'JAWA', 'MADURA', 'SUNDA', 'INGGRIS', 'LAINNYA'];
const INSURANCE_TYPES = ['UMUM', 'BPJS', 'ASURANSI'];

/**
 * Utility untuk menghitung umur (Tahun, Bulan, Hari) dari tanggal lahir
 */
function calculateAge(birthDateStr) {
  if (!birthDateStr) return { years: 0, months: 0, days: 0 };
  const birth = new Date(birthDateStr);
  const now = new Date();
  if (isNaN(birth.getTime())) return { years: 0, months: 0, days: 0 };

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
  };
}

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [page, setPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState(null); // For detail modal
  const [formState, setFormState] = useState({ open: false, mode: 'create', data: null });
  const formCardRef = useRef(null);
  const queryClient = useQueryClient();

  // ─── Form State ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    medicalRecordNumber: '',
    name: '',
    identityType: 'KTP',
    identityNumber: '',
    gender: 'Laki-laki',
    birthPlace: '',
    birthDate: '',
    ageYears: 0,
    ageMonths: 0,
    ageDays: 0,
    bloodType: '-',
    rhesus: '+',
    address: '',
    residenceAddress: '',
    provinsiId: 12, // Default Jawa Timur
    kabupatenId: '',
    kecamatanId: '',
    kelurahanId: '',
    education: '-',
    occupation: '-',
    nationality: 'WNI',
    religion: 'ISLAM',
    ethnicity: 'JAWA',
    maritalStatus: 'BELUM MENIKAH',
    phone: '',
    parentName: '',
    language: 'INDONESIA',
    insuranceType: 'UMUM',
    bpjsNumber: '',
    noKk: '',
    allergiesNotes: '',
    chronicDiseasesNotes: '',
  });

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: patientsResponse, isLoading } = useQuery({
    queryKey: ['patients', debouncedSearchQuery, page],
    queryFn: async () => {
      const res = await apiClient.get('/patients', {
        params: { search: debouncedSearchQuery, page, limit: 15 },
      });
      return res.data.data;
    },
  });

  const { data: nextMRNData } = useQuery({
    queryKey: ['next-mrn'],
    queryFn: async () => {
      const res = await apiClient.get('/patients/next-mrn');
      return res.data.data.nextMedicalRecordNumber;
    },
    enabled: formState.open && formState.mode === 'create',
  });

  // Wilayah Cascade Queries
  const { data: provinsiList = [] } = useQuery({
    queryKey: ['provinsi'],
    queryFn: async () => {
      const res = await apiClient.get('/wilayah/provinsi');
      return res.data.data;
    },
    enabled: formState.open,
  });

  const { data: kabupatenList = [] } = useQuery({
    queryKey: ['kabupaten', formData.provinsiId],
    queryFn: async () => {
      if (!formData.provinsiId) return [];
      const res = await apiClient.get(`/wilayah/kabupaten/${formData.provinsiId}`);
      return res.data.data;
    },
    enabled: !!formData.provinsiId && formState.open,
  });

  const { data: kecamatanList = [] } = useQuery({
    queryKey: ['kecamatan', formData.kabupatenId],
    queryFn: async () => {
      if (!formData.kabupatenId) return [];
      const res = await apiClient.get(`/wilayah/kecamatan/${formData.kabupatenId}`);
      return res.data.data;
    },
    enabled: !!formData.kabupatenId && formState.open,
  });

  const { data: kelurahanList = [] } = useQuery({
    queryKey: ['kelurahan', formData.kecamatanId],
    queryFn: async () => {
      if (!formData.kecamatanId) return [];
      const res = await apiClient.get(`/wilayah/kelurahan/${formData.kecamatanId}`);
      return res.data.data;
    },
    enabled: !!formData.kecamatanId && formState.open,
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const patientMutation = useMutation({
    mutationFn: async (payload) => {
      if (formState.mode === 'edit') {
        return apiClient.put(`/patients/${formState.data.id}`, payload);
      }
      return apiClient.post('/patients', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['total-patients'] });
      queryClient.invalidateQueries({ queryKey: ['next-mrn'] });
      setFormState({ open: false, mode: 'create', data: null });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/patients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['total-patients'] });
    },
  });

  // ─── Open / Close Form Handlers ─────────────────────────────────────────────
  const openCreateForm = () => {
    setFormData({
      medicalRecordNumber: nextMRNData || '',
      name: '',
      identityType: 'KTP',
      identityNumber: '',
      gender: 'Laki-laki',
      birthPlace: '',
      birthDate: '',
      ageYears: 0,
      ageMonths: 0,
      ageDays: 0,
      bloodType: '-',
      rhesus: '+',
      address: '',
      residenceAddress: '',
      provinsiId: 12, // Default Jawa Timur
      kabupatenId: '',
      kecamatanId: '',
      kelurahanId: '',
      education: '-',
      occupation: '-',
      nationality: 'WNI',
      religion: 'ISLAM',
      ethnicity: 'JAWA',
      maritalStatus: 'BELUM MENIKAH',
      phone: '',
      parentName: '',
      language: 'INDONESIA',
      insuranceType: 'UMUM',
      bpjsNumber: '',
      noKk: '',
      allergiesNotes: '',
      chronicDiseasesNotes: '',
    });
    setFormState({ open: true, mode: 'create', data: null });
    setTimeout(() => {
      formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const openEditForm = (p) => {
    const age = calculateAge(p.birthDate);
    setFormData({
      medicalRecordNumber: p.medicalRecordNumber || '',
      name: p.name || '',
      identityType: p.identityType || 'KTP',
      identityNumber: p.identityNumber || '',
      gender: p.gender || 'Laki-laki',
      birthPlace: p.birthPlace || '',
      birthDate: p.birthDate ? String(p.birthDate).substring(0, 10) : '',
      ageYears: age.years,
      ageMonths: age.months,
      ageDays: age.days,
      bloodType: p.bloodType || '-',
      rhesus: p.rhesus || '+',
      address: p.address || '',
      residenceAddress: p.residenceAddress || '',
      provinsiId: p.provinsiId || '',
      kabupatenId: p.kabupatenId || '',
      kecamatanId: p.kecamatanId || '',
      kelurahanId: p.kelurahanId || '',
      education: p.education || '-',
      occupation: p.occupation || '-',
      nationality: p.nationality || 'WNI',
      religion: p.religion || 'ISLAM',
      ethnicity: p.ethnicity || 'JAWA',
      maritalStatus: p.maritalStatus || 'BELUM MENIKAH',
      phone: p.phone || '',
      parentName: p.parentName || '',
      language: p.language || 'INDONESIA',
      insuranceType: p.insuranceType || 'UMUM',
      bpjsNumber: p.bpjsNumber || '',
      noKk: p.noKk || '',
      allergiesNotes: p.allergiesNotes || '',
      chronicDiseasesNotes: p.chronicDiseasesNotes || '',
    });
    setFormState({ open: true, mode: 'edit', data: p });
    setTimeout(() => {
      formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Sync next MRN into form when available
  useEffect(() => {
    if (formState.open && formState.mode === 'create' && nextMRNData && !formData.medicalRecordNumber) {
      setFormData((prev) => ({ ...prev, medicalRecordNumber: nextMRNData }));
    }
  }, [nextMRNData, formState.open, formState.mode]);

  // Handle Birth Date Change -> Auto Calculate Age
  const handleBirthDateChange = (val) => {
    const age = calculateAge(val);
    setFormData((prev) => ({
      ...prev,
      birthDate: val,
      ageYears: age.years,
      ageMonths: age.months,
      ageDays: age.days,
    }));
  };

  // Handle Age Years Change -> Auto Estimate Birth Year
  const handleAgeYearsChange = (yearsVal) => {
    const y = parseInt(yearsVal, 10) || 0;
    const now = new Date();
    const estYear = now.getFullYear() - y;
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentDay = String(now.getDate()).padStart(2, '0');
    const estBirthDate = `${estYear}-${currentMonth}-${currentDay}`;
    setFormData((prev) => ({
      ...prev,
      ageYears: y,
      birthDate: estBirthDate,
    }));
  };

  const handleSubmitPatient = (e) => {
    e.preventDefault();
    patientMutation.mutate({
      ...formData,
      provinsiId: formData.provinsiId ? Number(formData.provinsiId) : null,
      kabupatenId: formData.kabupatenId ? Number(formData.kabupatenId) : null,
      kecamatanId: formData.kecamatanId ? Number(formData.kecamatanId) : null,
      kelurahanId: formData.kelurahanId ? Number(formData.kelurahanId) : null,
    });
  };

  return (
    <AppLayout
      title="Manajemen Pasien (RME)"
      subtitle="Pendaftaran pasien baru, pencarian rekam medis, riwayat demografi & klinis"
      actions={
        <Button
          onClick={() => {
            if (formState.open) {
              setFormState({ open: false, mode: 'create', data: null });
            } else {
              openCreateForm();
            }
          }}
          variant={formState.open ? 'outline' : 'default'}
          className="gap-2 shadow-sm"
        >
          {formState.open ? (
            <>
              <X className="w-4 h-4" />
              Tutup Formulir
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Pasien Baru
            </>
          )}
        </Button>
      }
    >
      <div className="w-full flex flex-col gap-6">
        {/* ─── 1. EXPANDABLE PATIENT FORM CARD (ABOVE SEARCH BAR) ───────────── */}
        {formState.open && (
          <div ref={formCardRef} className="animate-in fade-in slide-in-from-top-4 duration-300">
            <Card className="border-2 border-primary/25 shadow-lg rounded-2xl overflow-hidden bg-card">
              <CardHeader className="bg-muted/40 border-b border-border/80 py-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      {formState.mode === 'edit' ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-foreground">
                          {formState.mode === 'edit'
                            ? `Ubah Data Pasien (RM: ${formState.data?.medicalRecordNumber})`
                            : 'Formulir Pendaftaran Pasien Baru'}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                          {formState.mode === 'edit' ? 'Mode Edit' : 'Pasien Baru'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Lengkapi seluruh informasi identitas pokok, alamat berjenjang, dan riwayat klinis pasien
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormState({ open: false, mode: 'create', data: null })}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <form onSubmit={handleSubmitPatient}>
                <CardContent className="p-6 space-y-6">
                  {/* BARIS 1: IDENTITAS POKOK */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        1. Identitas Pokok & Demografi
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3.5">
                      <div>
                        <label className="text-[11px] font-semibold text-destructive block mb-1">
                          No. Medrec (RM) *
                        </label>
                        <Input
                          value={formData.medicalRecordNumber}
                          onChange={(e) => setFormData({ ...formData, medicalRecordNumber: e.target.value })}
                          placeholder="000001"
                          className="border-destructive/40 font-mono font-bold text-xs bg-muted/20"
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[11px] font-semibold text-destructive block mb-1">
                          Nama Pasien *
                        </label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Masukkan nama lengkap pasien..."
                          className="border-destructive/40 text-xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Jenis Kelamin</label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                          required
                        >
                          {GENDERS.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Pendidikan</label>
                        <select
                          value={formData.education}
                          onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                        >
                          {EDUCATION_OPTIONS.map((ed) => (
                            <option key={ed} value={ed}>{ed}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Pekerjaan</label>
                        <select
                          value={formData.occupation}
                          onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                        >
                          {OCCUPATION_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3.5 mt-3.5">
                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Tmp. Lahir</label>
                        <Input
                          value={formData.birthPlace}
                          onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                          placeholder="Kota lahir..."
                          className="text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Tgl Lahir *</label>
                        <Input
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => handleBirthDateChange(e.target.value)}
                          className="text-xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Umur (Thn / Bln / Hr)</label>
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              value={formData.ageYears}
                              onChange={(e) => handleAgeYearsChange(e.target.value)}
                              className="w-11 h-10 px-1 text-center rounded-lg border border-input bg-background text-xs font-mono font-bold"
                              title="Tahun"
                              placeholder="0"
                            />
                            <span className="text-[10px] text-muted-foreground font-semibold">Th</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              value={formData.ageMonths}
                              readOnly
                              className="w-9 h-10 px-0.5 text-center rounded-lg border border-input bg-muted text-xs font-mono text-muted-foreground"
                              title="Bulan"
                              placeholder="0"
                            />
                            <span className="text-[10px] text-muted-foreground font-semibold">Bl</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              value={formData.ageDays}
                              readOnly
                              className="w-9 h-10 px-0.5 text-center rounded-lg border border-input bg-muted text-xs font-mono text-muted-foreground"
                              title="Hari"
                              placeholder="0"
                            />
                            <span className="text-[10px] text-muted-foreground font-semibold">Hr</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Gol. Darah</label>
                        <select
                          value={formData.bloodType}
                          onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                        >
                          {BLOOD_TYPES.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Agama</label>
                        <select
                          value={formData.religion}
                          onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                        >
                          {RELIGIONS.map((a) => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Suku / Bangsa</label>
                        <div className="flex items-center gap-1">
                          <select
                            value={formData.ethnicity}
                            onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                            className="w-full h-10 px-2 rounded-lg border border-input bg-background text-xs"
                          >
                            {ETHNICITIES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <select
                            value={formData.nationality}
                            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                            className="w-16 h-10 px-1 rounded-lg border border-input bg-background text-xs font-semibold"
                          >
                            {NATIONALITIES.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BARIS 2: ALAMAT & WILAYAH BERJENJANG */}
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        2. Alamat Domisili & Wilayah Berjenjang
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3.5">
                      <div className="md:col-span-3">
                        <label className="text-[11px] font-semibold block mb-1">Alamat (KTP)</label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Jalan, RT/RW, Dusun..."
                          className="text-xs"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-[11px] font-semibold block mb-1">Tempat Tinggal Sekarang (Domisili)</label>
                        <Input
                          value={formData.residenceAddress}
                          onChange={(e) => setFormData({ ...formData, residenceAddress: e.target.value })}
                          placeholder="Jika berbeda dengan KTP..."
                          className="text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Provinsi</label>
                        <SearchableSelect
                          options={provinsiList}
                          value={formData.provinsiId}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              provinsiId: val,
                              kabupatenId: '',
                              kecamatanId: '',
                              kelurahanId: '',
                            })
                          }
                          placeholder="Pilih Provinsi..."
                          searchPlaceholder="Ketik nama provinsi..."
                          emptyMessage="Provinsi tidak ditemukan"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Kabupaten / Kota</label>
                        <SearchableSelect
                          options={kabupatenList}
                          value={formData.kabupatenId}
                          disabled={!formData.provinsiId}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              kabupatenId: val,
                              kecamatanId: '',
                              kelurahanId: '',
                            })
                          }
                          placeholder={formData.provinsiId ? 'Pilih Kabupaten / Kota...' : 'Pilih Provinsi dulu'}
                          searchPlaceholder="Ketik kabupaten/kota..."
                          emptyMessage="Kabupaten tidak ditemukan"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Kecamatan</label>
                        <SearchableSelect
                          options={kecamatanList}
                          value={formData.kecamatanId}
                          disabled={!formData.kabupatenId}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              kecamatanId: val,
                              kelurahanId: '',
                            })
                          }
                          placeholder={formData.kabupatenId ? 'Pilih Kecamatan...' : 'Pilih Kab/Kota dulu'}
                          searchPlaceholder="Ketik kecamatan..."
                          emptyMessage="Kecamatan tidak ditemukan"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Kelurahan / Desa</label>
                        <SearchableSelect
                          options={kelurahanList}
                          value={formData.kelurahanId}
                          disabled={!formData.kecamatanId}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              kelurahanId: val,
                            })
                          }
                          placeholder={formData.kecamatanId ? 'Pilih Kelurahan / Desa...' : 'Pilih Kecamatan dulu'}
                          searchPlaceholder="Ketik kelurahan/desa..."
                          emptyMessage="Kelurahan tidak ditemukan"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Status Pernikahan</label>
                        <select
                          value={formData.maritalStatus}
                          onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                        >
                          {MARITAL_STATUSES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Bahasa Sehari-hari</label>
                        <select
                          value={formData.language}
                          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                        >
                          {LANGUAGES.map((bh) => (
                            <option key={bh} value={bh}>{bh}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* BARIS 3: KONTAK & PENJAMIN */}
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        3. Kontak & Jenis Penjamin / Asuransi
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3.5">
                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Jenis Identitas</label>
                        <select
                          value={formData.identityType}
                          onChange={(e) => setFormData({ ...formData, identityType: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                        >
                          {IDENTITY_TYPES.map((it) => (
                            <option key={it} value={it}>{it}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[11px] font-semibold block mb-1">Nomor Identitas</label>
                        <Input
                          value={formData.identityNumber}
                          onChange={(e) => setFormData({ ...formData, identityNumber: e.target.value })}
                          placeholder=""
                          className="font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold block mb-1">Telepon (HP / WA)</label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="08123456789"
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[11px] font-semibold block mb-1">Orang Tua / Penanggung Jawab</label>
                        <Input
                          value={formData.parentName}
                          onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                          placeholder="Nama ibu kandung / penanggung jawab..."
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* BARIS 4: PENJAMIN & CATATAN KLINIS / ALERGI */}
                  <div className="p-4 rounded-xl border border-border bg-muted/20 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Jenis Penjamin</label>
                      <select
                        value={formData.insuranceType}
                        onChange={(e) => setFormData({ ...formData, insuranceType: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs font-semibold"
                      >
                        {INSURANCE_TYPES.map((ins) => (
                          <option key={ins} value={ins}>{ins}</option>
                        ))}
                      </select>
                      {formData.insuranceType === 'BPJS' && (
                        <Input
                          value={formData.bpjsNumber}
                          onChange={(e) => setFormData({ ...formData, bpjsNumber: e.target.value })}
                          placeholder="Nomor Kartu BPJS..."
                          className="mt-2 text-xs font-mono"
                        />
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-amber-600 block mb-1">
                        Peringatan Alergi (Obat / Makanan)
                      </label>
                      <Input
                        value={formData.allergiesNotes}
                        onChange={(e) => setFormData({ ...formData, allergiesNotes: e.target.value })}
                        placeholder="Contoh: Alergi Amoxicillin, Seafood..."
                        className="text-xs border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-purple-600 block mb-1">
                        Riwayat Penyakit Kronis / Komorbid
                      </label>
                      <Input
                        value={formData.chronicDiseasesNotes}
                        onChange={(e) => setFormData({ ...formData, chronicDiseasesNotes: e.target.value })}
                        placeholder="Contoh: Hipertensi, Diabetes Mellitus..."
                        className="text-xs border-purple-500/30 bg-purple-500/5 text-purple-900 dark:text-purple-200"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="bg-muted/40 border-t border-border/80 py-4 px-6 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormState({ open: false, mode: 'create', data: null })}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={patientMutation.isPending} className="gap-2 shadow-sm">
                    <UserCheck className="w-4 h-4" />
                    {patientMutation.isPending ? 'Menyimpan...' : 'Simpan Data Pasien'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        )}

        {/* ─── 2. SEARCH TOOLBAR & PATIENTS TABLE ───────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari No. RM, Nama, NIK, No. HP, No. BPJS..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9 bg-card"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Total Pasien:</span>
            <span className="font-bold text-foreground font-mono">
              {patientsResponse?.pagination?.total || 0}
            </span>
          </div>
        </div>

        {/* Patients Table */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="py-4 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Daftar Pasien Terdaftar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. RM</TableHead>
                  <TableHead>Nama Pasien</TableHead>
                  <TableHead>Kelamin / Umur</TableHead>
                  <TableHead>No. Identitas (NIK)</TableHead>
                  <TableHead>No. Telepon / HP</TableHead>
                  <TableHead>Alamat Domisili</TableHead>
                  <TableHead>Penjamin</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span>Memuat data pasien...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : patientsResponse?.items?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {searchQuery
                        ? `Tidak ada pasien yang cocok dengan "${searchQuery}"`
                        : 'Belum ada data pasien terdaftar. Klik "+ Pasien Baru" untuk mendaftarkan.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  patientsResponse?.items?.map((p) => {
                    const age = calculateAge(p.birthDate);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-bold text-xs text-primary">
                          {p.medicalRecordNumber}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-sm leading-tight text-foreground">{p.name}</p>
                          {p.allergiesNotes && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded mt-1">
                              <AlertTriangle className="w-3 h-3" />
                              Alergi: {p.allergiesNotes}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-medium">{p.gender}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {age.years} Thn {age.months} Bln {age.days} Hr
                          </p>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.identityNumber || '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{p.phone || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {p.address || (p.kabupatenName ? `${p.kecamatanName || ''}, ${p.kabupatenName}` : '—')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              p.insuranceType === 'BPJS'
                                ? 'bg-green-500/15 text-green-700 font-semibold text-[11px]'
                                : p.insuranceType === 'ASURANSI'
                                ? 'bg-purple-500/15 text-purple-700 font-semibold text-[11px]'
                                : 'text-[11px]'
                            }
                          >
                            {p.insuranceType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Lihat Detail RME"
                              onClick={() => setSelectedPatient(p)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Ubah Data Pasien"
                              onClick={() => openEditForm(p)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              title="Nonaktifkan Pasien"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Yakin ingin menonaktifkan data pasien ${p.name} (RM: ${p.medicalRecordNumber})?`
                                  )
                                ) {
                                  deletePatientMutation.mutate(p.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination Bar */}
        {patientsResponse?.pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground py-2">
            <span>
              Halaman {patientsResponse.pagination.page} dari {patientsResponse.pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= patientsResponse.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: DETAIL REKAM MEDIS PASIEN (INSPECTION ONLY) ───────────── */}
      {selectedPatient && (
        <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
          <DialogClose onClick={() => setSelectedPatient(null)} />
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {selectedPatient.medicalRecordNumber}
                </span>
                <DialogTitle className="text-xl mt-1">{selectedPatient.name}</DialogTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {selectedPatient.insuranceType}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 my-2 text-sm overflow-y-auto max-h-[70vh]">
            {/* Alergi Alert */}
            {selectedPatient.allergiesNotes && (
              <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold text-xs uppercase tracking-wide">Peringatan Alergi</p>
                  <p className="text-xs">{selectedPatient.allergiesNotes}</p>
                </div>
              </div>
            )}

            {/* Demografi Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-border bg-muted/20">
              <div>
                <p className="text-[11px] text-muted-foreground">Jenis Kelamin</p>
                <p className="font-semibold">{selectedPatient.gender}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Tanggal Lahir / Umur</p>
                <p className="font-semibold text-xs">
                  {selectedPatient.birthDate ? String(selectedPatient.birthDate).substring(0, 10) : '—'}
                </p>
                {selectedPatient.birthDate && (
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {calculateAge(selectedPatient.birthDate).years} Thn{' '}
                    {calculateAge(selectedPatient.birthDate).months} Bln{' '}
                    {calculateAge(selectedPatient.birthDate).days} Hr
                  </p>
                )}
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Golongan Darah</p>
                <p className="font-semibold font-mono">
                  {selectedPatient.bloodType || '-'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">No. Identitas ({selectedPatient.identityType})</p>
                <p className="font-semibold font-mono">{selectedPatient.identityNumber || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">No. Telepon</p>
                <p className="font-semibold font-mono">{selectedPatient.phone || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Agama / Suku</p>
                <p className="font-semibold">
                  {selectedPatient.religion} / {selectedPatient.ethnicity}
                </p>
              </div>
            </div>

            {/* Alamat & Wilayah */}
            <div className="p-4 rounded-xl border border-border bg-muted/20">
              <p className="text-[11px] text-muted-foreground mb-1">Alamat Lengkap KTP</p>
              <p className="font-medium text-foreground">{selectedPatient.address || '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {[
                  selectedPatient.kelurahanName,
                  selectedPatient.kecamatanName,
                  selectedPatient.kabupatenName,
                  selectedPatient.provinsiName,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Wilayah belum dipilih'}
              </p>
            </div>

            {/* Orang Tua / Penanggung Jawab */}
            <div className="p-4 rounded-xl border border-border bg-muted/20">
              <p className="text-[11px] text-muted-foreground mb-1">Nama Orang Tua / Penanggung Jawab</p>
              <p className="font-semibold">{selectedPatient.parentName || '—'}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const target = selectedPatient;
                setSelectedPatient(null);
                openEditForm(target);
              }}
              className="gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Ubah Data
            </Button>
            <Button onClick={() => setSelectedPatient(null)}>Tutup</Button>
          </DialogFooter>
        </Dialog>
      )}
    </AppLayout>
  );
}
