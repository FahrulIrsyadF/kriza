const repo = require('./masterdata.repository');
const { logAudit } = require('../../shared/utils/audit');

// ─── Polyclinics Service ──────────────────────────────────────────────────────

async function listPolyclinics(params) {
  return repo.getPolyclinics(params);
}

async function findPolyclinic(id) {
  const item = await repo.getPolyclinicById(id);
  if (!item) {
    const err = new Error('Poliklinik tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return item;
}

async function addPolyclinic(data, { userId, ipAddress, userAgent }) {
  const created = await repo.createPolyclinic(data);
  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'polyclinics',
    entityId: created.id,
    newValues: created,
    ipAddress,
    userAgent,
  });
  return created;
}

async function editPolyclinic(id, data, { userId, ipAddress, userAgent }) {
  const old = await findPolyclinic(id);
  const updated = await repo.updatePolyclinic(id, data);
  await logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'polyclinics',
    entityId: id,
    oldValues: old,
    newValues: updated,
    ipAddress,
    userAgent,
  });
  return updated;
}

async function removePolyclinic(id, { userId, ipAddress, userAgent }) {
  const old = await findPolyclinic(id);
  const deleted = await repo.deletePolyclinic(id);
  await logAudit({
    userId,
    action: 'DELETE',
    entityType: 'polyclinics',
    entityId: id,
    oldValues: old,
    ipAddress,
    userAgent,
  });
  return deleted;
}

// ─── Practitioners Service ────────────────────────────────────────────────────

async function listPractitioners(params) {
  return repo.getPractitioners(params);
}

async function findPractitioner(id) {
  const item = await repo.getPractitionerById(id);
  if (!item) {
    const err = new Error('Tenaga medis / dokter tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return item;
}

async function addPractitioner(data, { userId, ipAddress, userAgent }) {
  const created = await repo.createPractitioner(data);
  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'practitioners',
    entityId: created.id,
    newValues: created,
    ipAddress,
    userAgent,
  });
  return created;
}

async function editPractitioner(id, data, { userId, ipAddress, userAgent }) {
  const old = await findPractitioner(id);
  const updated = await repo.updatePractitioner(id, data);
  await logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'practitioners',
    entityId: id,
    oldValues: old,
    newValues: updated,
    ipAddress,
    userAgent,
  });
  return updated;
}

async function removePractitioner(id, { userId, ipAddress, userAgent }) {
  const old = await findPractitioner(id);
  const deleted = await repo.deletePractitioner(id);
  await logAudit({
    userId,
    action: 'DELETE',
    entityType: 'practitioners',
    entityId: id,
    oldValues: old,
    ipAddress,
    userAgent,
  });
  return deleted;
}

// ─── Schedules Service ────────────────────────────────────────────────────────

async function listSchedules(params) {
  return repo.getSchedules(params);
}

async function addSchedule(data, { userId, ipAddress, userAgent }) {
  const created = await repo.createSchedule(data);
  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'schedules',
    entityId: created.id,
    newValues: created,
    ipAddress,
    userAgent,
  });
  return created;
}

async function editSchedule(id, data, { userId, ipAddress, userAgent }) {
  const updated = await repo.updateSchedule(id, data);
  if (!updated) {
    const err = new Error('Jadwal praktik tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  await logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'schedules',
    entityId: id,
    newValues: updated,
    ipAddress,
    userAgent,
  });
  return updated;
}

async function removeSchedule(id, { userId, ipAddress, userAgent }) {
  const deleted = await repo.deleteSchedule(id);
  if (!deleted) {
    const err = new Error('Jadwal praktik tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  await logAudit({
    userId,
    action: 'DELETE',
    entityType: 'schedules',
    entityId: id,
    oldValues: deleted,
    ipAddress,
    userAgent,
  });
  return deleted;
}

// ─── Procedures & Rates Service ───────────────────────────────────────────────

async function listProcedures(params) {
  return repo.getProcedures(params);
}

async function findProcedure(id) {
  const item = await repo.getProcedureById(id);
  if (!item) {
    const err = new Error('Tindakan / layanan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return item;
}

async function addProcedure(data, { userId, ipAddress, userAgent }) {
  const created = await repo.createProcedure(data);
  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'procedures',
    entityId: created.id,
    newValues: created,
    ipAddress,
    userAgent,
  });
  return created;
}

async function editProcedure(id, data, { userId, ipAddress, userAgent }) {
  const old = await findProcedure(id);
  const updated = await repo.updateProcedure(id, data);
  await logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'procedures',
    entityId: id,
    oldValues: old,
    newValues: updated,
    ipAddress,
    userAgent,
  });
  return updated;
}

async function removeProcedure(id, { userId, ipAddress, userAgent }) {
  const old = await findProcedure(id);
  const deleted = await repo.deleteProcedure(id);
  await logAudit({
    userId,
    action: 'DELETE',
    entityType: 'procedures',
    entityId: id,
    oldValues: old,
    ipAddress,
    userAgent,
  });
  return deleted;
}

// ─── Lab Procedures Service ───────────────────────────────────────────────────

async function listLabProcedures(params) {
  return repo.getLabProcedures(params);
}

async function findLabProcedure(id) {
  const item = await repo.getLabProcedureById(id);
  if (!item) {
    const err = new Error('Pemeriksaan laboratorium tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return item;
}

async function addLabProcedure(data, { userId, ipAddress, userAgent }) {
  const created = await repo.createLabProcedure(data);
  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'lab_procedures',
    entityId: created.id,
    newValues: created,
    ipAddress,
    userAgent,
  });
  return created;
}

async function editLabProcedure(id, data, { userId, ipAddress, userAgent }) {
  const old = await findLabProcedure(id);
  const updated = await repo.updateLabProcedure(id, data);
  await logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'lab_procedures',
    entityId: id,
    oldValues: old,
    newValues: updated,
    ipAddress,
    userAgent,
  });
  return updated;
}

async function removeLabProcedure(id, { userId, ipAddress, userAgent }) {
  const old = await findLabProcedure(id);
  const deleted = await repo.deleteLabProcedure(id);
  await logAudit({
    userId,
    action: 'DELETE',
    entityType: 'lab_procedures',
    entityId: id,
    oldValues: old,
    ipAddress,
    userAgent,
  });
  return deleted;
}

// ─── Rate Types & Drug Units Service ──────────────────────────────────────────

async function listRateTypes() {
  return repo.getRateTypes();
}

async function listDrugUnits() {
  return repo.getDrugUnits();
}

// ─── Drugs Service ───────────────────────────────────────────────────────────

async function listDrugs(params) {
  return repo.getDrugs(params);
}

async function findDrug(id) {
  const item = await repo.getDrugById(id);
  if (!item) {
    const err = new Error('Data obat tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return item;
}

async function addDrug(data, { userId, ipAddress, userAgent }) {
  const created = await repo.createDrug(data);
  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'drugs',
    entityId: created.id,
    newValues: created,
    ipAddress,
    userAgent,
  });
  return created;
}

async function editDrug(id, data, { userId, ipAddress, userAgent }) {
  const old = await findDrug(id);
  const updated = await repo.updateDrug(id, data);
  await logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'drugs',
    entityId: id,
    oldValues: old,
    newValues: updated,
    ipAddress,
    userAgent,
  });
  return updated;
}

async function removeDrug(id, { userId, ipAddress, userAgent }) {
  const old = await findDrug(id);
  const deleted = await repo.deleteDrug(id);
  await logAudit({
    userId,
    action: 'DELETE',
    entityType: 'drugs',
    entityId: id,
    oldValues: old,
    ipAddress,
    userAgent,
  });
  return deleted;
}

// ─── ICD-10 Search Service ───────────────────────────────────────────────────

async function searchIcd10(params) {
  return repo.searchIcd10(params);
}

module.exports = {
  listPolyclinics,
  findPolyclinic,
  addPolyclinic,
  editPolyclinic,
  removePolyclinic,
  listPractitioners,
  findPractitioner,
  addPractitioner,
  editPractitioner,
  removePractitioner,
  listSchedules,
  addSchedule,
  editSchedule,
  removeSchedule,
  listProcedures,
  findProcedure,
  addProcedure,
  editProcedure,
  removeProcedure,
  listLabProcedures,
  findLabProcedure,
  addLabProcedure,
  editLabProcedure,
  removeLabProcedure,
  listRateTypes,
  listDrugUnits,
  listDrugs,
  findDrug,
  addDrug,
  editDrug,
  removeDrug,
  searchIcd10,
};
