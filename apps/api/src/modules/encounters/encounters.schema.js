const { z } = require('zod');

// ─── Enums & Constants ────────────────────────────────────────────────────────
const CONSCIOUSNESS_OPTIONS = ['Compos Mentis', 'Apatis', 'Somnolen', 'Sopor', 'Koma'];
const TRIAGE_OPTIONS = ['HIJAU', 'KUNING', 'MERAH', 'HITAM'];
const DIAGNOSIS_TYPES = ['PRIMARY', 'SECONDARY', 'COMPLICATION'];
const DIAGNOSIS_CASES = ['BARU', 'LAMA'];
const DISPOSITION_TYPES = [
  'PULANG_BEROBAT_JALAN',
  'RUJUK_INTERNAL',
  'RUJUK_EKSTERNAL',
  'KONTROL_ULANG',
  'MENINGGAL',
  'PULANG_PAKSA',
];
const REFERRAL_TYPES = ['INTERNAL', 'EXTERNAL'];
const PROGNOSIS_OPTIONS = ['Bonam', 'Malam', 'Dubia ad Bonam', 'Dubia ad Malam'];

// ─── 1. Start Encounter Schema ────────────────────────────────────────────────
const startEncounterSchema = z.object({
  registrationId: z.string().uuid('ID Registrasi tidak valid'),
  practitionerId: z.string().uuid('ID Dokter tidak valid').optional(),
});

const emptyToNull = (val) => (val === '' || val === undefined || val === null ? null : val);

// ─── 2. Update Vital Signs Schema ─────────────────────────────────────────────
const updateVitalSignsSchema = z.object({
  systolic: z.preprocess(
    emptyToNull,
    z.coerce.number({ invalid_type_error: 'Tekanan Sistol harus berupa angka' })
      .int('Tekanan Sistol harus berupa bilangan bulat')
      .min(40, 'Tekanan Sistol minimal 40 mmHg')
      .max(300, 'Tekanan Sistol maksimal 300 mmHg')
      .nullable()
      .optional()
  ),
  diastolic: z.preprocess(
    emptyToNull,
    z.coerce.number({ invalid_type_error: 'Tekanan Diastol harus berupa angka' })
      .int('Tekanan Diastol harus berupa bilangan bulat')
      .min(20, 'Tekanan Diastol minimal 20 mmHg')
      .max(200, 'Tekanan Diastol maksimal 200 mmHg')
      .nullable()
      .optional()
  ),
  heartRate: z.preprocess(
    emptyToNull,
    z.coerce.number({ invalid_type_error: 'Denyut Nadi harus berupa angka' })
      .int('Denyut Nadi harus berupa bilangan bulat')
      .min(20, 'Denyut Nadi minimal 20 x/m')
      .max(250, 'Denyut Nadi maksimal 250 x/m')
      .nullable()
      .optional()
  ),
  respiratoryRate: z.preprocess(
    emptyToNull,
    z.coerce.number({ invalid_type_error: 'Laju Nafas harus berupa angka' })
      .int('Laju Nafas harus berupa bilangan bulat')
      .min(5, 'Laju Nafas minimal 5 x/m')
      .max(80, 'Laju Nafas maksimal 80 x/m')
      .nullable()
      .optional()
  ),
  temperature: z.preprocess(
    emptyToNull,
    z.coerce.number({ invalid_type_error: 'Suhu Tubuh harus berupa angka' })
      .min(30.0, 'Suhu Tubuh minimal 30.0 °C')
      .max(45.0, 'Suhu Tubuh maksimal 45.0 °C')
      .nullable()
      .optional()
  ),
  oxygenSaturation: z.preprocess(
    emptyToNull,
    z.coerce.number({ invalid_type_error: 'Saturasi Oksigen (SpO2) harus berupa angka' })
      .int('Saturasi Oksigen (SpO2) harus berupa bilangan bulat')
      .min(40, 'Saturasi Oksigen (SpO2) minimal 40%')
      .max(100, 'Saturasi Oksigen (SpO2) maksimal 100%')
      .nullable()
      .optional()
  ),
  weight: z.preprocess(
    emptyToNull,
    z.coerce.number({ invalid_type_error: 'Berat Badan (BB) harus berupa angka' })
      .min(0.5, 'Berat Badan (BB) minimal 0.5 kg')
      .max(350, 'Berat Badan (BB) maksimal 350 kg')
      .nullable()
      .optional()
  ),
  height: z.preprocess(
    emptyToNull,
    z.coerce.number({ invalid_type_error: 'Tinggi Badan (TB) harus berupa angka' })
      .min(20, 'Tinggi Badan (TB) minimal 20 cm')
      .max(250, 'Tinggi Badan (TB) maksimal 250 cm')
      .nullable()
      .optional()
  ),
  waistCircumference: z.preprocess(
    emptyToNull,
    z.coerce.number({ invalid_type_error: 'Lingkar Perut harus berupa angka' })
      .min(10, 'Lingkar Perut minimal 10 cm')
      .max(200, 'Lingkar Perut maksimal 200 cm')
      .nullable()
      .optional()
  ),
  consciousness: z.preprocess(
    emptyToNull,
    z.enum(CONSCIOUSNESS_OPTIONS, { errorMap: () => ({ message: 'Pilihan Tingkat Kesadaran tidak valid' }) })
      .default('Compos Mentis')
      .optional()
  ),
  triage: z.preprocess(
    emptyToNull,
    z.enum(TRIAGE_OPTIONS, { errorMap: () => ({ message: 'Pilihan Triase tidak valid' }) })
      .default('HIJAU')
      .optional()
  ),
  physicalExamNotes: z.preprocess(
    emptyToNull,
    z.string().max(2000, 'Catatan Pemeriksaan Fisik maksimal 2000 karakter').nullable().optional()
  ),
});

// ─── 3. Update SOAP Schema ────────────────────────────────────────────────────
const updateSoapSchema = z.object({
  subjective: z.string().min(1, 'Subjektif (Keluhan/Anamnesis) wajib diisi').max(4000),
  objective: z.string().min(1, 'Objektif (Pemeriksaan Fisik/Status Lokalis) wajib diisi').max(4000),
  assessment: z.string().max(4000).nullable().optional(),
  plan: z.string().max(4000).nullable().optional(),
  prognosis: z.enum(PROGNOSIS_OPTIONS).default('Bonam').optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// ─── 4. Add Diagnosis Schema ──────────────────────────────────────────────────
const addDiagnosisSchema = z.object({
  icd10Code: z.string().min(1, 'Kode ICD-10 wajib diisi').max(20),
  icd10Name: z.string().min(1, 'Nama diagnosa wajib diisi').max(255),
  diagnosisType: z.enum(DIAGNOSIS_TYPES).default('PRIMARY'),
  diagnosisCase: z.enum(DIAGNOSIS_CASES).default('BARU'),
  notes: z.string().max(500).nullable().optional(),
});

// ─── 5. Add Procedure Schema ──────────────────────────────────────────────────
const addProcedureSchema = z.object({
  procedureId: z.preprocess((val) => (val === '' ? null : val), z.string().uuid().nullable().optional()),
  procedureCode: z.preprocess((val) => (val === '' ? null : val), z.string().max(30).nullable().optional()),
  procedureName: z.string().min(1, 'Nama tindakan wajib diisi').max(255),
  quantity: z.coerce.number().int().min(1).default(1),
  tariff: z.coerce.number().min(0).default(0),
  notes: z.preprocess((val) => (val === '' ? null : val), z.string().max(500).nullable().optional()),
});

// ─── 6. Save Disposition & Referral Schema ────────────────────────────────────
const saveDispositionSchema = z.object({
  dispositionType: z.enum(DISPOSITION_TYPES).default('PULANG_BEROBAT_JALAN'),
  followUpDate: z.string().nullable().optional(),
  followUpNotes: z.string().max(1000).nullable().optional(),

  // Data Rujukan (wajib diisi jika dispositionType = RUJUK_INTERNAL atau RUJUK_EKSTERNAL)
  referral: z.object({
    referralType: z.enum(REFERRAL_TYPES),
    // Internal
    targetPolyclinicId: z.string().uuid().nullable().optional(),
    targetPractitionerId: z.string().uuid().nullable().optional(),
    internalConsultReason: z.string().max(1000).nullable().optional(),
    // External
    targetFacilityName: z.string().max(255).nullable().optional(),
    targetFacilityCode: z.string().max(50).nullable().optional(),
    targetPolyclinicName: z.string().max(100).nullable().optional(),
    targetPolyclinicCode: z.string().max(50).nullable().optional(),
    referralReason: z.string().max(2000).nullable().optional(),
    initialTherapy: z.string().max(2000).nullable().optional(),
    transportation: z.string().max(50).default('Mandiri').optional(),
    // PCare fields
    pcareTaccCode: z.string().max(10).nullable().optional(),
    pcareTaccReason: z.string().max(500).nullable().optional(),
  }).nullable().optional(),
});

// ─── 7. Finalize & Amend Schema ───────────────────────────────────────────────
const finalizeEncounterSchema = z.object({
  notes: z.string().max(500).nullable().optional(),
});

const amendEncounterSchema = z.object({
  amendmentReason: z.string().min(5, 'Alasan amandemen wajib diisi minimal 5 karakter').max(1000),
});

// ─── 8. Query List Schemas ────────────────────────────────────────────────────
const listEncounterQuerySchema = z.object({
  date: z.string().optional(),
  polyclinicId: z.string().uuid().optional(),
  practitionerId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'FINALIZED', 'AMENDED', '']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const listReferralQuerySchema = z.object({
  date: z.string().optional(),
  referralType: z.enum(['INTERNAL', 'EXTERNAL', '']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

module.exports = {
  startEncounterSchema,
  updateVitalSignsSchema,
  updateSoapSchema,
  addDiagnosisSchema,
  addProcedureSchema,
  saveDispositionSchema,
  finalizeEncounterSchema,
  amendEncounterSchema,
  listEncounterQuerySchema,
  listReferralQuerySchema,
  CONSCIOUSNESS_OPTIONS,
  TRIAGE_OPTIONS,
  DIAGNOSIS_TYPES,
  DIAGNOSIS_CASES,
  DISPOSITION_TYPES,
  REFERRAL_TYPES,
  PROGNOSIS_OPTIONS,
};
