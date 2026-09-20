import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Calendar,
  Activity,
  Clock,
  ChevronRight,
  Building2,
  UserPlus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/api-client';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GeneralRevenueSection } from './GeneralRevenueSection';

const FASE_PROGRESS = [
  { fase: '0', nama: 'Scaffolding & Fondasi', status: 'done' },
  { fase: '1', nama: 'Auth, RBAC, Audit Trail', status: 'done' },
  { fase: '2', nama: 'Master Data (Poli, Dokter, Tarif, Obat)', status: 'done' },
  { fase: '3', nama: 'Manajemen Pasien & Wilayah (RME)', status: 'done' },
  { fase: '4', nama: 'Registrasi & Antrian Poli', status: 'done' },
  { fase: '5', nama: 'Encounter & Rekam Medis (SOAP)', status: 'done' },
  { fase: '6', nama: 'Resep & Farmasi', status: 'done' },
  { fase: '7', nama: 'Billing & Pembayaran', status: 'done' },
];

function StatCard({ icon: Icon, label, value, color, linkTo }) {
  const content = (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className={`p-3.5 rounded-xl ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5 font-mono">{value}</p>
      </div>
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }

  return content;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().substring(0, 10);

  const { data: polyclinics = [] } = useQuery({
    queryKey: ['polyclinics'],
    queryFn: async () => {
      const res = await apiClient.get('/master/polyclinics');
      return res.data.data.items || [];
    },
  });

  const { data: totalPatients = 0 } = useQuery({
    queryKey: ['total-patients'],
    queryFn: async () => {
      const res = await apiClient.get('/patients', { params: { limit: 1 } });
      return res.data.data.pagination.total || 0;
    },
  });

  // Query antrian & registrasi hari ini untuk mengisi stat card
  const { data: todayRegsData } = useQuery({
    queryKey: ['today-registrations', todayStr],
    queryFn: async () => {
      const res = await apiClient.get('/registrations', { params: { date: todayStr, limit: 100 } });
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const todayRegs = Array.isArray(todayRegsData?.items)
    ? todayRegsData.items
    : Array.isArray(todayRegsData)
    ? todayRegsData
    : [];
  const totalRegsToday = todayRegsData?.pagination?.total ?? todayRegs.length;
  const activeEncounters = todayRegs.filter((r) => r.status === 'DIPERIKSA').length;
  const waitingQueue = todayRegs.filter((r) => r.status === 'MENUNGGU').length;

  return (
    <AppLayout>
      {/* Greeting Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/15">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Selamat Datang{user ? `, ${user.name}` : ''}! 👋
            </h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
              {user?.roles?.[0] || 'Staff'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2">
            <span>Sesi aktif hingga tengah malam WIB</span>
            <span>•</span>
            <span className="text-foreground font-medium">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/patients"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Pendaftaran Pasien
          </Link>
          <Link
            to="/master"
            className="inline-flex items-center gap-2 border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Building2 className="w-4 h-4" />
            Master Data
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Total Pasien Terdaftar"
          value={totalPatients}
          color="bg-primary/15 text-primary"
          linkTo="/patients"
        />
        <StatCard
          icon={Calendar}
          label="Total Registrasi Hari Ini"
          value={totalRegsToday}
          color="bg-green-500/15 text-green-700"
          linkTo="/registrations"
        />
        <StatCard
          icon={Activity}
          label="Encounter Aktif (SOAP)"
          value={activeEncounters}
          color="bg-purple-500/15 text-purple-700"
          linkTo="/encounters"
        />
        <StatCard
          icon={Clock}
          label="Antrian Menunggu"
          value={waitingQueue}
          color="bg-orange-500/15 text-orange-700"
          linkTo="/registrations"
        />
      </div>

      {/* ─── Laporan Keuangan Harian Pasien Umum ──────────────────────────────── */}
      <GeneralRevenueSection />

      {/* Main Grid: Poli & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Poli list */}
        <Card className="rounded-2xl">
          <CardHeader className="py-4 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Unit Pelayanan / Poliklinik
              </span>
              <Link to="/master" className="text-xs font-normal text-primary hover:underline">
                Kelola
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {polyclinics.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">Belum ada poli aktif</p>
            ) : (
              polyclinics.map((poly) => (
                <Link
                  key={poly.id}
                  to="/master"
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/80 transition-colors group border border-border/50"
                >
                  <div>
                    <p className="text-xs font-bold text-foreground">{poly.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{poly.code}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Development progress */}
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="py-4 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              Roadmap Pengembangan SIMRS KRIZA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {FASE_PROGRESS.map((item) => (
              <div
                key={item.fase}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                  item.status === 'done' ? 'bg-green-500/5 border border-green-500/15' : 'bg-muted/30'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                    item.status === 'done'
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {item.status === 'done' ? '✓' : item.fase}
                </div>
                <div>
                  <p
                    className={`text-xs font-semibold ${
                      item.status === 'done' ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    Fase {item.fase} — {item.nama}
                  </p>
                </div>
                {item.status === 'done' && (
                  <span className="ml-auto text-[10px] text-green-700 font-bold bg-green-500/15 px-2 py-0.5 rounded-md">
                    Selesai
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
