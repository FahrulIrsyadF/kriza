const { db } = require('../../db');
const { auditLogs } = require('../../db/schema');

/**
 * Mencatat satu audit log ke database.
 * Fungsi ini TIDAK boleh melempar error — gagal audit tidak boleh gagalkan operasi utama.
 *
 * @param {object} params
 * @param {string|null} params.userId - UUID user yang melakukan aksi
 * @param {string} params.action - CREATE | UPDATE | DELETE | LOGIN | LOGOUT | LOGIN_FAILED | dll
 * @param {string} params.entityType - Nama tabel/domain: 'users', 'patients', dll
 * @param {string|null} params.entityId - UUID entitas yang terpengaruh
 * @param {object|null} params.oldValues - Nilai sebelum perubahan
 * @param {object|null} params.newValues - Nilai setelah perubahan
 * @param {string|null} params.ipAddress - IP address requester
 * @param {string|null} params.userAgent - User-Agent header
 */
async function logAudit({
  userId = null,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    // Log ke console tapi jangan propagate error
    // Audit gagal tidak boleh gagalkan operasi bisnis
    console.error('[AUDIT] Gagal mencatat audit log:', err.message, { action, entityType, entityId });
  }
}

module.exports = { logAudit };
