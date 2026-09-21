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

// ─── 2. Update Vital Signs Schema ─────────────────────────────────────────────
const updateVitalSignsSchema = z.object({
  systolic: z.coerce.number().int().min(40).max(300).nullable().optional(),
  diastolic: z.coerce.number().int().min(20).max(200).nullable().optional(),
  heartRate: z.coerce.number().int().min(20).max(250).nullable().optional(),
  respiratoryRate: z.coerce.number().int().min(5).max(80).nullable().optional(),
  temperature: z.coerce.number().min(30.0).max(45.0).nullable().optional(),
  oxygenSaturation: z.coerce.number().int().min(40).max(100).nullable().optional(),
  weight: z.coerce.number().min(0.5).max(350).nullable().optional(),
  height: z.coerce.number().min(20).max(250).nullable().optional(),
  waistCircumference: z.coerce.number().min(10).max(200).nullable().optional(),
  consciousness: z.enum(CONSCIOUSNESS_OPTIONS).default('Compos Mentis').optional(),
  triage: z.enum(TRIAGE_OPTIONS).default('HIJAU').optional(),
  physicalExamNotes: z.string().max(2000).nullable().optional(),
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
  procedureId: z.string().uuid().nullable().optional(),
  procedureCode: z.string().max(30).nullable().optional(),
  procedureName: z.string().min(1, 'Nama tindakan wajib diisi').max(255),
  quantity: z.coerce.number().int().min(1).default(1),
  tariff: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).nullable().optional(),
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
