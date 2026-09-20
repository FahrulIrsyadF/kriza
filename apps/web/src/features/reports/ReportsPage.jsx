import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Receipt,
  Activity,
  Pill,
  ShieldCheck,
  Calendar,
  RefreshCw,
  TrendingUp,
  Banknote,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/utils';
import apiClient from '@/lib/api-client';

import { VisitsReportTab } from './VisitsReportTab';
import { RevenueReportTab } from './RevenueReportTab';
import { MorbidityReportTab } from './MorbidityReportTab';
import { PharmacyReportTab } from './PharmacyReportTab';
import { BpjsReportTab } from './BpjsReportTab';

function formatDateInput(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('visits'); // 'visits' | 'revenue' | 'morbidity' | 'pharmacy' | 'bpjs'
  const [periodPreset, setPeriodPreset] = useState('BULAN_INI');

  // Dates state
  const today = useMemo(() => new Date(), []);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return formatDateInput(d);
  });
  const [customEndDate, setCustomEndDate] = useState(() => formatDateInput(new Date()));

  // Calculate actual startDate and endDate based on preset
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let label = '';

    switch (periodPreset) {
      case 'HARI_INI':
        start = now;
        end = now;
        label = `Hari Ini (${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;
        break;
      case '7_HARI':
        start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        end = now;
        label = '7 Hari Terakhir';
        break;
      case '30_HARI':
        start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
        end = now;
        label = '30 Hari Terakhir';
        break;
      case 'BULAN_INI':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        label = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        break;
      case 'BULAN_LALU':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        label = start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        break;
      case 'CUSTOM':
      default:
        return {
          startDate: customStartDate,
          endDate: customEndDate,
          periodLabel: `${customStartDate} s/d ${customEndDate}`,
        };
    }

    const sStr = formatDateInput(start);
    const eStr = formatDateInput(end);
    return {
      startDate: sStr,
      endDate: eStr,
      periodLabel: `${label} (${sStr} s/d ${eStr})`,
    };
  }, [periodPreset, customStartDate, customEndDate]);

  // ─── 1. Query Executive Overview KPIs ──────────────────────────────────────
  const { data: overviewData, refetch: refetchOverview, isFetching } = useQuery({
    queryKey: ['reports-overview', startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get('/reports/overview', {
        params: { startDate, endDate },
      });
      return res.data.data;
    },
  });

  const overview = overviewData || {
    totalVisits: 0,
    bpjsVisits: 0,
    newPatients: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    totalDispensedPrescriptions: 0,
    totalDiagnoses: 0,
  };

  return (
    <AppLayout
      title="Laporan Operasional & Analitik"
      subtitle="Pusat pelaporan terpadu kunjungan pasien, keuangan kasir, pola penyakit ICD-10, stok farmasi, dan pelayanan BPJS"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchOverview()}
            disabled={isFetching}
            className="gap-1.5"
            title="Segarkan data laporan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ─── 1. Top Period Selector Bar ────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/15">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/15 text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Periode Laporan Aktif
              </span>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {periodLabel}
              </p>
            </div>
          </div>

          {/* Quick Presets & Custom Date Pickers */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-card p-1 rounded-xl border border-border">
              {[
                { id: 'HARI_INI', label: 'Hari Ini' },
                { id: '7_HARI', label: '7 Hari' },
                { id: 'BULAN_INI', label: 'Bulan Ini' },
                { id: 'BULAN_LALU', label: 'Bulan Lalu' },
                { id: 'CUSTOM', label: 'Kustom' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodPreset(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    periodPreset === p.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers (Shown if CUSTOM selected) */}
            {periodPreset === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-8 text-xs rounded-lg border border-border bg-card px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground">s/d</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-8 text-xs rounded-lg border border-border bg-card px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
        </div>

        {/* ─── 2. Top Executive KPI Summary Cards ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm hover:border-border/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Kunjungan</span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-foreground mt-2">
              {overview.totalVisits} <span className="text-xs font-semibold text-muted-foreground">Pasien</span>
            </p>
            <p className="text-[11px] text-primary font-medium mt-0.5">
              {overview.newPatients} pasien baru terdaftar
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm hover:border-border/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Penerimaan Kasir</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
              {formatRupiah(overview.totalRevenue)}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {overview.totalTransactions} pembayaran lunas
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm hover:border-border/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Resep Obat Farmasi</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <Pill className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-foreground mt-2">
              {overview.totalDispensedPrescriptions} <span className="text-xs font-semibold text-muted-foreground">Resep</span>
            </p>
            <p className="text-[11px] text-blue-600 font-medium mt-0.5">
              Obat tuntas diserahkan
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm hover:border-border/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Kunjungan BPJS</span>
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400 mt-2">
              {overview.bpjsVisits} <span className="text-xs font-semibold text-muted-foreground">Peserta</span>
            </p>
            <p className="text-[11px] text-teal-600 font-medium mt-0.5">
              {overview.totalVisits > 0 ? `${((overview.bpjsVisits / overview.totalVisits) * 100).toFixed(0)}% dari total kunjungan` : '-'}
            </p>
          </div>
        </div>

        {/* ─── 3. Main Reports Tab Bar ────────────────────────────────────────── */}
        <div className="border-b border-border pb-1">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'visits', label: 'Kunjungan Pasien', icon: Users },
              { id: 'revenue', label: 'Pendapatan Kasir', icon: Receipt },
              { id: 'morbidity', label: '10 Besar Penyakit', icon: Activity },
              { id: 'pharmacy', label: 'Farmasi & Stok', icon: Pill },
              { id: 'bpjs', label: 'Pelayanan BPJS', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isActive
                      ? 'bg-card text-primary shadow-sm border border-border/80 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span>{tab.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── 4. Active Report Tab View ──────────────────────────────────────── */}
        <div className="min-h-[400px]">
          {activeTab === 'visits' && (
            <VisitsReportTab
              startDate={startDate}
              endDate={endDate}
              periodLabel={periodLabel}
            />
          )}

          {activeTab === 'revenue' && (
            <RevenueReportTab
              startDate={startDate}
              endDate={endDate}
              periodLabel={periodLabel}
            />
          )}

          {activeTab === 'morbidity' && (
            <MorbidityReportTab
              startDate={startDate}
              endDate={endDate}
              periodLabel={periodLabel}
            />
          )}

          {activeTab === 'pharmacy' && (
            <PharmacyReportTab
              startDate={startDate}
              endDate={endDate}
              periodLabel={periodLabel}
            />
          )}

          {activeTab === 'bpjs' && (
            <BpjsReportTab
              startDate={startDate}
              endDate={endDate}
              periodLabel={periodLabel}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
