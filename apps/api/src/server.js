const env = require('./config/env');
const { testConnection } = require('./db');
const buildApp = require('./app');

async function start() {
  // Test koneksi database sebelum server start
  await testConnection();

  const app = buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
