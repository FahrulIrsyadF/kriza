import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Mail,
  Clock,
  Hash,
  ShieldCheck,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/api-client';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password baru wajib diisi'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok dengan password baru',
    path: ['confirmPassword'],
  });

export default function ProfilePage() {
  const { user } = useAuth();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPasswordValue = watch('newPassword', '');

  // Indikator kekuatan password sederhana
  const hasMinLen = newPasswordValue.length >= 6;
  const hasNumber = /\d/.test(newPasswordValue);
  const hasLetter = /[a-zA-Z]/.test(newPasswordValue);

  const onSubmit = async (data) => {
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await apiClient.put('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      setSuccessMessage(res.data?.data?.message || 'Password berhasil diperbarui.');
      reset();
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        'Gagal mengubah password. Pastikan password saat ini sudah benar.';
      setErrorMessage(msg);
    }
  };

  const getRoleVariant = (role) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'dokter':
        return 'default';
      case 'perawat':
        return 'success';
      case 'farmasi':
        return 'purple';
      case 'kasir':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <AppLayout
      title="Profil Pengguna"
      subtitle="Kelola informasi akun dan pengaturan keamanan sistem"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── KARTU KIRI: Informasi Akun & Hak Akses ───────────────────────── */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl shadow-inner">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <CardTitle className="text-base">{user?.name || 'Pengguna'}</CardTitle>
                  <CardDescription className="text-xs mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono text-foreground font-medium">@{user?.username}</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-medium">Aktif</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Role Badges */}
              <div>
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Peran & Akses Sistem
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {user?.roles?.map((role) => (
                    <Badge key={role} variant={getRoleVariant(role)} className="capitalize px-2 py-0.5">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 py-2 border-t border-border/50">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground">Alamat Email</p>
                  <p className="font-medium text-foreground truncate">{user?.email || 'Belum diisi'}</p>
                </div>
              </div>

              {/* Data Praktisi Medis (Jika Akun Dokter) */}
              {user?.practitioner && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Informasi Tenaga Medis</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Kode Dokter</span>
                      <span className="font-mono font-medium text-foreground">{user.practitioner.code}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Spesialisasi</span>
                      <span className="font-medium text-foreground">{user.practitioner.specialization || 'Umum'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-[10px]">Nomor SIP</span>
                      <span className="font-mono text-foreground">{user.practitioner.sip || 'Dalam proses SIP'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Informasi Sesi Keamanan */}
              <div className="flex items-center gap-3 py-2 border-t border-border/50 text-[11px] text-muted-foreground">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Kebijakan Sesi Otomatis</p>
                  <p className="text-[10px]">Sesi login kedaluwarsa otomatis setiap tengah malam (WIB).</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips Keamanan Akun */}
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-900 dark:text-blue-300 text-xs flex gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-semibold text-blue-950 dark:text-blue-200">Keamanan Akun Medis</p>
              <p className="text-[11px] text-blue-900/80 dark:text-blue-300/80">
                Sesuai standar Permenkes RME, jangan membagikan kredensial login kepada pihak lain. Segera perbarui password default setelah akun pertama kali digunakan.
              </p>
            </div>
          </div>
        </div>

        {/* ─── KARTU KANAN: Form Ganti Password ─────────────────────────────── */}
        <div className="lg:col-span-7">
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Ganti Password</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Masukkan password saat ini dan tentukan password baru yang aman.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Alert Feedback Sukses */}
              {successMessage && (
                <div className="mb-5 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 text-xs animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Alert Feedback Error */}
              {errorMessage && (
                <div className="mb-5 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2.5 text-xs animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* 1. Password Lama */}
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Password Saat Ini</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="Masukkan password saat ini"
                      className="pr-10"
                      {...register('currentPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      tabIndex={-1}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="text-[11px] text-destructive">{errors.currentPassword.message}</p>
                  )}
                </div>

                {/* 2. Password Baru */}
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      className="pr-10"
                      {...register('newPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      tabIndex={-1}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-[11px] text-destructive">{errors.newPassword.message}</p>
                  )}

                  {/* Checklist Kekuatan Password */}
                  {newPasswordValue.length > 0 && (
                    <div className="flex items-center gap-4 text-[10px] pt-1 text-muted-foreground">
                      <span className={`flex items-center gap-1 ${hasMinLen ? 'text-emerald-600 font-medium' : ''}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hasMinLen ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
                        Min. 6 karakter
                      </span>
                      <span className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-600 font-medium' : ''}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hasLetter ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
                        Huruf
                      </span>
                      <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 font-medium' : ''}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
                        Angka
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Konfirmasi Password Baru */}
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Ulangi password baru"
                      className="pr-10"
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-border/50">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => {
                      reset();
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmitting} className="min-w-32">
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-1.5" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Password'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
