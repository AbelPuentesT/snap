import { Router, type Request, type Response, type NextFunction } from 'express'
import { register, login, AuthError } from './auth.service.js'

export const authRouter = Router()

authRouter.post('/register', (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string }

  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password and name are required' })
    return
  }

  try {
    const result = register(email, password, name)
    res.status(201).json(result)
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(409).json({ error: err.message })
      return
    }
    next(err)
  }
})

authRouter.post('/login', (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  try {
    const result = login(email, password)
    res.json(result)
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message })
      return
    }
    next(err)
  }
})
