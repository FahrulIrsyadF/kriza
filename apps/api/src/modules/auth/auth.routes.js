const { login, logout, getMe } = require('./auth.service');
const { loginSchema } = require('./auth.schema');

/**
 * Auth routes — prefix /api/v1/auth
 * @param {import('fastify').FastifyInstance} app
 */
async function authRoutes(app) {
  // ─── POST /auth/login ────────────────────────────────────────────────────────
  app.post('/login', async (request, reply) => {
    // Validasi input dengan Zod
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input tidak valid',
          details: parsed.error.flatten().fieldErrors,
        },
      });
    }

    const { username, password } = parsed.data;
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'] ?? null;

    const { user, payload, expiresAt, expiresInSeconds } = await login({
      username,
      password,
      ipAddress,
      userAgent,
    });

    // Sign JWT dengan expire tepat tengah malam
    const token = app.jwt.sign(payload, { expiresIn: expiresInSeconds });

    // Set httpOnly cookie — browser attach otomatis, aman dari XSS
    reply.setCookie('kriza_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt, // Cookie juga expire tengah malam
    });

    return reply.send({
      success: true,
      data: {
        user,
        sessionExpiresAt: expiresAt.toISOString(),
        message: `Selamat datang, ${user.name}! Sesi aktif hingga tengah malam.`,
      },
    });
  });

  // ─── POST /auth/logout ───────────────────────────────────────────────────────
  app.post('/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'] ?? null;

    await logout({ userId, ipAddress, userAgent });

    // Hapus cookie
    reply.clearCookie('kriza_session', { path: '/' });

    return reply.send({
      success: true,
      data: { message: 'Logout berhasil' },
    });
  });

  // ─── GET /auth/me ────────────────────────────────────────────────────────────
  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;
    const user = await getMe(userId);

    return reply.send({
      success: true,
      data: { user },
    });
  });
}

module.exports = authRoutes;
