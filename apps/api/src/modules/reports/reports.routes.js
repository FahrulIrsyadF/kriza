const service = require('./reports.service');
const schemas = require('./reports.schema');

/**
 * Fastify Routes untuk Laporan Operasional KRIZA (Fase 8)
 * Prefix: /api/v1/reports
 * 
 * @param {import('fastify').FastifyInstance} app
 */
async function reportsRoutes(app) {
  // Semua rute laporan wajib autentikasi dan izin reports:read
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.authorize('reports:read'));

  // 1. Overview Executive KPIs
  app.get('/overview', async (request, reply) => {
    const parsed = schemas.reportsFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      });
    }

    const data = await service.getOverviewStats(parsed.data);
    return reply.send({ success: true, data });
  });

  // 2. Laporan Kunjungan Pasien
  app.get('/visits', async (request, reply) => {
    const parsed = schemas.reportsFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      });
    }

    const { page, limit, ...filters } = parsed.data;
    const offset = (page - 1) * limit;

    const data = await service.getVisitsReport({
      ...filters,
      limit,
      offset,
    });

    return reply.send({
      success: true,
      data,
      meta: {
        page,
        limit,
        total: data.summary.total,
        totalPages: Math.ceil(data.summary.total / limit),
      },
    });
  });

  // 3. Laporan Pendapatan & Kasir
  app.get('/revenue', async (request, reply) => {
    const parsed = schemas.reportsFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      });
    }

    const { page, limit, ...filters } = parsed.data;
    const offset = (page - 1) * limit;

    const data = await service.getRevenueReport({
      ...filters,
      limit,
      offset,
    });

    return reply.send({
      success: true,
      data,
      meta: {
        page,
        limit,
        total: data.summary.transactionCount,
        totalPages: Math.ceil(data.summary.transactionCount / limit),
      },
    });
  });

  // 4. Laporan 10 & 20 Besar Morbiditas (ICD-10)
  app.get('/morbidity', async (request, reply) => {
    const parsed = schemas.morbidityQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      });
    }

    const data = await service.getMorbidityReport(parsed.data);
    return reply.send({ success: true, data });
  });

  // 5. Laporan Farmasi & Pemakaian Obat
  app.get('/pharmacy', async (request, reply) => {
    const parsed = schemas.pharmacyReportQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      });
    }

    const data = await service.getPharmacyReport(parsed.data);
    return reply.send({ success: true, data });
  });

  // 6. Laporan Rekonsiliasi Pelayanan BPJS
  app.get('/bpjs', async (request, reply) => {
    const parsed = schemas.reportsFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      });
    }

    const { page, limit, ...filters } = parsed.data;
    const offset = (page - 1) * limit;

    const data = await service.getBpjsSummaryReport({
      ...filters,
      limit,
      offset,
    });

    return reply.send({
      success: true,
      data,
      meta: {
        page,
        limit,
        total: data.summary.totalBpjsVisits,
        totalPages: Math.ceil(data.summary.totalBpjsVisits / limit),
      },
    });
  });
}

module.exports = reportsRoutes;
