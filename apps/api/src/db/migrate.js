require('../config/env'); // Validasi env dulu sebelum run migration

const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { db, pool } = require('./index');
const path = require('path');

async function runMigrations() {
  console.log('🔄  Menjalankan database migrations...');

  try {
    await migrate(db, {
      migrationsFolder: path.join(__dirname, 'migrations'),
    });
    console.log('✅  Migrations berhasil dijalankan');
  } catch (err) {
    console.error('❌  Migration gagal:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
