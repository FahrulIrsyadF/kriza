import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pill, Box, Clock, FileSpreadsheet, CheckCircle2,
  AlertTriangle, RefreshCw, Layers, Sparkles,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { PrescriptionsQueueTab } from './PrescriptionsQueueTab';
import { DrugStocksTab } from './DrugStocksTab';
import { ShiftMonitoringTab } from './ShiftMonitoringTab';
import { StockOpnameTab } from './StockOpnameTab';
import apiClient from '@/lib/api-client';

export default function PharmacyPage() {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'stocks' | 'shifts' | 'opname'

  // ─── Query Dashboard Stats ──────────────────────────────────────────────────
  const { data: statsData, refetch } = useQuery({
    queryKey: ['pharmacy-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/pharmacy/stats');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const stats = statsData || {
    pendingPrescriptions: 0,
    dispensedToday: 0,
    criticalStockItems: 0,
    activeShift: null,
  };

  return (
    <AppLayout
      title="Farmasi & Manajemen Obat"
      subtitle="Pengelolaan resep elektronik dokter, dispensing obat (FEFO), pemantauan shift, dan stock opname"
    >
      <div className="space-y-6">
        {/* KPI Quick Stats Widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Pending Resep */}
          <div
            onClick={() => setActiveTab('queue')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-primary/10 border-primary/40 shadow-sm'
                : 'bg-card border-border hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Resep Menunggu</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                <Pill className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold font-mono text-foreground mt-2">
              {stats.pendingPrescriptions}
            </p>
            <span className="text-[10px] text-amber-600 font-medium">Perlu disiapkan farmasi</span>
          </div>

          {/* Card 2: Dispensed Today */}
          <div
            onClick={() => setActiveTab('queue')}
            className="p-4 bg-card rounded-xl border border-border hover:border-border/80 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Selesai Hari Ini</span>
              <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold font-mono text-foreground mt-2">
              {stats.dispensedToday}
            </p>
            <span className="text-[10px] text-green-600 font-medium">Obat diserahkan ke pasien</span>
          </div>

          {/* Card 3: Stok Kritis */}
          <div
            onClick={() => setActiveTab('stocks')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'stocks'
                ? 'bg-destructive/10 border-destructive/40 shadow-sm'
                : 'bg-card border-border hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Stok Kritis (≤ 10)</span>
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold font-mono text-destructive mt-2">
              {stats.criticalStockItems}
            </p>
            <span className="text-[10px] text-destructive font-medium">Perlu pengadaan ulang</span>
          </div>

          {/* Card 4: Shift Status */}
          <div
            onClick={() => setActiveTab('shifts')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'shifts'
                ? 'bg-primary/10 border-primary/40 shadow-sm'
                : 'bg-card border-border hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Shift Harian</span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base font-extrabold text-foreground mt-2 truncate">
              {stats.activeShift ? `Shift ${stats.activeShift.shiftType}` : 'Tidak Aktif'}
            </p>
            <span className={`text-[10px] font-medium ${stats.activeShift ? 'text-green-600 font-bold' : 'text-muted-foreground'}`}>
              {stats.activeShift ? 'Sedang Berjalan' : 'Klik untuk Buka Shift'}
            </span>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'queue'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Pill className="w-4 h-4" />
            Antrian Resep & Dispensing
            {stats.pendingPrescriptions > 0 && (
              <span className="bg-amber-500 text-slate-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {stats.pendingPrescriptions}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stocks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'stocks'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Box className="w-4 h-4" />
            Stok Obat & Batch (FEFO)
          </button>

          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'shifts'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pencatatan Shift Harian
          </button>

          <button
            onClick={() => setActiveTab('opname')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'opname'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Stock Opname (SO)
          </button>
        </div>

        {/* Tab View Container */}
        <div>
          {activeTab === 'queue' && <PrescriptionsQueueTab />}
          {activeTab === 'stocks' && <DrugStocksTab />}
          {activeTab === 'shifts' && <ShiftMonitoringTab />}
          {activeTab === 'opname' && <StockOpnameTab />}
        </div>
      </div>
    </AppLayout>
  );
}
