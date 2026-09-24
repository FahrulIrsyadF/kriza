const repo = require('./billing.repository');
const { db } = require('../../db');
const {
  invoices,
  invoiceItems,
  payments,
  registrations,
  encounters,
  encounterProcedures,
  prescriptions,
  prescriptionItems,
  patients,
  polyclinics,
} = require('../../db/schema');
const { eq, and, ne, desc, or, sql } = require('drizzle-orm');
const { logAudit } = require('../../shared/utils/audit');

// ─── 1. Dashboard Stats ────────────────────────────────────────────────────────
async function getDashboardStats(params) {
  return repo.getBillingStats(params);
}

// ─── 2. List Invoices ──────────────────────────────────────────────────────────
async function getInvoices(params) {
  return repo.getInvoices(params);
}

// ─── 3. Detail Invoice ────────────────────────────────────────────────────────
async function getInvoiceById(id) {
  const invoice = await repo.getInvoiceById(id);
  if (!invoice) {
    const err = new Error('Tagihan/Invoice tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return invoice;
}

// ─── 4. Auto-Generate / Synchronize Invoice from Registration / Encounter ──────
async function generateOrSyncInvoice(registrationId, { userId, ipAddress, userAgent } = {}) {
  return db.transaction(async (tx) => {
    // 1. Cek registrasi
    const regRows = await tx
      .select({
        id: registrations.id,
        registrationNumber: registrations.registrationNumber,
        patientId: registrations.patientId,
        paymentMethod: registrations.paymentMethod,
        polyclinicId: registrations.polyclinicId,
        practitionerId: registrations.practitionerId,
        status: registrations.status,
      })
      .from(registrations)
      .where(eq(registrations.id, registrationId))
      .limit(1);

    if (regRows.length === 0) {
      const err = new Error('Data registrasi kunjungan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    const reg = regRows[0];

    // 2. Cek apakah sudah ada invoice aktif
    const existingInvoice = await repo.getInvoiceByRegistrationId(registrationId, tx);
    if (existingInvoice && existingInvoice.status === 'PAID') {
      return existingInvoice; // Sudah lunas, tidak boleh dioverwrite
    }

    // 3. Ambil data encounter aktif / terbaru (abaikan versi lama yang AMENDED)
    const encRows = await tx
      .select({
        id: encounters.id,
        status: encounters.status,
        amendedFromId: encounters.amendedFromId,
      })
      .from(encounters)
      .where(
        and(
          eq(encounters.registrationId, registrationId),
          ne(encounters.status, 'AMENDED')
        )
      )
      .orderBy(desc(encounters.createdAt))
      .limit(1);

    const encounter = encRows[0] || null;

    // 4. Kumpulkan item tindakan dari encounter_procedures
    const items = [];

    if (encounter) {
      const procRows = await tx
        .select({
          id: encounterProcedures.id,
          procedureId: encounterProcedures.procedureId,
          procedureName: encounterProcedures.procedureName,
          quantity: encounterProcedures.quantity,
          tariff: encounterProcedures.tariff,
          notes: encounterProcedures.notes,
        })
        .from(encounterProcedures)
        .where(eq(encounterProcedures.encounterId, encounter.id));

      for (const proc of procRows) {
        const qty = proc.quantity || 1;
        const price = parseFloat(proc.tariff || '0');
        items.push({
          itemType: 'PROCEDURE',
          referenceId: proc.procedureId || proc.id,
          itemName: proc.procedureName,
          quantity: qty,
          unitPrice: price,
          discount: 0,
          subtotal: qty * price,
          notes: proc.notes || 'Tindakan Medis Dokter',
        });
      }

      // 5. Kumpulkan item obat dari prescriptions dan prescription_items
      const prescCondition = encounter.amendedFromId
        ? or(eq(prescriptions.encounterId, encounter.id), eq(prescriptions.encounterId, encounter.amendedFromId))
        : eq(prescriptions.encounterId, encounter.id);

      const prescRows = await tx
        .select({ id: prescriptions.id })
        .from(prescriptions)
        .where(prescCondition);

      for (const p of prescRows) {
        const drugItems = await tx
          .select({
            id: prescriptionItems.id,
            drugId: prescriptionItems.drugId,
            drugName: prescriptionItems.drugName,
            dosageForm: prescriptionItems.dosageForm,
            quantity: prescriptionItems.quantity,
            unitPrice: prescriptionItems.unitPrice,
            subtotal: prescriptionItems.subtotal,
            notes: prescriptionItems.notes,
          })
          .from(prescriptionItems)
          .where(eq(prescriptionItems.prescriptionId, p.id));

        for (const di of drugItems) {
          const qty = di.quantity || 1;
          const price = parseFloat(di.unitPrice || '0');
          const sub = parseFloat(di.subtotal || '0') || qty * price;
          const fullName = di.dosageForm ? `${di.drugName} (${di.dosageForm})` : di.drugName;

          items.push({
            itemType: 'DRUG',
            referenceId: di.drugId || di.id,
            itemName: fullName,
            quantity: qty,
            unitPrice: price,
            discount: 0,
            subtotal: sub,
            notes: di.notes || 'Resep Obat Farmasi',
          });
        }
      }
    }

    // Jika belum ada tindakan/obat sama sekali, tambahkan item konsultasi standar klinik
    if (items.length === 0) {
      items.push({
        itemType: 'CONSULTATION',
        referenceId: null,
        itemName: 'Konsultasi & Pemeriksaan Dokter',
        quantity: 1,
        unitPrice: 35000,
        discount: 0,
        subtotal: 35000,
        notes: 'Pemeriksaan Rawat Jalan',
      });
    }

    // Hitung total kotor
    const totalAmount = items.reduce((sum, it) => sum + (parseFloat(it.subtotal) || 0), 0);
    const discountAmount = existingInvoice ? parseFloat(existingInvoice.discountAmount || '0') : 0;
    const taxAmount = existingInvoice ? parseFloat(existingInvoice.taxAmount || '0') : 0;
    const finalAmount = Math.max(0, totalAmount - discountAmount + taxAmount);
    const paidAmount = existingInvoice ? parseFloat(existingInvoice.paidAmount || '0') : 0;
    const balanceAmount = Math.max(0, finalAmount - paidAmount);

    let status = 'UNPAID';
    if (paidAmount >= finalAmount && finalAmount > 0) {
      status = 'PAID';
    } else if (paidAmount > 0) {
      status = 'PARTIAL';
    }

    if (existingInvoice) {
      // Update invoice yang ada
      const updated = await repo.updateInvoice(
        existingInvoice.id,
        {
          encounterId: encounter ? encounter.id : existingInvoice.encounterId,
          totalAmount: String(totalAmount),
          discountAmount: String(discountAmount),
          taxAmount: String(taxAmount),
          finalAmount: String(finalAmount),
          balanceAmount: String(balanceAmount),
          status,
        },
        items,
        tx
      );

      await logAudit({
        userId,
        action: 'UPDATE',
        entityType: 'invoices',
        entityId: existingInvoice.id,
        newValues: { totalAmount, finalAmount, balanceAmount, itemCount: items.length },
        ipAddress,
        userAgent,
      });

      return updated;
    } else {
      // Buat invoice baru
      const invoiceNumber = await repo.generateInvoiceNumber(tx);
      const invoiceData = {
        invoiceNumber,
        registrationId,
        encounterId: encounter ? encounter.id : null,
        patientId: reg.patientId,
        status,
        paymentScheme: reg.paymentMethod || 'UMUM',
        totalAmount: String(totalAmount),
        discountAmount: String(discountAmount),
        taxAmount: String(taxAmount),
        finalAmount: String(finalAmount),
        paidAmount: String(paidAmount),
        balanceAmount: String(balanceAmount),
        createdById: userId || null,
      };

      const created = await repo.createInvoice(invoiceData, items, tx);

      await logAudit({
        userId,
        action: 'CREATE',
        entityType: 'invoices',
        entityId: created.id,
        newValues: { invoiceNumber, finalAmount, registrationId },
        ipAddress,
        userAgent,
      });

      return created;
    }
  });
}

// ─── 5. Create Manual / Custom Invoice ─────────────────────────────────────────
async function createInvoice(payload, { userId, ipAddress, userAgent }) {
  return db.transaction(async (tx) => {
    // Validasi registration
    const [reg] = await tx
      .select({ patientId: registrations.patientId, paymentMethod: registrations.paymentMethod })
      .from(registrations)
      .where(eq(registrations.id, payload.registrationId))
      .limit(1);

    if (!reg) {
      const err = new Error('Data registrasi tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const items = payload.items.map((it) => {
      const qty = it.quantity || 1;
      const price = parseFloat(it.unitPrice || '0');
      const disc = parseFloat(it.discount || '0');
      const sub = Math.max(0, qty * price - disc);
      return {
        ...it,
        quantity: qty,
        unitPrice: price,
        discount: disc,
        subtotal: sub,
      };
    });

    const totalAmount = items.reduce((sum, it) => sum + it.subtotal, 0);
    const discountAmount = parseFloat(payload.discountAmount || '0');
    const taxAmount = parseFloat(payload.taxAmount || '0');
    const finalAmount = Math.max(0, totalAmount - discountAmount + taxAmount);

    const invoiceNumber = await repo.generateInvoiceNumber(tx);
    const invoiceData = {
      invoiceNumber,
      registrationId: payload.registrationId,
      encounterId: payload.encounterId || null,
      patientId: reg.patientId,
      status: 'UNPAID',
      paymentScheme: payload.paymentScheme || reg.paymentMethod || 'UMUM',
      totalAmount: String(totalAmount),
      discountAmount: String(discountAmount),
      taxAmount: String(taxAmount),
      finalAmount: String(finalAmount),
      paidAmount: '0',
      balanceAmount: String(finalAmount),
      dueDate: payload.dueDate || new Date().toISOString().substring(0, 10),
      notes: payload.notes || null,
      createdById: userId || null,
    };

    const created = await repo.createInvoice(invoiceData, items, tx);

    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'invoices',
      entityId: created.id,
      newValues: { invoiceNumber, finalAmount },
      ipAddress,
      userAgent,
    });

    return created;
  });
}

// ─── 6. Update Invoice (Diskon, Penyesuaian Item, Catatan) ────────────────────
async function updateInvoice(id, payload, { userId, ipAddress, userAgent }) {
  return db.transaction(async (tx) => {
    const existing = await repo.getInvoiceById(id, tx);
    if (!existing) {
      const err = new Error('Invoice tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (existing.status === 'PAID') {
      const err = new Error('Invoice sudah lunas dan tidak dapat diubah lagi');
      err.statusCode = 400;
      throw err;
    }

    let items = existing.items;
    if (payload.items && Array.isArray(payload.items)) {
      items = payload.items.map((it) => {
        const qty = it.quantity || 1;
        const price = parseFloat(it.unitPrice || '0');
        const disc = parseFloat(it.discount || '0');
        const sub = Math.max(0, qty * price - disc);
        return {
          ...it,
          quantity: qty,
          unitPrice: price,
          discount: disc,
          subtotal: sub,
        };
      });
    }

    const totalAmount = items.reduce((sum, it) => sum + (parseFloat(it.subtotal) || 0), 0);
    const discountAmount = payload.discountAmount !== undefined ? parseFloat(payload.discountAmount) : parseFloat(existing.discountAmount);
    const taxAmount = payload.taxAmount !== undefined ? parseFloat(payload.taxAmount) : parseFloat(existing.taxAmount);
    const finalAmount = Math.max(0, totalAmount - discountAmount + taxAmount);
    const paidAmount = parseFloat(existing.paidAmount || '0');
    const balanceAmount = Math.max(0, finalAmount - paidAmount);

    let status = 'UNPAID';
    if (balanceAmount <= 0.01 && finalAmount > 0) {
      status = 'PAID';
    } else if (paidAmount > 0) {
      status = 'PARTIAL';
    }

    const updateData = {
      totalAmount: String(totalAmount),
      discountAmount: String(discountAmount),
      taxAmount: String(taxAmount),
      finalAmount: String(finalAmount),
      balanceAmount: String(balanceAmount),
      status,
      notes: payload.notes !== undefined ? payload.notes : existing.notes,
      paymentScheme: payload.paymentScheme || existing.paymentScheme,
    };

    const updated = await repo.updateInvoice(id, updateData, payload.items ? items : null, tx);

    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'invoices',
      entityId: id,
      newValues: { finalAmount, balanceAmount, status },
      ipAddress,
      userAgent,
    });

    return updated;
  });
}

// ─── 7. Process Payment Transaction (Atomic) ──────────────────────────────────
async function processPayment(payload, { userId, ipAddress, userAgent }) {
  return db.transaction(async (tx) => {
    // 1. Lock invoice
    const invRows = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, payload.invoiceId))
      .for('update');

    if (invRows.length === 0) {
      const err = new Error('Invoice tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const inv = invRows[0];

    if (inv.status === 'PAID') {
      const err = new Error('Tagihan ini sudah lunas sebelumnya');
      err.statusCode = 400;
      throw err;
    }

    if (inv.status === 'CANCELLED') {
      const err = new Error('Tagihan ini telah dibatalkan');
      err.statusCode = 400;
      throw err;
    }

    const amount = parseFloat(payload.amount);
    const currentBalance = parseFloat(inv.balanceAmount);

    if (isNaN(amount) || amount <= 0) {
      const err = new Error('Nominal pembayaran harus lebih besar dari Rp 0');
      err.statusCode = 400;
      throw err;
    }

    if (amount > currentBalance + 0.01) {
      const err = new Error(`Nominal bayar (Rp ${amount.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${currentBalance.toLocaleString('id-ID')})`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Hitung cash tendered & kembalian jika Tunai
    let cashTendered = 0;
    let changeAmount = 0;

    if (payload.paymentMethod === 'TUNAI') {
      cashTendered = parseFloat(payload.cashTendered || '0');
      if (isNaN(cashTendered) || cashTendered < amount) {
        const err = new Error('Uang tunai yang diterima kurang dari nominal pembayaran');
        err.statusCode = 400;
        throw err;
      }
      changeAmount = Math.max(0, cashTendered - amount);
    } else {
      cashTendered = amount;
      changeAmount = 0;
    }

    // 3. Generate nomor kuitansi pembayaran
    const paymentNumber = await repo.generatePaymentNumber(tx);

    // 4. Simpan pembayaran
    const paymentRecord = await repo.recordPayment(
      {
        paymentNumber,
        invoiceId: inv.id,
        patientId: inv.patientId,
        paymentMethod: payload.paymentMethod,
        amount: String(amount),
        cashTendered: String(cashTendered),
        changeAmount: String(changeAmount),
        bankName: payload.bankName || null,
        referenceNumber: payload.referenceNumber || null,
        notes: payload.notes || null,
        cashierId: userId || null,
        paidAt: new Date(),
      },
      tx
    );

    // 5. Update saldo dan status invoice
    const newPaidAmount = parseFloat(inv.paidAmount) + amount;
    const newBalanceAmount = Math.max(0, parseFloat(inv.finalAmount) - newPaidAmount);
    const newStatus = newBalanceAmount <= 0.01 ? 'PAID' : 'PARTIAL';

    await tx
      .update(invoices)
      .set({
        paidAmount: String(newPaidAmount),
        balanceAmount: String(newBalanceAmount),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, inv.id));

    // 6. Audit Trail
    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'payments',
      entityId: paymentRecord.id,
      newValues: {
        paymentNumber,
        invoiceNumber: inv.invoiceNumber,
        paymentMethod: payload.paymentMethod,
        amount,
        newStatus,
      },
      ipAddress,
      userAgent,
    });

    // 7. Kembalikan detail payment lengkap dengan kuitansi resmi
    return repo.getPaymentById(paymentRecord.id, tx);
  });
}

// ─── 8. Payments List & Receipt Detail ─────────────────────────────────────────
async function getPayments(params) {
  return repo.getPayments(params);
}

async function getPaymentById(id) {
  const payment = await repo.getPaymentById(id);
  if (!payment) {
    const err = new Error('Bukti pembayaran tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return payment;
}

// ─── 10. Laporan Keuangan Harian Pasien Umum ─────────────────────────────────
async function getDailyGeneralRevenue(params) {
  return repo.getDailyGeneralRevenue(params);
}

module.exports = {
  getDashboardStats,
  getInvoices,
  getInvoiceById,
  generateOrSyncInvoice,
  createInvoice,
  updateInvoice,
  processPayment,
  getPayments,
  getPaymentById,
  getDailyGeneralRevenue,
};
