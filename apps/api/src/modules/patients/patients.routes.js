const service = require('./patients.service');
const schemas = require('./patients.schema');

/**
 * Patients & Wilayah routes — prefix /api/v1
 * @param {import('fastify').FastifyInstance} app
 */
async function patientRoutes(app) {
  // Semua endpoint membutuhkan otentikasi login
  app.addHook('preHandler', app.authenticate);

  const getContext = (request) => ({
    userId: request.user?.sub || null,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] || null,
  });

  // ─── 1. Patients Management ─────────────────────────────────────────────────

  // List pasien (search, filter, pagination)
  app.get('/patients', async (request, reply) => {
    const query = schemas.patientListQuerySchema.parse(request.query);
    const result = await service.listPatients(query);
    return reply.send({ success: true, data: result });
  });

  // Preview next Medrec (Nomor RM)
  app.get('/patients/next-mrn', async (request, reply) => {
    const result = await service.getNextMRN();
    return reply.send({ success: true, data: result });
  });

  // Detail pasien by ID
  app.get('/patients/:id', async (request, reply) => {
    const item = await service.findPatient(request.params.id);
    return reply.send({ success: true, data: item });
  });

  // Registrasi pasien baru
  app.post('/patients', async (request, reply) => {
    const body = schemas.createPatientSchema.parse(request.body);
    const created = await service.registerPatient(body, getContext(request));
    return reply.status(201).send({
      success: true,
      data: created,
      message: `Pasien ${created.name} berhasil didaftarkan (No. RM: ${created.medicalRecordNumber})`,
    });
  });

  // Update data pasien
  app.put('/patients/:id', async (request, reply) => {
    const body = schemas.updatePatientSchema.parse(request.body);
    const updated = await service.editPatient(request.params.id, body, getContext(request));
    return reply.send({
      success: true,
      data: updated,
      message: 'Data pasien berhasil diperbarui',
    });
  });

  // Soft delete pasien
  app.delete('/patients/:id', async (request, reply) => {
    await service.removePatient(request.params.id, getContext(request));
    return reply.send({
      success: true,
      message: 'Data pasien berhasil dinonaktifkan',
    });
  });

  // ─── 2. Wilayah Hierarchy (Cascade Dropdowns) ──────────────────────────────

  app.get('/wilayah/provinsi', async (request, reply) => {
    const items = await service.getProvinsi();
    return reply.send({ success: true, data: items });
  });

  app.get('/wilayah/kabupaten/:provinsiId', async (request, reply) => {
    const items = await service.getKabupaten(request.params.provinsiId);
    return reply.send({ success: true, data: items });
  });

  app.get('/wilayah/kecamatan/:kabupatenId', async (request, reply) => {
    const items = await service.getKecamatan(request.params.kabupatenId);
    return reply.send({ success: true, data: items });
  });

  app.get('/wilayah/kelurahan/:kecamatanId', async (request, reply) => {
    const items = await service.getKelurahan(request.params.kecamatanId);
    return reply.send({ success: true, data: items });
  });
}

module.exports = patientRoutes;
