/**
 * Script Pembersihan & Penggabungan Data Wilayah Duplikat (Hierarchical Merge & Deduplication)
 * 
 * Mengapa ini solusi terbaik dibanding sekadar 'SELECT DISTINCT'?
 * Jika hanya DISTINCT di UI/query:
 * - Bila user memilih 'JAWA TIMUR' (id 38), dropdown Kabupaten akan kosong (karena kabupatennya ada di id 12).
 * - Bila memilih 'KALIMANTAN TIMUR' (id 35), kabupaten yang muncul hanya 7 (terpisah dari id 19).
 * 
 * Solusi:
 * 1. Remap FK anak (kabupaten -> provinsi, kecamatan -> kabupaten, kelurahan -> kecamatan, patients -> all)
 *    ke ID kanonikal (ID utama yang menampung data terbanyak/terendah).
 * 2. Hapus entri duplikat yang sudah dimerge.
 * 3. Hapus entri sampah seperti '-' atau nama kosong.
 */

require('../config/env');
const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function cleanWilayahDuplicates() {
  console.log('🧹 Memulai Pembersihan & Penggabungan Data Wilayah Duplikat...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ─── 1. HAPUS WILAYAH SAMPAH (id 0 / name '-') ─────────────────────────────
    console.log('1️⃣ Membersihkan entry kosong ("-")...');
    await client.query(`
      UPDATE patients SET kelurahan_id = NULL WHERE kelurahan_id = 0;
      UPDATE patients SET kecamatan_id = NULL WHERE kecamatan_id = 0;
      UPDATE patients SET kabupaten_id = NULL WHERE kabupaten_id = 0;
      UPDATE patients SET provinsi_id = NULL WHERE provinsi_id = 0;

      DELETE FROM kelurahan WHERE id = 0 OR TRIM(name) = '-' OR TRIM(name) = '';
      DELETE FROM kecamatan WHERE id = 0 OR TRIM(name) = '-' OR TRIM(name) = '';
      DELETE FROM kabupaten WHERE id = 0 OR TRIM(name) = '-' OR TRIM(name) = '';
      DELETE FROM provinsi WHERE id = 0 OR TRIM(name) = '-' OR TRIM(name) = '';
    `);

    // Hapus alias singkatan provinsi yang tidak baku jika ada nama resminya
    await client.query(`
      -- Remap SUMUT (id 2) ke SUMATERA UTARA (id 1)
      UPDATE kabupaten SET provinsi_id = 1 WHERE provinsi_id = 2;
      UPDATE patients SET provinsi_id = 1 WHERE provinsi_id = 2;
      DELETE FROM provinsi WHERE id = 2;

      -- Remap YOGYAKARTA (id 27, 32) ke DI YOGYAKARTA (id 11)
      UPDATE kabupaten SET provinsi_id = 11 WHERE provinsi_id IN (27, 32);
      UPDATE patients SET provinsi_id = 11 WHERE provinsi_id IN (27, 32);
      DELETE FROM provinsi WHERE id IN (27, 32);
    `);

    // ─── 2. DEDUPLIKASI PROVINSI ───────────────────────────────────────────────
    console.log('2️⃣ Menggabungkan & menghapus duplikat Provinsi...');
    const provDupes = await client.query(`
      SELECT UPPER(TRIM(name)) as name, array_agg(id ORDER BY id) as ids
      FROM provinsi
      GROUP BY UPPER(TRIM(name))
      HAVING count(*) > 1;
    `);

    for (const row of provDupes.rows) {
      const canonicalId = row.ids[0]; // ID terkecil sebagai ID utama
      const duplicateIds = row.ids.slice(1);

      console.log(`   → Merging Provinsi "${row.name}": ${duplicateIds.join(', ')} => ${canonicalId}`);

      // Remap kabupaten & patients
      await client.query(
        `UPDATE kabupaten SET provinsi_id = $1 WHERE provinsi_id = ANY($2)`,
        [canonicalId, duplicateIds]
      );
      await client.query(
        `UPDATE patients SET provinsi_id = $1 WHERE provinsi_id = ANY($2)`,
        [canonicalId, duplicateIds]
      );

      // Hapus duplikat
      await client.query(
        `DELETE FROM provinsi WHERE id = ANY($1)`,
        [duplicateIds]
      );
    }

    // ─── 3. DEDUPLIKASI KABUPATEN ──────────────────────────────────────────────
    console.log('3️⃣ Menggabungkan & menghapus duplikat Kabupaten per Provinsi...');
    const kabDupes = await client.query(`
      SELECT provinsi_id, UPPER(TRIM(name)) as name, array_agg(id ORDER BY id) as ids
      FROM kabupaten
      GROUP BY provinsi_id, UPPER(TRIM(name))
      HAVING count(*) > 1;
    `);

    for (const row of kabDupes.rows) {
      const canonicalId = row.ids[0];
      const duplicateIds = row.ids.slice(1);

      console.log(`   → Merging Kabupaten "${row.name}": ${duplicateIds.join(', ')} => ${canonicalId}`);

      await client.query(
        `UPDATE kecamatan SET kabupaten_id = $1 WHERE kabupaten_id = ANY($2)`,
        [canonicalId, duplicateIds]
      );
      await client.query(
        `UPDATE patients SET kabupaten_id = $1 WHERE kabupaten_id = ANY($2)`,
        [canonicalId, duplicateIds]
      );

      await client.query(
        `DELETE FROM kabupaten WHERE id = ANY($1)`,
        [duplicateIds]
      );
    }

    // ─── 4. DEDUPLIKASI KECAMATAN ──────────────────────────────────────────────
    console.log('4️⃣ Menggabungkan & menghapus duplikat Kecamatan per Kabupaten...');
    const kecDupes = await client.query(`
      SELECT kabupaten_id, UPPER(TRIM(name)) as name, array_agg(id ORDER BY id) as ids
      FROM kecamatan
      GROUP BY kabupaten_id, UPPER(TRIM(name))
      HAVING count(*) > 1;
    `);

    for (const row of kecDupes.rows) {
      const canonicalId = row.ids[0];
      const duplicateIds = row.ids.slice(1);

      await client.query(
        `UPDATE kelurahan SET kecamatan_id = $1 WHERE kecamatan_id = ANY($2)`,
        [canonicalId, duplicateIds]
      );
      await client.query(
        `UPDATE patients SET kecamatan_id = $1 WHERE kecamatan_id = ANY($2)`,
        [canonicalId, duplicateIds]
      );

      await client.query(
        `DELETE FROM kecamatan WHERE id = ANY($1)`,
        [duplicateIds]
      );
    }

    // ─── 5. DEDUPLIKASI KELURAHAN ──────────────────────────────────────────────
    console.log('5️⃣ Menggabungkan & menghapus duplikat Kelurahan per Kecamatan...');
    const kelDupes = await client.query(`
      SELECT kecamatan_id, UPPER(TRIM(name)) as name, array_agg(id ORDER BY id) as ids
      FROM kelurahan
      GROUP BY kecamatan_id, UPPER(TRIM(name))
      HAVING count(*) > 1;
    `);

    for (const row of kelDupes.rows) {
      const canonicalId = row.ids[0];
      const duplicateIds = row.ids.slice(1);

      await client.query(
        `UPDATE patients SET kelurahan_id = $1 WHERE kelurahan_id = ANY($2)`,
        [canonicalId, duplicateIds]
      );

      await client.query(
        `DELETE FROM kelurahan WHERE id = ANY($1)`,
        [duplicateIds]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Pembersihan dan deduplikasi database wilayah BERHASIL!');

    // ─── 6. EXPORT CLEAN SEED FILES ────────────────────────────────────────────
    console.log('💾 Memperbarui seed JSON files agar bersih permanen...');
    const cleanProv = (await client.query('SELECT * FROM provinsi ORDER BY name')).rows;
    const cleanKab = (await client.query('SELECT id, provinsi_id as "provinsiId", name, is_city as "isCity" FROM kabupaten ORDER BY name')).rows;
    const cleanKec = (await client.query('SELECT id, kabupaten_id as "kabupatenId", name FROM kecamatan ORDER BY name')).rows;
    const cleanKel = (await client.query('SELECT id, kecamatan_id as "kecamatanId", name FROM kelurahan ORDER BY name')).rows;

    const wilayahDir = path.join(__dirname, 'seeds/wilayah');
    fs.writeFileSync(path.join(wilayahDir, 'provinsi.json'), JSON.stringify(cleanProv, null, 2));
    fs.writeFileSync(path.join(wilayahDir, 'kabupaten.json'), JSON.stringify(cleanKab, null, 2));
    fs.writeFileSync(path.join(wilayahDir, 'kecamatan.json'), JSON.stringify(cleanKec, null, 2));
    fs.writeFileSync(path.join(wilayahDir, 'kelurahan.json'), JSON.stringify(cleanKel, null, 2));

    console.log(`📊 Statistik Data Wilayah Bersih:`);
    console.log(`   - Provinsi : ${cleanProv.length} (sebelumnya 70)`);
    console.log(`   - Kabupaten: ${cleanKab.length} (sebelumnya 327)`);
    console.log(`   - Kecamatan: ${cleanKec.length} (sebelumnya 1252)`);
    console.log(`   - Kelurahan: ${cleanKel.length} (sebelumnya 3381)`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Gagal membersihkan wilayah:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  cleanWilayahDuplicates().catch(console.error);
}

module.exports = { cleanWilayahDuplicates };
