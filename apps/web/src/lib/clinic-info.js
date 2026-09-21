/**
 * INFORMASI RESMI KLINIK RIZANI
 * ─────────────────────────────────────────────────────────────────────────────
 * Sumber kebenaran tunggal untuk informasi klinik yang digunakan di seluruh
 * aplikasi: kop surat, kuitansi, etiket obat, footer dokumen, dll.
 *
 * Jika ada perubahan data klinik, cukup update file ini — semua dokumen
 * yang mengimpor dari sini akan otomatis terupdate.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const CLINIC_INFO = {
  name: 'Klinik Rizani',
  legalName: 'KLINIK RIZANI',
  address: 'Jalan Raya Surabaya - Situbondo KM 136 Sumberanyar Paiton',
  city: 'Paiton, Probolinggo',
  province: 'Jawa Timur',

  /** Nomor telepon utama (PSTN) */
  phone: '(0335) 773204',
  /** Nomor HP / WhatsApp */
  mobile: '081333352620',
  /** Alamat email resmi klinik */
  email: 'klinikrizani@gmail.com',

  /** Untuk keperluan tanda-tangan & tanggal di dokumen cetak */
  cityForSignature: 'Paiton',

  /** Path asset logo (relative ke /public) */
  logoPath: '/icon_klinik.png',
};

/**
 * Format baris kontak untuk kop surat / header dokumen cetak.
 * Contoh output:
 *   "TELP (0335) 773204 • HP 081333352620 • klinikrizani@gmail.com"
 */
export function formatClinicContact() {
  const { phone, mobile, email } = CLINIC_INFO;
  return `TELP ${phone} • HP ${mobile} • ${email}`;
}
