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
| 4 | Registrasi & Antrian | 🔴 BELUM MULAI | Fase berikutnya |
| 5 | Encounter & Rekam Medis | 🔴 BELUM MULAI | |
| 6 | Resep & Farmasi | 🔴 BELUM MULAI | |
| 7 | Billing & Pembayaran | 🔴 BELUM MULAI | |
| 8 | Laporan Operasional | 🔴 BELUM MULAI | |
| 9 | Integrasi BPJS | 🔴 BELUM MULAI | |
| 10 | Integrasi SATUSEHAT | 🔴 BELUM MULAI | |
| 11 | Hardening & Production | 🔴 BELUM MULAI | |

**Status key**: 🔴 BELUM MULAI | 🟡 IN PROGRESS | 🟢 SELESAI | ⚠️ BLOCKED

---

## Fase Aktif Saat Ini

**FASE 4 — Registrasi Kunjungan & Manajemen Antrian Poli**

### Tasks yang Harus Dilakukan (Fase 4)

- [ ] Schema + migrate: `registrations` (kunjungan pasien ke poli, dokter, tipe bayar: umum/bpjs/asuransi)
- [ ] Schema + migrate: `queues` (nomor antrian per poli, per hari, status: MENUNGGU, DIPANGGIL, DIPERIKSA, SELESAI, BATAL)
- [ ] Generator nomor antrian per poli (misal: A-001 Poli Umum, B-001 Poli Gigi, C-001 Poli Estetika)
- [ ] Validasi kuota jadwal praktik dokter hari itu
- [ ] Cek status kunjungan: Pasien Baru vs Pasien Lama
- [ ] CRUD API Registrasi Kunjungan Pasien
- [ ] API Panggil Antrian & Update Status Antrian Real-time
- [ ] Frontend: Halaman Pendaftaran Rawat Jalan & Cetak/Lihat Tiket Antrian
- [ ] Frontend: Display Antrian Pasien per Poli (Live Queue Board)

### Kriteria Fase 4 Selesai
- Pendaftaran pasien ke poli menghasilkan nomor antrian berurutan
- Status antrian dapat diperbarui (Panggil -> Periksa -> Selesai)
- Kuota harian dokter divalidasi secara otomatis

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

---

## Instruksi untuk Agent Berikutnya

1. **Baca file ini sampai habis** sebelum mengerjakan apapun
2. **Git Branching Strategy:** SELALU lakukan commit dan push ke branch `dev`. Branch `main` diproteksi (*protected*) dan tidak menerima push langsung.
3. **Fase aktif sekarang adalah FASE 5** — Rekam Medis Elektronik (RME / EMR SOAP) & Encounter
4. **Update dokumen ini** setelah setiap task selesai
5. **Gunakan database Dokploy yang sudah aktif di `.env`**
6. **Update "Log Sesi Kerja"** setelah sesi selesai

---

*Last updated: 2026-09-01 | Updated by: Agent (Fase 4 Selesai)*
