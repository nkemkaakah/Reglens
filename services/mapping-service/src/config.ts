import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

// Load .env when running locally (Docker Compose injects env at runtime).
loadDotenv()

const ConfigSchema = z.object({
  port: z.coerce.number().default(3000),
  obligationServiceBaseUrl: z.string().url(),
  catalogServiceBaseUrl: z.string().url(),
  /** Same bearer secret obligation-service expects for POST writes (ingestion + mappings). */
  obligationServiceToken: z.string().min(1),
  /** Comma-separated brokers; in Docker use kafka:9092, on host use localhost:9094. */
  kafkaBrokers: z.string().min(1),
  /** PRD / implementation plan: event after approved mappings are persisted. */
  kafkaTopicMapped: z.string().default('obligation.mapped'),
  /** Anthropic API key; suggest-mappings returns 503 if empty. Provider is always Anthropic. */
  anthropicApiKey: z.string().optional().default(''),
  /** Catalogue fetch safety cap. */
  catalogMaxPages: z.coerce.number().default(50),
  catalogPageSize: z.coerce.number().default(200),
  /** Truncate obligation full_text in the LLM payload to control token usage. */
  obligationFullTextMaxChars: z.coerce.number().default(12_000),
  /** HTTP client timeout (ms) when calling Java services. */
  upstreamTimeoutMs: z.coerce.number().default(60_000),
})

export type AppConfig = z.infer<typeof ConfigSchema>

function parseConfig(): AppConfig {
  const raw = {
    port: process.env.PORT,
    obligationServiceBaseUrl: process.env.OBLIGATION_SERVICE_BASE_URL,
    catalogServiceBaseUrl: process.env.CATALOG_SERVICE_BASE_URL,
    obligationServiceToken: process.env.OBLIGATION_SERVICE_TOKEN,
    kafkaBrokers: process.env.KAFKA_BROKERS,
    kafkaTopicMapped: process.env.KAFKA_TOPIC_MAPPED,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || '',
    catalogMaxPages: process.env.CATALOG_MAX_PAGES,
    catalogPageSize: process.env.CATALOG_PAGE_SIZE,
    obligationFullTextMaxChars: process.env.OBLIGATION_FULL_TEXT_MAX_CHARS,
    upstreamTimeoutMs: process.env.UPSTREAM_TIMEOUT_MS,
  }
  return ConfigSchema.parse(raw)
}

export const config: AppConfig = parseConfig()
