import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import MasterDataPage from '@/features/master/MasterDataPage'
import PatientsPage from '@/features/patients/PatientsPage'
import RegistrationsPage from '@/features/registrations/RegistrationsPage'
import EncountersPage from '@/features/encounters/EncountersPage'
import PharmacyPage from '@/features/pharmacy/PharmacyPage'
import BillingPage from '@/features/billing/BillingPage'
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

      {/* Patients Management (Terintegrasi ke dalam Master Data) */}
      <Route
        path="/patients"
        element={<Navigate to="/master?tab=patients" replace />}
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

      {/* Rekam Medis Elektronik / RME SOAP (Fase 5) */}
      <Route
        path="/encounters"
        element={
          <ProtectedRoute>
            <EncountersPage />
          </ProtectedRoute>
        }
      />

      {/* Farmasi, Resep Elektronik & Stok (Fase 6) */}
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute>
            <PharmacyPage />
          </ProtectedRoute>
        }
      />

      {/* Kasir, Billing & Pembayaran (Fase 7) */}
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <BillingPage />
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
