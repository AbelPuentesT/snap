# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Snap is a URL shortener with click analytics, TTL-based expiration, and a React dashboard. Two independent projects live in this repo:

| Project | Path | Port | Stack |
|---|---|---|---|
| Backend (API) | `./` | `:3000` | Node 22+ ESM, Express 4, TypeScript strict, better-sqlite3, bcryptjs + jsonwebtoken |
| Frontend (SPA) | `./client/` | `:5173` (dev) | React 19, Vite 6, TypeScript strict, React Router v7 (HashRouter) |

## Commands

Run these from `./` (backend) unless noted:

```bash
npm run dev          # Dev server with hot-reload (tsx watch src/index.ts) → :3000
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled output (production) — serves API + client/dist/
npm test             # Run all tests (vitest run)
npm run test:watch   # Tests in watch mode
```

Run a single test file: `npx vitest run tests/urls.test.ts`
Run a single test by name: `npx vitest run -t "crea una URL corta"`

Frontend, from `./client/`:

```bash
npm run dev       # Vite dev server at :5173, proxies /api/* to :3000
npm run build     # Build for production → client/dist/
npm run preview   # Preview the production build locally
```

To develop end-to-end, run both dev servers in separate terminals — **the backend must already be listening on :3000 before starting the frontend**, and `:3000` should not be opened directly in a browser during development (it's the raw API; the SPA is served through Vite at `:5173`).

There is no lint script configured; rely on `tsc`/`vitest` and TypeScript strict mode to catch issues.

## Architecture

### Backend module layout (`src/modules/*`)

Each feature is a self-contained module with its own `*.routes.ts` (Express router + handlers) and, where there's business logic worth isolating, a `*.service.ts`:

- `modules/auth` — `auth.service.ts` (register/login, bcrypt hashing, JWT signing) + `auth.middleware.ts` (`authenticate` — verifies `Bearer <token>`, attaches `req.user = { sub, email }`) + `auth.routes.ts`.
- `modules/urls` — create/list/redirect handlers directly in `urls.routes.ts` (no separate service). Short codes are 6-char base64url via `crypto.randomBytes`; aliases are validated against `/^[a-zA-Z0-9_-]{3,20}$/`. TTL is expressed in hours and resolved to an absolute `expires_at` at creation time using SQLite's `datetime('now', '+N hours')`.
- `modules/dashboard` — `dashboard.service.ts` aggregates summary/trends/rankings entirely via SQL (grouped queries per user), not in application code.

`src/server.ts` wires everything: `createApp()` builds the Express app (request logger → JSON body parser → `/health` → `/api/urls`, `/api/auth`, `/api/dashboard` routers → static `client/dist/` → SPA fallback for `/login`/`/register` → catch-all `GET /:shortCode` redirect → 404 handler → error handler). `createApp` accepts an optional `onBeforeFinal(app)` hook, used by tests to attach things before the catch-all routes are registered. `src/index.ts` is the only place that calls `initDb()` and starts listening — `createApp()` itself has no side effects, which is what makes it usable directly in integration tests.

Auth is stateless JWT (24h expiry, `sub` = user id) signed/verified with `config.jwtSecret`. There's no refresh/revocation mechanism.

### Database (`src/shared/db.ts`)

Single SQLite connection (WAL mode, foreign keys on) via `getDb()`, lazily opened at `data/<SNAP_DB_NAME>`. `initDb()` is idempotent: it `CREATE TABLE IF NOT EXISTS` for `urls`, `users`, `clicks`, then runs `ALTER TABLE ... ADD COLUMN` migrations wrapped in try/catch (SQLite has no `ADD COLUMN IF NOT EXISTS`, so the catch discards the "already exists" error). When adding a new column, follow this same pattern — add the `CREATE TABLE` for new tables with the column already present, and add a new guarded `ALTER TABLE` for existing tables. Tables: `users` (id, email, password_hash, name), `urls` (short_code, original_url, user_id, expires_at), `clicks` (url_id, ip_address, user_agent, referer, clicked_at) — every click on a redirect is recorded here unless the URL is expired, and dashboard analytics are all derived from this table via `JOIN`/`GROUP BY`.

### Config (`src/config.ts`)

`loadConfig(overrideEnv?)` reads `PORT`, `NODE_ENV`, `SNAP_DB_NAME`, `JWT_SECRET` and returns a typed `Config`. `PORT` and `JWT_SECRET` are required (throw `ConfigError`) only when `NODE_ENV=production`; both have dev defaults otherwise. The module-level `config` singleton is built from `process.env` at import time — tests that need different env values call `loadConfig({...})` directly rather than mutating `process.env` and re-importing.

### Frontend (`client/src`)

- `api/client.ts` — a single `api<T>()` fetch wrapper: attaches `Authorization: Bearer <snap_token from localStorage>`, and on any `401` clears localStorage and hash-redirects to `/login`. All API calls (`api/auth.ts`, `api/urls.ts`, `api/dashboard.ts`) go through this wrapper.
- `hooks/useAuth.tsx` — `AuthProvider` context holding login/register/logout, backed by `localStorage` (`snap_token`, `snap_user`).
- `components/ProtectedRoute.tsx` — redirects to `/login` when no token is present; wraps authenticated pages in `App.tsx`'s router.
- Routing uses `HashRouter` (so client-side routes work when the SPA is served as a static bundle by the Express catch-all in production).

### Testing conventions (`tests/*.test.ts`)

Tests are integration-style: they build a real `http.Server` around `createApp()` and hit it with `fetch()`, rather than mocking Express. Conventions to follow when adding tests:

- Set `process.env['SNAP_DB_NAME']` to a unique per-suite filename *before* importing/calling `initDb()`, so suites don't share or corrupt each other's SQLite file (vitest also sets a base `snap-test.db` in `vitest.config.ts`, but most suites override it further, e.g. `snap-test-urls.db`).
- `beforeAll`: call `initDb()`, create the app, `server.listen(0, ...)` on an ephemeral port, read the actual port back off `server.address()`.
- `afterAll`: `server.close()` then `closeDb()`.
- Register a throwaway user with a timestamp-suffixed email (e.g. `` `urls-test-${Date.now()}@example.com` ``) to get a bearer token for authenticated routes, rather than relying on fixture users.

## Production build

Both projects are built independently and the compiled backend serves the compiled frontend:

```bash
npm run build              # backend → dist/
cd client && npm run build # frontend → client/dist/
npm start                  # serves API + frontend from dist/ on $PORT
```

## Docs

`docs/API.md` is the full API reference (in Spanish) and should be kept in sync with route changes in `src/modules/*/*.routes.ts` — error messages returned by the API are also in Spanish (e.g. `"url es requerida"`, `"Token inválido o expirado"`), so match that convention for any new user-facing API error strings.
