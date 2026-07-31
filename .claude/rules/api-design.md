# API Design Rules — Snap

Guidelines for designing, building, and maintaining REST API endpoints.

## Endpoint conventions

### URL structure

- **Base path**: `/api/`
- **Resource paths**: `/api/{resource}` (plural, lowercase)
- **Scoped endpoints**: Scope by resource ownership, not action
  - ✅ `POST /api/urls` — create URL (user determined by auth token)
  - ❌ `POST /api/urls/create` — redundant
  - ✅ `GET /api/dashboard` — aggregate stats (user-scoped in service)
  - ❌ `GET /api/stats/get-dashboard` — bad naming

### HTTP methods

| Method | Use | Example |
|--------|-----|---------|
| `GET` | Fetch data (no side effects) | `GET /api/urls` |
| `POST` | Create resource | `POST /api/urls` |
| `PUT` | Replace entire resource | (not currently used) |
| `PATCH` | Partial update | (not currently used) |
| `DELETE` | Remove resource | (not currently used) |

### Status codes

| Code | Use | Example |
|------|-----|---------|
| `200` | Success (GET, no creation) | `GET /api/urls → 200` |
| `201` | Resource created | `POST /api/urls → 201` |
| `400` | Bad request (validation, missing fields) | Missing `url` field |
| `401` | Unauthorized (missing/invalid token) | No Authorization header |
| `409` | Conflict (duplicate, constraint violation) | Alias already taken |
| `410` | Gone (URL expired) | TTL passed, URL is dead |
| `404` | Not found (resource doesn't exist) | Short code not found |
| `500` | Server error | Unexpected exception |

## Request/Response format

### JSON structure

All requests and responses are JSON.

**Request body** — `Content-Type: application/json`
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "url": "https://example.com/long/path",
  "alias": "my-link",
  "ttl": 24
}
```

**Success response** (200/201) — return data directly or nested in an object:
```json
{ "token": "...", "user": { "id": 1, "email": "..." } }
```

**Error response** (4xx/5xx) — always return object with `error` key:
```json
{ "error": "url es requerida" }
```

In development, errors also include `detail`:
```json
{ "error": "Error interno del servidor", "detail": "Cannot read property 'id' of undefined" }
```

### Field naming

- **Request/response fields**: camelCase (`email`, `password`, `shortCode`, `originalUrl`)
- **Database columns**: snake_case (`short_code`, `original_url`, `user_id`, `created_at`)
- **Avoid abbreviations**: `url` not `uri`, `originalUrl` not `origUrl`

## Validation

### Input validation

All user input is validated in the route handler. Throw or respond with 400 for:
- Missing required fields
- Invalid format (e.g., alias doesn't match regex)
- Invalid type (e.g., `ttl` is a string instead of number)
- Out-of-range (e.g., negative TTL)

**Example**:
```typescript
if (!url || typeof url !== 'string') {
  res.status(400).json({ error: 'url es requerida' })
  return
}

if (ttl && typeof ttl !== 'number') {
  res.status(400).json({ error: 'ttl debe ser un número' })
  return
}
```

### Business validation

Respond with 409 for constraint violations (duplicates, conflicts):
```typescript
if (db.prepare('SELECT 1 FROM urls WHERE short_code = ?').get(alias)) {
  res.status(409).json({ error: 'alias ya está en uso' })
  return
}
```

## Error messages

**All user-facing error messages are in Spanish.** This includes API responses, validation errors, and status messages.

Examples:
- `"url es requerida"` (URL is required)
- `"alias debe tener 3-20 caracteres alfanuméricos"` (alias must be 3-20 alphanumeric chars)
- `"alias ya está en uso"` (alias already taken)
- `"Token requerido"` (token required)
- `"Token inválido o expirado"` (token invalid or expired)
- `"Email ya registrado"` (email already registered)
- `"Credenciales inválidas"` (invalid credentials)
- `"URL expirada"` (URL expired)
- `"URL no encontrada"` (URL not found)

When adding new endpoints, follow this convention. Do NOT mix Spanish and English in a single response.

## Authentication

### Bearer token format

All protected endpoints require:
```http
Authorization: Bearer <JWT_TOKEN>
```

If missing or invalid, respond with 401:
```json
{ "error": "Token requerido" }
```

or

```json
{ "error": "Token inválido o expirado" }
```

The `authenticate` middleware attaches `req.user = { sub, email }` (from JWT payload).

## Common patterns

### User-scoped queries

Operations that belong to the authenticated user filter by `req.user.sub` (user ID):
```typescript
const rows = db.prepare(
  'SELECT * FROM urls WHERE user_id = ?'
).all(req.user!.sub)
```

Don't trust the client to provide the user ID; always use the authenticated user.

### TTL and expiration

TTL is an input (hours), not a database column. Resolve it at creation time:
```typescript
if (ttl && ttl > 0) {
  const row = db.prepare("SELECT datetime('now', '+' || ? || ' hours') AS t")
    .get(Math.floor(ttl)) as { t: string }
  expiresAt = row.t
}
```

When checking if a URL is expired, compare ISO datetime strings:
```typescript
if (row.expires_at && row.expires_at <= new Date().toISOString()) {
  res.status(410).json({ error: 'URL expirada' })
  return
}
```

### Redirect short codes

Short codes are case-sensitive. Generate random ones as 6-char base64url:
```typescript
function generateShortCode(): string {
  return crypto.randomBytes(4).toString('base64url').slice(0, 6)
}
```

Aliases are user-provided and validated against `/^[a-zA-Z0-9_-]{3,20}$/`.

## Logging

Request logging is handled by the global middleware in `server.ts`:
```
GET /api/urls → 200 (42ms)
POST /api/auth/login → 401 (15ms)
```

No need to add logging in route handlers; the middleware captures method, path, status, and duration automatically.
