const repo = require('./patients.repository');
const { generateNextMedicalRecordNumber } = require('./patient-mrn.generator');
const { logAudit } = require('../../shared/utils/audit');

// ─── Patient Service ──────────────────────────────────────────────────────────

async function listPatients(params) {
  return repo.getPatients(params);
}

async function findPatient(id) {
  const patient = await repo.getPatientById(id);
  if (!patient) {
    const err = new Error('Data pasien tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return patient;
}

async function getNextMRN() {
  const mrn = await generateNextMedicalRecordNumber();
  return { nextMedicalRecordNumber: mrn };
}

async function registerPatient(data, { userId, ipAddress, userAgent }) {
  // 1. Tentukan nomor Medrec (generate otomatis jika kosong)
  let mrn = data.medicalRecordNumber?.trim();
  if (!mrn) {
    mrn = await generateNextMedicalRecordNumber();
  }

  // 2. Cek apakah Medrec sudah digunakan
  const existingMRN = await repo.findPatientByMRN(mrn);
  if (existingMRN) {
    const err = new Error(`Nomor Rekam Medis ${mrn} sudah terdaftar`);
    err.statusCode = 409;
    throw err;
  }

  // 3. Cek apakah NIK sudah digunakan (jika NIK diisi)
  if (data.identityNumber && data.identityNumber.trim().length > 0) {
    const existingNIK = await repo.findPatientByIdentity(data.identityNumber.trim());
    if (existingNIK) {
      const err = new Error(`Nomor Identitas ${data.identityNumber} sudah terdaftar atas nama ${existingNIK.name} (RM: ${existingNIK.medicalRecordNumber})`);
      err.statusCode = 409;
      throw err;
    }
  }

  const payload = {
    ...data,
    medicalRecordNumber: mrn,
    createdBy: userId || null,
  };

  const created = await repo.createPatient(payload);

  // 4. Audit Log
  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'patients',
    entityId: created.id,
    newValues: {
      medicalRecordNumber: created.medicalRecordNumber,
      name: created.name,
      birthDate: created.birthDate,
      phone: created.phone,
    },
    ipAddress,
    userAgent,
  });

  return created;
}

async function editPatient(id, data, { userId, ipAddress, userAgent }) {
  const old = await findPatient(id);

  // Jika NIK diubah, cek duplikat dengan pasien lain
  if (data.identityNumber && data.identityNumber !== old.identityNumber) {
    const existingNIK = await repo.findPatientByIdentity(data.identityNumber.trim());
    if (existingNIK && existingNIK.id !== id) {
      const err = new Error(`Nomor Identitas ${data.identityNumber} sudah digunakan pasien lain (RM: ${existingNIK.medicalRecordNumber})`);
      err.statusCode = 409;
      throw err;
    }
  }

  // Jika Medrec diubah, pastikan tidak bentrok
  if (data.medicalRecordNumber && data.medicalRecordNumber !== old.medicalRecordNumber) {
    const existingMRN = await repo.findPatientByMRN(data.medicalRecordNumber.trim());
    if (existingMRN && existingMRN.id !== id) {
      const err = new Error(`Nomor Rekam Medis ${data.medicalRecordNumber} sudah digunakan pasien lain`);
      err.statusCode = 409;
      throw err;
    }
  }

  const updated = await repo.updatePatient(id, data);

  await logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'patients',
    entityId: id,
    oldValues: { name: old.name, phone: old.phone, address: old.address },
    newValues: { name: updated.name, phone: updated.phone, address: updated.address },
    ipAddress,
    userAgent,
  });

  return updated;
}

async function removePatient(id, { userId, ipAddress, userAgent }) {
  const old = await findPatient(id);
  const deleted = await repo.deletePatient(id);

  await logAudit({
    userId,
    action: 'DELETE',
    entityType: 'patients',
    entityId: id,
    oldValues: { medicalRecordNumber: old.medicalRecordNumber, name: old.name },
    ipAddress,
    userAgent,
  });

  return deleted;
}

// ─── Wilayah Service ──────────────────────────────────────────────────────────

async function getProvinsi() {
  return repo.getProvinsiList();
}

async function getKabupaten(provinsiId) {
  return repo.getKabupatenByProvinsi(provinsiId);
}

async function getKecamatan(kabupatenId) {
  return repo.getKecamatanByKabupaten(kabupatenId);
}

async function getKelurahan(kecamatanId) {
  return repo.getKelurahanByKecamatan(kecamatanId);
}

module.exports = {
  listPatients,
  findPatient,
  getNextMRN,
  registerPatient,
  editPatient,
  removePatient,
  getProvinsi,
  getKabupaten,
  getKecamatan,
  getKelurahan,
};
