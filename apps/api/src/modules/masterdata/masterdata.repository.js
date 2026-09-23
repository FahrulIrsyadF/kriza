const { db } = require('../../db');
const {
  polyclinics,
  practitioners,
  schedules,
  procedures,
  rateTypes,
  serviceRates,
  drugUnits,
  drugs,
  icd10Codes,
  labProcedures,
} = require('../../db/schema');
const { eq, and, isNull, ilike, or, sql, desc, asc, inArray } = require('drizzle-orm');

// ─── 1. Polyclinics ───────────────────────────────────────────────────────────

async function getPolyclinics({ search, isActive, page = 1, limit = 50 }) {
  const conditions = [isNull(polyclinics.deletedAt)];

  if (isActive === 'true') conditions.push(eq(polyclinics.isActive, true));
  if (isActive === 'false') conditions.push(eq(polyclinics.isActive, false));
  if (search) {
    conditions.push(or(ilike(polyclinics.name, `%${search}%`), ilike(polyclinics.code, `%${search}%`)));
  }

  const offset = (page - 1) * limit;
  const whereClause = and(...conditions);

  const [data, totalCount] = await Promise.all([
    db.select().from(polyclinics).where(whereClause).limit(limit).offset(offset).orderBy(asc(polyclinics.name)),
    db.select({ count: sql`count(*)` }).from(polyclinics).where(whereClause),
  ]);

  return {
    items: data,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0]?.count || 0),
      totalPages: Math.ceil(Number(totalCount[0]?.count || 0) / limit),
    },
  };
}

async function getPolyclinicById(id) {
  const result = await db.select().from(polyclinics).where(and(eq(polyclinics.id, id), isNull(polyclinics.deletedAt))).limit(1);
  return result[0] || null;
}

async function createPolyclinic(data) {
  const [created] = await db.insert(polyclinics).values(data).returning();
  return created;
}

async function updatePolyclinic(id, data) {
  const [updated] = await db
    .update(polyclinics)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(polyclinics.id, id), isNull(polyclinics.deletedAt)))
    .returning();
  return updated || null;
}

async function deletePolyclinic(id) {
  const [deleted] = await db
    .update(polyclinics)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(polyclinics.id, id), isNull(polyclinics.deletedAt)))
    .returning();
  return deleted || null;
}

// ─── 2. Practitioners ────────────────────────────────────────────────────────

async function getPractitioners({ search, isActive, page = 1, limit = 50 }) {
  const conditions = [isNull(practitioners.deletedAt)];

  if (isActive === 'true') conditions.push(eq(practitioners.isActive, true));
  if (isActive === 'false') conditions.push(eq(practitioners.isActive, false));
  if (search) {
    conditions.push(
      or(
        ilike(practitioners.name, `%${search}%`),
        ilike(practitioners.code, `%${search}%`),
        ilike(practitioners.specialization, `%${search}%`)
      )
    );
  }

  const offset = (page - 1) * limit;
  const whereClause = and(...conditions);

  const [data, totalCount] = await Promise.all([
    db.select().from(practitioners).where(whereClause).limit(limit).offset(offset).orderBy(asc(practitioners.name)),
    db.select({ count: sql`count(*)` }).from(practitioners).where(whereClause),
  ]);

  return {
    items: data,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0]?.count || 0),
      totalPages: Math.ceil(Number(totalCount[0]?.count || 0) / limit),
    },
  };
}

async function getPractitionerById(id) {
  const result = await db.select().from(practitioners).where(and(eq(practitioners.id, id), isNull(practitioners.deletedAt))).limit(1);
  return result[0] || null;
}

async function createPractitioner(data) {
  const [created] = await db.insert(practitioners).values(data).returning();
  return created;
}

async function updatePractitioner(id, data) {
  const [updated] = await db
    .update(practitioners)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(practitioners.id, id), isNull(practitioners.deletedAt)))
    .returning();
  return updated || null;
}

async function deletePractitioner(id) {
  const [deleted] = await db
    .update(practitioners)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(practitioners.id, id), isNull(practitioners.deletedAt)))
    .returning();
  return deleted || null;
}

// ─── 3. Schedules ────────────────────────────────────────────────────────────

async function getSchedules({ practitionerId, polyclinicId, dayOfWeek, isActive }) {
  const conditions = [];

  if (practitionerId) conditions.push(eq(schedules.practitionerId, practitionerId));
  if (polyclinicId) conditions.push(eq(schedules.polyclinicId, polyclinicId));
  if (dayOfWeek) conditions.push(eq(schedules.dayOfWeek, Number(dayOfWeek)));
  if (isActive === 'true') conditions.push(eq(schedules.isActive, true));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: schedules.id,
      practitionerId: schedules.practitionerId,
      practitionerName: practitioners.name,
      practitionerTitle: practitioners.title,
      practitionerSpecialization: practitioners.specialization,
      polyclinicId: schedules.polyclinicId,
      polyclinicName: polyclinics.name,
      dayOfWeek: schedules.dayOfWeek,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
      quota: schedules.quota,
      isActive: schedules.isActive,
    })
    .from(schedules)
    .innerJoin(practitioners, eq(schedules.practitionerId, practitioners.id))
    .innerJoin(polyclinics, eq(schedules.polyclinicId, polyclinics.id))
    .where(whereClause)
    .orderBy(asc(schedules.dayOfWeek), asc(schedules.startTime));

  return data;
}

async function createSchedule(data) {
  const [created] = await db.insert(schedules).values(data).returning();
  return created;
}

async function updateSchedule(id, data) {
  const [updated] = await db
    .update(schedules)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schedules.id, id))
    .returning();
  return updated || null;
}

async function deleteSchedule(id) {
  const [deleted] = await db.delete(schedules).where(eq(schedules.id, id)).returning();
  return deleted || null;
}

// ─── 4. Procedures & Rates ───────────────────────────────────────────────────

async function getProcedures({ search, polyclinicId, category, isActive, page = 1, limit = 50 }) {
  const conditions = [isNull(procedures.deletedAt)];

  if (polyclinicId) conditions.push(eq(procedures.polyclinicId, polyclinicId));
  if (category) conditions.push(eq(procedures.category, category));
  if (isActive === 'true') conditions.push(eq(procedures.isActive, true));
  if (isActive === 'false') conditions.push(eq(procedures.isActive, false));
  if (search) {
    conditions.push(or(ilike(procedures.name, `%${search}%`), ilike(procedures.code, `%${search}%`)));
  }

  const offset = (page - 1) * limit;
  const whereClause = and(...conditions);

  const [data, totalCount] = await Promise.all([
    db
      .select({
        id: procedures.id,
        code: procedures.code,
        name: procedures.name,
        category: procedures.category,
        polyclinicId: procedures.polyclinicId,
        polyclinicName: polyclinics.name,
        description: procedures.description,
        isActive: procedures.isActive,
        createdAt: procedures.createdAt,
      })
      .from(procedures)
      .leftJoin(polyclinics, eq(procedures.polyclinicId, polyclinics.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(asc(procedures.name)),
    db.select({ count: sql`count(*)` }).from(procedures).where(whereClause),
  ]);

  // Fetch rates for these procedures
  const procedureIds = data.map((p) => p.id);
  let ratesMap = {};
  if (procedureIds.length > 0) {
    const ratesData = await db
      .select({
        procedureId: serviceRates.procedureId,
        rateTypeId: serviceRates.rateTypeId,
        rateTypeCode: rateTypes.code,
        rateTypeName: rateTypes.name,
        tariff: serviceRates.tariff,
      })
      .from(serviceRates)
      .innerJoin(rateTypes, eq(serviceRates.rateTypeId, rateTypes.id))
      .where(inArray(serviceRates.procedureId, procedureIds));

    for (const r of ratesData) {
      if (!ratesMap[r.procedureId]) ratesMap[r.procedureId] = [];
      ratesMap[r.procedureId].push(r);
    }
  }

  const items = data.map((p) => ({
    ...p,
    rates: ratesMap[p.id] || [],
  }));

  return {
    items,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0]?.count || 0),
      totalPages: Math.ceil(Number(totalCount[0]?.count || 0) / limit),
    },
  };
}

async function getProcedureById(id) {
  const result = await db.select().from(procedures).where(and(eq(procedures.id, id), isNull(procedures.deletedAt))).limit(1);
  if (!result[0]) return null;

  const rates = await db
    .select({
      id: serviceRates.id,
      rateTypeId: serviceRates.rateTypeId,
      rateTypeCode: rateTypes.code,
      rateTypeName: rateTypes.name,
      tariff: serviceRates.tariff,
    })
    .from(serviceRates)
    .innerJoin(rateTypes, eq(serviceRates.rateTypeId, rateTypes.id))
    .where(eq(serviceRates.procedureId, id));

  return { ...result[0], rates };
}

async function createProcedure(data) {
  const { rates = [], ...procData } = data;
  const [created] = await db.insert(procedures).values(procData).returning();

  if (rates.length > 0) {
    await db.insert(serviceRates).values(
      rates.map((r) => ({
        procedureId: created.id,
        rateTypeId: r.rateTypeId,
        tariff: String(r.tariff),
      }))
    );
  }

  return getProcedureById(created.id);
}

async function updateProcedure(id, data) {
  const { rates, ...procData } = data;
  const [updated] = await db
    .update(procedures)
    .set({ ...procData, updatedAt: new Date() })
    .where(and(eq(procedures.id, id), isNull(procedures.deletedAt)))
    .returning();

  if (!updated) return null;

  if (rates && Array.isArray(rates)) {
    // Delete existing and insert updated rates
    await db.delete(serviceRates).where(eq(serviceRates.procedureId, id));
    if (rates.length > 0) {
      await db.insert(serviceRates).values(
        rates.map((r) => ({
          procedureId: id,
          rateTypeId: r.rateTypeId,
          tariff: String(r.tariff),
        }))
      );
    }
  }

  return getProcedureById(id);
}

async function deleteProcedure(id) {
  const [deleted] = await db
    .update(procedures)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(procedures.id, id), isNull(procedures.deletedAt)))
    .returning();
  return deleted || null;
}

// ─── 5. Lab Procedures ───────────────────────────────────────────────────────
// Tarif lab disimpan inline per baris (bukan lewat serviceRates) karena satu
// pemeriksaan punya rincian komponen sendiri: jasa dokter, petugas, perujuk, BHP.

async function getLabProcedures({ search, category, serviceClass, isActive, page = 1, limit = 50 }) {
  const conditions = [isNull(labProcedures.deletedAt)];

  if (category) conditions.push(eq(labProcedures.category, category));
  if (serviceClass) conditions.push(eq(labProcedures.serviceClass, serviceClass));
  if (isActive === 'true') conditions.push(eq(labProcedures.isActive, true));
  if (isActive === 'false') conditions.push(eq(labProcedures.isActive, false));
  if (search) {
    conditions.push(or(ilike(labProcedures.name, `%${search}%`), ilike(labProcedures.code, `%${search}%`)));
  }

  const whereClause = and(...conditions);

  const [items, totalCount] = await Promise.all([
    db
      .select()
      .from(labProcedures)
      .where(whereClause)
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(asc(labProcedures.name)),
    db.select({ count: sql`count(*)` }).from(labProcedures).where(whereClause),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0]?.count || 0),
      totalPages: Math.ceil(Number(totalCount[0]?.count || 0) / limit),
    },
  };
}

async function getLabProcedureById(id) {
  const result = await db
    .select()
    .from(labProcedures)
    .where(and(eq(labProcedures.id, id), isNull(labProcedures.deletedAt)))
    .limit(1);
  return result[0] || null;
}

async function createLabProcedure(data) {
  const [created] = await db.insert(labProcedures).values(toMoneyStrings(data)).returning();
  return created;
}

async function updateLabProcedure(id, data) {
  const [updated] = await db
    .update(labProcedures)
    .set({ ...toMoneyStrings(data), updatedAt: new Date() })
    .where(and(eq(labProcedures.id, id), isNull(labProcedures.deletedAt)))
    .returning();
  return updated || null;
}

async function deleteLabProcedure(id) {
  const [deleted] = await db
    .update(labProcedures)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(labProcedures.id, id), isNull(labProcedures.deletedAt)))
    .returning();
  return deleted || null;
}

// drizzle numeric minta string, sementara zod sudah mengubahnya jadi number
const MONEY_FIELDS = ['hospitalShare', 'consumableFee', 'referrerFee', 'doctorFee',
  'staffFee', 'ksoFee', 'managementFee', 'totalTariff'];

function toMoneyStrings(data) {
  const out = { ...data };
  for (const f of MONEY_FIELDS) {
    if (out[f] !== undefined && out[f] !== null) out[f] = String(out[f]);
  }
  return out;
}

// ─── 6. Rate Types & Drug Units ──────────────────────────────────────────────

async function getRateTypes() {
  return db.select().from(rateTypes).orderBy(asc(rateTypes.name));
}

async function getDrugUnits() {
  return db.select().from(drugUnits).orderBy(asc(drugUnits.name));
}

// ─── 6. Drugs ────────────────────────────────────────────────────────────────

async function getDrugs({ search, category, isActive, page = 1, limit = 50 }) {
  const conditions = [isNull(drugs.deletedAt)];

  if (category) conditions.push(eq(drugs.category, category));
  if (isActive === 'true') conditions.push(eq(drugs.isActive, true));
  if (isActive === 'false') conditions.push(eq(drugs.isActive, false));
  if (search) {
    conditions.push(
      or(
        ilike(drugs.name, `%${search}%`),
        ilike(drugs.code, `%${search}%`),
        ilike(drugs.genericName, `%${search}%`)
      )
    );
  }

  const offset = (page - 1) * limit;
  const whereClause = and(...conditions);

  const [data, totalCount] = await Promise.all([
    db
      .select({
        id: drugs.id,
        code: drugs.code,
        name: drugs.name,
        genericName: drugs.genericName,
        category: drugs.category,
        unitId: drugs.unitId,
        unitCode: drugUnits.code,
        unitName: drugUnits.name,
        basePrice: drugs.basePrice,
        sellingPrice: drugs.sellingPrice,
        minStock: drugs.minStock,
        currentStock: drugs.currentStock,
        requiresPrescription: drugs.requiresPrescription,
        isActive: drugs.isActive,
        createdAt: drugs.createdAt,
      })
      .from(drugs)
      .leftJoin(drugUnits, eq(drugs.unitId, drugUnits.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(asc(drugs.name)),
    db.select({ count: sql`count(*)` }).from(drugs).where(whereClause),
  ]);

  return {
    items: data,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0]?.count || 0),
      totalPages: Math.ceil(Number(totalCount[0]?.count || 0) / limit),
    },
  };
}

async function getDrugById(id) {
  const result = await db
    .select({
      id: drugs.id,
      code: drugs.code,
      name: drugs.name,
      genericName: drugs.genericName,
      category: drugs.category,
      unitId: drugs.unitId,
      unitCode: drugUnits.code,
      unitName: drugUnits.name,
      basePrice: drugs.basePrice,
      sellingPrice: drugs.sellingPrice,
      minStock: drugs.minStock,
      currentStock: drugs.currentStock,
      requiresPrescription: drugs.requiresPrescription,
      isActive: drugs.isActive,
      createdAt: drugs.createdAt,
    })
    .from(drugs)
    .leftJoin(drugUnits, eq(drugs.unitId, drugUnits.id))
    .where(and(eq(drugs.id, id), isNull(drugs.deletedAt)))
    .limit(1);

  return result[0] || null;
}

async function createDrug(data) {
  const [created] = await db
    .insert(drugs)
    .values({
      ...data,
      basePrice: String(data.basePrice || 0),
      sellingPrice: String(data.sellingPrice || 0),
    })
    .returning();
  return getDrugById(created.id);
}

async function updateDrug(id, data) {
  const payload = { ...data, updatedAt: new Date() };
  if (data.basePrice !== undefined) payload.basePrice = String(data.basePrice);
  if (data.sellingPrice !== undefined) payload.sellingPrice = String(data.sellingPrice);

  const [updated] = await db
    .update(drugs)
    .set(payload)
    .where(and(eq(drugs.id, id), isNull(drugs.deletedAt)))
    .returning();

  if (!updated) return null;
  return getDrugById(id);
}

async function deleteDrug(id) {
  const [deleted] = await db
    .update(drugs)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(drugs.id, id), isNull(drugs.deletedAt)))
    .returning();
  return deleted || null;
}

// ─── 7. ICD-10 Search ────────────────────────────────────────────────────────

async function searchIcd10({ query, limit = 20 }) {
  if (!query || query.trim().length === 0) {
    return db.select().from(icd10Codes).limit(limit).orderBy(asc(icd10Codes.code));
  }

  const clean = query.trim();
  return db
    .select()
    .from(icd10Codes)
    .where(or(ilike(icd10Codes.code, `${clean}%`), ilike(icd10Codes.nameEn, `%${clean}%`), ilike(icd10Codes.nameId, `%${clean}%`)))
    .limit(limit)
    .orderBy(asc(icd10Codes.code));
}

module.exports = {
  getPolyclinics,
  getPolyclinicById,
  createPolyclinic,
  updatePolyclinic,
  deletePolyclinic,
  getPractitioners,
  getPractitionerById,
  createPractitioner,
  updatePractitioner,
  deletePractitioner,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getProcedures,
  getProcedureById,
  createProcedure,
  updateProcedure,
  deleteProcedure,
  getLabProcedures,
  getLabProcedureById,
  createLabProcedure,
  updateLabProcedure,
  deleteLabProcedure,
  getRateTypes,
  getDrugUnits,
  getDrugs,
  getDrugById,
  createDrug,
  updateDrug,
  deleteDrug,
  searchIcd10,
};
