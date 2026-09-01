require('../config/env');
const { pool } = require('./index');

async function check() {
  const provDupes = await pool.query(`
    SELECT UPPER(TRIM(name)) as name, array_agg(id ORDER BY id) as ids, count(*) 
    FROM provinsi 
    GROUP BY UPPER(TRIM(name)) 
    HAVING count(*) > 1 
    ORDER BY count(*) DESC;
  `);
  console.log('Duplicate Provinsi count:', provDupes.rows.length);
  console.log('Duplicate Provinsi samples:', provDupes.rows);

  const kabDupes = await pool.query(`
    SELECT UPPER(TRIM(name)) as name, array_agg(id ORDER BY id) as ids, count(*) 
    FROM kabupaten 
    GROUP BY UPPER(TRIM(name)) 
    HAVING count(*) > 1;
  `);
  console.log('Duplicate Kabupaten count:', kabDupes.rows.length);

  const kecDupes = await pool.query(`
    SELECT UPPER(TRIM(name)) as name, array_agg(id ORDER BY id) as ids, count(*) 
    FROM kecamatan 
    GROUP BY UPPER(TRIM(name)) 
    HAVING count(*) > 1;
  `);
  console.log('Duplicate Kecamatan count:', kecDupes.rows.length);

  const kelDupes = await pool.query(`
    SELECT UPPER(TRIM(name)) as name, array_agg(id ORDER BY id) as ids, count(*) 
    FROM kelurahan 
    GROUP BY UPPER(TRIM(name)) 
    HAVING count(*) > 1;
  `);
  console.log('Duplicate Kelurahan count:', kelDupes.rows.length);

  // Check how many kabupaten belong to each duplicate provinsi ID
  const kabByProv = await pool.query(`
    SELECT p.id, p.name, count(k.id) as kab_count
    FROM provinsi p
    LEFT JOIN kabupaten k ON k.provinsi_id = p.id
    GROUP BY p.id, p.name
    ORDER BY p.name, p.id;
  `);
  console.log('Kabupaten per Provinsi:');
  console.table(kabByProv.rows.filter(r => ['JAWA TIMUR', 'DKI JAKARTA', 'SUMATERA UTARA', 'SULAWESI SELATAN', 'KALIMANTAN TIMUR'].includes(r.name)));

  await pool.end();
}

check().catch(console.error);
