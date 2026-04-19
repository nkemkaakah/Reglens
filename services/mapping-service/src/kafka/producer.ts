import { Kafka, logLevel, type Producer } from 'kafkajs'
import { config } from '../config.js'
import { log } from '../log.js'

let producer: Producer | null = null

/** Lazily builds the KafkaJS client — broker list comes from env (Docker vs host). */
function createProducer(): Producer {
  const brokers = config.kafkaBrokers
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const kafka = new Kafka({
    clientId: 'reglens-mapping-service',
    brokers,
    logLevel: logLevel.NOTHING,
  })
  return kafka.producer()
}

export async function connectProducer(): Promise<void> {
  if (producer) return
  producer = createProducer()
  await producer.connect()
  log.info('Kafka producer ready', { brokers: config.kafkaBrokers })
}

export async function disconnectProducer(): Promise<void> {
  if (!producer) return
  try {
    await producer.disconnect()
    log.info('Kafka producer disconnected')
  } finally {
    producer = null
  }
}

/**
 * Publishes after obligation-service successfully stored approved mappings.
 * Topic name follows PRD / implementation plan ({@code obligation.mapped}).
 */
export async function publishObligationMapped(payload: {
  obligationId: string
  approvedBy: string
  controlIds: string[]
  systemIds: string[]
  occurredAt: string
}): Promise<void> {
  if (!producer) {
    throw new Error('Kafka producer not initialised')
  }
  const value = JSON.stringify(payload)
  await producer.send({
    topic: config.kafkaTopicMapped,
    messages: [
      {
        key: payload.obligationId,
        value,
      },
    ],
  })
  log.info('Kafka publish ok', {
    topic: config.kafkaTopicMapped,
    obligationId: payload.obligationId,
    controls: payload.controlIds.length,
    systems: payload.systemIds.length,
  })
}
