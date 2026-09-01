/**
 * Utility kalkulasi waktu expire token.
 *
 * Strategi: token expire tepat tengah malam WIB (00:00 UTC+7).
 * Tidak ada refresh token — user login sekali setiap pagi.
 */

/**
 * Menghitung timestamp tengah malam berikutnya dalam timezone klinik.
 * @param {number} tzOffset - UTC offset dalam jam (default 7 untuk WIB)
 * @returns {Date} - Waktu tepat tengah malam WIB berikutnya
 */
function getNextMidnight(tzOffset = 7) {
  const TZ_OFFSET_MS = tzOffset * 60 * 60 * 1000;
  const now = new Date();

  // Geser waktu sekarang ke timezone klinik untuk baca tanggal WIB
  const nowInTZ = new Date(now.getTime() + TZ_OFFSET_MS);

  // Ambil tanggal besok di timezone klinik (hari + 1, jam 00:00:00)
  const nextDayInTZ = new Date(Date.UTC(
    nowInTZ.getUTCFullYear(),
    nowInTZ.getUTCMonth(),
    nowInTZ.getUTCDate() + 1,
    0, 0, 0, 0
  ));

  // Konversi kembali ke UTC: kurangi offset timezone
  const midnightUTC = new Date(nextDayInTZ.getTime() - TZ_OFFSET_MS);

  return midnightUTC;
}

/**
 * Menghitung detik sampai tengah malam WIB berikutnya.
 * Dipakai sebagai `expiresIn` untuk JWT.
 * @param {number} tzOffset
 * @returns {number} detik
 */
function getSecondsUntilMidnight(tzOffset = 7) {
  const midnight = getNextMidnight(tzOffset);
  const now = Date.now();
  return Math.max(Math.floor((midnight.getTime() - now) / 1000), 1);
}

module.exports = { getNextMidnight, getSecondsUntilMidnight };
