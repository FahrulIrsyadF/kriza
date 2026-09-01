const { z } = require('zod');

// ─── Sumber Pendaftaran ───────────────────────────────────────────────────────
const REGISTRATION_SOURCES = ['LANGSUNG', 'TELEPON', 'MJKN', 'ONLINE_OWN'];

// ─── Metode Pembayaran ────────────────────────────────────────────────────────
const PAYMENT_METHODS = ['UMUM', 'BPJS', 'ASURANSI_SWASTA', 'GRATIS', 'CORPORATE'];

// ─── Status Registrasi ────────────────────────────────────────────────────────
const REGISTRATION_STATUSES = ['MENUNGGU', 'DIPANGGIL', 'DIPERIKSA', 'SELESAI', 'BATAL', 'LEWAT', 'RUJUK_KELUAR'];

// ─── Jenis Kunjungan ──────────────────────────────────────────────────────────
const VISIT_TYPES = ['BARU', 'LAMA'];

/**
 * Schema untuk membuat registrasi kunjungan baru.
 * Mengakomodasi semua sumber: LANGSUNG, TELEPON, MJKN, ONLINE_OWN
 */
const createRegistrationSchema = z.object({
  // Wajib
  patientId: z.string().uuid('ID Pasien tidak valid'),
  polyclinicId: z.string().uuid('ID Poliklinik tidak valid'),

  // Opsional — bisa auto-detect dari jadwal
  practitionerId: z.string().uuid('ID Dokter tidak valid').nullable().optional(),
  scheduleId: z.string().uuid('ID Jadwal tidak valid').nullable().optional(),

  // Tanggal Registrasi (default hari ini jika tidak diisi)
  registrationDate: z.string().optional(),

  // Sumber Pendaftaran
  registrationSource: z.enum(REGISTRATION_SOURCES).default('LANGSUNG'),

  // Pembayaran
  paymentMethod: z.enum(PAYMENT_METHODS).default('UMUM'),
  bpjsCardNumber: z.string().max(50).optional().nullable(),
  insuranceName: z.string().max(100).optional().nullable(),
  insurancePolicyNumber: z.string().max(50).optional().nullable(),
  referralNumber: z.string().max(50).optional().nullable(),
  referralFrom: z.string().max(255).optional().nullable(),

  // Klinis
  complaint: z.string().max(2000).optional().nullable(),
  vitalSignsNotes: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),

  // MJKN Bridging Fields
  // Diisi oleh integrasi MJKN di masa depan, atau bisa diisi manual oleh petugas
  mjknBookingCode: z.string().max(100).optional().nullable(),
  mjknAppointmentDate: z.string().optional().nullable(),
  mjknAppointmentTime: z.string().max(10).optional().nullable(),
  mjknQueueNumber: z.string().max(20).optional().nullable(),
  mjknRawPayload: z.string().optional().nullable(),  // JSON string dari MJKN webhook

  // Override otomatis — jika true, skip validasi duplikat & kuota
  // Digunakan untuk kasus khusus (walk-in emergency, dll)
  forceRegister: z.boolean().default(false).optional(),
});

const updateRegistrationSchema = z.object({
  practitionerId: z.string().uuid().optional().nullable(),
  scheduleId: z.string().uuid().optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  bpjsCardNumber: z.string().max(50).optional().nullable(),
  insuranceName: z.string().max(100).optional().nullable(),
  insurancePolicyNumber: z.string().max(50).optional().nullable(),
  referralNumber: z.string().max(50).optional().nullable(),
  referralFrom: z.string().max(255).optional().nullable(),
  complaint: z.string().max(2000).optional().nullable(),
  vitalSignsNotes: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  estimatedTime: z.string().max(10).optional().nullable(),
});

const cancelRegistrationSchema = z.object({
  cancellationReason: z.string().max(500).optional().nullable(),
});

const updateQueueStatusSchema = z.object({
  action: z.enum(['PANGGIL', 'PERIKSA', 'SELESAI', 'LEWAT', 'PANGGIL_ULANG']),
  counterName: z.string().max(50).optional().nullable(),
});

const listRegistrationQuerySchema = z.object({
  date: z.string().optional(),
  polyclinicId: z.string().uuid().optional(),
  practitionerId: z.string().uuid().optional(),
  status: z.enum([...REGISTRATION_STATUSES, '']).optional(),
  source: z.enum([...REGISTRATION_SOURCES, '']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const todayQueueQuerySchema = z.object({
  polyclinicId: z.string().uuid().optional(),
  date: z.string().optional(),
});

module.exports = {
  createRegistrationSchema,
  updateRegistrationSchema,
  cancelRegistrationSchema,
  updateQueueStatusSchema,
  listRegistrationQuerySchema,
  todayQueueQuerySchema,
  REGISTRATION_SOURCES,
  PAYMENT_METHODS,
  REGISTRATION_STATUSES,
  VISIT_TYPES,
};
