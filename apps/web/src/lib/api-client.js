import axios from 'axios'

/**
 * Axios instance yang dikonfigurasi untuk API KRIZA.
 * Base URL otomatis menggunakan VITE_API_URL dari env,
 * atau proxy '/api' di development.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/v1`
    : '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Penting untuk httpOnly cookie (refresh token)
  timeout: 10000,
})

// ─── Request Interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // Access token akan ditambahkan di sini setelah Fase 1 (auth)
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response Interceptor ────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 401 handling untuk token refresh akan diimplementasikan di Fase 1
    if (error.response?.status === 401) {
      // TODO Fase 1: attempt token refresh, redirect to login jika gagal
      console.warn('Unauthorized — login diperlukan')
    }

    return Promise.reject(error)
  }
)

export default apiClient
