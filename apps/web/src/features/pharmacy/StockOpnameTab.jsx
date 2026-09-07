import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet, Plus, CheckCircle2, AlertTriangle, Lock,
  Save, Search, Calendar, ChevronRight, ArrowLeft, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import apiClient from '@/lib/api-client';

export function StockOpnameTab() {
  const queryClient = useQueryClient();
  const [selectedSOId, setSelectedSOId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPeriod, setNewPeriod] = useState(`SEPTEMBER ${new Date().getFullYear()}`);
  const [newNotes, setNewNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localItems, setLocalItems] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [flashMsg, setFlashMsg] = useState('');

  // ─── Query Daftar Sesi SO ───────────────────────────────────────────────────
  const { data: soList = [], isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ['stock-opnames-list'],
    queryFn: async () => {
      const res = await apiClient.get('/pharmacy/stock-opnames');
      return res.data.data;
    },
  });

  // ─── Query Detail SO Terpilih ───────────────────────────────────────────────
  const { data: soDetail, isLoading: detailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ['stock-opname-detail', selectedSOId],
    queryFn: async () => {
      if (!selectedSOId) return null;
      const res = await apiClient.get(`/pharmacy/stock-opnames/${selectedSOId}`);
      return res.data.data;
    },
    enabled: !!selectedSOId,
  });

  useEffect(() => {
    if (soDetail?.items) {
      setLocalItems(soDetail.items);
      setIsDirty(false);
    } else {
      setLocalItems([]);
    }
  }, [soDetail]);

  // ─── Mutation Buat SO Baru ──────────────────────────────────────────────────
  const createSOMutation = useMutation({
    mutationFn: (data) => apiClient.post('/pharmacy/stock-opnames', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opnames-list'] });
      setShowCreateModal(false);
      setSelectedSOId(res.data.data.id);
      flashNotification('Sesi Stock Opname baru berhasil dibuat!');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Gagal membuat sesi Stock Opname');
    },
  });

  // ─── Mutation Simpan Item SO ────────────────────────────────────────────────
  const saveItemsMutation = useMutation({
    mutationFn: (items) =>
      apiClient.put(`/pharmacy/stock-opnames/${selectedSOId}/items`, {
        items: items.map((it) => ({
          drugId: it.drugId,
          batchId: it.batchId || undefined,
          physicalQty: Number(it.physicalQty || 0),
          expiryDate: it.expiryDate || undefined,
          expiryNotes: it.expiryNotes || undefined,
          adjustmentReason: it.adjustmentReason || undefined,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname-detail', selectedSOId] });
      setIsDirty(false);
      flashNotification('Data perhitungan fisik berhasil disimpan!');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Gagal menyimpan data SO');
    },
  });

  // ─── Mutation Finalisasi SO ─────────────────────────────────────────────────
  const finalizeSOMutation = useMutation({
    mutationFn: () => apiClient.post(`/pharmacy/stock-opnames/${selectedSOId}/finalize`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opnames-list'] });
      queryClient.invalidateQueries({ queryKey: ['stock-opname-detail', selectedSOId] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stocks'] });
      flashNotification('Stock Opname berhasil difinalisasi dan penyesuaian stok telah diterapkan!');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Gagal finalisasi SO');
    },
  });

  const flashNotification = (msg) => {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(''), 4000);
  };

  const handleInputChange = (drugId, field, val) => {
    setLocalItems((prev) =>
      prev.map((item) => {
        if (item.drugId === drugId) {
          const updated = { ...item, [field]: val };
          if (field === 'physicalQty') {
            updated.selisih = Number(val || 0) - Number(item.systemQty || 0);
          }
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

  const isFinalized = soDetail?.status === 'FINALIZED';

  return (
    <div className="space-y-4">
      {/* Flash Notification */}
      {flashMsg && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-xs font-semibold text-green-700 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span>{flashMsg}</span>
        </div>
      )}

      {/* VIEW 1: Sesi List View (If No SO Selected) */}
      {!selectedSOId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
            <div>
              <h3 className="text-base font-bold text-foreground">Stock Opname (SO) Bulanan</h3>
              <p className="text-xs text-muted-foreground">Pencocokan stok sistem vs fisik secara periodik</p>
            </div>

            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="gap-1.5 font-semibold text-xs shadow-sm"
            >
              <Plus className="w-4 h-4" /> Buat Sesi SO Baru
            </Button>
          </div>

          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">Periode SO</TableHead>
                  <TableHead className="text-xs">Tanggal Pelaksanaan</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Jumlah Item Obat</TableHead>
                  <TableHead className="text-xs">Dibuat Oleh</TableHead>
                  <TableHead className="text-xs">Difinalisasi Oleh</TableHead>
                  <TableHead className="text-xs text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                      Memuat daftar Stock Opname...
                    </TableCell>
                  </TableRow>
                ) : soList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                      Belum ada sesi Stock Opname. Klik "Buat Sesi SO Baru" untuk memulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  soList.map((so) => (
                    <TableRow key={so.id} className="hover:bg-muted/30 transition-colors text-xs">
                      <TableCell className="font-bold text-foreground">{so.period}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{so.opnameDate}</TableCell>
                      <TableCell>
                        <Badge variant={so.status === 'FINALIZED' ? 'success' : 'warning'}>
                          {so.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{so.itemCount || 113} Item</TableCell>
                      <TableCell>{so.createdByName || 'Petugas Farmasi'}</TableCell>
                      <TableCell>{so.finalizedByName || '—'}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedSOId(so.id)}
                          className="gap-1 text-xs h-7"
                        >
                          Buka Lembar SO <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* VIEW 2: Interactive SO Detail Grid */
        <div className="space-y-4">
          {/* Header Action Bar */}
          <div className="p-4 bg-card border border-border rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSOId(null)}
                className="gap-1 text-xs"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
              </Button>
              <div className="border-l border-border pl-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    Lembar Stock Opname: {soDetail?.period}
                  </h3>
                  <Badge variant={isFinalized ? 'success' : 'warning'}>
                    {soDetail?.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Tanggal: {soDetail?.opnameDate} {soDetail?.notes && `• ${soDetail.notes}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isFinalized && (
                <>
                  <Button
                    size="sm"
                    onClick={() => saveItemsMutation.mutate(localItems)}
                    disabled={!isDirty || saveItemsMutation.isPending}
                    className={`gap-1.5 text-xs font-semibold ${
                      isDirty ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    {saveItemsMutation.isPending ? 'Menyimpan...' : 'Simpan Hitung Fisik'}
                  </Button>

                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md"
                    onClick={() => {
                      if (confirm('Yakin ingin memfinalisasi Stock Opname ini? Semua selisih akan otomatis di-adjust ke stok sistem!')) {
                        finalizeSOMutation.mutate();
                      }
                    }}
                    disabled={finalizeSOMutation.isPending}
                  >
                    <Lock className="w-4 h-4" />
                    {finalizeSOMutation.isPending ? 'Memproses...' : 'Finalisasi & Terapkan Penyesuaian'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari obat dalam lembar SO..."
                className="pl-9 text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Menampilkan {filteredItems.length} item obat
            </p>
          </div>

          {/* SO Spreadsheet Table */}
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[62vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                  <TableRow>
                    <TableHead className="w-12 text-xs">No</TableHead>
                    <TableHead className="text-xs min-w-[200px]">Nama Obat</TableHead>
                    <TableHead className="text-xs">Sediaan</TableHead>
                    <TableHead className="text-xs text-center">Stok Sistem</TableHead>
                    <TableHead className="text-xs text-center bg-blue-500/5 min-w-[110px]">
                      Stok Fisik
                    </TableHead>
                    <TableHead className="text-xs text-center">Selisih</TableHead>
                    <TableHead className="text-xs min-w-[140px]">Tanggal Kedaluwarsa (ED)</TableHead>
                    <TableHead className="text-xs min-w-[160px]">Keterangan ED / Fisik</TableHead>
                    <TableHead className="text-xs min-w-[160px]">Alasan Selisih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-xs text-muted-foreground">
                        Memuat data lembar Stock Opname...
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                        Tidak ada obat yang cocok dengan pencarian
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const selisih = Number(item.selisih || 0);
                      return (
                        <TableRow key={item.drugId} className="hover:bg-muted/30 transition-colors text-xs">
                          <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <p className="font-bold text-foreground">{item.drugName}</p>
                            <span className="font-mono text-[10px] text-muted-foreground">{item.drugCode}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{item.dosageForm}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-muted-foreground">
                            {item.systemQty}
                          </TableCell>
                          <TableCell className="text-center bg-blue-500/5 p-1.5">
                            {isFinalized ? (
                              <span className="font-mono font-bold text-foreground">{item.physicalQty}</span>
                            ) : (
                              <Input
                                type="number"
                                min="0"
                                value={item.physicalQty ?? ''}
                                onChange={(e) => handleInputChange(item.drugId, 'physicalQty', e.target.value)}
                                className="w-20 text-center font-bold text-xs h-7 mx-auto bg-card"
                              />
                            )}
                          </TableCell>
                          <TableCell className={`text-center font-mono font-extrabold ${selisih < 0 ? 'text-destructive' : selisih > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {selisih > 0 ? `+${selisih}` : selisih}
                          </TableCell>
                          <TableCell className="p-1.5">
                            {isFinalized ? (
                              <span className="font-mono text-[11px]">{item.expiryDate || '—'}</span>
                            ) : (
                              <Input
                                type="date"
                                value={item.expiryDate || ''}
                                onChange={(e) => handleInputChange(item.drugId, 'expiryDate', e.target.value)}
                                className="text-[11px] h-7 font-mono"
                              />
                            )}
                          </TableCell>
                          <TableCell className="p-1.5">
                            {isFinalized ? (
                              <span className="text-[11px] text-muted-foreground">{item.expiryNotes || '—'}</span>
                            ) : (
                              <Input
                                value={item.expiryNotes || ''}
                                onChange={(e) => handleInputChange(item.drugId, 'expiryNotes', e.target.value)}
                                placeholder="Contoh: ED Bulan ini tgl 30"
                                className="text-[11px] h-7"
                              />
                            )}
                          </TableCell>
                          <TableCell className="p-1.5">
                            {isFinalized ? (
                              <span className="text-[11px] text-muted-foreground">{item.adjustmentReason || '—'}</span>
                            ) : (
                              <Input
                                value={item.adjustmentReason || ''}
                                onChange={(e) => handleInputChange(item.drugId, 'adjustmentReason', e.target.value)}
                                placeholder="Alasan jika selisih..."
                                className="text-[11px] h-7"
                              />
                            )}
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

      {/* Modal Buat SO Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-foreground">Buat Sesi Stock Opname Baru</h3>
            <p className="text-xs text-muted-foreground">
              Sistem akan membuat snapshot stok seluruh 113 item obat saat ini sebagai dasar penghitungan fisik.
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nama Periode *</label>
                <Input
                  value={newPeriod}
                  onChange={(e) => setNewPeriod(e.target.value)}
                  placeholder="Contoh: SEPTEMBER 2026"
                  className="text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Catatan Sesi</label>
                <Input
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Catatan pelaksana..."
                  className="text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => createSOMutation.mutate({ period: newPeriod, notes: newNotes })}
                disabled={createSOMutation.isPending}
                className="font-semibold text-xs"
              >
                {createSOMutation.isPending ? 'Membuat...' : 'Buat Sesi SO'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
