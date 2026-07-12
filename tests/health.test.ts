import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { createApp } from '../src/server.js'

let server: http.Server
let baseUrl: string

beforeAll(() => {
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
})

describe('GET /health', () => {
  it('responde con status ok', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('status', 'ok')
    expect(body).toHaveProperty('timestamp')
  })
})
