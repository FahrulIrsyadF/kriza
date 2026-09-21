const { z } = require('zod');

// ─── Query List Invoices ───────────────────────────────────────────────────────
const queryInvoicesSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ALL', 'UNPAID', 'PARTIAL', 'PAID', 'CANCELLED']).optional().default('ALL'),
  paymentScheme: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ─── Invoice Item Schema ───────────────────────────────────────────────────────
const invoiceItemInputSchema = z.object({
  itemType: z.enum(['PROCEDURE', 'DRUG', 'CONSULTATION', 'ADMINISTRATION', 'OTHER']),
  referenceId: z.string().uuid().optional().nullable(),
  itemName: z.string().min(1, 'Nama item wajib diisi'),
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1').default(1),
  unitPrice: z.coerce.number().min(0, 'Harga satuan tidak boleh negatif').default(0),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

// ─── Create Invoice Schema ─────────────────────────────────────────────────────
const createInvoiceSchema = z.object({
  registrationId: z.string().uuid('ID Registrasi wajib valid'),
  encounterId: z.string().uuid().optional().nullable(),
  paymentScheme: z.string().optional().default('UMUM'),
  discountAmount: z.coerce.number().min(0).default(0),
  taxAmount: z.coerce.number().min(0).default(0),
  dueDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemInputSchema).min(1, 'Tagihan minimal memiliki 1 rincian item'),
});

// ─── Update Invoice Schema (sebelum dibayar lunas) ──────────────────────────────
const updateInvoiceSchema = z.object({
  paymentScheme: z.string().optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemInputSchema).optional(),
});

// ─── Process Payment Schema ────────────────────────────────────────────────────
const createPaymentSchema = z.object({
  invoiceId: z.string().uuid('ID Invoice wajib valid'),
  paymentMethod: z.enum(['TUNAI', 'TRANSFER', 'QRIS', 'DEBIT', 'BPJS', 'ASURANSI'], {
    errorMap: () => ({ message: 'Metode pembayaran tidak valid' }),
  }),
  amount: z.coerce.number().positive('Nominal pembayaran harus lebih dari 0'),
  cashTendered: z.coerce.number().min(0).optional().default(0),
  bankName: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ─── Query List Payments ───────────────────────────────────────────────────────
const queryPaymentsSchema = z.object({
  search: z.string().optional(),
  paymentMethod: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  cashierId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

module.exports = {
  queryInvoicesSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  createPaymentSchema,
  queryPaymentsSchema,
  invoiceItemInputSchema,
};
