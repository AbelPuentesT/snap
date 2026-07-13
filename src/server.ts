import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { urlsRouter, redirectUrl } from './modules/urls/urls.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { authRouter } from './modules/auth/auth.routes.js'
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js'

function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()

  res.on('finish', () => {
    const ms = Date.now() - start
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`)
  })

  next()
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Ruta no encontrada' })
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const isDev = process.env['NODE_ENV'] !== 'production'
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(isDev && { detail: err.message }),
  })
}

export function createApp(onBeforeFinal?: (app: Express) => void): Express {
  const app = express()

  app.use(requestLogger)
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.use('/api/urls', urlsRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/dashboard', dashboardRouter)

  onBeforeFinal?.(app)

  const clientDist = path.resolve(__dirname, '..', 'client', 'dist')
  app.use(express.static(clientDist))
  app.get(['/login', '/register'], (_req, res) => {
    res.sendFile(path.resolve(clientDist, 'index.html'))
  })

  app.get('/:shortCode', redirectUrl)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
