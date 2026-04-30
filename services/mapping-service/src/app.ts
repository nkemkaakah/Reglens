import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
import { ZodError } from 'zod'
import { HttpError } from './httpError.js'
import { log } from './log.js'
import { bearerAuth } from './middleware/bearerAuth.js'
import { healthRouter } from './routes/health.js'
import { obligationsRouter } from './routes/obligations.js'

export function createApp(): express.Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '2mb' }))

  app.use(healthRouter)

  // Protected mapping routes — require a valid bearer JWT.
  app.use('/obligations', bearerAuth, obligationsRouter)

  const notFound: RequestHandler = (_req, res) => {
    res.status(404).json({ error: 'Not Found' })
  }
  app.use(notFound)

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.flatten() })
      return
    }
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message })
      return
    }
    const status =
      (err as Error & { statusCode?: number }).statusCode ??
      (err as Error & { status?: number }).status ??
      500
    if (status >= 500) {
      log.error('Unhandled error', { message: err.message, stack: err.stack })
    } else {
      log.warn('Request failed', { message: err.message, status })
    }
    const body: Record<string, unknown> = { error: err.message || 'Error' }
    if (status === 503) body.detail = 'LLM is not configured or upstream unavailable'
    res.status(status).json(body)
  }
  app.use(errorHandler)

  return app
}
