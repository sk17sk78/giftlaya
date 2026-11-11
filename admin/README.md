# Giftlaya CMS v2 Admin Frontend (`giftlaya-admin`)

Standalone deployable React + TypeScript + Vite + Tailwind CSS v4 admin panel matching `https://giftlaya.com/cms/login` and the live CMS v2 navigation shell (`admin.mysite.com`), powered by the Go API (`../giftlaya-api`).

## Local Setup

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies & regenerate OpenAPI TypeScript types from `../giftlaya-api/docs/swagger.json`:
   ```bash
   npm install
   npm run gen:api
   ```
3. Run development server:
   ```bash
   npm run dev
   ```
4. Build static bundle (`dist/`) for Nginx / CDN deployment:
   ```bash
   npm run build
   ```

## Phase 0 Implemented
- 1:1 `/cms/login` page matching live `giftlaya.com/cms/login` (`#07080d` + Violet console, `Username + Password + Access Code`, React Hook Form + zod)
- Exact 8-section CMS v2 collapsible sidebar (`Main`, `Commerce`, `Marketing`, `Catalog`, `Marketplace`, `Content`, `Mobile App`, `System`), live `sidebar-counts` badges, Topbar `⌘K` command switcher, light/dark toggle, mobile drawer & bottom tabs
- Auto-refreshing JWT Bearer client (`src/api/client.ts`) generated from `openapi-typescript` (`src/api/schema.d.ts`), `PermissionGuard`, `AdminSettingsPage` (Users CRUD, RBAC matrix editor, Audit Logs, Password & 2FA TOTP setup)
- Production static `Dockerfile` + `nginx.conf` with `X-Robots-Tag: noindex, nofollow` and security headers

