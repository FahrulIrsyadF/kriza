const { z } = require('zod');

// ─── 1. Resep Elektronik & Dispensing ─────────────────────────────────────────

const prescriptionItemInputSchema = z.object({
  drugId: z.string().uuid({ message: 'Drug ID harus berupa UUID valid' }),
  quantity: z.number().int().positive({ message: 'Jumlah obat harus lebih dari 0' }),
  signa: z.string().min(1, { message: 'Signa / aturan pakai wajib diisi' }),
  durationDays: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const createPrescriptionSchema = z.object({
  encounterId: z.string().uuid({ message: 'Encounter ID harus berupa UUID valid' }),
  notes: z.string().optional(),
  items: z.array(prescriptionItemInputSchema).min(1, { message: 'Resep harus berisi minimal 1 item obat' }),
});

const dispensePrescriptionSchema = z.object({
  items: z.array(z.object({
    prescriptionItemId: z.string().uuid(),
    dispensedQty: z.number().int().nonnegative(),
    batchId: z.string().uuid().optional(),
  })).optional(),
  notes: z.string().optional(),
});

const cancelPrescriptionSchema = z.object({
  reason: z.string().min(3, { message: 'Alasan pembatalan resep wajib diisi' }),
});

// ─── 2. Manajemen Batch & Stok ───────────────────────────────────────────────

const receiveBatchSchema = z.object({
  drugId: z.string().uuid({ message: 'Drug ID harus berupa UUID valid' }),
  batchNumber: z.string().optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal kedaluwarsa YYYY-MM-DD' }),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().optional(),
  storageLocation: z.string().default('GUDANG_FARMASI'),
  purchasePrice: z.number().nonnegative().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  initialQty: z.number().int().positive({ message: 'Jumlah penerimaan harus lebih dari 0' }),
  notes: z.string().optional(),
});

const stockAdjustmentSchema = z.object({
  drugId: z.string().uuid({ message: 'Drug ID harus berupa UUID valid' }),
  batchId: z.string().uuid({ message: 'Batch ID harus berupa UUID valid' }),
  quantity: z.number().int(), // positif menambah, negatif mengurangi
  reason: z.string().min(3, { message: 'Alasan penyesuaian wajib diisi' }),
  notes: z.string().optional(),
});

// ─── 3. Pemantauan Shift ──────────────────────────────────────────────────────

const openShiftSchema = z.object({
  shiftType: z.enum(['PAGI', 'SIANG', 'MALAM'], { message: 'Tipe shift harus PAGI, SIANG, atau MALAM' }),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

const updateShiftItemsSchema = z.object({
  items: z.array(z.object({
    drugId: z.string().uuid(),
    usageNonShift: z.number().int().default(0),
    adjustment: z.number().int().default(0),
    notes: z.string().optional(),
  })),
});

// ─── 4. Stock Opname ─────────────────────────────────────────────────────────

const createStockOpnameSchema = z.object({
  period: z.string().min(1, { message: 'Periode stock opname wajib diisi (misal: AGUSTUS 2026)' }),
  opnameDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

const updateStockOpnameItemsSchema = z.object({
  items: z.array(z.object({
    drugId: z.string().uuid(),
    batchId: z.string().uuid().optional(),
    physicalQty: z.number().int().nonnegative({ message: 'Jumlah fisik tidak boleh negatif' }),
    expiryDate: z.string().optional(),
    expiryNotes: z.string().optional(),
    adjustmentReason: z.string().optional(),
  })),
});

module.exports = {
  createPrescriptionSchema,
  dispensePrescriptionSchema,
  cancelPrescriptionSchema,
  receiveBatchSchema,
  stockAdjustmentSchema,
  openShiftSchema,
  updateShiftItemsSchema,
  createStockOpnameSchema,
  updateStockOpnameItemsSchema,
};
