import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus, X, CheckCircle2, AlertTriangle, User, MapPin, ShieldAlert,
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import apiClient from '@/lib/api-client';

const BLOOD_TYPES = ['-', 'A', 'B', 'AB', 'O'];
const GENDERS = ['Laki-laki', 'Perempuan'];
const INSURANCE_TYPES = ['UMUM', 'BPJS', 'ASURANSI'];

function calculateAge(birthDateStr) {
  if (!birthDateStr) return { years: 0, months: 0, days: 0 };
  const birth = new Date(birthDateStr);
  const now = new Date();
  if (isNaN(birth.getTime())) return { years: 0, months: 0, days: 0 };

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    months -= 1;
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

export function QuickPatientDialog({ isOpen, onClose, initialName = '', onPatientCreated }) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    medicalRecordNumber: '',
    name: initialName || '',
    identityType: 'KTP',
    identityNumber: '',
    gender: 'Laki-laki',
    birthPlace: '',
    birthDate: '',
    ageYears: 0,
    ageMonths: 0,
    ageDays: 0,
    bloodType: '-',
    phone: '',
    address: '',
    provinsiId: 12, // Default Jawa Timur
    kabupatenId: '',
    kecamatanId: '',
    kelurahanId: '',
    insuranceType: 'UMUM',
    bpjsNumber: '',
    allergiesNotes: '',
  });

  const [errorMsg, setErrorMsg] = useState('');

  // Update initialName when prop changes
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        name: initialName || prev.name,
      }));
      setErrorMsg('');
    }
  }, [isOpen, initialName]);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: nextMRN } = useQuery({
    queryKey: ['next-mrn'],
    queryFn: () => apiClient.get('/patients/next-mrn').then((r) => r.data.data.nextMedicalRecordNumber),
    enabled: isOpen,
  });

  useEffect(() => {
    if (nextMRN && !formData.medicalRecordNumber) {
      setFormData((prev) => ({ ...prev, medicalRecordNumber: nextMRN }));
    }
  }, [nextMRN, formData.medicalRecordNumber]);

  const { data: provinsiList = [] } = useQuery({
    queryKey: ['wilayah-provinsi'],
    queryFn: () => apiClient.get('/wilayah/provinsi').then((r) => r.data.data),
    enabled: isOpen,
    staleTime: 300000,
  });

  const { data: kabupatenList = [] } = useQuery({
    queryKey: ['wilayah-kabupaten', formData.provinsiId],
    queryFn: () => apiClient.get(`/wilayah/kabupaten/${formData.provinsiId}`).then((r) => r.data.data),
    enabled: !!formData.provinsiId && isOpen,
    staleTime: 300000,
  });

  const { data: kecamatanList = [] } = useQuery({
    queryKey: ['wilayah-kecamatan', formData.kabupatenId],
    queryFn: () => apiClient.get(`/wilayah/kecamatan/${formData.kabupatenId}`).then((r) => r.data.data),
    enabled: !!formData.kabupatenId && isOpen,
    staleTime: 300000,
  });

  const { data: kelurahanList = [] } = useQuery({
    queryKey: ['wilayah-kelurahan', formData.kecamatanId],
    queryFn: () => apiClient.get(`/wilayah/kelurahan/${formData.kecamatanId}`).then((r) => r.data.data),
    enabled: !!formData.kecamatanId && isOpen,
    staleTime: 300000,
  });

  // ─── Age Handlers ─────────────────────────────────────────────────────────
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

  // ─── Mutation ─────────────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/patients', payload).then((r) => r.data.data),
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient-search-reg'] });
      queryClient.invalidateQueries({ queryKey: ['next-mrn'] });
      if (onPatientCreated) {
        onPatientCreated(newPatient);
      }
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Gagal mendaftarkan pasien');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim()) {
      setErrorMsg('Nama pasien wajib diisi');
      return;
    }
    if (!formData.birthDate) {
      setErrorMsg('Tanggal lahir wajib diisi');
      return;
    }

    const payload = {
      ...formData,
      provinsiId: formData.provinsiId ? Number(formData.provinsiId) : null,
      kabupatenId: formData.kabupatenId ? Number(formData.kabupatenId) : null,
      kecamatanId: formData.kecamatanId ? Number(formData.kecamatanId) : null,
      kelurahanId: formData.kelurahanId ? Number(formData.kelurahanId) : null,
    };

    registerMutation.mutate(payload);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogClose onClick={onClose} />
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-foreground">
              Pendaftaran Pasien Baru Cepat
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pasien yang didaftarkan akan otomatis terpilih di loket pendaftaran
            </p>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 my-2 text-xs overflow-y-auto max-h-[75vh] px-1">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gagal Mendaftar</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Section 1: Identitas Dasar */}
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
          <p className="font-bold text-[11px] uppercase tracking-wide text-primary flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Identitas Utama Pasien
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-semibold block mb-1">No. Rekam Medis (Auto)</label>
              <Input
                value={formData.medicalRecordNumber}
                onChange={(e) => setFormData({ ...formData, medicalRecordNumber: e.target.value })}
                placeholder="000001"
                className="font-mono font-bold bg-muted/40 text-xs h-9"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold block mb-1">Nama Lengkap Pasien *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nama sesuai identitas..."
                className="text-xs h-9 font-semibold"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Jenis Kelamin *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full h-9 px-2.5 rounded-lg border border-input bg-background text-xs"
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-semibold block mb-1">NIK (No. KTP)</label>
              <Input
                value={formData.identityNumber}
                onChange={(e) => setFormData({ ...formData, identityNumber: e.target.value })}
                placeholder="16 digit NIK..."
                className="font-mono text-xs h-9"
                maxLength={16}
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Tempat Lahir</label>
              <Input
                value={formData.birthPlace}
                onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                placeholder="Kota kelahiran..."
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Tanggal Lahir *</label>
              <Input
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleBirthDateChange(e.target.value)}
                className="text-xs h-9 font-mono"
                required
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Umur (Thn / Bln / Hr)</label>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    value={formData.ageYears}
                    onChange={(e) => handleAgeYearsChange(e.target.value)}
                    className="w-10 h-9 px-1 text-center rounded-lg border border-input bg-background text-xs font-mono font-bold"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">Th</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    value={formData.ageMonths}
                    readOnly
                    className="w-8 h-9 px-0.5 text-center rounded-lg border border-input bg-muted text-xs font-mono text-muted-foreground"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">Bl</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    value={formData.ageDays}
                    readOnly
                    className="w-8 h-9 px-0.5 text-center rounded-lg border border-input bg-muted text-xs font-mono text-muted-foreground"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">Hr</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Kontak & Penjamin */}
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold block mb-1">No. Telepon / HP *</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0812xxxxxxx"
                className="font-mono text-xs h-9"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Golongan Darah</label>
              <select
                value={formData.bloodType}
                onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                className="w-full h-9 px-2.5 rounded-lg border border-input bg-background text-xs"
              >
                {BLOOD_TYPES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Jenis Penjamin</label>
              <select
                value={formData.insuranceType}
                onChange={(e) => setFormData({ ...formData, insuranceType: e.target.value })}
                className="w-full h-9 px-2.5 rounded-lg border border-input bg-background text-xs font-semibold"
              >
                {INSURANCE_TYPES.map((ins) => (
                  <option key={ins} value={ins}>{ins}</option>
                ))}
              </select>
            </div>
          </div>

          {formData.insuranceType === 'BPJS' && (
            <div>
              <label className="font-semibold block mb-1">No. Kartu BPJS Kesehatan</label>
              <Input
                value={formData.bpjsNumber}
                onChange={(e) => setFormData({ ...formData, bpjsNumber: e.target.value })}
                placeholder="Nomor kartu BPJS..."
                className="font-mono text-xs h-9"
              />
            </div>
          )}
        </div>

        {/* Section 3: Domisili & Wilayah */}
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
          <p className="font-bold text-[11px] uppercase tracking-wide text-primary flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Alamat Domisili & Wilayah
          </p>

          <div>
            <label className="font-semibold block mb-1">Alamat Lengkap</label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Jalan, RT/RW, Dusun..."
              className="text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Provinsi</label>
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
                searchPlaceholder="Ketik provinsi..."
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Kabupaten / Kota</label>
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
                searchPlaceholder="Ketik kab/kota..."
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Kecamatan</label>
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
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Kelurahan / Desa</label>
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
                searchPlaceholder="Ketik kelurahan..."
              />
            </div>
          </div>
        </div>

        {/* Section 4: Alergi (Opsional) */}
        <div>
          <label className="font-semibold block mb-1 flex items-center gap-1 text-amber-700">
            <ShieldAlert className="w-3.5 h-3.5" /> Riwayat Alergi (Obat / Makanan)
          </label>
          <Input
            value={formData.allergiesNotes}
            onChange={(e) => setFormData({ ...formData, allergiesNotes: e.target.value })}
            placeholder="Contoh: Alergi Amoxicillin, Seafood..."
            className="text-xs h-9"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={registerMutation.isPending}
            className="gap-1.5 bg-primary text-primary-foreground font-semibold"
          >
            {registerMutation.isPending ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Simpan & Pilih Pasien
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default QuickPatientDialog;
