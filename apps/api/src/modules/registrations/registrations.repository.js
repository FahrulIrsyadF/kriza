const { db } = require('../../db');
const {
  registrations, queues, queueCalls,
  polyclinics, practitioners, patients,
} = require('../../db/schema');
const { eq, and, desc, asc, ilike, or, gte, lte, sql, isNull } = require('drizzle-orm');

// ─── Helper: Build Base Join Query ──────────────────────────────────────────
function baseRegistrationSelect() {
  return db
    .select({
      // Registration core
      id: registrations.id,
      registrationNumber: registrations.registrationNumber,
      registrationDate: registrations.registrationDate,
      visitType: registrations.visitType,
      registrationSource: registrations.registrationSource,
      paymentMethod: registrations.paymentMethod,
      bpjsCardNumber: registrations.bpjsCardNumber,
      insuranceName: registrations.insuranceName,
      insurancePolicyNumber: registrations.insurancePolicyNumber,
      referralNumber: registrations.referralNumber,
      referralFrom: registrations.referralFrom,
      complaint: registrations.complaint,
      vitalSignsNotes: registrations.vitalSignsNotes,
      notes: registrations.notes,
      status: registrations.status,
      estimatedTime: registrations.estimatedTime,
      cancelledAt: registrations.cancelledAt,
      cancellationReason: registrations.cancellationReason,
      createdAt: registrations.createdAt,
      updatedAt: registrations.updatedAt,

      // MJKN Bridging fields
      mjknBookingCode: registrations.mjknBookingCode,
      mjknAppointmentDate: registrations.mjknAppointmentDate,
      mjknAppointmentTime: registrations.mjknAppointmentTime,
      mjknQueueNumber: registrations.mjknQueueNumber,

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
    })
    .from(registrations)
    .leftJoin(patients, eq(registrations.patientId, patients.id))
    .leftJoin(polyclinics, eq(registrations.polyclinicId, polyclinics.id))
    .leftJoin(practitioners, eq(registrations.practitionerId, practitioners.id));
}

// ─── 1. List Registrations ─────────────────────────────────────────────────
async function getRegistrations({
  date,
  polyclinicId,
  practitionerId,
  status,
  search,
  source,
  page = 1,
  limit = 30,
} = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];

  // Filter tanggal (default hari ini)
  const filterDate = date || new Date().toISOString().substring(0, 10);
  conditions.push(eq(registrations.registrationDate, filterDate));

  if (polyclinicId) conditions.push(eq(registrations.polyclinicId, polyclinicId));
  if (practitionerId) conditions.push(eq(registrations.practitionerId, practitionerId));
  if (status) conditions.push(eq(registrations.status, status));
  if (source) conditions.push(eq(registrations.registrationSource, source));

  if (search) {
    const q = `%${search}%`;
    conditions.push(
      or(
        ilike(patients.name, q),
        ilike(patients.medicalRecordNumber, q),
        ilike(patients.identityNumber, q),
        ilike(registrations.registrationNumber, q),
      )
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: registrations.id,
        registrationNumber: registrations.registrationNumber,
        registrationDate: registrations.registrationDate,
        visitType: registrations.visitType,
        registrationSource: registrations.registrationSource,
        paymentMethod: registrations.paymentMethod,
        status: registrations.status,
        complaint: registrations.complaint,
        createdAt: registrations.createdAt,
        mjknBookingCode: registrations.mjknBookingCode,
        mjknQueueNumber: registrations.mjknQueueNumber,

        patientId: patients.id,
        patientMrn: patients.medicalRecordNumber,
        patientName: patients.name,
        patientGender: patients.gender,
        patientBirthDate: patients.birthDate,
        patientPhone: patients.phone,
        patientInsuranceType: patients.insuranceType,
        patientAllergiesNotes: patients.allergiesNotes,

        polyclinicId: polyclinics.id,
        polyclinicCode: polyclinics.code,
        polyclinicName: polyclinics.name,

        practitionerId: practitioners.id,
        practitionerName: practitioners.name,
        practitionerTitle: practitioners.title,
      })
      .from(registrations)
      .leftJoin(patients, eq(registrations.patientId, patients.id))
      .leftJoin(polyclinics, eq(registrations.polyclinicId, polyclinics.id))
      .leftJoin(practitioners, eq(registrations.practitionerId, practitioners.id))
      .where(where)
      .orderBy(asc(registrations.createdAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql`count(*)` })
      .from(registrations)
      .leftJoin(patients, eq(registrations.patientId, patients.id))
      .where(where),
  ]);

  // Attach queue info to each registration
  const ids = rows.map((r) => r.id);
  let queueMap = {};
  if (ids.length > 0) {
    const qrows = await db
      .select()
      .from(queues)
      .where(
        sql`${queues.registrationId} = ANY(${sql.raw(`ARRAY[${ids.map((id) => `'${id}'`).join(',')}]::uuid[]`)})`
      );
    queueMap = Object.fromEntries(qrows.map((q) => [q.registrationId, q]));
  }

  const items = rows.map((r) => ({ ...r, queue: queueMap[r.id] || null }));

  return {
    items,
    pagination: {
      page,
      limit,
      total: Number(countResult[0]?.count || 0),
      totalPages: Math.ceil(Number(countResult[0]?.count || 0) / limit),
    },
    filterDate,
  };
}

// ─── 2. Get Registration By ID ────────────────────────────────────────────
async function getRegistrationById(id) {
  const rows = await db
    .select({
      id: registrations.id,
      registrationNumber: registrations.registrationNumber,
      registrationDate: registrations.registrationDate,
      visitType: registrations.visitType,
      registrationSource: registrations.registrationSource,
      paymentMethod: registrations.paymentMethod,
      bpjsCardNumber: registrations.bpjsCardNumber,
      insuranceName: registrations.insuranceName,
      insurancePolicyNumber: registrations.insurancePolicyNumber,
      referralNumber: registrations.referralNumber,
      referralFrom: registrations.referralFrom,
      complaint: registrations.complaint,
      vitalSignsNotes: registrations.vitalSignsNotes,
      notes: registrations.notes,
      status: registrations.status,
      estimatedTime: registrations.estimatedTime,
      cancelledAt: registrations.cancelledAt,
      cancellationReason: registrations.cancellationReason,
      createdAt: registrations.createdAt,
      updatedAt: registrations.updatedAt,
      mjknBookingCode: registrations.mjknBookingCode,
      mjknAppointmentDate: registrations.mjknAppointmentDate,
      mjknAppointmentTime: registrations.mjknAppointmentTime,
      mjknQueueNumber: registrations.mjknQueueNumber,

      patientId: patients.id,
      patientMrn: patients.medicalRecordNumber,
      patientName: patients.name,
      patientGender: patients.gender,
      patientBirthDate: patients.birthDate,
      patientPhone: patients.phone,
      patientInsuranceType: patients.insuranceType,
      patientBpjsNumber: patients.bpjsNumber,
      patientAllergiesNotes: patients.allergiesNotes,
      patientChronicDiseasesNotes: patients.chronicDiseasesNotes,

      polyclinicId: polyclinics.id,
      polyclinicCode: polyclinics.code,
      polyclinicName: polyclinics.name,

      practitionerId: practitioners.id,
      practitionerName: practitioners.name,
      practitionerTitle: practitioners.title,
    })
    .from(registrations)
    .leftJoin(patients, eq(registrations.patientId, patients.id))
    .leftJoin(polyclinics, eq(registrations.polyclinicId, polyclinics.id))
    .leftJoin(practitioners, eq(registrations.practitionerId, practitioners.id))
    .where(eq(registrations.id, id))
    .limit(1);

  if (!rows.length) return null;
  const reg = rows[0];

  // Ambil antrian
  const qRows = await db.select().from(queues).where(eq(queues.registrationId, id)).limit(1);
  reg.queue = qRows[0] || null;

  return reg;
}

// ─── 3. Create Registration ───────────────────────────────────────────────
async function createRegistration(data) {
  const [created] = await db.insert(registrations).values(data).returning();
  return created;
}

// ─── 4. Create Queue ──────────────────────────────────────────────────────
async function createQueue(data) {
  const [created] = await db.insert(queues).values(data).returning();
  return created;
}

// ─── 5. Update Registration ───────────────────────────────────────────────
async function updateRegistration(id, data) {
  const [updated] = await db
    .update(registrations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(registrations.id, id))
    .returning();
  return updated;
}

// ─── 6. Update Queue Status ───────────────────────────────────────────────
async function updateQueueStatus(queueId, data) {
  const [updated] = await db
    .update(queues)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(queues.id, queueId))
    .returning();
  return updated;
}

// ─── 7. Get Today's Queue for a Polyclinic ──────────────────────────────
async function getTodayQueues(polyclinicId, dateStr) {
  const today = dateStr || new Date().toISOString().substring(0, 10);
  const conditions = [eq(queues.queueDate, today)];
  if (polyclinicId) conditions.push(eq(queues.polyclinicId, polyclinicId));

  const rows = await db
    .select({
      queueId: queues.id,
      queueNumber: queues.queueNumber,
      queueSequence: queues.queueSequence,
      queueDate: queues.queueDate,
      queueSource: queues.queueSource,
      status: queues.status,
      calledCounter: queues.calledCounter,
      calledAt: queues.calledAt,
      servedAt: queues.servedAt,
      completedAt: queues.completedAt,
      createdAt: queues.createdAt,

      registrationId: registrations.id,
      registrationNumber: registrations.registrationNumber,
      complaint: registrations.complaint,
      paymentMethod: registrations.paymentMethod,
      visitType: registrations.visitType,
      registrationSource: registrations.registrationSource,
      mjknBookingCode: registrations.mjknBookingCode,

      patientId: patients.id,
      patientMrn: patients.medicalRecordNumber,
      patientName: patients.name,
      patientGender: patients.gender,
      patientBirthDate: patients.birthDate,
      patientPhone: patients.phone,
      patientAllergiesNotes: patients.allergiesNotes,

      polyclinicId: polyclinics.id,
      polyclinicCode: polyclinics.code,
      polyclinicName: polyclinics.name,

      practitionerId: practitioners.id,
      practitionerName: practitioners.name,
      practitionerTitle: practitioners.title,
    })
    .from(queues)
    .leftJoin(registrations, eq(queues.registrationId, registrations.id))
    .leftJoin(patients, eq(registrations.patientId, patients.id))
    .leftJoin(polyclinics, eq(queues.polyclinicId, polyclinics.id))
    .leftJoin(practitioners, eq(registrations.practitionerId, practitioners.id))
    .where(and(...conditions))
    .orderBy(asc(queues.queueSequence));

  return rows;
}

// ─── 8. Check Duplicate Active Registration ───────────────────────────────
// Cek apakah pasien sudah terdaftar di poli yang sama hari ini (status aktif)
async function findActiveRegistrationToday(patientId, polyclinicId, dateStr) {
  const today = dateStr || new Date().toISOString().substring(0, 10);
  const rows = await db
    .select({ id: registrations.id, status: registrations.status, registrationNumber: registrations.registrationNumber })
    .from(registrations)
    .where(
      and(
        eq(registrations.patientId, patientId),
        eq(registrations.polyclinicId, polyclinicId),
        eq(registrations.registrationDate, today),
        sql`${registrations.status} NOT IN ('BATAL', 'LEWAT', 'SELESAI')`
      )
    )
    .limit(1);
  return rows[0] || null;
}

// ─── 9. Count Registrations Today for Doctor (Quota Check) ───────────────
async function countActiveRegistrationsForDoctor(practitionerId, dateStr) {
  const today = dateStr || new Date().toISOString().substring(0, 10);
  const result = await db
    .select({ count: sql`count(*)` })
    .from(registrations)
    .where(
      and(
        eq(registrations.practitionerId, practitionerId),
        eq(registrations.registrationDate, today),
        sql`${registrations.status} NOT IN ('BATAL', 'LEWAT')`
      )
    );
  return Number(result[0]?.count || 0);
}

// ─── 10. Get Schedule for Doctor+Poli on a Weekday ───────────────────────
async function getDoctorScheduleForToday(practitionerId, polyclinicId, dayOfWeek) {
  const { schedules } = require('../../db/schema');
  const rows = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.practitionerId, practitionerId),
        eq(schedules.polyclinicId, polyclinicId),
        eq(schedules.dayOfWeek, dayOfWeek),
        eq(schedules.isActive, true)
      )
    )
    .limit(1);
  return rows[0] || null;
}

// ─── 11. Check First Visit (BARU vs LAMA) ─────────────────────────────────
async function isFirstVisit(patientId) {
  const result = await db
    .select({ count: sql`count(*)` })
    .from(registrations)
    .where(eq(registrations.patientId, patientId));
  return Number(result[0]?.count || 0) === 0;
}

// ─── 12. Log Queue Call ───────────────────────────────────────────────────
async function logQueueCall(queueId, counterName, calledBy) {
  const [log] = await db.insert(queueCalls).values({ queueId, counterName, calledBy }).returning();
  return log;
}

module.exports = {
  getRegistrations,
  getRegistrationById,
  createRegistration,
  createQueue,
  updateRegistration,
  updateQueueStatus,
  getTodayQueues,
  findActiveRegistrationToday,
  countActiveRegistrationsForDoctor,
  getDoctorScheduleForToday,
  isFirstVisit,
  logQueueCall,
};
