const service = require('./encounters.service');
const schemas = require('./encounters.schema');

/**
 * Encounters (Rekam Medis Elektronik / SOAP) Fastify routes
 * Prefix: /api/v1/encounters
 * 
 * @param {import('fastify').FastifyInstance} app
 */
async function encounterRoutes(app) {
  app.addHook('preHandler', app.authenticate);

  const getContext = (request) => ({
    userId: request.user?.sub || null,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] || null,
  });

  // ─── 1. Antrian Pasien Khusus Dokter Hari Ini ──────────────────────────────
  // GET /api/v1/encounters/queue?polyclinicId=...&practitionerId=...&date=...
  app.get('/queue', async (request, reply) => {
    const { polyclinicId, practitionerId, date } = request.query;
    const items = await service.getDoctorQueue({ polyclinicId, practitionerId, date });
    return reply.send({ success: true, data: items });
  });

  // ─── 2. Cek Encounter Berdasarkan ID Registrasi ────────────────────────────
  // GET /api/v1/encounters/by-registration/:registrationId
  app.get('/by-registration/:registrationId', async (request, reply) => {
    const enc = await service.getEncounterByRegistration(request.params.registrationId);
    return reply.send({ success: true, data: enc });
  });

  // ─── 3. Detail Encounter Lengkap By ID ─────────────────────────────────────
  // GET /api/v1/encounters/:id
  app.get('/:id', async (request, reply) => {
    const enc = await service.getEncounter(request.params.id);
    return reply.send({ success: true, data: enc });
  });

  // ─── 4. Mulai Encounter Baru (Dokter klik "Mulai Periksa") ─────────────────
  // POST /api/v1/encounters
  app.post('/', async (request, reply) => {
    const body = schemas.startEncounterSchema.parse(request.body);
    const enc = await service.startEncounter(body, getContext(request));
    return reply.status(201).send({
      success: true,
      data: enc,
      message: 'Pemeriksaan pasien dimulai',
    });
  });

  // ─── 5. Simpan / Update TTV & Antropometri ─────────────────────────────────
  // PUT /api/v1/encounters/:id/vital-signs
  app.put('/:id/vital-signs', async (request, reply) => {
    const body = schemas.updateVitalSignsSchema.parse(request.body);
    const saved = await service.saveVitalSigns(request.params.id, body, getContext(request));
    return reply.send({
      success: true,
      data: saved,
      message: 'Tanda-tanda vital & status gizi berhasil disimpan',
    });
  });

  // ─── 6. Simpan / Update Catatan SOAP ───────────────────────────────────────
  // PUT /api/v1/encounters/:id/soap
  app.put('/:id/soap', async (request, reply) => {
    const body = schemas.updateSoapSchema.parse(request.body);
    const saved = await service.saveSoapNotes(request.params.id, body, getContext(request));
    return reply.send({
      success: true,
      data: saved,
      message: 'Catatan SOAP berhasil disimpan',
    });
  });

  // ─── 7. Tambah Diagnosa ICD-10 ─────────────────────────────────────────────
  // POST /api/v1/encounters/:id/diagnoses
  app.post('/:id/diagnoses', async (request, reply) => {
    const body = schemas.addDiagnosisSchema.parse(request.body);
    const created = await service.addDiagnosis(request.params.id, body, getContext(request));
    return reply.status(201).send({
      success: true,
      data: created,
      message: `Diagnosa ${created.icd10Code} - ${created.icd10Name} berhasil ditambahkan`,
    });
  });

  // ─── 8. Hapus Diagnosa ICD-10 ──────────────────────────────────────────────
  // DELETE /api/v1/encounters/:id/diagnoses/:diagnosisId
  app.delete('/:id/diagnoses/:diagnosisId', async (request, reply) => {
    await service.removeDiagnosis(request.params.id, request.params.diagnosisId, getContext(request));
    return reply.send({
      success: true,
      message: 'Diagnosa berhasil dihapus',
    });
  });

  // ─── 9. Tambah Tindakan Medis ──────────────────────────────────────────────
  // POST /api/v1/encounters/:id/procedures
  app.post('/:id/procedures', async (request, reply) => {
    const body = schemas.addProcedureSchema.parse(request.body);
    const created = await service.addProcedure(request.params.id, body, getContext(request));
    return reply.status(201).send({
      success: true,
      data: created,
      message: `Tindakan ${created.procedureName} berhasil ditambahkan`,
    });
  });

  // ─── 10. Hapus Tindakan Medis ──────────────────────────────────────────────
  // DELETE /api/v1/encounters/:id/procedures/:procedureId
  app.delete('/:id/procedures/:procedureId', async (request, reply) => {
    await service.removeProcedure(request.params.id, request.params.procedureId, getContext(request));
    return reply.send({
      success: true,
      message: 'Tindakan berhasil dihapus',
    });
  });

  // ─── 11. Simpan Status Pulang / Disposisi & Rujukan ─────────────────────────
  // PUT /api/v1/encounters/:id/disposition
  app.put('/:id/disposition', async (request, reply) => {
    const body = schemas.saveDispositionSchema.parse(request.body);
    const result = await service.saveDisposition(request.params.id, body, getContext(request));
    return reply.send({
      success: true,
      data: result,
      message: 'Status tindak lanjut dan data rujukan berhasil disimpan',
    });
  });

  // ─── 12. Finalisasi & Kunci Rekam Medis (SELESAI) ───────────────────────────
  // POST /api/v1/encounters/:id/finalize
  app.post('/:id/finalize', async (request, reply) => {
    const body = schemas.finalizeEncounterSchema.parse(request.body || {});
    const finalized = await service.finalizeEncounter(request.params.id, body, getContext(request));
    return reply.send({
      success: true,
      data: finalized,
      message: 'Rekam medis berhasil difinalisasi dan dikunci sesuai regulasi',
    });
  });

  // ─── 13. Amandemen Rekam Medis Terkunci ─────────────────────────────────────
  // POST /api/v1/encounters/:id/amend
  app.post('/:id/amend', async (request, reply) => {
    const body = schemas.amendEncounterSchema.parse(request.body);
    const amended = await service.amendEncounter(request.params.id, body, getContext(request));
    return reply.status(201).send({
      success: true,
      data: amended,
      message: 'Amandemen rekam medis berhasil dibuat',
    });
  });

  // ─── 14. Preview Payload Bridging BPJS PCare ──────────────────────────────
  // GET /api/v1/encounters/:id/pcare-preview
  app.get('/:id/pcare-preview', async (request, reply) => {
    const enc = await service.getEncounter(request.params.id);
    const payload = service.buildPCareEncounterPayload(enc);
    return reply.send({ success: true, data: payload });
  });
}

module.exports = encounterRoutes;
