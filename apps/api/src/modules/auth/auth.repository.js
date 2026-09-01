const { db } = require('../../db');
const { users, roles, permissions, userRoles, rolePermissions, practitioners } = require('../../db/schema');
const { eq, and, isNull, ilike } = require('drizzle-orm');

/**
 * Cari user aktif berdasarkan username.
 * @param {string} username
 * @returns {Promise<object|null>}
 */
async function findActiveUserByUsername(username) {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.username, username), isNull(users.deletedAt), eq(users.isActive, true)))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Ambil data praktisi/dokter yang terhubung dengan akun user.
 * @param {string} userId
 * @param {string} [userName]
 * @returns {Promise<object|null>}
 */
async function getUserPractitioner(userId, userName) {
  // 1. Coba cari by userId FK
  const byUser = await db
    .select({
      id: practitioners.id,
      code: practitioners.code,
      name: practitioners.name,
      title: practitioners.title,
      specialization: practitioners.specialization,
      sip: practitioners.sip,
    })
    .from(practitioners)
    .where(and(eq(practitioners.userId, userId), isNull(practitioners.deletedAt), eq(practitioners.isActive, true)))
    .limit(1);

  if (byUser.length > 0) return byUser[0];

  // 2. Fallback: Cari by matching name jika belum ter-link FK
  if (userName) {
    const byName = await db
      .select({
        id: practitioners.id,
        code: practitioners.code,
        name: practitioners.name,
        title: practitioners.title,
        specialization: practitioners.specialization,
        sip: practitioners.sip,
      })
      .from(practitioners)
      .where(and(ilike(practitioners.name, `%${userName}%`), isNull(practitioners.deletedAt), eq(practitioners.isActive, true)))
      .limit(1);

    if (byName.length > 0) return byName[0];
  }

  return null;
}

/**
 * Ambil roles dan permissions milik satu user.
 * @param {string} userId
 * @returns {Promise<{ roles: string[], permissions: string[] }>}
 */
async function getUserRolesAndPermissions(userId) {
  // Ambil roles user
  const userRoleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const roleNames = userRoleRows.map((r) => r.roleName);

  if (roleNames.length === 0) {
    return { roles: [], permissions: [] };
  }

  // Ambil permissions dari semua roles user
  const roleIds = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      require('drizzle-orm').inArray(roles.name, roleNames)
    );

  const roleIdList = roleIds.map((r) => r.id);

  let permissionNames = [];
  if (roleIdList.length > 0) {
    const permRows = await db
      .select({ action: permissions.action })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(require('drizzle-orm').inArray(rolePermissions.roleId, roleIdList));

    permissionNames = [...new Set(permRows.map((p) => p.action))];
  }

  return { roles: roleNames, permissions: permissionNames };
}

/**
 * Cari user by ID (untuk endpoint /me).
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function findUserById(userId) {
  const result = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  return result[0] ?? null;
}

module.exports = {
  findActiveUserByUsername,
  getUserRolesAndPermissions,
  findUserById,
  getUserPractitioner,
};
