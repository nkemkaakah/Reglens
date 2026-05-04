import { Router } from 'express'
import { z } from 'zod'
import { getNotificationsCollection } from '../db/mongo.js'
import { getRedisClient, unreadKeyForRole } from '../db/redis.js'

const router = Router()

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  skip: z.coerce.number().int().min(0).default(0),
})

const UNREAD_CACHE_TTL_SEC = 60

async function resolveUnreadCount(role: string): Promise<number> {
  const redis = getRedisClient()
  const key = unreadKeyForRole(role)
  const cached = await redis.get(key)
  if (cached !== null) {
    const n = Number.parseInt(cached, 10)
    return Number.isNaN(n) ? 0 : n
  }
  const col = getNotificationsCollection()
  const count = await col.countDocuments({ recipientRole: role, read: false })
  await redis.set(key, String(count), 'EX', UNREAD_CACHE_TTL_SEC)
  return count
}

router.get('/', async (req, res, next) => {
  try {
    const role = String(req.headers['x-user-role'] ?? '').trim()
    if (!role) {
      res.status(401).json({ error: 'Unauthorized', detail: 'Role claim missing' })
      return
    }
    const q = listQuerySchema.parse(req.query)
    const unreadCount = await resolveUnreadCount(role)
    const col = getNotificationsCollection()
    const notifications = await col
      .find({ recipientRole: role })
      .sort({ createdAt: -1 })
      .skip(q.skip)
      .limit(q.limit)
      .toArray()
    res.json({ notifications, unreadCount })
  } catch (e) {
    next(e)
  }
})

router.patch('/read-all', async (req, res, next) => {
  try {
    const role = String(req.headers['x-user-role'] ?? '').trim()
    if (!role) {
      res.status(401).json({ error: 'Unauthorized', detail: 'Role claim missing' })
      return
    }
    const col = getNotificationsCollection()
    await col.updateMany({ recipientRole: role, read: false }, { $set: { read: true } })
    const redis = getRedisClient()
    await redis.set(unreadKeyForRole(role), '0')
    res.sendStatus(204)
  } catch (e) {
    next(e)
  }
})

router.patch('/:id/read', async (req, res, next) => {
  try {
    const role = String(req.headers['x-user-role'] ?? '').trim()
    if (!role) {
      res.status(401).json({ error: 'Unauthorized', detail: 'Role claim missing' })
      return
    }
    const id = req.params.id
    const col = getNotificationsCollection()
    const result = await col.updateOne({ _id: id, recipientRole: role }, { $set: { read: true } })
    if (result.modifiedCount === 1) {
      const redis = getRedisClient()
      const key = unreadKeyForRole(role)
      const v = await redis.decr(key)
      if (v < 0) {
        await redis.set(key, '0')
      }
    }
    res.sendStatus(204)
  } catch (e) {
    next(e)
  }
})

export { router as notificationsRouter }
