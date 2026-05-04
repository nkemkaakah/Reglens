import { MongoServerError } from 'mongodb'
import { z } from 'zod'
import { config } from '../config.js'
import type { Notification } from '../domain/Notification.js'
import { getNotificationsCollection } from '../db/mongo.js'
import { getRedisClient, unreadKeyForRole } from '../db/redis.js'
import { log } from '../log.js'

const ROLES = {
  COMPLIANCE_OFFICER: 'COMPLIANCE_OFFICER',
  RISK_CONTROL_MANAGER: 'RISK_CONTROL_MANAGER',
  TECHNOLOGY_LEAD: 'TECHNOLOGY_LEAD',
  AI_GOVERNANCE_LEAD: 'AI_GOVERNANCE_LEAD',
} as const

const baseFields = {
  eventId: z.string().min(1),
}

const obligationMappedSchema = z.object({
  ...baseFields,
  obligationId: z.string().min(1),
  approvedBy: z.string().min(1),
  occurredAt: z.string().optional(),
})

const mappingSuggestedSchema = z.object({
  ...baseFields,
  obligationId: z.string().min(1),
  suggestedBy: z.string().min(1),
  occurredAt: z.string().optional(),
})

const documentIngestedSchema = z.object({
  ...baseFields,
  documentId: z.string().min(1),
  obligationIds: z.array(z.string()).optional(),
  occurredAt: z.string().optional(),
})

const impactGeneratedSchema = z.object({
  ...baseFields,
  obligationId: z.string().min(1),
  generatedAt: z.string().optional(),
})

const aiSystemLifecycleSchema = z.object({
  ...baseFields,
  aiSystemId: z.string().min(1),
  action: z.string().optional(),
  occurredAt: z.string().optional(),
})

function parseCreatedAt(iso: string | undefined): Date {
  if (!iso) return new Date()
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

const ADMIN_ROLE = 'ADMIN'

async function insertAndIncr(doc: Notification): Promise<void> {
  const col = getNotificationsCollection()
  const redis = getRedisClient()
  try {
    await col.insertOne(doc)
  } catch (e) {
    if (e instanceof MongoServerError && e.code === 11_000) {
      return
    }
    throw e
  }
  await redis.incr(unreadKeyForRole(doc.recipientRole))
}

/** One summary row per Kafka event for ADMIN — same deep link/title as role-targeted docs where applicable. */
async function insertAdminForEvent(eventId: string, doc: Omit<Notification, '_id' | 'recipientRole'>): Promise<void> {
  await insertAndIncr({
    ...doc,
    _id: `${eventId}:${ADMIN_ROLE}`,
    recipientRole: ADMIN_ROLE,
  })
}

function deepLinkObligationMappings(obligationId: string): string {
  return `/obligations?obligation=${encodeURIComponent(obligationId)}&panel=mappings`
}

function deepLinkObligationImpact(obligationId: string): string {
  return `/obligations?obligation=${encodeURIComponent(obligationId)}&panel=impact`
}

export async function fanOut(topic: string, rawJson: string): Promise<void> {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson) as unknown
  } catch (e) {
    log.warn('fanOut: invalid JSON', { topic, message: String(e) })
    return
  }

  if (topic === config.kafkaTopicMapped) {
    const p = obligationMappedSchema.safeParse(parsed)
    if (!p.success) {
      log.warn('fanOut: obligation.mapped validation failed', { issues: p.error.flatten() })
      return
    }
    const { eventId, obligationId, approvedBy, occurredAt } = p.data
    const createdAt = parseCreatedAt(occurredAt)
    const title = `Obligation mapped by ${approvedBy}`
    const deepLink = deepLinkObligationMappings(obligationId)
    const metadata: Record<string, unknown> = { obligationId, approvedBy, eventId }
    const roles = [ROLES.COMPLIANCE_OFFICER, ROLES.RISK_CONTROL_MANAGER] as const
    for (const recipientRole of roles) {
      const doc: Notification = {
        _id: `${eventId}:${recipientRole}`,
        recipientRole,
        type: 'obligation.mapped',
        title,
        deepLink,
        read: false,
        createdAt,
        metadata,
      }
      await insertAndIncr(doc)
    }
    await insertAdminForEvent(eventId, {
      type: 'obligation.mapped',
      title,
      deepLink,
      read: false,
      createdAt,
      metadata,
    })
    return
  }

  if (topic === config.kafkaTopicMappingSuggested) {
    const p = mappingSuggestedSchema.safeParse(parsed)
    if (!p.success) {
      log.warn('fanOut: mapping.suggested validation failed', { issues: p.error.flatten() })
      return
    }
    const { eventId, obligationId, occurredAt } = p.data
    const createdAt = parseCreatedAt(occurredAt)
    const doc: Notification = {
      _id: `${eventId}:${ROLES.COMPLIANCE_OFFICER}`,
      recipientRole: ROLES.COMPLIANCE_OFFICER,
      type: 'mapping.suggested',
      title: 'Mapping suggestions ready for review',
      deepLink: deepLinkObligationMappings(obligationId),
      read: false,
      createdAt,
      metadata: { obligationId, eventId },
    }
    await insertAndIncr(doc)
    await insertAdminForEvent(eventId, {
      type: 'mapping.suggested',
      title: doc.title,
      deepLink: doc.deepLink,
      read: false,
      createdAt,
      metadata: doc.metadata,
    })
    return
  }

  if (topic === config.kafkaTopicDocumentIngested) {
    const p = documentIngestedSchema.safeParse(parsed)
    if (!p.success) {
      log.warn('fanOut: document.ingested validation failed', { issues: p.error.flatten() })
      return
    }
    const { eventId, documentId, obligationIds, occurredAt } = p.data
    const n = obligationIds?.length ?? 0
    const createdAt = parseCreatedAt(occurredAt)
    const doc: Notification = {
      _id: `${eventId}:${ROLES.COMPLIANCE_OFFICER}`,
      recipientRole: ROLES.COMPLIANCE_OFFICER,
      type: 'document.ingested',
      title: `Document ingested — ${n} obligation(s) created`,
      deepLink: '/obligations',
      read: false,
      createdAt,
      metadata: { documentId, obligationCount: n, eventId },
    }
    await insertAndIncr(doc)
    await insertAdminForEvent(eventId, {
      type: 'document.ingested',
      title: doc.title,
      deepLink: doc.deepLink,
      read: false,
      createdAt,
      metadata: doc.metadata,
    })
    return
  }

  if (topic === config.kafkaTopicImpactGenerated) {
    const p = impactGeneratedSchema.safeParse(parsed)
    if (!p.success) {
      log.warn('fanOut: impact.generated validation failed', { issues: p.error.flatten() })
      return
    }
    const { eventId, obligationId, generatedAt } = p.data
    const createdAt = parseCreatedAt(generatedAt)
    const deepLink = deepLinkObligationImpact(obligationId)
    const metadata: Record<string, unknown> = { obligationId, eventId }
    const title = 'Impact analysis generated'
    for (const recipientRole of [ROLES.TECHNOLOGY_LEAD, ROLES.COMPLIANCE_OFFICER] as const) {
      const doc: Notification = {
        _id: `${eventId}:${recipientRole}`,
        recipientRole,
        type: 'impact.generated',
        title,
        deepLink,
        read: false,
        createdAt,
        metadata,
      }
      await insertAndIncr(doc)
    }
    await insertAdminForEvent(eventId, {
      type: 'impact.generated',
      title,
      deepLink,
      read: false,
      createdAt,
      metadata,
    })
    return
  }

  if (topic === config.kafkaTopicAiSystemLifecycle) {
    const p = aiSystemLifecycleSchema.safeParse(parsed)
    if (!p.success) {
      log.warn('fanOut: ai_system.lifecycle validation failed', { issues: p.error.flatten() })
      return
    }
    const { eventId, aiSystemId, action, occurredAt } = p.data
    const createdAt = parseCreatedAt(occurredAt)
    const a = (action ?? '').trim().toUpperCase()
    const created = a === 'CREATED'
    const title = created ? 'AI system created' : 'AI system updated'
    const doc: Notification = {
      _id: `${eventId}:${ROLES.AI_GOVERNANCE_LEAD}`,
      recipientRole: ROLES.AI_GOVERNANCE_LEAD,
      type: 'ai_system.lifecycle',
      title,
      deepLink: '/ai-registry',
      read: false,
      createdAt,
      metadata: { aiSystemId, action: a, eventId },
    }
    await insertAndIncr(doc)
    await insertAdminForEvent(eventId, {
      type: 'ai_system.lifecycle',
      title,
      deepLink: doc.deepLink,
      read: false,
      createdAt,
      metadata: doc.metadata,
    })
    return
  }

  log.warn('fanOut: unhandled topic', { topic })
}
