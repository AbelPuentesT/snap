# Testing Rules — Snap

Guidelines for writing, maintaining, and running tests across backend and frontend.

## Test philosophy

- **Integration > Unit**: Test through HTTP endpoints with a real database, not mocked
- **Real dependencies**: Use a real SQLite database (ephemeral, per-suite)
- **No mocking Express**: Build the actual Express app, create an HTTP server, hit it with `fetch()`
- **Isolated suites**: Each test suite uses its own database file to avoid cross-contamination

## Backend tests (vitest)

### Setup pattern

Every backend test suite follows this pattern:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { createApp } from '../src/server.js'
import { initDb, closeDb } from '../src/shared/db.js'

// 1. Set unique database per suite (BEFORE imports)
process.env['SNAP_DB_NAME'] = 'snap-test-urls.db'

let server: http.Server
let baseUrl: string
let token: string

const testEmail = `urls-test-${Date.now()}@example.com`

beforeAll(async () => {
  // 2. Initialize database and app
  initDb()
  const app = createApp()
  
  // 3. Create HTTP server on ephemeral port
  server = http.createServer(app)
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        baseUrl = `http://localhost:${addr.port}`
      }
      resolve()
    })
  })

  // 4. Create test user and get token
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'secret123',
      name: 'Test User',
    }),
  })
  const body = await res.json()
  token = body.token
})

afterAll(() => {
  server?.close()
  closeDb()
})
```

### Common helpers

Create a helper function for authenticated requests:

```typescript
function authHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  }
}
```

### Test structure

```typescript
describe('POST /api/urls — crear URL corta', () => {
  it('crea una URL y devuelve 201', async () => {
    const res = await fetch(`${baseUrl}/api/urls`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ url: 'https://example.com' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('shortCode')
    expect(body.shortCode).toHaveLength(6)
  })

  it('devuelve 400 si falta url', async () => {
    const res = await fetch(`${baseUrl}/api/urls`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('url es requerida')
  })
})
```

### Database isolation

**Critical**: Set `SNAP_DB_NAME` *before* any imports or `initDb()` calls:

```typescript
// ✅ Correct: set env before imports
process.env['SNAP_DB_NAME'] = 'snap-test-auth.db'
import { initDb } from '../src/shared/db.js'

// ❌ Wrong: set after import (too late)
initDb()
process.env['SNAP_DB_NAME'] = 'snap-test-auth.db'
```

Each suite should use a unique filename (`snap-test-{feature}.db`) so parallel test runs don't interfere.

### Test user creation

Create a throwaway user per suite with a timestamp-suffixed email:

```typescript
const testEmail = `urls-test-${Date.now()}@example.com`
```

This ensures no conflicts even if tests are run in parallel across machines.

### Assertions

Use `expect()` from vitest:

```typescript
// Status and headers
expect(res.status).toBe(201)
expect(res.headers.get('content-type')).toBe('application/json')

// Body
const body = await res.json()
expect(body).toHaveProperty('shortCode')
expect(body.shortCode).toHaveLength(6)
expect(body.originalUrl).toBe('https://example.com')

// Arrays
expect(Array.isArray(body)).toBe(true)
expect(body.length).toBeGreaterThanOrEqual(1)
```

### Test naming

- **Suite names**: Describe the endpoint and action (in Spanish where appropriate)
  - `POST /api/urls — crear URL corta`
  - `GET /api/dashboard — estadísticas del usuario`
- **Test names**: Start with verb, describe expected outcome
  - `devuelve 201 cuando es válido`
  - `devuelve 400 si falta url`
  - `redirige con 302 a la URL original`

## Testing patterns

### Happy path

Test the success case first:

```typescript
it('devuelve 200 y la lista de URLs', async () => {
  const res = await fetch(`${baseUrl}/api/urls`, {
    headers: { authorization: `Bearer ${token}` },
  })

  expect(res.status).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
})
```

### Error cases

Test each error condition separately:

```typescript
it('devuelve 401 sin token', async () => {
  const res = await fetch(`${baseUrl}/api/urls`)
  expect(res.status).toBe(401)
  expect((await res.json()).error).toBe('Token requerido')
})

it('devuelve 400 si falta url', async () => {
  const res = await fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  })
  expect(res.status).toBe(400)
  expect((await res.json()).error).toBe('url es requerida')
})

it('devuelve 409 si alias está en uso', async () => {
  // First request with alias
  await fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ url: 'https://a.com', alias: 'my-link' }),
  })

  // Second request with same alias
  const res = await fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ url: 'https://b.com', alias: 'my-link' }),
  })

  expect(res.status).toBe(409)
  expect((await res.json()).error).toBe('alias ya está en uso')
})
```

### Cross-user isolation

Test that users can't access each other's data:

```typescript
it('devuelve solo URLs del usuario autenticado', async () => {
  // Create URL as user1
  await fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token1}` },
    body: JSON.stringify({ url: 'https://user1.com' }),
  })

  // Create URL as user2
  const res2 = await fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token2}` },
    body: JSON.stringify({ url: 'https://user2.com' }),
  })

  // Fetch URLs as user1 (should only see their own)
  const res = await fetch(`${baseUrl}/api/urls`, {
    headers: { authorization: `Bearer ${token1}` },
  })

  const body = await res.json()
  expect(body.length).toBe(1)
  expect(body[0].originalUrl).toBe('https://user1.com')
})
```

### Redirect behavior

Test redirects with `redirect: 'manual'`:

```typescript
it('redirige con 302 al visitar short code', async () => {
  // Create URL first
  const createRes = await fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ url: 'https://example.com/target' }),
  })
  const { shortCode } = await createRes.json()

  // Visit short code
  const res = await fetch(`${baseUrl}/${shortCode}`, { redirect: 'manual' })

  expect(res.status).toBe(302)
  expect(res.headers.get('location')).toBe('https://example.com/target')
})
```

### TTL / Expiration

Test URL expiration:

```typescript
it('devuelve 410 para URL expirada', async () => {
  // Create URL with TTL of 0 hours (already expired)
  const createRes = await fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      url: 'https://example.com',
      ttl: 0,
    }),
  })
  const { shortCode } = await createRes.json()

  // Try to visit
  const res = await fetch(`${baseUrl}/${shortCode}`, { redirect: 'manual' })

  expect(res.status).toBe(410)
  expect((await res.json()).error).toBe('URL expirada')
})
```

## Running tests

### All tests

```bash
npm test  # vitest run (exit after completion)
```

### Watch mode

```bash
npm run test:watch  # vitest (re-run on file change)
```

### Single test file

```bash
npx vitest run tests/urls.test.ts
```

### Single test by name

```bash
npx vitest run -t "crea una URL corta"
```

## Frontend tests (not yet configured)

When adding frontend tests:
- Use `vitest` (same runner as backend)
- Use `@testing-library/react` for component testing
- Mock the `api/` module:
  ```typescript
  vi.mock('../api/client', () => ({
    api: vi.fn(),
  }))
  ```
- Mock `localStorage`:
  ```typescript
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  }
  global.localStorage = localStorageMock as any
  ```
- Test user flows (login → create URL → see dashboard)

## Test maintenance

- **Naming**: Use clear, descriptive test names (not `test 1`, `test 2`)
- **Comments**: Add comments only for non-obvious setup or workarounds
- **Fixtures**: Use helper functions to reduce duplication
- **Coverage**: Aim for >80% for critical paths (auth, URL creation, redirects)
- **Cleanup**: Always call `closeDb()` and `server.close()` in `afterAll`

## CI/CD considerations

Tests should:
- Be fast (ephemeral databases, no sleep calls)
- Be deterministic (no random data, use mocked dates if needed)
- Not require secrets (dev defaults work)
- Pass on any CI runner (no OS-specific assumptions)

Current tests are suitable for GitHub Actions, GitLab CI, or local runs.
