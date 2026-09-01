const service = require('./encounters.service');
const schemas = require('./encounters.schema');

/**
 * Referrals (Sistem Rujukan Internal & Eksternal) Fastify routes
 * Prefix: /api/v1/referrals
 * 
 * @param {import('fastify').FastifyInstance} app
 */
async function referralRoutes(app) {
  app.addHook('preHandler', app.authenticate);

  // ─── 1. List Rujukan (Filter Tanggal, Tipe, Search) ──────────────────────────
  // GET /api/v1/referrals?date=...&referralType=INTERNAL|EXTERNAL&search=...
  app.get('/', async (request, reply) => {
    const query = schemas.listReferralQuerySchema.parse(request.query);
    const result = await service.listReferrals(query);
    return reply.send({ success: true, data: result });
  });

  // ─── 2. Data Lengkap Cetak Surat Rujukan Medis Resmi ─────────────────────────
  // GET /api/v1/referrals/:id/print
  app.get('/:id/print', async (request, reply) => {
    const data = await service.getReferralForPrint(request.params.id);
    return reply.send({ success: true, data });
  });
}

module.exports = referralRoutes;
