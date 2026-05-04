import { MongoClient, type Collection } from 'mongodb'
import { config } from '../config.js'
import { log } from '../log.js'
import type { Notification } from '../domain/Notification.js'

let client: MongoClient | null = null

const DEFAULT_DB = 'reglens_notifications'
const COLLECTION = 'notifications'

function databaseNameFromUri(uri: string): string {
  const withoutQuery = uri.split('?')[0] ?? uri
  const idx = withoutQuery.lastIndexOf('/')
  if (idx === -1 || idx === withoutQuery.length - 1) return DEFAULT_DB
  const name = withoutQuery.slice(idx + 1)
  return name || DEFAULT_DB
}

export async function connectMongo(): Promise<void> {
  if (client) return
  client = new MongoClient(config.mongoUri)
  await client.connect()
  const dbName = databaseNameFromUri(config.mongoUri)
  const collection = client.db(dbName).collection<Notification>(COLLECTION)
  await collection.createIndex({ recipientRole: 1, read: 1, createdAt: -1 })
  log.info('MongoDB connected', { db: dbName, collection: COLLECTION })
}

export function getNotificationsCollection(): Collection<Notification> {
  if (!client) {
    throw new Error('MongoClient not initialised; call connectMongo() first')
  }
  const dbName = databaseNameFromUri(config.mongoUri)
  return client.db(dbName).collection<Notification>(COLLECTION)
}

export async function disconnectMongo(): Promise<void> {
  if (!client) return
  try {
    await client.close()
    log.info('MongoDB connection closed')
  } finally {
    client = null
  }
}
