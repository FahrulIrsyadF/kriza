const { db } = require('../../db');
const { encounterReferrals } = require('../../db/schema');
const { sql, eq } = require('drizzle-orm');

function formatDateYMD(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Generate Nomor Surat Rujukan Medis Harian.
 * Format: RUJ-YYYYMMDD-XXXX (4 digit sekuensial)
 * Contoh: RUJ-20260901-0001
 * 
 * @param {string|Date} [targetDate]
 * @returns {Promise<string>}
 */
async function generateReferralNumber(targetDate) {
  const today = targetDate ? new Date(targetDate) : new Date();
  const dateStr = formatDateYMD(today);
  const prefix = `RUJ-${dateStr}-`;

  try {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(encounterReferrals)
      .where(sql`DATE(${encounterReferrals.issuedAt}) = ${today.toISOString().substring(0, 10)}`);

    const seq = Number(result[0]?.count || 0) + 1;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  } catch (err) {
    // Fallback jika query error
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${randomSeq}`;
  }
}

module.exports = {
  generateReferralNumber,
  formatDateYMD,
};
