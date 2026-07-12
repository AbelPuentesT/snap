import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { createApp } from '../src/server.js'
import { initDb, closeDb, getDb } from '../src/shared/db.js'

process.env['SNAP_DB_NAME'] = 'snap-test-dashboard.db'
let server: http.Server
let baseUrl: string

const userEmail = `dash-user-${Date.now()}@example.com`
const emptyEmail = `dash-empty-${Date.now() + 1}@example.com`

let userToken: string
let emptyToken: string

beforeAll(async () => {
  initDb()

  const app = createApp()
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

  const reg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password: 'pass123', name: 'Dashboard User' }),
  })
  userToken = (await reg.json()).token

  const emptyReg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: emptyEmail, password: 'pass123', name: 'Empty User' }),
  })
  emptyToken = (await emptyReg.json()).token
})

afterAll(() => {
  server?.close()
  const db = getDb()
  db.prepare('DELETE FROM urls WHERE user_id = (SELECT id FROM users WHERE email = ?)').run(userEmail)
  db.prepare('DELETE FROM users WHERE email IN (?, ?)').run(userEmail, emptyEmail)
  closeDb()
})

describe('GET /api/dashboard — autenticación', () => {
  it('rechaza 401 si no hay token', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`)
    expect(res.status).toBe(401)
  })
})

describe('GET /api/dashboard — usuario sin URLs', () => {
  it('devuelve todos los contadores en cero', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { authorization: `Bearer ${emptyToken}` },
    })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.summary).toEqual({ totalUrls: 0, totalClicks: 0, clicksLast7Days: 0 })
    expect(data.trends.clicksByDay).toEqual([])
    expect(data.trends.peakHours).toEqual([])
    expect(data.rankings.topUrls).toEqual([])
    expect(data.rankings.topReferrers).toEqual([])
    expect(data.rankings.uniqueIpsPerUrl).toEqual([])
    expect(data.urls).toEqual([])
  })
})

describe('GET /api/dashboard — usuario con URLs y clicks', () => {
  let shortCode1: string
  let shortCode2: string
  let originalUrl1: string
  let originalUrl2: string

  beforeAll(async () => {
    const r1 = await fetch(`${baseUrl}/api/urls`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ url: 'https://ejemplo.com/uno' }),
    })
    const b1 = await r1.json()
    shortCode1 = b1.shortCode
    originalUrl1 = b1.originalUrl

    const r2 = await fetch(`${baseUrl}/api/urls`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ url: 'https://ejemplo.com/dos' }),
    })
    const b2 = await r2.json()
    shortCode2 = b2.shortCode
    originalUrl2 = b2.originalUrl

    await fetch(`${baseUrl}/${shortCode1}`, { redirect: 'manual' })
    await fetch(`${baseUrl}/${shortCode1}`, { redirect: 'manual' })
    await fetch(`${baseUrl}/${shortCode1}`, { redirect: 'manual' })
    await fetch(`${baseUrl}/${shortCode2}`, { redirect: 'manual' })
    await fetch(`${baseUrl}/${shortCode2}`, { redirect: 'manual' })
  })

  it('devuelve totales correctos', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { authorization: `Bearer ${userToken}` },
    })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.summary.totalUrls).toBe(2)
    expect(data.summary.totalClicks).toBe(5)
  })

  it('incluye la lista de URLs con clicks', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { authorization: `Bearer ${userToken}` },
    })
    const data = await res.json()

    expect(data.urls).toHaveLength(2)

    const u1 = data.urls.find((u: { shortCode: string }) => u.shortCode === shortCode1)
    const u2 = data.urls.find((u: { shortCode: string }) => u.shortCode === shortCode2)

    expect(u1).toBeDefined()
    expect(u1.originalUrl).toBe(originalUrl1)
    expect(u1.clicks).toBe(3)

    expect(u2).toBeDefined()
    expect(u2.originalUrl).toBe(originalUrl2)
    expect(u2.clicks).toBe(2)
  })

  it('incluye topUrls ordenado por clicks descendente', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { authorization: `Bearer ${userToken}` },
    })
    const data = await res.json()

    expect(data.rankings.topUrls).toHaveLength(2)
    expect(data.rankings.topUrls[0].shortCode).toBe(shortCode1)
    expect(data.rankings.topUrls[0].clicks).toBe(3)
    expect(data.rankings.topUrls[1].shortCode).toBe(shortCode2)
    expect(data.rankings.topUrls[1].clicks).toBe(2)
  })

  it('incluye uniqueIpsPerUrl', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { authorization: `Bearer ${userToken}` },
    })
    const data = await res.json()

    data.rankings.uniqueIpsPerUrl.forEach((entry: { shortCode: string; uniqueVisitors: number }) => {
      expect(entry.uniqueVisitors).toBeGreaterThanOrEqual(1)
    })
  })

  it('incluye tendencias (clicksByDay y peakHours)', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { authorization: `Bearer ${userToken}` },
    })
    const data = await res.json()

    expect(Array.isArray(data.trends.clicksByDay)).toBe(true)
    expect(data.trends.clicksByDay.length).toBeGreaterThanOrEqual(1)

    expect(Array.isArray(data.trends.peakHours)).toBe(true)
  })
})
