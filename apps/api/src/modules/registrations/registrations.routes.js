const service = require('./registrations.service');
const schemas = require('./registrations.schema');

/**
 * Registrations & Queue routes — prefix /api/v1
 * @param {import('fastify').FastifyInstance} app
 */
async function registrationRoutes(app) {
  app.addHook('preHandler', app.authenticate);

  const getContext = (request) => ({
    userId: request.user?.sub || null,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] || null,
  });

  // ─── 1. List Registrations per Tanggal / Poli / Status ──────────────────────
  // GET /api/v1/registrations?date=2026-09-01&polyclinicId=...&status=MENUNGGU
  app.get('/registrations', { preHandler: [app.authorize('registrations:read')] }, async (request, reply) => {
    const query = schemas.listRegistrationQuerySchema.parse(request.query);
    const result = await service.listRegistrations(query);
    return reply.send({ success: true, data: result });
  });

  // ─── 2. Preview Nomor Registrasi Berikutnya ───────────────────────────────
  app.get('/registrations/next-number', { preHandler: [app.authorize('registrations:read')] }, async (request, reply) => {
    const { date } = request.query;
    const nextNumber = await service.getNextRegistrationNumber(date);
    return reply.send({ success: true, data: { nextRegistrationNumber: nextNumber } });
  });

  // ─── 3. Today's Active Queue per Poli ────────────────────────────────────
  // GET /api/v1/queues/today?polyclinicId=...&date=2026-09-01
  app.get('/queues/today', { preHandler: [app.authorize('registrations:read')] }, async (request, reply) => {
    const query = schemas.todayQueueQuerySchema.parse(request.query);
    const result = await service.getTodayQueues(query.polyclinicId, query.date);
    return reply.send({ success: true, data: result });
  });

  // ─── 4. Detail Registrasi by ID ──────────────────────────────────────────
  app.get('/registrations/:id', { preHandler: [app.authorize('registrations:read')] }, async (request, reply) => {
    const reg = await service.findRegistration(request.params.id);
    return reply.send({ success: true, data: reg });
  });

  // ─── 5. Daftarkan Kunjungan Baru (Loket / MJKN / Telepon) ────────────────
  app.post('/registrations', { preHandler: [app.authorize('registrations:write')] }, async (request, reply) => {
    const body = schemas.createRegistrationSchema.parse(request.body);
    const created = await service.createRegistration(body, getContext(request));
    return reply.status(201).send({
      success: true,
      data: created,
      message: `Pendaftaran berhasil. No. Registrasi: ${created.registrationNumber} | Antrian: ${created.queue?.queueNumber}`,
    });
  });

  // ─── 6. Update Data Registrasi (Penjamin, Keluhan, Catatan, dll) ─────────
  app.put('/registrations/:id', { preHandler: [app.authorize('registrations:write')] }, async (request, reply) => {
    const body = schemas.updateRegistrationSchema.parse(request.body);
    const updated = await service.updateRegistration(request.params.id, body, getContext(request));
    return reply.send({ success: true, data: updated, message: 'Data registrasi berhasil diperbarui' });
  });

  // ─── 7. Batalkan Registrasi ───────────────────────────────────────────────
  app.delete('/registrations/:id', { preHandler: [app.authorize('registrations:write')] }, async (request, reply) => {
    const body = schemas.cancelRegistrationSchema.parse(request.body || {});
    await service.cancelRegistration(request.params.id, body, getContext(request));
    return reply.send({ success: true, message: 'Registrasi berhasil dibatalkan' });
  });

  // ─── 8. Aksi Status Antrian (Panggil / Periksa / Selesai / Lewat) ────────
  // PUT /api/v1/registrations/:id/queue-action
  app.put('/registrations/:id/queue-action', { preHandler: [app.authorize('registrations:manage', 'registrations:write')] }, async (request, reply) => {
    const body = schemas.updateQueueStatusSchema.parse(request.body);
    const result = await service.updateQueueAction(request.params.id, body, getContext(request));
    return reply.send({ success: true, data: result, message: result.message });
  });

  // ─── 9. MJKN Webhook Endpoint (Placeholder — aktifkan saat bridging) ─────
  // POST /api/v1/registrations/mjkn-webhook
  // Endpoint ini akan menerima notifikasi booking dari aplikasi Mobile JKN BPJS
  app.post('/registrations/mjkn-webhook', async (request, reply) => {
    // TODO: Aktifkan saat bridging MJKN/P-Care BPJS siap
    // Verifikasi token MJKN dari header Authorization terlebih dahulu
    // const mjknToken = request.headers['x-mjkn-token'];
    // if (mjknToken !== env.MJKN_WEBHOOK_TOKEN) { return reply.status(401).send(...); }
    try {
      const result = await service.processMjknBooking(request.body, getContext(request));
      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      // Bridging belum aktif — kembalikan 501 Not Implemented
      return reply.status(501).send({
        success: false,
        error: { code: 'MJKN_NOT_IMPLEMENTED', message: err.message },
      });
    }
  });
}

module.exports = registrationRoutes;
