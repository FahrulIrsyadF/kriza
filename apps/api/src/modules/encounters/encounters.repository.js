const { db } = require('../../db');
const {
  encounters,
  vitalSigns,
  soapNotes,
  encounterDiagnoses,
  encounterProcedures,
  encounterReferrals,
  encounterDispositions,
  registrations,
  queues,
  patients,
  polyclinics,
  practitioners,
  procedures,
  users,
} = require('../../db/schema');
const { eq, ne, and, desc, asc, ilike, or, sql } = require('drizzle-orm');

// ─── 1. Get Doctor Queue (Pasien Hari Ini untuk Dokter / Poli) ────────────────
async function getDoctorQueue({ polyclinicId, practitionerId, date } = {}) {
  const filterDate = date || new Date().toISOString().substring(0, 10);
  const conditions = [
    eq(registrations.registrationDate, filterDate),
    sql`${registrations.status} NOT IN ('BATAL', 'LEWAT')`,
  ];

  if (polyclinicId) conditions.push(eq(registrations.polyclinicId, polyclinicId));
  if (practitionerId) conditions.push(eq(registrations.practitionerId, practitionerId));

  const rows = await db
    .select({
      registrationId: registrations.id,
      registrationNumber: registrations.registrationNumber,
      registrationDate: registrations.registrationDate,
      visitType: registrations.visitType,
      registrationSource: registrations.registrationSource,
      paymentMethod: registrations.paymentMethod,
      complaint: registrations.complaint,
      status: registrations.status,
      createdAt: registrations.createdAt,

      // Patient
      patientId: patients.id,
      patientMrn: patients.medicalRecordNumber,
      patientName: patients.name,
      patientGender: patients.gender,
      patientBirthDate: patients.birthDate,
      patientPhone: patients.phone,
      patientInsuranceType: patients.insuranceType,
      patientBpjsNumber: patients.bpjsNumber,
      patientAllergiesNotes: patients.allergiesNotes,

      // Polyclinic
      polyclinicId: polyclinics.id,
      polyclinicCode: polyclinics.code,
      polyclinicName: polyclinics.name,

      // Practitioner
      practitionerId: practitioners.id,
      practitionerName: practitioners.name,
      practitionerTitle: practitioners.title,

      // Queue
      queueId: queues.id,
      queueNumber: queues.queueNumber,
      queueSequence: queues.queueSequence,
      queueStatus: queues.status,

      // Encounter jika sudah ada
      encounterId: encounters.id,
      encounterStatus: encounters.status,
      encounterStartTime: encounters.startTime,
      encounterAmendedFromId: encounters.amendedFromId,
      encounterAmendmentReason: encounters.amendmentReason,
    })
    .from(registrations)
    .leftJoin(patients, eq(registrations.patientId, patients.id))
    .leftJoin(polyclinics, eq(registrations.polyclinicId, polyclinics.id))
    .leftJoin(practitioners, eq(registrations.practitionerId, practitioners.id))
    .leftJoin(queues, eq(registrations.id, queues.registrationId))
    .leftJoin(
      encounters,
      and(
        eq(registrations.id, encounters.registrationId),
        ne(encounters.status, 'AMENDED')
      )
    )
    .where(and(...conditions))
    .orderBy(asc(queues.queueSequence), asc(registrations.createdAt));

  return rows;
}

// ─── 2. Get Encounter By ID (Full Detail) ────────────────────────────────────
async function getEncounterById(id) {
  const rows = await db
    .select({
      id: encounters.id,
      registrationId: encounters.registrationId,
      patientId: encounters.patientId,
      practitionerId: encounters.practitionerId,
      polyclinicId: encounters.polyclinicId,
      encounterDate: encounters.encounterDate,
      startTime: encounters.startTime,
      endTime: encounters.endTime,
      status: encounters.status,
      finalizedAt: encounters.finalizedAt,
      finalizedBy: encounters.finalizedBy,
      amendedFromId: encounters.amendedFromId,
      amendmentReason: encounters.amendmentReason,
      createdAt: encounters.createdAt,
      updatedAt: encounters.updatedAt,

      // Registration
      registrationNumber: registrations.registrationNumber,
      registrationDate: registrations.registrationDate,
      visitType: registrations.visitType,
      registrationSource: registrations.registrationSource,
      paymentMethod: registrations.paymentMethod,
      initialComplaint: registrations.complaint,
      regStatus: registrations.status,

      // Patient
      patientMrn: patients.medicalRecordNumber,
      patientName: patients.name,
      patientGender: patients.gender,
      patientBirthDate: patients.birthDate,
      patientPhone: patients.phone,
      patientAddress: patients.address,
      patientBloodType: patients.bloodType,
      patientInsuranceType: patients.insuranceType,
      patientBpjsNumber: patients.bpjsNumber,
      patientAllergiesNotes: patients.allergiesNotes,
      patientChronicDiseasesNotes: patients.chronicDiseasesNotes,

      // Polyclinic
      polyclinicCode: polyclinics.code,
      polyclinicName: polyclinics.name,

      // Practitioner
      practitionerName: practitioners.name,
      practitionerTitle: practitioners.title,
      practitionerSip: practitioners.sip,
    })
    .from(encounters)
    .leftJoin(registrations, eq(encounters.registrationId, registrations.id))
    .leftJoin(patients, eq(encounters.patientId, patients.id))
    .leftJoin(polyclinics, eq(encounters.polyclinicId, polyclinics.id))
    .leftJoin(practitioners, eq(encounters.practitionerId, practitioners.id))
    .where(eq(encounters.id, id))
    .limit(1);

  if (!rows.length) return null;
  const enc = rows[0];

  // Ambil data sub-entitas secara paralel
  const [
    vitalSignsRows,
    soapRows,
    diagnosesRows,
    proceduresRows,
    referralRows,
    dispositionRows,
  ] = await Promise.all([
    db.select().from(vitalSigns).where(eq(vitalSigns.encounterId, id)).limit(1),
    db.select().from(soapNotes).where(eq(soapNotes.encounterId, id)).limit(1),
    db.select().from(encounterDiagnoses).where(eq(encounterDiagnoses.encounterId, id)),
    db.select().from(encounterProcedures).where(eq(encounterProcedures.encounterId, id)),
    db.select().from(encounterReferrals).where(eq(encounterReferrals.encounterId, id)).limit(1),
    db.select().from(encounterDispositions).where(eq(encounterDispositions.encounterId, id)).limit(1),
  ]);

  enc.vitalSigns = vitalSignsRows[0] || null;
  enc.soapNotes = soapRows[0] || null;
  enc.diagnoses = diagnosesRows || [];
  enc.procedures = proceduresRows || [];
  enc.referral = referralRows[0] || null;
  enc.disposition = dispositionRows[0] || null;

  return enc;
}

// ─── 3. Find Encounter by Registration ID ───────────────────────────────────
async function findEncounterByRegistrationId(registrationId) {
  const rows = await db
    .select()
    .from(encounters)
    .where(
      and(
        eq(encounters.registrationId, registrationId),
        ne(encounters.status, 'AMENDED')
      )
    )
    .orderBy(desc(encounters.createdAt))
    .limit(1);
  return rows[0] || null;
}

// ─── 4. Create Encounter ────────────────────────────────────────────────────
async function createEncounter(data) {
  const [created] = await db.insert(encounters).values(data).returning();
  return created;
}

// ─── 5. Update Encounter ────────────────────────────────────────────────────
async function updateEncounter(id, data) {
  const [updated] = await db
    .update(encounters)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(encounters.id, id))
    .returning();
  return updated;
}

// ─── 6. Upsert Vital Signs ──────────────────────────────────────────────────
async function upsertVitalSigns(encounterId, data) {
  const existing = await db
    .select({ id: vitalSigns.id })
    .from(vitalSigns)
    .where(eq(vitalSigns.encounterId, encounterId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(vitalSigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vitalSigns.encounterId, encounterId))
      .returning();
    return updated;
  } else {
    const [inserted] = await db
      .insert(vitalSigns)
      .values({ ...data, encounterId })
      .returning();
    return inserted;
  }
}

// ─── 7. Upsert SOAP Notes ───────────────────────────────────────────────────
async function upsertSoapNotes(encounterId, data) {
  const existing = await db
    .select({ id: soapNotes.id })
    .from(soapNotes)
    .where(eq(soapNotes.encounterId, encounterId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(soapNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(soapNotes.encounterId, encounterId))
      .returning();
    return updated;
  } else {
    const [inserted] = await db
      .insert(soapNotes)
      .values({ ...data, encounterId })
      .returning();
    return inserted;
  }
}

// ─── 8. Diagnoses CRUD ──────────────────────────────────────────────────────
async function addDiagnosis(data) {
  const [created] = await db.insert(encounterDiagnoses).values(data).returning();
  return created;
}

async function deleteDiagnosis(diagnosisId, encounterId) {
  const [deleted] = await db
    .delete(encounterDiagnoses)
    .where(and(eq(encounterDiagnoses.id, diagnosisId), eq(encounterDiagnoses.encounterId, encounterId)))
    .returning();
  return deleted;
}

// ─── 9. Procedures CRUD ─────────────────────────────────────────────────────
async function addProcedure(data) {
  const [created] = await db.insert(encounterProcedures).values(data).returning();
  return created;
}

async function deleteProcedure(procedureId, encounterId) {
  const [deleted] = await db
    .delete(encounterProcedures)
    .where(and(eq(encounterProcedures.id, procedureId), eq(encounterProcedures.encounterId, encounterId)))
    .returning();
  return deleted;
}

// ─── 10. Upsert Disposition ─────────────────────────────────────────────────
async function upsertDisposition(encounterId, data) {
  const existing = await db
    .select({ id: encounterDispositions.id })
    .from(encounterDispositions)
    .where(eq(encounterDispositions.encounterId, encounterId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(encounterDispositions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(encounterDispositions.encounterId, encounterId))
      .returning();
    return updated;
  } else {
    const [inserted] = await db
      .insert(encounterDispositions)
      .values({ ...data, encounterId })
      .returning();
    return inserted;
  }
}

// ─── 11. Upsert Referral ────────────────────────────────────────────────────
async function upsertReferral(encounterId, data) {
  const existing = await db
    .select({ id: encounterReferrals.id })
    .from(encounterReferrals)
    .where(eq(encounterReferrals.encounterId, encounterId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(encounterReferrals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(encounterReferrals.encounterId, encounterId))
      .returning();
    return updated;
  } else {
    const [inserted] = await db
      .insert(encounterReferrals)
      .values({ ...data, encounterId })
      .returning();
    return inserted;
  }
}

async function deleteReferral(encounterId) {
  return db.delete(encounterReferrals).where(eq(encounterReferrals.encounterId, encounterId));
}

// ─── 12. Get Referrals List & Detail ─────────────────────────────────────────
async function getReferrals({ date, referralType, search, page = 1, limit = 30 } = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];

  if (date) {
    conditions.push(sql`DATE(${encounterReferrals.issuedAt}) = ${date}`);
  }
  if (referralType) {
    conditions.push(eq(encounterReferrals.referralType, referralType));
  }
  if (search) {
    const q = `%${search}%`;
    conditions.push(
      or(
        ilike(patients.name, q),
        ilike(patients.medicalRecordNumber, q),
        ilike(encounterReferrals.referralNumber, q),
        ilike(encounterReferrals.targetFacilityName, q)
      )
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select({
        id: encounterReferrals.id,
        encounterId: encounterReferrals.encounterId,
        referralType: encounterReferrals.referralType,
        referralNumber: encounterReferrals.referralNumber,
        status: encounterReferrals.status,
        issuedAt: encounterReferrals.issuedAt,
        targetFacilityName: encounterReferrals.targetFacilityName,
        targetPolyclinicName: encounterReferrals.targetPolyclinicName,
        referralReason: encounterReferrals.referralReason,
        initialTherapy: encounterReferrals.initialTherapy,
        pcareNoRujukan: encounterReferrals.pcareNoRujukan,

        // Patient
        patientId: patients.id,
        patientName: patients.name,
        patientMrn: patients.medicalRecordNumber,
        patientGender: patients.gender,
        patientBirthDate: patients.birthDate,
        patientPhone: patients.phone,
        patientInsuranceType: patients.insuranceType,
        patientBpjsNumber: patients.bpjsNumber,

        // Practitioner (Perujuk)
        practitionerName: practitioners.name,
        practitionerTitle: practitioners.title,

        // Target Poli (Internal)
        targetPolyclinicName: polyclinics.name,
      })
      .from(encounterReferrals)
      .leftJoin(patients, eq(encounterReferrals.patientId, patients.id))
      .leftJoin(practitioners, eq(encounterReferrals.practitionerId, practitioners.id))
      .leftJoin(polyclinics, eq(encounterReferrals.targetPolyclinicId, polyclinics.id))
      .where(where)
      .orderBy(desc(encounterReferrals.issuedAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql`count(*)` })
      .from(encounterReferrals)
      .leftJoin(patients, eq(encounterReferrals.patientId, patients.id))
      .where(where),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total: Number(countResult[0]?.count || 0),
      totalPages: Math.ceil(Number(countResult[0]?.count || 0) / limit),
    },
  };
}

async function getReferralDetailForPrint(referralId) {
  const rows = await db
    .select({
      id: encounterReferrals.id,
      referralType: encounterReferrals.referralType,
      referralNumber: encounterReferrals.referralNumber,
      issuedAt: encounterReferrals.issuedAt,
      status: encounterReferrals.status,

      // External
      targetFacilityName: encounterReferrals.targetFacilityName,
      targetFacilityCode: encounterReferrals.targetFacilityCode,
      targetPolyclinicName: encounterReferrals.targetPolyclinicName,
      targetPolyclinicCode: encounterReferrals.targetPolyclinicCode,
      referralReason: encounterReferrals.referralReason,
      initialTherapy: encounterReferrals.initialTherapy,
      transportation: encounterReferrals.transportation,

      // Internal
      internalConsultReason: encounterReferrals.internalConsultReason,

      // PCare
      pcareNoRujukan: encounterReferrals.pcareNoRujukan,
      pcareTaccCode: encounterReferrals.pcareTaccCode,

      // Patient
      patientId: patients.id,
      patientName: patients.name,
      patientMrn: patients.medicalRecordNumber,
      patientGender: patients.gender,
      patientBirthDate: patients.birthDate,
      patientAddress: patients.address,
      patientPhone: patients.phone,
      patientBloodType: patients.bloodType,
      patientInsuranceType: patients.insuranceType,
      patientBpjsNumber: patients.bpjsNumber,
      patientAllergiesNotes: patients.allergiesNotes,

      // Doctor Perujuk
      practitionerName: practitioners.name,
      practitionerTitle: practitioners.title,
      practitionerSip: practitioners.sip,

      // Origin Poli
      originPolyclinicName: polyclinics.name,

      // Encounter
      encounterId: encounters.id,
    })
    .from(encounterReferrals)
    .leftJoin(encounters, eq(encounterReferrals.encounterId, encounters.id))
    .leftJoin(patients, eq(encounterReferrals.patientId, patients.id))
    .leftJoin(practitioners, eq(encounterReferrals.practitionerId, practitioners.id))
    .leftJoin(polyclinics, eq(encounters.polyclinicId, polyclinics.id))
    .where(eq(encounterReferrals.id, referralId))
    .limit(1);

  if (!rows.length) return null;
  const ref = rows[0];

  // Ambil TTV dan Diagnosa ICD-10 dari encounter untuk dicetak di surat
  const [ttvRows, diagRows] = await Promise.all([
    db.select().from(vitalSigns).where(eq(vitalSigns.encounterId, ref.encounterId)).limit(1),
    db.select().from(encounterDiagnoses).where(eq(encounterDiagnoses.encounterId, ref.encounterId)),
  ]);

  ref.vitalSigns = ttvRows[0] || null;
  ref.diagnoses = diagRows || [];

  return ref;
}

module.exports = {
  getDoctorQueue,
  getEncounterById,
  findEncounterByRegistrationId,
  createEncounter,
  updateEncounter,
  upsertVitalSigns,
  upsertSoapNotes,
  addDiagnosis,
  deleteDiagnosis,
  addProcedure,
  deleteProcedure,
  upsertDisposition,
  upsertReferral,
  deleteReferral,
  getReferrals,
  getReferralDetailForPrint,
};
