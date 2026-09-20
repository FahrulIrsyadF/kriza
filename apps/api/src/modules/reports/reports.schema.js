const { z } = require('zod');

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .optional();

const reportsFilterSchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  polyclinicId: z.string().uuid().optional(),
  practitionerId: z.string().uuid().optional(),
  visitType: z.enum(['BARU', 'LAMA', 'ALL']).optional(),
  paymentMethod: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
});

const morbidityQuerySchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  polyclinicId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const pharmacyReportQuerySchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  threshold: z.coerce.number().int().positive().default(10),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

module.exports = {
  reportsFilterSchema,
  morbidityQuerySchema,
  pharmacyReportQuerySchema,
};
