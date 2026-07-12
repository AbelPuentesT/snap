import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { createApp } from '../src/server.js'
import { initDb, closeDb } from '../src/shared/db.js'

let server: http.Server
let baseUrl: string

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
  closeDb()
})

describe('POST /api/urls — crear URL corta', () => {
  it('crea una URL corta y devuelve 201', async () => {
    const res = await fetch(`${baseUrl}/api/urls`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://ejemplo.com/muy/larga' }),
    })
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body).toHaveProperty('shortCode')
    expect(body.shortCode).toHaveLength(6)
    expect(body.originalUrl).toBe('https://ejemplo.com/muy/larga')
  })

  it('devuelve 400 si falta url', async () => {
    const res = await fetch(`${baseUrl}/api/urls`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toBe('url es requerida')
  })
})

describe('GET /api/urls — listar URLs', () => {
  let createdCode: string

  beforeAll(async () => {
    const res = await fetch(`${baseUrl}/api/urls`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://ejemplo.com/lista' }),
    })
    const body = await res.json()
    createdCode = body.shortCode
  })

  it('devuelve lista con las URLs creadas', async () => {
    const res = await fetch(`${baseUrl}/api/urls`)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThanOrEqual(1)

    const found = body.find((u: { shortCode: string }) => u.shortCode === createdCode)
    expect(found).toBeDefined()
    expect(found.originalUrl).toBe('https://ejemplo.com/lista')
    expect(found).toHaveProperty('createdAt')
  })
})

describe('GET /:shortCode — redirección', () => {
  let createdCode: string

  beforeAll(async () => {
    const res = await fetch(`${baseUrl}/api/urls`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://ejemplo.com/redirect-target' }),
    })
    const body = await res.json()
    createdCode = body.shortCode
  })

  it('redirige con 302 al visitar el código corto', async () => {
    const res = await fetch(`${baseUrl}/${createdCode}`, { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://ejemplo.com/redirect-target')
  })

  it('devuelve 404 para código inexistente', async () => {
    const res = await fetch(`${baseUrl}/xxxxxx`, { redirect: 'manual' })
    expect(res.status).toBe(404)
  })
})
