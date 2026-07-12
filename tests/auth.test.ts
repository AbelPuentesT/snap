import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { createApp } from '../src/server.js'
import { initDb, closeDb, getDb } from '../src/shared/db.js'

let server: http.Server
let baseUrl: string
const testEmail = `auth-test-${Date.now()}@example.com`
const testPassword = 'secret123'
const testName = 'Test User'

beforeAll(() => {
  initDb()

  const app = createApp()
  server = http.createServer(app)
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
  db.prepare('DELETE FROM users WHERE email = ?').run(testEmail.toLowerCase())
  closeDb()
})

describe('POST /api/auth/register', () => {
  it('registra un usuario exitosamente y devuelve JWT', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, name: testName }),
    })
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body).toHaveProperty('token')
    expect(body.user.email).toBe(testEmail.toLowerCase())
    expect(body.user.name).toBe(testName)
    expect(body.user).toHaveProperty('id')
  })

  it('rechaza email duplicado con 409', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, name: testName }),
    })
    expect(res.status).toBe(409)

    const body = await res.json()
    expect(body.error).toBe('Email already registered')
  })
})

describe('POST /api/auth/login', () => {
  const freshEmail = `login-test-${Date.now()}@example.com`

  beforeAll(async () => {
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: freshEmail, password: testPassword, name: 'Login User' }),
    })
  })

  it('loguea exitosamente y devuelve JWT', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: freshEmail, password: testPassword }),
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('token')
    expect(body.user.email).toBe(freshEmail.toLowerCase())
  })

  it('loguea con email en mayúsculas', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: freshEmail.toUpperCase(), password: testPassword }),
    })
    expect(res.status).toBe(200)
    expect((await res.json()).user.email).toBe(freshEmail.toLowerCase())
  })

  it('rechaza password incorrecto con 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: freshEmail, password: 'wrongpass' }),
    })
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBe('Invalid email or password')
  })

  it('rechaza email inexistente con 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@nowhere.com', password: testPassword }),
    })
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBe('Invalid email or password')
  })
})
