const repo = require('./pharmacy.repository');
const { db } = require('../../db');
const { prescriptions, drugBatches, drugs, shiftStockLogs, shiftStockLogItems, drugStockMovements } = require('../../db/schema');
const { eq, and, sql, desc, asc } = require('drizzle-orm');

// ─── Helper: Generator Nomor Resep (RES-YYYYMMDD-XXXX) ────────────────────────
async function generatePrescriptionNumber(tx = db) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = `RES-${year}${month}${day}`;

  const [latest] = await tx
    .select({ prescriptionNumber: prescriptions.prescriptionNumber })
    .from(prescriptions)
    .where(sql`${prescriptions.prescriptionNumber} LIKE ${prefix + '-%'}`)
    .orderBy(desc(prescriptions.prescriptionNumber))
    .limit(1);

  let seq = 1;
  if (latest && latest.prescriptionNumber) {
    const parts = latest.prescriptionNumber.split('-');
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

// ─── 1. Katalog Obat & Stok ───────────────────────────────────────────────────

async function getDrugs(params) {
  return repo.getDrugsWithStockSummary(params);
}

async function getDrugDetail(id) {
  const drug = await repo.getDrugById(id);
  if (!drug) {
    const err = new Error('Obat tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  const batches = await repo.getDrugBatches(id);
  return {
    ...drug,
    batches,
  };
}

async function getExpiringAlerts(daysThreshold = 90) {
  return repo.getExpiringBatches({ daysThreshold });
}

async function receiveBatch(data, context) {
  return db.transaction(async (tx) => {
    const drug = await repo.getDrugById(data.drugId);
    if (!drug) {
      const err = new Error('Obat tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const batchData = {
      drugId: data.drugId,
      batchNumber: data.batchNumber || `BATCH-${Date.now().toString().slice(-6)}`,
      expiryDate: data.expiryDate,
      purchaseDate: data.purchaseDate || new Date().toISOString().slice(0, 10),
      supplierId: data.supplierId || null,
      supplierName: data.supplierName || null,
      storageLocation: data.storageLocation || 'GUDANG_FARMASI',
      purchasePrice: String(data.purchasePrice || drug.basePrice || 0),
      sellingPrice: String(data.sellingPrice || drug.sellingPrice || 0),
      initialQty: data.initialQty,
      currentQty: data.initialQty,
      notes: data.notes || null,
      isActive: true,
      createdBy: context.userId || null,
    };

    const createdBatch = await repo.createBatch(batchData, tx);

    // Catat mutasi stok
    await repo.recordStockMovement(
      {
        batchId: createdBatch.id,
        drugId: data.drugId,
        movementType: 'PENERIMAAN_BATCH',
        quantity: data.initialQty,
        quantityBefore: Number(drug.currentStock || 0),
        quantityAfter: Number(drug.currentStock || 0) + data.initialQty,
        referenceType: 'BATCH_RECEIVE',
        referenceId: createdBatch.id,
        reason: data.notes || 'Penerimaan Pengadaan Stok Baru',
        movedBy: context.userId || null,
      },
      tx
    );

    return createdBatch;
  });
}

async function adjustStock(data, context) {
  return db.transaction(async (tx) => {
    const [batch] = await tx
      .select()
      .from(drugBatches)
      .where(and(eq(drugBatches.id, data.batchId), eq(drugBatches.drugId, data.drugId)))
      .limit(1);

    if (!batch) {
      const err = new Error('Batch obat tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const currentQty = Number(batch.currentQty);
    const adjustQty = Number(data.quantity);
    const newQty = currentQty + adjustQty;

    if (newQty < 0) {
      const err = new Error(`Pengurangan melebihi sisa stok batch saat ini (${currentQty})`);
      err.statusCode = 400;
      throw err;
    }

    // Update batch
    await tx
      .update(drugBatches)
      .set({
        currentQty: newQty,
        updatedAt: sql`now()`,
      })
      .where(eq(drugBatches.id, data.batchId));

    // Sinkronkan current_stock di drugs
    await tx.execute(
      sql`UPDATE drugs 
          SET current_stock = (SELECT COALESCE(SUM(current_qty), 0) FROM drug_batches WHERE drug_id = ${data.drugId} AND is_active = true)
          WHERE id = ${data.drugId}`
    );

    // Catat mutasi stok
    await repo.recordStockMovement(
      {
        batchId: data.batchId,
        drugId: data.drugId,
        movementType: 'PENYESUAIAN_MANUAL',
        quantity: adjustQty,
        quantityBefore: currentQty,
        quantityAfter: newQty,
        referenceType: 'ADJUSTMENT',
        reason: data.reason,
        notes: data.notes || null,
        movedBy: context.userId || null,
      },
      tx
    );

    return {
      batchId: data.batchId,
      drugId: data.drugId,
      previousQty: currentQty,
      newQty,
    };
  });
}

async function getDrugStockMovements(drugId) {
  return repo.getStockMovementsByDrug(drugId);
}

// ─── 2. Resep Dokter & Dispensing Farmasi ─────────────────────────────────────

async function getPrescriptionsQueue(params) {
  return repo.getPrescriptionsQueue(params);
}

async function getPrescriptionDetail(id) {
  const p = await repo.getPrescriptionById(id);
  if (!p) {
    const err = new Error('Resep tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return p;
}

async function getPrescriptionByEncounter(encounterId) {
  return repo.getPrescriptionByEncounter(encounterId);
}

async function createPrescription(body, context) {
  return db.transaction(async (tx) => {
    const { encounterId, notes, items } = body;

    // Ambil info encounter
    const [enc] = await tx
      .select({
        id: sql`encounters.id`,
        patientId: sql`encounters.patient_id`,
        practitionerId: sql`encounters.practitioner_id`,
        status: sql`encounters.status`,
      })
      .from(sql`encounters`)
      .where(sql`encounters.id = ${encounterId}`)
      .limit(1);

    if (!enc) {
      const err = new Error('Encounter tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // Cek apakah sudah ada resep untuk encounter ini
    const existing = await repo.getPrescriptionByEncounter(encounterId);
    if (existing && existing.status !== 'CANCELLED') {
      const err = new Error(`Resep untuk encounter ini sudah dibuat (${existing.prescriptionNumber})`);
      err.statusCode = 400;
      throw err;
    }

    const prescriptionNumber = await generatePrescriptionNumber(tx);

    // Siapkan item resep dengan snapshot nama & harga obat
    const preparedItems = [];
    for (const item of items) {
      const drug = await repo.getDrugById(item.drugId);
      if (!drug) {
        const err = new Error(`Obat dengan ID ${item.drugId} tidak ditemukan`);
        err.statusCode = 404;
        throw err;
      }

      const unitPrice = Number(drug.sellingPrice || 0);
      const subtotal = unitPrice * item.quantity;

      preparedItems.push({
        drugId: item.drugId,
        drugName: drug.name,
        dosageForm: drug.dosageForm,
        quantity: item.quantity,
        unit: drug.unitCode || 'TAB',
        signa: item.signa,
        durationDays: item.durationDays || null,
        notes: item.notes || null,
        unitPrice: String(unitPrice),
        subtotal: String(subtotal),
      });
    }

    const prescriptionData = {
      prescriptionNumber,
      encounterId,
      patientId: enc.patientId,
      practitionerId: enc.practitionerId,
      status: 'PENDING',
      notes: notes || null,
    };

    const created = await repo.createPrescriptionWithItems(
      { prescriptionData, itemsData: preparedItems },
      tx
    );

    return created;
  });
}

async function dispensePrescription(id, body, context) {
  return db.transaction(async (tx) => {
    const prescription = await repo.getPrescriptionById(id);
    if (!prescription) {
      const err = new Error('Resep tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (prescription.status === 'DISPENSED') {
      const err = new Error('Resep ini sudah selesai diserahkan (DISPENSED)');
      err.statusCode = 400;
      throw err;
    }

    if (prescription.status === 'CANCELLED') {
      const err = new Error('Resep ini sudah dibatalkan');
      err.statusCode = 400;
      throw err;
    }

    // Cek apakah ada shift log yang sedang OPEN
    const activeShift = await repo.getActiveShiftLog();

    // Proses setiap item obat
    for (const item of prescription.items) {
      const qtyToDispense = item.quantity;
      let remainingToAllocate = qtyToDispense;

      // Ambil batch aktif berdasarkan FEFO (expiry_date ASC)
      const batches = await tx
        .select()
        .from(drugBatches)
        .where(
          and(
            eq(drugBatches.drugId, item.drugId),
            eq(drugBatches.isActive, true),
            sql`${drugBatches.currentQty} > 0`
          )
        )
        .orderBy(asc(drugBatches.expiryDate));

      let primaryBatchId = null;

      if (batches.length === 0) {
        // Warning: Jika stok fisik tidak ada di batch, potong dari batch pertama yang ada atau catat minus (sesuai SOP klinik Rizani)
        const allBatches = await tx
          .select()
          .from(drugBatches)
          .where(eq(drugBatches.drugId, item.drugId))
          .orderBy(desc(drugBatches.createdAt))
          .limit(1);

        if (allBatches.length > 0) {
          primaryBatchId = allBatches[0].id;
          await tx
            .update(drugBatches)
            .set({
              currentQty: sql`current_qty - ${remainingToAllocate}`,
              updatedAt: sql`now()`,
            })
            .where(eq(drugBatches.id, primaryBatchId));

          await repo.recordStockMovement(
            {
              batchId: primaryBatchId,
              drugId: item.drugId,
              movementType: 'DISPENSING_RESEP',
              quantity: -remainingToAllocate,
              quantityBefore: Number(allBatches[0].currentQty),
              quantityAfter: Number(allBatches[0].currentQty) - remainingToAllocate,
              referenceType: 'PRESCRIPTION',
              referenceId: prescription.id,
              prescriptionItemId: item.id,
              reason: `Dispensing Resep ${prescription.prescriptionNumber} (Override Stok Habis)`,
              movedBy: context.userId || null,
            },
            tx
          );
        }
      } else {
        // Alokasi FEFO
        for (const b of batches) {
          if (remainingToAllocate <= 0) break;
          const availableInBatch = Number(b.currentQty);
          const take = Math.min(availableInBatch, remainingToAllocate);

          if (!primaryBatchId) primaryBatchId = b.id;

          await tx
            .update(drugBatches)
            .set({
              currentQty: sql`current_qty - ${take}`,
              updatedAt: sql`now()`,
            })
            .where(eq(drugBatches.id, b.id));

          await repo.recordStockMovement(
            {
              batchId: b.id,
              drugId: item.drugId,
              movementType: 'DISPENSING_RESEP',
              quantity: -take,
              quantityBefore: availableInBatch,
              quantityAfter: availableInBatch - take,
              referenceType: 'PRESCRIPTION',
              referenceId: prescription.id,
              prescriptionItemId: item.id,
              reason: `Dispensing Resep ${prescription.prescriptionNumber}`,
              movedBy: context.userId || null,
            },
            tx
          );

          remainingToAllocate -= take;
        }
      }

      // Update prescription item: batchId & dispensedQty
      await tx
        .update(prescriptionItems)
        .set({
          batchId: primaryBatchId,
          dispensedQty: qtyToDispense,
        })
        .where(eq(prescriptionItems.id, item.id));

      // Sinkronkan current_stock di drugs
      await tx.execute(
        sql`UPDATE drugs 
            SET current_stock = (SELECT COALESCE(SUM(current_qty), 0) FROM drug_batches WHERE drug_id = ${item.drugId} AND is_active = true)
            WHERE id = ${item.drugId}`
      );

      // Jika shift sedang OPEN, update usageShift di shift log
      if (activeShift) {
        await tx
          .update(shiftStockLogItems)
          .set({
            usageShift: sql`usage_shift + ${qtyToDispense}`,
            stockEnd: sql`stock_start - (usage_shift + ${qtyToDispense}) - usage_non_shift + adjustment`,
          })
          .where(
            and(
              eq(shiftStockLogItems.shiftLogId, activeShift.id),
              eq(shiftStockLogItems.drugId, item.drugId)
            )
          );
      }
    }

    // Update status resep menjadi DISPENSED
    const updatedPrescription = await repo.updatePrescriptionStatus(
      id,
      {
        status: 'DISPENSED',
        pharmacistId: context.userId,
      },
      tx
    );

    return updatedPrescription;
  });
}

async function cancelPrescription(id, body, context) {
  const existing = await repo.getPrescriptionById(id);
  if (!existing) {
    const err = new Error('Resep tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  if (existing.status === 'DISPENSED') {
    const err = new Error('Resep yang sudah diserahkan (DISPENSED) tidak dapat dibatalkan');
    err.statusCode = 400;
    throw err;
  }

  return repo.updatePrescriptionStatus(id, {
    status: 'CANCELLED',
    cancellationReason: body.reason,
    pharmacistId: context.userId,
  });
}

// ─── 3. Pemantauan Shift Farmasi ──────────────────────────────────────────────

async function getActiveShift() {
  return repo.getActiveShiftLog();
}

async function getShiftHistory(params) {
  return repo.getShiftLogsHistory(params);
}

async function openShift(body, context) {
  return db.transaction(async (tx) => {
    const existing = await repo.getActiveShiftLog();
    if (existing) {
      const err = new Error(`Shift ${existing.shiftType} tanggal ${existing.logDate} masih aktif. Tutup shift terlebih dahulu.`);
      err.statusCode = 400;
      throw err;
    }

    // Ambil seluruh obat aktif & stok saat ini
    const allDrugs = await tx
      .select({
        id: drugs.id,
        currentStock: drugs.currentStock,
      })
      .from(drugs)
      .where(eq(drugs.isActive, true));

    const initialItems = allDrugs.map((d) => ({
      drugId: d.id,
      stockStart: Number(d.currentStock || 0),
    }));

    const shiftData = {
      logDate: body.logDate || new Date().toISOString().slice(0, 10),
      shiftType: body.shiftType,
      shiftStartTime: sql`CURRENT_TIME`,
      status: 'OPEN',
      openedBy: context.userId || null,
      notes: body.notes || null,
    };

    const newShift = await repo.createShiftLog({ shiftData, initialItems }, tx);
    return newShift;
  });
}

async function updateShiftItems(shiftId, body, context) {
  return db.transaction(async (tx) => {
    await repo.updateShiftLogItemsBatch(shiftId, body.items, tx);
    return { success: true, message: 'Data pemakaian shift berhasil diperbarui' };
  });
}

async function closeShift(shiftId, context) {
  return db.transaction(async (tx) => {
    const closed = await repo.closeShiftLog(shiftId, context.userId, tx);
    return closed;
  });
}

// ─── 4. Stock Opname Periodik ─────────────────────────────────────────────────

async function getStockOpnames(params) {
  return repo.getStockOpnamesList(params);
}

async function getStockOpnameDetail(id) {
  const so = await repo.getStockOpnameById(id);
  if (!so) {
    const err = new Error('Stock Opname tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return so;
}

async function createStockOpname(body, context) {
  return db.transaction(async (tx) => {
    // Snapshot semua obat dan batch utamanya
    const allDrugs = await tx
      .select({
        drugId: drugs.id,
        currentStock: drugs.currentStock,
      })
      .from(drugs)
      .where(eq(drugs.isActive, true));

    const initialItems = [];
    for (const d of allDrugs) {
      const [primaryBatch] = await tx
        .select({ id: drugBatches.id, expiryDate: drugBatches.expiryDate, notes: drugBatches.notes })
        .from(drugBatches)
        .where(eq(drugBatches.drugId, d.drugId))
        .orderBy(asc(drugBatches.expiryDate))
        .limit(1);

      initialItems.push({
        drugId: d.drugId,
        batchId: primaryBatch ? primaryBatch.id : null,
        systemQty: Number(d.currentStock || 0),
        expiryDate: primaryBatch ? primaryBatch.expiryDate : null,
        expiryNotes: primaryBatch ? primaryBatch.notes : null,
      });
    }

    const opnameData = {
      opnameDate: body.opnameDate || new Date().toISOString().slice(0, 10),
      period: body.period,
      status: 'DRAFT',
      notes: body.notes || null,
      createdBy: context.userId || null,
    };

    const createdSO = await repo.createStockOpname({ opnameData, initialItems }, tx);
    return createdSO;
  });
}

async function updateStockOpnameItems(opnameId, body, context) {
  return db.transaction(async (tx) => {
    await repo.updateStockOpnameItemsBatch(opnameId, body.items, tx);
    return { success: true, message: 'Hasil hitung fisik SO tersimpan' };
  });
}

async function finalizeStockOpname(opnameId, context) {
  return db.transaction(async (tx) => {
    const so = await repo.getStockOpnameById(opnameId);
    if (!so) {
      const err = new Error('Stock Opname tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (so.status === 'FINALIZED') {
      const err = new Error('Stock Opname ini sudah difinalisasi');
      err.statusCode = 400;
      throw err;
    }

    // Auto-adjust selisih untuk setiap item
    for (const item of so.items) {
      const selisih = Number(item.selisih || 0);
      if (selisih !== 0 && item.batchId) {
        await tx
          .update(drugBatches)
          .set({
            currentQty: item.physicalQty,
            expiryDate: item.expiryDate || sql`expiry_date`,
            updatedAt: sql`now()`,
          })
          .where(eq(drugBatches.id, item.batchId));

        await repo.recordStockMovement(
          {
            batchId: item.batchId,
            drugId: item.drugId,
            movementType: 'STOCK_OPNAME',
            quantity: selisih,
            quantityBefore: item.systemQty,
            quantityAfter: item.physicalQty,
            referenceType: 'STOCK_OPNAME',
            referenceId: opnameId,
            reason: item.adjustmentReason || `Penyesuaian SO ${so.period}`,
            movedBy: context.userId || null,
          },
          tx
        );

        // Sinkronkan current_stock di drugs
        await tx.execute(
          sql`UPDATE drugs 
              SET current_stock = (SELECT COALESCE(SUM(current_qty), 0) FROM drug_batches WHERE drug_id = ${item.drugId} AND is_active = true)
              WHERE id = ${item.drugId}`
        );
      }
    }

    const finalized = await repo.finalizeStockOpname(opnameId, context.userId, tx);
    return finalized;
  });
}

async function getDashboardStats() {
  return repo.getDashboardStats();
}

module.exports = {
  getDrugs,
  getDrugDetail,
  getExpiringAlerts,
  receiveBatch,
  adjustStock,
  getDrugStockMovements,
  getPrescriptionsQueue,
  getPrescriptionDetail,
  getPrescriptionByEncounter,
  createPrescription,
  dispensePrescription,
  cancelPrescription,
  getActiveShift,
  getShiftHistory,
  openShift,
  updateShiftItems,
  closeShift,
  getStockOpnames,
  getStockOpnameDetail,
  createStockOpname,
  updateStockOpnameItems,
  finalizeStockOpname,
  getDashboardStats,
};
