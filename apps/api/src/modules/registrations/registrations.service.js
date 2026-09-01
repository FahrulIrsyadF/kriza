const repo = require('./registrations.repository');
const { generateRegistrationNumber, generateQueueNumber } = require('./registration-number.generator');
const { logAudit } = require('../../shared/utils/audit');
const { db } = require('../../db');
const { polyclinics, schedules } = require('../../db/schema');
const { eq, and } = require('drizzle-orm');

// ─── Helper: Ambil info poliklinik ───────────────────────────────────────────
async function getPolyclinicById(id) {
  const rows = await db.select().from(polyclinics).where(eq(polyclinics.id, id)).limit(1);
  return rows[0] || null;
}

// ─── 1. List Registrations ────────────────────────────────────────────────────
async function listRegistrations(params) {
  return repo.getRegistrations(params);
}

// ─── 2. Find Registration By ID ───────────────────────────────────────────────
async function findRegistration(id) {
  const reg = await repo.getRegistrationById(id);
  if (!reg) {
    const err = new Error('Data registrasi tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  return reg;
}

// ─── 3. Create Registration + Queue ──────────────────────────────────────────
async function createRegistration(data, { userId, ipAddress, userAgent }) {
  const {
    patientId,
    polyclinicId,
    practitionerId,
    scheduleId,
    registrationDate,
    registrationSource = 'LANGSUNG',
    paymentMethod = 'UMUM',
    bpjsCardNumber,
    insuranceName,
    insurancePolicyNumber,
    referralNumber,
    referralFrom,
    complaint,
    vitalSignsNotes,
    notes,
    mjknBookingCode,
    mjknAppointmentDate,
    mjknAppointmentTime,
    mjknQueueNumber: mjknQueueNumberInput,
    mjknRawPayload,
    forceRegister = false,
  } = data;

  const today = registrationDate || new Date().toISOString().substring(0, 10);

  // ─── Validasi 1: Cek pasien duplikat aktif di poli yang sama hari ini ────────
  if (!forceRegister) {
    const existing = await repo.findActiveRegistrationToday(patientId, polyclinicId, today);
    if (existing) {
      const err = new Error(
        `Pasien sudah terdaftar di poliklinik ini hari ini (No. Reg: ${existing.registrationNumber}, Status: ${existing.status}). Gunakan forceRegister=true untuk mendaftar ulang jika diperlukan.`
      );
      err.statusCode = 409;
      err.code = 'DUPLICATE_REGISTRATION';
      throw err;
    }
  }

  // ─── Validasi 2: Cek kuota dokter (jika dokter dipilih) ──────────────────────
  let doctorSchedule = null;
  if (practitionerId && !forceRegister) {
    const dayOfWeek = new Date(today).getDay();
    // JS Sunday=0, kita pakai 1=Senin..7=Minggu
    const normalizedDay = dayOfWeek === 0 ? 7 : dayOfWeek;

    doctorSchedule = await repo.getDoctorScheduleForToday(practitionerId, polyclinicId, normalizedDay);

    if (doctorSchedule) {
      const currentCount = await repo.countActiveRegistrationsForDoctor(practitionerId, today);
      if (currentCount >= doctorSchedule.quota) {
        const err = new Error(
          `Kuota dr. untuk hari ini sudah penuh (${currentCount}/${doctorSchedule.quota} pasien). Silakan pilih dokter lain atau gunakan forceRegister=true untuk mendaftar di luar kuota.`
        );
        err.statusCode = 409;
        err.code = 'QUOTA_EXCEEDED';
        err.data = { current: currentCount, quota: doctorSchedule.quota };
        throw err;
      }
    }
  }

  // ─── Tentukan BARU / LAMA ─────────────────────────────────────────────────
  const isNew = await repo.isFirstVisit(patientId);
  const visitType = isNew ? 'BARU' : 'LAMA';

  // ─── Generate Nomor Registrasi ─────────────────────────────────────────────
  const registrationNumber = await generateRegistrationNumber(today);

  // ─── Buat Record Registrasi ────────────────────────────────────────────────
  const regData = {
    registrationNumber,
    patientId,
    polyclinicId,
    practitionerId: practitionerId || null,
    scheduleId: scheduleId || (doctorSchedule ? doctorSchedule.id : null),
    registrationDate: today,
    visitType,
    registrationSource,
    paymentMethod,
    bpjsCardNumber: bpjsCardNumber || null,
    insuranceName: insuranceName || null,
    insurancePolicyNumber: insurancePolicyNumber || null,
    referralNumber: referralNumber || null,
    referralFrom: referralFrom || null,
    complaint: complaint || null,
    vitalSignsNotes: vitalSignsNotes || null,
    notes: notes || null,
    status: 'MENUNGGU',
    mjknBookingCode: mjknBookingCode || null,
    mjknAppointmentDate: mjknAppointmentDate || null,
    mjknAppointmentTime: mjknAppointmentTime || null,
    mjknQueueNumber: mjknQueueNumberInput || null,
    mjknRawPayload: mjknRawPayload || null,
    registeredBy: userId || null,
  };

  const created = await repo.createRegistration(regData);

  // ─── Generate & Buat Antrian ──────────────────────────────────────────────
  const poli = await getPolyclinicById(polyclinicId);
  const { queueNumber, queueSequence } = await generateQueueNumber(polyclinicId, poli?.code || '', today);

  // Bila source MJKN dan sudah ada nomor antrian dari MJKN, gunakan itu
  // namun tetap buat record queue internal untuk tracking status
  const finalQueueNumber = (registrationSource === 'MJKN' && mjknQueueNumberInput)
    ? `MJKN-${mjknQueueNumberInput}`
    : queueNumber;

  const queue = await repo.createQueue({
    registrationId: created.id,
    polyclinicId,
    queueNumber: finalQueueNumber,
    queueSequence,
    queueDate: today,
    queueSource: registrationSource,
    status: 'MENUNGGU',
  });

  // ─── Audit Log ────────────────────────────────────────────────────────────
  await logAudit({
    userId,
    action: 'CREATE',
    entityType: 'registrations',
    entityId: created.id,
    newValues: {
      registrationNumber,
      patientId,
      polyclinicId,
      visitType,
      registrationSource,
      paymentMethod,
      queueNumber: finalQueueNumber,
    },
    ipAddress,
    userAgent,
  });

  return { ...created, queue, visitType, polyclinicName: poli?.name };
}

// ─── 4. Update Registration ───────────────────────────────────────────────────
async function updateRegistration(id, data, { userId, ipAddress, userAgent }) {
  await findRegistration(id); // ensure exists
  const updated = await repo.updateRegistration(id, data);

  await logAudit({
    userId,
    action: 'UPDATE',
    entityType: 'registrations',
    entityId: id,
    newValues: data,
    ipAddress,
    userAgent,
  });

  return updated;
}

// ─── 5. Cancel Registration ───────────────────────────────────────────────────
async function cancelRegistration(id, { cancellationReason } = {}, { userId, ipAddress, userAgent }) {
  const reg = await findRegistration(id);

  if (['SELESAI', 'BATAL'].includes(reg.status)) {
    const err = new Error(`Registrasi dengan status ${reg.status} tidak dapat dibatalkan`);
    err.statusCode = 400;
    throw err;
  }

  const updated = await repo.updateRegistration(id, {
    status: 'BATAL',
    cancelledBy: userId || null,
    cancelledAt: new Date(),
    cancellationReason: cancellationReason || null,
  });

  // Update antrian juga
  if (reg.queue?.id) {
    await repo.updateQueueStatus(reg.queue.id, { status: 'BATAL', updatedAt: new Date() });
  }

  await logAudit({
    userId,
    action: 'DELETE',
    entityType: 'registrations',
    entityId: id,
    oldValues: { status: reg.status, registrationNumber: reg.registrationNumber },
    newValues: { status: 'BATAL', cancellationReason },
    ipAddress,
    userAgent,
  });

  return updated;
}

// ─── 6. Update Queue Status (Panggil / Periksa / Selesai / Lewat) ────────────
async function updateQueueAction(registrationId, { action, counterName }, { userId }) {
  const reg = await findRegistration(registrationId);

  if (!reg.queue) {
    const err = new Error('Data antrian untuk registrasi ini tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  const queueId = reg.queue.id;
  const now = new Date();

  let queueUpdate = {};
  let regUpdate = {};
  let logMessage = '';

  switch (action) {
    case 'PANGGIL':
      if (reg.status === 'BATAL' || reg.status === 'SELESAI') {
        const err = new Error('Antrian sudah selesai atau dibatalkan, tidak dapat dipanggil');
        err.statusCode = 400;
        throw err;
      }
      queueUpdate = { status: 'DIPANGGIL', calledAt: now, calledCounter: (reg.queue.calledCounter || 0) + 1 };
      regUpdate = { status: 'DIPANGGIL' };
      logMessage = `Antrian ${reg.queue.queueNumber} dipanggil`;
      // Buat log pemanggilan
      await repo.logQueueCall(queueId, counterName || 'Loket', userId);
      break;

    case 'PANGGIL_ULANG':
      // Panggil ulang: increment counter tapi tidak ubah status (mungkin sudah DIPANGGIL)
      queueUpdate = { calledCounter: (reg.queue.calledCounter || 0) + 1 };
      regUpdate = { status: 'DIPANGGIL' };
      logMessage = `Antrian ${reg.queue.queueNumber} dipanggil ulang (ke-${(reg.queue.calledCounter || 0) + 1})`;
      await repo.logQueueCall(queueId, counterName || 'Loket', userId);
      break;

    case 'PERIKSA':
      queueUpdate = { status: 'DIPERIKSA', servedAt: now };
      regUpdate = { status: 'DIPERIKSA' };
      logMessage = `Antrian ${reg.queue.queueNumber} mulai diperiksa`;
      break;

    case 'SELESAI':
      queueUpdate = { status: 'SELESAI', completedAt: now };
      regUpdate = { status: 'SELESAI' };
      logMessage = `Antrian ${reg.queue.queueNumber} selesai`;
      break;

    case 'LEWAT':
      queueUpdate = { status: 'LEWAT', skippedAt: now };
      regUpdate = { status: 'LEWAT' };
      logMessage = `Antrian ${reg.queue.queueNumber} dilewati (pasien tidak hadir)`;
      break;

    default:
      const err = new Error(`Aksi antrian tidak dikenal: ${action}`);
      err.statusCode = 400;
      throw err;
  }

  const [updatedQueue, updatedReg] = await Promise.all([
    repo.updateQueueStatus(queueId, queueUpdate),
    repo.updateRegistration(registrationId, regUpdate),
  ]);

  return { queue: updatedQueue, registration: updatedReg, message: logMessage };
}

// ─── 7. Today's Queue ─────────────────────────────────────────────────────────
async function getTodayQueues(polyclinicId, dateStr) {
  return repo.getTodayQueues(polyclinicId, dateStr);
}

// ─── 8. Check MJKN Booking (utility untuk masa depan) ────────────────────────
// Placeholder untuk endpoint webhook MJKN — akan diisi saat bridging aktif
async function processMjknBooking(mjknPayload, { userId, ipAddress, userAgent }) {
  /**
   * TODO (Integrasi MJKN / Bridging P-Care BPJS):
   * 1. Verifikasi signature/token dari MJKN
   * 2. Parse payload: patientNik, bookingCode, polyclinicCode, appointmentDate, appointmentTime, queueNumber
   * 3. Cari pasien by NIK -> repo.findPatientByNIK()
   *    - Jika tidak ketemu: auto-register pasien dengan data dari JKN
   * 4. Cari polyclinic by code
   * 5. Panggil createRegistration() dengan source='MJKN' dan field MJKN terisi
   * 6. Kirim response konfirmasi ke MJKN
   */
  throw new Error('Bridging MJKN belum diaktifkan. Hubungi administrator untuk konfigurasi integrasi BPJS P-Care.');
}

// ─── 9. Get next registration number preview ──────────────────────────────────
async function getNextRegistrationNumber(date) {
  return generateRegistrationNumber(date);
}

module.exports = {
  listRegistrations,
  findRegistration,
  createRegistration,
  updateRegistration,
  cancelRegistration,
  updateQueueAction,
  getTodayQueues,
  processMjknBooking,
  getNextRegistrationNumber,
};
