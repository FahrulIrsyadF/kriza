const service = require('./billing.service');
const schemas = require('./billing.schema');

/**
 * Billing & Cashier Fastify Routes
 * Prefix: /api/v1/billing
 * 
 * @param {import('fastify').FastifyInstance} app
 */
async function billingRoutes(app) {
  app.addHook('preHandler', app.authenticate);

  const getContext = (request) => ({
    userId: request.user?.sub || null,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] || null,
  });

  // ─── Dashboard Stats ─────────────────────────────────────────────────────────
  app.get('/stats', async (request, reply) => {
    const { date } = request.query;
    const stats = await service.getDashboardStats({ date });
    return reply.send({ success: true, data: stats });
  });

  // ─── Invoices ────────────────────────────────────────────────────────────────
  app.get('/invoices', async (request, reply) => {
    const parsedQuery = schemas.queryInvoicesSchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parsedQuery.error.flatten() },
      });
    }

    const { page, limit, ...filters } = parsedQuery.data;
    const offset = (page - 1) * limit;

    const result = await service.getInvoices({
      ...filters,
      limit,
      offset,
    });

    return reply.send({
      success: true,
      data: result.items,
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  });

  app.get('/invoices/:id', async (request, reply) => {
    const { id } = request.params;
    const invoice = await service.getInvoiceById(id);
    return reply.send({ success: true, data: invoice });
  });

  // Sync / Generate invoice from registration/encounter
  app.post('/invoices/sync/:registrationId', async (request, reply) => {
    const { registrationId } = request.params;
    const context = getContext(request);
    const invoice = await service.generateOrSyncInvoice(registrationId, context);
    return reply.status(200).send({
      success: true,
      message: 'Tagihan berhasil disinkronkan dari layanan poli dan farmasi',
      data: invoice,
    });
  });

  // Create manual invoice
  app.post('/invoices', async (request, reply) => {
    const parsedBody = schemas.createInvoiceSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parsedBody.error.flatten() },
      });
    }

    const context = getContext(request);
    const created = await service.createInvoice(parsedBody.data, context);
    return reply.status(201).send({
      success: true,
      message: 'Invoice tagihan berhasil dibuat',
      data: created,
    });
  });

  // Update invoice
  app.put('/invoices/:id', async (request, reply) => {
    const { id } = request.params;
    const parsedBody = schemas.updateInvoiceSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parsedBody.error.flatten() },
      });
    }

    const context = getContext(request);
    const updated = await service.updateInvoice(id, parsedBody.data, context);
    return reply.send({
      success: true,
      message: 'Invoice tagihan berhasil diperbarui',
      data: updated,
    });
  });

  // ─── Payments ────────────────────────────────────────────────────────────────
  app.post('/payments', async (request, reply) => {
    const parsedBody = schemas.createPaymentSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parsedBody.error.flatten() },
      });
    }

    const context = getContext(request);
    const receipt = await service.processPayment(parsedBody.data, context);
    return reply.status(201).send({
      success: true,
      message: 'Pembayaran berhasil diproses dan kuitansi diterbitkan',
      data: receipt,
    });
  });

  app.get('/payments', async (request, reply) => {
    const parsedQuery = schemas.queryPaymentsSchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parsedQuery.error.flatten() },
      });
    }

    const { page, limit, ...filters } = parsedQuery.data;
    const offset = (page - 1) * limit;

    const result = await service.getPayments({
      ...filters,
      limit,
      offset,
    });

    return reply.send({
      success: true,
      data: result.items,
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  });

  app.get('/payments/:id', async (request, reply) => {
    const { id } = request.params;
    const payment = await service.getPaymentById(id);
    return reply.send({ success: true, data: payment });
  });
}

module.exports = billingRoutes;
