# CLAUDE.md — Frontend (React SPA)

This file provides guidance to Claude Code when working in `/client/` (React + Vite + TypeScript).

## Project overview

**Snap Frontend** is a React 19 SPA built with Vite 6, served at `:5173` in development. In production, the compiled bundle is served by the backend at `:3000`.

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 6 |
| Language | TypeScript (strict) |
| Routing | React Router v7 (HashRouter) |
| Auth | JWT in localStorage (`snap_token`, `snap_user`) |
| HTTP | Fetch with Bearer token in Authorization header |

## Commands

Run from `./client/`:

```bash
npm run dev       # Vite dev server → http://localhost:5173 (proxies /api/* to :3000)
npm run build     # Build for production → dist/
npm run preview   # Preview the production build locally at :4173
```

**Important**: The backend must be running on `:3000` before starting the frontend dev server. In dev, all `/api/*` requests are proxied to `http://localhost:3000`.

## Architecture

### Directory structure

```
client/src/
├── api/
│   ├── client.ts         # Fetch wrapper with Bearer token + 401 redirect
│   ├── auth.ts           # register(email, password, name) / login(email, password)
│   ├── urls.ts           # createUrl(url, alias?, ttl?) / listUrls()
│   └── dashboard.ts      # getDashboard() → types + full response
├── components/
│   ├── Layout.tsx        # Navbar with user name + logout button
│   └── ProtectedRoute.tsx  # Redirects to /login if no token
├── hooks/
│   └── useAuth.tsx       # AuthProvider context, login/register/logout functions
├── pages/
│   ├── LoginPage.tsx     # Email + password form
│   ├── RegisterPage.tsx  # Email + password + name form
│   └── DashboardPage.tsx # URL shortener + analytics dashboard
├── App.tsx              # Router setup (HashRouter, routes, ProtectedRoute)
├── main.tsx             # React entry point (ReactDOM.createRoot)
├── index.css            # Global styles
└── vite.config.ts       # Vite config with /api proxy to :3000
```

### Key patterns

**API calls** — All go through `api/client.ts`:
```typescript
import { api } from './api/client'

const data = await api<DashboardResponse>('/api/dashboard')
```

The `api()` wrapper:
- Attaches `Authorization: Bearer <snap_token>` from localStorage
- On 401, clears tokens and redirects to `/login` (via `window.location.hash = '/login'`)
- Throws `ApiRequestError` on non-2xx responses

**Auth flow** — Managed by `useAuth()` hook:
1. Register/login → saves `snap_token` and `snap_user` to localStorage
2. All subsequent requests include the Bearer token
3. On token expiry (401), user is logged out and redirected
4. Logout clears localStorage and navigates to `/login`

**Routing** — Uses `HashRouter` (client-side routing):
- Routes: `/`, `/login`, `/register`, `/dashboard`
- In production, the backend's catch-all SPA fallback ensures `/login` and `/register` render `index.html`
- Hash routing (`#/path`) works because the SPA is a static bundle

**Protected routes** — Wrap pages that require auth:
```typescript
<ProtectedRoute>
  <DashboardPage />
</ProtectedRoute>
```
Checks for `snap_token` in localStorage; redirects to `/login` if absent.

## Development workflow

1. **Start backend** (from repo root):
   ```bash
   npm run dev  # Listens on :3000
   ```

2. **Start frontend** (in `./client/`):
   ```bash
   npm run dev  # Vite dev server at :5173, proxies /api/* to :3000
   ```

3. **Open browser**:
   - Go to `http://localhost:5173`
   - Login/register
   - Use the dashboard

4. **Building locally**:
   ```bash
   npm run build   # Compiles to dist/
   npm run preview # Preview at :4173 (still needs backend on :3000 for /api)
   ```

## Production build

```bash
cd client && npm run build  # Creates dist/ with static assets
```

The compiled `dist/` is served by the backend's `express.static()` at `/` and `/login` via SPA fallback. No separate frontend deployment needed — both projects are deployed together.

## Error messages

API error messages are in Spanish (from backend). Display them as-is to users, or translate on the client if needed. Examples:
- `"url es requerida"`
- `"Token inválido o expirado"`
- `"alias ya está en uso"`

## Testing notes

There are no frontend tests configured yet. When adding tests:
- Use `vitest` (same as backend, for consistency)
- Test with `@testing-library/react` for components
- Mock the `api/` module with vitest mocks
- Use `localStorage` mocks for auth testing
