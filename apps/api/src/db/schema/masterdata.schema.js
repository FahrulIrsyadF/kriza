const { pgTable, uuid, varchar, boolean, text, timestamp, integer, numeric, smallint, date } = require('drizzle-orm/pg-core');
const { sql, relations } = require('drizzle-orm');
const { users } = require('./auth.schema');

// ─── 1. Poliklinik (Unit Layanan) ─────────────────────────────────────────────
const polyclinics = pgTable('polyclinics', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 20 }).unique().notNull(), // 'POLI-UMUM', 'POLI-GIGI', 'POLI-ESTETIKA'
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── 2. Tenaga Medis / Praktisi (Dokter & Nakes) ──────────────────────────────
const practitioners = pgTable('practitioners', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Link opsional ke akun user login
  code: varchar('code', { length: 30 }).unique().notNull(), // 'DR-001'
  name: varchar('name', { length: 255 }).notNull(),
  title: varchar('title', { length: 50 }), // 'dr.', 'drg.', 'Sp.KK', dll
  sip: varchar('sip', { length: 100 }), // Surat Izin Praktik
  specialization: varchar('specialization', { length: 100 }).default('Umum').notNull(),
  phone: varchar('phone', { length: 25 }),
  email: varchar('email', { length: 255 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── 3. Jadwal Praktik Dokter ────────────────────────────────────────────────
const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  practitionerId: uuid('practitioner_id').notNull().references(() => practitioners.id, { onDelete: 'cascade' }),
  polyclinicId: uuid('polyclinic_id').notNull().references(() => polyclinics.id, { onDelete: 'cascade' }),
  dayOfWeek: smallint('day_of_week').notNull(), // 1: Senin, 2: Selasa, ... 7: Minggu
  startTime: varchar('start_time', { length: 5 }).notNull(), // '08:00'
  endTime: varchar('end_time', { length: 5 }).notNull(), // '12:00'
  quota: integer('quota').default(30).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 4. Tindakan & Layanan (Procedures) ───────────────────────────────────────
const procedures = pgTable('procedures', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 30 }).unique().notNull(), // 'TND-001'
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).default('Tindakan').notNull(), // 'Konsultasi', 'Tindakan Medis', 'Perawatan Gigi', 'Estetika', dll
  polyclinicId: uuid('polyclinic_id').references(() => polyclinics.id, { onDelete: 'set null' }),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── 5. Jenis Tarif (Rate Types: Umum, BPJS, Asuransi) ───────────────────────
const rateTypes = pgTable('rate_types', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 30 }).unique().notNull(), // 'UMUM', 'BPJS', 'ASURANSI'
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isDefault: boolean('is_default').default(false).notNull(),
});

// ─── 6. Tarif Layanan / Tindakan ─────────────────────────────────────────────
const serviceRates = pgTable('service_rates', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  procedureId: uuid('procedure_id').notNull().references(() => procedures.id, { onDelete: 'cascade' }),
  rateTypeId: uuid('rate_type_id').notNull().references(() => rateTypes.id, { onDelete: 'cascade' }),
  tariff: numeric('tariff', { precision: 12, scale: 2 }).default('0').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 7. Satuan Obat (Drug Units) ─────────────────────────────────────────────
const drugUnits = pgTable('drug_units', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 20 }).unique().notNull(), // 'TAB', 'KAP', 'BOTOL', 'STRIP', 'TUBE', 'AMPUL'
  name: varchar('name', { length: 50 }).notNull(),
  description: text('description'),
});

// ─── 8. Katalog Obat & Alkes (Drugs) ─────────────────────────────────────────
const drugs = pgTable('drugs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 50 }).unique().notNull(), // 'OBT-001'
  name: varchar('name', { length: 255 }).notNull(),
  genericName: varchar('generic_name', { length: 255 }),
  dosageForm: varchar('dosage_form', { length: 50 }).default('TABLET').notNull(), // 'TABLET', 'KAPSUL', 'SIRUP', 'SALEP', dll
  category: varchar('category', { length: 50 }).default('Obat Bebas').notNull(), // 'Obat Bebas', 'Obat Bebas Terbatas', 'Obat Keras', 'Alkes', 'Kosmetik Medis'
  unitId: uuid('unit_id').references(() => drugUnits.id, { onDelete: 'set null' }),
  basePrice: numeric('base_price', { precision: 12, scale: 2 }).default('0').notNull(), // HNA / Harga beli dasar
  sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).default('0').notNull(), // Harga jual umum
  defaultMarkupPercent: numeric('default_markup_percent', { precision: 5, scale: 2 }).default('0').notNull(), // Margin markup default (%)
  minStock: integer('min_stock').default(10).notNull(),
  currentStock: integer('current_stock').default(0).notNull(),
  bpjsDrugCode: varchar('bpjs_drug_code', { length: 50 }),
  defaultSigna: varchar('default_signa', { length: 100 }),
  manufacturer: varchar('manufacturer', { length: 100 }),
  requiresPrescription: boolean('requires_prescription').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── 9. Master ICD-10 (Standar Diagnosa) ─────────────────────────────────────
const icd10Codes = pgTable('icd10_codes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 20 }).unique().notNull(), // 'A09', 'J06.9', 'I10', 'K29.7'
  nameEn: varchar('name_en', { length: 255 }).notNull(),
  nameId: varchar('name_id', { length: 255 }),
  isTerminal: boolean('is_terminal').default(true).notNull(),
});

// ─── 9. Pemeriksaan Laboratorium ──────────────────────────────────────────────
// Dipisah dari `procedures` karena tarif lab dirinci per komponen (jasa dokter,
// petugas, perujuk, BHP) dan satu pemeriksaan bisa punya beberapa baris tarif
// berbeda per kelas. Sumber: tabel jns_perawatan_lab SIMRS Khanza.
const labProcedures = pgTable('lab_procedures', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 20 }).unique().notNull(), // '100-RJ', '101-K.3'
  name: varchar('name', { length: 150 }).notNull(),
  category: varchar('category', { length: 2 }).default('PK').notNull(), // PK: Patologi Klinik, PA: Patologi Anatomi, MB: Mikrobiologi
  serviceClass: varchar('service_class', { length: 20 }), // 'Kelas 1', 'Rawat Jalan', 'Kelas VIP'
  payerCode: varchar('payer_code', { length: 3 }), // penjamin di sumber; mayoritas kosong
  // Komponen tarif — totalTariff adalah yang ditagihkan ke pasien
  hospitalShare: numeric('hospital_share', { precision: 14, scale: 2 }).default('0').notNull(),
  consumableFee: numeric('consumable_fee', { precision: 14, scale: 2 }).default('0').notNull(), // BHP
  referrerFee: numeric('referrer_fee', { precision: 14, scale: 2 }).default('0').notNull(),
  doctorFee: numeric('doctor_fee', { precision: 14, scale: 2 }).default('0').notNull(),
  staffFee: numeric('staff_fee', { precision: 14, scale: 2 }).default('0').notNull(),
  ksoFee: numeric('kso_fee', { precision: 14, scale: 2 }).default('0').notNull(),
  managementFee: numeric('management_fee', { precision: 14, scale: 2 }).default('0').notNull(),
  totalTariff: numeric('total_tariff', { precision: 14, scale: 2 }).default('0').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── Relations ───────────────────────────────────────────────────────────────
const practitionersRelations = relations(practitioners, ({ one, many }) => ({
  user: one(users, { fields: [practitioners.userId], references: [users.id] }),
  schedules: many(schedules),
}));

const polyclinicsRelations = relations(polyclinics, ({ many }) => ({
  schedules: many(schedules),
  procedures: many(procedures),
}));

const schedulesRelations = relations(schedules, ({ one }) => ({
  practitioner: one(practitioners, { fields: [schedules.practitionerId], references: [practitioners.id] }),
  polyclinic: one(polyclinics, { fields: [schedules.polyclinicId], references: [polyclinics.id] }),
}));

const proceduresRelations = relations(procedures, ({ one, many }) => ({
  polyclinic: one(polyclinics, { fields: [procedures.polyclinicId], references: [polyclinics.id] }),
  rates: many(serviceRates),
}));

const serviceRatesRelations = relations(serviceRates, ({ one }) => ({
  procedure: one(procedures, { fields: [serviceRates.procedureId], references: [procedures.id] }),
  rateType: one(rateTypes, { fields: [serviceRates.rateTypeId], references: [rateTypes.id] }),
}));

const drugsRelations = relations(drugs, ({ one }) => ({
  unit: one(drugUnits, { fields: [drugs.unitId], references: [drugUnits.id] }),
}));

module.exports = {
  polyclinics,
  practitioners,
  schedules,
  procedures,
  rateTypes,
  serviceRates,
  drugUnits,
  drugs,
  icd10Codes,
  labProcedures,
  practitionersRelations,
  polyclinicsRelations,
  schedulesRelations,
  proceduresRelations,
  serviceRatesRelations,
  drugsRelations,
};
