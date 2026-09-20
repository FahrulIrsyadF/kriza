const { db } = require('../../db');
const {
  drugs,
  drugUnits,
  drugBatches,
  drugPrices,
  drugStockMovements,
  prescriptions,
  prescriptionItems,
  shiftStockLogs,
  shiftStockLogItems,
  stockOpnames,
  stockOpnameItems,
  suppliers,
  patients,
  practitioners,
  encounters,
  polyclinics,
  users,
} = require('../../db/schema');
const { eq, and, sql, desc, asc, ilike, or, gte, lte, isNull } = require('drizzle-orm');

// ─── 1. Manajemen Stok & Katalog Obat ─────────────────────────────────────────

async function getDrugsWithStockSummary({ search, dosageForm, category, criticalOnly = false, limit = 50, offset = 0 } = {}) {
  const conditions = [isNull(drugs.deletedAt)];

  if (search) {
    conditions.push(
      or(
        ilike(drugs.name, `%${search}%`),
        ilike(drugs.code, `%${search}%`),
        ilike(drugs.genericName, `%${search}%`)
      )
    );
  }

  if (dosageForm) {
    conditions.push(eq(drugs.dosageForm, dosageForm));
  }

  if (category) {
    conditions.push(eq(drugs.category, category));
  }

  const baseQuery = db
    .select({
      id: drugs.id,
      code: drugs.code,
      name: drugs.name,
      genericName: drugs.genericName,
      dosageForm: drugs.dosageForm,
      category: drugs.category,
      basePrice: drugs.basePrice,
      sellingPrice: drugs.sellingPrice,
      defaultMarkupPercent: drugs.defaultMarkupPercent,
      defaultSigna: drugs.defaultSigna,
      minStock: drugs.minStock,
      currentStock: drugs.currentStock,
      requiresPrescription: drugs.requiresPrescription,
      isActive: drugs.isActive,
      unitCode: drugUnits.code,
      unitName: drugUnits.name,
      totalBatchStock: sql`COALESCE(SUM(${drugBatches.currentQty}), 0)::int`,
      nearestExpiry: sql`MIN(CASE WHEN ${drugBatches.currentQty} > 0 THEN ${drugBatches.expiryDate} END)`,
      activeBatchCount: sql`COUNT(CASE WHEN ${drugBatches.currentQty} > 0 THEN 1 END)::int`,
    })
    .from(drugs)
    .leftJoin(drugUnits, eq(drugs.unitId, drugUnits.id))
    .leftJoin(drugBatches, and(eq(drugBatches.drugId, drugs.id), eq(drugBatches.isActive, true)))
    .where(and(...conditions))
    .groupBy(drugs.id, drugUnits.id)
    .orderBy(drugs.name);

  const results = await baseQuery;

  let filtered = results;
  if (criticalOnly) {
    filtered = results.filter((item) => Number(item.totalBatchStock) <= Number(item.minStock));
  }

  const paginated = filtered.slice(offset, offset + limit);

  return {
    items: paginated,
    total: filtered.length,
  };
}

async function getDrugById(id) {
  const rows = await db
    .select({
      id: drugs.id,
      code: drugs.code,
      name: drugs.name,
      genericName: drugs.genericName,
      dosageForm: drugs.dosageForm,
      category: drugs.category,
      basePrice: drugs.basePrice,
      sellingPrice: drugs.sellingPrice,
      defaultMarkupPercent: drugs.defaultMarkupPercent,
      defaultSigna: drugs.defaultSigna,
      minStock: drugs.minStock,
      currentStock: drugs.currentStock,
      bpjsDrugCode: drugs.bpjsDrugCode,
      manufacturer: drugs.manufacturer,
      requiresPrescription: drugs.requiresPrescription,
      isActive: drugs.isActive,
      unitId: drugs.unitId,
      unitCode: drugUnits.code,
      unitName: drugUnits.name,
    })
    .from(drugs)
    .leftJoin(drugUnits, eq(drugs.unitId, drugUnits.id))
    .where(and(eq(drugs.id, id), isNull(drugs.deletedAt)))
    .limit(1);

  return rows[0] || null;
}

async function getDrugBatches(drugId) {
  return db
    .select({
      id: drugBatches.id,
      batchNumber: drugBatches.batchNumber,
      expiryDate: drugBatches.expiryDate,
      purchaseDate: drugBatches.purchaseDate,
      storageLocation: drugBatches.storageLocation,
      purchasePrice: drugBatches.purchasePrice,
      sellingPrice: drugBatches.sellingPrice,
      initialQty: drugBatches.initialQty,
      currentQty: drugBatches.currentQty,
      supplierName: drugBatches.supplierName,
      notes: drugBatches.notes,
      isActive: drugBatches.isActive,
    })
    .from(drugBatches)
    .where(and(eq(drugBatches.drugId, drugId), eq(drugBatches.isActive, true)))
    .orderBy(asc(drugBatches.expiryDate)); // FEFO Order
}

async function getExpiringBatches({ daysThreshold = 90 } = {}) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysThreshold);
  const targetStr = targetDate.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  return db
    .select({
      batchId: drugBatches.id,
      batchNumber: drugBatches.batchNumber,
      expiryDate: drugBatches.expiryDate,
      currentQty: drugBatches.currentQty,
      drugId: drugs.id,
      drugCode: drugs.code,
      drugName: drugs.name,
      dosageForm: drugs.dosageForm,
      unitName: drugUnits.name,
    })
    .from(drugBatches)
    .innerJoin(drugs, eq(drugBatches.drugId, drugs.id))
    .leftJoin(drugUnits, eq(drugs.unitId, drugUnits.id))
    .where(
      and(
        eq(drugBatches.isActive, true),
        sql`${drugBatches.currentQty} > 0`,
        lte(drugBatches.expiryDate, targetStr),
        gte(drugBatches.expiryDate, todayStr)
      )
    )
    .orderBy(asc(drugBatches.expiryDate));
}

async function createBatch(data, tx = db) {
  const [batch] = await tx.insert(drugBatches).values(data).returning();

  // Sinkronkan current_stock di tabel drugs
  await tx.execute(
    sql`UPDATE drugs 
        SET current_stock = (SELECT COALESCE(SUM(current_qty), 0) FROM drug_batches WHERE drug_id = ${data.drugId} AND is_active = true)
        WHERE id = ${data.drugId}`
  );

  return batch;
}

async function recordStockMovement(movementData, tx = db) {
  return tx.insert(drugStockMovements).values(movementData).returning();
}

async function getStockMovementsByDrug(drugId, { limit = 50 } = {}) {
  return db
    .select({
      id: drugStockMovements.id,
      movementType: drugStockMovements.movementType,
      quantity: drugStockMovements.quantity,
      quantityBefore: drugStockMovements.quantityBefore,
      quantityAfter: drugStockMovements.quantityAfter,
      referenceType: drugStockMovements.referenceType,
      reason: drugStockMovements.reason,
      movedAt: drugStockMovements.movedAt,
      batchNumber: drugBatches.batchNumber,
      expiryDate: drugBatches.expiryDate,
      movedByName: users.name,
    })
    .from(drugStockMovements)
    .leftJoin(drugBatches, eq(drugStockMovements.batchId, drugBatches.id))
    .leftJoin(users, eq(drugStockMovements.movedBy, users.id))
    .where(eq(drugStockMovements.drugId, drugId))
    .orderBy(desc(drugStockMovements.movedAt))
    .limit(limit);
}

// ─── 2. Resep Elektronik & Dispensing ─────────────────────────────────────────

async function getPrescriptionsQueue({ status, date, limit = 50, offset = 0 } = {}) {
  const conditions = [];

  if (status) {
    conditions.push(eq(prescriptions.status, status));
  }
  if (date) {
    conditions.push(sql`DATE(${prescriptions.createdAt}) = ${date}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select({
      id: prescriptions.id,
      prescriptionNumber: prescriptions.prescriptionNumber,
      status: prescriptions.status,
      dispensedAt: prescriptions.dispensedAt,
      notes: prescriptions.notes,
      createdAt: prescriptions.createdAt,
      encounterId: encounters.id,
      encounterDate: encounters.encounterDate,
      patientId: patients.id,
      patientName: patients.name,
      patientMrn: patients.medicalRecordNumber,
      patientGender: patients.gender,
      patientDob: patients.birthDate,
      practitionerName: practitioners.name,
      polyclinicName: polyclinics.name,
      itemCount: sql`COALESCE((SELECT COUNT(*)::int FROM prescription_items WHERE prescription_items.prescription_id = ${prescriptions.id}), 0)`,
    })
    .from(prescriptions)
    .innerJoin(encounters, eq(prescriptions.encounterId, encounters.id))
    .innerJoin(patients, eq(prescriptions.patientId, patients.id))
    .innerJoin(practitioners, eq(prescriptions.practitionerId, practitioners.id))
    .leftJoin(polyclinics, eq(encounters.polyclinicId, polyclinics.id))
    .where(whereClause)
    .orderBy(desc(prescriptions.createdAt))
    .limit(limit)
    .offset(offset);

  return items;
}

async function getPrescriptionById(id) {
  const [p] = await db
    .select({
      id: prescriptions.id,
      prescriptionNumber: prescriptions.prescriptionNumber,
      status: prescriptions.status,
      dispensedAt: prescriptions.dispensedAt,
      notes: prescriptions.notes,
      createdAt: prescriptions.createdAt,
      cancellationReason: prescriptions.cancellationReason,
      encounterId: encounters.id,
      encounterDate: encounters.encounterDate,
      patientId: patients.id,
      patientName: patients.name,
      patientMrn: patients.medicalRecordNumber,
      patientGender: patients.gender,
      patientDob: patients.birthDate,
      patientPhone: patients.phone,
      practitionerName: practitioners.name,
      polyclinicName: polyclinics.name,
      pharmacistName: users.name,
    })
    .from(prescriptions)
    .innerJoin(encounters, eq(prescriptions.encounterId, encounters.id))
    .innerJoin(patients, eq(prescriptions.patientId, patients.id))
    .innerJoin(practitioners, eq(prescriptions.practitionerId, practitioners.id))
    .leftJoin(polyclinics, eq(encounters.polyclinicId, polyclinics.id))
    .leftJoin(users, eq(prescriptions.pharmacistId, users.id))
    .where(eq(prescriptions.id, id))
    .limit(1);

  if (!p) return null;

  const items = await db
    .select({
      id: prescriptionItems.id,
      drugId: prescriptionItems.drugId,
      drugName: prescriptionItems.drugName,
      dosageForm: prescriptionItems.dosageForm,
      quantity: prescriptionItems.quantity,
      unit: prescriptionItems.unit,
      signa: prescriptionItems.signa,
      durationDays: prescriptionItems.durationDays,
      dispensedQty: prescriptionItems.dispensedQty,
      unitPrice: prescriptionItems.unitPrice,
      subtotal: prescriptionItems.subtotal,
      notes: prescriptionItems.notes,
      batchId: prescriptionItems.batchId,
      batchNumber: drugBatches.batchNumber,
      expiryDate: drugBatches.expiryDate,
      currentDrugStock: drugs.currentStock,
    })
    .from(prescriptionItems)
    .innerJoin(drugs, eq(prescriptionItems.drugId, drugs.id))
    .leftJoin(drugBatches, eq(prescriptionItems.batchId, drugBatches.id))
    .where(eq(prescriptionItems.prescriptionId, id));

  return {
    ...p,
    items,
  };
}

async function getPrescriptionByEncounter(encounterId) {
  const rows = await db
    .select({ id: prescriptions.id })
    .from(prescriptions)
    .where(eq(prescriptions.encounterId, encounterId))
    .limit(1);

  if (rows.length === 0) return null;
  return getPrescriptionById(rows[0].id);
}

async function createPrescriptionWithItems({ prescriptionData, itemsData }, tx = db) {
  const [createdPrescription] = await tx.insert(prescriptions).values(prescriptionData).returning();

  const preparedItems = itemsData.map((item) => ({
    ...item,
    prescriptionId: createdPrescription.id,
  }));

  const insertedItems = await tx.insert(prescriptionItems).values(preparedItems).returning();

  return {
    ...createdPrescription,
    items: insertedItems,
  };
}

async function updatePrescriptionStatus(id, { status, pharmacistId, cancellationReason }, tx = db) {
  const updateData = {
    status,
    updatedAt: sql`now()`,
  };

  if (status === 'DISPENSED') {
    updateData.dispensedAt = sql`now()`;
    updateData.pharmacistId = pharmacistId;
  }
  if (status === 'CANCELLED' && cancellationReason) {
    updateData.cancellationReason = cancellationReason;
  }

  const [updated] = await tx
    .update(prescriptions)
    .set(updateData)
    .where(eq(prescriptions.id, id))
    .returning();

  return updated;
}

// ─── 3. Pemantauan Shift Farmasi ──────────────────────────────────────────────

async function getActiveShiftLog() {
  const rows = await db
    .select({
      id: shiftStockLogs.id,
      logDate: shiftStockLogs.logDate,
      shiftType: shiftStockLogs.shiftType,
      shiftStartTime: shiftStockLogs.shiftStartTime,
      status: shiftStockLogs.status,
      notes: shiftStockLogs.notes,
      createdAt: shiftStockLogs.createdAt,
      openedByName: users.name,
    })
    .from(shiftStockLogs)
    .leftJoin(users, eq(shiftStockLogs.openedBy, users.id))
    .where(eq(shiftStockLogs.status, 'OPEN'))
    .orderBy(desc(shiftStockLogs.createdAt))
    .limit(1);

  if (rows.length === 0) return null;
  const shift = rows[0];

  const items = await db
    .select({
      id: shiftStockLogItems.id,
      drugId: shiftStockLogItems.drugId,
      drugCode: drugs.code,
      drugName: drugs.name,
      dosageForm: drugs.dosageForm,
      unitName: drugUnits.name,
      stockStart: shiftStockLogItems.stockStart,
      usageShift: shiftStockLogItems.usageShift,
      usageNonShift: shiftStockLogItems.usageNonShift,
      adjustment: shiftStockLogItems.adjustment,
      stockEnd: shiftStockLogItems.stockEnd,
      notes: shiftStockLogItems.notes,
    })
    .from(shiftStockLogItems)
    .innerJoin(drugs, eq(shiftStockLogItems.drugId, drugs.id))
    .leftJoin(drugUnits, eq(drugs.unitId, drugUnits.id))
    .where(eq(shiftStockLogItems.shiftLogId, shift.id))
    .orderBy(drugs.name);

  return {
    ...shift,
    items,
  };
}

async function getShiftLogsHistory({ limit = 30, offset = 0 } = {}) {
  const list = await db
    .select({
      id: shiftStockLogs.id,
      logDate: shiftStockLogs.logDate,
      shiftType: shiftStockLogs.shiftType,
      shiftStartTime: shiftStockLogs.shiftStartTime,
      shiftEndTime: shiftStockLogs.shiftEndTime,
      status: shiftStockLogs.status,
      notes: shiftStockLogs.notes,
      createdAt: shiftStockLogs.createdAt,
      closedAt: shiftStockLogs.closedAt,
      openedByName: sql`u1.name`,
      closedByName: sql`u2.name`,
    })
    .from(shiftStockLogs)
    .leftJoin(sql`users u1`, sql`shift_stock_logs.opened_by = u1.id`)
    .leftJoin(sql`users u2`, sql`shift_stock_logs.closed_by = u2.id`)
    .orderBy(desc(shiftStockLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return list;
}

async function createShiftLog({ shiftData, initialItems }, tx = db) {
  const [createdShift] = await tx.insert(shiftStockLogs).values(shiftData).returning();

  const preparedItems = initialItems.map((item) => ({
    shiftLogId: createdShift.id,
    drugId: item.drugId,
    stockStart: item.stockStart,
    usageShift: 0,
    usageNonShift: 0,
    adjustment: 0,
    stockEnd: item.stockStart,
    notes: null,
  }));

  if (preparedItems.length > 0) {
    await tx.insert(shiftStockLogItems).values(preparedItems);
  }

  return createdShift;
}

async function updateShiftLogItemsBatch(shiftLogId, itemsUpdates, tx = db) {
  for (const update of itemsUpdates) {
    await tx
      .update(shiftStockLogItems)
      .set({
        usageNonShift: update.usageNonShift,
        adjustment: update.adjustment,
        stockEnd: sql`stock_start - usage_shift - ${update.usageNonShift} + ${update.adjustment}`,
        notes: update.notes,
      })
      .where(
        and(
          eq(shiftStockLogItems.shiftLogId, shiftLogId),
          eq(shiftStockLogItems.drugId, update.drugId)
        )
      );
  }
}

async function closeShiftLog(shiftLogId, closedBy, tx = db) {
  const [closed] = await tx
    .update(shiftStockLogs)
    .set({
      status: 'CLOSED',
      closedBy,
      closedAt: sql`now()`,
      shiftEndTime: sql`CURRENT_TIME`,
      updatedAt: sql`now()`,
    })
    .where(eq(shiftStockLogs.id, shiftLogId))
    .returning();

  return closed;
}

// ─── 4. Stock Opname Periodik ─────────────────────────────────────────────────

async function getStockOpnamesList({ limit = 20, offset = 0 } = {}) {
  return db
    .select({
      id: stockOpnames.id,
      opnameDate: stockOpnames.opnameDate,
      period: stockOpnames.period,
      status: stockOpnames.status,
      notes: stockOpnames.notes,
      createdAt: stockOpnames.createdAt,
      finalizedAt: stockOpnames.finalizedAt,
      createdByName: sql`u1.name`,
      finalizedByName: sql`u2.name`,
      itemCount: sql`COUNT(${stockOpnameItems.id})::int`,
    })
    .from(stockOpnames)
    .leftJoin(sql`users u1`, sql`stock_opnames.created_by = u1.id`)
    .leftJoin(sql`users u2`, sql`stock_opnames.finalized_by = u2.id`)
    .leftJoin(stockOpnameItems, eq(stockOpnameItems.opnameId, stockOpnames.id))
    .groupBy(stockOpnames.id, sql`u1.name`, sql`u2.name`)
    .orderBy(desc(stockOpnames.createdAt))
    .limit(limit)
    .offset(offset);
}

async function getStockOpnameById(id) {
  const [so] = await db
    .select({
      id: stockOpnames.id,
      opnameDate: stockOpnames.opnameDate,
      period: stockOpnames.period,
      status: stockOpnames.status,
      notes: stockOpnames.notes,
      createdAt: stockOpnames.createdAt,
      finalizedAt: stockOpnames.finalizedAt,
    })
    .from(stockOpnames)
    .where(eq(stockOpnames.id, id))
    .limit(1);

  if (!so) return null;

  const items = await db
    .select({
      id: stockOpnameItems.id,
      drugId: stockOpnameItems.drugId,
      drugCode: drugs.code,
      drugName: drugs.name,
      dosageForm: drugs.dosageForm,
      unitName: drugUnits.name,
      batchId: stockOpnameItems.batchId,
      batchNumber: drugBatches.batchNumber,
      systemQty: stockOpnameItems.systemQty,
      physicalQty: stockOpnameItems.physicalQty,
      selisih: stockOpnameItems.selisih,
      expiryDate: stockOpnameItems.expiryDate,
      expiryNotes: stockOpnameItems.expiryNotes,
      adjustmentReason: stockOpnameItems.adjustmentReason,
    })
    .from(stockOpnameItems)
    .innerJoin(drugs, eq(stockOpnameItems.drugId, drugs.id))
    .leftJoin(drugUnits, eq(drugs.unitId, drugUnits.id))
    .leftJoin(drugBatches, eq(stockOpnameItems.batchId, drugBatches.id))
    .where(eq(stockOpnameItems.opnameId, id))
    .orderBy(drugs.name);

  return {
    ...so,
    items,
  };
}

async function createStockOpname({ opnameData, initialItems }, tx = db) {
  const [createdSO] = await tx.insert(stockOpnames).values(opnameData).returning();

  const preparedItems = initialItems.map((item) => ({
    opnameId: createdSO.id,
    drugId: item.drugId,
    batchId: item.batchId || null,
    systemQty: item.systemQty,
    physicalQty: item.systemQty, // default physical = system
    selisih: 0,
    expiryDate: item.expiryDate || null,
    expiryNotes: item.expiryNotes || null,
  }));

  if (preparedItems.length > 0) {
    await tx.insert(stockOpnameItems).values(preparedItems);
  }

  return createdSO;
}

async function updateStockOpnameItemsBatch(opnameId, itemsUpdates, tx = db) {
  for (const item of itemsUpdates) {
    const selisih = Number(item.physicalQty) - Number(item.systemQty || 0);
    await tx
      .update(stockOpnameItems)
      .set({
        physicalQty: item.physicalQty,
        selisih,
        expiryDate: item.expiryDate ? item.expiryDate : null,
        expiryNotes: item.expiryNotes,
        adjustmentReason: item.adjustmentReason,
      })
      .where(
        and(
          eq(stockOpnameItems.opnameId, opnameId),
          eq(stockOpnameItems.drugId, item.drugId)
        )
      );
  }
}

async function finalizeStockOpname(opnameId, finalizedBy, tx = db) {
  const [finalized] = await tx
    .update(stockOpnames)
    .set({
      status: 'FINALIZED',
      finalizedBy,
      finalizedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(stockOpnames.id, opnameId))
    .returning();

  return finalized;
}

// ─── 5. Dashboard Stats ───────────────────────────────────────────────────────

async function getDashboardStats() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [pendingPrescriptionCount] = await db
    .select({ count: sql`COUNT(*)::int` })
    .from(prescriptions)
    .where(eq(prescriptions.status, 'PENDING'));

  const [dispensedTodayCount] = await db
    .select({ count: sql`COUNT(*)::int` })
    .from(prescriptions)
    .where(
      and(
        eq(prescriptions.status, 'DISPENSED'),
        sql`DATE(${prescriptions.dispensedAt}) = ${todayStr}`
      )
    );

  const [criticalStockCount] = await db
    .select({ count: sql`COUNT(*)::int` })
    .from(drugs)
    .where(
      and(
        isNull(drugs.deletedAt),
        sql`${drugs.currentStock} <= ${drugs.minStock}`
      )
    );

  const [activeShift] = await db
    .select({ id: shiftStockLogs.id, shiftType: shiftStockLogs.shiftType })
    .from(shiftStockLogs)
    .where(eq(shiftStockLogs.status, 'OPEN'))
    .limit(1);

  return {
    pendingPrescriptions: pendingPrescriptionCount?.count || 0,
    dispensedToday: dispensedTodayCount?.count || 0,
    criticalStockItems: criticalStockCount?.count || 0,
    activeShift: activeShift || null,
  };
}

module.exports = {
  getDrugsWithStockSummary,
  getDrugById,
  getDrugBatches,
  getExpiringBatches,
  createBatch,
  recordStockMovement,
  getStockMovementsByDrug,
  getPrescriptionsQueue,
  getPrescriptionById,
  getPrescriptionByEncounter,
  createPrescriptionWithItems,
  updatePrescriptionStatus,
  getActiveShiftLog,
  getShiftLogsHistory,
  createShiftLog,
  updateShiftLogItemsBatch,
  closeShiftLog,
  getStockOpnamesList,
  getStockOpnameById,
  createStockOpname,
  updateStockOpnameItemsBatch,
  finalizeStockOpname,
  getDashboardStats,
};
