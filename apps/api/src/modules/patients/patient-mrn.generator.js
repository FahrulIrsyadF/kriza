const { db } = require('../../db');
const { patients } = require('../../db/schema');
const { sql, isNull } = require('drizzle-orm');

/**
 * Menghasilkan Nomor Rekam Medis (No. RM) unik berikutnya secara sekuensial.
 *
 * FORMAT BAKU: 6 digit angka, zero-padded, tanpa prefix/separator apapun.
 * Contoh: 000001, 000002, ..., 001337, ..., 999999
 *
 * Logika:
 *   1. Cari nilai numerik TERBESAR dari kolom medical_record_number
 *      (hanya yang benar-benar 6 digit angka murni).
 *   2. Increment +1, pad ke 6 digit.
 *   3. Jika belum ada data → mulai dari 000001.
 *
 * @returns {Promise<string>}
 */
async function generateNextMedicalRecordNumber() {
  // Ambil nilai MAX numerik dari semua MRN yang berformat murni angka
  const result = await db.execute(
    sql`SELECT MAX(CAST(medical_record_number AS INTEGER)) AS max_mrn
        FROM patients
        WHERE medical_record_number ~ '^[0-9]+$'
          AND deleted_at IS NULL`
  );

  const maxMrn = result.rows?.[0]?.max_mrn ?? result[0]?.max_mrn ?? null;

  const nextSeq = maxMrn ? parseInt(maxMrn, 10) + 1 : 1;

  if (nextSeq > 999999) {
    throw new Error('Nomor rekam medis telah habis (melebihi 999999). Hubungi administrator.');
  }

  return String(nextSeq).padStart(6, '0');
}

module.exports = { generateNextMedicalRecordNumber };

