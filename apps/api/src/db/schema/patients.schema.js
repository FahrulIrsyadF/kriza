const { pgTable, uuid, varchar, boolean, text, timestamp, integer, date } = require('drizzle-orm/pg-core');
const { sql, relations } = require('drizzle-orm');
const { users } = require('./auth.schema');

// ─── 1. Wilayah Hierarchy (Provinsi, Kabupaten, Kecamatan, Kelurahan) ────────

const provinsi = pgTable('provinsi', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
});

const kabupaten = pgTable('kabupaten', {
  id: integer('id').primaryKey(),
  provinsiId: integer('provinsi_id').references(() => provinsi.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  isCity: integer('is_city').default(0), // 0: Kabupaten, 1: Kota
});

const kecamatan = pgTable('kecamatan', {
  id: integer('id').primaryKey(),
  kabupatenId: integer('kabupaten_id').references(() => kabupaten.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
});

const kelurahan = pgTable('kelurahan', {
  id: integer('id').primaryKey(),
  kecamatanId: integer('kecamatan_id').references(() => kecamatan.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
});

// ─── 2. Master Pasien (Lengkap sesuai form KRIZA / RME Standar) ───────────────

const patients = pgTable('patients', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  medicalRecordNumber: varchar('medical_record_number', { length: 30 }).unique().notNull(), // Medrec (No. RM)
  name: varchar('name', { length: 255 }).notNull(), // Nama Pasien
  identityType: varchar('identity_type', { length: 30 }).default('KTP').notNull(), // Identitas: KTP, SIM, PASPOR, KIA, BPJS
  identityNumber: varchar('identity_number', { length: 50 }), // Nomor Identitas / NIK
  gender: varchar('gender', { length: 20 }).notNull(), // Kelamin: Laki-laki / Perempuan (atau L / P)
  birthPlace: varchar('birth_place', { length: 100 }), // Tmp.Lahir
  birthDate: date('birth_date').notNull(), // Tgl Lahir
  bloodType: varchar('blood_type', { length: 10 }).default('-'), // Gol. Darah: A, B, AB, O, -
  rhesus: varchar('rhesus', { length: 5 }).default('+'), // + / -
  address: text('address'), // Alamat KTP
  residenceAddress: text('residence_address'), // T.Tinggal (Tempat Tinggal sekarang)
  
  // Wilayah Domisili
  provinsiId: integer('provinsi_id').references(() => provinsi.id, { onDelete: 'set null' }),
  kabupatenId: integer('kabupaten_id').references(() => kabupaten.id, { onDelete: 'set null' }),
  kecamatanId: integer('kecamatan_id').references(() => kecamatan.id, { onDelete: 'set null' }),
  kelurahanId: integer('kelurahan_id').references(() => kelurahan.id, { onDelete: 'set null' }),

  // Sosial & Demografi
  education: varchar('education', { length: 50 }), // Pendidikan: SD, SMP, SMA, S1, dll
  occupation: varchar('occupation', { length: 100 }), // Pekerjaan
  nationality: varchar('nationality', { length: 30 }).default('WNI').notNull(), // Kebangsaan: WNI / WNA
  religion: varchar('religion', { length: 50 }), // Agama
  ethnicity: varchar('ethnicity', { length: 50 }).default('JAWA'), // Suku
  maritalStatus: varchar('marital_status', { length: 50 }).default('BELUM MENIKAH'), // Status: BELUM MENIKAH, MENIKAH, DUDA, JANDA
  phone: varchar('phone', { length: 30 }), // Telepon / No HP
  parentName: varchar('parent_name', { length: 255 }), // Orang Tua / Nama Ibu Kandung / Penanggung Jawab
  language: varchar('language', { length: 50 }).default('INDONESIA'), // Bahasa

  // Penjamin & Asuransi
  insuranceType: varchar('insurance_type', { length: 50 }).default('UMUM').notNull(), // UMUM / BPJS / ASURANSI
  bpjsNumber: varchar('bpjs_number', { length: 50 }), // No BPJS
  noKk: varchar('no_kk', { length: 50 }), // No KK
  ihsNumber: varchar('ihs_number', { length: 50 }), // SATUSEHAT Patient ID

  // Status Klinis & Alergi
  allergiesNotes: text('allergies_notes'), // Ringkasan Alergi Obat/Makanan
  chronicDiseasesNotes: text('chronic_diseases_notes'), // Ringkasan Penyakit Kronis / Komorbid
  isDeceased: boolean('is_deceased').default(false).notNull(), // Status Meninggal

  // Metadata
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── 3. Detail Riwayat Alergi Pasien (RME Detail) ────────────────────────────

const patientAllergies = pgTable('patient_allergies', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  allergenType: varchar('allergen_type', { length: 50 }).default('Obat').notNull(), // 'Obat', 'Makanan', 'Lingkungan', 'Lainnya'
  allergenName: varchar('allergen_name', { length: 255 }).notNull(),
  severity: varchar('severity', { length: 30 }).default('Sedang').notNull(), // 'Ringan', 'Sedang', 'Berat', 'Anafilaksis'
  reaction: text('reaction'), // Gatal, bengkak, sesak napas, dll
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 4. Kontak Darurat Pasien ────────────────────────────────────────────────

const patientEmergencyContacts = pgTable('patient_emergency_contacts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  relationship: varchar('relationship', { length: 50 }).notNull(), // 'Orang Tua', 'Suami/Istri', 'Anak', 'Saudara Kandung', 'Wali', 'Lainnya'
  phone: varchar('phone', { length: 30 }).notNull(),
  address: text('address'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

const provinsiRelations = relations(provinsi, ({ many }) => ({
  kabupaten: many(kabupaten),
  patients: many(patients),
}));

const kabupatenRelations = relations(kabupaten, ({ one, many }) => ({
  provinsi: one(provinsi, { fields: [kabupaten.provinsiId], references: [provinsi.id] }),
  kecamatan: many(kecamatan),
  patients: many(patients),
}));

const kecamatanRelations = relations(kecamatan, ({ one, many }) => ({
  kabupaten: one(kabupaten, { fields: [kecamatan.kabupatenId], references: [kabupaten.id] }),
  kelurahan: many(kelurahan),
  patients: many(patients),
}));

const kelurahanRelations = relations(kelurahan, ({ one, many }) => ({
  kecamatan: one(kecamatan, { fields: [kelurahan.kecamatanId], references: [kecamatan.id] }),
  patients: many(patients),
}));

const patientsRelations = relations(patients, ({ one, many }) => ({
  provinsi: one(provinsi, { fields: [patients.provinsiId], references: [provinsi.id] }),
  kabupaten: one(kabupaten, { fields: [patients.kabupatenId], references: [kabupaten.id] }),
  kecamatan: one(kecamatan, { fields: [patients.kecamatanId], references: [kecamatan.id] }),
  kelurahan: one(kelurahan, { fields: [patients.kelurahanId], references: [kelurahan.id] }),
  creator: one(users, { fields: [patients.createdBy], references: [users.id] }),
  allergies: many(patientAllergies),
  emergencyContacts: many(patientEmergencyContacts),
}));

const patientAllergiesRelations = relations(patientAllergies, ({ one }) => ({
  patient: one(patients, { fields: [patientAllergies.patientId], references: [patients.id] }),
}));

const patientEmergencyContactsRelations = relations(patientEmergencyContacts, ({ one }) => ({
  patient: one(patients, { fields: [patientEmergencyContacts.patientId], references: [patients.id] }),
}));

module.exports = {
  provinsi,
  kabupaten,
  kecamatan,
  kelurahan,
  patients,
  patientAllergies,
  patientEmergencyContacts,
  provinsiRelations,
  kabupatenRelations,
  kecamatanRelations,
  kelurahanRelations,
  patientsRelations,
  patientAllergiesRelations,
  patientEmergencyContactsRelations,
};
