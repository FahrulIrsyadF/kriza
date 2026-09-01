const { db } = require('../../db');
const {
  patients,
  patientAllergies,
  patientEmergencyContacts,
  provinsi,
  kabupaten,
  kecamatan,
  kelurahan,
} = require('../../db/schema');
const { eq, and, isNull, ilike, or, sql, desc, asc } = require('drizzle-orm');

// ─── 1. Patient Queries ───────────────────────────────────────────────────────

async function getPatients({ search, gender, insuranceType, provinsiId, kabupatenId, isActive, page = 1, limit = 20 }) {
  const conditions = [isNull(patients.deletedAt)];

  if (isActive === 'true') conditions.push(eq(patients.isActive, true));
  if (isActive === 'false') conditions.push(eq(patients.isActive, false));
  if (gender) conditions.push(eq(patients.gender, gender));
  if (insuranceType) conditions.push(eq(patients.insuranceType, insuranceType));
  if (provinsiId) conditions.push(eq(patients.provinsiId, Number(provinsiId)));
  if (kabupatenId) conditions.push(eq(patients.kabupatenId, Number(kabupatenId)));

  if (search && search.trim().length > 0) {
    const clean = search.trim();
    conditions.push(
      or(
        ilike(patients.medicalRecordNumber, `%${clean}%`),
        ilike(patients.name, `%${clean}%`),
        ilike(patients.identityNumber, `%${clean}%`),
        ilike(patients.phone, `%${clean}%`),
        ilike(patients.bpjsNumber, `%${clean}%`),
        ilike(patients.address, `%${clean}%`)
      )
    );
  }

  const offset = (page - 1) * limit;
  const whereClause = and(...conditions);

  const [data, totalCount] = await Promise.all([
    db
      .select({
        id: patients.id,
        medicalRecordNumber: patients.medicalRecordNumber,
        name: patients.name,
        gender: patients.gender,
        birthPlace: patients.birthPlace,
        birthDate: patients.birthDate,
        identityType: patients.identityType,
        identityNumber: patients.identityNumber,
        phone: patients.phone,
        address: patients.address,
        residenceAddress: patients.residenceAddress,
        provinsiName: provinsi.name,
        kabupatenName: kabupaten.name,
        kecamatanName: kecamatan.name,
        kelurahanName: kelurahan.name,
        bloodType: patients.bloodType,
        rhesus: patients.rhesus,
        insuranceType: patients.insuranceType,
        bpjsNumber: patients.bpjsNumber,
        allergiesNotes: patients.allergiesNotes,
        chronicDiseasesNotes: patients.chronicDiseasesNotes,
        isActive: patients.isActive,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .leftJoin(provinsi, eq(patients.provinsiId, provinsi.id))
      .leftJoin(kabupaten, eq(patients.kabupatenId, kabupaten.id))
      .leftJoin(kecamatan, eq(patients.kecamatanId, kecamatan.id))
      .leftJoin(kelurahan, eq(patients.kelurahanId, kelurahan.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(patients.createdAt)),
    db.select({ count: sql`count(*)` }).from(patients).where(whereClause),
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

async function getPatientById(id) {
  const result = await db
    .select({
      id: patients.id,
      medicalRecordNumber: patients.medicalRecordNumber,
      name: patients.name,
      identityType: patients.identityType,
      identityNumber: patients.identityNumber,
      gender: patients.gender,
      birthPlace: patients.birthPlace,
      birthDate: patients.birthDate,
      bloodType: patients.bloodType,
      rhesus: patients.rhesus,
      address: patients.address,
      residenceAddress: patients.residenceAddress,
      provinsiId: patients.provinsiId,
      provinsiName: provinsi.name,
      kabupatenId: patients.kabupatenId,
      kabupatenName: kabupaten.name,
      kecamatanId: patients.kecamatanId,
      kecamatanName: kecamatan.name,
      kelurahanId: patients.kelurahanId,
      kelurahanName: kelurahan.name,
      education: patients.education,
      occupation: patients.occupation,
      nationality: patients.nationality,
      religion: patients.religion,
      ethnicity: patients.ethnicity,
      maritalStatus: patients.maritalStatus,
      phone: patients.phone,
      parentName: patients.parentName,
      language: patients.language,
      insuranceType: patients.insuranceType,
      bpjsNumber: patients.bpjsNumber,
      noKk: patients.noKk,
      ihsNumber: patients.ihsNumber,
      allergiesNotes: patients.allergiesNotes,
      chronicDiseasesNotes: patients.chronicDiseasesNotes,
      isDeceased: patients.isDeceased,
      isActive: patients.isActive,
      createdBy: patients.createdBy,
      createdAt: patients.createdAt,
      updatedAt: patients.updatedAt,
    })
    .from(patients)
    .leftJoin(provinsi, eq(patients.provinsiId, provinsi.id))
    .leftJoin(kabupaten, eq(patients.kabupatenId, kabupaten.id))
    .leftJoin(kecamatan, eq(patients.kecamatanId, kecamatan.id))
    .leftJoin(kelurahan, eq(patients.kelurahanId, kelurahan.id))
    .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
    .limit(1);

  if (!result[0]) return null;

  const [allergiesList, emergencyList] = await Promise.all([
    db.select().from(patientAllergies).where(eq(patientAllergies.patientId, id)),
    db.select().from(patientEmergencyContacts).where(eq(patientEmergencyContacts.patientId, id)),
  ]);

  return {
    ...result[0],
    allergies: allergiesList,
    emergencyContacts: emergencyList,
  };
}

async function findPatientByMRN(mrn) {
  const result = await db
    .select()
    .from(patients)
    .where(and(eq(patients.medicalRecordNumber, mrn), isNull(patients.deletedAt)))
    .limit(1);
  return result[0] || null;
}

async function findPatientByIdentity(identityNumber) {
  if (!identityNumber) return null;
  const result = await db
    .select()
    .from(patients)
    .where(and(eq(patients.identityNumber, identityNumber), isNull(patients.deletedAt)))
    .limit(1);
  return result[0] || null;
}

async function createPatient(data) {
  const { allergies = [], emergencyContacts = [], ...patientData } = data;
  const [created] = await db.insert(patients).values(patientData).returning();

  if (allergies.length > 0) {
    await db.insert(patientAllergies).values(
      allergies.map((a) => ({
        patientId: created.id,
        allergenType: a.allergenType || 'Obat',
        allergenName: a.allergenName,
        severity: a.severity || 'Sedang',
        reaction: a.reaction,
      }))
    );
  }

  if (emergencyContacts.length > 0) {
    await db.insert(patientEmergencyContacts).values(
      emergencyContacts.map((c) => ({
        patientId: created.id,
        name: c.name,
        relationship: c.relationship,
        phone: c.phone,
        address: c.address,
      }))
    );
  }

  return getPatientById(created.id);
}

async function updatePatient(id, data) {
  const { allergies, emergencyContacts, ...patientData } = data;
  const [updated] = await db
    .update(patients)
    .set({ ...patientData, updatedAt: new Date() })
    .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
    .returning();

  if (!updated) return null;

  if (allergies && Array.isArray(allergies)) {
    await db.delete(patientAllergies).where(eq(patientAllergies.patientId, id));
    if (allergies.length > 0) {
      await db.insert(patientAllergies).values(
        allergies.map((a) => ({
          patientId: id,
          allergenType: a.allergenType || 'Obat',
          allergenName: a.allergenName,
          severity: a.severity || 'Sedang',
          reaction: a.reaction,
        }))
      );
    }
  }

  if (emergencyContacts && Array.isArray(emergencyContacts)) {
    await db.delete(patientEmergencyContacts).where(eq(patientEmergencyContacts.patientId, id));
    if (emergencyContacts.length > 0) {
      await db.insert(patientEmergencyContacts).values(
        emergencyContacts.map((c) => ({
          patientId: id,
          name: c.name,
          relationship: c.relationship,
          phone: c.phone,
          address: c.address,
        }))
      );
    }
  }

  return getPatientById(id);
}

async function deletePatient(id) {
  const [deleted] = await db
    .update(patients)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
    .returning();
  return deleted || null;
}

// ─── 2. Wilayah Queries (Provinsi, Kabupaten, Kecamatan, Kelurahan) ───────────

async function getProvinsiList() {
  return db.select().from(provinsi).orderBy(asc(provinsi.name));
}

async function getKabupatenByProvinsi(provinsiId) {
  return db
    .select()
    .from(kabupaten)
    .where(eq(kabupaten.provinsiId, Number(provinsiId)))
    .orderBy(asc(kabupaten.name));
}

async function getKecamatanByKabupaten(kabupatenId) {
  return db
    .select()
    .from(kecamatan)
    .where(eq(kecamatan.kabupatenId, Number(kabupatenId)))
    .orderBy(asc(kecamatan.name));
}

async function getKelurahanByKecamatan(kecamatanId) {
  return db
    .select()
    .from(kelurahan)
    .where(eq(kelurahan.kecamatanId, Number(kecamatanId)))
    .orderBy(asc(kelurahan.name));
}

module.exports = {
  getPatients,
  getPatientById,
  findPatientByMRN,
  findPatientByIdentity,
  createPatient,
  updatePatient,
  deletePatient,
  getProvinsiList,
  getKabupatenByProvinsi,
  getKecamatanByKabupaten,
  getKelurahanByKecamatan,
};
