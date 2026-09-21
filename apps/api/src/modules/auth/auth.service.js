const bcrypt = require('bcryptjs');
const {
  findActiveUserByUsername,
  getUserRolesAndPermissions,
  findUserById,
  getUserPractitioner,
} = require('./auth.repository');
const { logAudit } = require('../../shared/utils/audit');
const { getNextMidnight, getSecondsUntilMidnight } = require('../../shared/utils/token');
const env = require('../../config/env');

/**
 * Proses login.
 * Verifikasi kredensial, kembalikan JWT payload dan waktu expire.
 */
async function login({ username, password, ipAddress, userAgent }) {
  // 1. Cari user
  const user = await findActiveUserByUsername(username);

  if (!user) {
    await logAudit({
      action: 'LOGIN_FAILED',
      entityType: 'auth',
      newValues: { username, reason: 'user_not_found' },
      ipAddress,
      userAgent,
    });
    const err = new Error('Username atau password salah');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // 2. Verifikasi password
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    await logAudit({
      userId: user.id,
      action: 'LOGIN_FAILED',
      entityType: 'auth',
      entityId: user.id,
      newValues: { reason: 'wrong_password' },
      ipAddress,
      userAgent,
    });
    const err = new Error('Username atau password salah');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // 3. Ambil roles, permissions, dan link data dokter/praktisi jika ada
  const [{ roles, permissions }, practitioner] = await Promise.all([
    getUserRolesAndPermissions(user.id),
    getUserPractitioner(user.id, user.name),
  ]);

  // 4. Hitung expire: tengah malam WIB berikutnya
  const expiresAt = getNextMidnight(env.CLINIC_TIMEZONE_OFFSET);
  const expiresInSeconds = getSecondsUntilMidnight(env.CLINIC_TIMEZONE_OFFSET);

  // 5. Susun JWT payload
  const payload = {
    sub: user.id,
    name: user.name,
    username: user.username,
    roles,
    permissions,
    practitionerId: practitioner?.id || null,
  };

  // 6. Audit login sukses
  await logAudit({
    userId: user.id,
    action: 'LOGIN',
    entityType: 'auth',
    entityId: user.id,
    newValues: { roles, practitionerId: practitioner?.id, sessionExpiresAt: expiresAt.toISOString() },
    ipAddress,
    userAgent,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      roles,
      permissions,
      practitioner,
    },
    payload,
    expiresAt,
    expiresInSeconds,
  };
}

/**
 * Proses logout — catat audit, cookie akan dihapus oleh route handler.
 */
async function logout({ userId, ipAddress, userAgent }) {
  await logAudit({
    userId,
    action: 'LOGOUT',
    entityType: 'auth',
    entityId: userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Ambil data user saat ini dari JWT payload.
 * @param {string} userId
 */
async function getMe(userId) {
  const user = await findUserById(userId);
  if (!user) {
    const err = new Error('User tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  const [{ roles, permissions }, practitioner] = await Promise.all([
    getUserRolesAndPermissions(userId),
    getUserPractitioner(userId, user.name),
  ]);

  return { ...user, roles, permissions, practitioner };
}

module.exports = { login, logout, getMe };
