import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
import { ZodError } from 'zod'
import { log } from './log.js'
import { bearerAuth } from './middleware/bearerAuth.js'
import { healthRouter } from './routes/health.js'
import { notificationsRouter } from './routes/notifications.js'

export function createApp(): express.Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '512kb' }))

  app.use(healthRouter)
  app.use('/notifications', bearerAuth, notificationsRouter)

  const notFound: RequestHandler = (_req, res) => {
    res.status(404).json({ error: 'Not Found' })
  }
  app.use(notFound)

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.flatten() })
      return
    }
    const status =
      (err as Error & { statusCode?: number }).statusCode ??
      (err as Error & { status?: number }).status ??
      500
    if (status >= 500) {
      log.error('Unhandled error', { message: err.message, stack: err.stack })
    }
    res.status(status).json({ error: err.message || 'Error' })
  }
  app.use(errorHandler)

  return app
}
