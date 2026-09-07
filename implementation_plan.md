# KRIZA — SIMRS Clinic Implementation Plan

> **Target**: Lightweight, production-oriented SIMRS/RME untuk klinik Indonesia  
> **Stack**: React + Vite + TS | Fastify + Node.js + TS | Drizzle ORM | PostgreSQL  
> **Architecture**: Modular Monolith, single repository  
> **Referensi progress harian**: lihat `AGENT_CONTEXT.md` di root project

---

## Prinsip Pengerjaan

1. **Incremental** — setiap fase harus bisa di-deploy dan berfungsi sebelum lanjut ke fase berikutnya
2. **Database-first** — skema DB dirancang untuk domain nyata, bukan UI
3. **Security non-negotiable** — auth, RBAC, audit trail adalah fondasi, bukan afterthought
4. **No ghost features** — jangan implement sesuatu yang belum ada use case nyatanya
5. **Agent continuity** — setiap sesi AI agent WAJIB baca `AGENT_CONTEXT.md` sebelum menulis kode

---

## Fase 0 — Project Scaffolding & Fondasi Arsitektur
**Estimasi**: 1-2 sesi kerja  
**Prasyarat**: Tidak ada  
**Deliverable**: Repo berjalan, struktur folder terbentuk, dev environment siap

### Tasks
- [ ] Inisialisasi monorepo dengan struktur `apps/web` dan `apps/api`
- [ ] Setup Vite + React + TypeScript untuk frontend
- [ ] Setup Fastify + TypeScript untuk backend
- [ ] Setup Drizzle ORM + konfigurasi koneksi PostgreSQL
- [ ] Setup Docker Compose untuk PostgreSQL development
- [ ] Konfigurasi ESLint + Prettier + shared TypeScript config
- [ ] Setup path aliases (`@/` untuk web, `~/` untuk api)
- [ ] Setup environment variable management (`.env.example`, validasi env dengan Zod)
- [ ] Setup dasar Tailwind CSS + shadcn/ui
- [ ] Buat struktur folder modular untuk backend dan frontend
- [ ] Setup Drizzle migrations workflow
- [ ] Buat `AGENT_CONTEXT.md` di root project

### Struktur Folder Target

```
kriza/
├── apps/
│   ├── web/                    # React + Vite + TS
│   │   ├── src/
│   │   │   ├── features/       # Feature-based modules
│   │   │   │   ├── auth/
│   │   │   │   ├── patients/
│   │   │   │   ├── registration/
│   │   │   │   └── ...
│   │   │   ├── components/     # Shared UI components
│   │   │   ├── lib/            # Utilities, api client
│   │   │   ├── hooks/          # Shared hooks
│   │   │   └── routes/         # React Router routes
│   │   └── ...
│   └── api/                    # Fastify + Node.js + TS
│       ├── src/
│       │   ├── modules/        # Domain modules
│       │   │   ├── auth/
│       │   │   │   ├── auth.routes.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── auth.repository.ts
│       │   │   │   └── auth.schema.ts
│       │   │   ├── patients/
│       │   │   ├── registration/
│       │   │   ├── encounters/
│       │   │   ├── pharmacy/
│       │   │   ├── billing/
│       │   │   └── reports/
│       │   ├── integrations/
│       │   │   ├── bpjs/
│       │   │   └── satusehat/
│       │   ├── db/
│       │   │   ├── schema/     # Drizzle schema per domain
│       │   │   ├── migrations/
│       │   │   └── index.ts
│       │   ├── shared/
│       │   │   ├── middleware/
│       │   │   ├── plugins/
│       │   │   └── utils/
│       │   └── app.ts
│       └── ...
├── packages/
│   └── shared/                 # Shared types antara web & api
├── docker-compose.yml
├── AGENT_CONTEXT.md            # ← Agent wajib baca ini setiap sesi
└── package.json                # Root package.json (workspace)
```

---

## Fase 1 — Authentication, RBAC, dan Audit Trail
**Estimasi**: 2-3 sesi kerja  
**Prasyarat**: Fase 0 selesai  
**Deliverable**: Login/logout berjalan, roles/permissions aktif, audit log tercatat

### Database Schema
- `users` — akun sistem (bukan pasien)
- `roles` — doctor, nurse, admin, pharmacist, cashier, dll
- `permissions` — granular actions
- `role_permissions` — many-to-many
- `user_roles` — many-to-many
- `sessions` — token management (atau JWT dengan refresh token)
- `audit_logs` — append-only, immutable audit trail

### Tasks
- [ ] Desain dan migrate schema auth + audit
- [ ] Implementasi password hashing (argon2)
- [ ] Implementasi JWT (access token short-lived + refresh token httpOnly cookie)
- [ ] Fastify auth plugin (`fastify-jwt` atau custom)
- [ ] RBAC middleware — validasi permission per route
- [ ] Audit trail service — utility untuk log create/update/delete/auth events
- [ ] Endpoint: POST /auth/login, POST /auth/logout, POST /auth/refresh
- [ ] Endpoint: GET /auth/me
- [ ] Frontend: halaman login, context/store auth state
- [ ] Frontend: ProtectedRoute component
- [ ] Seed data: default roles, default admin user

### Security Requirements
- Refresh token harus disimpan sebagai httpOnly secure cookie
- Access token jangan disimpan di localStorage
- Rate limiting pada endpoint auth
- Password minimum requirements
- Audit setiap login success, login failed, logout, token refresh

---

## Fase 2 — Master Data
**Estimasi**: 1-2 sesi kerja  
**Prasyarat**: Fase 1 selesai  
**Deliverable**: Data referensi klinik dapat di-manage

### Domain
- **Poli/Unit Layanan**: poli umum, poli gigi, poli KIA, dll
- **Jadwal Praktik**: dokter mana, poli mana, hari/jam berapa, kuota
- **Tenaga Medis/Staf**: profil dokter, SIP, spesialisasi
- **ICD-10** (diagnosa) — import dari dataset
- **Tindakan/Prosedur** — custom klinik + standar
- **Obat/Farmasi**: katalog obat awal (dipakai farmasi nanti)
- **Tarif**: tarif tindakan, tarif konsultasi (umum vs BPJS)

### Tasks
- [ ] Schema + migrate: `polyclinics`, `practitioners`, `schedules`, `schedule_slots`
- [ ] Schema + migrate: `icd10_codes`, `procedures`, `drugs`, `drug_units`
- [ ] Schema + migrate: `service_rates`, `rate_types` (umum/bpjs)
- [ ] CRUD API untuk semua master data di atas
- [ ] Frontend: halaman manajemen master data (admin only)
- [ ] Import ICD-10 dataset (script seeder)
- [ ] Pagination + search untuk list master data

---

## Fase 3 — Manajemen Pasien
**Estimasi**: 2-3 sesi kerja  
**Prasyarat**: Fase 2 selesai  
**Deliverable**: Registrasi pasien baru dan pencarian pasien berfungsi

### Database Schema
- `patients` — data demografi lengkap
- `patient_identities` — NIK, nomor BPJS, passport, dll (one-to-many)
- `patient_contacts` — emergency contact, kontak alternatif
- `patient_addresses` — alamat (support multiple)

### Key Fields patients
- `medical_record_number` — generated, unique, indexed
- `name`, `date_of_birth`, `gender`
- `nik` (indexed, unique per non-null)
- `bpjs_number` (indexed)
- `blood_type`, `allergy_notes`
- `is_active`, `deleted_at` (soft delete)
- `created_at`, `updated_at`

### Tasks
- [ ] Schema + migrate: `patients`, `patient_identities`, `patient_addresses`
- [ ] Auto-generate medical record number (format klinik, dengan locking)
- [ ] API: POST /patients (create), GET /patients (paginated search), GET /patients/:id
- [ ] API: PUT /patients/:id (update), DELETE /patients/:id (soft delete)
- [ ] Search: by name, NIK, medical record number, BPJS number
- [ ] Audit trail: create, update, soft delete patient
- [ ] Frontend: form pendaftaran pasien baru
- [ ] Frontend: halaman pencarian/list pasien dengan pagination
- [ ] Frontend: detail profil pasien

---

## Fase 4 — Registrasi dan Antrian
**Estimasi**: 2-3 sesi kerja  
**Prasyarat**: Fase 3 selesai  
**Deliverable**: Pasien bisa didaftarkan ke poli, antrian terbentuk

### Database Schema
- `registrations` — kepala record kunjungan
- `queues` — nomor antrian aktif per poli per tanggal
- `queue_calls` — log pemanggilan antrian (audit trail antrian)

### Key Fields registrations
- `registration_number` — unique per hari
- `patient_id`, `polyclinic_id`, `practitioner_id`, `schedule_id`
- `registration_date`, `visit_type` (umum/BPJS/asuransi)
- `status` (waiting/called/in_service/done/cancelled/no_show)
- `queue_number`, `estimated_time`
- `complaint` — keluhan awal
- `notes`
- `registered_by` (user_id), `created_at`

### Tasks
- [ ] Schema + migrate: `registrations`, `queues`, `queue_calls`
- [ ] Logika validasi: jadwal aktif? kuota belum penuh? pasien belum terdaftar hari ini di poli yang sama?
- [ ] Auto-generate nomor registrasi dan nomor antrian
- [ ] API: POST /registrations (daftarkan pasien)
- [ ] API: GET /registrations (list per tanggal/poli, paginated)
- [ ] API: PUT /registrations/:id/status (update status: panggil, selesai, batal)
- [ ] API: GET /queues/today?polyclinic_id= (antrian aktif)
- [ ] Frontend: form registrasi (loket)
- [ ] Frontend: dashboard antrian per poli (realtime polling atau SSE sederhana)
- [ ] Frontend: tampilan pemanggilan antrian

---

## Fase 5 — Encounter dan Rekam Medis
**Estimasi**: 3-4 sesi kerja  
**Prasyarat**: Fase 4 selesai  
**Deliverable**: Dokter bisa input rekam medis, assessment, dan rencana tindak lanjut

### Database Schema
- `encounters` — satu kunjungan dokter-pasien (linked ke registration)
- `vital_signs` — TTV per encounter
- `subjective_notes` — keluhan/anamnesis (SOAP S)
- `objective_notes` — pemeriksaan fisik (SOAP O)
- `assessments` — diagnosa (SOAP A), linked ke ICD-10
- `encounter_diagnoses` — many diagnosa per encounter
- `plans` — rencana tindak lanjut (SOAP P)
- `encounter_procedures` — tindakan yang dilakukan
- `clinical_notes` — catatan tambahan

### Lifecycle Status
`DRAFT → FINALIZED → AMENDED`

> Once FINALIZED: data tidak boleh diedit langsung.  
> Amandemen harus membuat record baru dengan reference ke encounter original.

### Tasks
- [ ] Schema + migrate semua tabel encounter
- [ ] API: POST /encounters (buat dari registration)
- [ ] API: GET /encounters/:id (detail lengkap)
- [ ] API: PATCH /encounters/:id — hanya boleh saat status DRAFT
- [ ] API: POST /encounters/:id/finalize — transisi ke FINALIZED, tidak bisa di-undo
- [ ] API: POST /encounters/:id/amend — buat amendment encounter
- [ ] Audit trail lengkap setiap perubahan status
- [ ] Frontend: form SOAP untuk dokter
- [ ] Frontend: input TTV oleh perawat
- [ ] Frontend: input diagnosa (autocomplete ICD-10)
- [ ] Frontend: input tindakan/prosedur
- [ ] Frontend: view riwayat kunjungan pasien (timeline)

---

## Fase 6 — Resep dan Farmasi
**Estimasi**: 2-3 sesi kerja  
**Prasyarat**: Fase 5 selesai  
**Deliverable**: Resep dari dokter dapat diproses farmasi, stok tercatat

### Database Schema
- `prescriptions` — kepala resep (linked ke encounter)
- `prescription_items` — detail obat per resep
- `drug_stocks` — stok aktual per obat per gudang
- `drug_stock_movements` — append-only log setiap pergerakan stok
- `dispensing_records` — record penyerahan obat ke pasien

### Business Rules
- Resep hanya bisa dibuat dari encounter yang ada
- Dispensing mengurangi stok secara atomik (transaction)
- Stok tidak boleh negatif (check constraint atau application logic + lock)
- Setiap gerakan stok harus ada alasan dan reference

### Tasks
- [ ] Schema + migrate semua tabel farmasi
- [ ] API: POST /prescriptions (dari dokter, linked ke encounter)
- [ ] API: GET /prescriptions/:id
- [ ] API: POST /prescriptions/:id/dispense — farmasi siapkan obat
- [ ] Stok: POST /drug-stocks/adjustment (penyesuaian manual oleh farmasi)
- [ ] Stok: GET /drug-stocks (list stok dengan filter)
- [ ] Transaksi atomik saat dispensing (kurangi stok + buat dispensing record)
- [ ] Alert stok minimum
- [ ] Frontend: antarmuka apotek (list resep menunggu, proses dispensing)
- [ ] Frontend: manajemen stok obat

---

## Fase 7 — Billing dan Pembayaran
**Estimasi**: 2-3 sesi kerja  
**Prasyarat**: Fase 6 selesai  
**Deliverable**: Invoice terbentuk otomatis dari encounter, pembayaran tercatat

### Database Schema
- `invoices` — invoice per kunjungan
- `invoice_items` — line items (tindakan, obat, konsultasi)
- `payments` — record pembayaran
- `payment_items` — alokasi pembayaran ke invoice items
- `payment_methods` — tunai, transfer, BPJS, asuransi

### Business Rules
- Invoice otomatis terbentuk saat encounter FINALIZED
- Partial payment diizinkan (piutang)
- BPJS encounters butuh claim number nantinya (Fase 9)
- Pembayaran adalah transaksi — harus atomic

### Tasks
- [x] Schema + migrate billing tables (`invoices`, `invoice_items`, `payments`)
- [x] Auto-generate invoice dari finalized encounter (hitung dari tarif tindakan + resep farmasi)
- [x] API: GET /invoices/:id
- [x] API: POST /payments (proses pembayaran atomik dengan kalkulasi kembalian)
- [x] API: GET /invoices — list dengan filter status (unpaid/partial/paid) dan pencarian
- [x] Receipt generation (Kuitansi / Struk Kasir Resmi Klinik Rizani dengan Terbilang)
- [x] Frontend: kasir view — list invoice pending dan KPI pendapatan harian
- [x] Frontend: form pembayaran (multi-metode: Tunai, Transfer, QRIS, Debit, BPJS, Asuransi)
- [x] Frontend: cetak struk/invoice (modal & direct print stylesheet)

---

## Fase 8 — Laporan Operasional
**Estimasi**: 1-2 sesi kerja  
**Prasyarat**: Fase 7 selesai  
**Deliverable**: Laporan dasar harian/bulanan tersedia

### Laporan Yang Dibutuhkan
- Kunjungan harian per poli
- Rekapitulasi pendapatan harian/bulanan
- Statistik diagnosa (10 diagnosa terbanyak)
- Laporan stok farmasi
- Laporan BPJS (untuk klaim, dipakai lagi di Fase 9)

### Tasks
- [ ] Query-query laporan dengan proper indexing
- [ ] API endpoint laporan dengan date range filtering
- [ ] Export CSV/Excel untuk laporan
- [ ] Frontend: dashboard dengan charts (gunakan recharts)
- [ ] Frontend: halaman laporan dengan filter dan export

---

## Fase 9 — Integrasi BPJS
**Estimasi**: 3-4 sesi kerja  
**Prasyarat**: Fase 7-8 selesai, akses API BPJS tersedia  
**Deliverable**: Pengecekan eligibilitas BPJS, klaim SEP, referral

### Arsitektur Integrasi
```
Internal Domain
  → BpjsMapper (transform internal data → BPJS format)
  → BpjsApiClient (HTTP client, credentials backend-only)
  → IntegrationJobQueue (async, retry, idempotency)
  → BpjsIntegrationLog (status: pending/processing/success/failed)
```

### Tasks
- [ ] Schema: `bpjs_integration_logs`, `bpjs_sep_records`, `bpjs_referrals`
- [ ] Setup BpjsApiClient dengan credential management (env only)
- [ ] Implementasi pengecekan eligibilitas peserta
- [ ] Implementasi pembuatan SEP (Surat Eligibilitas Peserta)
- [ ] Implementasi pencarian faskes rujukan
- [ ] Job queue untuk pengiriman klaim (retry logic)
- [ ] Frontend: badge status BPJS di profil pasien
- [ ] Frontend: form input data BPJS saat registrasi
- [ ] Error handling: BPJS timeout/fail TIDAK boleh gagalkan registrasi lokal

> **NOTE**: Verifikasi endpoint BPJS VClaim terbaru dari dokumentasi resmi sebelum implementasi

---

## Fase 10 — Integrasi SATUSEHAT
**Estimasi**: 3-4 sesi kerja  
**Prasyarat**: Fase 5-6 selesai, akses SATUSEHAT tersedia  
**Deliverable**: Data encounter dikirim ke platform SATUSEHAT (FHIR R4)

### Arsitektur Integrasi
```
Internal Domain
  → SatuSehatMapper (transform ke FHIR R4 resources)
  → SatuSehatApiClient (OAuth2 client credentials, backend-only)
  → IntegrationJobQueue (async)
  → SatuSehatIntegrationLog
```

### FHIR Resources yang Diperlukan
- Patient
- Practitioner
- Organization
- Encounter
- Condition (diagnosa)
- Observation (TTV)
- MedicationRequest (resep)
- Procedure

### Tasks
- [ ] Schema: `satusehat_integration_logs`, `satusehat_resource_map` (local ID → FHIR ID)
- [ ] OAuth2 client credentials flow (token caching, auto-refresh)
- [ ] FHIR mapper untuk setiap resource
- [ ] Sync pasien ke SATUSEHAT (IHS number)
- [ ] Sync encounter setelah finalized
- [ ] Error handling dan retry
- [ ] Frontend: status sync SATUSEHAT per encounter

> **NOTE**: Verifikasi FHIR profile SATUSEHAT terbaru dari portal developer.kemkes.go.id sebelum implementasi

---

## Fase 11 — Hardening dan Production Readiness
**Estimasi**: 2-3 sesi kerja  
**Prasyarat**: Semua fase core selesai  
**Deliverable**: Siap untuk production

### Tasks
- [ ] Comprehensive API input validation (semua endpoint)
- [ ] Rate limiting per endpoint sensitif
- [ ] Database query optimization (EXPLAIN ANALYZE pada query lambat)
- [ ] Database indexing audit
- [ ] Logging terpusat (structured JSON logs, Pino)
- [ ] Health check endpoint
- [ ] Graceful shutdown
- [ ] Docker Compose untuk production
- [ ] Backup strategy untuk PostgreSQL
- [ ] HTTPS setup
- [ ] Environment-specific config (dev/staging/prod)
- [ ] Error monitoring (opsional: Sentry atau self-hosted Glitchtip)
- [ ] Dokumentasi API (Swagger/Scalar dari Fastify schema)

---

## Database Design Principles (Cross-Fase)

### Wajib di Setiap Tabel Bisnis
```sql
created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
created_by   UUID REFERENCES users(id)
```

### Soft Delete (Untuk Record Bisnis Penting)
```sql
deleted_at   TIMESTAMPTZ
deleted_by   UUID REFERENCES users(id)
```

### Audit Log Schema
```sql
audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  action       VARCHAR(50) NOT NULL,  -- CREATE, UPDATE, DELETE, LOGIN, etc
  entity_type  VARCHAR(100) NOT NULL,
  entity_id    UUID NOT NULL,
  old_values   JSONB,
  new_values   JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
-- Index: entity_type + entity_id, user_id, created_at
-- No UPDATE or DELETE permissions on this table
```

### Naming Convention
- Tables: `snake_case`, plural
- Columns: `snake_case`
- Indexes: `idx_{table}_{column(s)}`
- Unique constraints: `uq_{table}_{column(s)}`
- Foreign keys: `fk_{table}_{referenced_table}`

---

## API Response Format Standard

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 1500,
    "total_pages": 75
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Pesan yang bisa dibaca user",
    "details": [ ... ]
  }
}
```

---

## Open Questions (Perlu Dikonfirmasi Owner Klinik)

1. Format nomor rekam medis yang diinginkan? (contoh: `KRZ-YYYY-NNNNNN`)
2. Apakah klinik sudah terdaftar sebagai faskes BPJS? Kredensial API tersedia?
3. Apakah klinik sudah memiliki akun SATUSEHAT (Organization ID, Client ID)?
4. Berapa jumlah poli/unit layanan yang aktif saat ini?
5. Apakah ada sistem legacy yang datanya perlu dimigrasikan?
6. Siapa role pengguna dan berapa jumlah user awal yang diantisipasi?
7. Apakah perlu modul rawat inap (opname)? (Saat ini plan hanya rawat jalan)
8. Apakah perlu manajemen laboratorium?
