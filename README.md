# KRIZA — SIMRS Klinik

Sistem Informasi Manajemen Rumah Sakit (SIMRS) / Rekam Medis Elektronik (RME) untuk klinik di Indonesia.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 + JavaScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Routing | React Router v7 |
| Backend | Node.js + Fastify v5 + JavaScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Infra | Docker Compose |

## Cara Menjalankan (Development)

### 1. Prerequisites

- Node.js v20+ 
- Docker Desktop (harus sudah running)
- npm v10+

### 2. Clone dan Install

```bash
# Install semua dependencies
npm install --legacy-peer-deps
```

### 3. Setup Environment

```bash
# Copy template env
cp .env.example .env
# Edit .env jika perlu (misal: ubah password database)
```

### 4. Start Database

```bash
# Pastikan Docker Desktop sudah running, lalu:
docker compose up -d

# Cek status container
docker compose ps
```

### 5. Run Migrations

```bash
npm run db:migrate
```

### 6. Start Development Servers

```bash
# Menjalankan web (port 5173) dan api (port 3001) bersamaan
npm run dev
```

Atau secara terpisah:

```bash
npm run dev:api   # API di http://localhost:3001
npm run dev:web   # Web di http://localhost:5173
```

### 7. Verifikasi

- **API Health**: http://localhost:3001/health
- **Web App**: http://localhost:5173
- **Drizzle Studio**: `npm run db:studio`

---

## Struktur Project

```
kriza/
├── apps/
│   ├── web/              # React + Vite (port 5173)
│   │   └── src/
│   │       ├── features/ # Feature modules
│   │       ├── components/ui/ # shadcn/ui components
│   │       ├── lib/      # Utilities, api client
│   │       └── pages/    # Shared pages (404, dll)
│   └── api/              # Fastify API (port 3001)
│       └── src/
│           ├── app.js    # Fastify app builder
│           ├── server.js # Entry point
│           ├── config/   # Env validation
│           ├── db/       # Drizzle + schema + migrations
│           └── modules/  # Domain modules (per fase)
├── packages/
│   └── shared/           # Shared constants
├── docker-compose.yml    # PostgreSQL
├── AGENT_CONTEXT.md      # Progress tracker untuk AI agent
└── implementation_plan.md # Rencana implementasi lengkap
```

---

## Progress Pengembangan

Lihat [`AGENT_CONTEXT.md`](./AGENT_CONTEXT.md) untuk status fase terkini.

Lihat [`implementation_plan.md`](./implementation_plan.md) untuk rencana lengkap.

---

## Catatan Teknis

- **Node.js**: Gunakan v20.x (v22+ lebih disarankan untuk menghindari EBADENGINE warnings)
- **npm install**: Gunakan flag `--legacy-peer-deps` karena ada peer dep conflict antara paket lama dan baru
- **Database**: Hanya PostgreSQL via Docker — jangan connect langsung ke DB production dari dev
