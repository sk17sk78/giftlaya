# Giftlaya Go Backend API (`giftlaya-api`)

Clean-architecture Go backend serving:
- `/api/v1/public/*` for the Next.js storefront (`www.mysite.com`)
- `/api/v1/admin/*` for the standalone Giftlaya CMS v2 admin panel (`admin.mysite.com`)
- `/swagger/index.html` and `/swagger/doc.json` for OpenAPI / TypeScript client generation

## Phase 0 Included
- Normalized 58-table PostgreSQL schema (`migrations/`) + `sqlc` repository codegen (`internal/repository/sqlc/`)
- Argon2id password & access-code hashing, AES-GCM TOTP 2FA support, JWT access + rotating refresh tokens with reuse-attack family revocation
- RBAC roles & module permission middleware (`RequirePermission`) + immutable write `audit_logs`
- Redis-backed rate limiting (in-memory fallback in local tests), CORS allowlist, security headers, structured `slog` logs, graceful shutdown
- Docker Compose (`postgres:16-alpine`, `redis:7-alpine`, `minio`, `api`) + multi-stage `Dockerfile` + `.air.toml`

## Local Setup

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```
2. Start PostgreSQL, Redis, MinIO (and API) with Docker Compose:
   ```bash
   docker compose up -d
   ```
3. Run PostgreSQL migrations (`golang-migrate`):
   ```bash
   make migrate-up
   ```
4. Seed default 7 RBAC roles, 12 permission modules, and default Super Admin (credentials read from `SEED_ADMIN_*` in `.env`):
   ```bash
   make seed
   ```
5. Run API in dev / hot-reload mode:
   ```bash
   make run
   # or with air: air
   ```
6. Run tests & regenerate sqlc/Swagger:
   ```bash
   make test
   make sqlc
   make swagger
   ```

## Separate Hosting & CORS
- API (`api.mysite.com`) enforces `CORS_ALLOWED_ORIGINS` (e.g. `https://admin.mysite.com,https://www.mysite.com`).
- Ensure `APP_ENV=production` and minimum 32-character secrets for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `TOTP_ENC_KEY`.

