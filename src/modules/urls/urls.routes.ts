import { Router, type Request, type Response, type NextFunction } from 'express'
import crypto from 'node:crypto'
import { getDb } from '../../shared/db.js'
import { authenticate } from '../auth/auth.middleware.js'

function generateShortCode(): string {
  return crypto.randomBytes(4).toString('base64url').slice(0, 6)
}

export function createUrl(req: Request, res: Response, next: NextFunction): void {
  const { url } = req.body as { url?: string }

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url es requerida' })
    return
  }

  let shortCode: string
  const db = getDb()
  const insert = db.prepare('INSERT INTO urls (short_code, original_url, user_id) VALUES (?, ?, ?)')

  do {
    shortCode = generateShortCode()
  } while (db.prepare('SELECT 1 FROM urls WHERE short_code = ?').get(shortCode))

  insert.run(shortCode, url, req.user!.sub)

  res.status(201).json({ shortCode, originalUrl: url })
}

export function listUrls(req: Request, res: Response): void {
  const rows = getDb().prepare(
    'SELECT short_code, original_url, created_at FROM urls WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user!.sub) as Array<Record<string, unknown>>

  res.json(rows.map((r) => ({
    shortCode: r['short_code'],
    originalUrl: r['original_url'],
    createdAt: r['created_at'],
  })))
}

export function redirectUrl(req: Request, res: Response): void {
  const db = getDb()
  const row = db.prepare('SELECT id, original_url FROM urls WHERE short_code = ?').get(req.params['shortCode']) as { id: number; original_url: string } | undefined

  if (!row) {
    res.status(404).json({ error: 'URL no encontrada' })
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
