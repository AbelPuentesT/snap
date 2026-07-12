import { Router, type Request, type Response, type NextFunction } from 'express'
import crypto from 'node:crypto'
import { getDb } from '../../shared/db.js'

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
  const insert = db.prepare('INSERT INTO urls (short_code, original_url) VALUES (?, ?)')

  do {
    shortCode = generateShortCode()
  } while (db.prepare('SELECT 1 FROM urls WHERE short_code = ?').get(shortCode))

  insert.run(shortCode, url)

  res.status(201).json({ shortCode, originalUrl: url })
}

export function listUrls(_req: Request, res: Response): void {
  const rows = getDb().prepare('SELECT short_code, original_url, created_at FROM urls ORDER BY created_at DESC').all() as Array<Record<string, unknown>>

  res.json(rows.map((r) => ({
    shortCode: r['short_code'],
    originalUrl: r['original_url'],
    createdAt: r['created_at'],
  })))
}

export function redirectUrl(req: Request, res: Response, next: NextFunction): void {
  const row = getDb().prepare('SELECT original_url FROM urls WHERE short_code = ?').get(req.params['shortCode']) as { original_url: string } | undefined

  if (!row) {
    res.status(404).json({ error: 'URL no encontrada' })
    return
  }

  res.redirect(302, row.original_url)
}

export const urlsRouter = Router()

urlsRouter.post('/', createUrl)
urlsRouter.get('/', listUrls)
