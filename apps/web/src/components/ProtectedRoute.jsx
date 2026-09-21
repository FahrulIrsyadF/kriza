import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * Membungkus route yang butuh auth dan hak akses (RBAC).
 * Jika belum login → redirect ke /login.
 * Jika tidak punya izin yang diminta → redirect ke /dashboard.
 */
function ProtectedRoute({ children, requiredPermission }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Memverifikasi sesi...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Simpan URL yang dituju agar bisa redirect balik setelah login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Pengecekan izin (RBAC) jika rute membutuhkan permission tertentu
  if (requiredPermission) {
    const userRoles = user?.roles || []
    const userPermissions = user?.permissions || []
    const isAdmin = userRoles.includes('admin')
    const hasAccess = isAdmin || userPermissions.includes(requiredPermission)

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

export default ProtectedRoute
