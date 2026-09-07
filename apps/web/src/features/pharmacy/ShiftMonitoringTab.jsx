import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, Play, CheckCircle2, Lock, Sliders, Search,
  Save, RefreshCw, AlertCircle, History, Calendar, User, FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import apiClient from '@/lib/api-client';

export function ShiftMonitoringTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [openShiftType, setOpenShiftType] = useState('PAGI');
  const [openShiftNotes, setOpenShiftNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [localItems, setLocalItems] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // ─── Query Shift Aktif ────────────────────────────────────────────────────────
  const { data: activeShift, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['active-shift'],
    queryFn: async () => {
      const res = await apiClient.get('/pharmacy/shifts/active');
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  // ─── Query Riwayat Shift ──────────────────────────────────────────────────────
  const { data: shiftHistory = [] } = useQuery({
    queryKey: ['shift-history'],
    queryFn: async () => {
      const res = await apiClient.get('/pharmacy/shifts/history');
      return res.data.data;
    },
    enabled: showHistory,
  });

  // Sinkronkan state lokal tabel dengan data backend
  useEffect(() => {
    if (activeShift?.items) {
      setLocalItems(activeShift.items);
      setIsDirty(false);
    } else {
      setLocalItems([]);
    }
  }, [activeShift]);

  // ─── Mutation Buka Shift ──────────────────────────────────────────────────────
  const openShiftMutation = useMutation({
    mutationFn: (data) => apiClient.post('/pharmacy/shifts/open', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      flashMessage('Shift baru berhasil dibuka!');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Gagal membuka shift');
    },
  });

  // ─── Mutation Simpan Item Shift ───────────────────────────────────────────────
  const saveItemsMutation = useMutation({
    mutationFn: (items) =>
      apiClient.put(`/pharmacy/shifts/${activeShift.id}/items`, {
        items: items.map((it) => ({
          drugId: it.drugId,
          usageNonShift: Number(it.usageNonShift || 0),
          adjustment: Number(it.adjustment || 0),
          notes: it.notes || '',
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      setIsDirty(false);
      flashMessage('Perubahan pemakaian non-shift berhasil disimpan!');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Gagal menyimpan perubahan shift');
    },
  });

  // ─── Mutation Tutup Shift ─────────────────────────────────────────────────────
  const closeShiftMutation = useMutation({
    mutationFn: () => apiClient.post(`/pharmacy/shifts/${activeShift.id}/close`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['shift-history'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      flashMessage('Shift berhasil ditutup dan stok akhir telah dibekukan!');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Gagal menutup shift');
    },
  });

  const flashMessage = (msg) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 4000);
  };

  const handleInputChange = (drugId, field, val) => {
    setLocalItems((prev) =>
      prev.map((item) => {
        if (item.drugId === drugId) {
          const updated = { ...item, [field]: val };
          const nonShift = Number(field === 'usageNonShift' ? val : item.usageNonShift || 0);
          const adj = Number(field === 'adjustment' ? val : item.adjustment || 0);
          const shiftUsage = Number(item.usageShift || 0);
          const start = Number(item.stockStart || 0);
          updated.stockEnd = start - shiftUsage - nonShift + adj;
          return updated;
        }
        return item;
      })
    );
    setIsDirty(true);
  };

  const filteredItems = localItems.filter((it) => {
    if (!searchTerm) return true;
    const matchName = it.drugName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCode = it.drugCode?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchName || matchCode;
  });

  return (
    <div className="space-y-4">
      {/* Flash Save Alert */}
      {saveMessage && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-xs font-semibold text-green-700 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Top Banner: Shift Status or Open Shift Form */}
      {isLoading ? (
        <div className="p-8 bg-card border border-border rounded-xl flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-4 h-4 animate-spin text-primary" /> Memeriksa status shift aktif...
        </div>
      ) : activeShift ? (
        /* Active Shift Card */
        <div className="p-5 bg-card border border-primary/30 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-foreground">
                  Shift {activeShift.shiftType} Aktif
                </span>
                <Badge variant="success" className="text-[10px] animate-pulse">
                  SEDANG BERJALAN
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tanggal: <strong className="text-foreground">{activeShift.logDate}</strong> • Dibuka oleh: {activeShift.openedByName || 'Petugas Farmasi'} (Jam {activeShift.shiftStartTime || '07:00'})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1 text-xs"
              title="Segarkan Data Shift"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              size="sm"
              onClick={() => saveItemsMutation.mutate(localItems)}
              disabled={!isDirty || saveItemsMutation.isPending}
              className={`gap-1.5 text-xs font-semibold ${
                isDirty ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Save className="w-4 h-4" />
              {saveItemsMutation.isPending ? 'Menyimpan...' : 'Simpan Pemakaian Non-Shift'}
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm(`Yakin ingin menutup shift ${activeShift.shiftType} dan membekukan stok akhir?`)) {
                  closeShiftMutation.mutate();
                }
              }}
              disabled={closeShiftMutation.isPending}
              className="gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              {closeShiftMutation.isPending ? 'Menutup...' : 'Tutup Shift Sekarang'}
            </Button>
          </div>
        </div>
      ) : (
        /* No Shift Active: Open Shift Card */
        <div className="p-6 bg-card border border-border rounded-xl shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Tidak Ada Shift Farmasi yang Sedang Aktif</h3>
              <p className="text-xs text-muted-foreground">
                Buka sesi shift baru untuk memulai pemantauan pemakaian obat harian
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-semibold text-foreground whitespace-nowrap">Tipe Shift:</label>
              <select
                value={openShiftType}
                onChange={(e) => setOpenShiftType(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold"
              >
                <option value="PAGI">Pagi (07.00 - 14.00)</option>
                <option value="SIANG">Siang (14.00 - 21.00)</option>
                <option value="MALAM">Malam (21.00 - 07.00)</option>
              </select>
            </div>

            <Input
              value={openShiftNotes}
              onChange={(e) => setOpenShiftNotes(e.target.value)}
              placeholder="Catatan shift (opsional)..."
              className="text-xs flex-1"
            />

            <Button
              size="sm"
              onClick={() => openShiftMutation.mutate({ shiftType: openShiftType, notes: openShiftNotes })}
              disabled={openShiftMutation.isPending}
              className="gap-1.5 font-bold shadow-md text-xs w-full sm:w-auto"
            >
              <Play className="w-4 h-4 fill-current" />
              {openShiftMutation.isPending ? 'Membuka Shift...' : 'Buka Shift Sekarang'}
            </Button>
          </div>
        </div>
      )}

      {/* Spreadsheet Style Table (When Shift is Active) */}
      {activeShift && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari obat dalam lembar shift..."
                className="pl-9 text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Menampilkan {filteredItems.length} dari {localItems.length} item obat
            </p>
          </div>

          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[60vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                  <TableRow>
                    <TableHead className="w-12 text-xs">No</TableHead>
                    <TableHead className="text-xs min-w-[200px]">Nama Obat</TableHead>
                    <TableHead className="text-xs">Sediaan</TableHead>
                    <TableHead className="text-xs text-center">Stok Awal</TableHead>
                    <TableHead className="text-xs text-center bg-blue-500/5 text-blue-900 font-bold">
                      Resep Shift
                    </TableHead>
                    <TableHead className="text-xs text-center bg-amber-500/5 text-amber-900 font-bold min-w-[130px]">
                      Non-Shift (Manual)
                    </TableHead>
                    <TableHead className="text-xs text-center min-w-[100px]">Koreksi (+/-)</TableHead>
                    <TableHead className="text-xs text-center bg-green-500/5 text-green-900 font-bold">
                      Stok Akhir
                    </TableHead>
                    <TableHead className="text-xs">Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                        Tidak ada obat yang cocok dengan pencarian
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const isMinus = Number(item.stockEnd) < 0;
                      return (
                        <TableRow key={item.drugId} className="hover:bg-muted/30 transition-colors text-xs">
                          <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <p className="font-bold text-foreground">{item.drugName}</p>
                            <span className="font-mono text-[10px] text-muted-foreground">{item.drugCode}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {item.dosageForm}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-foreground">
                            {item.stockStart}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold bg-blue-500/5 text-blue-700">
                            {item.usageShift || 0}
                          </TableCell>
                          <TableCell className="text-center bg-amber-500/5 p-1.5">
                            <Input
                              type="number"
                              min="0"
                              value={item.usageNonShift || ''}
                              onChange={(e) => handleInputChange(item.drugId, 'usageNonShift', e.target.value)}
                              placeholder="0"
                              className="w-20 text-center font-bold text-xs h-7 mx-auto bg-card"
                            />
                          </TableCell>
                          <TableCell className="text-center p-1.5">
                            <Input
                              type="number"
                              value={item.adjustment || ''}
                              onChange={(e) => handleInputChange(item.drugId, 'adjustment', e.target.value)}
                              placeholder="0"
                              className="w-20 text-center font-mono text-xs h-7 mx-auto bg-card"
                            />
                          </TableCell>
                          <TableCell className={`text-center font-mono font-extrabold text-sm bg-green-500/5 ${isMinus ? 'text-destructive' : 'text-green-700'}`}>
                            {item.stockEnd}
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input
                              value={item.notes || ''}
                              onChange={(e) => handleInputChange(item.drugId, 'notes', e.target.value)}
                              placeholder="Ket..."
                              className="text-[11px] h-7 min-w-[120px]"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Riwayat Shift Lampau */}
      <div className="pt-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHistory(!showHistory)}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <History className="w-3.5 h-3.5" />
          {showHistory ? 'Sembunyikan Riwayat Shift' : 'Lihat Riwayat Shift Lampau'}
        </Button>

        {showHistory && (
          <div className="mt-3 border border-border rounded-xl bg-card overflow-hidden shadow-sm animate-in fade-in">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">Tanggal</TableHead>
                  <TableHead className="text-xs">Tipe Shift</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Dibuka Oleh</TableHead>
                  <TableHead className="text-xs">Ditutup Oleh</TableHead>
                  <TableHead className="text-xs">Waktu Tutup</TableHead>
                  <TableHead className="text-xs">Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                      Belum ada riwayat shift lampau.
                    </TableCell>
                  </TableRow>
                ) : (
                  shiftHistory.map((s) => (
                    <TableRow key={s.id} className="text-xs">
                      <TableCell className="font-mono font-bold text-foreground">{s.logDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold">{s.shiftType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'CLOSED' ? 'outline' : 'success'}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{s.openedByName || '—'}</TableCell>
                      <TableCell>{s.closedByName || '—'}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {s.closedAt ? new Date(s.closedAt).toLocaleTimeString('id-ID') : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.notes || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
