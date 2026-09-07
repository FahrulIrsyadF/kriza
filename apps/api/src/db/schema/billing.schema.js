/**
 * Schema database KRIZA — Modul Kasir, Billing & Pembayaran (Fase 7)
 * 
 * Mendukung pencatatan invoice terintegrasi dari RME & Farmasi,
 * multi-metode pembayaran (Tunai, Transfer, QRIS, Debit, BPJS, Asuransi),
 * transaksi parsial (piutang), dan penerbitan kuitansi resmi klinik.
 */

const {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  date,
  timestamp,
  boolean,
} = require('drizzle-orm/pg-core');
const { sql, relations } = require('drizzle-orm');

const { users } = require('./auth.schema');
const { patients } = require('./patients.schema');
const { registrations } = require('./registrations.schema');
const { encounters } = require('./encounters.schema');

// ─── 1. Tabel Invoices (Tagihan Pasien / Kunjungan) ──────────────────────────
const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar('invoice_number', { length: 50 }).unique().notNull(), // 'INV-YYYYMMDD-XXXX'
  registrationId: uuid('registration_id')
    .notNull()
    .references(() => registrations.id, { onDelete: 'restrict' }),
  encounterId: uuid('encounter_id')
    .references(() => encounters.id, { onDelete: 'set null' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'restrict' }),

  // Status Pembayaran: UNPAID (Belum Bayar), PARTIAL (Sebagian), PAID (Lunas), CANCELLED (Batal)
  status: varchar('status', { length: 20 }).default('UNPAID').notNull(),

  // Skema Penjamin: UMUM, BPJS, ASURANSI_SWASTA, GRATIS, CORPORATE
  paymentScheme: varchar('payment_scheme', { length: 50 }).default('UMUM').notNull(),

  // Kalkulasi Finansial
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default('0').notNull(), // Subtotal kotor
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0').notNull(), // Potongan/Diskon
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0').notNull(), // Pajak jika ada
  finalAmount: numeric('final_amount', { precision: 12, scale: 2 }).default('0').notNull(), // Netto yang harus dibayar
  paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).default('0').notNull(), // Total yang sudah dibayar
  balanceAmount: numeric('balance_amount', { precision: 12, scale: 2 }).default('0').notNull(), // Sisa tagihan (piutang)

  dueDate: date('due_date').default(sql`CURRENT_DATE`).notNull(),
  notes: text('notes'),

  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 2. Tabel Invoice Items (Rincian Item Tagihan) ───────────────────────────
const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),

  // Tipe Item: PROCEDURE (Tindakan/Konsul), DRUG (Obat/Alkes Farmasi), ADMINISTRATION (Administrasi), OTHER
  itemType: varchar('item_type', { length: 30 }).notNull(),
  referenceId: uuid('reference_id'), // Opsional: procedureId / drugId / encounterProcedureId / prescriptionItemId

  itemName: varchar('item_name', { length: 255 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).default('0').notNull(),
  discount: numeric('discount', { precision: 12, scale: 2 }).default('0').notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0').notNull(), // (qty * unitPrice) - discount

  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 3. Tabel Payments (Transaksi Pembayaran & Penerbitan Kuitansi) ───────────
const payments = pgTable('payments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  paymentNumber: varchar('payment_number', { length: 50 }).unique().notNull(), // 'PAY-YYYYMMDD-XXXX'
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'restrict' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'restrict' }),

  // Metode Pembayaran: TUNAI, TRANSFER, QRIS, DEBIT, BPJS, ASURANSI
  paymentMethod: varchar('payment_method', { length: 30 }).notNull(),

  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), // Jumlah yang dibayarkan untuk invoice ini
  cashTendered: numeric('cash_tendered', { precision: 12, scale: 2 }).default('0').notNull(), // Uang tunai diterima
  changeAmount: numeric('change_amount', { precision: 12, scale: 2 }).default('0').notNull(), // Kembalian

  bankName: varchar('bank_name', { length: 100 }), // BCA, Mandiri, BRI, BNI, QRIS BCA, dll
  referenceNumber: varchar('reference_number', { length: 100 }), // Nomor transaksi / approval code / No SEP

  notes: text('notes'),

  cashierId: uuid('cashier_id').references(() => users.id, { onDelete: 'set null' }),
  paidAt: timestamp('paid_at', { withTimezone: true }).default(sql`now()`).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────
const invoicesRelations = relations(invoices, ({ one, many }) => ({
  registration: one(registrations, { fields: [invoices.registrationId], references: [registrations.id] }),
  encounter: one(encounters, { fields: [invoices.encounterId], references: [encounters.id] }),
  patient: one(patients, { fields: [invoices.patientId], references: [patients.id] }),
  creator: one(users, { fields: [invoices.createdById], references: [users.id] }),
  items: many(invoiceItems),
  payments: many(payments),
}));

const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
  patient: one(patients, { fields: [payments.patientId], references: [patients.id] }),
  cashier: one(users, { fields: [payments.cashierId], references: [users.id] }),
}));

module.exports = {
  invoices,
  invoiceItems,
  payments,
  invoicesRelations,
  invoiceItemsRelations,
  paymentsRelations,
};
