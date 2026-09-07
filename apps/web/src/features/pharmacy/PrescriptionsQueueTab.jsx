import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pill, Clock, CheckCircle2, AlertTriangle, User, Calendar,
  ArrowRight, Search, RefreshCw, Printer, ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PrescriptionDispenseModal } from './PrescriptionDispenseModal';
import apiClient from '@/lib/api-client';

export function PrescriptionsQueueTab() {
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' | 'DISPENSED' | 'CANCELLED' | ''
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);

  const { data: queue = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['prescriptions-queue', statusFilter],
    queryFn: async () => {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/pharmacy/prescriptions/queue', { params });
      return res.data.data;
    },
    refetchInterval: 10000, // Real-time poll every 10s for incoming doctor prescriptions
  });

  const filteredQueue = queue.filter((item) => {
    if (!searchTerm) return true;
    const matchName = item.patientName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMrn = item.patientMrn?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchNum = item.prescriptionNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchName || matchMrn || matchNum;
  });

  return (
    <div className="space-y-4">
      {/* Filter & Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari pasien, no RM, no resep..."
            className="pl-9 text-xs"
          />
        </div>

        {/* Status Filter Tabs & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <div className="flex bg-muted p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-card text-primary font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Menunggu ({queue.filter((q) => q.status === 'PENDING').length || (statusFilter === 'PENDING' ? queue.length : 0)})
            </button>
            <button
              onClick={() => setStatusFilter('DISPENSED')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'DISPENSED'
                  ? 'bg-card text-green-700 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Selesai Dispense
            </button>
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === ''
                  ? 'bg-card text-foreground font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semua
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0 gap-1 text-xs"
            title="Muat ulang antrian"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border text-muted-foreground gap-3">
          <Clock className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-medium">Memuat antrian resep pasien...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border text-muted-foreground gap-3 text-center">
          <div className="p-3 bg-muted rounded-full">
            <Pill className="w-8 h-8 text-muted-foreground/60" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Tidak Ada Antrian Resep</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {statusFilter === 'PENDING'
                ? 'Semua resep dokter telah selesai diproses oleh farmasi.'
                : 'Tidak ada data resep yang cocok dengan kriteria filter.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQueue.map((item) => {
            const isPending = item.status === 'PENDING';
            const isDispensed = item.status === 'DISPENSED';

            return (
              <Card
                key={item.id}
                className={`hover:border-primary/50 transition-all border shadow-sm flex flex-col justify-between overflow-hidden ${
                  isPending ? 'border-primary/30 bg-card' : 'bg-card/70 opacity-95'
                }`}
              >
                <div className="p-4 space-y-3">
                  {/* Top Bar Card */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">
                      {item.prescriptionNumber}
                    </span>
                    <Badge
                      variant={isDispensed ? 'success' : isPending ? 'warning' : 'destructive'}
                    >
                      {item.status}
                    </Badge>
                  </div>

                  {/* Patient Info */}
                  <div>
                    <h4 className="text-sm font-bold text-foreground leading-snug">
                      {item.patientName}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      No. RM: <span className="font-mono font-medium text-foreground">{item.patientMrn}</span> • {item.patientGender === 'L' ? 'L' : 'P'}
                    </p>
                  </div>

                  {/* Doctor & Poli */}
                  <div className="text-xs bg-muted/40 p-2.5 rounded-lg space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Poli:</span>
                      <span className="font-semibold text-foreground">{item.polyclinicName || 'Poli Umum'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dokter:</span>
                      <span className="font-medium text-foreground truncate max-w-[170px]">{item.practitionerName}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/60 pt-1">
                      <span className="text-muted-foreground">Rincian Obat:</span>
                      <span className="font-bold text-primary">{item.itemCount} Macam Obat</span>
                    </div>
                  </div>
                </div>

                {/* Footer Card */}
                <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>

                  <Button
                    size="sm"
                    onClick={() => setSelectedPrescriptionId(item.id)}
                    className={`gap-1 text-xs font-semibold ${
                      isPending
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {isPending ? (
                      <>
                        <Pill className="w-3.5 h-3.5" /> Proses Resep
                      </>
                    ) : (
                      <>
                        Lihat Detail <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dispense & Verification Modal */}
      {selectedPrescriptionId && (
        <PrescriptionDispenseModal
          prescriptionId={selectedPrescriptionId}
          onClose={() => setSelectedPrescriptionId(null)}
        />
      )}
    </div>
  );
}
