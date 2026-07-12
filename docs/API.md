# Snap API Reference

Base URL: `http://localhost:3000`

---

## Salud

```http
GET /health
```

```json
{ "status": "ok", "timestamp": "2026-07-12T00:00:00.000Z" }
```

---

## Auth

### Registrar usuario

```http
POST /api/auth/register
Content-Type: application/json

{ "email": "user@example.com", "password": "secret123", "name": "User" }
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "email": "user@example.com", "name": "User" }
}
```

| Código | Motivo |
|--------|--------|
| 201 | Registro exitoso |
| 400 | Faltan campos requeridos |
| 409 | Email ya registrado |

### Iniciar sesión

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "secret123" }
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "email": "user@example.com", "name": "User" }
}
```

| Código | Motivo |
|--------|--------|
| 200 | Login exitoso |
| 400 | Faltan campos requeridos |
| 401 | Credenciales inválidas |

---

## URLs (requiere autenticación)

Todas las rutas bajo `/api/urls` requieren:

```http
Authorization: Bearer <token>
```

### Crear URL corta

```http
POST /api/urls
Authorization: Bearer <token>
Content-Type: application/json

{ "url": "https://ejemplo.com/muy/larga" }
```

```json
{ "shortCode": "abc123", "originalUrl": "https://ejemplo.com/muy/larga" }
```

| Código | Motivo |
|--------|--------|
| 201 | URL creada exitosamente |
| 400 | Falta `url` en el body |
| 401 | Token ausente o inválido |

### Listar URLs del usuario

```http
GET /api/urls
Authorization: Bearer <token>
```

```json
[
  { "shortCode": "abc123", "originalUrl": "https://ejemplo.com/muy/larga", "createdAt": "2026-07-12 00:00:00" }
]
```

| Código | Motivo |
|--------|--------|
| 200 | Lista de URLs (vacía si no hay) |
| 401 | Token ausente o inválido |

### Redirigir a URL original (no requiere auth)

```http
GET /:shortCode
```

| Código | Motivo |
|--------|--------|
| 302 | Redirección a la URL original |
| 404 | `shortCode` no existe |

Cada visita registra automáticamente un click con `ip_address`, `user_agent` y `referer`.

---

## Dashboard (requiere autenticación)

```http
GET /api/dashboard
Authorization: Bearer <token>
```

Devuelve una vista completa de todas las URLs del usuario autenticado y su rendimiento.

```json
{
  "summary": {
    "totalUrls": 10,
    "totalClicks": 540,
    "clicksLast7Days": 89
  },
  "trends": {
    "clicksByDay": [
      { "date": "2026-07-05", "clicks": 15 },
      { "date": "2026-07-06", "clicks": 22 }
    ],
    "peakHours": [
      { "hour": 15, "clicks": 38 },
      { "hour": 10, "clicks": 31 }
    ]
  },
  "rankings": {
    "topUrls": [
      { "shortCode": "abc123", "originalUrl": "https://twitter.com/foo", "clicks": 120 }
    ],
    "topReferrers": [
      { "source": "twitter.com", "clicks": 130 },
      { "source": "direct", "clicks": 90 }
    ],
    "uniqueIpsPerUrl": [
      { "shortCode": "abc123", "uniqueVisitors": 67 }
    ]
  },
  "urls": [
    {
      "shortCode": "abc123",
      "originalUrl": "https://twitter.com/foo",
      "createdAt": "2026-07-01 10:00:00",
      "clicks": 120
    }
  ]
}
```

### Campos

| Sección | Descripción |
|---------|-------------|
| `summary` | Totales globales del usuario |
| `summary.totalUrls` | Cantidad de URLs creadas |
| `summary.totalClicks` | Total de clicks en todas las URLs |
| `summary.clicksLast7Days` | Clicks registrados en los últimos 7 días |
| `trends.clicksByDay` | Serie diaria de clicks (últimos 30 días) |
| `trends.peakHours` | Distribución de clicks por hora (0-23) |
| `rankings.topUrls` | Top 10 URLs por cantidad de clicks |
| `rankings.topReferrers` | Top 10 fuentes de tráfico |
| `rankings.uniqueIpsPerUrl` | Visitantes únicos (por IP) por URL - Top 10 |
| `urls` | Lista completa de URLs con su total de clicks |

| Código | Motivo |
|--------|--------|
| 200 | Dashboard del usuario autenticado |
| 401 | Token ausente o inválido |

---

## Errores globales

```json
{ "error": "Ruta no encontrada" }
```

```json
{ "error": "Error interno del servidor" }
```

En entorno `development` incluye `{ "detail": "<mensaje>" }` adicional.
