const { db } = require('../../db');
const { registrations, queues } = require('../../db/schema');
const { sql, and, eq } = require('drizzle-orm');

// ─── Format tanggal ke YYYYMMDD (WIB safe) ──────────────────────────────────
function formatDateYMD(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Generate Nomor Pendaftaran Harian.
 * Format: REG-YYYYMMDD-XXXX (4 digit, sekuensial per hari)
 * Contoh: REG-20260901-0001
 *
 * @param {string|Date} [targetDate] — tanggal target, default hari ini
 * @returns {Promise<string>}
 */
async function generateRegistrationNumber(targetDate) {
  const today = targetDate ? new Date(targetDate) : new Date();
  const dateStr = formatDateYMD(today);
  const prefix = `REG-${dateStr}-`;

  // Hitung berapa registrasi di tanggal ini
  const result = await db
    .select({ count: sql`count(*)` })
    .from(registrations)
    .where(eq(registrations.registrationDate, today.toISOString().substring(0, 10)));

  const seq = Number(result[0]?.count || 0) + 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * Generate Nomor Antrian per Poliklinik per Hari.
 * Format: {PREFIX}-{NNN} — prefix dari kode poliklinik
 * Contoh:
 *   POLI-UMUM     → A-001
 *   POLI-GIGI     → B-001
 *   POLI-ESTETIKA → C-001
 *   Poli lain     → Z-001 (fallback)
 *
 * @param {string} polyclinicId
 * @param {string} polyclinicCode  — misal 'POLI-UMUM', 'POLI-GIGI'
 * @param {string|Date} [targetDate]
 * @returns {Promise<{ queueNumber: string, queueSequence: number }>}
 */
async function generateQueueNumber(polyclinicId, polyclinicCode, targetDate) {
  const today = targetDate ? new Date(targetDate) : new Date();
  const dateStr = today.toISOString().substring(0, 10);

  // Tentukan prefix berdasarkan kode poli
  const prefixMap = {
    'POLI-UMUM': 'A',
    'POLI-GIGI': 'B',
    'POLI-ESTETIKA': 'C',
    'POLI-KIA': 'D',
    'POLI-ANAK': 'E',
    'POLI-JIWA': 'F',
    'POLI-MATA': 'G',
    'POLI-THT': 'H',
    'POLI-ORTOPEDI': 'I',
    'POLI-JANTUNG': 'J',
  };

  // Cari prefix dari kode poli, fallback ke huruf Z
  let prefix = 'Z';
  for (const [key, val] of Object.entries(prefixMap)) {
    if (polyclinicCode?.toUpperCase().includes(key.replace('POLI-', ''))) {
      prefix = val;
      break;
    }
  }

  // Hitung antrian hari ini untuk poli ini
  const result = await db
    .select({ count: sql`count(*)` })
    .from(queues)
    .where(
      and(
        eq(queues.polyclinicId, polyclinicId),
        eq(queues.queueDate, dateStr)
      )
    );

  const seq = Number(result[0]?.count || 0) + 1;
  return {
    queueNumber: `${prefix}-${String(seq).padStart(3, '0')}`,
    queueSequence: seq,
    prefix,
  };
}

module.exports = {
  generateRegistrationNumber,
  generateQueueNumber,
  formatDateYMD,
};
