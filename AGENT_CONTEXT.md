# KRIZA — Agent Context & Progress Log

> **WAJIB DIBACA** oleh AI agent di awal setiap sesi kerja sebelum menulis kode apapun.
> Dokumen ini adalah sumber kebenaran tunggal tentang status proyek saat ini.

---

## Identitas Proyek

| Property | Value |
|---|---|
| Nama Sistem | KRIZA — SIMRS/RME Klinik |
| Repository | `d:\Rizani\kriza` |
| Stack | React 18 + Vite 5 + JS / Fastify v5 + Node.js + JS / Drizzle ORM / PostgreSQL 16 |
| Arsitektur | Modular Monolith, npm workspaces |
| Environment saat ini | Development |

---

## Status Fase Saat Ini

| Fase | Nama | Status | Catatan |
|---|---|---|---|
| 0 | Scaffolding & Fondasi | 🟢 SELESAI | Semua file & deps terinstall, Vite build ✅ |
| 1 | Auth, RBAC, Audit Trail | 🟢 SELESAI | JWT midnight WIB, bcrypt, audit log, seed ✅ |
| 2 | Master Data | 🟢 SELESAI | Poli, Dokter, Jadwal, Tindakan/Tarif, Obat, ICD-10 ✅ |
| 3 | Manajemen Pasien | 🟢 SELESAI | Form lengkap 30+ field, Wilayah db_rizani, MRN gen ✅ |
| 4 | Registrasi & Antrian | 🟢 SELESAI | Pendaftaran poli, multi-source antrian, MJKN field ✅ |
| 5 | Encounter & Rekam Medis | 🟢 SELESAI | SOAP, TTV BMI, ICD-10, Tindakan, Rujukan & PCare ✅ |
| 6 | Resep & Farmasi | 🟢 SELESAI | 113 obat riil, Batch FEFO, Dispensing, Shift Log, SO ✅ |
| 7 | Billing & Pembayaran | 🟢 SELESAI | Tagihan auto-sync, Multi-payment, Struk/Kuitansi resmi ✅ |
| 8 | Laporan Operasional | 🟢 SELESAI | 6 Endpoint agregasi, Excel .xlsx export, print resmi ✅ |
| 9 | Integrasi BPJS | 🔴 BELUM MULAI | Ref: docs/bpjs-pcare-reference.md |
| 10 | Integrasi SATUSEHAT | 🔴 BELUM MULAI | |
| 11 | Hardening & Production | 🔴 BELUM MULAI | |

**Status key**: 🔴 BELUM MULAI | 🟡 IN PROGRESS | 🟢 SELESAI | ⚠️ BLOCKED

---

## Fase Aktif Saat Ini

**FASE 9 — Integrasi BPJS (P-Care & VClaim)** (Siap dimulai sesuai instruksi)

### Tasks Selesai (Fase 8 — Laporan Operasional):
- [x] Backend API Reports (`/api/v1/reports/*`): 6 endpoint teragregasi (overview, visits, revenue, morbidity, pharmacy, bpjs)
- [x] Zero-dependency Micro Visualizer (TrendBarChart, HorizontalBarMetric, SegmentedDistributionBar) menjaga bundle size & 0 error build
- [x] Ekspor Microsoft Excel (.xlsx) via dynamic import SheetJS
- [x] Modal cetak resmi ber-kop `CLINIC_INFO`, titi mangsa Paiton, dan print stylesheet `.printable-area`
- [x] Workspace frontend `ReportsPage.jsx` dengan 5 tab laporan lengkap, filter preset tanggal, dan menu navigasi aktif v0.8.0

---

## Informasi Resmi Klinik

> **WAJIB**: Selalu gunakan data dari `apps/web/src/lib/clinic-info.js` (`CLINIC_INFO`) sebagai **satu-satunya sumber kebenaran** untuk informasi klinik.
> JANGAN hardcode nama, alamat, atau kontak klinik di component manapun.

| Field | Nilai |
|---|---|
| Nama Singkat | **Klinik Rizani** |
| Nama Legal/Uppercase | **KLINIK RIZANI** |
| Alamat | Jalan Raya Surabaya - Situbondo KM 136 Sumberanyar Paiton |
| Telepon | (0335) 773204 |
| HP/WhatsApp | 081333352620 |
| Email | klinikrizani@gmail.com |
| Kota (tanda tangan) | Paiton |
| Logo path | `/icon_klinik.png` |

**Panduan import di semua dokumen cetak:**
```js
import { CLINIC_INFO, formatClinicContact } from '@/lib/clinic-info';
// CLINIC_INFO.name → "Klinik Rizani"
// CLINIC_INFO.legalName → "KLINIK RIZANI"
// CLINIC_INFO.address → "Jalan Raya Surabaya - Situbondo KM 136 Sumberanyar Paiton"
// formatClinicContact() → "TELP (0335) 773204 • HP 081333352620 • klinikrizani@gmail.com"
```

### Dokter Resmi Klinik
| Kode | Nama Praktisi | Spesialisasi | Unit Poli | Jadwal Standar |
|---|---|---|---|---|
| `DR-001` | **dr. M. Faisol Abdillah** | Dokter Umum | Poli Umum | Senin – Sabtu, 08:00 – 14:00 |
| `DR-002` | **dr. Fachrudin** | Dokter Umum | Poli Umum | Senin – Sabtu, 14:00 – 20:00 |
| `DR-003` | **Drg. Iqbal** | Dokter Gigi & Mulut | Poli Gigi | Senin – Sabtu, 08:00 – 14:00 |

---

## Keputusan Arsitektur yang Sudah Diambil


| Keputusan | Detail | Tanggal |
|---|---|---|
| Language: JavaScript only | User belum ahli TS, pakai JS untuk web dan api | 2026-08-31 |
| 3 Poli aktif | Poli Umum, Poli Gigi, Poli Kecantikan | 2026-08-31 |
| 3 Roles awal | admin, dokter, perawat (< 10 user total) | 2026-08-31 |
| Tidak ada sistem legacy | Tidak perlu migrasi data lama | 2026-08-31 |
| Tidak perlu rawat inap | Hanya rawat jalan | 2026-08-31 |
| Tidak perlu laboratorium | Di-skip | 2026-08-31 |
| Fastify v5 | Dipakai karena @fastify/cookie@11, cors@10, jwt@9 semua require v5 | 2026-08-31 |
| npm --legacy-peer-deps | Harus dipakai saat install karena ada peer dep conflict | 2026-08-31 |
| Auth: Single JWT, expire tengah malam WIB | User tidak mau auto-logout — login sekali pagi, session valid seharian | 2026-09-01 |
| No refresh token | Sengaja dihilangkan — tidak butuh kompleksitas ini | 2026-09-01 |
| JWT di httpOnly cookie | Aman dari XSS, browser auto-attach | 2026-09-01 |
| Password: bcryptjs | Pure JS, no native bindings, aman untuk Windows dev | 2026-09-01 |

### Masih Open (Perlu Konfirmasi Owner Klinik)
1. Format nomor rekam medis (akan diinfokan nanti)
2. Kredensial BPJS API (akan diinfokan nanti)
3. Kredensial SATUSEHAT (akan diinfokan nanti)

---

## Struktur File Penting

```
kriza/
├── .env                         ← Konfigurasi local (JANGAN commit)
├── .env.example                 ← Template env (commit ini)
├── docker-compose.yml           ← PostgreSQL dev container
├── package.json                 ← Root workspace config
├── README.md                    ← Instruksi setup
├── AGENT_CONTEXT.md             ← File ini
├── apps/
│   ├── api/
│   │   ├── package.json         ← fastify v5, drizzle-orm, pg, zod
│   │   ├── nodemon.json         ← Watch config untuk dev
│   │   ├── drizzle.config.js    ← Drizzle-kit config
│   │   └── src/
│   │       ├── app.js           ← Fastify builder (plugins, routes, error handler)
│   │       ├── server.js        ← Entry point (test DB conn, listen)
│   │       ├── config/
│   │       │   └── env.js       ← Env validation dengan Zod
│   │       └── db/
│   │           ├── index.js     ← Pool + Drizzle instance
│   │           ├── migrate.js   ← Migration runner
│   │           └── schema/
│   │               └── index.js ← Schema index (diisi per fase)
│   └── web/
│       ├── package.json         ← React, Vite, TanStack Query, RHF, Tailwind
│       ├── vite.config.js       ← Path alias @/, proxy /api → :3001
│       ├── jsconfig.json        ← Path alias untuk editor
│       ├── tailwind.config.js   ← Tailwind + CSS variables untuk shadcn/ui
│       ├── components.json      ← shadcn/ui config (tsx: false = mode JS)
│       ├── index.html           ← HTML entry point
│       └── src/
│           ├── main.jsx         ← React entry, QueryClient, BrowserRouter
│           ├── App.jsx          ← Root router
│           ├── index.css        ← Tailwind + CSS design tokens
│           ├── lib/
│           │   ├── utils.js     ← cn() utility untuk Tailwind
│           │   └── api-client.js ← Axios instance dengan interceptors
│           ├── components/ui/   ← shadcn/ui components (JS)
│           │   ├── button.jsx
│           │   ├── card.jsx
│           │   ├── input.jsx
│           │   ├── badge.jsx
│           │   └── label.jsx
│           ├── features/
│           │   └── dashboard/
│           │       └── DashboardPage.jsx ← Dashboard placeholder
│           └── pages/
│               └── NotFoundPage.jsx
└── packages/
    └── shared/
        ├── package.json
        └── index.js             ← Domain constants (status enums, dll)
```

---

## Database Schema yang Sudah Ada

| Table | Fase | Migration File | Status |
|---|---|---|---|
| `users` | 1 | `0000_abandoned_pete_wisdom.sql` | ✅ Migrated & Seeded |
| `roles` | 1 | `0000_abandoned_pete_wisdom.sql` | ✅ Migrated & Seeded |
| `permissions` | 1 | `0000_abandoned_pete_wisdom.sql` | ✅ Migrated & Seeded |
| `role_permissions` | 1 | `0000_abandoned_pete_wisdom.sql` | ✅ Migrated & Seeded |
| `user_roles` | 1 | `0000_abandoned_pete_wisdom.sql` | ✅ Migrated & Seeded |
| `audit_logs` | 1 | `0000_abandoned_pete_wisdom.sql` | ✅ Migrated |
| `polyclinics` | 2 | `0001_goofy_millenium_guard.sql` | ✅ Migrated & Seeded (3 Poli) |
| `practitioners` | 2 | `0001_goofy_millenium_guard.sql` | ✅ Migrated & Seeded |
| `schedules` | 2 | `0001_goofy_millenium_guard.sql` | ✅ Migrated & Seeded |
| `procedures` | 2 | `0001_goofy_millenium_guard.sql` | ✅ Migrated & Seeded |
| `rate_types` | 2 | `0001_goofy_millenium_guard.sql` | ✅ Migrated & Seeded (Umum, BPJS, Asuransi) |
| `service_rates` | 2 | `0001_goofy_millenium_guard.sql` | ✅ Migrated & Seeded |
| `drug_units` | 2 | `0001_goofy_millenium_guard.sql` | ✅ Migrated & Seeded (8 Satuan) |
| `drugs` | 2 | `0001_goofy_millenium_guard.sql` | ✅ Migrated & Seeded (10 Obat) |
| `icd10_codes` | 2 | `0001_goofy_millenium_guard.sql` | ✅ Migrated & Seeded (15 Kasus Utama) |
| `provinsi` | 3 | `0002_charming_pixie.sql` | ✅ Migrated & Seeded (70 Provinsi dari db_rizani) |
| `kabupaten` | 3 | `0002_charming_pixie.sql` | ✅ Migrated & Seeded (327 Kabupaten dari db_rizani) |
| `kecamatan` | 3 | `0002_charming_pixie.sql` | ✅ Migrated & Seeded (1252 Kecamatan dari db_rizani) |
| `kelurahan` | 3 | `0002_charming_pixie.sql` | ✅ Migrated & Seeded (3381 Kelurahan dari db_rizani) |
| `patients` | 3 | `0002_charming_pixie.sql` | ✅ Migrated (Lengkap 37 kolom) |
| `patient_allergies` | 3 | `0002_charming_pixie.sql` | ✅ Migrated |
| `patient_emergency_contacts` | 3 | `0002_charming_pixie.sql` | ✅ Migrated |

---

## API Endpoints yang Sudah Ada

| Method | Path | Deskripsi | Auth Required | Status |
|---|---|---|---|---|
| GET | `/health` | Health check | ❌ | ✅ Verified Online |
| POST | `/api/v1/auth/login` | Login user & issue midnight JWT cookie | ❌ | ✅ Implemented |
| POST | `/api/v1/auth/logout` | Logout user & clear cookie | ✅ | ✅ Implemented |
| GET | `/api/v1/auth/me` | Dapatkan info user yang sedang login | ✅ | ✅ Implemented |
| GET, POST | `/api/v1/master/polyclinics` | List & create poliklinik | ✅ | ✅ Implemented |
| GET, PUT, DELETE | `/api/v1/master/polyclinics/:id` | Detail, edit, delete poliklinik | ✅ | ✅ Implemented |
| GET, POST | `/api/v1/master/practitioners` | List & create dokter/nakes | ✅ | ✅ Implemented |
| GET, PUT, DELETE | `/api/v1/master/practitioners/:id` | Detail, edit, delete dokter | ✅ | ✅ Implemented |
| GET, POST | `/api/v1/master/schedules` | List & create jadwal praktik | ✅ | ✅ Implemented |
| PUT, DELETE | `/api/v1/master/schedules/:id` | Edit, delete jadwal praktik | ✅ | ✅ Implemented |
| GET, POST | `/api/v1/master/procedures` | List & create tindakan/layanan + tarif | ✅ | ✅ Implemented |
| GET, PUT, DELETE | `/api/v1/master/procedures/:id` | Detail, edit, delete tindakan | ✅ | ✅ Implemented |
| GET, POST | `/api/v1/master/drugs` | List & create obat | ✅ | ✅ Implemented |
| GET, PUT, DELETE | `/api/v1/master/drugs/:id` | Detail, edit, delete obat | ✅ | ✅ Implemented |
| GET | `/api/v1/master/rate-types` | List jenis tarif | ✅ | ✅ Implemented |
| GET | `/api/v1/master/drug-units` | List satuan obat | ✅ | ✅ Implemented |
| GET | `/api/v1/master/icd10` | Search standar diagnosa ICD-10 | ✅ | ✅ Implemented |
| GET, POST | `/api/v1/patients` | List paginated search & registrasi pasien baru | ✅ | ✅ Implemented |
| GET | `/api/v1/patients/next-mrn` | Auto generate nomor rekam medis berikutnya | ✅ | ✅ Implemented |
| GET, PUT, DELETE | `/api/v1/patients/:id` | Detail, update, & soft delete data pasien | ✅ | ✅ Implemented |
| GET | `/api/v1/wilayah/provinsi` | Daftar seluruh provinsi | ✅ | ✅ Implemented |
| GET | `/api/v1/wilayah/kabupaten/:provinsiId` | Daftar kabupaten per provinsi | ✅ | ✅ Implemented |
| GET | `/api/v1/wilayah/kecamatan/:kabupatenId` | Daftar kecamatan per kabupaten | ✅ | ✅ Implemented |
| GET | `/api/v1/wilayah/kelurahan/:kecamatanId` | Daftar kelurahan per kecamatan | ✅ | ✅ Implemented |

---

## Log Sesi Kerja

### [2026-08-31] — Sesi 1: Scaffolding (Fase 0)
- ✅ Implementation plan + AGENT_CONTEXT dibuat
- ✅ Root monorepo: package.json workspace, docker-compose.yml, .gitignore, .env.example
- ✅ apps/api: app.js (Fastify v5), server.js, config/env.js, db/index.js, schema, migrate.js, drizzle.config.js
- ✅ apps/web: vite.config.js, jsconfig.json, tailwind, components.json, index.html, main.jsx, App.jsx
- ✅ UI components: button, card, input, badge, label
- ✅ packages/shared: domain constants
- ✅ Vite build berhasil (1743 modules)

### [2026-09-01] — Sesi 2: Auth, RBAC, Audit (Fase 1)
- ✅ Keputusan auth: JWT tunggal expire tengah malam WIB, no refresh token
- ✅ env.js disederhanakan: JWT_SECRET + CLINIC_TIMEZONE_OFFSET
- ✅ Drizzle schema: users, roles, permissions, role_permissions, user_roles, audit_logs
- ✅ Migration SQL generated (0000_abandoned_pete_wisdom.sql) + indexes ditambahkan manual
- ✅ shared/utils/token.js: kalkulasi getNextMidnight() WIB
- ✅ shared/utils/audit.js: fire-and-forget audit logging
- ✅ auth.repository.js, auth.service.js, auth.routes.js
- ✅ app.js diupdate: register @fastify/cookie, @fastify/jwt, authenticate decorator
- ✅ seed.js: 3 roles, 20 permissions, 1 admin user (Admin@KRIZA2024)
- ✅ Frontend: AuthContext.jsx, ProtectedRoute.jsx, LoginPage.jsx
- ✅ main.jsx + App.jsx diupdate dengan auth flow
- ✅ Dashboard diupdate: tampilkan nama user, logout button, daftar poli
- ✅ Migrasi & seed ke PostgreSQL Dokploy dev berhasil

### [2026-09-01] — Sesi 3: Master Data Klinik (Fase 2)
- ✅ Drizzle schema: polyclinics, practitioners, schedules, procedures, rate_types, service_rates, drug_units, drugs, icd10_codes
- ✅ Migration generated (0001_goofy_millenium_guard.sql) + performance indexes ditambahkan
- ✅ Migrasi dieksekusi ke PostgreSQL Dokploy (`npm run db:migrate`)
- ✅ Seed script diupdate & dieksekusi (`npm run db:seed`): 3 Poli, 3 Dokter, Jadwal Praktik, 12 Tindakan & Tarif, 8 Satuan Obat, 10 Katalog Obat, 15 Kode Diagnosa ICD-10
- ✅ Master Data Repository, Service (dengan audit log), dan Zod Schemas
- ✅ Master Data Routes Fastify di `/api/v1/master/*` terproteksi auth
- ✅ Frontend: MasterDataPage.jsx (Tabs Poli, Dokter & Jadwal, Tindakan & Tarif, Obat, ICD-10) lengkap dengan dialog modals untuk CRUD dan live state TanStack Query
- ✅ Frontend UI components: dialog.jsx, table.jsx
- ✅ Vite build berhasil tanpa error

### [2026-09-01] — Sesi 4: Manajemen Pasien & Wilayah db_rizani (Fase 3)
- ✅ Import seluruh data wilayah dari db_rizani: 70 Provinsi, 327 Kabupaten, 1252 Kecamatan, 3381 Kelurahan
- ✅ Drizzle schema: provinsi, kabupaten, kecamatan, kelurahan, patients (37 fields lengkap sesuai form klinik), patient_allergies, patient_emergency_contacts
- ✅ Migration generated (0002_charming_pixie.sql) + indexes untuk pencarian MRN, NIK, Nama, HP, BPJS, Wilayah FK
- ✅ Migrasi & seed wilayah dieksekusi (`npm run db:migrate` & `node src/db/seed-wilayah.js`)
- ✅ MRN sequential generator utility (`generateNextMedicalRecordNumber`)
- ✅ Patients & Wilayah Repository, Service, Zod Schemas, dan Fastify Routes
- ✅ Frontend: PatientsPage.jsx dengan form lengkap (semua 4 baris & 20+ field sesuai gambar), kalkulasi umur otomatis dari tanggal lahir, cascade dropdown wilayah (Provinsi -> Kab -> Kec -> Kel), multi-field search instant, modal detail rekam medis, dan total live count di dashboard
- ✅ UI Refinement: Dedicated Navbar layout (`AppLayout.jsx`) & Formulir Pasien diubah menjadi Expandable Card yang luas di atas tabel pencarian (tanpa dibatasi ukuran modal)
- ✅ UI Refinement: Komponen `SearchableSelect.jsx` (Combobox dengan live search) untuk pencarian cepat Provinsi, Kabupaten/Kota, Kecamatan, dan Kelurahan/Desa
- ✅ Database Normalization: Eksekusi script deduplikasi hierarkis (`clean-wilayah-duplicates.js`). Menghapus 19 duplikat provinsi (JAWA TIMUR, DKI, dll) dan meremap FK anak (kabupaten/kecamatan/kelurahan/pasien) ke ID utama kanonikal, menghasilkan 38 provinsi bersih, 274 kabupaten, 1203 kecamatan, dan 3192 kelurahan.
- ✅ Vite build berhasil 100% (1773 modules)
- 🔜 Siap lanjut ke Fase 4: Registrasi Kunjungan & Antrian Poli

### [2026-09-01] — Sesi 5: Fase 4 — Registrasi Kunjungan & Antrian Poli
- ✅ Database Schema: `registrations` (33 col, termasuk field MJKN bridging: mjknBookingCode, mjknAppointmentDate, mjknAppointmentTime, mjknQueueNumber, mjknRawPayload), `queues`, `queue_calls` + migration `0003_groovy_roxanne_simpson.sql`
- ✅ Generator: `registration-number.generator.js` → No. Registrasi `REG-YYYYMMDD-XXXX` + No. Antrian `A-001/B-001/C-001` per poli per hari
- ✅ Repository: getRegistrations, getRegistrationById, createRegistration, createQueue, updateRegistration, updateQueueStatus, getTodayQueues, findActiveRegistrationToday (duplikat check), countActiveRegistrationsForDoctor (kuota check), isFirstVisit (BARU/LAMA detection), logQueueCall
- ✅ Service: validasi duplikat aktif harian, validasi kuota dokter, auto-detect BARU/LAMA, MJKN queue prefix, cancel cascade, queue action transitions (PANGGIL/PANGGIL_ULANG/PERIKSA/SELESAI/LEWAT), processMjknBooking() placeholder
- ✅ Zod Schema: createRegistrationSchema (semua sumber: LANGSUNG, TELEPON, MJKN, ONLINE_OWN), updateRegistrationSchema, cancelRegistrationSchema, updateQueueStatusSchema, listRegistrationQuerySchema, forceRegister override
- ✅ Routes: 9 endpoints termasuk /mjkn-webhook (501 placeholder siap aktivasi saat bridging)
- ✅ Frontend: RegistrationsPage.jsx — form multi-source (conditional MJKN fields, BPJS fields, asuransi fields, force register), patient search, poli/dokter selector, ticket slip overlay, tab daftar kunjungan + tab monitor antrian kartu, aksi inline (Panggil/Periksa/Selesai/Lewat/Batal)
- ✅ Nav item "Pendaftaran & Antrian" aktif di AppLayout, versi diupdate ke v0.4.0
- ✅ Vite build berhasil 100% (1774 modules)

### [2026-09-01] — Sesi 6: Fase 5 — Rekam Medis Elektronik (RME SOAP), Tindakan & Sistem Rujukan (PCare Ready)
- ✅ Database Schema: `encounters` (15 col, PMK 24/2022 locking & amendment), `vital_signs` (18 col, auto-BMI calculation, consciousness PCare, triage), `soap_notes` (10 col), `encounter_diagnoses` (8 col, multi-item ICD-10 with Primary/Secondary & Kasus Baru/Lama), `encounter_procedures` (9 col, quantity & tariff), `encounter_referrals` (26 col, internal consult & external referral + BPJS PCare bridging fields: pcareNoRujukan, pcareTaccCode, pcareTaccReason), `encounter_dispositions` (7 col)
- ✅ Migration generated: `0004_curved_sersi.sql`
- ✅ Generator: `referral-number.generator.js` → Nomor Rujukan Medis `RUJ-YYYYMMDD-XXXX` unik harian
- ✅ Repository: `encounters.repository.js` (doctor queue, encounter detail with full joins, vital signs upsert with BMI, SOAP upsert, diagnoses/procedures CRUD, disposition/referral upsert, referral print query)
- ✅ Service: `encounters.service.js` (auto-BMI calculation & nutritional categories, PMK 24/2022 locking validation, auto-create registration for internal consult, finalize lock with registration/queue status transition to SELESAI, medical amendment workflow, and PCare encounter payload builder)
- ✅ Zod Schemas: `encounters.schema.js` (start, vital signs, soap, diagnoses, procedures, disposition & referral, finalize, amend, list query)
- ✅ Routes: `encounters.routes.js` (14 endpoints) & `referrals.routes.js` (2 endpoints) registered in `app.js`
- ✅ Frontend: `EncountersPage.jsx` (Doctor Queue, patient search, polyclinic filter, stats cards, quick launch), `EncounterWorkspace.jsx` (4-panel clinical RME workspace with TTV auto-BMI visual badge, SOAP with quick presets, ICD-10 combobox, procedures with tariff calc, internal & external referral forms + PCare parameters, autosave draft, and PMK 24/2022 finalize locking), and `ReferralLetterModal.jsx` (Official medical referral letter print preview with letterhead, patient summary, TTV, ICD-10, and doctor signature block)
- ✅ Nav item "Rekam Medis (EMR)" aktif di AppLayout, versi diupdate ke v0.5.0
- ✅ Vite build berhasil 100% (1779 modules)

### [2026-09-02] — Sesi 7: Fase 6 — Modul Farmasi & Manajemen Obat
- ✅ Database Schema: `suppliers`, `drug_prices` (multi-tier pricing ready), `drug_batches` (lot/batch tracking with expiry date for FEFO), `shift_stock_logs` & `shift_stock_log_items` (digitalisasi pemantauan shift harian klinik Rizani), `prescriptions` & `prescription_items` (resep elektronik dari dokter), `drug_stock_movements` (append-only mutasi stok), `stock_opnames` & `stock_opname_items` (SO bulanan) + migration `0005_nostalgic_ted_forrester.sql`
- ✅ Seeding: `pharmacy.seed.js` mengekstrak dan mengimpor **113 item obat riil** lengkap dengan bentuk sediaan, signa default, satuan, stok awal, dan batch saldo awal per Agustus 2026 dari spreadsheet klinik Rizani.
- ✅ Repository: `pharmacy.repository.js` (FEFO batch auto-allocation, atomic inventory transactions, shift monitoring, stock opname adjustments, live dashboard stats).
- ✅ Service: `pharmacy.service.js` (Prescription generator `RES-YYYYMMDD-XXXX`, multi-tier fallback pricing resolver, atomic dispensing with auto-shift synchronization, shift open/close state machine, and SO variance auto-reconciliation).
- ✅ Routes: `pharmacy.routes.js` (23 endpoints) terdaftar di `/api/v1/pharmacy` Fastify.
- ✅ Frontend Hub: `PharmacyPage.jsx` dengan 4 sub-tab utama:
  1. `PrescriptionsQueueTab.jsx`: antrian resep pasien real-time, status filter (Pending / Dispensed / All), detail dispensing & verifikasi obat.
  2. `DrugStocksTab.jsx`: tabel stok 113 obat dengan filter sediaan, filter stok kritis, panel detail batch aktif FEFO, modal penerimaan batch baru, modal penyesuaian stok manual.
  3. `ShiftMonitoringTab.jsx`: spreadsheet monitor stok shift harian (Pagi/Siang/Malam), input pemakaian non-shift manual, koreksi, auto-sum stok akhir real-time, dan histori shift lampau.
  4. `StockOpnameTab.jsx`: pembuatan sesi SO baru, lembar hitung fisik dengan kalkulasi selisih warna otomatis, dan tombol finalisasi SO yang otomatis meng-adjust stok batch.
  5. `PrintEtiketModal.jsx`: template cetak etiket obat resmi stiker pasien.
  6. `EncounterPrescriptionTab.jsx`: terintegrasi langsung ke `EncounterWorkspace.jsx` agar dokter dapat menulis dan mengirimkan resep elektronik langsung saat pemeriksaan SOAP.
- ✅ Nav item "Farmasi & Obat" aktif di AppLayout, versi diupdate ke v0.6.0.
- ✅ Vite build production berhasil 100% (1789 modules).

---

## Instruksi untuk Agent Berikutnya

1. **Baca file ini sampai habis** sebelum mengerjakan apapun
2. **ATURAN KETAT GIT:** JANGAN PERNAH melakukan `git commit` dan `git push` sebelum USER MEMINTA SECARA EKSPLISIT.
3. **Git Branching Strategy:** Jika diminta commit & push oleh user, SELALU lakukan ke branch `dev`. Branch `main` diproteksi (*protected*).
4. **Fase aktif selanjutnya adalah FASE 8** — Laporan Operasional
5. **Update dokumen ini** setelah setiap task selesai
6. **Gunakan database Dokploy yang sudah aktif di `.env`**
7. **Update "Log Sesi Kerja"** setelah sesi selesai
8. **INFO KLINIK:** SELALU gunakan `CLINIC_INFO` dari `apps/web/src/lib/clinic-info.js`. JANGAN hardcode nama/alamat/kontak klinik di mana pun. Lihat section "Informasi Resmi Klinik" di atas.
9. **PRINT BEHAVIOR:** Semua modal cetak wajib menggunakan class `printable-area` pada div konten yang ingin dicetak. Class ini diatur oleh `@media print` di `index.css` sehingga hanya area tersebut yang tercetak — bukan screenshot seluruh layar.

### [2026-09-07] — Sesi 9: Hotfix UI — Badge Hover & Button Precision + Info Klinik
- ✅ `button.jsx`: Tambah varian `size="xs"` (`h-7 rounded-md px-2.5 text-xs gap-1`) ke CVA sehingga tidak jatuh ke default padding
- ✅ `badge.jsx`: Hapus `hover:bg-primary/80` dari semua variant (badge status informasional tidak boleh berubah warna saat hover). Tambah varian `info`, `purple` untuk status antrian. Refactor `success` → emerald (konsisten dark mode).
- ✅ `MasterDataPage.jsx`, `EncountersPage.jsx`, `PatientsPage.jsx`: Ganti inline className hack dengan semantic variant (`success`, `warning`, `info`, `purple`)
- ✅ Buat `apps/web/src/lib/clinic-info.js` — sumber kebenaran tunggal data resmi Klinik Rizani (nama, alamat, telp, HP, email)
### [2026-09-10] — Sesi 10: Fase 8 — Laporan Operasional & Analitik
- ✅ Backend: `reports.schema.js`, `reports.repository.js`, `reports.service.js`, `reports.routes.js` (6 endpoint: overview, visits, revenue, morbidity, pharmacy, bpjs)
- ✅ Registered `/api/v1/reports` di `app.js` terproteksi auth sesi JWT
- ✅ Micro Visualizer: `ReportVisuals.jsx` (TrendBarChart native SVG, HorizontalBarMetric, SegmentedDistributionBar) — 0 dependencies, 0 bundle bloat, zero-lag render
- ✅ Ekspor Microsoft Excel (.xlsx): `export-excel.js` dengan dynamic import `xlsx` (code-split, tidak membebani initial bundle)
- ✅ Modal Cetak Resmi: `ReportPrintModal.jsx` menggunakan `CLINIC_INFO`, logo resmi, class `.printable-area`, dan titi mangsa Paiton
- ✅ Frontend Workspace: `ReportsPage.jsx` dengan 5 tab laporan terpadu:
  1. `VisitsReportTab.jsx`: volume kunjungan harian, distribusi poli, filter pasien baru/lama, penjamin, tabel registrasi
  2. `RevenueReportTab.jsx`: omzet kasir, penerimaan vs piutang, metode bayar (Tunai, QRIS, Transfer, Debit, BPJS), tabel kuitansi
  3. `MorbidityReportTab.jsx`: 10 & 20 besar diagnosa ICD-10 WHO, kasus baru vs lama, persentase
  4. `PharmacyReportTab.jsx`: valuasi aset obat (HNA & jual), top obat diresepkan, radar stok kritis & mendekati ED (< 90 hari)
  5. `BpjsReportTab.jsx`: rekonsiliasi pelayanan BPJS faskes primer, rasio rujukan keluar (indikator KBK), audit diagnosa
- ✅ Menu navigasi "Laporan" aktif di `AppLayout.jsx`, versi sistem dinaikkan ke `v0.8.0`
- ✅ Vite production build berhasil 100% tanpa error (4.80s)
- 🔜 Siap lanjut ke Fase 9: Integrasi BPJS (P-Care & VClaim)

---

*Last updated: 2026-09-10 | Updated by: Agent (Sesi 10 — Fase 8 Laporan Operasional)*
