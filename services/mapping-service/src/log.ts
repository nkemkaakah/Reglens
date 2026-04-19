/**
 * Lightweight structured logging — avoids pulling a full logger stack for this small service.
 * Prefix every line so docker logs are easy to grep.
 */
const PREFIX = '[mapping-service]'

export const log = {
  info: (msg: string, meta?: Record<string, unknown>) => {
    if (meta && Object.keys(meta).length > 0) {
      console.info(PREFIX, msg, meta)
    } else {
      console.info(PREFIX, msg)
    }
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    console.warn(PREFIX, msg, meta ?? '')
  },
  error: (msg: string, meta?: Record<string, unknown>) => {
    console.error(PREFIX, msg, meta ?? '')
  },
}
