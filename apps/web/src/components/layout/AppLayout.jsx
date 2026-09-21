import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Stethoscope,
  Pill,
  Receipt,
  BarChart3,
  Database,
  LogOut,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/api-client';

const NAVIGATION_ITEMS = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    active: true,
    permission: null, // Terbuka untuk semua user yang login
  },
  {
    name: 'Pendaftaran & Antrian',
    path: '/registrations',
    icon: ClipboardList,
    active: true,
    fase: 'Fase 4',
    permission: 'registrations:read',
  },
  {
    name: 'Rekam Medis (EMR)',
    path: '/encounters',
    icon: Stethoscope,
    active: true,
    fase: 'Fase 5',
    permission: 'encounters:read',
  },
  {
    name: 'Farmasi & Obat',
    path: '/pharmacy',
    icon: Pill,
    active: true,
    fase: 'Fase 6',
    permission: 'pharmacy:read',
  },
  {
    name: 'Kasir & Billing',
    path: '/billing',
    icon: Receipt,
    active: true,
    fase: 'Fase 7',
    permission: 'billing:read',
  },
  {
    name: 'Laporan',
    path: '/reports',
    icon: BarChart3,
    active: true,
    fase: 'Fase 8',
    permission: 'reports:read',
  },
  {
    name: 'Master Data',
    path: '/master',
    icon: Database,
    active: true,
    fase: 'Fase 2',
    permission: 'masterdata:read',
  },
];

export default function AppLayout({ children, title, subtitle, actions }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  // API Health status
  const { data: health, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await apiClient.get(`${apiUrl}/health`, { baseURL: '' });
      return res.data;
    },
    retry: false,
    staleTime: 30000,
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ─── 1. TOP HEADER (Branding, Live Status, Profile, Logout) ─────────── */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo & Klinik Name */}
          <div className="flex items-center gap-3">
            <img
              src="/icon_klinik.png"
              alt="Icon Klinik KRIZA"
              className="w-9 h-9 object-contain shrink-0 rounded-lg drop-shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-foreground text-sm tracking-tight leading-none">
                  KRIZA SIMRS
                </h1>
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">
                  v0.8.0
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Sistem Informasi Manajemen Klinik & Rekam Medis Elektronik
              </p>
            </div>
          </div>

          {/* Right Area: Status, User, Logout */}
          <div className="flex items-center gap-4">
            {/* System Live Status */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                isError
                  ? 'bg-destructive/10 text-destructive'
                  : health
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isError ? 'bg-destructive' : health ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
                }`}
              />
              {isError ? 'API Offline' : health ? 'Sistem Online' : 'Memeriksa...'}
            </div>

            {/* Date info */}
            <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground border-l border-border pl-4">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-2.5 border-l border-border pl-4">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-foreground leading-none">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                    {user.roles?.[0] || 'Staff'}
                  </p>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Keluar dari sistem"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. DEDICATED NAVBAR (Distinct Sub-Bar for Menu Navigation) ──────── */}
      <nav className="border-b border-border bg-muted/40 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto py-1.5 no-scrollbar">
          {(() => {
            const userRoles = user?.roles || [];
            const userPermissions = user?.permissions || [];
            const isAdmin = userRoles.includes('admin');

            const visibleItems = NAVIGATION_ITEMS.filter((item) => {
              if (!item.permission) return true;
              if (isAdmin) return true;
              return userPermissions.includes(item.permission);
            });

            return visibleItems.map((item) => {
              const Icon = item.icon;
              const isCurrent = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            if (!item.active) {
              return (
                <div
                  key={item.name}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-muted-foreground/50 cursor-not-allowed shrink-0 select-none"
                  title={`${item.name} (${item.fase} - Belum Aktif)`}
                >
                  <Icon className="w-4 h-4 opacity-50" />
                  <span>{item.name}</span>
                  <span className="text-[9px] bg-muted px-1.5 py-0.2 rounded text-muted-foreground/60">
                    {item.fase}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  isCurrent
                    ? 'bg-card text-primary shadow-sm font-semibold border border-border/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{item.name}</span>
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </Link>
              );
            });
          })()}
        </div>
      </nav>

      {/* ─── 3. PAGE HEADER (Optional Title & Action Buttons) ───────────────── */}
      {(title || actions) && (
        <div className="bg-card/50 border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </div>
      )}

      {/* ─── 4. MAIN PAGE CONTENT ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
