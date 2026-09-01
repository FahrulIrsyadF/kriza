const { pgTable, uuid, varchar, boolean, text, timestamp, primaryKey } = require('drizzle-orm/pg-core');
const { sql, relations } = require('drizzle-orm');

// ─── Users ────────────────────────────────────────────────────────────────────
const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  username: varchar('username', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: uuid('created_by'),
});

// ─── Roles ────────────────────────────────────────────────────────────────────
const roles = pgTable('roles', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 50 }).unique().notNull(), // 'admin', 'dokter', 'perawat'
  displayName: varchar('display_name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
});

// ─── Permissions ─────────────────────────────────────────────────────────────
const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  action: varchar('action', { length: 100 }).unique().notNull(), // 'patients:read', 'billing:write'
  description: text('description'),
});

// ─── Role <-> Permission (many-to-many) ───────────────────────────────────────
const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
}));

// ─── User <-> Role (many-to-many) ─────────────────────────────────────────────
const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
}));

// ─── Relations ────────────────────────────────────────────────────────────────
const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
}));

const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

module.exports = {
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  usersRelations,
  rolesRelations,
  userRolesRelations,
  rolePermissionsRelations,
};
