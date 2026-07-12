# Snap — URL Shortener with Analytics

Acortador de URLs con analíticas, construido con Node.js + Express + TypeScript.

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 22+ (ESM) |
| Framework | Express 4 |
| Lenguaje | TypeScript strict |
| Base de datos | SQLite via better-sqlite3 |
| Tests | Vitest |
| Auth | bcryptjs + jsonwebtoken |

## Estructura

```
snap/
├── src/
│   ├── index.ts               # Entry point
│   ├── config.ts              # Config centralizada (env vars)
│   ├── server.ts              # Express app factory
│   ├── shared/
│   │   └── db.ts              # SQLite singleton + migrations
│   └── modules/
│       ├── urls/              # Acortar, listar, redirigir URLs
│       ├── auth/              # Registro, login, JWT middleware
│       └── dashboard/         # Placeholder
├── tests/                     # Tests de integración HTTP real
└── .env.example               # Plantilla de configuración
```

## Comandos

```bash
npm run dev       # Desarrollo con hot-reload (tsx watch)
npm run build     # Compilar TypeScript
npm start         # Producción desde dist/
npm test          # Ejecutar tests
npm run test:watch # Tests en modo watch
```

## Endpoints

### Salud
```
GET /health → { status, timestamp }
```

### URLs
```
POST /api/urls            Crear URL corta          { url } → { shortCode, originalUrl }
GET  /api/urls            Listar todas las URLs    → [{ shortCode, originalUrl, createdAt }]
GET  /:shortCode          Redirigir a URL original → 302 redirect
```

### Auth
```
POST /api/auth/register   Registrar usuario        { email, password, name } → { token, user }
POST /api/auth/login      Iniciar sesión           { email, password } → { token, user }
```

### Middleware de autenticación
```
Authorization: Bearer <token>
→ adjunta req.user = { sub, email }
```

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor |
| `NODE_ENV` | `development` | `production` oculta errores internos |
| `SNAP_DB_NAME` | `snap.db` | Nombre del archivo SQLite |
| `JWT_SECRET` | `snap-dev-secret-...` | Secreto para firmar tokens |

En producción, `PORT` y `JWT_SECRET` son obligatorios.

## Tests

```bash
npm test
# 35 tests, 6 suites
```

Los tests levantan un servidor HTTP real en puerto aleatorio y hacen peticiones con `fetch`.
