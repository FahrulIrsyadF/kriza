import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-8xl font-bold text-primary/20">404</p>
        <h1 className="text-2xl font-semibold text-foreground mt-2">Halaman tidak ditemukan</h1>
        <p className="text-muted-foreground mt-2">
          Halaman yang kamu cari tidak ada atau sudah dipindahkan.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage
