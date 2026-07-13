import { Router, type Request, type Response, type NextFunction } from 'express'
import crypto from 'node:crypto'
import { getDb } from '../../shared/db.js'
import { authenticate } from '../auth/auth.middleware.js'

function generateShortCode(): string {
  return crypto.randomBytes(4).toString('base64url').slice(0, 6)
}

const ALIAS_RE = /^[a-zA-Z0-9_-]{3,20}$/

export function createUrl(req: Request, res: Response, next: NextFunction): void {
  const { url, alias, ttl } = req.body as { url?: string; alias?: string; ttl?: number }

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url es requerida' })
    return
  }

  const db = getDb()
  let shortCode: string

  if (alias && typeof alias === 'string') {
    if (!ALIAS_RE.test(alias)) {
      res.status(400).json({ error: 'alias debe tener 3-20 caracteres alfanuméricos' })
      return
    }
    if (db.prepare('SELECT 1 FROM urls WHERE short_code = ?').get(alias)) {
      res.status(409).json({ error: 'alias ya está en uso' })
      return
    }
    shortCode = alias
  } else {
    do {
      shortCode = generateShortCode()
    } while (db.prepare('SELECT 1 FROM urls WHERE short_code = ?').get(shortCode))
  }

  let expiresAt: string | null = null
  if (ttl && typeof ttl === 'number' && ttl > 0) {
    const row = db.prepare("SELECT datetime('now', '+' || ? || ' hours') AS t").get(Math.floor(ttl)) as { t: string }
    expiresAt = row.t
  }

  const insert = db.prepare('INSERT INTO urls (short_code, original_url, user_id, expires_at) VALUES (?, ?, ?, ?)')
  insert.run(shortCode, url, req.user!.sub, expiresAt)

  res.status(201).json({ shortCode, originalUrl: url, expiresAt })
}

export function listUrls(req: Request, res: Response): void {
  const rows = getDb().prepare(
    "SELECT short_code, original_url, created_at, expires_at FROM urls WHERE user_id = ? ORDER BY created_at DESC"
  ).all(req.user!.sub) as Array<Record<string, unknown>>

  res.json(rows.map((r) => ({
    shortCode: r['short_code'],
    originalUrl: r['original_url'],
    createdAt: r['created_at'],
    expiresAt: r['expires_at'] ?? null,
    expired: r['expires_at'] != null && r['expires_at'] <= new Date().toISOString(),
  })))
}

export function redirectUrl(req: Request, res: Response): void {
  const db = getDb()
  const row = db.prepare('SELECT id, original_url, expires_at FROM urls WHERE short_code = ?').get(req.params['shortCode']) as { id: number; original_url: string; expires_at: string | null } | undefined

  if (!row) {
    res.status(404).json({ error: 'URL no encontrada' })
    return
  }

  if (row.expires_at && row.expires_at <= new Date().toISOString()) {
    res.status(410).json({ error: 'URL expirada' })
    return
  }

  db.prepare(
    'INSERT INTO clicks (url_id, ip_address, user_agent, referer) VALUES (?, ?, ?, ?)'
  ).run(row.id, req.ip ?? null, req.headers['user-agent'] ?? null, req.headers['referer'] ?? null)

  res.redirect(302, row.original_url)
}

export const urlsRouter = Router()

urlsRouter.use(authenticate)
urlsRouter.post('/', createUrl)
urlsRouter.get('/', listUrls)
