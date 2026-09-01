import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
})

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState(null)

  const from = location.state?.from?.pathname || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data) => {
    setApiError(null)
    try {
      await login(data.username, data.password)
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        'Terjadi kesalahan. Periksa koneksi dan coba lagi.'
      setApiError(msg)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <img
            src="/logo_klinik.png"
            alt="Logo Klinik KRIZA"
            className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-md"
          />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">KRIZA</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistem Informasi Manajemen Klinik & RME</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-1">Masuk ke Sistem</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Sesi aktif hingga tengah malam WIB
          </p>

          {/* API Error */}
          {apiError && (
            <div className="flex items-start gap-2.5 bg-destructive/10 text-destructive rounded-lg p-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                placeholder="Masukkan username"
                className={`w-full h-10 px-3 rounded-lg border bg-background text-foreground text-sm placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors
                  ${errors.username ? 'border-destructive focus:ring-destructive/30' : 'border-input'}`}
                {...register('username')}
              />
              {errors.username && (
                <p className="text-destructive text-xs mt-1">{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  className={`w-full h-10 px-3 pr-10 rounded-lg border bg-background text-foreground text-sm placeholder:text-muted-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors
                    ${errors.password ? 'border-destructive focus:ring-destructive/30' : 'border-input'}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium
                hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 transition-colors mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Masuk
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          KRIZA SIMRS © {new Date().getFullYear()} — Sesi direset setiap tengah malam
        </p>
      </div>
    </div>
  )
}

export default LoginPage
