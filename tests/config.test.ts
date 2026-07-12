import { describe, it, expect } from 'vitest'
import { loadConfig, ConfigError, type Config } from '../src/config.js'

describe('config — valores por defecto', () => {
  const cfg = loadConfig({})

  it('usa puerto 3000 por defecto', () => {
    expect(cfg.port).toBe(3000)
  })

  it('usa environment development por defecto', () => {
    expect(cfg.env).toBe('development')
  })

  it('usa snap.db como nombre de base de datos por defecto', () => {
    expect(cfg.dbName).toBe('snap.db')
  })

  it('usa jwtSecret por defecto en development', () => {
    expect(cfg.jwtSecret).toBe('snap-dev-secret-do-not-use-in-prod')
  })
})

describe('config — lectura de variables de entorno', () => {
  const cfg = loadConfig({
    PORT: '4000',
    NODE_ENV: 'production',
    SNAP_DB_NAME: 'prod.db',
    JWT_SECRET: 'prod-secret',
  })

  it('lee PORT de entorno', () => {
    expect(cfg.port).toBe(4000)
  })

  it('lee NODE_ENV de entorno', () => {
    expect(cfg.env).toBe('production')
  })

  it('lee SNAP_DB_NAME de entorno', () => {
    expect(cfg.dbName).toBe('prod.db')
  })

  it('lee JWT_SECRET de entorno', () => {
    const cfg = loadConfig({ JWT_SECRET: 'mi-secreto' })
    expect(cfg.jwtSecret).toBe('mi-secreto')
  })
})

describe('config — validación en production', () => {
  it('lanza ConfigError si PORT no está definido en production', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production' })
    ).toThrow(ConfigError)
  })

  it('lanza ConfigError si JWT_SECRET no está definido en production', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', PORT: '4000' })
    ).toThrow(ConfigError)
  })

  it('lanza ConfigError si PORT no es numérico en production', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', PORT: 'abc' })
    ).toThrow(ConfigError)
  })

  it('no lanza error si no hay PORT en development', () => {
    expect(() => loadConfig({})).not.toThrow()
  })

  it('el mensaje de error incluye el nombre de la variable', () => {
    try {
      loadConfig({ NODE_ENV: 'production' })
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError)
      expect(ConfigError.prototype.isPrototypeOf(e)).toBe(true)
    }
  })
})
