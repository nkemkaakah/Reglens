import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

loadDotenv()

const ConfigSchema = z.object({
  port: z.coerce.number().default(3001),
  kafkaBrokers: z.string().min(1),
  mongoUri: z.string().min(1),
  redisUrl: z.string().min(1),
  kafkaTopicMapped: z.string().min(1),
  kafkaTopicMappingSuggested: z.string().min(1),
  kafkaTopicDocumentIngested: z.string().min(1),
  kafkaTopicImpactGenerated: z.string().min(1),
  kafkaTopicAiSystemLifecycle: z.string().min(1),
})

export type AppConfig = z.infer<typeof ConfigSchema>

function parseConfig(): AppConfig {
  const raw = {
    port: process.env.PORT,
    kafkaBrokers: process.env.KAFKA_BROKERS,
    mongoUri: process.env.MONGO_URI,
    redisUrl: process.env.REDIS_URL,
    kafkaTopicMapped: process.env.KAFKA_TOPIC_MAPPED,
    kafkaTopicMappingSuggested: process.env.KAFKA_TOPIC_MAPPING_SUGGESTED,
    kafkaTopicDocumentIngested: process.env.KAFKA_TOPIC_DOCUMENT_INGESTED,
    kafkaTopicImpactGenerated: process.env.KAFKA_TOPIC_IMPACT_GENERATED,
    kafkaTopicAiSystemLifecycle: process.env.KAFKA_TOPIC_AI_SYSTEM_LIFECYCLE,
  }
  return ConfigSchema.parse(raw)
}

export const config: AppConfig = parseConfig()

export const KAFKA_TOPICS: readonly string[] = [
  config.kafkaTopicMapped,
  config.kafkaTopicMappingSuggested,
  config.kafkaTopicDocumentIngested,
  config.kafkaTopicImpactGenerated,
  config.kafkaTopicAiSystemLifecycle,
]
