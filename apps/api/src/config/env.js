const path = require('path');
const fs = require('fs');

// Cek .env di root monorepo atau local workspace
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
const localEnvPath = path.resolve(__dirname, '../../.env');
const envPath = fs.existsSync(rootEnvPath) ? rootEnvPath : localEnvPath;

require('dotenv').config({ path: envPath });

const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // JWT tunggal — expire tengah malam WIB, tidak ada refresh token
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  // Timezone klinik untuk kalkulasi expire token
  CLINIC_TIMEZONE_OFFSET: z.coerce.number().default(7), // WIB = UTC+7
  // Cookie 'secure' hanya boleh aktif kalau diakses via HTTPS.
  // Deployment internal via IP + HTTP harus false, kalau tidak browser
  // menolak menyimpan cookie sesi dan semua request jadi 401.
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Environment variable tidak valid:');
  console.error(parsed.error.format());
  process.exit(1);
}

module.exports = parsed.data;
