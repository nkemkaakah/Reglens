import type { RequestHandler } from 'express'
import { config } from '../config.js'
import { log } from '../log.js'

/**
 * Matches obligation-service / catalog write pattern: {@code Authorization: Bearer <shared secret>}.
 * Applied only to mapping mutation + suggest routes (health stays public).
 */
export const bearerAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization
  const expected = `Bearer ${config.obligationServiceToken}`
  if (!header || header !== expected) {
    log.warn('Rejected request without valid service bearer', { path: req.path, method: req.method })
    res.status(403).json({ error: 'Forbidden', detail: 'Valid Authorization: Bearer token required' })
    return
  }
  next()
}
