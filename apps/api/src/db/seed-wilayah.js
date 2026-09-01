/**
 * Script untuk memasukkan data wilayah (Provinsi, Kabupaten, Kecamatan, Kelurahan)
 * yang diambil dari db_rizani.
 * 
 * Jalankan dengan: node src/db/seed-wilayah.js
 */

require('../config/env');
const fs = require('fs');
const path = require('path');
const { db, pool } = require('./index');
const { provinsi, kabupaten, kecamatan, kelurahan } = require('./schema');

async function seedWilayah() {
  console.log('🌏 Memulai import data wilayah dari db_rizani...');

  const wilayahDir = path.join(__dirname, 'seeds/wilayah');

  const provData = JSON.parse(fs.readFileSync(path.join(wilayahDir, 'provinsi.json'), 'utf8'));
  const kabData = JSON.parse(fs.readFileSync(path.join(wilayahDir, 'kabupaten.json'), 'utf8'));
  const kecData = JSON.parse(fs.readFileSync(path.join(wilayahDir, 'kecamatan.json'), 'utf8'));
  const kelData = JSON.parse(fs.readFileSync(path.join(wilayahDir, 'kelurahan.json'), 'utf8'));

  // 1. Provinsi
  console.log(`   → Mengimport ${provData.length} provinsi...`);
  // Chunking 500 per batch
  for (let i = 0; i < provData.length; i += 500) {
    const chunk = provData.slice(i, i + 500);
    await db.insert(provinsi).values(chunk).onConflictDoNothing();
  }
  console.log('     ✓ Provinsi selesai');

  // 2. Kabupaten
  console.log(`   → Mengimport ${kabData.length} kabupaten...`);
  for (let i = 0; i < kabData.length; i += 500) {
    const chunk = kabData.slice(i, i + 500).map((k) => ({
      id: k.id,
      provinsiId: k.provinsiId,
      name: k.name,
      isCity: k.isCity || 0,
    }));
    await db.insert(kabupaten).values(chunk).onConflictDoNothing();
  }
  console.log('     ✓ Kabupaten selesai');

  // 3. Kecamatan
  console.log(`   → Mengimport ${kecData.length} kecamatan...`);
  for (let i = 0; i < kecData.length; i += 500) {
    const chunk = kecData.slice(i, i + 500).map((k) => ({
      id: k.id,
      kabupatenId: k.kabupatenId,
      name: k.name,
    }));
    await db.insert(kecamatan).values(chunk).onConflictDoNothing();
  }
  console.log('     ✓ Kecamatan selesai');

  // 4. Kelurahan
  console.log(`   → Mengimport ${kelData.length} kelurahan...`);
  for (let i = 0; i < kelData.length; i += 500) {
    const chunk = kelData.slice(i, i + 500).map((k) => ({
      id: k.id,
      kecamatanId: k.kecamatanId,
      name: k.name,
    }));
    await db.insert(kelurahan).values(chunk).onConflictDoNothing();
  }
  console.log('     ✓ Kelurahan selesai');

  console.log('✅ Import seluruh data wilayah selesai!');
}

if (require.main === module) {
  seedWilayah()
    .catch((err) => {
      console.error('❌ Gagal import wilayah:', err);
      process.exit(1);
    })
    .finally(() => pool.end());
}

module.exports = { seedWilayah };
