import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Stethoscope, RefreshCw, Search, Calendar, User, Building,
  CheckCircle2, Clock, Play, Lock, Edit3, ShieldAlert, ArrowRight,
  HeartPulse, FileText, Share2, Tag,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EncounterWorkspace } from './EncounterWorkspace';
import { useAuth } from '@/context/AuthContext';
import { dialog } from '@/context/DialogContext';
import apiClient from '@/lib/api-client';

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
  return `${years} Thn`;
}

export default function EncountersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const todayStr = new Date().toISOString().substring(0, 10);

  const [filterDate, setFilterDate] = useState(todayStr);
  const [filterPoli, setFilterPoli] = useState('');
  const [filterDokter, setFilterDokter] = useState(user?.practitioner?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEncounterId, setSelectedEncounterId] = useState(searchParams.get('id') || null);

  // Auto-set filter dokter jika user yang login adalah dokter
  React.useEffect(() => {
    if (user?.practitioner?.id && !filterDokter) {
      setFilterDokter(user.practitioner.id);
    }
  }, [user?.practitioner?.id]);

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data: queueData = [], isLoading: loadingQueue, refetch } = useQuery({
    queryKey: ['encounters-doctor-queue', filterDate, filterPoli, filterDokter],
    queryFn: () =>
      apiClient
        .get('/encounters/queue', {
          params: {
            date: filterDate,
            polyclinicId: filterPoli || undefined,
            practitionerId: filterDokter || undefined,
          },
        })
        .then((r) => r.data.data),
    staleTime: 15000,
    refetchInterval: 30000, // Auto refresh setiap 30 detik
  });

  const { data: polyclinicsData } = useQuery({
    queryKey: ['polyclinics-active'],
    queryFn: () => apiClient.get('/master/polyclinics', { params: { limit: 50 } }).then((r) => r.data.data),
    staleTime: 300000,
  });

  const { data: practitionersData } = useQuery({
    queryKey: ['practitioners-active'],
    queryFn: () => apiClient.get('/master/practitioners', { params: { limit: 50 } }).then((r) => r.data.data),
    staleTime: 300000,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────────
  const startEncounterMutation = useMutation({
    mutationFn: (registrationId) =>
      apiClient.post('/encounters', { registrationId }).then((r) => r.data.data),
    onSuccess: (newEncounter) => {
      queryClient.invalidateQueries({ queryKey: ['encounters-doctor-queue'] });
      setSelectedEncounterId(newEncounter.id);
      setSearchParams({ id: newEncounter.id });
    },
    onError: (err) => {
      dialog.alert('Gagal memulai pemeriksaan: ' + (err.response?.data?.error?.message || err.message), {
        title: 'Pemeriksaan Gagal',
        variant: 'danger',
      });
    },
  });

  const polyclinicOptions = (polyclinicsData?.items || []).map((p) => ({ id: p.id, name: p.name }));
  const practitionerOptions = (practitionersData?.items || []).map((p) => ({
    id: p.id,
    name: `${p.title ? p.title + ' ' : ''}${p.name}`,
  }));

  // Filter items by search query
  const filteredQueue = queueData.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.patientName?.toLowerCase().includes(q) ||
      item.patientMrn?.toLowerCase().includes(q) ||
      item.registrationNumber?.toLowerCase().includes(q) ||
      item.queueNumber?.toLowerCase().includes(q)
    );
  });

  // Stats
  const stats = {
    total: queueData.length,
    menunggu: queueData.filter((q) => q.status === 'MENUNGGU' || q.status === 'DIPANGGIL').length,
    diperiksa: queueData.filter((q) => q.status === 'DIPERIKSA').length,
    selesai: queueData.filter((q) => q.status === 'SELESAI').length,
  };

  const handleSelectEncounter = (encId) => {
    setSelectedEncounterId(encId);
    setSearchParams({ id: encId });
  };

  const handleBackToQueue = () => {
    setSelectedEncounterId(null);
    setSearchParams({});
    refetch();
  };

  return (
    <AppLayout
      title="Rekam Medis Elektronik (RME / EMR)"
      subtitle={`Pemeriksaan klinis dokter & catatan SOAP rawat jalan — ${new Date(filterDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      actions={
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="h-9 px-3 text-xs rounded-lg border border-input bg-background font-mono"
          />
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      }
    >
      {/* ─── WORKSPACE DOKTER AKTIF (JIKA MEMILIH PASIEN) ──────────────────── */}
      {selectedEncounterId ? (
        <EncounterWorkspace encounterId={selectedEncounterId} onBack={handleBackToQueue} />
      ) : (
        <div className="space-y-4">
          {/* ─── Doctor Personal Greeting Banner ──────────────────────────── */}
          {user?.practitioner && (
            <div className="p-3 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-sm text-foreground">
                    Selamat bertugas, {user.practitioner.title ? `${user.practitioner.title} ` : 'dr. '}{user.practitioner.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {filterDokter ? (
                      <span className="text-primary font-semibold">
                        &bull; Menampilkan antrian khusus untuk Anda hari ini ({stats.total} pasien).
                      </span>
                    ) : (
                      <span>
                        &bull; Menampilkan seluruh antrian dokter di klinik.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {filterDokter ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterDokter('')}
                    className="text-xs h-8 text-muted-foreground hover:text-foreground"
                  >
                    Tampilkan Semua Dokter
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterDokter(user.practitioner.id)}
                    className="text-xs h-8 text-primary border-primary/30 font-semibold bg-primary/5"
                  >
                    Kembali ke Antrian Saya
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ─── Stats Summary ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Pasien', val: stats.total, color: 'text-foreground', bg: 'bg-muted/50' },
              { label: 'Menunggu Giliran', val: stats.menunggu, color: 'text-amber-600', bg: 'bg-amber-500/10' },
              { label: 'Sedang Diperiksa', val: stats.diperiksa, color: 'text-purple-600', bg: 'bg-purple-500/10' },
              { label: 'Pelayanan Selesai', val: stats.selesai, color: 'text-green-600', bg: 'bg-green-500/10' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl ${s.bg} px-4 py-3 flex flex-col`}>
                <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
                <span className={`text-2xl font-bold font-mono ${s.color}`}>{s.val}</span>
              </div>
            ))}
          </div>

          {/* ─── Table Antrian Pasien Dokter ──────────────────────────────── */}
          <Card className="rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="py-3 border-b border-border bg-muted/20">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari Nama Pasien / No. RM / No. Antrian..."
                    className="pl-9 text-xs h-9"
                  />
                </div>
                <select
                  value={filterPoli}
                  onChange={(e) => setFilterPoli(e.target.value)}
                  className="h-9 px-3 text-xs rounded-lg border border-input bg-background min-w-40 font-medium"
                >
                  <option value="">Semua Poliklinik</option>
                  {polyclinicOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={filterDokter}
                  onChange={(e) => setFilterDokter(e.target.value)}
                  className="h-9 px-3 text-xs rounded-lg border border-input bg-background min-w-44 font-medium"
                >
                  <option value="">Semua Dokter / Praktisi</option>
                  {practitionerOptions.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Antrian</TableHead>
                    <TableHead>Pasien</TableHead>
                    <TableHead>Poli / Dokter</TableHead>
                    <TableHead>Keluhan Utama</TableHead>
                    <TableHead>Penjamin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi Pelayanan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingQueue ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Memuat antrian pasien dokter...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredQueue.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                        Tidak ada antrian pasien pada tanggal ini
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQueue.map((item) => {
                      const isExamining = item.status === 'DIPERIKSA';
                      const isCompleted = item.status === 'SELESAI';

                      return (
                        <TableRow key={item.registrationId} className={isExamining ? 'bg-primary/5 font-semibold' : ''}>
                          <TableCell>
                            <span className="font-mono text-base font-extrabold text-foreground">
                              {item.queueNumber || '—'}
                            </span>
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              {item.registrationNumber}
                            </p>
                          </TableCell>

                          <TableCell>
                            <p className="font-bold text-sm text-foreground leading-tight">{item.patientName}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              RM: {item.patientMrn} &bull; {item.patientGender} &bull; {calculateAge(item.patientBirthDate)}
                            </p>
                            {item.patientAllergiesNotes && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-destructive font-bold bg-destructive/10 px-1.5 py-0.5 rounded mt-1">
                                <ShieldAlert className="w-2.5 h-2.5" /> Alergi
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <p className="text-xs font-semibold">{item.polyclinicName}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {item.practitionerTitle ? `${item.practitionerTitle} ` : ''}{item.practitionerName || '—'}
                            </p>
                          </TableCell>

                          <TableCell className="max-w-xs">
                            <p className="text-xs text-muted-foreground italic truncate">
                              {item.complaint || '—'}
                            </p>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {item.paymentMethod}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            {item.status === 'MENUNGGU' && (
                              <Badge variant="warning" className="text-[10px]">Menunggu</Badge>
                            )}
                            {item.status === 'DIPANGGIL' && (
                              <Badge variant="info" className="text-[10px]">Dipanggil</Badge>
                            )}
                            {item.status === 'DIPERIKSA' && (
                              <Badge variant="purple" className="text-[10px] animate-pulse">Sedang Diperiksa</Badge>
                            )}
                            {item.status === 'SELESAI' && (
                              <Badge variant="success" className="text-[10px]">Selesai</Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            {item.encounterId ? (
                              <Button
                                size="sm"
                                onClick={() => handleSelectEncounter(item.encounterId)}
                                className={`text-xs gap-1.5 ${
                                  isCompleted
                                    ? 'bg-muted text-foreground hover:bg-muted/80'
                                    : 'bg-primary text-primary-foreground font-semibold'
                                }`}
                              >
                                {isCompleted ? (
                                  <>
                                    <Lock className="w-3.5 h-3.5" /> Lihat Rekam Medis
                                  </>
                                ) : (
                                  <>
                                    <Stethoscope className="w-3.5 h-3.5" /> Lanjutkan Periksa
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => startEncounterMutation.mutate(item.registrationId)}
                                disabled={startEncounterMutation.isPending}
                                className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" /> Mulai Periksa
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
