# Giftlaya

Full-stack e-commerce gifting & decoration platform monorepo:

- `api/` — Go REST API (`:8080`, PostgreSQL + Redis)
- `storefront/` — Next.js 15 customer storefront (`:3000`)
- `admin/` — React + Vite CMS & operations admin panel (`:5173`)

## Setup

Copy each subproject's `.env.example` to `.env` (or `.env.local` in `storefront/`) and configure credentials before running:

```bash
# 1. Backend API
cd api && cp .env.example .env && go run ./cmd/api

# 2. Storefront
cd storefront && cp .env.example .env.local && npm install && npm run dev

# 3. Admin Panel
cd admin && cp .env.example .env && npm install && npm run dev
```
