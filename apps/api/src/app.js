const fastify = require('fastify');
const cors = require('@fastify/cors');
const cookie = require('@fastify/cookie');
const jwt = require('@fastify/jwt');
const env = require('./config/env');

/**
 * Membangun instance Fastify dengan semua plugins dan routes.
 * Dipisah dari server.js agar mudah di-test.
 */
function buildApp(opts = {}) {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      ...(env.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
            colorize: true,
          },
        },
      }),
    },
    ...opts,
  });

  // ─── Plugins ──────────────────────────────────────────────────────────────
  app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true, // Wajib untuk httpOnly cookie cross-origin
  });

  app.register(cookie);

  app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'kriza_session',
      signed: false,
    },
  });

  // ─── Auth Decorator ───────────────────────────────────────────────────────
  // Dipasang sebagai decorator agar bisa dipakai di semua routes dengan:
  // { preHandler: [app.authenticate] }
  app.decorate('authenticate', async function (request, reply) {
    try {
      // Otomatis baca dari cookie 'kriza_session' atau Authorization header
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sesi tidak valid atau sudah berakhir. Silakan login kembali.',
        },
      });
    }
  });

  // ─── Routes ───────────────────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    service: 'kriza-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }));

  // API v1
  app.register(async (apiRouter) => {
    // Auth routes (login, logout, me)
    apiRouter.register(require('./modules/auth/auth.routes'), { prefix: '/auth' });

    // Fase 2: Master Data routes (polyclinics, practitioners, schedules, procedures, drugs, icd10)
    apiRouter.register(require('./modules/masterdata/masterdata.routes'), { prefix: '/master' });

    // Fase 3: Manajemen Pasien & Wilayah
    apiRouter.register(require('./modules/patients/patients.routes'));

    // Fase 4: Registrasi Kunjungan & Antrian
    apiRouter.register(require('./modules/registrations/registrations.routes'));

    // Fase 5: Rekam Medis Elektronik (RME SOAP) & Sistem Rujukan
    apiRouter.register(require('./modules/encounters/encounters.routes'), { prefix: '/encounters' });
    apiRouter.register(require('./modules/encounters/referrals.routes'), { prefix: '/referrals' });

    // Fase 6: Farmasi, Resep Elektronik & Manajemen Stok
    apiRouter.register(require('./modules/pharmacy/pharmacy.routes'), { prefix: '/pharmacy' });

    // Fase 7: Kasir, Billing & Pembayaran
    apiRouter.register(require('./modules/billing/billing.routes'), { prefix: '/billing' });

    // Fase 8: Laporan Operasional
    apiRouter.register(require('./modules/reports/reports.routes'), { prefix: '/reports' });
  }, { prefix: '/api/v1' });

  // ─── Error Handler ────────────────────────────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    app.log.error({ err: error, url: request.url }, 'Unhandled error');

    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input tidak valid',
          details: error.validation,
        },
      });
    }

    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code || 'API_ERROR',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server',
      },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} tidak ditemukan`,
      },
    });
  });

  return app;
}

module.exports = buildApp;
