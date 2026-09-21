const service = require('./pharmacy.service');
const schemas = require('./pharmacy.schema');

/**
 * Pharmacy, E-Prescription & Inventory Fastify Routes
 * Prefix: /api/v1/pharmacy
 * 
 * @param {import('fastify').FastifyInstance} app
 */
async function pharmacyRoutes(app) {
  app.addHook('preHandler', app.authenticate);

  const getContext = (request) => ({
    userId: request.user?.sub || null,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] || null,
  });

  // ─── Dashboard Stats ─────────────────────────────────────────────────────────
  app.get('/stats', { preHandler: [app.authorize('pharmacy:read')] }, async (request, reply) => {
    const stats = await service.getDashboardStats();
    return reply.send({ success: true, data: stats });
  });

  // ─── Katalog Obat & Stok ─────────────────────────────────────────────────────
  app.get('/drugs', { preHandler: [app.authorize('pharmacy:read')] }, async (request, reply) => {
    const { search, dosageForm, category, criticalOnly, limit, page } = request.query;
    const l = limit ? parseInt(limit, 10) : 50;
    const p = page ? parseInt(page, 10) : 1;
    const offset = (p - 1) * l;

    const result = await service.getDrugs({
      search,
      dosageForm,
      category,
      criticalOnly: criticalOnly === 'true',
      limit: l,
      offset,
    });

    return reply.send({
      success: true,
      data: result.items,
      meta: {
        page: p,
        limit: l,
        total: result.total,
        totalPages: Math.ceil(result.total / l),
      },
    });
  });

  app.get('/drugs/expiring', { preHandler: [app.authorize('pharmacy:read')] }, async (request, reply) => {
    const { threshold } = request.query;
    const days = threshold ? parseInt(threshold, 10) : 90;
    const items = await service.getExpiringAlerts(days);
    return reply.send({ success: true, data: items });
  });

  app.get('/drugs/:id', { preHandler: [app.authorize('pharmacy:read')] }, async (request, reply) => {
    const drug = await service.getDrugDetail(request.params.id);
    return reply.send({ success: true, data: drug });
  });

  app.get('/drugs/:id/movements', { preHandler: [app.authorize('pharmacy:read')] }, async (request, reply) => {
    const movements = await service.getDrugStockMovements(request.params.id);
    return reply.send({ success: true, data: movements });
  });

  app.post('/drugs/batches', { preHandler: [app.authorize('pharmacy:stock')] }, async (request, reply) => {
    const body = schemas.receiveBatchSchema.parse(request.body);
    const batch = await service.receiveBatch(body, getContext(request));
    return reply.status(201).send({
      success: true,
      data: batch,
      message: 'Penerimaan batch obat berhasil dicatat',
    });
  });

  app.post('/drugs/adjustment', { preHandler: [app.authorize('pharmacy:stock')] }, async (request, reply) => {
    const body = schemas.stockAdjustmentSchema.parse(request.body);
    const result = await service.adjustStock(body, getContext(request));
    return reply.send({
      success: true,
      data: result,
      message: 'Penyesuaian stok berhasil disimpan',
    });
  });

  // ─── Resep Dokter & Dispensing ───────────────────────────────────────────────
  app.get('/prescriptions/queue', { preHandler: [app.authorize('pharmacy:read')] }, async (request, reply) => {
    const { status, date, limit, page } = request.query;
    const l = limit ? parseInt(limit, 10) : 50;
    const p = page ? parseInt(page, 10) : 1;
    const offset = (p - 1) * l;

    const items = await service.getPrescriptionsQueue({
      status,
      date,
      limit: l,
      offset,
    });

    return reply.send({ success: true, data: items });
  });

  app.get('/prescriptions/by-encounter/:encounterId', { preHandler: [app.authorize('pharmacy:read')] }, async (request, reply) => {
    const p = await service.getPrescriptionByEncounter(request.params.encounterId);
    return reply.send({ success: true, data: p });
  });

  app.get('/prescriptions/:id', { preHandler: [app.authorize('pharmacy:read')] }, async (request, reply) => {
    const p = await service.getPrescriptionDetail(request.params.id);
    return reply.send({ success: true, data: p });
  });

  app.post('/prescriptions', { preHandler: [app.authorize('pharmacy:write')] }, async (request, reply) => {
    const body = schemas.createPrescriptionSchema.parse(request.body);
    const created = await service.createPrescription(body, getContext(request));
    return reply.status(201).send({
      success: true,
      data: created,
      message: `Resep ${created.prescriptionNumber} berhasil dikirim ke Farmasi`,
    });
  });

  app.post('/prescriptions/:id/dispense', { preHandler: [app.authorize('pharmacy:dispense')] }, async (request, reply) => {
    const body = schemas.dispensePrescriptionSchema.parse(request.body || {});
    const dispensed = await service.dispensePrescription(request.params.id, body, getContext(request));
    return reply.send({
      success: true,
      data: dispensed,
      message: 'Obat berhasil diserahkan ke pasien dan stok telah dipotong secara otomatis (FEFO)',
    });
  });

  app.post('/prescriptions/:id/cancel', { preHandler: [app.authorize('pharmacy:dispense')] }, async (request, reply) => {
    const body = schemas.cancelPrescriptionSchema.parse(request.body);
    const cancelled = await service.cancelPrescription(request.params.id, body, getContext(request));
    return reply.send({
      success: true,
      data: cancelled,
      message: 'Resep berhasil dibatalkan',
    });
  });

  // ─── Pemantauan Shift Farmasi ────────────────────────────────────────────────
  app.get('/shifts/active', { preHandler: [app.authorize('pharmacy:read')] }, async (request, reply) => {
    const active = await service.getActiveShift();
    return reply.send({ success: true, data: active });
  });

  app.get('/shifts/history', { preHandler: [app.authorize('pharmacy:read')] }, async (request, reply) => {
    const { limit, page } = request.query;
    const l = limit ? parseInt(limit, 10) : 30;
    const p = page ? parseInt(page, 10) : 1;
    const offset = (p - 1) * l;

    const list = await service.getShiftHistory({ limit: l, offset });
    return reply.send({ success: true, data: list });
  });

  app.post('/shifts/open', { preHandler: [app.authorize('pharmacy:stock')] }, async (request, reply) => {
    const body = schemas.openShiftSchema.parse(request.body);
    const newShift = await service.openShift(body, getContext(request));
    return reply.status(201).send({
      success: true,
      data: newShift,
      message: `Shift ${newShift.shiftType} berhasil dibuka`,
    });
  });

  app.put('/shifts/:id/items', { preHandler: [app.authorize('pharmacy:stock')] }, async (request, reply) => {
    const body = schemas.updateShiftItemsSchema.parse(request.body);
    const result = await service.updateShiftItems(request.params.id, body, getContext(request));
    return reply.send(result);
  });

  app.post('/shifts/:id/close', { preHandler: [app.authorize('pharmacy:stock')] }, async (request, reply) => {
    const closed = await service.closeShift(request.params.id, getContext(request));
    return reply.send({
      success: true,
      data: closed,
      message: `Shift ${closed.shiftType} berhasil ditutup`,
    });
  });

  // ─── Stock Opname Periodik ───────────────────────────────────────────────────
  app.get('/stock-opnames', { preHandler: [app.authorize('pharmacy:read')] }, async (request, reply) => {
    const { limit, page } = request.query;
    const l = limit ? parseInt(limit, 10) : 20;
    const p = page ? parseInt(page, 10) : 1;
    const offset = (p - 1) * l;

    const list = await service.getStockOpnames({ limit: l, offset });
    return reply.send({ success: true, data: list });
  });

  app.get('/stock-opnames/:id', { preHandler: [app.authorize('pharmacy:read')] }, async (request, reply) => {
    const so = await service.getStockOpnameDetail(request.params.id);
    return reply.send({ success: true, data: so });
  });

  app.post('/stock-opnames', { preHandler: [app.authorize('pharmacy:stock')] }, async (request, reply) => {
    const body = schemas.createStockOpnameSchema.parse(request.body);
    const created = await service.createStockOpname(body, getContext(request));
    return reply.status(201).send({
      success: true,
      data: created,
      message: `Sesi Stock Opname ${created.period} berhasil dibuat`,
    });
  });

  app.put('/stock-opnames/:id/items', { preHandler: [app.authorize('pharmacy:stock')] }, async (request, reply) => {
    const body = schemas.updateStockOpnameItemsSchema.parse(request.body);
    const result = await service.updateStockOpnameItems(request.params.id, body, getContext(request));
    return reply.send(result);
  });

  app.post('/stock-opnames/:id/finalize', { preHandler: [app.authorize('pharmacy:stock')] }, async (request, reply) => {
    const finalized = await service.finalizeStockOpname(request.params.id, getContext(request));
    return reply.send({
      success: true,
      data: finalized,
      message: `Stock Opname berhasil difinalisasi dan penyesuaian stok telah diterapkan ke sistem`,
    });
  });
}

module.exports = pharmacyRoutes;
