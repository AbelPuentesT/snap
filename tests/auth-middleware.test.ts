import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/server.js'
import { initDb, closeDb, getDb } from '../src/shared/db.js'
import { register } from '../src/modules/auth/auth.service.js'
import { authenticate } from '../src/modules/auth/auth.middleware.js'

let server: http.Server
let baseUrl: string
let validToken: string

const testEmail = `mid-test-${Date.now()}@example.com`

beforeAll(() => {
  initDb()

  const app = createApp((app) => {
    app.get('/api/protected', authenticate, (req, res) => {
      res.json({ user: req.user, message: 'acceso concedido' })
    })
  })
  server = http.createServer(app)

  const result = register(testEmail, 'secret123', 'Middleware Tester')
  validToken = result.token

  return new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        baseUrl = `http://localhost:${addr.port}`
      }
      resolve()
    })
  })
})

afterAll(() => {
  server?.close()
  const db = getDb()
  db.prepare('DELETE FROM users WHERE email = ?').run(testEmail)
  closeDb()
})

describe('authenticate middleware', () => {
  it('permite acceso con token válido', async () => {
    const res = await fetch(`${baseUrl}/api/protected`, {
      headers: { authorization: `Bearer ${validToken}` },
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.message).toBe('acceso concedido')
    expect(body.user.sub).toBeTypeOf('number')
    expect(body.user.email).toBe(testEmail.toLowerCase())
  })

  it('rechaza 401 si no hay token', async () => {
    const res = await fetch(`${baseUrl}/api/protected`)
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBe('Token requerido')
  })

  it('rechaza 401 si el token está malformado', async () => {
    const res = await fetch(`${baseUrl}/api/protected`, {
      headers: { authorization: 'Bearer esto-no-es-un-jwt' },
    })
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBe('Token inválido o expirado')
  })

  it('rechaza 401 si el formato del header es inválido', async () => {
    const res = await fetch(`${baseUrl}/api/protected`, {
      headers: { authorization: validToken },
    })
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toContain('Formato inválido')
  })
})
