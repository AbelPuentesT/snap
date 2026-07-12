import { Router } from 'express'

export const dashboardRouter = Router()

dashboardRouter.get('/', (_req, res) => {
  res.json({ message: 'Dashboard module placeholder' })
})
