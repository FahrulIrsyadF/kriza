const { z } = require('zod');

// ─── Patient Creation / Update Schema ─────────────────────────────────────────

const createPatientSchema = z.object({
  // Medrec: 6 digit angka murni (000001–999999). Jika kosong, auto-generate di backend.
  medicalRecordNumber: z
    .string()
    .regex(/^\d{6}$/, 'Nomor Rekam Medis harus tepat 6 digit angka (contoh: 000123)')
    .optional(),

  
  // Data Utama
  name: z.string().min(1, 'Nama pasien wajib diisi').max(255),
  identityType: z.enum(['KTP', 'SIM', 'PASPOR', 'KIA', 'BPJS', 'LAINNYA']).default('KTP'),
  identityNumber: z.string().max(50).optional().nullable(),
  gender: z.enum(['Laki-laki', 'Perempuan', 'L', 'P'], { required_error: 'Jenis kelamin wajib dipilih' }),
  birthPlace: z.string().max(100).optional().nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal lahir harus YYYY-MM-DD'),
  bloodType: z.string().max(10).default('-'),
  rhesus: z.string().max(5).default('+'),

  // Alamat & Wilayah
  address: z.string().optional().nullable(), // Alamat KTP
  residenceAddress: z.string().optional().nullable(), // Tempat Tinggal Sekarang
  provinsiId: z.coerce.number().int().optional().nullable(),
  kabupatenId: z.coerce.number().int().optional().nullable(),
  kecamatanId: z.coerce.number().int().optional().nullable(),
  kelurahanId: z.coerce.number().int().optional().nullable(),

  // Sosial & Demografi
  education: z.string().max(50).optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  nationality: z.string().max(30).default('WNI'),
  religion: z.string().max(50).optional().nullable(),
  ethnicity: z.string().max(50).default('JAWA'),
  maritalStatus: z.string().max(50).default('BELUM MENIKAH'),
  phone: z.string().max(30).optional().nullable(),
  parentName: z.string().max(255).optional().nullable(),
  language: z.string().max(50).default('INDONESIA'),

  // Penjamin
  insuranceType: z.enum(['UMUM', 'BPJS', 'ASURANSI']).default('UMUM'),
  bpjsNumber: z.string().max(50).optional().nullable(),
  noKk: z.string().max(50).optional().nullable(),
  ihsNumber: z.string().max(50).optional().nullable(),

  // Catatan Medis & Alergi
  allergiesNotes: z.string().optional().nullable(),
  chronicDiseasesNotes: z.string().optional().nullable(),
  isDeceased: z.boolean().default(false),
  isActive: z.boolean().default(true),

  // Nested Lists (Opsional)
  allergies: z.array(
    z.object({
      allergenType: z.string().default('Obat'),
      allergenName: z.string().min(1, 'Nama alergen wajib diisi'),
      severity: z.string().default('Sedang'),
      reaction: z.string().optional().nullable(),
    })
  ).optional(),

  emergencyContacts: z.array(
    z.object({
      name: z.string().min(1, 'Nama kontak wajib diisi'),
      relationship: z.string().min(1, 'Hubungan wajib diisi'),
      phone: z.string().min(1, 'Nomor telepon wajib diisi'),
      address: z.string().optional().nullable(),
    })
  ).optional(),
});

const updatePatientSchema = createPatientSchema.partial();

// ─── Query Filter Schema ─────────────────────────────────────────────────────

const patientListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(), // Multi-field search (Medrec, Nama, NIK, Telepon, BPJS)
  gender: z.string().optional(),
  insuranceType: z.string().optional(),
  provinsiId: z.coerce.number().int().optional(),
  kabupatenId: z.coerce.number().int().optional(),
  isActive: z.enum(['true', 'false', 'all']).default('all'),
});

module.exports = {
  createPatientSchema,
  updatePatientSchema,
  patientListQuerySchema,
};
