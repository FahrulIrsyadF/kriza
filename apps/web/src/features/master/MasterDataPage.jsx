import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Stethoscope,
  Clock,
  Activity,
  Pill,
  Search,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import AppLayout from '@/components/layout/AppLayout';
import PatientsPage from '@/features/patients/PatientsPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

const DAYS_MAP = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
};

export default function MasterDataPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'polyclinics';
  const setActiveTab = (tab) => setSearchParams({ tab });

  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // ─── Modal States ───────────────────────────────────────────────────────────
  const [polyModal, setPolyModal] = useState({ open: false, mode: 'create', data: null });
  const [practitionerModal, setPractitionerModal] = useState({ open: false, mode: 'create', data: null });
  const [procedureModal, setProcedureModal] = useState({ open: false, mode: 'create', data: null });
  const [drugModal, setDrugModal] = useState({ open: false, mode: 'create', data: null });
  const [scheduleModal, setScheduleModal] = useState({ open: false, mode: 'create', data: null });

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: polyclinicsData, isLoading: loadingPolys } = useQuery({
    queryKey: ['polyclinics', searchQuery],
    queryFn: async () => {
      const res = await apiClient.get('/master/polyclinics', { params: { search: searchQuery } });
      return res.data.data.items;
    },
    enabled: activeTab === 'polyclinics' || activeTab === 'practitioners',
  });

  const { data: practitionersData, isLoading: loadingPractitioners } = useQuery({
    queryKey: ['practitioners', searchQuery],
    queryFn: async () => {
      const res = await apiClient.get('/master/practitioners', { params: { search: searchQuery } });
      return res.data.data.items;
    },
    enabled: activeTab === 'practitioners',
  });

  const { data: schedulesData, isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const res = await apiClient.get('/master/schedules');
      return res.data.data;
    },
    enabled: activeTab === 'practitioners',
  });

  const { data: proceduresData, isLoading: loadingProcedures } = useQuery({
    queryKey: ['procedures', searchQuery],
    queryFn: async () => {
      const res = await apiClient.get('/master/procedures', { params: { search: searchQuery } });
      return res.data.data.items;
    },
    enabled: activeTab === 'procedures',
  });

  const { data: drugsData, isLoading: loadingDrugs } = useQuery({
    queryKey: ['drugs', searchQuery],
    queryFn: async () => {
      const res = await apiClient.get('/master/drugs', { params: { search: searchQuery } });
      return res.data.data.items;
    },
    enabled: activeTab === 'drugs',
  });

  const { data: icd10Data, isLoading: loadingIcd10 } = useQuery({
    queryKey: ['icd10', searchQuery],
    queryFn: async () => {
      const res = await apiClient.get('/master/icd10', { params: { q: searchQuery, limit: 30 } });
      return res.data.data;
    },
    enabled: activeTab === 'icd10',
  });

  const { data: drugUnits = [] } = useQuery({
    queryKey: ['drug-units'],
    queryFn: async () => {
      const res = await apiClient.get('/master/drug-units');
      return res.data.data;
    },
  });

  const { data: rateTypes = [] } = useQuery({
    queryKey: ['rate-types'],
    queryFn: async () => {
      const res = await apiClient.get('/master/rate-types');
      return res.data.data;
    },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const polyMutation = useMutation({
    mutationFn: async (payload) => {
      if (polyModal.mode === 'edit') {
        return apiClient.put(`/master/polyclinics/${polyModal.data.id}`, payload);
      }
      return apiClient.post('/master/polyclinics', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polyclinics'] });
      setPolyModal({ open: false, mode: 'create', data: null });
    },
  });

  const deletePolyMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/master/polyclinics/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['polyclinics'] }),
  });

  const practitionerMutation = useMutation({
    mutationFn: async (payload) => {
      if (practitionerModal.mode === 'edit') {
        return apiClient.put(`/master/practitioners/${practitionerModal.data.id}`, payload);
      }
      return apiClient.post('/master/practitioners', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practitioners'] });
      setPractitionerModal({ open: false, mode: 'create', data: null });
    },
  });

  const drugMutation = useMutation({
    mutationFn: async (payload) => {
      if (drugModal.mode === 'edit') {
        return apiClient.put(`/master/drugs/${drugModal.data.id}`, payload);
      }
      return apiClient.post('/master/drugs', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] });
      setDrugModal({ open: false, mode: 'create', data: null });
    },
  });

  const procedureMutation = useMutation({
    mutationFn: async (payload) => {
      if (procedureModal.mode === 'edit') {
        return apiClient.put(`/master/procedures/${procedureModal.data.id}`, payload);
      }
      return apiClient.post('/master/procedures', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      setProcedureModal({ open: false, mode: 'create', data: null });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (payload) => {
      if (scheduleModal.mode === 'edit') {
        return apiClient.put(`/master/schedules/${scheduleModal.data.id}`, payload);
      }
      return apiClient.post('/master/schedules', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setScheduleModal({ open: false, mode: 'create', data: null });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/master/schedules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });


  // ─── Format currency ────────────────────────────────────────────────────────
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <AppLayout
      title="Master Data Klinik"
      subtitle="Kelola unit layanan, dokter, jadwal praktik, tarif tindakan, obat, dan referensi ICD-10"
    >
      <div className="w-full flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('polyclinics'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'polyclinics'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Poliklinik
          </button>

          <button
            onClick={() => { setActiveTab('practitioners'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'practitioners'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Dokter & Jadwal
          </button>

          <button
            onClick={() => { setActiveTab('patients'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'patients'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Users className="w-4 h-4" />
            Data Pasien
          </button>

          <button
            onClick={() => { setActiveTab('procedures'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'procedures'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            Tindakan & Tarif
          </button>

          <button
            onClick={() => { setActiveTab('drugs'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'drugs'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Pill className="w-4 h-4" />
            Katalog Obat
          </button>

          <button
            onClick={() => { setActiveTab('icd10'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'icd10'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Diagnosa ICD-10
          </button>
        </div>

        {/* Action Toolbar (Sembunyikan jika di Tab Pasien karena Pasien memiliki toolbar mandiri) */}
        {activeTab !== 'patients' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Cari ${
                  activeTab === 'polyclinics'
                    ? 'poli...'
                    : activeTab === 'practitioners'
                    ? 'dokter, spesialisasi...'
                    : activeTab === 'procedures'
                    ? 'tindakan / layanan...'
                    : activeTab === 'drugs'
                    ? 'nama obat, generik...'
                    : 'kode atau diagnosa...'
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card"
              />
            </div>

            {activeTab !== 'icd10' && (
              <Button
                onClick={() => {
                  if (activeTab === 'polyclinics') setPolyModal({ open: true, mode: 'create', data: null });
                  if (activeTab === 'practitioners') setPractitionerModal({ open: true, mode: 'create', data: null });
                  if (activeTab === 'procedures') setProcedureModal({ open: true, mode: 'create', data: null });
                  if (activeTab === 'drugs') setDrugModal({ open: true, mode: 'create', data: null });
                }}
                className="w-full sm:w-auto gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah{' '}
                {activeTab === 'polyclinics'
                  ? 'Poliklinik'
                  : activeTab === 'practitioners'
                  ? 'Dokter'
                  : activeTab === 'procedures'
                  ? 'Tindakan'
                  : 'Obat'}
              </Button>
            )}
          </div>
        )}

        {/* TAB 1: Poliklinik */}
        {activeTab === 'polyclinics' && (
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Daftar Poliklinik Aktif
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Poliklinik</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPolys ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Memuat data poliklinik...
                      </TableCell>
                    </TableRow>
                  ) : polyclinicsData?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Belum ada data poliklinik
                      </TableCell>
                    </TableRow>
                  ) : (
                    polyclinicsData?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-semibold text-xs font-mono">{p.code}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-xs truncate">
                          {p.description || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.isActive ? 'success' : 'secondary'}>
                            {p.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPolyModal({ open: true, mode: 'edit', data: p })}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm(`Yakin ingin menonaktifkan ${p.name}?`)) {
                                deletePolyMutation.mutate(p.id);
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: Dokter & Jadwal */}
        {activeTab === 'practitioners' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-primary" />
                    Daftar Dokter & Praktisi Medis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Nama Dokter</TableHead>
                        <TableHead>Spesialisasi</TableHead>
                        <TableHead>No. SIP</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingPractitioners ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Memuat data dokter...
                          </TableCell>
                        </TableRow>
                      ) : practitionersData?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Belum ada data dokter
                          </TableCell>
                        </TableRow>
                      ) : (
                        practitionersData?.map((pr) => (
                          <TableRow key={pr.id}>
                            <TableCell className="font-mono text-xs">{pr.code}</TableCell>
                            <TableCell className="font-medium">{pr.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-primary/5 text-primary text-xs">
                                {pr.specialization}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">{pr.sip || '—'}</TableCell>
                            <TableCell>
                              <Badge variant={pr.isActive ? 'success' : 'secondary'}>
                                {pr.isActive ? 'Aktif' : 'Nonaktif'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPractitionerModal({ open: true, mode: 'edit', data: pr })}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Jadwal Praktik List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="py-3.5 px-4 flex flex-row items-center justify-between border-b border-border/80 bg-muted/20">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Jadwal Praktik Dokter
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() =>
                      setScheduleModal({
                        open: true,
                        mode: 'create',
                        data: {
                          practitionerId: practitionersData?.[0]?.id || '',
                          polyclinicId: polyclinicsData?.[0]?.id || '',
                          dayOfWeek: 1,
                          startTime: '08:00',
                          endTime: '12:00',
                          quota: 30,
                          isActive: true,
                        },
                      })
                    }
                    className="h-8 px-3 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                  {loadingSchedules ? (
                    <p className="text-sm text-muted-foreground">Memuat jadwal...</p>
                  ) : schedulesData?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs space-y-2">
                      <Clock className="w-8 h-8 mx-auto opacity-30 text-purple-600" />
                      <p>Belum ada jadwal praktik dokter</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setScheduleModal({
                            open: true,
                            mode: 'create',
                            data: {
                              practitionerId: practitionersData?.[0]?.id || '',
                              polyclinicId: polyclinicsData?.[0]?.id || '',
                              dayOfWeek: 1,
                              startTime: '08:00',
                              endTime: '12:00',
                              quota: 30,
                              isActive: true,
                            },
                          })
                        }
                        className="gap-1.5 text-xs h-8 px-3"
                      >
                        <Plus className="w-3.5 h-3.5" /> Buat Jadwal Pertama
                      </Button>
                    </div>
                  ) : (
                    schedulesData?.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl border border-border bg-card hover:border-border/80 transition-all flex flex-col gap-1.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-purple-700 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                            {DAYS_MAP[s.dayOfWeek]}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-mono font-semibold bg-muted px-1.5 py-0.5 rounded border border-border">
                              {s.startTime} - {s.endTime}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => setScheduleModal({ open: true, mode: 'edit', data: s })}
                              title="Ubah Jadwal"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Hapus jadwal praktik ${s.practitionerName} hari ${DAYS_MAP[s.dayOfWeek]}?`
                                  )
                                ) {
                                  deleteScheduleMutation.mutate(s.id);
                                }
                              }}
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-foreground">{s.practitionerName}</p>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                          <span className="font-medium text-foreground">{s.polyclinicName}</span>
                          <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                            Kuota: <strong className="text-foreground">{s.quota}</strong>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2B: Data Pasien (Terintegrasi ke Master Data) */}
        {activeTab === 'patients' && (
          <PatientsPage embedded={true} />
        )}

        {/* TAB 3: Tindakan & Tarif */}
        {activeTab === 'procedures' && (
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Daftar Tindakan & Tarif Layanan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Tindakan</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Poli</TableHead>
                    <TableHead>Tarif Umum</TableHead>
                    <TableHead>Tarif BPJS</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingProcedures ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Memuat data tindakan...
                      </TableCell>
                    </TableRow>
                  ) : proceduresData?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Belum ada data tindakan
                      </TableCell>
                    </TableRow>
                  ) : (
                    proceduresData?.map((proc) => {
                      const tarifUmum = proc.rates?.find((r) => r.rateTypeCode === 'UMUM')?.tariff || 0;
                      const tarifBpjs = proc.rates?.find((r) => r.rateTypeCode === 'BPJS')?.tariff || 0;
                      return (
                        <TableRow key={proc.id}>
                          <TableCell className="font-mono text-xs">{proc.code}</TableCell>
                          <TableCell className="font-medium">{proc.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{proc.category}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{proc.polyclinicName || 'Semua Poli'}</TableCell>
                          <TableCell className="font-semibold text-sm">{formatRupiah(tarifUmum)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {Number(tarifBpjs) === 0 ? (
                              <Badge variant="success" className="text-[10px]">
                                Ditanggung
                              </Badge>
                            ) : (
                              formatRupiah(tarifBpjs)
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setProcedureModal({ open: true, mode: 'edit', data: proc })}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
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

        {/* TAB 4: Katalog Obat */}
        {activeTab === 'drugs' && (
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="w-4 h-4 text-primary" />
                Katalog Obat & Farmasi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Obat</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Harga Beli</TableHead>
                    <TableHead>Harga Jual</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDrugs ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Memuat data obat...
                      </TableCell>
                    </TableRow>
                  ) : drugsData?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Belum ada data obat
                      </TableCell>
                    </TableRow>
                  ) : (
                    drugsData?.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.code}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm leading-snug">{d.name}</p>
                          {d.genericName && <p className="text-xs text-muted-foreground italic">{d.genericName}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{d.category}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">{d.unitCode || 'PCS'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatRupiah(d.basePrice)}</TableCell>
                        <TableCell className="text-sm font-semibold text-primary">{formatRupiah(d.sellingPrice)}</TableCell>
                        <TableCell>
                          <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${
                            d.currentStock <= d.minStock ? 'bg-destructive/15 text-destructive' : 'bg-green-500/15 text-green-700'
                          }`}>
                            {d.currentStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDrugModal({ open: true, mode: 'edit', data: d })}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* TAB 5: Diagnosa ICD-10 */}
        {activeTab === 'icd10' && (
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Standar Diagnosa Medis (ICD-10)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Kode ICD-10</TableHead>
                    <TableHead>Diagnosa (Bahasa Indonesia)</TableHead>
                    <TableHead>Deskripsi Standar (English)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingIcd10 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Mencari referensi ICD-10...
                      </TableCell>
                    </TableRow>
                  ) : icd10Data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Tidak ditemukan kode ICD-10 yang cocok
                      </TableCell>
                    </TableRow>
                  ) : (
                    icd10Data?.map((icd) => (
                      <TableRow key={icd.id}>
                        <TableCell className="font-mono font-bold text-primary">{icd.code}</TableCell>
                        <TableCell className="font-medium text-foreground">{icd.nameId || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs italic">{icd.nameEn}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── MODAL: POLIKLINIK ────────────────────────────────────────────── */}
      <Dialog open={polyModal.open} onOpenChange={(open) => setPolyModal({ ...polyModal, open })}>
        <DialogClose onClick={() => setPolyModal({ ...polyModal, open: false })} />
        <DialogHeader>
          <DialogTitle>{polyModal.mode === 'edit' ? 'Ubah Poliklinik' : 'Tambah Poliklinik Baru'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            polyMutation.mutate({
              code: formData.get('code'),
              name: formData.get('name'),
              description: formData.get('description'),
              isActive: formData.get('isActive') === 'on',
            });
          }}
          className="space-y-4 my-2"
        >
          <div>
            <label className="text-xs font-semibold block mb-1">Kode Poliklinik</label>
            <Input name="code" defaultValue={polyModal.data?.code || ''} placeholder="POLI-CONTOH" required uppercase />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Nama Poliklinik</label>
            <Input name="name" defaultValue={polyModal.data?.name || ''} placeholder="Poli Kebidanan" required />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Deskripsi</label>
            <Input name="description" defaultValue={polyModal.data?.description || ''} placeholder="Pelayanan..." />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="polyActive"
              name="isActive"
              defaultChecked={polyModal.data ? polyModal.data.isActive : true}
              className="rounded"
            />
            <label htmlFor="polyActive" className="text-sm">Poliklinik Aktif</label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPolyModal({ ...polyModal, open: false })}>
              Batal
            </Button>
            <Button type="submit" disabled={polyMutation.isPending}>
              {polyMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ─── MODAL: DOKTER ────────────────────────────────────────────────── */}
      <Dialog open={practitionerModal.open} onOpenChange={(open) => setPractitionerModal({ ...practitionerModal, open })}>
        <DialogClose onClick={() => setPractitionerModal({ ...practitionerModal, open: false })} />
        <DialogHeader>
          <DialogTitle>{practitionerModal.mode === 'edit' ? 'Ubah Tenaga Medis' : 'Tambah Tenaga Medis / Dokter'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            practitionerMutation.mutate({
              code: formData.get('code'),
              name: formData.get('name'),
              title: formData.get('title'),
              sip: formData.get('sip'),
              specialization: formData.get('specialization'),
              phone: formData.get('phone'),
            });
          }}
          className="space-y-3 my-2"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Kode</label>
              <Input name="code" defaultValue={practitionerModal.data?.code || ''} placeholder="DR-004" required />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Gelar (dr./drg./dll)</label>
              <Input name="title" defaultValue={practitionerModal.data?.title || 'dr.'} placeholder="dr." />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Nama Lengkap</label>
            <Input name="name" defaultValue={practitionerModal.data?.name || ''} placeholder="dr. Budi Santoso" required />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Spesialisasi</label>
            <Input name="specialization" defaultValue={practitionerModal.data?.specialization || 'Umum'} required />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Nomor SIP</label>
            <Input name="sip" defaultValue={practitionerModal.data?.sip || ''} placeholder="503/SIP/..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPractitionerModal({ ...practitionerModal, open: false })}>
              Batal
            </Button>
            <Button type="submit" disabled={practitionerMutation.isPending}>
              {practitionerMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ─── MODAL: OBAT ─────────────────────────────────────────────────── */}
      <Dialog open={drugModal.open} onOpenChange={(open) => setDrugModal({ ...drugModal, open })}>
        <DialogClose onClick={() => setDrugModal({ ...drugModal, open: false })} />
        <DialogHeader>
          <DialogTitle>{drugModal.mode === 'edit' ? 'Ubah Data Obat' : 'Tambah Obat Baru'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            drugMutation.mutate({
              code: formData.get('code'),
              name: formData.get('name'),
              genericName: formData.get('genericName'),
              category: formData.get('category'),
              unitId: formData.get('unitId') || null,
              basePrice: Number(formData.get('basePrice')),
              sellingPrice: Number(formData.get('sellingPrice')),
              currentStock: Number(formData.get('currentStock')),
              minStock: Number(formData.get('minStock')),
            });
          }}
          className="space-y-3 my-2"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Kode Obat</label>
              <Input name="code" defaultValue={drugModal.data?.code || ''} placeholder="OBT-011" required />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Satuan</label>
              <select
                name="unitId"
                defaultValue={drugModal.data?.unitId || ''}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">-- Pilih Satuan --</option>
                {drugUnits.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Nama Dagang Obat</label>
            <Input name="name" defaultValue={drugModal.data?.name || ''} placeholder="Amoxicillin 500 mg" required />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Nama Generik</label>
            <Input name="genericName" defaultValue={drugModal.data?.genericName || ''} placeholder="Amoxicillin Trihydrate" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Harga Beli (Rp)</label>
              <Input type="number" name="basePrice" defaultValue={drugModal.data?.basePrice || 0} required />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Harga Jual (Rp)</label>
              <Input type="number" name="sellingPrice" defaultValue={drugModal.data?.sellingPrice || 0} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Stok Awal</label>
              <Input type="number" name="currentStock" defaultValue={drugModal.data?.currentStock || 0} required />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Batas Minimal Stok</label>
              <Input type="number" name="minStock" defaultValue={drugModal.data?.minStock || 10} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDrugModal({ ...drugModal, open: false })}>
              Batal
            </Button>
            <Button type="submit" disabled={drugMutation.isPending}>
              {drugMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ─── 5. MODAL: JADWAL DOKTER ─────────────────────────────────────────── */}
      <Dialog
        open={scheduleModal.open}
        onOpenChange={(open) => setScheduleModal({ ...scheduleModal, open })}
      >
        <DialogClose onClick={() => setScheduleModal({ ...scheduleModal, open: false })} />
        <DialogHeader>
          <DialogTitle>
            {scheduleModal.mode === 'edit' ? 'Ubah Jadwal Praktik Dokter' : 'Tambah Jadwal Praktik Dokter'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            scheduleMutation.mutate({
              practitionerId: formData.get('practitionerId'),
              polyclinicId: formData.get('polyclinicId'),
              dayOfWeek: Number(formData.get('dayOfWeek')),
              startTime: formData.get('startTime'),
              endTime: formData.get('endTime'),
              quota: Number(formData.get('quota')),
              isActive: formData.get('isActive') === 'on',
            });
          }}
          className="space-y-3.5 my-2"
        >
          <div>
            <label className="text-xs font-semibold block mb-1">Dokter / Praktisi Medis</label>
            <select
              name="practitionerId"
              defaultValue={scheduleModal.data?.practitionerId || practitionersData?.[0]?.id || ''}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
              required
            >
              {practitionersData?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.specialization})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Poliklinik Tujuan</label>
            <select
              name="polyclinicId"
              defaultValue={scheduleModal.data?.polyclinicId || polyclinicsData?.[0]?.id || ''}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
              required
            >
              {polyclinicsData?.map((poly) => (
                <option key={poly.id} value={poly.id}>
                  {poly.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Hari Praktik</label>
              <select
                name="dayOfWeek"
                defaultValue={scheduleModal.data?.dayOfWeek || 1}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                required
              >
                {Object.entries(DAYS_MAP).map(([dayNum, dayName]) => (
                  <option key={dayNum} value={dayNum}>
                    {dayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Kuota Harian Pasien</label>
              <Input
                type="number"
                name="quota"
                defaultValue={scheduleModal.data?.quota || 30}
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Jam Mulai</label>
              <Input
                type="time"
                name="startTime"
                defaultValue={scheduleModal.data?.startTime || '08:00'}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Jam Selesai</label>
              <Input
                type="time"
                name="endTime"
                defaultValue={scheduleModal.data?.endTime || '12:00'}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="scheduleIsActive"
              name="isActive"
              defaultChecked={scheduleModal.data?.isActive !== false}
              className="rounded border-input text-primary focus:ring-primary w-4 h-4"
            />
            <label htmlFor="scheduleIsActive" className="text-xs font-semibold text-foreground cursor-pointer">
              Jadwal Aktif untuk Antrian Pasien
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleModal({ ...scheduleModal, open: false })}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={scheduleMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {scheduleMutation.isPending ? 'Menyimpan...' : 'Simpan Jadwal'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </AppLayout>
  );
}
