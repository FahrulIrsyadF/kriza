const { pgTable, uuid, varchar, text, timestamp, jsonb } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

/**
 * Audit log — append-only.
 * TIDAK ada updated_at atau deleted_at.
 * TIDAK boleh di-UPDATE atau DELETE dari aplikasi normal.
 *
 * Setiap baris adalah satu kejadian yang sudah terjadi dan tidak bisa diubah.
 */
const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id'),    // Nullable: untuk aksi sistem/anonim
  action: varchar('action', { length: 50 }).notNull(),
  // CREATE | UPDATE | DELETE | RESTORE |
  // LOGIN | LOGOUT | LOGIN_FAILED |
  // FINALIZE | AMEND
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  // 'users' | 'patients' | 'encounters' | 'auth' | dll
  entityId: uuid('entity_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }), // Support IPv6
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  // ↑ HANYA createdAt — tidak ada updatedAt/deletedAt
});

module.exports = { auditLogs };
