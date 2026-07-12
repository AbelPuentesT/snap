import { Router, type Request, type Response } from 'express'
import { authenticate } from '../auth/auth.middleware.js'
import { getDashboard } from './dashboard.service.js'

export const dashboardRouter = Router()

dashboardRouter.get('/', authenticate, (req: Request, res: Response) => {
  const data = getDashboard(req.user!.sub)
  res.json(data)
})
