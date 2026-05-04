import { Redis } from 'ioredis'
import { config } from '../config.js'
import { log } from '../log.js'

let redis: Redis | null = null

export function connectRedis(): void {
  if (redis) return
  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
  })
  redis.on('error', (err: Error) => {
    log.error('Redis client error', { message: String(err) })
  })
  log.info('Redis client ready')
}

export function getRedisClient(): Redis {
  if (!redis) {
    throw new Error('Redis not initialised; call connectRedis() first')
  }
  return redis
}

/** Redis key for unread badge count per role. */
export function unreadKeyForRole(role: string): string {
  return `unread:${role}`
}

export async function disconnectRedis(): Promise<void> {
  if (!redis) return
  try {
    await redis.quit()
    log.info('Redis connection closed')
  } finally {
    redis = null
  }
}
