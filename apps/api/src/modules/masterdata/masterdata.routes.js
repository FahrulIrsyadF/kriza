const service = require('./masterdata.service');
const schemas = require('./masterdata.schema');

/**
 * Master Data routes — prefix /api/v1/master
 * @param {import('fastify').FastifyInstance} app
 */
async function masterDataRoutes(app) {
  // Semua master data routes memerlukan user login dan hak akses masterdata
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', async (request, reply) => {
    if (request.method === 'GET') {
      await app.authorize('masterdata:read')(request, reply);
    } else {
      await app.authorize('masterdata:write')(request, reply);
    }
  });

  // Helper context logger
  const getContext = (request) => ({
    userId: request.user?.sub || null,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] || null,
  });

  // ─── 1. Polyclinics ─────────────────────────────────────────────────────────

  app.get('/polyclinics', async (request, reply) => {
    const query = schemas.listQuerySchema.parse(request.query);
    const result = await service.listPolyclinics(query);
    return reply.send({ success: true, data: result });
  });

  app.get('/polyclinics/:id', async (request, reply) => {
    const item = await service.findPolyclinic(request.params.id);
    return reply.send({ success: true, data: item });
  });

  app.post('/polyclinics', async (request, reply) => {
    const body = schemas.createPolyclinicSchema.parse(request.body);
    const created = await service.addPolyclinic(body, getContext(request));
    return reply.status(201).send({ success: true, data: created, message: 'Poliklinik berhasil ditambahkan' });
  });

  app.put('/polyclinics/:id', async (request, reply) => {
    const body = schemas.updatePolyclinicSchema.parse(request.body);
    const updated = await service.editPolyclinic(request.params.id, body, getContext(request));
    return reply.send({ success: true, data: updated, message: 'Poliklinik berhasil diubah' });
  });

  app.delete('/polyclinics/:id', async (request, reply) => {
    await service.removePolyclinic(request.params.id, getContext(request));
    return reply.send({ success: true, message: 'Poliklinik berhasil dinonaktifkan' });
  });

  // ─── 2. Practitioners ──────────────────────────────────────────────────────

  app.get('/practitioners', async (request, reply) => {
    const query = schemas.listQuerySchema.parse(request.query);
    const result = await service.listPractitioners(query);
    return reply.send({ success: true, data: result });
  });

  app.get('/practitioners/:id', async (request, reply) => {
    const item = await service.findPractitioner(request.params.id);
    return reply.send({ success: true, data: item });
  });

  app.post('/practitioners', async (request, reply) => {
    const body = schemas.createPractitionerSchema.parse(request.body);
    const created = await service.addPractitioner(body, getContext(request));
    return reply.status(201).send({ success: true, data: created, message: 'Tenaga medis berhasil ditambahkan' });
  });

  app.put('/practitioners/:id', async (request, reply) => {
    const body = schemas.updatePractitionerSchema.parse(request.body);
    const updated = await service.editPractitioner(request.params.id, body, getContext(request));
    return reply.send({ success: true, data: updated, message: 'Tenaga medis berhasil diubah' });
  });

  app.delete('/practitioners/:id', async (request, reply) => {
    await service.removePractitioner(request.params.id, getContext(request));
    return reply.send({ success: true, message: 'Tenaga medis berhasil dinonaktifkan' });
  });

  // ─── 3. Schedules ──────────────────────────────────────────────────────────

  app.get('/schedules', async (request, reply) => {
    const items = await service.listSchedules(request.query);
    return reply.send({ success: true, data: items });
  });

  app.post('/schedules', async (request, reply) => {
    const body = schemas.createScheduleSchema.parse(request.body);
    const created = await service.addSchedule(body, getContext(request));
    return reply.status(201).send({ success: true, data: created, message: 'Jadwal praktik berhasil ditambahkan' });
  });

  app.put('/schedules/:id', async (request, reply) => {
    const body = schemas.updateScheduleSchema.parse(request.body);
    const updated = await service.editSchedule(request.params.id, body, getContext(request));
    return reply.send({ success: true, data: updated, message: 'Jadwal praktik berhasil diubah' });
  });

  app.delete('/schedules/:id', async (request, reply) => {
    await service.removeSchedule(request.params.id, getContext(request));
    return reply.send({ success: true, message: 'Jadwal praktik berhasil dihapus' });
  });

  // ─── 4. Procedures & Service Rates ─────────────────────────────────────────

  app.get('/procedures', async (request, reply) => {
    const query = schemas.listQuerySchema.parse(request.query);
    const result = await service.listProcedures(query);
    return reply.send({ success: true, data: result });
  });

  app.get('/procedures/:id', async (request, reply) => {
    const item = await service.findProcedure(request.params.id);
    return reply.send({ success: true, data: item });
  });

  app.post('/procedures', async (request, reply) => {
    const body = schemas.createProcedureSchema.parse(request.body);
    const created = await service.addProcedure(body, getContext(request));
    return reply.status(201).send({ success: true, data: created, message: 'Tindakan berhasil ditambahkan' });
  });

  app.put('/procedures/:id', async (request, reply) => {
    const body = schemas.updateProcedureSchema.parse(request.body);
    const updated = await service.editProcedure(request.params.id, body, getContext(request));
    return reply.send({ success: true, data: updated, message: 'Tindakan berhasil diubah' });
  });

  app.delete('/procedures/:id', async (request, reply) => {
    await service.removeProcedure(request.params.id, getContext(request));
    return reply.send({ success: true, message: 'Tindakan berhasil dinonaktifkan' });
  });

  // ─── 5. Lab Procedures ─────────────────────────────────────────────────────

  app.get('/lab-procedures', async (request, reply) => {
    const query = schemas.labListQuerySchema.parse(request.query);
    const result = await service.listLabProcedures(query);
    return reply.send({ success: true, data: result });
  });

  app.get('/lab-procedures/:id', async (request, reply) => {
    const item = await service.findLabProcedure(request.params.id);
    return reply.send({ success: true, data: item });
  });

  app.post('/lab-procedures', async (request, reply) => {
    const body = schemas.createLabProcedureSchema.parse(request.body);
    const created = await service.addLabProcedure(body, getContext(request));
    return reply.status(201).send({ success: true, data: created, message: 'Pemeriksaan lab berhasil ditambahkan' });
  });

  app.put('/lab-procedures/:id', async (request, reply) => {
    const body = schemas.updateLabProcedureSchema.parse(request.body);
    const updated = await service.editLabProcedure(request.params.id, body, getContext(request));
    return reply.send({ success: true, data: updated, message: 'Pemeriksaan lab berhasil diubah' });
  });

  app.delete('/lab-procedures/:id', async (request, reply) => {
    await service.removeLabProcedure(request.params.id, getContext(request));
    return reply.send({ success: true, message: 'Pemeriksaan lab berhasil dinonaktifkan' });
  });

  // ─── 6. Meta References: Rate Types & Drug Units ───────────────────────────

  app.get('/rate-types', async (request, reply) => {
    const items = await service.listRateTypes();
    return reply.send({ success: true, data: items });
  });

  app.get('/drug-units', async (request, reply) => {
    const items = await service.listDrugUnits();
    return reply.send({ success: true, data: items });
  });

  // ─── 6. Drugs Catalog ──────────────────────────────────────────────────────

  app.get('/drugs', async (request, reply) => {
    const query = schemas.listQuerySchema.parse(request.query);
    const result = await service.listDrugs(query);
    return reply.send({ success: true, data: result });
  });

  app.get('/drugs/:id', async (request, reply) => {
    const item = await service.findDrug(request.params.id);
    return reply.send({ success: true, data: item });
  });

  app.post('/drugs', async (request, reply) => {
    const body = schemas.createDrugSchema.parse(request.body);
    const created = await service.addDrug(body, getContext(request));
    return reply.status(201).send({ success: true, data: created, message: 'Obat berhasil ditambahkan' });
  });

  app.put('/drugs/:id', async (request, reply) => {
    const body = schemas.updateDrugSchema.parse(request.body);
    const updated = await service.editDrug(request.params.id, body, getContext(request));
    return reply.send({ success: true, data: updated, message: 'Obat berhasil diubah' });
  });

  app.delete('/drugs/:id', async (request, reply) => {
    await service.removeDrug(request.params.id, getContext(request));
    return reply.send({ success: true, message: 'Obat berhasil dinonaktifkan' });
  });

  // ─── 7. ICD-10 Search ──────────────────────────────────────────────────────

  app.get('/icd10', async (request, reply) => {
    const { q, limit } = request.query;
    const items = await service.searchIcd10({ query: q, limit: limit ? Number(limit) : 20 });
    return reply.send({ success: true, data: items });
  });
}

module.exports = masterDataRoutes;
