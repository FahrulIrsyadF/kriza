const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const env = require('../config/env');
const schema = require('./schema');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

const db = drizzle(pool, { schema });

/**
 * Menguji koneksi ke database
 * @returns {Promise<void>}
 */
async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('✅  Database terkoneksi');
  } finally {
    client.release();
  }
}

module.exports = { db, pool, testConnection };
