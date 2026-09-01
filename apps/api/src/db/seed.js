/**
 * Seed data awal KRIZA.
 * Jalankan dengan: node src/db/seed.js (atau npm run db:seed)
 *
 * Membuat:
 * - 3 roles: admin, dokter, perawat
 * - Permissions dasar per role
 * - 1 user admin default (Admin@KRIZA2024)
 * - Master 3 Poliklinik (Umum, Gigi, Kecantikan)
 * - Master Rate Types (Umum, BPJS, Asuransi)
 * - Master Tenaga Medis & Jadwal Praktik
 * - Master Satuan & Obat-obatan
 * - Master Tindakan & Tarif Layanan
 * - Standar Diagnosa ICD-10 (Kasus primer faskes tingkat pertama)
 */

require('../config/env'); // Validasi env dulu
const bcrypt = require('bcryptjs');
const { db, pool } = require('./index');
const {
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  polyclinics,
  practitioners,
  schedules,
  rateTypes,
  procedures,
  serviceRates,
  drugUnits,
  drugs,
  icd10Codes,
} = require('./schema');
const { eq } = require('drizzle-orm');

// ─── Data Seed ────────────────────────────────────────────────────────────────

const ROLES_DATA = [
  { name: 'admin', displayName: 'Administrator', description: 'Akses penuh ke seluruh sistem' },
  { name: 'dokter', displayName: 'Dokter', description: 'Akses klinis: encounter, diagnosa, resep' },
  { name: 'perawat', displayName: 'Perawat', description: 'Akses pendaftaran, TTV, antrian' },
];

const PERMISSIONS_DATA = [
  // Users management
  { action: 'users:read', description: 'Melihat daftar user' },
  { action: 'users:write', description: 'Membuat dan mengubah user' },
  { action: 'users:delete', description: 'Menonaktifkan user' },
  // Patients
  { action: 'patients:read', description: 'Melihat data pasien' },
  { action: 'patients:write', description: 'Mendaftarkan dan mengubah data pasien' },
  { action: 'patients:delete', description: 'Menghapus (soft) data pasien' },
  // Registration
  { action: 'registrations:read', description: 'Melihat antrian dan pendaftaran' },
  { action: 'registrations:write', description: 'Mendaftarkan pasien ke poli' },
  { action: 'registrations:manage', description: 'Kelola status antrian' },
  // Encounters
  { action: 'encounters:read', description: 'Melihat rekam medis' },
  { action: 'encounters:write', description: 'Mengisi rekam medis (SOAP)' },
  { action: 'encounters:finalize', description: 'Finalisasi rekam medis' },
  // Pharmacy
  { action: 'pharmacy:read', description: 'Melihat resep dan stok' },
  { action: 'pharmacy:dispense', description: 'Proses dispensing obat' },
  { action: 'pharmacy:stock', description: 'Kelola stok obat' },
  // Billing
  { action: 'billing:read', description: 'Melihat tagihan' },
  { action: 'billing:write', description: 'Proses pembayaran' },
  // Reports
  { action: 'reports:read', description: 'Melihat laporan' },
  // Master data
  { action: 'masterdata:read', description: 'Melihat master data' },
  { action: 'masterdata:write', description: 'Mengelola master data' },
];

const ROLE_PERMISSIONS = {
  admin: PERMISSIONS_DATA.map((p) => p.action),
  dokter: [
    'patients:read',
    'registrations:read',
    'encounters:read', 'encounters:write', 'encounters:finalize',
    'pharmacy:read',
    'billing:read',
    'masterdata:read',
  ],
  perawat: [
    'patients:read', 'patients:write',
    'registrations:read', 'registrations:write', 'registrations:manage',
    'encounters:read', 'encounters:write',
    'billing:read',
    'masterdata:read',
  ],
};

const DEFAULT_ADMIN = {
  username: 'admin',
  name: 'Administrator KRIZA',
  password: 'Admin@KRIZA2024',
  email: 'admin@klinik.local',
};

// ─── Master Data ──────────────────────────────────────────────────────────────

const POLYCLINICS_DATA = [
  { code: 'POLI-UMUM', name: 'Poli Umum', description: 'Pelayanan pemeriksaan kesehatan umum dan keluhan harian' },
  { code: 'POLI-GIGI', name: 'Poli Gigi', description: 'Pelayanan kesehatan gigi, scaling, penambalan dan pencabutan' },
  { code: 'POLI-ESTETIKA', name: 'Poli Kecantikan', description: 'Pelayanan perawatan kulit, estetika medis dan anti-aging' },
];

const RATE_TYPES_DATA = [
  { code: 'UMUM', name: 'Pasien Umum / Mandiri', description: 'Tarif pembayaran mandiri', isDefault: true },
  { code: 'BPJS', name: 'BPJS Kesehatan', description: 'Tarif klaim faskes BPJS', isDefault: false },
  { code: 'ASURANSI', name: 'Asuransi Swasta', description: 'Tarif reimbursement / admedika', isDefault: false },
];

const DRUG_UNITS_DATA = [
  { code: 'TAB', name: 'Tablet' },
  { code: 'KAP', name: 'Kapsul' },
  { code: 'BTL', name: 'Botol' },
  { code: 'STRIP', name: 'Strip' },
  { code: 'TUBE', name: 'Tube' },
  { code: 'AMP', name: 'Ampul' },
  { code: 'VIAL', name: 'Vial' },
  { code: 'PCS', name: 'Pcs' },
];

const DRUGS_DATA = [
  { code: 'OBT-001', name: 'Paracetamol 500 mg', genericName: 'Paracetamol', category: 'Obat Bebas', unitCode: 'TAB', basePrice: '300', sellingPrice: '700', minStock: 100, currentStock: 500, requiresPrescription: false },
  { code: 'OBT-002', name: 'Amoxicillin 500 mg', genericName: 'Amoxicillin Trihydrate', category: 'Obat Keras', unitCode: 'KAP', basePrice: '600', sellingPrice: '1200', minStock: 50, currentStock: 250, requiresPrescription: true },
  { code: 'OBT-003', name: 'Ibuprofen 400 mg', genericName: 'Ibuprofen', category: 'Obat Bebas Terbatas', unitCode: 'TAB', basePrice: '400', sellingPrice: '900', minStock: 50, currentStock: 300, requiresPrescription: false },
  { code: 'OBT-004', name: 'Antasida DOEN', genericName: 'Aluminium Hidroksida / Magnesium Hidroksida', category: 'Obat Bebas', unitCode: 'TAB', basePrice: '250', sellingPrice: '600', minStock: 100, currentStock: 400, requiresPrescription: false },
  { code: 'OBT-005', name: 'Cetirizine 10 mg', genericName: 'Cetirizine HCl', category: 'Obat Bebas Terbatas', unitCode: 'TAB', basePrice: '500', sellingPrice: '1100', minStock: 50, currentStock: 200, requiresPrescription: false },
  { code: 'OBT-006', name: 'Dexamethasone 0.5 mg', genericName: 'Dexamethasone', category: 'Obat Keras', unitCode: 'TAB', basePrice: '200', sellingPrice: '500', minStock: 50, currentStock: 350, requiresPrescription: true },
  { code: 'OBT-007', name: 'Krim Clindamycin 1%', genericName: 'Clindamycin Phosphate', category: 'Kosmetik Medis', unitCode: 'TUBE', basePrice: '25000', sellingPrice: '45000', minStock: 20, currentStock: 60, requiresPrescription: true },
  { code: 'OBT-008', name: 'Serum Brightening Vitamin C 15ml', genericName: 'Ascorbic Acid + Hyaluronic Acid', category: 'Kosmetik Medis', unitCode: 'BTL', basePrice: '60000', sellingPrice: '110000', minStock: 15, currentStock: 40, requiresPrescription: false },
  { code: 'OBT-009', name: 'Lidocaine HCl 2% Inj', genericName: 'Lidocaine', category: 'Obat Keras', unitCode: 'AMP', basePrice: '4500', sellingPrice: '9000', minStock: 20, currentStock: 80, requiresPrescription: true },
  { code: 'OBT-010', name: 'Chlorhexidine Mouthwash 0.2% 100ml', genericName: 'Chlorhexidine Gluconate', category: 'Obat Bebas Terbatas', unitCode: 'BTL', basePrice: '18000', sellingPrice: '32000', minStock: 10, currentStock: 30, requiresPrescription: false },
];

const PRACTITIONERS_DATA = [
  { code: 'DR-001', name: 'dr. Andi Pratama', title: 'dr.', sip: '503/SIP.DU/012/2023', specialization: 'Umum', phone: '081234567890', email: 'dr.andi@klinik.local', polyCode: 'POLI-UMUM' },
  { code: 'DR-002', name: 'drg. Sarah Melati', title: 'drg.', sip: '503/SIP.DG/045/2023', specialization: 'Gigi & Mulut', phone: '081298765432', email: 'drg.sarah@klinik.local', polyCode: 'POLI-GIGI' },
  { code: 'DR-003', name: 'dr. Maya Kartika, Sp.DVE', title: 'dr.', sip: '503/SIP.SP/089/2024', specialization: 'Dermatologi & Estetika', phone: '081377889900', email: 'dr.maya@klinik.local', polyCode: 'POLI-ESTETIKA' },
];

const PROCEDURES_DATA = [
  // Poli Umum
  { code: 'PRC-UM-001', name: 'Pemeriksaan & Konsultasi Dokter Umum', category: 'Konsultasi', polyCode: 'POLI-UMUM', tariffUmum: '40000', tariffBpjs: '0' },
  { code: 'PRC-UM-002', name: 'Jahit Luka Ringan (1-3 Jahitan)', category: 'Tindakan Medis', polyCode: 'POLI-UMUM', tariffUmum: '85000', tariffBpjs: '0' },
  { code: 'PRC-UM-003', name: 'Injeksi / Suntik Obat (Intramuskular/Intravena)', category: 'Tindakan Medis', polyCode: 'POLI-UMUM', tariffUmum: '30000', tariffBpjs: '0' },
  { code: 'PRC-UM-004', name: 'Surat Keterangan Sehat & Buta Warna', category: 'Administrasi Medis', polyCode: 'POLI-UMUM', tariffUmum: '35000', tariffBpjs: '35000' },
  // Poli Gigi
  { code: 'PRC-GG-001', name: 'Pemeriksaan & Konsultasi Dokter Gigi', category: 'Konsultasi', polyCode: 'POLI-GIGI', tariffUmum: '50000', tariffBpjs: '0' },
  { code: 'PRC-GG-002', name: 'Pembersihan Karang Gigi (Scaling) Rahang Atas & Bawah', category: 'Perawatan Gigi', polyCode: 'POLI-GIGI', tariffUmum: '250000', tariffBpjs: '0' },
  { code: 'PRC-GG-003', name: 'Penambalan Gigi Komposit / Sinar (Per Gigi)', category: 'Perawatan Gigi', polyCode: 'POLI-GIGI', tariffUmum: '175000', tariffBpjs: '0' },
  { code: 'PRC-GG-004', name: 'Pencabutan Gigi Dewasa (Tanpa Komplikasi)', category: 'Tindakan Gigi', polyCode: 'POLI-GIGI', tariffUmum: '150000', tariffBpjs: '0' },
  // Poli Kecantikan / Estetika
  { code: 'PRC-EST-001', name: 'Konsultasi Dokter Estetika & Skin Analysis', category: 'Konsultasi', polyCode: 'POLI-ESTETIKA', tariffUmum: '75000', tariffBpjs: '75000' },
  { code: 'PRC-EST-002', name: 'Facial Medical Acne Cleansing & High Frequency', category: 'Estetika', polyCode: 'POLI-ESTETIKA', tariffUmum: '180000', tariffBpjs: '180000' },
  { code: 'PRC-EST-003', name: 'Chemical Peeling Glow / Rejuvenation', category: 'Estetika', polyCode: 'POLI-ESTETIKA', tariffUmum: '250000', tariffBpjs: '250000' },
  { code: 'PRC-EST-004', name: 'Injeksi Vitamin C & Collagen Glow Booster', category: 'Estetika', polyCode: 'POLI-ESTETIKA', tariffUmum: '150000', tariffBpjs: '150000' },
];

const ICD10_DATA = [
  { code: 'J06.9', nameEn: 'Acute upper respiratory infection, unspecified', nameId: 'Infeksi Saluran Pernapasan Akut (ISPA)' },
  { code: 'I10', nameEn: 'Essential (primary) hypertension', nameId: 'Hipertensi Esensial' },
  { code: 'E11.9', nameEn: 'Type 2 diabetes mellitus without complications', nameId: 'Diabetes Melitus Tipe 2 Tanpa Komplikasi' },
  { code: 'K29.7', nameEn: 'Gastritis, unspecified', nameId: 'Gastritis / Sakit Maag' },
  { code: 'K02.9', nameEn: 'Dental caries, unspecified', nameId: 'Karies Gigi / Gigi Berlubang' },
  { code: 'K05.1', nameEn: 'Chronic gingivitis', nameId: 'Gingivitis / Radang Gusi Kronis' },
  { code: 'L70.0', nameEn: 'Acne vulgaris', nameId: 'Jerawat (Acne Vulgaris)' },
  { code: 'L81.1', nameEn: 'Chloasma / Melasma', nameId: 'Flek Hitam / Melasma' },
  { code: 'A09', nameEn: 'Infectious gastroenteritis and colitis, unspecified', nameId: 'Diare dan Gastroenteritis Akut' },
  { code: 'R50.9', nameEn: 'Fever, unspecified', nameId: 'Demam (Penyebab Tidak Spesifik)' },
  { code: 'M79.1', nameEn: 'Myalgia', nameId: 'Mialgia / Nyeri Otot' },
  { code: 'J00', nameEn: 'Acute nasopharyngitis [common cold]', nameId: 'Flu / Batuk Pilek (Common Cold)' },
  { code: 'B35.4', nameEn: 'Tinea corporis', nameId: 'Kurap / Jamur Kulit Tubuh' },
  { code: 'H10.9', nameEn: 'Conjunctivitis, unspecified', nameId: 'Konjungtivitis / Sakit Mata' },
  { code: 'R51', nameEn: 'Headache', nameId: 'Sakit Kepala' },
];

// ─── Seed Logic ───────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Memulai seeding data KRIZA...');

  // 1. Roles
  console.log('   → Membuat roles...');
  const createdRoles = {};
  for (const roleData of ROLES_DATA) {
    const existing = await db.select().from(roles).where(eq(roles.name, roleData.name)).limit(1);
    if (existing.length === 0) {
      const [role] = await db.insert(roles).values(roleData).returning();
      createdRoles[roleData.name] = role;
      console.log(`     ✓ Role '${roleData.name}' dibuat`);
    } else {
      createdRoles[roleData.name] = existing[0];
    }
  }

  // 2. Permissions
  console.log('   → Membuat permissions...');
  const createdPermissions = {};
  for (const permData of PERMISSIONS_DATA) {
    const existing = await db.select().from(permissions).where(eq(permissions.action, permData.action)).limit(1);
    if (existing.length === 0) {
      const [perm] = await db.insert(permissions).values(permData).returning();
      createdPermissions[permData.action] = perm;
    } else {
      createdPermissions[permData.action] = existing[0];
    }
  }
  console.log(`     ✓ ${PERMISSIONS_DATA.length} permissions siap`);

  // 3. Role Permissions
  console.log('   → Menetapkan permissions ke roles...');
  for (const [roleName, permActions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = createdRoles[roleName];
    if (!role) continue;
    for (const action of permActions) {
      const perm = createdPermissions[action];
      if (!perm) continue;
      try {
        await db.insert(rolePermissions).values({ roleId: role.id, permissionId: perm.id }).onConflictDoNothing();
      } catch { /* ignore */ }
    }
  }
  console.log('     ✓ Permissions dikonfigurasi');

  // 4. Admin user
  console.log('   → Membuat user admin default...');
  const existingAdmin = await db.select().from(users).where(eq(users.username, DEFAULT_ADMIN.username)).limit(1);
  if (existingAdmin.length === 0) {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
    const [adminUser] = await db.insert(users).values({
      username: DEFAULT_ADMIN.username,
      name: DEFAULT_ADMIN.name,
      passwordHash,
      email: DEFAULT_ADMIN.email,
    }).returning();

    const adminRole = createdRoles['admin'];
    if (adminRole) {
      await db.insert(userRoles).values({ userId: adminUser.id, roleId: adminRole.id }).onConflictDoNothing();
    }
    console.log(`     ✓ User admin dibuat`);
  }

  // 5. Master Poliklinik
  console.log('   → Menyiapkan Master Poliklinik (3 Poli)...');
  const createdPolys = {};
  for (const p of POLYCLINICS_DATA) {
    const existing = await db.select().from(polyclinics).where(eq(polyclinics.code, p.code)).limit(1);
    if (existing.length === 0) {
      const [poly] = await db.insert(polyclinics).values(p).returning();
      createdPolys[p.code] = poly;
      console.log(`     ✓ Poli '${p.name}' dibuat`);
    } else {
      createdPolys[p.code] = existing[0];
    }
  }

  // 6. Rate Types
  console.log('   → Menyiapkan Jenis Tarif (Rate Types)...');
  const createdRateTypes = {};
  for (const rt of RATE_TYPES_DATA) {
    const existing = await db.select().from(rateTypes).where(eq(rateTypes.code, rt.code)).limit(1);
    if (existing.length === 0) {
      const [rate] = await db.insert(rateTypes).values(rt).returning();
      createdRateTypes[rt.code] = rate;
      console.log(`     ✓ Tarif '${rt.name}' dibuat`);
    } else {
      createdRateTypes[rt.code] = existing[0];
    }
  }

  // 7. Drug Units
  console.log('   → Menyiapkan Satuan Obat (Drug Units)...');
  const createdUnits = {};
  for (const u of DRUG_UNITS_DATA) {
    const existing = await db.select().from(drugUnits).where(eq(drugUnits.code, u.code)).limit(1);
    if (existing.length === 0) {
      const [unit] = await db.insert(drugUnits).values(u).returning();
      createdUnits[u.code] = unit;
    } else {
      createdUnits[u.code] = existing[0];
    }
  }
  console.log(`     ✓ ${DRUG_UNITS_DATA.length} satuan obat siap`);

  // 8. Drugs
  console.log('   → Menyiapkan Katalog Obat Awal...');
  for (const d of DRUGS_DATA) {
    const existing = await db.select().from(drugs).where(eq(drugs.code, d.code)).limit(1);
    if (existing.length === 0) {
      const unit = createdUnits[d.unitCode];
      await db.insert(drugs).values({
        code: d.code,
        name: d.name,
        genericName: d.genericName,
        category: d.category,
        unitId: unit ? unit.id : null,
        basePrice: d.basePrice,
        sellingPrice: d.sellingPrice,
        minStock: d.minStock,
        currentStock: d.currentStock,
        requiresPrescription: d.requiresPrescription,
      });
    }
  }
  console.log(`     ✓ ${DRUGS_DATA.length} obat awal siap`);

  // 9. Practitioners & Schedules
  console.log('   → Menyiapkan Tenaga Medis & Jadwal Praktik...');
  for (const pr of PRACTITIONERS_DATA) {
    let prac = (await db.select().from(practitioners).where(eq(practitioners.code, pr.code)).limit(1))[0];
    if (!prac) {
      const [newPrac] = await db.insert(practitioners).values({
        code: pr.code,
        name: pr.name,
        title: pr.title,
        sip: pr.sip,
        specialization: pr.specialization,
        phone: pr.phone,
        email: pr.email,
      }).returning();
      prac = newPrac;
      console.log(`     ✓ Praktisi '${pr.name}' dibuat`);
    }

    const poly = createdPolys[pr.polyCode];
    if (poly && prac) {
      // Buat jadwal sample: Senin s/d Jumat jam 08:00 - 13:00
      const existingSched = await db.select().from(schedules).where(eq(schedules.practitionerId, prac.id)).limit(1);
      if (existingSched.length === 0) {
        for (let day = 1; day <= 5; day++) {
          await db.insert(schedules).values({
            practitionerId: prac.id,
            polyclinicId: poly.id,
            dayOfWeek: day,
            startTime: '08:00',
            endTime: '13:00',
            quota: 25,
          });
        }
        console.log(`       - Jadwal praktik disiapkan untuk ${pr.name}`);
      }
    }
  }

  // 10. Procedures & Service Rates
  console.log('   → Menyiapkan Tindakan & Tarif Layanan...');
  for (const proc of PROCEDURES_DATA) {
    let procRecord = (await db.select().from(procedures).where(eq(procedures.code, proc.code)).limit(1))[0];
    const poly = createdPolys[proc.polyCode];

    if (!procRecord) {
      const [newProc] = await db.insert(procedures).values({
        code: proc.code,
        name: proc.name,
        category: proc.category,
        polyclinicId: poly ? poly.id : null,
      }).returning();
      procRecord = newProc;

      // Buat tarif untuk UMUM dan BPJS
      const umumRate = createdRateTypes['UMUM'];
      const bpjsRate = createdRateTypes['BPJS'];
      if (umumRate) {
        await db.insert(serviceRates).values({
          procedureId: procRecord.id,
          rateTypeId: umumRate.id,
          tariff: proc.tariffUmum,
        });
      }
      if (bpjsRate) {
        await db.insert(serviceRates).values({
          procedureId: procRecord.id,
          rateTypeId: bpjsRate.id,
          tariff: proc.tariffBpjs,
        });
      }
    }
  }
  console.log(`     ✓ ${PROCEDURES_DATA.length} tindakan & tarif siap`);

  // 11. ICD-10 Standard Codes
  console.log('   → Menyiapkan Referensi Diagnosa ICD-10...');
  for (const icd of ICD10_DATA) {
    const existing = await db.select().from(icd10Codes).where(eq(icd10Codes.code, icd.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(icd10Codes).values(icd);
    }
  }
  console.log(`     ✓ ${ICD10_DATA.length} kode ICD-10 siap`);

  console.log('');
  console.log('✅ Seeding Master Data Fase 2 selesai!');
}

seed()
  .catch((err) => {
    console.error('❌ Seeding gagal:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
