import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../../config.js'

export interface JwtPayload {
  sub: number
  email: string
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const raw = req.headers['authorization']

  if (!raw || Array.isArray(raw)) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }

  const parts = raw.split(' ')
  const token = parts[1]
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Formato inválido. Use: Bearer <token>' })
    return
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as unknown as JwtPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
