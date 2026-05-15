import { Kafka, logLevel, type Consumer } from 'kafkajs'
import { createMechanism } from '@jm18457/kafkajs-msk-iam-authentication-mechanism'
import { config, KAFKA_TOPICS } from '../config.js'
import { log } from '../log.js'
import { fanOut } from './fanOut.js'

let consumer: Consumer | null = null

function createConsumer(): Consumer {
  const brokers = config.kafkaBrokers
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const useMskIam = process.env.KAFKA_USE_IAM === 'true'
  const kafka = new Kafka({
    clientId: 'reglens-notification-service',
    brokers,
    logLevel: logLevel.NOTHING,
    ...(useMskIam && {
      ssl: true,
      sasl: createMechanism({ region: process.env.AWS_REGION ?? 'eu-north-1' }),
    }),
  })
  return kafka.consumer({ groupId: 'reglens-notification-service' })
}

/**
 * Subscribes to all notification topics and runs until {@link disconnectConsumer} is called.
 */
export async function runConsumer(): Promise<void> {
  if (consumer) {
    log.warn('Kafka consumer already running')
    return
  }
  consumer = createConsumer()
  await consumer.connect()
  await consumer.subscribe({ topics: [...KAFKA_TOPICS] })
  log.info('Kafka consumer subscribed', { topics: KAFKA_TOPICS })
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const raw = message.value?.toString() ?? '{}'
      try {
        await fanOut(topic, raw)
      } catch (e) {
        log.error('fanOut failed', { topic, message: String(e), stack: e instanceof Error ? e.stack : '' })
      }
    },
  })
}

export async function disconnectConsumer(): Promise<void> {
  if (!consumer) return
  try {
    await consumer.disconnect()
    log.info('Kafka consumer disconnected')
  } finally {
    consumer = null
  }
}
