/**
 * Script Seed Data Kunjungan Dummy Kasir & Cetak Kwitansi KRIZA
 * 
 * Menghasilkan data kunjungan riil:
 * 1. Antrian Tagihan (UNPAID) -> Siap diproses kasir lalu cetak kwitansi
 * 2. Riwayat Transaksi Lunas (PAID + Payment) -> Langsung bisa klik cetak kuitansi
 * 3. Transaksi Non-Tunai / QRIS (PAID + Payment) -> Siap cetak kuitansi pembayaran digital
 */

require('../config/env');
const { db, pool } = require('./index');
const {
  users,
  patients,
  polyclinics,
  practitioners,
  procedures,
  drugs,
  registrations,
  queues,
  encounters,
  vitalSigns,
  soapNotes,
  encounterDiagnoses,
  encounterProcedures,
  prescriptions,
  prescriptionItems,
  invoices,
  invoiceItems,
  payments,
} = require('./schema');
const { eq, inArray } = require('drizzle-orm');

async function seedCashierData() {
  console.log('🚀 Memulai pembuatan data kunjungan & billing dummy...');

  // 1. Ambil master data referensi
  const [admin] = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
  if (!admin) throw new Error('User admin belum dibuat. Jalankan npm run db:seed terlebih dahulu.');

  const allPolys = await db.select().from(polyclinics);
  const polyUmum = allPolys.find((p) => p.code === 'POLI-UMUM') || allPolys[0];
  const polyGigi = allPolys.find((p) => p.code === 'POLI-GIGI') || allPolys[0];
  const polyEstetika = allPolys.find((p) => p.code === 'POLI-ESTETIKA') || allPolys[0];

  const allDocs = await db.select().from(practitioners);
  const drFaisol = allDocs.find((d) => d.code === 'DR-001') || allDocs[0];
  const drFachrudin = allDocs.find((d) => d.code === 'DR-002') || allDocs[0];
  const drgIqbal = allDocs.find((d) => d.code === 'DR-003') || allDocs[0];

  const allProcs = await db.select().from(procedures);
  const procUmum = allProcs.find((p) => p.code === 'PRC-UM-001') || allProcs[0];
  const procGigiKonsul = allProcs.find((p) => p.code === 'PRC-GG-001') || allProcs[0];
  const procGigiScaling = allProcs.find((p) => p.code === 'PRC-GG-002') || allProcs[0];
  const procFacial = allProcs.find((p) => p.code === 'PRC-EST-002') || allProcs[0];

  const allDrugs = await db.select().from(drugs);
  const drugPct = allDrugs.find((d) => d.code === 'OBT-001') || allDrugs[0];
  const drugAmox = allDrugs.find((d) => d.code === 'OBT-002') || allDrugs[0];
  const drugCtz = allDrugs.find((d) => d.code === 'OBT-005') || allDrugs[0];
  const drugIbu = allDrugs.find((d) => d.code === 'OBT-003') || allDrugs[0];
  const drugMouthwash = allDrugs.find((d) => d.code === 'OBT-010') || allDrugs[0];
  const drugSerum = allDrugs.find((d) => d.code === 'OBT-008') || allDrugs[0];
  const drugClinda = allDrugs.find((d) => d.code === 'OBT-007') || allDrugs[0];

  const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const now = new Date();

  // Helper upsert pasien
  async function getOrCreatePatient(mrn, data) {
    const existing = await db.select().from(patients).where(eq(patients.medicalRecordNumber, mrn)).limit(1);
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(patients).values({ medicalRecordNumber: mrn, ...data }).returning();
    return created;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // KASUS 1: PASIEN POLI UMUM — STATUS UNPAID (Antrian Tagihan Kasir Siap Bayar)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📦 Membuat Kunjungan 1: Budi Santoso (Antrian Tagihan Kasir / UNPAID)...');
  const patient1 = await getOrCreatePatient('000003', {
    name: 'Budi Santoso',
    identityType: 'KTP',
    identityNumber: '3507121508890003',
    gender: 'Laki-laki',
    birthPlace: 'Malang',
    birthDate: '1989-08-15',
    phone: '081234567803',
    address: 'Jl. Melati No. 12, RT 02/RW 04, Sumberpucung, Malang',
    residenceAddress: 'Jl. Melati No. 12, RT 02/RW 04, Sumberpucung, Malang',
    bloodType: 'O',
    rhesus: '+',
    occupation: 'Karyawan Swasta',
    religion: 'Islam',
  });

  const regNum1 = `REG-${todayStr}-0003`;
  let [reg1] = await db.select().from(registrations).where(eq(registrations.registrationNumber, regNum1)).limit(1);
  if (!reg1) {
    [reg1] = await db.insert(registrations).values({
      registrationNumber: regNum1,
      patientId: patient1.id,
      polyclinicId: polyUmum.id,
      practitionerId: drFaisol.id,
      visitType: 'BARU',
      registrationSource: 'LANGSUNG',
      paymentMethod: 'UMUM',
      complaint: 'Demam tinggi sudah 3 hari, batuk berdahak, pilek dan sakit tenggorokan',
      status: 'SELESAI',
      registeredBy: admin.id,
    }).returning();

    await db.insert(queues).values({
      registrationId: reg1.id,
      polyclinicId: polyUmum.id,
      queueNumber: 'A-003',
      queueSequence: 3,
      status: 'SELESAI',
    }).onConflictDoNothing();
  }

  // Encounter Pasien 1
  let [enc1] = await db.select().from(encounters).where(eq(encounters.registrationId, reg1.id)).limit(1);
  if (!enc1) {
    [enc1] = await db.insert(encounters).values({
      registrationId: reg1.id,
      patientId: patient1.id,
      practitionerId: drFaisol.id,
      polyclinicId: polyUmum.id,
      status: 'FINALIZED',
      finalizedAt: now,
      finalizedBy: admin.id,
    }).returning();

    await db.insert(vitalSigns).values({
      encounterId: enc1.id,
      systolic: 120,
      diastolic: 80,
      heartRate: 84,
      respiratoryRate: 20,
      temperature: '38.3',
      oxygenSaturation: 98,
      weight: '68.0',
      height: '172.0',
      bmi: '23.0',
      bmiCategory: 'Normal',
      consciousness: 'Compos Mentis',
      triage: 'HIJAU',
      physicalExamNotes: 'Faring hiperemis (+), pembesaran tonsil T1-T1, ronki (-), wheezing (-)',
    }).onConflictDoNothing();

    await db.insert(soapNotes).values({
      encounterId: enc1.id,
      subjective: 'Pasien mengeluh demam sejak 3 hari lalu disertai batuk berdahak kekuningan dan hidung tersumbat.',
      objective: 'Keadaan umum tampak lemas, suhu 38.3 C, faring hiperemis, cor/pulmo dalam batas normal.',
      assessment: 'ISPA (Infeksi Saluran Pernafasan Akut) ec susp bakterial.',
      plan: 'Antibiotik amoxicillin 3x500mg (habiskan), antipiretik paracetamol 3x500mg prn, cetirizine 1x10mg malam.',
      prognosis: 'Bonam',
    }).onConflictDoNothing();

    await db.insert(encounterDiagnoses).values({
      encounterId: enc1.id,
      icd10Code: 'J06.9',
      icd10Name: 'Infeksi Saluran Pernapasan Akut (ISPA)',
      diagnosisType: 'PRIMARY',
      diagnosisCase: 'BARU',
    });

    await db.insert(encounterProcedures).values({
      encounterId: enc1.id,
      procedureId: procUmum.id,
      procedureCode: procUmum.code,
      procedureName: procUmum.name,
      quantity: 1,
      tariff: '40000.00',
      notes: 'Pemeriksaan fisik umum dan edukasi kesehatan',
    });

    // Resep Pasien 1
    const prescNum1 = `RES-${todayStr}-0003`;
    const [presc1] = await db.insert(prescriptions).values({
      prescriptionNumber: prescNum1,
      encounterId: enc1.id,
      patientId: patient1.id,
      practitionerId: drFaisol.id,
      status: 'DISPENSED',
      pharmacistId: admin.id,
      dispensedAt: now,
    }).returning();

    await db.insert(prescriptionItems).values([
      {
        prescriptionId: presc1.id,
        drugId: drugPct.id,
        drugName: drugPct.name,
        dosageForm: 'Tablet',
        quantity: 10,
        unit: 'TABLET',
        signa: '3x1 tablet sesudah makan (bila demam/nyeri)',
        dispensedQty: 10,
        unitPrice: '700.00',
        subtotal: '7000.00',
      },
      {
        prescriptionId: presc1.id,
        drugId: drugAmox.id,
        drugName: drugAmox.name,
        dosageForm: 'Kapsul',
        quantity: 15,
        unit: 'KAPSUL',
        signa: '3x1 kapsul tiap 8 jam (wajib dihabiskan)',
        dispensedQty: 15,
        unitPrice: '1200.00',
        subtotal: '18000.00',
      },
      {
        prescriptionId: presc1.id,
        drugId: drugCtz.id,
        drugName: drugCtz.name,
        dosageForm: 'Tablet',
        quantity: 10,
        unit: 'TABLET',
        signa: '1x1 tablet malam hari sesudah makan',
        dispensedQty: 10,
        unitPrice: '1100.00',
        subtotal: '11000.00',
      },
    ]);
  }

  // Invoice Pasien 1 (UNPAID - Rp 76.000)
  const invNum1 = `INV-${todayStr}-0002`;
  let [inv1] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invNum1)).limit(1);
  if (!inv1) {
    [inv1] = await db.insert(invoices).values({
      invoiceNumber: invNum1,
      registrationId: reg1.id,
      encounterId: enc1.id,
      patientId: patient1.id,
      status: 'UNPAID',
      paymentScheme: 'UMUM',
      totalAmount: '76000.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      finalAmount: '76000.00',
      paidAmount: '0.00',
      balanceAmount: '76000.00',
      notes: 'Tagihan pemeriksaan Poli Umum & paket resep ISPA',
      createdById: admin.id,
    }).returning();

    await db.insert(invoiceItems).values([
      {
        invoiceId: inv1.id,
        itemType: 'PROCEDURE',
        referenceId: procUmum.id,
        itemName: procUmum.name,
        quantity: 1,
        unitPrice: '40000.00',
        discount: '0.00',
        subtotal: '40000.00',
        notes: 'Konsultasi & Pemeriksaan Dokter Umum',
      },
      {
        invoiceId: inv1.id,
        itemType: 'DRUG',
        referenceId: drugPct.id,
        itemName: `${drugPct.name} (Tablet)`,
        quantity: 10,
        unitPrice: '700.00',
        discount: '0.00',
        subtotal: '7000.00',
        notes: 'Resep Farmasi',
      },
      {
        invoiceId: inv1.id,
        itemType: 'DRUG',
        referenceId: drugAmox.id,
        itemName: `${drugAmox.name} (Kapsul)`,
        quantity: 15,
        unitPrice: '1200.00',
        discount: '0.00',
        subtotal: '18000.00',
        notes: 'Resep Farmasi',
      },
      {
        invoiceId: inv1.id,
        itemType: 'DRUG',
        referenceId: drugCtz.id,
        itemName: `${drugCtz.name} (Tablet)`,
        quantity: 10,
        unitPrice: '1100.00',
        discount: '0.00',
        subtotal: '11000.00',
        notes: 'Resep Farmasi',
      },
    ]);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // KASUS 2: PASIEN POLI GIGI — STATUS PAID / LUNAS (Cetak Kwitansi Langsung Kasir)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📦 Membuat Kunjungan 2: Siti Rahmawati (Lunas Tunai / Siap Cetak Kwitansi)...');
  const patient2 = await getOrCreatePatient('000004', {
    name: 'Siti Rahmawati',
    identityType: 'KTP',
    identityNumber: '3507125203950004',
    gender: 'Perempuan',
    birthPlace: 'Surabaya',
    birthDate: '1995-03-12',
    phone: '081234567804',
    address: 'Jl. Kenanga No. 45, RT 01/RW 02, Kepanjen, Malang',
    residenceAddress: 'Jl. Kenanga No. 45, RT 01/RW 02, Kepanjen, Malang',
    bloodType: 'B',
    rhesus: '+',
    occupation: 'Guru',
    religion: 'Islam',
  });

  const regNum2 = `REG-${todayStr}-0004`;
  let [reg2] = await db.select().from(registrations).where(eq(registrations.registrationNumber, regNum2)).limit(1);
  if (!reg2) {
    [reg2] = await db.insert(registrations).values({
      registrationNumber: regNum2,
      patientId: patient2.id,
      polyclinicId: polyGigi.id,
      practitionerId: drgIqbal.id,
      visitType: 'LAMA',
      registrationSource: 'LANGSUNG',
      paymentMethod: 'UMUM',
      complaint: 'Gusi sering berdarah saat sikat gigi dan ingin scaling karang gigi',
      status: 'SELESAI',
      registeredBy: admin.id,
    }).returning();

    await db.insert(queues).values({
      registrationId: reg2.id,
      polyclinicId: polyGigi.id,
      queueNumber: 'B-001',
      queueSequence: 1,
      status: 'SELESAI',
    }).onConflictDoNothing();
  }

  // Encounter Pasien 2
  let [enc2] = await db.select().from(encounters).where(eq(encounters.registrationId, reg2.id)).limit(1);
  if (!enc2) {
    [enc2] = await db.insert(encounters).values({
      registrationId: reg2.id,
      patientId: patient2.id,
      practitionerId: drgIqbal.id,
      polyclinicId: polyGigi.id,
      status: 'FINALIZED',
      finalizedAt: now,
      finalizedBy: admin.id,
    }).returning();

    await db.insert(vitalSigns).values({
      encounterId: enc2.id,
      systolic: 115,
      diastolic: 75,
      heartRate: 78,
      respiratoryRate: 18,
      temperature: '36.6',
      oxygenSaturation: 99,
      weight: '54.0',
      height: '160.0',
      bmi: '21.1',
      bmiCategory: 'Normal',
      consciousness: 'Compos Mentis',
      triage: 'HIJAU',
    }).onConflictDoNothing();

    await db.insert(soapNotes).values({
      encounterId: enc2.id,
      subjective: 'Pasien mengeluhkan gusi bawah sering berdarah bila menyikat gigi dan terasa ngilu ringan.',
      objective: 'Tampak kalkulus supra dan subgingival di regio anterior rahang bawah & posterior atas. Gingiva hiperemis, BOP (+).',
      assessment: 'Gingivitis kronis akibat akumulasi kalkulus dental (K05.1)',
      plan: 'Scaling rahang atas dan bawah, instruksi oral hygiene, kumur chlorhexidine 2x sehari, analgetik ibuprofen prn bila ngilu.',
      prognosis: 'Bonam',
    }).onConflictDoNothing();

    await db.insert(encounterDiagnoses).values({
      encounterId: enc2.id,
      icd10Code: 'K05.1',
      icd10Name: 'Gingivitis / Radang Gusi Kronis',
      diagnosisType: 'PRIMARY',
      diagnosisCase: 'LAMA',
    });

    await db.insert(encounterProcedures).values([
      {
        encounterId: enc2.id,
        procedureId: procGigiKonsul.id,
        procedureCode: procGigiKonsul.code,
        procedureName: procGigiKonsul.name,
        quantity: 1,
        tariff: '50000.00',
        notes: 'Pemeriksaan & Konsultasi Dokter Gigi',
      },
      {
        encounterId: enc2.id,
        procedureId: procGigiScaling.id,
        procedureCode: procGigiScaling.code,
        procedureName: procGigiScaling.name,
        quantity: 1,
        tariff: '250000.00',
        notes: 'Ultrasonic Scaling Rahang Atas & Bawah',
      },
    ]);

    // Resep Pasien 2
    const prescNum2 = `RES-${todayStr}-0004`;
    const [presc2] = await db.insert(prescriptions).values({
      prescriptionNumber: prescNum2,
      encounterId: enc2.id,
      patientId: patient2.id,
      practitionerId: drgIqbal.id,
      status: 'DISPENSED',
      pharmacistId: admin.id,
      dispensedAt: now,
    }).returning();

    await db.insert(prescriptionItems).values([
      {
        prescriptionId: presc2.id,
        drugId: drugIbu.id,
        drugName: drugIbu.name,
        dosageForm: 'Tablet',
        quantity: 10,
        unit: 'TABLET',
        signa: '3x1 tablet sesudah makan (bila nyeri/ngilu)',
        dispensedQty: 10,
        unitPrice: '900.00',
        subtotal: '9000.00',
      },
      {
        prescriptionId: presc2.id,
        drugId: drugMouthwash.id,
        drugName: drugMouthwash.name,
        dosageForm: 'Botol',
        quantity: 1,
        unit: 'BOTOL',
        signa: 'Kumur 10ml selama 1 menit 2x sehari setelah sikat gigi',
        dispensedQty: 1,
        unitPrice: '32000.00',
        subtotal: '32000.00',
      },
    ]);
  }

  // Invoice Pasien 2 (PAID - Rp 341.000)
  const invNum2 = `INV-${todayStr}-0003`;
  let [inv2] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invNum2)).limit(1);
  if (!inv2) {
    [inv2] = await db.insert(invoices).values({
      invoiceNumber: invNum2,
      registrationId: reg2.id,
      encounterId: enc2.id,
      patientId: patient2.id,
      status: 'PAID',
      paymentScheme: 'UMUM',
      totalAmount: '341000.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      finalAmount: '341000.00',
      paidAmount: '341000.00',
      balanceAmount: '0.00',
      notes: 'Layanan Dental Care & Scaling Gigi',
      createdById: admin.id,
    }).returning();

    await db.insert(invoiceItems).values([
      {
        invoiceId: inv2.id,
        itemType: 'PROCEDURE',
        referenceId: procGigiKonsul.id,
        itemName: procGigiKonsul.name,
        quantity: 1,
        unitPrice: '50000.00',
        discount: '0.00',
        subtotal: '50000.00',
        notes: 'Konsultasi Gigi',
      },
      {
        invoiceId: inv2.id,
        itemType: 'PROCEDURE',
        referenceId: procGigiScaling.id,
        itemName: procGigiScaling.name,
        quantity: 1,
        unitPrice: '250000.00',
        discount: '0.00',
        subtotal: '250000.00',
        notes: 'Pembersihan Karang Gigi',
      },
      {
        invoiceId: inv2.id,
        itemType: 'DRUG',
        referenceId: drugIbu.id,
        itemName: `${drugIbu.name} (Tablet)`,
        quantity: 10,
        unitPrice: '900.00',
        discount: '0.00',
        subtotal: '9000.00',
        notes: 'Resep Farmasi',
      },
      {
        invoiceId: inv2.id,
        itemType: 'DRUG',
        referenceId: drugMouthwash.id,
        itemName: `${drugMouthwash.name} (Botol)`,
        quantity: 1,
        unitPrice: '32000.00',
        discount: '0.00',
        subtotal: '32000.00',
        notes: 'Resep Farmasi',
      },
    ]);

    // Payment Record Pasien 2 -> Terbit Kuitansi Resmi!
    const payNum1 = `PAY-${todayStr}-0001`;
    await db.insert(payments).values({
      paymentNumber: payNum1,
      invoiceId: inv2.id,
      patientId: patient2.id,
      paymentMethod: 'TUNAI',
      amount: '341000.00',
      cashTendered: '350000.00',
      changeAmount: '9000.00',
      notes: 'Pembayaran tunai kasir lunas',
      cashierId: admin.id,
      paidAt: now,
    }).onConflictDoNothing();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // KASUS 3: PASIEN POLI KECANTIKAN — STATUS PAID (Metode QRIS / Cetak Kwitansi)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📦 Membuat Kunjungan 3: Dewi Lestari (Lunas QRIS / Siap Cetak Kwitansi)...');
  const patient3 = await getOrCreatePatient('000005', {
    name: 'Dewi Lestari',
    identityType: 'KTP',
    identityNumber: '3507126107980005',
    gender: 'Perempuan',
    birthPlace: 'Malang',
    birthDate: '1998-07-21',
    phone: '081234567805',
    address: 'Jl. Mawar Indah No. 8, Sukun, Malang',
    residenceAddress: 'Jl. Mawar Indah No. 8, Sukun, Malang',
    bloodType: 'A',
    rhesus: '+',
    occupation: 'Wiraswasta',
    religion: 'Islam',
  });

  const regNum3 = `REG-${todayStr}-0005`;
  let [reg3] = await db.select().from(registrations).where(eq(registrations.registrationNumber, regNum3)).limit(1);
  if (!reg3) {
    [reg3] = await db.insert(registrations).values({
      registrationNumber: regNum3,
      patientId: patient3.id,
      polyclinicId: polyEstetika.id,
      practitionerId: drFachrudin.id,
      visitType: 'LAMA',
      registrationSource: 'LANGSUNG',
      paymentMethod: 'UMUM',
      complaint: 'Perawatan facial acne dan pembelian serum pencerah wajah',
      status: 'SELESAI',
      registeredBy: admin.id,
    }).returning();

    await db.insert(queues).values({
      registrationId: reg3.id,
      polyclinicId: polyEstetika.id,
      queueNumber: 'C-001',
      queueSequence: 1,
      status: 'SELESAI',
    }).onConflictDoNothing();
  }

  // Encounter Pasien 3
  let [enc3] = await db.select().from(encounters).where(eq(encounters.registrationId, reg3.id)).limit(1);
  if (!enc3) {
    [enc3] = await db.insert(encounters).values({
      registrationId: reg3.id,
      patientId: patient3.id,
      practitionerId: drFachrudin.id,
      polyclinicId: polyEstetika.id,
      status: 'FINALIZED',
      finalizedAt: now,
      finalizedBy: admin.id,
    }).returning();

    await db.insert(vitalSigns).values({
      encounterId: enc3.id,
      systolic: 110,
      diastolic: 70,
      heartRate: 76,
      respiratoryRate: 18,
      temperature: '36.5',
      oxygenSaturation: 99,
      weight: '50.0',
      height: '158.0',
      bmi: '20.0',
      bmiCategory: 'Normal',
      consciousness: 'Compos Mentis',
      triage: 'HIJAU',
    }).onConflictDoNothing();

    await db.insert(soapNotes).values({
      encounterId: enc3.id,
      subjective: 'Pasien mengeluh beruntusan dan komedo di area T-zone serta bekas jerawat kehitaman.',
      objective: 'Komedo terbuka dan tertutup regio hidung & dahi, makula hiperpigmentasi pasca inflamasi.',
      assessment: 'Acne Vulgaris derajat ringan-sedang & PIH (L70.0)',
      plan: 'Medical Facial Acne Cleansing, ekstraksi komedo aseptis, high frequency, krim Clindamycin 1% pagi & malam, Serum Vitamin C.',
      prognosis: 'Bonam',
    }).onConflictDoNothing();

    await db.insert(encounterDiagnoses).values({
      encounterId: enc3.id,
      icd10Code: 'L70.0',
      icd10Name: 'Jerawat (Acne Vulgaris)',
      diagnosisType: 'PRIMARY',
      diagnosisCase: 'LAMA',
    });

    await db.insert(encounterProcedures).values({
      encounterId: enc3.id,
      procedureId: procFacial.id,
      procedureCode: procFacial.code,
      procedureName: procFacial.name,
      quantity: 1,
      tariff: '180000.00',
      notes: 'Facial Medical Acne Deep Cleansing + High Frequency Disinfection',
    });

    // Resep / Produk Pasien 3
    const prescNum3 = `RES-${todayStr}-0005`;
    const [presc3] = await db.insert(prescriptions).values({
      prescriptionNumber: prescNum3,
      encounterId: enc3.id,
      patientId: patient3.id,
      practitionerId: drFachrudin.id,
      status: 'DISPENSED',
      pharmacistId: admin.id,
      dispensedAt: now,
    }).returning();

    await db.insert(prescriptionItems).values([
      {
        prescriptionId: presc3.id,
        drugId: drugClinda.id,
        drugName: drugClinda.name,
        dosageForm: 'Tube',
        quantity: 1,
        unit: 'TUBE',
        signa: 'Oles tipis pada area jerawat 2x sehari',
        dispensedQty: 1,
        unitPrice: '45000.00',
        subtotal: '45000.00',
      },
      {
        prescriptionId: presc3.id,
        drugId: drugSerum.id,
        drugName: drugSerum.name,
        dosageForm: 'Botol',
        quantity: 1,
        unit: 'BOTOL',
        signa: '3-4 tetes merata pada wajah sebelum krim pagi/malam',
        dispensedQty: 1,
        unitPrice: '110000.00',
        subtotal: '110000.00',
      },
    ]);
  }

  // Invoice Pasien 3 (PAID - Rp 335.000 via QRIS)
  const invNum3 = `INV-${todayStr}-0004`;
  let [inv3] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invNum3)).limit(1);
  if (!inv3) {
    [inv3] = await db.insert(invoices).values({
      invoiceNumber: invNum3,
      registrationId: reg3.id,
      encounterId: enc3.id,
      patientId: patient3.id,
      status: 'PAID',
      paymentScheme: 'UMUM',
      totalAmount: '335000.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      finalAmount: '335000.00',
      paidAmount: '335000.00',
      balanceAmount: '0.00',
      notes: 'Perawatan Estetika & Skincare Medis',
      createdById: admin.id,
    }).returning();

    await db.insert(invoiceItems).values([
      {
        invoiceId: inv3.id,
        itemType: 'PROCEDURE',
        referenceId: procFacial.id,
        itemName: procFacial.name,
        quantity: 1,
        unitPrice: '180000.00',
        discount: '0.00',
        subtotal: '180000.00',
        notes: 'Facial Medical Acne',
      },
      {
        invoiceId: inv3.id,
        itemType: 'DRUG',
        referenceId: drugClinda.id,
        itemName: `${drugClinda.name} (Tube)`,
        quantity: 1,
        unitPrice: '45000.00',
        discount: '0.00',
        subtotal: '45000.00',
        notes: 'Resep Kosmetik Medis',
      },
      {
        invoiceId: inv3.id,
        itemType: 'DRUG',
        referenceId: drugSerum.id,
        itemName: `${drugSerum.name} (Botol)`,
        quantity: 1,
        unitPrice: '110000.00',
        discount: '0.00',
        subtotal: '110000.00',
        notes: 'Resep Kosmetik Medis',
      },
    ]);

    // Payment Record Pasien 3 -> Terbit Kuitansi QRIS!
    const payNum2 = `PAY-${todayStr}-0002`;
    await db.insert(payments).values({
      paymentNumber: payNum2,
      invoiceId: inv3.id,
      patientId: patient3.id,
      paymentMethod: 'QRIS',
      amount: '335000.00',
      cashTendered: '335000.00',
      changeAmount: '0.00',
      bankName: 'BCA QRIS Dinamis',
      referenceNumber: 'QRIS-BCA-982104',
      notes: 'Pembayaran QRIS via mobile banking',
      cashierId: admin.id,
      paidAt: now,
    }).onConflictDoNothing();
  }

  console.log('✅ Berhasil membuat 3 data kunjungan dummy lengkap dengan invoice dan kwitansi!');
}

seedCashierData()
  .catch((err) => {
    console.error('❌ Terjadi kesalahan saat seeding data kasir:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
