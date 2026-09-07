/**
 * Schema database KRIZA — Modul Farmasi, Resep Elektronik & Manajemen Stok
 * Berbasis data operasional riil Klinik Rizani & PMK No 24 / 2022.
 */

const {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  time,
} = require('drizzle-orm/pg-core');
const { sql, relations } = require('drizzle-orm');

const { users } = require('./auth.schema');
const { drugs } = require('./masterdata.schema');
const { patients } = require('./patients.schema');
const { encounters } = require('./encounters.schema');
const { practitioners } = require('./masterdata.schema');

// ─── 1. Master Suplier / PBF (Extensible) ────────────────────────────────────
const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 50 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 100 }),
  phone: varchar('phone', { length: 30 }),
  email: varchar('email', { length: 100 }),
  address: text('address'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 2. Multi-tier Drug Pricing (Umum, BPJS, Asuransi) ───────────────────────
const drugPrices = pgTable('drug_prices', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  drugId: uuid('drug_id').notNull().references(() => drugs.id, { onDelete: 'cascade' }),
  rateTypeCode: varchar('rate_type_code', { length: 30 }).notNull(), // 'UMUM', 'BPJS', 'ASURANSI'
  sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).notNull(),
  marginPercent: numeric('margin_percent', { precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── 3. Batch & Lot Stok Obat (FEFO Engine Basis) ───────────────────────────
const drugBatches = pgTable('drug_batches', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  drugId: uuid('drug_id').notNull().references(() => drugs.id, { onDelete: 'cascade' }),
  batchNumber: varchar('batch_number', { length: 100 }),
  expiryDate: date('expiry_date').notNull(), // Acuan utama FEFO
  purchaseDate: date('purchase_date').default(sql`CURRENT_DATE`).notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  supplierName: varchar('supplier_name', { length: 255 }),
  storageLocation: varchar('storage_location', { length: 50 }).default('GUDANG_FARMASI').notNull(), // 'GUDANG_FARMASI', 'DEPO_POLI', dll
  purchasePrice: numeric('purchase_price', { precision: 12, scale: 2 }).default('0').notNull(), // HNA per satuan
  sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).default('0').notNull(),
  initialQty: integer('initial_qty').notNull(),
  currentQty: integer('current_qty').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
});

// ─── 4. Shift Pemantauan Stok Farmasi (Klinik Rizani Pattern) ─────────────────
const shiftStockLogs = pgTable('shift_stock_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  logDate: date('log_date').default(sql`CURRENT_DATE`).notNull(),
  shiftType: varchar('shift_type', { length: 20 }).notNull(), // 'PAGI' (07:00-14:00), 'SIANG' (14:00-21:00), 'MALAM'
  shiftStartTime: time('shift_start_time'),
  shiftEndTime: time('shift_end_time'),
  status: varchar('status', { length: 20 }).default('OPEN').notNull(), // 'OPEN', 'CLOSED'
  openedBy: uuid('opened_by').references(() => users.id, { onDelete: 'set null' }),
  closedBy: uuid('closed_by').references(() => users.id, { onDelete: 'set null' }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

const shiftStockLogItems = pgTable('shift_stock_log_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  shiftLogId: uuid('shift_log_id').notNull().references(() => shiftStockLogs.id, { onDelete: 'cascade' }),
  drugId: uuid('drug_id').notNull().references(() => drugs.id, { onDelete: 'cascade' }),
  stockStart: integer('stock_start').notNull(),
  usageShift: integer('usage_shift').default(0).notNull(), // Dari resep sistem
  usageNonShift: integer('usage_non_shift').default(0).notNull(), // Manual input luar jam
  adjustment: integer('adjustment').default(0).notNull(), // Koreksi manual
  stockEnd: integer('stock_end').notNull(), // stockStart - usageShift - usageNonShift + adjustment
  notes: text('notes'),
});

// ─── 5. Resep Elektronik (Prescriptions) ────────────────────────────────────
const prescriptions = pgTable('prescriptions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  prescriptionNumber: varchar('prescription_number', { length: 50 }).unique().notNull(), // 'RES-YYYYMMDD-XXXX'
  encounterId: uuid('encounter_id').notNull().references(() => encounters.id, { onDelete: 'restrict' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict' }),
  practitionerId: uuid('practitioner_id').notNull().references(() => practitioners.id, { onDelete: 'restrict' }),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(), // 'PENDING', 'PROCESSING', 'DISPENSED', 'CANCELLED'
  pharmacistId: uuid('pharmacist_id').references(() => users.id, { onDelete: 'set null' }),
  dispensedAt: timestamp('dispensed_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

const prescriptionItems = pgTable('prescription_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  prescriptionId: uuid('prescription_id').notNull().references(() => prescriptions.id, { onDelete: 'cascade' }),
  drugId: uuid('drug_id').notNull().references(() => drugs.id, { onDelete: 'restrict' }),
  drugName: varchar('drug_name', { length: 255 }).notNull(),
  dosageForm: varchar('dosage_form', { length: 50 }),
  quantity: integer('quantity').notNull(),
  unit: varchar('unit', { length: 30 }).default('TABLET').notNull(),
  signa: varchar('signa', { length: 255 }).notNull(), // '3x1 tablet sesudah makan'
  durationDays: integer('duration_days'),
  dispensedQty: integer('dispensed_qty').default(0).notNull(),
  batchId: uuid('batch_id').references(() => drugBatches.id, { onDelete: 'set null' }),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).default('0').notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0').notNull(),
  notes: text('notes'),
});

// ─── 6. Mutasi Stok Append-Only (Audit Trail Murni) ───────────────────────────
const drugStockMovements = pgTable('drug_stock_movements', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  batchId: uuid('batch_id').notNull().references(() => drugBatches.id, { onDelete: 'cascade' }),
  drugId: uuid('drug_id').notNull().references(() => drugs.id, { onDelete: 'cascade' }),
  movementType: varchar('movement_type', { length: 40 }).notNull(), // 'PENERIMAAN_BATCH', 'DISPENSING_RESEP', 'PEMAKAIAN_SHIFT', 'PEMAKAIAN_NON_SHIFT', 'PENYESUAIAN_MANUAL', 'STOCK_OPNAME', 'RETUR_PASIEN'
  quantity: integer('quantity').notNull(), // (+) masuk, (-) keluar
  quantityBefore: integer('quantity_before').notNull(),
  quantityAfter: integer('quantity_after').notNull(),
  referenceType: varchar('reference_type', { length: 50 }), // 'PRESCRIPTION', 'SHIFT_LOG', 'STOCK_OPNAME', 'ADJUSTMENT'
  referenceId: uuid('reference_id'),
  shiftLogId: uuid('shift_log_id').references(() => shiftStockLogs.id, { onDelete: 'set null' }),
  prescriptionItemId: uuid('prescription_item_id').references(() => prescriptionItems.id, { onDelete: 'set null' }),
  reason: text('reason'),
  movedAt: timestamp('moved_at', { withTimezone: true }).default(sql`now()`).notNull(),
  movedBy: uuid('moved_by').references(() => users.id, { onDelete: 'set null' }),
});

// ─── 7. Stock Opname Periodik ───────────────────────────────────────────────
const stockOpnames = pgTable('stock_opnames', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  opnameDate: date('opname_date').default(sql`CURRENT_DATE`).notNull(),
  period: varchar('period', { length: 30 }).notNull(), // 'AGUSTUS 2026', 'SEPTEMBER 2026'
  status: varchar('status', { length: 20 }).default('DRAFT').notNull(), // 'DRAFT', 'FINALIZED'
  notes: text('notes'),
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  finalizedBy: uuid('finalized_by').references(() => users.id, { onDelete: 'set null' }),
});

const stockOpnameItems = pgTable('stock_opname_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  opnameId: uuid('opname_id').notNull().references(() => stockOpnames.id, { onDelete: 'cascade' }),
  drugId: uuid('drug_id').notNull().references(() => drugs.id, { onDelete: 'cascade' }),
  batchId: uuid('batch_id').references(() => drugBatches.id, { onDelete: 'set null' }),
  systemQty: integer('system_qty').notNull(),
  physicalQty: integer('physical_qty').notNull(),
  selisih: integer('selisih').default(0).notNull(), // physicalQty - systemQty
  expiryDate: date('expiry_date'),
  expiryNotes: text('expiry_notes'), // misal 'ED Bulan ini tgl 30'
  adjustmentReason: text('adjustment_reason'),
  recordedBy: uuid('recorded_by').references(() => users.id, { onDelete: 'set null' }),
});

// ─── Relations ───────────────────────────────────────────────────────────────
const drugsPharmacyRelations = relations(drugs, ({ many }) => ({
  batches: many(drugBatches),
  prices: many(drugPrices),
  prescriptionItems: many(prescriptionItems),
  stockMovements: many(drugStockMovements),
}));

const drugBatchesRelations = relations(drugBatches, ({ one, many }) => ({
  drug: one(drugs, { fields: [drugBatches.drugId], references: [drugs.id] }),
  supplier: one(suppliers, { fields: [drugBatches.supplierId], references: [suppliers.id] }),
  movements: many(drugStockMovements),
}));

const drugPricesRelations = relations(drugPrices, ({ one }) => ({
  drug: one(drugs, { fields: [drugPrices.drugId], references: [drugs.id] }),
}));

const shiftStockLogsRelations = relations(shiftStockLogs, ({ one, many }) => ({
  opener: one(users, { fields: [shiftStockLogs.openedBy], references: [users.id] }),
  closer: one(users, { fields: [shiftStockLogs.closedBy], references: [users.id] }),
  items: many(shiftStockLogItems),
}));

const shiftStockLogItemsRelations = relations(shiftStockLogItems, ({ one }) => ({
  shiftLog: one(shiftStockLogs, { fields: [shiftStockLogItems.shiftLogId], references: [shiftStockLogs.id] }),
  drug: one(drugs, { fields: [shiftStockLogItems.drugId], references: [drugs.id] }),
}));

const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  encounter: one(encounters, { fields: [prescriptions.encounterId], references: [encounters.id] }),
  patient: one(patients, { fields: [prescriptions.patientId], references: [patients.id] }),
  practitioner: one(practitioners, { fields: [prescriptions.practitionerId], references: [practitioners.id] }),
  pharmacist: one(users, { fields: [prescriptions.pharmacistId], references: [users.id] }),
  items: many(prescriptionItems),
}));

const prescriptionItemsRelations = relations(prescriptionItems, ({ one }) => ({
  prescription: one(prescriptions, { fields: [prescriptionItems.prescriptionId], references: [prescriptions.id] }),
  drug: one(drugs, { fields: [prescriptionItems.drugId], references: [drugs.id] }),
  batch: one(drugBatches, { fields: [prescriptionItems.batchId], references: [drugBatches.id] }),
}));

const drugStockMovementsRelations = relations(drugStockMovements, ({ one }) => ({
  batch: one(drugBatches, { fields: [drugStockMovements.batchId], references: [drugBatches.id] }),
  drug: one(drugs, { fields: [drugStockMovements.drugId], references: [drugs.id] }),
  user: one(users, { fields: [drugStockMovements.movedBy], references: [users.id] }),
}));

const stockOpnamesRelations = relations(stockOpnames, ({ one, many }) => ({
  creator: one(users, { fields: [stockOpnames.createdBy], references: [users.id] }),
  finalizer: one(users, { fields: [stockOpnames.finalizedBy], references: [users.id] }),
  items: many(stockOpnameItems),
}));

const stockOpnameItemsRelations = relations(stockOpnameItems, ({ one }) => ({
  opname: one(stockOpnames, { fields: [stockOpnameItems.opnameId], references: [stockOpnames.id] }),
  drug: one(drugs, { fields: [stockOpnameItems.drugId], references: [drugs.id] }),
  batch: one(drugBatches, { fields: [stockOpnameItems.batchId], references: [drugBatches.id] }),
}));

module.exports = {
  suppliers,
  drugPrices,
  drugBatches,
  shiftStockLogs,
  shiftStockLogItems,
  prescriptions,
  prescriptionItems,
  drugStockMovements,
  stockOpnames,
  stockOpnameItems,
  drugsPharmacyRelations,
  drugBatchesRelations,
  drugPricesRelations,
  shiftStockLogsRelations,
  shiftStockLogItemsRelations,
  prescriptionsRelations,
  prescriptionItemsRelations,
  drugStockMovementsRelations,
  stockOpnamesRelations,
  stockOpnameItemsRelations,
};
