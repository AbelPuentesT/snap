# Security Rules — Snap

Guidelines for authentication, authorization, data protection, and secure coding practices.

## Authentication

### JWT (JSON Web Tokens)

- **Algorithm**: HS256 (HMAC with SHA-256)
- **Secret**: `config.jwtSecret` (from `JWT_SECRET` env var, required in production)
- **Expiration**: 24 hours (`expiresIn: '24h'`)
- **Payload**: `{ sub, email }` (sub = user ID)

**Generation** (on register/login):
```typescript
const token = jwt.sign(
  { sub: user.id, email: user.email },
  config.jwtSecret,
  { expiresIn: '24h' }
)
```

**Verification** (in `authenticate` middleware):
```typescript
const payload = jwt.verify(token, config.jwtSecret) as unknown as JwtPayload
req.user = payload
```

### Stateless auth

- No refresh tokens (use a new session if needed)
- No token revocation (token is valid until expiry)
- No session store (JWT is self-contained)

If future work requires revocation, add a token blacklist table and check it during verification.

### Bearer token format

Protected endpoints require:
```http
Authorization: Bearer <JWT_TOKEN>
```

**Validation rules**:
1. Header must be present (not array, not undefined)
2. Must be `"Bearer <token>"` (exactly 2 parts, separated by space)
3. Token must be valid JWT (not expired, properly signed)

If any check fails, respond 401:
```typescript
if (!raw || Array.isArray(raw)) {
  res.status(401).json({ error: 'Token requerido' })
  return
}

const parts = raw.split(' ')
if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
  res.status(401).json({ error: 'Formato inválido. Use: Bearer <token>' })
  return
}

try {
  const payload = jwt.verify(parts[1], config.jwtSecret) as JwtPayload
  req.user = payload
  next()
} catch {
  res.status(401).json({ error: 'Token inválido o expirado' })
}
```

## Authorization

### User isolation

Every endpoint that accesses user data must verify ownership:
- URLs belong to the user who created them (check `user_id` in query)
- Dashboard stats are filtered to the authenticated user (use `req.user.sub`)
- Never return data from other users, even if requested

**Pattern**:
```typescript
// Always filter by req.user.sub
const row = db.prepare(
  'SELECT * FROM urls WHERE user_id = ? AND id = ?'
).get(req.user!.sub, urlId)

if (!row) {
  res.status(404).json({ error: 'URL no encontrada' })
  return
}
```

### Middleware order

Protect endpoints with the `authenticate` middleware BEFORE the handler:
```typescript
urlsRouter.use(authenticate)  // All routes below are protected
urlsRouter.get('/', listUrls)
urlsRouter.post('/', createUrl)
```

## Password handling

### Hashing

Passwords are hashed with `bcryptjs` before storage:
- **Algorithm**: bcrypt with cost 10
- **Never store plaintext passwords**

**On register**:
```typescript
const passwordHash = bcrypt.hashSync(password, 10)
db.prepare('INSERT INTO users (..., password_hash) VALUES (..., ?)')
  .run(..., passwordHash)
```

**On login**:
```typescript
const valid = bcrypt.compareSync(inputPassword, user.password_hash)
if (!valid) {
  throw new AuthError('Invalid email or password')
}
```

### Validation

- Minimum 6 characters (enforced in `auth.service.ts`)
- No maximum (allow passphrases)
- No complexity rules (length > complexity for usability)

## Input validation & injection prevention

### SQL injection

All database queries use parameterized statements (better-sqlite3):
```typescript
// ✅ Safe: parameter is escaped
db.prepare('SELECT * FROM users WHERE email = ?').get(email)

// ❌ Unsafe: never do this
db.exec(`SELECT * FROM users WHERE email = '${email}'`)
```

### XSS (frontend)

React escapes JSX content by default. Only avoid escaping in:
- Dangerously set HTML (don't do this for user input)
- Rich text editors (sanitize with DOMPurify before rendering)

### Field validation

Always validate user input before use:
```typescript
if (!email || typeof email !== 'string') {
  throw new AuthError('email must be a string')
}

if (!ALIAS_RE.test(alias)) {
  res.status(400).json({ error: 'alias debe tener 3-20 caracteres alfanuméricos' })
  return
}

if (ttl && typeof ttl !== 'number') {
  res.status(400).json({ error: 'ttl debe ser un número' })
  return
}
```

## Data protection

### Email normalization

Emails are normalized to lowercase + trimmed before storage and comparison:
```typescript
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
```

This prevents duplicate accounts like `User@example.com` and `user@example.com`.

### Sensitive data

**Do NOT expose**:
- Password hashes (never return to client)
- JWT secret (keep in env var only)
- Internal error details in production (500 error shows "Error interno del servidor", not the stack trace)
- Database connection strings
- API keys

**Safe to expose**:
- User ID, email, name
- Short codes, original URLs
- Click counts, timestamps
- Error messages (user-facing, in Spanish)

### Expired URLs

Expired URLs (TTL passed):
- Return 410 Gone (not 404, 404 means not found)
- Do NOT record clicks
- Do NOT reveal that the URL exists

```typescript
if (row.expires_at && row.expires_at <= new Date().toISOString()) {
  res.status(410).json({ error: 'URL expirada' })
  return
}
```

## Frontend security

### Token storage

- Store JWT in `localStorage` as `snap_token` (not in cookie, not in memory)
- On 401 response, clear `snap_token` and `snap_user` from localStorage
- On logout, clear localStorage and navigate to `/login`

```typescript
localStorage.removeItem('snap_token')
localStorage.removeItem('snap_user')
window.location.hash = '/login'
```

### CORS

If the frontend is on a different origin (not same origin in production), the backend must allow it:
```typescript
app.use(cors({ origin: 'https://frontend.example.com', credentials: true }))
```

Currently, frontend and backend are same-origin (backend serves frontend), so no explicit CORS headers needed.

### XSS in error messages

API error messages from the backend are user-controlled strings. Display them safely:
```typescript
// ✅ Safe: React escapes by default
<p>{error}</p>

// ✅ Safe: explicit textContent
element.textContent = error

// ❌ Unsafe: never do this
<p dangerouslySetInnerHTML={{ __html: error }} />
```

## Environment & secrets

### Required in production

```bash
PORT=3000              # Server port (required)
NODE_ENV=production    # Must be "production" to hide error details
JWT_SECRET=...         # Long, random string (required)
SNAP_DB_NAME=snap.db   # Database file name (optional, defaults to snap.db)
```

### Dev defaults

In development, missing `PORT` and `JWT_SECRET` have safe defaults. Never use dev defaults in production.

### .env file

- Never commit `.env` (only commit `.env.example`)
- Never log or expose env var values
- Use `process.env` directly; don't read and re-export sensitive values

## Error handling

### Development vs. production

**Development** (`NODE_ENV=development`):
```json
{ "error": "User not found", "detail": "SELECT * FROM users WHERE ... (error details)" }
```

**Production** (`NODE_ENV=production`):
```json
{ "error": "Error interno del servidor" }
```

Never expose stack traces, query details, or internal state in production.

### User-facing errors

Errors should be:
- In Spanish (matching API convention)
- Clear and actionable
- Non-technical (never expose table names, column names, SQL)

Examples:
- `"Email ya registrado"` ✅ (user understands they need a different email)
- `"Unique constraint violation on users.email"` ❌ (technical jargon)
- `"URL expirada"` ✅ (clear and concise)
- `"Foreign key constraint failed"` ❌ (not user-facing)

## Regular security updates

- Keep dependencies up to date (`npm audit`, `npm update`)
- Check for vulnerable packages regularly
- Pin major versions in `package.json` to prevent breaking changes
- Review `package-lock.json` in PRs to catch unexpected updates

## Rate limiting & DoS protection

Not currently implemented. If adding user-facing endpoints (public APIs), consider:
- Rate limiting per IP or per user
- Request size limits
- Timeout limits on long-running queries

Current implementation is safe for low-traffic use; add protection as traffic grows.
