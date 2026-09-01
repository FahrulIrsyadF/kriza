import React, { useState, useRef, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList, Plus, X, Search, RefreshCw, Calendar, User, Stethoscope,
  CreditCard, AlertTriangle, CheckCircle2, Clock, UserCheck, ChevronRight,
  Info, Building, Phone, Wifi, FileText, Eye, Edit2, Ban, Activity,
  ArrowRight, Tag, UserPlus,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { QuickPatientDialog } from './QuickPatientDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import apiClient from '@/lib/api-client';

// ─── Constants ──────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'UMUM', name: 'Umum (Biaya Sendiri)' },
  { id: 'BPJS', name: 'BPJS Kesehatan' },
  { id: 'ASURANSI_SWASTA', name: 'Asuransi Swasta' },
  { id: 'GRATIS', name: 'Gratis / Subsidi' },
  { id: 'CORPORATE', name: 'Corporate / Perusahaan' },
];

const REGISTRATION_SOURCES = [
  { id: 'LANGSUNG', name: 'Langsung (Walk-In)' },
  { id: 'TELEPON', name: 'Via Telepon' },
  { id: 'MJKN', name: 'Mobile JKN (BPJS)' },
  { id: 'ONLINE_OWN', name: 'Booking Online Klinik' },
];

const STATUS_CONFIG = {
  MENUNGGU:   { label: 'Menunggu',   color: 'bg-amber-500/15 text-amber-700 border-amber-200' },
  DIPANGGIL:  { label: 'Dipanggil', color: 'bg-blue-500/15 text-blue-700 border-blue-200' },
  DIPERIKSA:  { label: 'Diperiksa', color: 'bg-purple-500/15 text-purple-700 border-purple-200' },
  SELESAI:    { label: 'Selesai',   color: 'bg-green-500/15 text-green-700 border-green-200' },
  BATAL:      { label: 'Batal',     color: 'bg-red-500/15 text-red-700 border-red-200' },
  LEWAT:      { label: 'Lewat',     color: 'bg-slate-500/15 text-slate-700 border-slate-200' },
  RUJUK_KELUAR: { label: 'Rujuk',   color: 'bg-orange-500/15 text-orange-700 border-orange-200' },
};

const SOURCE_CONFIG = {
  LANGSUNG:    { label: 'Walk-In',   icon: User,  color: 'text-foreground' },
  TELEPON:     { label: 'Telepon',   icon: Phone, color: 'text-blue-600' },
  MJKN:        { label: 'MJKN',     icon: Wifi,  color: 'text-green-600' },
  ONLINE_OWN:  { label: 'Online',   icon: Wifi,  color: 'text-purple-600' },
};

// ─── Age Formatter ─────────────────────────────────────────────────────────────
function calculateAge(birthDate) {
  if (!birthDate) return { years: 0, months: 0, days: 0 };
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    months -= 1;
  }
  if (months < 0) { years -= 1; months += 12; }
  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

function formatAge(birthDate) {
  const { years, months, days } = calculateAge(birthDate);
  if (years > 0) return `${years} Thn ${months} Bln`;
  if (months > 0) return `${months} Bln ${days} Hr`;
  return `${days} Hr`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// ─── Default Form State ────────────────────────────────────────────────────────
const EMPTY_FORM = {
  patientId: '',
  polyclinicId: '',
  practitionerId: '',
  registrationDate: new Date().toISOString().substring(0, 10),
  registrationSource: 'LANGSUNG',
  paymentMethod: 'UMUM',
  bpjsCardNumber: '',
  insuranceName: '',
  insurancePolicyNumber: '',
  referralNumber: '',
  referralFrom: '',
  complaint: '',
  notes: '',
  forceRegister: false,
  // MJKN fields
  mjknBookingCode: '',
  mjknAppointmentDate: '',
  mjknAppointmentTime: '',
  mjknQueueNumber: '',
};

// ─── Ticket Slip Component ─────────────────────────────────────────────────────
function RegistrationTicket({ registration, onClose }) {
  if (!registration) return null;
  const { queue, polyclinicName, registrationNumber, visitType, paymentMethod,
    registrationSource, patientName, patientMrn, patientBirthDate, complaint } = registration;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden text-gray-900 font-sans">
        {/* Header slip */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-white p-4 text-center">
          <p className="text-xs font-medium opacity-80">KRIZA SIMRS — Klinik Pratama</p>
          <h2 className="text-3xl font-extrabold font-mono tracking-wider mt-1">
            {queue?.queueNumber || '—'}
          </h2>
          <p className="text-xs mt-1 opacity-80">{polyclinicName}</p>
        </div>

        {/* Body */}
        <div className="p-4 space-y-2 text-xs">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">No. Reg</span>
            <span className="font-mono font-bold">{registrationNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Nama Pasien</span>
            <span className="font-semibold text-right max-w-[150px] leading-tight">{patientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">No. RM</span>
            <span className="font-mono">{patientMrn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Jenis Kunjungan</span>
            <span className={`font-bold ${visitType === 'BARU' ? 'text-blue-600' : 'text-gray-700'}`}>
              {visitType === 'BARU' ? '★ PASIEN BARU' : 'Pasien Lama'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Penjamin</span>
            <span className="font-medium">{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.name?.split(' ')[0] || paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Sumber</span>
            <span>{SOURCE_CONFIG[registrationSource]?.label || registrationSource}</span>
          </div>
          {complaint && (
            <div className="border-t pt-2">
              <p className="text-gray-500 mb-1">Keluhan</p>
              <p className="italic text-gray-700 leading-tight">{complaint}</p>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between text-gray-400">
            <span>Tanggal</span>
            <span>{formatDate(new Date())}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Jam</span>
            <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="p-4 border-t">
          <p className="text-center text-[10px] text-gray-400 mb-3">
            Harap menunggu pemanggilan nomor antrian Anda
          </p>
          <Button onClick={onClose} className="w-full" size="sm">
            Tutup & Kembali
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function RegistrationsPage() {
  const queryClient = useQueryClient();
  const formCardRef = useRef(null);
  const today = new Date().toISOString().substring(0, 10);

  // ─── UI State ────────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [filterDate, setFilterDate] = useState(today);
  const [filterPoli, setFilterPoli] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReg, setSelectedReg] = useState(null);
  const [showTicket, setShowTicket] = useState(null);
  const [showQuickPatientDialog, setShowQuickPatientDialog] = useState(false);
  const [quickPatientInitialName, setQuickPatientInitialName] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const debouncedPatientSearch = useDebounce(patientSearch, 400);
  const [quotaInfo, setQuotaInfo] = useState(null); // { current, quota }
  const [activeTab, setActiveTab] = useState('daftar'); // 'daftar' | 'antrian'

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data: registrationsData, isLoading: loadingReg } = useQuery({
    queryKey: ['registrations', filterDate, filterPoli, filterStatus, searchQuery],
    queryFn: () => apiClient.get('/registrations', {
      params: { date: filterDate, polyclinicId: filterPoli || undefined, status: filterStatus || undefined, search: searchQuery || undefined, limit: 100 },
    }).then(r => r.data.data),
    staleTime: 30000,
    refetchInterval: 60000, // auto-refresh tiap menit
  });

  const { data: polyclinicsData } = useQuery({
    queryKey: ['polyclinics-active'],
    queryFn: () => apiClient.get('/master/polyclinics', { params: { limit: 50 } }).then(r => r.data.data),
    staleTime: 300000,
  });

  const { data: practitionersData } = useQuery({
    queryKey: ['practitioners-for-poli', formData.polyclinicId],
    queryFn: () => apiClient.get('/master/practitioners', { params: { limit: 50 } }).then(r => r.data.data),
    enabled: !!formData.polyclinicId,
    staleTime: 300000,
  });

  // Pencarian Pasien (debounced minimal 2 karakter)
  const { data: patientSearchData, isFetching: searchingPatient } = useQuery({
    queryKey: ['patient-search-reg', debouncedPatientSearch],
    queryFn: () => apiClient.get('/patients', { params: { search: debouncedPatientSearch, limit: 20 } }).then(r => r.data.data),
    enabled: debouncedPatientSearch.trim().length >= 2,
    staleTime: 10000,
  });

  // Query detail pasien yang sedang dipilih secara langsung
  const { data: directPatientData } = useQuery({
    queryKey: ['patient-direct-reg', formData.patientId],
    queryFn: () => apiClient.get(`/patients/${formData.patientId}`).then(r => r.data.data),
    enabled: !!formData.patientId,
    staleTime: 60000,
  });

  // Antrian Hari Ini
  const { data: todayQueuesData, isLoading: loadingQueues, refetch: refetchQueues } = useQuery({
    queryKey: ['today-queues', filterDate, filterPoli],
    queryFn: () => apiClient.get('/queues/today', {
      params: { polyclinicId: filterPoli || undefined, date: filterDate },
    }).then(r => r.data.data),
    staleTime: 15000,
    refetchInterval: 30000,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data) => apiClient.post('/registrations', data).then(r => r.data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['today-queues'] });
      setShowTicket(res.data);
      setShowForm(false);
      setFormData({ ...EMPTY_FORM });
      setPatientSearch('');
    },
  });

  const queueActionMutation = useMutation({
    mutationFn: ({ id, action, counterName }) =>
      apiClient.put(`/registrations/${id}/queue-action`, { action, counterName }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['today-queues'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      apiClient.delete(`/registrations/${id}`, { data: { cancellationReason: reason } }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['today-queues'] });
    },
  });

  // ─── Derived Data ─────────────────────────────────────────────────────────────
  const polyclinicOptions = (polyclinicsData?.items || []).map(p => ({ id: p.id, name: p.name }));
  const practitionerOptions = (practitionersData?.items || []).map(p => ({
    id: p.id, name: `${p.title ? p.title + ' ' : ''}${p.name}`,
  }));
  const patientOptions = (patientSearchData?.items || []).map(p => ({
    id: p.id,
    name: `${p.name} — RM: ${p.medicalRecordNumber}${p.identityNumber ? ` / NIK: ${p.identityNumber}` : ''}`,
    raw: p,
  }));

  const selectedPatientData = patientSearchData?.items?.find(p => p.id === formData.patientId);
  const activePatient = selectedPatientData || directPatientData;
  const registrations = registrationsData?.items || [];
  const todayQueues = Array.isArray(todayQueuesData) ? todayQueuesData : [];

  // ─── Summary Stats ────────────────────────────────────────────────────────────
  const stats = {
    total: registrations.length,
    menunggu: registrations.filter(r => r.status === 'MENUNGGU').length,
    diperiksa: registrations.filter(r => r.status === 'DIPERIKSA').length,
    selesai: registrations.filter(r => r.status === 'SELESAI').length,
    batal: registrations.filter(r => r.status === 'BATAL').length,
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleOpenQuickPatient = (name = '') => {
    setQuickPatientInitialName(name);
    setShowQuickPatientDialog(true);
  };

  const handlePatientCreated = (newPatient) => {
    setFormData(prev => ({
      ...prev,
      patientId: newPatient.id,
      paymentMethod: newPatient.insuranceType === 'BPJS' ? 'BPJS' : (newPatient.insuranceType === 'ASURANSI' ? 'ASURANSI_SWASTA' : prev.paymentMethod),
      bpjsCardNumber: newPatient.bpjsNumber || prev.bpjsCardNumber,
    }));
    setPatientSearch(newPatient.name);
  };

  const openForm = () => {
    setFormData({ ...EMPTY_FORM, registrationDate: today });
    setShowForm(true);
    setPatientSearch('');
    setTimeout(() => formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.patientId) { alert('Pilih pasien terlebih dahulu'); return; }
    if (!formData.polyclinicId) { alert('Pilih poliklinik tujuan'); return; }

    const payload = {
      ...formData,
      practitionerId: formData.practitionerId || null,
      bpjsCardNumber: formData.bpjsCardNumber || null,
      insuranceName: formData.insuranceName || null,
      insurancePolicyNumber: formData.insurancePolicyNumber || null,
      referralNumber: formData.referralNumber || null,
      referralFrom: formData.referralFrom || null,
      mjknBookingCode: formData.mjknBookingCode || null,
      mjknAppointmentDate: formData.mjknAppointmentDate || null,
      mjknAppointmentTime: formData.mjknAppointmentTime || null,
      mjknQueueNumber: formData.mjknQueueNumber || null,
    };
    createMutation.mutate(payload);
  };

  // Bila sumber MJKN, secara otomatis set paymentMethod ke BPJS
  useEffect(() => {
    if (formData.registrationSource === 'MJKN' && formData.paymentMethod !== 'BPJS') {
      setFormData(prev => ({ ...prev, paymentMethod: 'BPJS' }));
    }
  }, [formData.registrationSource]);

  const isMJKN = formData.registrationSource === 'MJKN';
  const isBPJS = formData.paymentMethod === 'BPJS';
  const isInsurance = formData.paymentMethod === 'ASURANSI_SWASTA';

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <AppLayout
      title="Pendaftaran & Antrian"
      subtitle={`Registrasi kunjungan pasien rawat jalan — ${new Date(filterDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      actions={
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="h-9 px-3 text-xs rounded-lg border border-input bg-background font-mono"
          />
          <Button onClick={() => { queryClient.invalidateQueries({ queryKey: ['registrations'] }); queryClient.invalidateQueries({ queryKey: ['today-queues'] }); }} variant="outline" size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button onClick={openForm} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Daftarkan Pasien
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* ─── Ticket Slip Overlay ─────────────────────────────────────── */}
        {showTicket && (
          <RegistrationTicket registration={showTicket} onClose={() => setShowTicket(null)} />
        )}

        {/* ─── Stats Summary ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', val: stats.total, color: 'text-foreground', bg: 'bg-muted/50' },
            { label: 'Menunggu', val: stats.menunggu, color: 'text-amber-600', bg: 'bg-amber-500/10' },
            { label: 'Diperiksa', val: stats.diperiksa, color: 'text-purple-600', bg: 'bg-purple-500/10' },
            { label: 'Selesai', val: stats.selesai, color: 'text-green-600', bg: 'bg-green-500/10' },
            { label: 'Batal', val: stats.batal, color: 'text-red-600', bg: 'bg-red-500/10' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl ${s.bg} px-4 py-3 flex flex-col`}>
              <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
              <span className={`text-2xl font-bold font-mono ${s.color}`}>{s.val}</span>
            </div>
          ))}
        </div>

        {/* ─── Form Pendaftaran Baru ────────────────────────────────────── */}
        {showForm && (
          <div ref={formCardRef}>
            <Card className="rounded-2xl border-primary/30 shadow-lg">
              <CardHeader className="pb-3 border-b border-border bg-primary/5 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    Form Pendaftaran Kunjungan Baru
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Error Alert */}
                  {createMutation.isError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2 text-xs text-destructive">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Gagal Mendaftar</p>
                        <p>{createMutation.error?.response?.data?.error?.message || createMutation.error?.message}</p>
                        {createMutation.error?.response?.data?.error?.code === 'DUPLICATE_REGISTRATION' && (
                          <button
                            type="button"
                            className="mt-1 underline font-semibold"
                            onClick={() => setFormData(prev => ({ ...prev, forceRegister: true }))}
                          >
                            Klik di sini untuk mendaftarkan paksa (forceRegister)
                          </button>
                        )}
                        {createMutation.error?.response?.data?.error?.code === 'QUOTA_EXCEEDED' && (
                          <button
                            type="button"
                            className="mt-1 underline font-semibold"
                            onClick={() => setFormData(prev => ({ ...prev, forceRegister: true }))}
                          >
                            Klik untuk mendaftar di luar kuota (forceRegister)
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {formData.forceRegister && (
                    <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-300 text-xs text-orange-700 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Mode Force Register aktif — validasi duplikat & kuota diabaikan
                      <button type="button" className="ml-auto underline" onClick={() => setFormData(prev => ({ ...prev, forceRegister: false }))}>Batalkan</button>
                    </div>
                  )}

                  {/* ── Baris 1: Sumber & Tanggal ────────────────────────── */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Sumber Pendaftaran *</label>
                      <select
                        value={formData.registrationSource}
                        onChange={(e) => setFormData(prev => ({ ...prev, registrationSource: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                      >
                        {REGISTRATION_SOURCES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Tanggal Kunjungan *</label>
                      <Input
                        type="date"
                        value={formData.registrationDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, registrationDate: e.target.value }))}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Metode Pembayaran *</label>
                      <select
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                      >
                        {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* ── MJKN Fields (tampil hanya bila source MJKN) ────────── */}
                  {isMJKN && (
                    <div className="p-4 rounded-xl border border-green-300 bg-green-500/5 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-green-700 mb-2">
                        <Wifi className="w-3.5 h-3.5" /> Data Booking Mobile JKN (MJKN)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold block mb-1">Kode Booking MJKN</label>
                          <Input
                            value={formData.mjknBookingCode}
                            onChange={(e) => setFormData(prev => ({ ...prev, mjknBookingCode: e.target.value }))}
                            placeholder="Kode dari JKN Mobile..."
                            className="text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold block mb-1">Tgl Janji MJKN</label>
                          <Input
                            type="date"
                            value={formData.mjknAppointmentDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, mjknAppointmentDate: e.target.value }))}
                            className="text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold block mb-1">Jam Janji MJKN</label>
                          <Input
                            type="time"
                            value={formData.mjknAppointmentTime}
                            onChange={(e) => setFormData(prev => ({ ...prev, mjknAppointmentTime: e.target.value }))}
                            className="text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold block mb-1">No. Antrian MJKN (dari aplikasi JKN)</label>
                        <Input
                          value={formData.mjknQueueNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, mjknQueueNumber: e.target.value }))}
                          placeholder="Nomor antrian yang sudah diterbitkan MJKN..."
                          className="text-xs font-mono w-48"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Bila diisi, antrian internal akan diberi prefix "MJKN-" di depan nomor ini
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── BPJS / Asuransi Fields ──────────────────────────── */}
                  {(isBPJS || isInsurance) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-border bg-muted/20">
                      <div className="col-span-full text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" /> Detail Penjamin
                      </div>
                      {isBPJS && (
                        <>
                          <div>
                            <label className="text-[11px] font-semibold block mb-1">No. Kartu BPJS</label>
                            <Input
                              value={formData.bpjsCardNumber}
                              onChange={(e) => setFormData(prev => ({ ...prev, bpjsCardNumber: e.target.value }))}
                              placeholder="0000-0000-0000-0000"
                              className="text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold block mb-1">No. Surat Rujukan</label>
                            <Input
                              value={formData.referralNumber}
                              onChange={(e) => setFormData(prev => ({ ...prev, referralNumber: e.target.value }))}
                              placeholder="Nomor rujukan (jika ada)..."
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold block mb-1">Faskes / Dokter Perujuk</label>
                            <Input
                              value={formData.referralFrom}
                              onChange={(e) => setFormData(prev => ({ ...prev, referralFrom: e.target.value }))}
                              placeholder="Nama faskes/puskesmas/dokter..."
                              className="text-xs"
                            />
                          </div>
                        </>
                      )}
                      {isInsurance && (
                        <>
                          <div>
                            <label className="text-[11px] font-semibold block mb-1">Nama Asuransi</label>
                            <Input
                              value={formData.insuranceName}
                              onChange={(e) => setFormData(prev => ({ ...prev, insuranceName: e.target.value }))}
                              placeholder="Allianz, Prudential, dll..."
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold block mb-1">No. Polis Asuransi</label>
                            <Input
                              value={formData.insurancePolicyNumber}
                              onChange={(e) => setFormData(prev => ({ ...prev, insurancePolicyNumber: e.target.value }))}
                              placeholder="Nomor polis..."
                              className="text-xs font-mono"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Baris 2: Pencarian Pasien ─────────────────────────── */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold block">
                        Cari & Pilih Pasien * <span className="text-muted-foreground font-normal">(ketik min. 2 karakter: Nama / No. RM / NIK)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenQuickPatient(patientSearch)}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Pasien Baru
                      </button>
                    </div>

                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        placeholder="Ketik nama pasien, No. RM, atau NIK..."
                        className="pl-9 text-xs"
                      />
                      {searchingPatient && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>

                    {patientSearch.length >= 2 && patientOptions.length > 0 && (
                      <SearchableSelect
                        options={patientOptions}
                        value={formData.patientId}
                        onChange={(val, raw) => setFormData(prev => ({ ...prev, patientId: val }))}
                        placeholder="Pilih pasien dari hasil pencarian..."
                        searchPlaceholder="Filter hasil..."
                        emptyMessage="Pasien tidak ditemukan"
                      />
                    )}

                    {/* Not Found Callout Banner — Muncul jika pasien belum ada di database */}
                    {!searchingPatient && debouncedPatientSearch.trim().length >= 2 && patientOptions.length === 0 && (
                      <div className="mt-2 p-3.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in-0 duration-150">
                        <div className="flex items-center gap-2.5 text-xs text-foreground">
                          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                            <UserPlus className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">Pasien belum terdaftar</p>
                            <p className="text-muted-foreground text-[11px]">
                              Tidak ada data pasien dengan kata kunci <span className="font-mono font-bold text-primary">"{patientSearch}"</span>
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenQuickPatient(patientSearch)}
                          className="gap-1.5 shrink-0 text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" /> Daftarkan Pasien Baru
                        </Button>
                      </div>
                    )}

                    {/* Pasien info card */}
                    {activePatient && (
                      <div className="mt-2 p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {activePatient.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground leading-tight">{activePatient.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            RM: {activePatient.medicalRecordNumber} &bull; {activePatient.gender} &bull; {formatAge(activePatient.birthDate)}
                          </p>
                          {activePatient.allergiesNotes && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="w-3 h-3" />
                              Alergi: {activePatient.allergiesNotes}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">{activePatient.insuranceType}</Badge>
                      </div>
                    )}
                  </div>

                  {/* ── Baris 3: Poli & Dokter ────────────────────────────── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Poliklinik Tujuan *</label>
                      <SearchableSelect
                        options={polyclinicOptions}
                        value={formData.polyclinicId}
                        onChange={(val) => setFormData(prev => ({ ...prev, polyclinicId: val, practitionerId: '' }))}
                        placeholder="Pilih Poliklinik..."
                        searchPlaceholder="Cari poli..."
                        emptyMessage="Poliklinik tidak ditemukan"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold block mb-1">Dokter / Praktisi</label>
                      <SearchableSelect
                        options={practitionerOptions}
                        value={formData.practitionerId}
                        onChange={(val) => setFormData(prev => ({ ...prev, practitionerId: val }))}
                        placeholder={formData.polyclinicId ? 'Pilih Dokter...' : 'Pilih Poli dulu'}
                        searchPlaceholder="Cari dokter..."
                        disabled={!formData.polyclinicId}
                        emptyMessage="Dokter tidak ditemukan"
                      />
                    </div>
                  </div>

                  {/* ── Keluhan ───────────────────────────────────────────── */}
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Keluhan Utama</label>
                    <textarea
                      value={formData.complaint}
                      onChange={(e) => setFormData(prev => ({ ...prev, complaint: e.target.value }))}
                      rows={3}
                      placeholder="Tuliskan keluhan utama pasien secara singkat..."
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* ── Catatan Loket ─────────────────────────────────────── */}
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Catatan Petugas Loket <span className="text-muted-foreground font-normal">(opsional)</span></label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Catatan tambahan dari petugas loket..."
                      className="text-xs"
                    />
                  </div>
                </form>
              </CardContent>
              <CardFooter className="border-t pt-4 flex items-center justify-between gap-3">
                <Button variant="outline" onClick={() => setShowForm(false)} size="sm">Batal</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || !formData.patientId || !formData.polyclinicId}
                  size="sm"
                  className="gap-2"
                >
                  {createMutation.isPending ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mendaftarkan...</>
                  ) : (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Daftarkan & Cetak Tiket Antrian</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* ─── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-border">
          {[
            { id: 'daftar', label: 'Daftar Kunjungan', count: stats.total },
            { id: 'antrian', label: 'Monitor Antrian', count: todayQueues.filter(q => q.status === 'MENUNGGU').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Tab: Daftar Kunjungan ────────────────────────────────────── */}
        {activeTab === 'daftar' && (
          <Card className="rounded-2xl overflow-hidden">
            {/* Filters */}
            <CardHeader className="py-3 border-b border-border bg-muted/20">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari Nama / No. RM / No. Reg..."
                    className="pl-9 text-xs h-9"
                  />
                </div>
                <select
                  value={filterPoli}
                  onChange={(e) => setFilterPoli(e.target.value)}
                  className="h-9 px-3 text-xs rounded-lg border border-input bg-background min-w-36"
                >
                  <option value="">Semua Poli</option>
                  {polyclinicOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-9 px-3 text-xs rounded-lg border border-input bg-background min-w-32"
                >
                  <option value="">Semua Status</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Reg / Antrian</TableHead>
                    <TableHead>Pasien</TableHead>
                    <TableHead>Poli / Dokter</TableHead>
                    <TableHead>Penjamin</TableHead>
                    <TableHead>Sumber</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingReg ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Memuat data kunjungan...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : registrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                        Belum ada kunjungan terdaftar pada {formatDate(filterDate)}
                      </TableCell>
                    </TableRow>
                  ) : (
                    registrations.map((reg) => {
                      const sc = STATUS_CONFIG[reg.status] || { label: reg.status, color: '' };
                      const srcCfg = SOURCE_CONFIG[reg.registrationSource] || { label: reg.registrationSource, icon: Tag, color: '' };
                      const SrcIcon = srcCfg.icon;
                      return (
                        <TableRow key={reg.id}>
                          <TableCell>
                            <p className="font-mono text-xs font-bold text-primary">{reg.registrationNumber}</p>
                            {reg.queue && (
                              <p className="font-mono text-sm font-extrabold text-foreground mt-0.5">{reg.queue.queueNumber}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-sm leading-tight">{reg.patientName}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              RM: {reg.patientMrn} &bull; {formatAge(reg.patientBirthDate)}
                            </p>
                            {reg.patientAllergiesNotes && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded mt-1">
                                <AlertTriangle className="w-2.5 h-2.5" /> Alergi
                              </span>
                            )}
                            <Badge variant="outline" className={`text-[10px] mt-1 ${reg.visitType === 'BARU' ? 'border-blue-400 text-blue-600' : ''}`}>
                              {reg.visitType === 'BARU' ? '★ BARU' : 'LAMA'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs font-semibold">{reg.polyclinicName}</p>
                            {reg.practitionerName && (
                              <p className="text-[11px] text-muted-foreground">
                                {reg.practitionerTitle ? `${reg.practitionerTitle} ` : ''}{reg.practitionerName}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-xs font-medium">{PAYMENT_METHODS.find(m => m.id === reg.paymentMethod)?.name?.split(' ')[0] || reg.paymentMethod}</p>
                            {reg.mjknBookingCode && (
                              <p className="text-[10px] text-green-600 font-mono">{reg.mjknBookingCode}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`flex items-center gap-1 text-[11px] font-medium ${srcCfg.color}`}>
                              <SrcIcon className="w-3 h-3" />{srcCfg.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sc.color}`}>
                              {sc.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Aksi Antrian */}
                              {reg.status === 'MENUNGGU' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="Panggil Antrian"
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50 text-[11px] h-7 px-2"
                                  onClick={() => queueActionMutation.mutate({ id: reg.id, action: 'PANGGIL' })}
                                  disabled={queueActionMutation.isPending}
                                >
                                  Panggil
                                </Button>
                              )}
                              {reg.status === 'DIPANGGIL' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="Mulai Pemeriksaan"
                                  className="text-purple-600 border-purple-300 hover:bg-purple-50 text-[11px] h-7 px-2"
                                  onClick={() => queueActionMutation.mutate({ id: reg.id, action: 'PERIKSA' })}
                                  disabled={queueActionMutation.isPending}
                                >
                                  Periksa
                                </Button>
                              )}
                              {reg.status === 'DIPERIKSA' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="Selesai Pemeriksaan"
                                  className="text-green-600 border-green-300 hover:bg-green-50 text-[11px] h-7 px-2"
                                  onClick={() => queueActionMutation.mutate({ id: reg.id, action: 'SELESAI' })}
                                  disabled={queueActionMutation.isPending}
                                >
                                  Selesai
                                </Button>
                              )}
                              {/* Detail */}
                              <Button variant="ghost" size="sm" title="Lihat Detail" onClick={() => setSelectedReg(reg)}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              {/* Batal */}
                              {!['SELESAI', 'BATAL'].includes(reg.status) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Batalkan"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    const reason = prompt('Alasan pembatalan (opsional):');
                                    if (reason !== null) {
                                      cancelMutation.mutate({ id: reg.id, reason });
                                    }
                                  }}
                                  disabled={cancelMutation.isPending}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </Button>
                              )}
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
        )}

        {/* ─── Tab: Monitor Antrian ─────────────────────────────────────── */}
        {activeTab === 'antrian' && (
          <div className="space-y-4">
            {/* Filter Poli untuk Monitor */}
            <div className="flex items-center gap-3">
              <select
                value={filterPoli}
                onChange={(e) => setFilterPoli(e.target.value)}
                className="h-9 px-3 text-xs rounded-lg border border-input bg-background min-w-40"
              >
                <option value="">Semua Poli</option>
                {polyclinicOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={() => refetchQueues()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Antrian
              </Button>
            </div>

            {loadingQueues ? (
              <div className="flex justify-center items-center py-12 text-muted-foreground">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                Memuat antrian...
              </div>
            ) : todayQueues.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Tidak ada antrian aktif hari ini
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayQueues.map((q) => {
                  const sc = STATUS_CONFIG[q.status] || { label: q.status, color: '' };
                  const srcCfg = SOURCE_CONFIG[q.queueSource] || { label: q.queueSource, icon: Tag, color: '' };
                  const SrcIcon = srcCfg.icon;
                  return (
                    <Card key={q.queueId} className={`rounded-xl transition-all ${q.status === 'DIPANGGIL' ? 'ring-2 ring-blue-400 shadow-blue-100 shadow-md' : ''}`}>
                      <CardContent className="pt-4 pb-3 px-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-extrabold font-mono text-foreground">{q.queueNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sc.color}`}>{sc.label}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{q.patientName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">RM: {q.patientMrn} &bull; {formatAge(q.patientBirthDate)}</p>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Building className="w-3 h-3" /> {q.polyclinicName}
                          {q.practitionerName && <> &bull; {q.practitionerTitle} {q.practitionerName}</>}
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className={`flex items-center gap-1 ${srcCfg.color}`}><SrcIcon className="w-3 h-3" />{srcCfg.label}</span>
                          {q.mjknBookingCode && <span className="text-green-600 font-mono">{q.mjknBookingCode}</span>}
                        </div>
                        {q.calledAt && (
                          <p className="text-[10px] text-muted-foreground">
                            Dipanggil {q.calledCounter}x — terakhir {formatTime(q.calledAt)}
                          </p>
                        )}
                        {/* Antrian Actions */}
                        <div className="flex gap-1.5 pt-1 flex-wrap">
                          {q.status === 'MENUNGGU' && (
                            <Button size="sm" className="text-[11px] h-7 bg-blue-600 hover:bg-blue-700 text-white px-3"
                              onClick={() => queueActionMutation.mutate({ id: q.registrationId, action: 'PANGGIL' })}
                              disabled={queueActionMutation.isPending}>
                              Panggil
                            </Button>
                          )}
                          {q.status === 'DIPANGGIL' && (
                            <>
                              <Button size="sm" className="text-[11px] h-7 bg-blue-600 hover:bg-blue-700 text-white px-3"
                                onClick={() => queueActionMutation.mutate({ id: q.registrationId, action: 'PANGGIL_ULANG' })}
                                disabled={queueActionMutation.isPending}>
                                Panggil Ulang
                              </Button>
                              <Button size="sm" className="text-[11px] h-7 bg-purple-600 hover:bg-purple-700 text-white px-3"
                                onClick={() => queueActionMutation.mutate({ id: q.registrationId, action: 'PERIKSA' })}
                                disabled={queueActionMutation.isPending}>
                                Periksa
                              </Button>
                            </>
                          )}
                          {q.status === 'DIPERIKSA' && (
                            <Button size="sm" className="text-[11px] h-7 bg-green-600 hover:bg-green-700 text-white px-3"
                              onClick={() => queueActionMutation.mutate({ id: q.registrationId, action: 'SELESAI' })}
                              disabled={queueActionMutation.isPending}>
                              Selesai
                            </Button>
                          )}
                          {['MENUNGGU', 'DIPANGGIL'].includes(q.status) && (
                            <Button variant="outline" size="sm" className="text-[11px] h-7 px-2 text-slate-600"
                              onClick={() => queueActionMutation.mutate({ id: q.registrationId, action: 'LEWAT' })}
                              disabled={queueActionMutation.isPending}>
                              Lewat
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Modal Detail Registrasi ──────────────────────────────────────── */}
      {selectedReg && (
        <Dialog open={!!selectedReg} onOpenChange={() => setSelectedReg(null)} maxWidth="max-w-2xl">
          <DialogClose onClick={() => setSelectedReg(null)} />
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {selectedReg.registrationNumber}
                </span>
                <DialogTitle className="text-lg mt-1">{selectedReg.patientName}</DialogTitle>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CONFIG[selectedReg.status]?.color || ''}`}>
                {STATUS_CONFIG[selectedReg.status]?.label || selectedReg.status}
              </span>
            </div>
          </DialogHeader>

          <div className="space-y-3 text-sm overflow-y-auto max-h-[65vh]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl border border-border bg-muted/20 text-xs">
              <div><p className="text-muted-foreground mb-0.5">No. Antrian</p><p className="font-mono font-bold text-lg">{selectedReg.queue?.queueNumber || '—'}</p></div>
              <div><p className="text-muted-foreground mb-0.5">Poliklinik</p><p className="font-semibold">{selectedReg.polyclinicName}</p></div>
              <div><p className="text-muted-foreground mb-0.5">Dokter</p><p className="font-semibold">{selectedReg.practitionerTitle} {selectedReg.practitionerName || '—'}</p></div>
              <div><p className="text-muted-foreground mb-0.5">Jenis Kunjungan</p>
                <Badge variant="outline" className={selectedReg.visitType === 'BARU' ? 'border-blue-400 text-blue-600 text-[10px]' : 'text-[10px]'}>
                  {selectedReg.visitType === 'BARU' ? '★ PASIEN BARU' : 'Pasien Lama'}
                </Badge>
              </div>
              <div><p className="text-muted-foreground mb-0.5">Sumber</p><p>{SOURCE_CONFIG[selectedReg.registrationSource]?.label}</p></div>
              <div><p className="text-muted-foreground mb-0.5">Pembayaran</p><p>{PAYMENT_METHODS.find(m => m.id === selectedReg.paymentMethod)?.name || selectedReg.paymentMethod}</p></div>
            </div>

            {selectedReg.registrationSource === 'MJKN' && selectedReg.mjknBookingCode && (
              <div className="p-3 rounded-xl border border-green-300 bg-green-500/5 text-xs">
                <p className="font-semibold text-green-700 flex items-center gap-1 mb-2"><Wifi className="w-3.5 h-3.5" /> Data MJKN</p>
                <div className="grid grid-cols-2 gap-1">
                  <div><span className="text-muted-foreground">Kode Booking:</span> <span className="font-mono font-bold">{selectedReg.mjknBookingCode}</span></div>
                  {selectedReg.mjknQueueNumber && <div><span className="text-muted-foreground">No. Antrian MJKN:</span> <span className="font-mono">{selectedReg.mjknQueueNumber}</span></div>}
                  {selectedReg.mjknAppointmentDate && <div><span className="text-muted-foreground">Tgl Janji:</span> <span>{formatDate(selectedReg.mjknAppointmentDate)}</span></div>}
                  {selectedReg.mjknAppointmentTime && <div><span className="text-muted-foreground">Jam Janji:</span> <span>{selectedReg.mjknAppointmentTime}</span></div>}
                </div>
              </div>
            )}

            {selectedReg.complaint && (
              <div className="p-3 rounded-xl border border-border bg-muted/10 text-xs">
                <p className="text-muted-foreground font-semibold mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Keluhan Utama</p>
                <p>{selectedReg.complaint}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground p-2">
              <div>Terdaftar: {formatTime(selectedReg.createdAt)}</div>
              {selectedReg.queue?.calledAt && <div>Dipanggil: {formatTime(selectedReg.queue.calledAt)}</div>}
              {selectedReg.queue?.servedAt && <div>Mulai Periksa: {formatTime(selectedReg.queue.servedAt)}</div>}
              {selectedReg.queue?.completedAt && <div>Selesai: {formatTime(selectedReg.queue.completedAt)}</div>}
            </div>
          </div>
        </Dialog>
      )}

      {/* ─── MODAL: DAFTAR PASIEN BARU CEPAT (QUICK REGISTRATION) ────────── */}
      <QuickPatientDialog
        isOpen={showQuickPatientDialog}
        onClose={() => setShowQuickPatientDialog(false)}
        initialName={quickPatientInitialName}
        onPatientCreated={handlePatientCreated}
      />
    </AppLayout>
  );
}
