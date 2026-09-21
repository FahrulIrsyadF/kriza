const {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  integer,
  numeric,
  boolean,
  smallint,
} = require('drizzle-orm/pg-core');
const { sql, relations } = require('drizzle-orm');
const { users } = require('./auth.schema');
const { polyclinics, practitioners, procedures } = require('./masterdata.schema');
const { patients } = require('./patients.schema');
const { registrations } = require('./registrations.schema');

/**
 * Fase 5 — Rekam Medis Elektronik (RME / EMR SOAP), Tindakan & Sistem Rujukan
 * 
 * Sesuai Permenkes No. 24 Tahun 2022 tentang Rekam Medis:
 * - Pencatatan komprehensif SOAP (Subjektif, Objektif, Asesmen, Plan)
 * - TTV & Antropometri dengan kalkulasi BMI otomatis
 * - Multi-diagnosa ICD-10 (Primary, Secondary, Komplikasi) & Kasus Baru/Lama
 * - Input Tindakan Medis
 * - Sistem Rujukan Internal (Antar-Poli) & Eksternal (RS / Spesialis)
 * - Kesiapan Bridging BPJS P-Care (TACC, Faskes Rujukan, Sub-spesialis)
 * - Status Lifecycle: DRAFT → FINALIZED (Terkunci) → AMENDED (Revisi bernomor)
 */

// ─── 1. Tabel Encounter (Sesi Pemeriksaan Medis Pasien) ────────────────────────
const encounters = pgTable('encounters', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  registrationId: uuid('registration_id')
    .notNull()
    .references(() => registrations.id, { onDelete: 'restrict' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'restrict' }),
  practitionerId: uuid('practitioner_id')
    .notNull()
    .references(() => practitioners.id, { onDelete: 'restrict' }),
  polyclinicId: uuid('polyclinic_id')
    .notNull()
    .references(() => polyclinics.id, { onDelete: 'restrict' }),

  encounterDate: date('encounter_date').default(sql`CURRENT_DATE`).notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).default(sql`now()`).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),

  // Status Lifecycle: DRAFT (sedang diisi), FINALIZED (terkunci), AMENDED (direvisi)
  status: varchar('status', { length: 20 }).default('DRAFT').notNull(),

  // Finalisasi & Penguncian
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
  finalizedBy: uuid('finalized_by').references(() => users.id, { onDelete: 'set null' }),

  // Amandemen Rekam Medis
  amendedFromId: uuid('amended_from_id'), // Self-reference jika hasil amandemen
  amendmentReason: text('amendment_reason'),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 2. Tabel Vital Signs (TTV & Antropometri) ─────────────────────────────────
const vitalSigns = pgTable('vital_signs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  encounterId: uuid('encounter_id')
    .unique()
    .notNull()
    .references(() => encounters.id, { onDelete: 'cascade' }),

  // Tekanan Darah & Sirkulasi
  systolic: integer('systolic'), // mmHg
  diastolic: integer('diastolic'), // mmHg
  heartRate: integer('heart_rate'), // bpm (Denyut Nadi)
  respiratoryRate: integer('respiratory_rate'), // x/menit (Laju Nafas)
  temperature: numeric('temperature', { precision: 4, scale: 1 }), // °C (Suhu Tubuh)
  oxygenSaturation: integer('oxygen_saturation'), // SpO2 (%)

  // Antropometri & BMI
  weight: numeric('weight', { precision: 5, scale: 2 }), // kg (Berat Badan)
  height: numeric('height', { precision: 5, scale: 2 }), // cm (Tinggi Badan)
  bmi: numeric('bmi', { precision: 4, scale: 1 }), // kg/m^2 (Indeks Massa Tubuh)
  bmiCategory: varchar('bmi_category', { length: 30 }), // Underweight, Normal, Overweight, Obesitas I, Obesitas II
  waistCircumference: numeric('waist_circumference', { precision: 5, scale: 2 }), // cm (Lingkar Perut)

  // Status Klinis & Kesadaran (Standar BPJS PCare)
  consciousness: varchar('consciousness', { length: 30 }).default('Compos Mentis'), // Compos Mentis, Apatis, Somnolen, Sopor, Koma
  triage: varchar('triage', { length: 20 }).default('HIJAU'), // HIJAU, KUNING, MERAH, HITAM
  physicalExamNotes: text('physical_exam_notes'), // Temuan Pemeriksaan Fisik Head-to-Toe / Status Lokalis

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 3. Tabel SOAP Notes ───────────────────────────────────────────────────────
const soapNotes = pgTable('soap_notes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  encounterId: uuid('encounter_id')
    .unique()
    .notNull()
    .references(() => encounters.id, { onDelete: 'cascade' }),

  // S: Subjektif (Anamnesis, Keluhan Utama, RPS, RPD, RPK)
  subjective: text('subjective').notNull(),

  // O: Objektif (Pemeriksaan Fisik, Status Lokalis, Hasil Lab/Penunjang)
  objective: text('objective').notNull(),

  // A: Asesmen (Analisa Medis & Kesimpulan Dokter)
  assessment: text('assessment'),

  // P: Plan (Rencana Penatalaksanaan, Terapi Obat, Diet, Edukasi Pasien)
  plan: text('plan'),

  // Prognosis (Bonam, Malam, Dubia ad Bonam, Dubia ad Malam)
  prognosis: varchar('prognosis', { length: 50 }).default('Bonam'),
  notes: text('notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 4. Tabel Diagnosa ICD-10 (Multi-Item) ─────────────────────────────────────
const encounterDiagnoses = pgTable('encounter_diagnoses', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  encounterId: uuid('encounter_id')
    .notNull()
    .references(() => encounters.id, { onDelete: 'cascade' }),

  icd10Code: varchar('icd10_code', { length: 20 }).notNull(), // 'A09', 'I10', 'J06.9'
  icd10Name: varchar('icd10_name', { length: 255 }).notNull(),
  diagnosisType: varchar('diagnosis_type', { length: 20 }).default('PRIMARY').notNull(), // PRIMARY, SECONDARY, COMPLICATION
  diagnosisCase: varchar('diagnosis_case', { length: 20 }).default('BARU').notNull(), // BARU, LAMA (PCare Kasus Baru / Lama)
  notes: text('notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 5. Tabel Tindakan Medis (Procedures) ──────────────────────────────────────
const encounterProcedures = pgTable('encounter_procedures', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  encounterId: uuid('encounter_id')
    .notNull()
    .references(() => encounters.id, { onDelete: 'cascade' }),
  procedureId: uuid('procedure_id').references(() => procedures.id, { onDelete: 'set null' }),

  procedureCode: varchar('procedure_code', { length: 30 }),
  procedureName: varchar('procedure_name', { length: 255 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  tariff: numeric('tariff', { precision: 12, scale: 2 }).default('0').notNull(),
  notes: text('notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 6. Tabel Rujukan Medis (Internal & Eksternal + PCare Fields) ──────────────
const encounterReferrals = pgTable('encounter_referrals', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  encounterId: uuid('encounter_id')
    .unique()
    .notNull()
    .references(() => encounters.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'restrict' }),
  practitionerId: uuid('practitioner_id')
    .notNull()
    .references(() => practitioners.id, { onDelete: 'restrict' }),

  // Tipe Rujukan: INTERNAL (Antar-Poli Klinik) atau EXTERNAL (Ke Rumah Sakit / Faskes Luar)
  referralType: varchar('referral_type', { length: 20 }).notNull(), // 'INTERNAL' | 'EXTERNAL'
  referralNumber: varchar('referral_number', { length: 50 }).unique().notNull(), // 'RUJ-YYYYMMDD-XXXX'

  // ── Rujukan Internal (Antar-Poli Klinik) ──
  targetPolyclinicId: uuid('target_polyclinic_id').references(() => polyclinics.id, { onDelete: 'set null' }),
  targetPractitionerId: uuid('target_practitioner_id').references(() => practitioners.id, { onDelete: 'set null' }),
  internalConsultReason: text('internal_consult_reason'),

  // ── Rujukan Eksternal (Rumah Sakit / Spesialis) ──
  targetFacilityName: varchar('target_facility_name', { length: 255 }), // Nama RS / Faskes Tujuan
  targetFacilityCode: varchar('target_facility_code', { length: 50 }), // Kode Faskes BPJS P-Care
  targetPolyclinicName: varchar('target_polyclinic_name', { length: 100 }), // Nama Spesialis / Poli RS Tujuan
  targetPolyclinicCode: varchar('target_polyclinic_code', { length: 50 }), // Kode Poli BPJS
  referralReason: text('referral_reason'), // Alasan Rujukan / Indikasi Medis
  initialTherapy: text('initial_therapy'), // Terapi / Tindakan Awal yang Telah Diberikan
  transportation: varchar('transportation', { length: 50 }).default('Mandiri'), // Mandiri, Ambulans, Kendaraan Pribadi

  // ── Kesiapan Bridging BPJS P-Care ──
  pcareNoKunjungan: varchar('pcare_no_kunjungan', { length: 50 }),
  pcareNoRujukan: varchar('pcare_no_rujukan', { length: 50 }), // Nomor Surat Rujukan Online dari P-Care
  pcareTaccCode: varchar('pcare_tacc_code', { length: 10 }), // Kode TACC: Time, Age, Complication, Comorbidity (-1, 1, 2, 3, 4)
  pcareTaccReason: text('pcare_tacc_reason'),
  pcareSyncedAt: timestamp('pcare_synced_at', { withTimezone: true }),
  pcareRawResponse: text('pcare_raw_response'),

  // Status Rujukan
  status: varchar('status', { length: 20 }).default('ISSUED').notNull(), // 'DRAFT', 'ISSUED', 'COMPLETED', 'CANCELLED'
  issuedAt: timestamp('issued_at', { withTimezone: true }).default(sql`now()`).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 7. Tabel Disposisi / Status Pulang Pasien ──────────────────────────────────
const encounterDispositions = pgTable('encounter_dispositions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  encounterId: uuid('encounter_id')
    .unique()
    .notNull()
    .references(() => encounters.id, { onDelete: 'cascade' }),

  // Status Pulang: PULANG_BEROBAT_JALAN, RUJUK_INTERNAL, RUJUK_EKSTERNAL, KONTROL_ULANG, MENINGGAL, PULANG_PAKSA
  dispositionType: varchar('disposition_type', { length: 50 }).default('PULANG_BEROBAT_JALAN').notNull(),
  followUpDate: date('follow_up_date'), // Tanggal Rencana Kontrol Ulang
  followUpNotes: text('follow_up_notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────
const encountersRelations = relations(encounters, ({ one, many }) => ({
  registration: one(registrations, { fields: [encounters.registrationId], references: [registrations.id] }),
  patient: one(patients, { fields: [encounters.patientId], references: [patients.id] }),
  practitioner: one(practitioners, { fields: [encounters.practitionerId], references: [practitioners.id] }),
  polyclinic: one(polyclinics, { fields: [encounters.polyclinicId], references: [polyclinics.id] }),
  finalizedByUser: one(users, { fields: [encounters.finalizedBy], references: [users.id] }),
  vitalSigns: one(vitalSigns, { fields: [encounters.id], references: [vitalSigns.encounterId] }),
  soapNotes: one(soapNotes, { fields: [encounters.id], references: [soapNotes.encounterId] }),
  diagnoses: many(encounterDiagnoses),
  procedures: many(encounterProcedures),
  referral: one(encounterReferrals, { fields: [encounters.id], references: [encounterReferrals.encounterId] }),
  disposition: one(encounterDispositions, { fields: [encounters.id], references: [encounterDispositions.encounterId] }),
}));

const vitalSignsRelations = relations(vitalSigns, ({ one }) => ({
  encounter: one(encounters, { fields: [vitalSigns.encounterId], references: [encounters.id] }),
}));

const soapNotesRelations = relations(soapNotes, ({ one }) => ({
  encounter: one(encounters, { fields: [soapNotes.encounterId], references: [encounters.id] }),
}));

const encounterDiagnosesRelations = relations(encounterDiagnoses, ({ one }) => ({
  encounter: one(encounters, { fields: [encounterDiagnoses.encounterId], references: [encounters.id] }),
}));

const encounterProceduresRelations = relations(encounterProcedures, ({ one }) => ({
  encounter: one(encounters, { fields: [encounterProcedures.encounterId], references: [encounters.id] }),
  procedure: one(procedures, { fields: [encounterProcedures.procedureId], references: [procedures.id] }),
}));

const encounterReferralsRelations = relations(encounterReferrals, ({ one }) => ({
  encounter: one(encounters, { fields: [encounterReferrals.encounterId], references: [encounters.id] }),
  patient: one(patients, { fields: [encounterReferrals.patientId], references: [patients.id] }),
  practitioner: one(practitioners, { fields: [encounterReferrals.practitionerId], references: [practitioners.id] }),
  targetPolyclinic: one(polyclinics, { fields: [encounterReferrals.targetPolyclinicId], references: [polyclinics.id] }),
  targetPractitioner: one(practitioners, { fields: [encounterReferrals.targetPractitionerId], references: [practitioners.id] }),
}));

const encounterDispositionsRelations = relations(encounterDispositions, ({ one }) => ({
  encounter: one(encounters, { fields: [encounterDispositions.encounterId], references: [encounters.id] }),
}));

module.exports = {
  encounters,
  vitalSigns,
  soapNotes,
  encounterDiagnoses,
  encounterProcedures,
  encounterReferrals,
  encounterDispositions,
  encountersRelations,
  vitalSignsRelations,
  soapNotesRelations,
  encounterDiagnosesRelations,
  encounterProceduresRelations,
  encounterReferralsRelations,
  encounterDispositionsRelations,
};
