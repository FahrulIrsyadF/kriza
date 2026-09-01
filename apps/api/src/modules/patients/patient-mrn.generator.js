const { db } = require('../../db');
const { patients } = require('../../db/schema');
const { sql, desc } = require('drizzle-orm');

/**
 * Menghasilkan Nomor Rekam Medis (Medrec) unik berikutnya secara sekuensial.
 * Format default: 6 digit zero-padded (misal: 000001, 000002, ...)
 * Atau prefix: RM-000001
 * 
 * @returns {Promise<string>}
 */
async function generateNextMedicalRecordNumber() {
  // Ambil data pasien terakhir yang nomor RM-nya berformat angka/sekuens
  const lastPatient = await db
    .select({ mrn: patients.medicalRecordNumber })
    .from(patients)
    .orderBy(desc(patients.createdAt))
    .limit(1);

  if (!lastPatient || lastPatient.length === 0) {
    return '000001';
  }

  const lastMrn = lastPatient[0].mrn;
  // Ekstrak angka dari MRN terakhir
  const numericPart = lastMrn.replace(/\D/g, '');

  if (!numericPart) {
    const totalPatients = await db.select({ count: sql`count(*)` }).from(patients);
    const nextSeq = Number(totalPatients[0]?.count || 0) + 1;
    return String(nextSeq).padStart(6, '0');
  }

  const nextSeq = parseInt(numericPart, 10) + 1;
  return String(nextSeq).padStart(6, '0');
}

module.exports = { generateNextMedicalRecordNumber };
