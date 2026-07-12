import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { createApp } from '../src/server.js'

describe('404 — rutas no encontradas', () => {
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

  afterAll(() => { server?.close() })

  it('devuelve 404 con JSON para ruta inexistente', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent`)
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body).toEqual({ error: 'Ruta no encontrada' })
  })

  it('devuelve 404 incluso con métodos no GET', async () => {
    const res = await fetch(`${baseUrl}/api/urls/999`, { method: 'PATCH' })
    expect(res.status).toBe(404)
  })
})

describe('Error handler global', () => {
  let server: http.Server
  let baseUrl: string

  beforeAll(() => {
    const app = createApp((app) => {
      app.get('/trigger-error', (_req, _res, next) => {
        next(new Error('Algo salió mal'))
      })
    })
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

  afterAll(() => { server?.close() })

  it('captura errores no manejados y devuelve 500', async () => {
    const res = await fetch(`${baseUrl}/trigger-error`)
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBe('Error interno del servidor')
  })

  it('incluye detail en desarrollo (NODE_ENV distinto de production)', async () => {
    const res = await fetch(`${baseUrl}/trigger-error`)
    const body = await res.json()
    expect(body.detail).toBe('Algo salió mal')
  })

  it('no expone detail cuando NODE_ENV=production', async () => {
    const oldEnv = process.env['NODE_ENV']
    process.env['NODE_ENV'] = 'production'
    let prodUrl = ''

    const app = createApp((app) => {
      app.get('/trigger-error', (_req, _res, next) => {
        next(new Error('Secreto interno'))
      })
    })

    const serverProd = http.createServer(app)
    await new Promise<void>((resolve) => {
      serverProd.listen(0, () => {
        const addr = serverProd.address()
        if (addr && typeof addr === 'object') {
          prodUrl = `http://localhost:${addr.port}`
        }
        resolve()
      })
    })

    const res = await fetch(`${prodUrl}/trigger-error`)
    const body = await res.json()
    expect(body.error).toBe('Error interno del servidor')
    expect(body).not.toHaveProperty('detail')

    serverProd.close()
    process.env['NODE_ENV'] = oldEnv
  })

  it('el servidor no se cae tras un error no manejado', async () => {
    const res1 = await fetch(`${baseUrl}/trigger-error`)
    expect(res1.status).toBe(500)

    const res2 = await fetch(`${baseUrl}/health`)
    expect(res2.status).toBe(200)
  })
})
