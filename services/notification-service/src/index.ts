import { createApp } from './app.js'
import { config } from './config.js'
import { connectMongo, disconnectMongo } from './db/mongo.js'
import { connectRedis, disconnectRedis } from './db/redis.js'
import { disconnectConsumer, runConsumer } from './kafka/consumer.js'
import { log } from './log.js'

async function main(): Promise<void> {
  await connectMongo()
  connectRedis()

  void runConsumer().catch((err) => {
    log.error('Kafka consumer exited unexpectedly', {
      message: String(err),
      stack: err instanceof Error ? err.stack : '',
    })
    process.exit(1)
  })

  const app = createApp()
  const server = app.listen(config.port, () => {
    log.info('HTTP server listening', { port: config.port })
  })

  const shutdown = async (signal: string) => {
    log.info('Shutdown signal received', { signal })
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
    await disconnectConsumer()
    await disconnectMongo()
    await disconnectRedis()
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

main().catch((err) => {
  log.error('Fatal startup error', {
    message: String(err),
    stack: err instanceof Error ? err.stack : '',
  })
  process.exit(1)
})
