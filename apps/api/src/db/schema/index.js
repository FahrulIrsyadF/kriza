/**
 * Schema database KRIZA — Entry point semua Drizzle schema.
 * Import dan re-export semua schema dari sini.
 */

// Fase 1 — Auth & Audit
const authSchema = require('./auth.schema');
const auditSchema = require('./audit.schema');

// Fase 2 — Master Data Klinik
const masterDataSchema = require('./masterdata.schema');

// Fase 3 — Manajemen Pasien & Wilayah
const patientsSchema = require('./patients.schema');

// Fase 4 — Registrasi Kunjungan & Antrian
const registrationsSchema = require('./registrations.schema');

const schema = {
  ...authSchema,
  ...auditSchema,
  ...masterDataSchema,
  ...patientsSchema,
  ...registrationsSchema,
};

module.exports = schema;

