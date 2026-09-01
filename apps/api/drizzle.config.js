const { defineConfig } = require('drizzle-kit');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

module.exports = defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.js',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
