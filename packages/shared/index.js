/**
 * @kriza/shared
 * Shared constants, utilities, dan konfigurasi yang dipakai
 * baik oleh apps/web maupun apps/api
 */

// ─── Status Codes ────────────────────────────────────────────────────────────
const REGISTRATION_STATUS = {
  WAITING: 'waiting',
  CALLED: 'called',
  IN_SERVICE: 'in_service',
  DONE: 'done',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

const ENCOUNTER_STATUS = {
  DRAFT: 'draft',
  FINALIZED: 'finalized',
  AMENDED: 'amended',
};

const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
};

const VISIT_TYPE = {
  GENERAL: 'general',        // Umum / bayar sendiri
  BPJS: 'bpjs',              // Peserta BPJS
  INSURANCE: 'insurance',    // Asuransi swasta
};

const POLYCLINICS = {
  GENERAL: 'poli_umum',
  DENTAL: 'poli_gigi',
  AESTHETIC: 'poli_kecantikan',
};

module.exports = {
  REGISTRATION_STATUS,
  ENCOUNTER_STATUS,
  GENDER,
  VISIT_TYPE,
  POLYCLINICS,
};
