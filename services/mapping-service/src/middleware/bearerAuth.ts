import type { RequestHandler } from 'express'
import { log } from '../log.js'

/**
 * Validates incoming bearer JWT claims for mapping routes.
 */
export const bearerAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization

  if (req.method === 'OPTIONS') {
    next()
    return
  }
  if (!header || !header.startsWith('Bearer ')) {
    log.warn('Rejected request without bearer token', { path: req.path, method: req.method })
    res.status(401).json({ error: 'Unauthorized', detail: 'Bearer token required' })
    return
  }

  try {
    const token = header.slice('Bearer '.length).trim()
    const parts = token.split('.')
    if (parts.length < 2) throw new Error('Malformed token')
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8')
    const payload = JSON.parse(payloadJson) as {
      iss?: string
      aud?: string
      exp?: number
      sub?: string
      ['https://reglens.io/role']?: string
    }

    if (payload.iss !== 'https://demo.reglens.io' || payload.aud !== 'https://api.reglens.io') {
      throw new Error('Invalid token claims')
    }
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new Error('Expired token')
    }

    req.headers['x-user-id'] = payload.sub ?? ''
    req.headers['x-user-role'] = payload['https://reglens.io/role'] ?? ''
  } catch (error) {
    log.warn('Rejected request with invalid bearer token', {
      path: req.path,
      method: req.method,
      message: String(error),
    })
    res.status(401).json({ error: 'Unauthorized', detail: 'Invalid bearer token' })
    return
  }
  next()
}
