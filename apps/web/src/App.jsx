import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import MasterDataPage from '@/features/master/MasterDataPage'
import PatientsPage from '@/features/patients/PatientsPage'
import RegistrationsPage from '@/features/registrations/RegistrationsPage'
import NotFoundPage from '@/pages/NotFoundPage'

function App() {
  return (
    <Routes>
      {/* Public: halaman login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected: semua halaman klinik membutuhkan login */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Master Data Management */}
      <Route
        path="/master"
        element={
          <ProtectedRoute>
            <MasterDataPage />
          </ProtectedRoute>
        }
      />

      {/* Patients Management (Fase 3) */}
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <PatientsPage />
          </ProtectedRoute>
        }
      />

      {/* Registrasi Kunjungan & Antrian (Fase 4) */}
      <Route
        path="/registrations"
        element={
          <ProtectedRoute>
            <RegistrationsPage />
          </ProtectedRoute>
        }
      />

      {/* Default: redirect ke dashboard (akan diarahkan ke login jika belum auth) */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
