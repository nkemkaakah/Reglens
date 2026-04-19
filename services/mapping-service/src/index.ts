import { createApp } from './app.js'
import { config } from './config.js'
import { connectProducer, disconnectProducer } from './kafka/producer.js'
import { log } from './log.js'

async function main(): Promise<void> {
  await connectProducer()

  const app = createApp()
  const server = app.listen(config.port, () => {
    log.info('HTTP server listening', { port: config.port })
  })

  const shutdown = async (signal: string) => {
    log.info('Shutdown signal received', { signal })
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
    await disconnectProducer()
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

main().catch((err) => {
  log.error('Fatal startup error', { message: String(err), stack: err instanceof Error ? err.stack : '' })
  process.exit(1)
})
