const {
  pgTable, uuid, varchar, text, date, timestamp, integer, boolean, smallint,
} = require('drizzle-orm/pg-core');
const { sql, relations } = require('drizzle-orm');
const { users } = require('./auth.schema');
const { polyclinics, practitioners, schedules } = require('./masterdata.schema');
const { patients } = require('./patients.schema');

/**
 * Fase 4 — Registrasi Kunjungan & Antrian Poliklinik
 *
 * Dirancang untuk mengakomodasi berbagai sumber pendaftaran:
 * - LANGSUNG   : Pasien datang langsung ke loket klinik
 * - TELEPON    : Pasien mendaftar via telepon, dicatat petugas
 * - MJKN       : Mobile JKN — dari bridging BPJS (field mjknBookingCode disiapkan)
 * - ONLINE_OWN : Booking mandiri melalui aplikasi/website klinik sendiri (masa depan)
 */

// ─── 1. Tabel Registrasi Kunjungan ────────────────────────────────────────────
const registrations = pgTable('registrations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  // Nomor Pendaftaran Harian (REG-YYYYMMDD-XXXX)
  registrationNumber: varchar('registration_number', { length: 30 }).unique().notNull(),

  // Referensi Entitas Utama
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict' }),
  polyclinicId: uuid('polyclinic_id').notNull().references(() => polyclinics.id, { onDelete: 'restrict' }),
  practitionerId: uuid('practitioner_id').references(() => practitioners.id, { onDelete: 'set null' }),
  scheduleId: uuid('schedule_id').references(() => schedules.id, { onDelete: 'set null' }),

  // Tanggal dan Jenis Kunjungan
  registrationDate: date('registration_date').default(sql`CURRENT_DATE`).notNull(),
  visitType: varchar('visit_type', { length: 20 }).default('LAMA').notNull(),
  // Enum: 'BARU' (kunjungan pertama pasien ke klinik ini), 'LAMA' (sudah pernah)

  // Sumber Pendaftaran — penting untuk analitik dan integrasi bridging masa depan
  registrationSource: varchar('registration_source', { length: 30 }).default('LANGSUNG').notNull(),
  // Enum: 'LANGSUNG' | 'TELEPON' | 'MJKN' | 'ONLINE_OWN'

  // MJKN / Mobile JKN Bridging Fields (diisi bila source = 'MJKN')
  // Placeholder untuk integrasi bridging BPJS P-Care / VCLAIM di masa depan
  mjknBookingCode: varchar('mjkn_booking_code', { length: 100 }),      // Kode booking dari aplikasi JKN Mobile
  mjknAppointmentDate: date('mjkn_appointment_date'),                   // Tanggal janji dari MJKN
  mjknAppointmentTime: varchar('mjkn_appointment_time', { length: 10 }), // Jam janji dari MJKN
  mjknQueueNumber: varchar('mjkn_queue_number', { length: 20 }),        // Nomor antrian yang sudah diterbitkan MJKN
  mjknRawPayload: text('mjkn_raw_payload'),                             // JSON payload asli dari MJKN (untuk debug/audit)

  // Penjamin & Pembayaran
  paymentMethod: varchar('payment_method', { length: 50 }).default('UMUM').notNull(),
  // Enum: 'UMUM' | 'BPJS' | 'ASURANSI_SWASTA' | 'GRATIS' | 'CORPORATE'
  bpjsCardNumber: varchar('bpjs_card_number', { length: 50 }),         // No kartu BPJS aktif saat kunjungan
  insuranceName: varchar('insurance_name', { length: 100 }),            // Nama asuransi swasta
  insurancePolicyNumber: varchar('insurance_policy_number', { length: 50 }),
  referralNumber: varchar('referral_number', { length: 50 }),           // No. surat rujukan (BPJS/puskesmas)
  referralFrom: varchar('referral_from', { length: 255 }),              // Faskes/dokter yang merujuk

  // Klinis Awal
  complaint: text('complaint'),           // Keluhan utama / anamnesis ringkas
  vitalSignsNotes: text('vital_signs_notes'), // Catatan singkat TTV awal (placeholder, detail di Fase 5)
  notes: text('notes'),                   // Catatan petugas loket

  // Status Kunjungan
  status: varchar('status', { length: 30 }).default('MENUNGGU').notNull(),
  // Enum: 'MENUNGGU' | 'DIPANGGIL' | 'DIPERIKSA' | 'SELESAI' | 'BATAL' | 'LEWAT' | 'RUJUK_KELUAR'

  // Estimasi Waktu Pemeriksaan
  estimatedTime: varchar('estimated_time', { length: 10 }),

  // Dokter / Poli Tujuan Rujukan Antar Poli
  referredToPolyclinicId: uuid('referred_to_polyclinic_id').references(() => polyclinics.id, { onDelete: 'set null' }),
  referredToPractitionerId: uuid('referred_to_practitioner_id').references(() => practitioners.id, { onDelete: 'set null' }),

  // Metadata & Audit
  registeredBy: uuid('registered_by').references(() => users.id, { onDelete: 'set null' }),
  cancelledBy: uuid('cancelled_by').references(() => users.id, { onDelete: 'set null' }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 2. Tabel Antrian Aktif ────────────────────────────────────────────────────
const queues = pgTable('queues', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  registrationId: uuid('registration_id').unique().notNull().references(() => registrations.id, { onDelete: 'cascade' }),
  polyclinicId: uuid('polyclinic_id').notNull().references(() => polyclinics.id, { onDelete: 'restrict' }),

  // Nomor Antrian: "A-001", "B-001", "C-001" — prefix dari kode poli
  queueNumber: varchar('queue_number', { length: 20 }).notNull(),
  // Urutan numerik murni untuk sorting & display (1, 2, 3, ...)
  queueSequence: integer('queue_sequence').notNull(),

  queueDate: date('queue_date').default(sql`CURRENT_DATE`).notNull(),

  // Sumber antrian — penting untuk membedakan antrian MJKN vs LANGSUNG
  queueSource: varchar('queue_source', { length: 30 }).default('LANGSUNG').notNull(),
  // Enum: 'LANGSUNG' | 'TELEPON' | 'MJKN' | 'ONLINE_OWN'

  status: varchar('status', { length: 30 }).default('MENUNGGU').notNull(),
  // Enum: 'MENUNGGU' | 'DIPANGGIL' | 'DIPERIKSA' | 'SELESAI' | 'BATAL' | 'LEWAT'

  // Tracking pemanggilan
  calledCounter: integer('called_counter').default(0).notNull(),
  calledAt: timestamp('called_at', { withTimezone: true }),
  servedAt: timestamp('served_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  skippedAt: timestamp('skipped_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 3. Log Pemanggilan Antrian (Audit Trail) ─────────────────────────────────
// Disiapkan untuk masa depan (Fase pemanggilan antrian suara / layar TV)
const queueCalls = pgTable('queue_calls', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  queueId: uuid('queue_id').notNull().references(() => queues.id, { onDelete: 'cascade' }),
  counterName: varchar('counter_name', { length: 50 }), // 'Loket 1', 'Ruang Periksa 1'
  calledBy: uuid('called_by').references(() => users.id, { onDelete: 'set null' }),
  calledAt: timestamp('called_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────
const registrationsRelations = relations(registrations, ({ one }) => ({
  patient: one(patients, { fields: [registrations.patientId], references: [patients.id] }),
  polyclinic: one(polyclinics, { fields: [registrations.polyclinicId], references: [polyclinics.id] }),
  practitioner: one(practitioners, { fields: [registrations.practitionerId], references: [practitioners.id] }),
  schedule: one(schedules, { fields: [registrations.scheduleId], references: [schedules.id] }),
  registeredByUser: one(users, { fields: [registrations.registeredBy], references: [users.id] }),
  queue: one(queues, { fields: [registrations.id], references: [queues.registrationId] }),
}));

const queuesRelations = relations(queues, ({ one, many }) => ({
  registration: one(registrations, { fields: [queues.registrationId], references: [registrations.id] }),
  polyclinic: one(polyclinics, { fields: [queues.polyclinicId], references: [polyclinics.id] }),
  calls: many(queueCalls),
}));

const queueCallsRelations = relations(queueCalls, ({ one }) => ({
  queue: one(queues, { fields: [queueCalls.queueId], references: [queues.id] }),
  calledByUser: one(users, { fields: [queueCalls.calledBy], references: [users.id] }),
}));

module.exports = {
  registrations,
  queues,
  queueCalls,
  registrationsRelations,
  queuesRelations,
  queueCallsRelations,
};
