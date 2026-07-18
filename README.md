# Snap — URL Shortener with Analytics

URL shortener with click analytics, expiration (TTL), and a React dashboard.

## Projects

| Project | Path | Port | README |
|---|---|---|---|
| Backend (API) | `./` | `:3000` | this file |
| Frontend (SPA) | `./client/` | `:5173` (dev) | [client/README.md](client/README.md) |

---

## Running in development

Open **two terminals**:

**Terminal 1 — Backend**
```bash
cd snap
npm install
cp .env.example .env   # only first time
npm run dev
# → http://localhost:3000
```

**Terminal 2 — Frontend**
```bash
cd snap/client
npm install
npm run dev
# → http://localhost:5173
```

Open `http://localhost:5173` in the browser. The frontend proxies all `/api/*` calls to `:3000`.

> Do NOT open `:3000` directly in the browser during development — that's the raw API.

---

## Backend Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22+ (ESM) |
| Framework | Express 4 |
| Language | TypeScript strict |
| Database | SQLite via better-sqlite3 |
| Auth | bcryptjs + jsonwebtoken (JWT 24h) |
| Tests | Vitest (42 tests, 7 suites) |

## Backend Scripts

```bash
npm run dev          # Dev with hot-reload (tsx watch)
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled output (production)
npm test             # Run all tests
npm run test:watch   # Tests in watch mode
```

## Backend Structure

```
snap/
├── src/
│   ├── index.ts               # Entry point — starts HTTP server
│   ├── config.ts              # Centralized config (env vars)
│   ├── server.ts              # Express app factory + static serving
│   ├── shared/
│   │   └── db.ts              # SQLite singleton + auto-migrations
│   └── modules/
│       ├── urls/              # Create, list, redirect URLs (+ TTL/alias)
│       ├── auth/              # Register, login, JWT middleware
│       └── dashboard/         # Analytics: summary, trends, rankings
├── tests/                     # Integration tests (real HTTP server)
├── client/                    # React SPA (see client/README.md)
├── docs/API.md                # Full API reference
└── .env.example               # Config template
```

## API Endpoints

### Health
```
GET /health → { status, timestamp }
```

### Auth
```
POST /api/auth/register   { email, password, name } → { token, user }
POST /api/auth/login      { email, password }        → { token, user }
```

### URLs  (requires Authorization: Bearer <token>)
```
POST /api/urls   { url, alias?, ttl? }  → { shortCode, originalUrl, expiresAt }
GET  /api/urls                          → [{ shortCode, originalUrl, createdAt, expiresAt, expired }]
GET  /:shortCode                        → 302 redirect | 404 not found | 410 expired
```

### Dashboard  (requires Authorization: Bearer <token>)
```
GET /api/dashboard → { summary, trends, rankings, urls }
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | `production` hides internal errors |
| `SNAP_DB_NAME` | `snap.db` | SQLite filename |
| `JWT_SECRET` | `snap-dev-secret-...` | Token signing secret |

`PORT` and `JWT_SECRET` are required in production.

## Production Build

```bash
# Build both projects
npm run build           # compiles backend to dist/
cd client && npm run build  # compiles frontend to client/dist/

# Run
npm start               # serves API + frontend from dist/
# → http://localhost:<PORT>
```

In production, the backend serves the compiled frontend from `client/dist/` automatically.
