const repo = require('./encounters.repository');
const { generateReferralNumber } = require('./referral-number.generator');
const { logAudit } = require('../../shared/utils/audit');
const { db } = require('../../db');
const { registrations, queues } = require('../../db/schema');
const { eq } = require('drizzle-orm');

// ─── 1. Helper: Hitung BMI & Kategori Gizi ─────────────────────────────────────
function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) {
    return { bmi: null, category: null };
  }
  const heightM = heightCm / 100;
  const bmiVal = weightKg / (heightM * heightM);
  const bmi = Number(bmiVal.toFixed(1));

  let category = 'Normal';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi >= 18.5 && bmi < 25.0) category = 'Normal';
  else if (bmi >= 25.0 && bmi < 30.0) category = 'Overweight';
  else if (bmi >= 30.0 && bmi < 35.0) category = 'Obesitas I';
  else category = 'Obesitas II';

  return { bmi, category };
}

// ─── 2. Helper: Validasi Status Lock Rekam Medis (PMK 24/2022) ─────────────────
async function checkEncounterWritable(encounterId) {
  const enc = await repo.getEncounterById(encounterId);
  if (!enc) {
    const err = new Error('Rekam medis (encounter) tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  if (enc.status === 'FINALIZED') {
    const err = new Error('Rekam medis ini sudah difinalisasi dan terkunci sesuai PMK 24/2022. Gunakan fitur Amandemen Rekam Medis untuk melakukan revisi.');
    err.statusCode = 403;
    err.code = 'ENCOUNTER_FINALIZED';
    throw err;
  }
  return enc;
}

// ─── 3. Doctor Queue ──────────────────────────────────────────────────────────
async function getDoctorQueue(params) {
  return repo.getDoctorQueue(params);
}

// ─── 4. Get Encounter Detail ──────────────────────────────────────────────────
async function getEncounter(id) {
  const enc = await repo.getEncounterById(id);
  if (!enc) {
    const err = new Error('Data pemeriksaan rekam medis tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return enc;
}

async function getEncounterByRegistration(registrationId) {
  const existing = await repo.findEncounterByRegistrationId(registrationId);
  if (!existing) return null;
  return repo.getEncounterById(existing.id);
}

// ─── 5. Start Encounter (Mulai Pemeriksaan Dokter) ─────────────────────────────
async function startEncounter({ registrationId, practitionerId }, { userId, ipAddress, userAgent }) {
  // Cek apakah sudah ada encounter untuk registrasi ini
  const existing = await repo.findEncounterByRegistrationId(registrationId);
  if (existing) {
    return repo.getEncounterById(existing.id);
  }

  // Ambil data registrasi
  const regRows = await db.select().from(registrations).where(eq(registrations.id, registrationId)).limit(1);
  if (!regRows.length) {
    const err = new Error('Data registrasi pendaftaran tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  const reg = regRows[0];

  const docId = practitionerId || reg.practitionerId;
  if (!docId) {
    const err = new Error('Dokter pemeriksa belum ditentukan pada pendaftaran ini');
    err.statusCode = 400;
    throw err;
  }

  // Buat record encounter baru (status DRAFT)
  const encounter = await repo.createEncounter({
    registrationId,
    patientId: reg.patientId,
    practitionerId: docId,
    polyclinicId: reg.polyclinicId,
    encounterDate: reg.registrationDate,
    startTime: new Date(),
    status: 'DRAFT',
  });

  // Buat placeholder SOAP awal dari keluhan pendaftaran
  await repo.upsertSoapNotes(encounter.id, {
    subjective: reg.complaint || 'Pasien datang untuk konsultasi pemeriksaan.',
    objective: 'Keadaan umum baik, compos mentis.',
    assessment: '',
    plan: '',
    prognosis: 'Bonam',
  });

  // Update status registrasi & antrian ke DIPERIKSA
  await db.update(registrations).set({ status: 'DIPERIKSA', updatedAt: new Date() }).where(eq(registrations.id, registrationId));
  const qRows = await db.select().from(queues).where(eq(queues.registrationId, registrationId)).limit(1);
  if (qRows.length > 0) {
    await db.update(queues).set({ status: 'DIPERIKSA', servedAt: new Date(), updatedAt: new Date() }).where(eq(queues.id, qRows[0].id));
  }

  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'encounters',
    entityId: encounter.id,
    newValues: { registrationId, patientId: reg.patientId, status: 'DRAFT' },
    ipAddress,
    userAgent,
  });

  return repo.getEncounterById(encounter.id);
}

// ─── 6. Save Vital Signs (TTV & Antropometri) ──────────────────────────────────
async function saveVitalSigns(encounterId, data, { userId, ipAddress, userAgent }) {
  await checkEncounterWritable(encounterId);

  // Auto-calculate BMI jika ada weight dan height
  const weight = data.weight !== undefined ? Number(data.weight) : null;
  const height = data.height !== undefined ? Number(data.height) : null;
  const { bmi, category } = calculateBMI(weight, height);

  const payload = {
    ...data,
    bmi: bmi !== null ? String(bmi) : null,
    bmiCategory: category,
  };

  const saved = await repo.upsertVitalSigns(encounterId, payload);

  await logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'vital_signs',
    entityId: encounterId,
    newValues: payload,
    ipAddress,
    userAgent,
  });

  return saved;
}

// ─── 7. Save SOAP Notes ───────────────────────────────────────────────────────
async function saveSoapNotes(encounterId, data, { userId, ipAddress, userAgent }) {
  await checkEncounterWritable(encounterId);
  const saved = await repo.upsertSoapNotes(encounterId, data);

  await logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'soap_notes',
    entityId: encounterId,
    newValues: data,
    ipAddress,
    userAgent,
  });

  return saved;
}

// ─── 8. Diagnoses Management ──────────────────────────────────────────────────
async function addDiagnosis(encounterId, data, { userId, ipAddress, userAgent }) {
  await checkEncounterWritable(encounterId);

  const created = await repo.addDiagnosis({
    encounterId,
    icd10Code: data.icd10Code.toUpperCase().trim(),
    icd10Name: data.icd10Name.trim(),
    diagnosisType: data.diagnosisType || 'PRIMARY',
    diagnosisCase: data.diagnosisCase || 'BARU',
    notes: data.notes || null,
  });

  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'encounter_diagnoses',
    entityId: created.id,
    newValues: created,
    ipAddress,
    userAgent,
  });

  return created;
}

async function removeDiagnosis(encounterId, diagnosisId, { userId, ipAddress, userAgent }) {
  await checkEncounterWritable(encounterId);
  const deleted = await repo.deleteDiagnosis(diagnosisId, encounterId);

  await logAudit({
    userId,
    action: 'DELETE',
    entityType: 'encounter_diagnoses',
    entityId: diagnosisId,
    oldValues: deleted,
    ipAddress,
    userAgent,
  });

  return deleted;
}

// ─── 9. Procedures Management ─────────────────────────────────────────────────
async function addProcedure(encounterId, data, { userId, ipAddress, userAgent }) {
  await checkEncounterWritable(encounterId);

  const created = await repo.addProcedure({
    encounterId,
    procedureId: data.procedureId || null,
    procedureCode: data.procedureCode || null,
    procedureName: data.procedureName.trim(),
    quantity: data.quantity || 1,
    tariff: data.tariff !== undefined ? String(data.tariff) : '0',
    notes: data.notes || null,
  });

  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'encounter_procedures',
    entityId: created.id,
    newValues: created,
    ipAddress,
    userAgent,
  });

  return created;
}

async function removeProcedure(encounterId, procedureId, { userId, ipAddress, userAgent }) {
  await checkEncounterWritable(encounterId);
  const deleted = await repo.deleteProcedure(procedureId, encounterId);

  await logAudit({
    userId,
    action: 'DELETE',
    entityType: 'encounter_procedures',
    entityId: procedureId,
    oldValues: deleted,
    ipAddress,
    userAgent,
  });

  return deleted;
}

// ─── 10. Save Disposition & Referral (Internal/External + PCare) ──────────────
async function saveDisposition(encounterId, data, { userId, ipAddress, userAgent }) {
  const enc = await checkEncounterWritable(encounterId);

  // 1. Simpan Disposisi Status Pulang
  const dispData = {
    dispositionType: data.dispositionType,
    followUpDate: data.followUpDate || null,
    followUpNotes: data.followUpNotes || null,
  };
  const disposition = await repo.upsertDisposition(encounterId, dispData);

  // 2. Simpan atau Update Rujukan jika ada
  let referral = null;
  if (['RUJUK_INTERNAL', 'RUJUK_EKSTERNAL'].includes(data.dispositionType) && data.referral) {
    const referralNumber = await generateReferralNumber();

    const refPayload = {
      patientId: enc.patientId,
      practitionerId: enc.practitionerId,
      referralType: data.referral.referralType,
      referralNumber,
      // Internal
      targetPolyclinicId: data.referral.targetPolyclinicId || null,
      targetPractitionerId: data.referral.targetPractitionerId || null,
      internalConsultReason: data.referral.internalConsultReason || null,
      // External
      targetFacilityName: data.referral.targetFacilityName || null,
      targetFacilityCode: data.referral.targetFacilityCode || null,
      targetPolyclinicName: data.referral.targetPolyclinicName || null,
      targetPolyclinicCode: data.referral.targetPolyclinicCode || null,
      referralReason: data.referral.referralReason || null,
      initialTherapy: data.referral.initialTherapy || null,
      transportation: data.referral.transportation || 'Mandiri',
      // PCare
      pcareTaccCode: data.referral.pcareTaccCode || null,
      pcareTaccReason: data.referral.pcareTaccReason || null,
      status: 'ISSUED',
    };

    referral = await repo.upsertReferral(encounterId, refPayload);

    // Jika RUJUK_INTERNAL, buat registrasi otomatis di poli tujuan
    if (data.referral.referralType === 'INTERNAL' && data.referral.targetPolyclinicId) {
      const regService = require('../registrations/registrations.service');
      try {
        await regService.createRegistration(
          {
            patientId: enc.patientId,
            polyclinicId: data.referral.targetPolyclinicId,
            practitionerId: data.referral.targetPractitionerId || null,
            registrationSource: 'LANGSUNG',
            paymentMethod: enc.paymentMethod || 'UMUM',
            complaint: `[KONSUL INTERNAL POLI] ${data.referral.internalConsultReason || 'Konsultasi rujukan internal'}`,
            forceRegister: true, // Bypass duplicate check for internal consult
          },
          { userId, ipAddress, userAgent }
        );
      } catch (err) {
        console.warn('Auto-create internal registration notice:', err.message);
      }
    }
  } else if (!['RUJUK_INTERNAL', 'RUJUK_EKSTERNAL'].includes(data.dispositionType)) {
    // Jika dokter mengganti status menjadi Pulang/Kontrol biasa, hapus draft rujukan
    await repo.deleteReferral(encounterId);
  }

  await logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'encounter_dispositions',
    entityId: encounterId,
    newValues: { disposition: dispData, referral },
    ipAddress,
    userAgent,
  });

  return { disposition, referral };
}

// ─── 11. Finalize Encounter (Kunci Rekam Medis) ────────────────────────────────
async function finalizeEncounter(encounterId, { notes }, { userId, ipAddress, userAgent }) {
  const enc = await checkEncounterWritable(encounterId);

  // 1. Pastikan TTV terisi lengkap (Sistol, Diastol, Nadi, Suhu)
  if (
    !enc.vitalSigns ||
    !enc.vitalSigns.systolic ||
    !enc.vitalSigns.diastolic ||
    !enc.vitalSigns.heartRate ||
    !enc.vitalSigns.temperature
  ) {
    const err = new Error('Tanda-Tanda Vital (TTV) wajib diisi lengkap (Tekanan Darah, Nadi, dan Suhu Tubuh) sebelum finalisasi.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Pastikan SOAP terisi lengkap (Subjektif, Objektif, Asesmen, Planning)
  if (
    !enc.soapNotes ||
    !enc.soapNotes.subjective?.trim() ||
    !enc.soapNotes.objective?.trim() ||
    !enc.soapNotes.assessment?.trim() ||
    !enc.soapNotes.plan?.trim()
  ) {
    const err = new Error('Catatan SOAP klinis (Subjektif, Objektif, Asesmen, dan Planning) wajib diisi lengkap sebelum finalisasi.');
    err.statusCode = 400;
    throw err;
  }

  // 3. Pastikan Diagnosa ICD-10 terisi minimal 1
  if (!enc.diagnoses || enc.diagnoses.length === 0) {
    const err = new Error('Diagnosa medis (ICD-10) wajib diisi minimal 1 diagnosa sebelum finalisasi.');
    err.statusCode = 400;
    throw err;
  }

  // 4. Pastikan Tindakan Medis terisi minimal 1
  if (!enc.procedures || enc.procedures.length === 0) {
    const err = new Error('Tindakan medis / pelayanan wajib diisi minimal 1 tindakan sebelum finalisasi.');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();

  // Kunci encounter
  const finalized = await repo.updateEncounter(encounterId, {
    status: 'FINALIZED',
    finalizedAt: now,
    finalizedBy: userId || null,
    endTime: now,
  });

  // Update status registrasi dan antrian ke SELESAI
  await db.update(registrations).set({ status: 'SELESAI', updatedAt: now }).where(eq(registrations.id, enc.registrationId));
  const qRows = await db.select().from(queues).where(eq(queues.registrationId, enc.registrationId)).limit(1);
  if (qRows.length > 0) {
    await db.update(queues).set({ status: 'SELESAI', completedAt: now, updatedAt: now }).where(eq(queues.id, qRows[0].id));
  }

  await logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'encounters',
    entityId: encounterId,
    newValues: { status: 'FINALIZED', finalizedAt: now, finalizedBy: userId },
    ipAddress,
    userAgent,
  });

  // Auto-generate tagihan kasir (Fase 7)
  try {
    const billingService = require('../billing/billing.service');
    await billingService.generateOrSyncInvoice(enc.registrationId, { userId, ipAddress, userAgent });
  } catch (billingErr) {
    console.warn('[finalizeEncounter] Auto-generate invoice warning:', billingErr.message);
  }

  return repo.getEncounterById(encounterId);
}

// ─── 12. Amend Encounter (Revisi Rekam Medis Terkunci) ─────────────────────────
async function amendEncounter(encounterId, { amendmentReason }, { userId, ipAddress, userAgent }) {
  const oldEnc = await repo.getEncounterById(encounterId);
  if (!oldEnc) {
    const err = new Error('Rekam medis tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  // Tandai encounter lama sebagai AMENDED
  await repo.updateEncounter(encounterId, { status: 'AMENDED', amendmentReason });

  // Buat encounter baru sebagai salinan yang bisa diedit
  const newEnc = await repo.createEncounter({
    registrationId: oldEnc.registrationId,
    patientId: oldEnc.patientId,
    practitionerId: oldEnc.practitionerId,
    polyclinicId: oldEnc.polyclinicId,
    encounterDate: oldEnc.encounterDate,
    startTime: new Date(),
    status: 'DRAFT',
    amendedFromId: oldEnc.id,
    amendmentReason,
  });

  // Salin TTV jika ada
  if (oldEnc.vitalSigns) {
    const { id, encounterId: oldId, createdAt, updatedAt, ...ttvData } = oldEnc.vitalSigns;
    await repo.upsertVitalSigns(newEnc.id, ttvData);
  }

  // Salin SOAP jika ada
  if (oldEnc.soapNotes) {
    const { id, encounterId: oldId, createdAt, updatedAt, ...soapData } = oldEnc.soapNotes;
    await repo.upsertSoapNotes(newEnc.id, soapData);
  }

  // Salin Diagnosa jika ada
  for (const d of oldEnc.diagnoses) {
    await repo.addDiagnosis({
      encounterId: newEnc.id,
      icd10Code: d.icd10Code,
      icd10Name: d.icd10Name,
      diagnosisType: d.diagnosisType,
      diagnosisCase: d.diagnosisCase,
      notes: d.notes,
    });
  }

  // Salin Tindakan jika ada
  for (const p of oldEnc.procedures) {
    await repo.addProcedure({
      encounterId: newEnc.id,
      procedureId: p.procedureId,
      procedureCode: p.procedureCode,
      procedureName: p.procedureName,
      quantity: p.quantity,
      tariff: p.tariff,
      notes: p.notes,
    });
  }

  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'encounters',
    entityId: newEnc.id,
    newValues: { amendedFromId: oldEnc.id, amendmentReason },
    ipAddress,
    userAgent,
  });

  return repo.getEncounterById(newEnc.id);
}

// ─── 13. Referrals Query & Print Data ─────────────────────────────────────────
async function listReferrals(params) {
  return repo.getReferrals(params);
}

async function getReferralForPrint(referralId) {
  const ref = await repo.getReferralDetailForPrint(referralId);
  if (!ref) {
    const err = new Error('Data surat rujukan tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return ref;
}

// ─── 14. BPJS PCare Bridging Payload Builder ─────────────────────────────────
function buildPCareEncounterPayload(encounter) {
  const primaryDiag = encounter.diagnoses?.find((d) => d.diagnosisType === 'PRIMARY') || encounter.diagnoses?.[0];
  const secondaryDiag = encounter.diagnoses?.filter((d) => d.diagnosisType !== 'PRIMARY') || [];

  return {
    noKunjungan: encounter.referral?.pcareNoKunjungan || null,
    noKartu: encounter.patientBpjsNumber || null,
    tglDaftar: encounter.encounterDate,
    kdPoli: encounter.polyclinicCode,
    keluhan: encounter.soapNotes?.subjective || '',
    kdSadar: encounter.vitalSigns?.consciousness === 'Compos Mentis' ? '01' : '02',
    sistole: encounter.vitalSigns?.systolic || 120,
    diastole: encounter.vitalSigns?.diastolic || 80,
    beratBadan: encounter.vitalSigns?.weight ? Number(encounter.vitalSigns.weight) : 0,
    tinggiBadan: encounter.vitalSigns?.height ? Number(encounter.vitalSigns.height) : 0,
    respRate: encounter.vitalSigns?.respiratoryRate || 20,
    heartRate: encounter.vitalSigns?.heartRate || 80,
    terapi: encounter.soapNotes?.plan || '',
    kdStatusPulang: encounter.disposition?.dispositionType === 'PULANG_BEROBAT_JALAN' ? '3' : '4',
    tglPulang: encounter.encounterDate,
    kdDokter: encounter.practitionerId,
    kdDiag1: primaryDiag?.icd10Code || null,
    kdDiag2: secondaryDiag[0]?.icd10Code || null,
    kdDiag3: secondaryDiag[1]?.icd10Code || null,
    // Rujukan PCare jika status rujukan
    rujukLanjut: encounter.referral
      ? {
          kdppk: encounter.referral.targetFacilityCode || null,
          tglEstRujuk: encounter.encounterDate,
          kdSubSpesialis: encounter.referral.targetPolyclinicCode || null,
          tacc: encounter.referral.pcareTaccCode || '-1',
          alasanTacc: encounter.referral.pcareTaccReason || null,
        }
      : null,
  };
}

module.exports = {
  getDoctorQueue,
  getEncounter,
  getEncounterByRegistration,
  startEncounter,
  saveVitalSigns,
  saveSoapNotes,
  addDiagnosis,
  removeDiagnosis,
  addProcedure,
  removeProcedure,
  saveDisposition,
  finalizeEncounter,
  amendEncounter,
  listReferrals,
  getReferralForPrint,
  buildPCareEncounterPayload,
  calculateBMI,
};
