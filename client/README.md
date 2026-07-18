# Snap — Frontend

React SPA for the Snap URL shortener.

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 6 |
| Language | TypeScript (strict) |
| Routing | React Router v7 (HashRouter) |
| Auth | JWT stored in localStorage |

## Ports

| Mode | URL | Notes |
|---|---|---|
| Dev | `http://localhost:5173` | Vite dev server with HMR |
| Prod | served by backend at `:3000` | `npm run build` then start backend |

> In dev mode, `/api/*` requests are proxied to `http://localhost:3000`.  
> **The backend must be running on port 3000 before starting the frontend.**

## Scripts

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Build for production → dist/
npm run preview   # Preview the production build locally
```

## Project Structure

```
client/
├── src/
│   ├── api/
│   │   ├── client.ts       # Fetch wrapper with Bearer token + 401 redirect
│   │   ├── auth.ts         # register() / login() API calls
│   │   ├── urls.ts         # createUrl() API call
│   │   └── dashboard.ts    # getDashboard() API call + types
│   ├── components/
│   │   ├── Layout.tsx      # Navbar with user name + logout
│   │   └── ProtectedRoute.tsx  # Redirects to /login if no token
│   ├── hooks/
│   │   └── useAuth.tsx     # AuthProvider context (login/register/logout)
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── DashboardPage.tsx  # URL creation, stats, expired URL badge
│   ├── App.tsx             # Router setup
│   └── main.tsx            # React entry point
└── index.html
```

## Authentication Flow

1. Register or login → JWT saved to `localStorage` as `snap_token`
2. Every API request includes `Authorization: Bearer <token>` automatically
3. On 401, token is cleared and user is redirected to `/login`
4. Logout clears `snap_token` and `snap_user` from localStorage
