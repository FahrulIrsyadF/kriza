const { z } = require('zod');

// ─── Polyclinic Schemas ───────────────────────────────────────────────────────
const createPolyclinicSchema = z.object({
  code: z.string().min(2, 'Kode poli minimal 2 karakter').max(20).toUpperCase(),
  name: z.string().min(2, 'Nama poli minimal 2 karakter').max(100),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updatePolyclinicSchema = createPolyclinicSchema.partial();

// ─── Practitioner Schemas ────────────────────────────────────────────────────
const createPractitionerSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  code: z.string().min(2, 'Kode dokter minimal 2 karakter').max(30).toUpperCase(),
  name: z.string().min(2, 'Nama dokter minimal 2 karakter').max(255),
  title: z.string().max(50).optional().nullable(),
  sip: z.string().max(100).optional().nullable(),
  specialization: z.string().min(2).max(100).default('Umum'),
  phone: z.string().max(25).optional().nullable(),
  email: z.string().email('Email tidak valid').optional().nullable(),
  isActive: z.boolean().default(true),
});

const updatePractitionerSchema = createPractitionerSchema.partial();

// ─── Schedule Schemas ────────────────────────────────────────────────────────
const createScheduleSchema = z.object({
  practitionerId: z.string().uuid('ID Dokter tidak valid'),
  polyclinicId: z.string().uuid('ID Poliklinik tidak valid'),
  dayOfWeek: z.number().int().min(1).max(7), // 1: Senin s/d 7: Minggu
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam harus HH:mm (misal 08:00)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam harus HH:mm (misal 12:00)'),
  quota: z.number().int().positive().default(30),
  isActive: z.boolean().default(true),
});

const updateScheduleSchema = createScheduleSchema.partial();

// ─── Procedure & Service Rates Schemas ───────────────────────────────────────
const createProcedureSchema = z.object({
  code: z.string().min(2).max(30).toUpperCase(),
  name: z.string().min(2).max(255),
  category: z.preprocess((val) => (!val ? 'Tindakan' : val), z.string().min(2).max(50).default('Tindakan')),
  polyclinicId: z.preprocess((val) => (val === '' ? null : val), z.string().uuid().optional().nullable()),
  description: z.preprocess((val) => (val === '' ? null : val), z.string().optional().nullable()),
  isActive: z.boolean().default(true),
  rates: z.array(
    z.object({
      rateTypeId: z.string().uuid(),
      tariff: z.coerce.number().min(0, 'Tarif tidak boleh negatif'),
    })
  ).optional(),
});

const updateProcedureSchema = createProcedureSchema.partial();

// ─── Lab Procedure Schemas ───────────────────────────────────────────────────
const money = z.coerce.number().min(0, 'Tarif tidak boleh negatif').default(0);

const createLabProcedureSchema = z.object({
  code: z.string().min(2, 'Kode pemeriksaan minimal 2 karakter').max(20).toUpperCase(),
  name: z.string().min(2, 'Nama pemeriksaan minimal 2 karakter').max(150),
  category: z.enum(['PK', 'PA', 'MB']).default('PK'), // Patologi Klinik / Anatomi / Mikrobiologi
  serviceClass: z.string().max(20).optional().nullable(),
  payerCode: z.string().max(3).optional().nullable(),
  hospitalShare: money,
  consumableFee: money,
  referrerFee: money,
  doctorFee: money,
  staffFee: money,
  ksoFee: money,
  managementFee: money,
  totalTariff: money,
  isActive: z.boolean().default(true),
});

const updateLabProcedureSchema = createLabProcedureSchema.partial();

// ─── Drug Schemas ────────────────────────────────────────────────────────────
const createDrugSchema = z.object({
  code: z.string().min(2).max(50).toUpperCase(),
  name: z.string().min(2).max(255),
  genericName: z.string().max(255).optional().nullable(),
  category: z.string().min(2).max(50).default('Obat Bebas'),
  unitId: z.string().uuid().optional().nullable(),
  basePrice: z.coerce.number().min(0, 'Harga beli tidak boleh negatif').default(0),
  sellingPrice: z.coerce.number().min(0, 'Harga jual tidak boleh negatif').default(0),
  minStock: z.number().int().min(0).default(10),
  currentStock: z.number().int().min(0).default(0),
  requiresPrescription: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const updateDrugSchema = createDrugSchema.partial();

// ─── Query Params Filter Schema ──────────────────────────────────────────────
const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(20),
  search: z.string().optional(),
  polyclinicId: z.string().uuid().optional(),
  category: z.string().optional(),
  isActive: z.enum(['true', 'false', 'all']).default('all'),
});

const labListQuerySchema = listQuerySchema.extend({
  serviceClass: z.string().optional(),
});

module.exports = {
  createPolyclinicSchema,
  updatePolyclinicSchema,
  createPractitionerSchema,
  updatePractitionerSchema,
  createScheduleSchema,
  updateScheduleSchema,
  createProcedureSchema,
  updateProcedureSchema,
  createLabProcedureSchema,
  updateLabProcedureSchema,
  createDrugSchema,
  updateDrugSchema,
  listQuerySchema,
  labListQuerySchema,
};
