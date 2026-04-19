# mapping-service

Node.js + TypeScript + Express orchestration for **Feature 4 — AI-assisted mapping** (PRD).

## Role

- **`POST /obligations/:obligationId/suggest-mappings`** — loads obligation + full catalogue from Java services, calls **Anthropic** Claude, returns ranked suggestions (no DB writes here).
- **`POST /obligations/:obligationId/mappings`** — persists approved rows via **obligation-service** REST, then publishes **`obligation.mapped`** to Kafka.

LLM provider is **Anthropic only** (no provider switch). Set **`ANTHROPIC_API_KEY`** for suggest-mappings. The Claude model id is fixed in `src/llm/suggestMappings.ts` (`messages.create`), not an environment variable.

## Local (without Docker)

```bash
cd services/mapping-service
npm install
export OBLIGATION_SERVICE_BASE_URL=http://localhost:8080
export CATALOG_SERVICE_BASE_URL=http://localhost:8081
export OBLIGATION_SERVICE_TOKEN=dev-service-token-change-me
export KAFKA_BROKERS=localhost:9094
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Health: `GET http://localhost:3000/health`

## Docker Compose

From repo root: `docker compose -f infra/docker-compose.yml up -d mapping-service`

Ensure **Kafka** is healthy and **catalog** migrations ran before **obligation** mapping FK migrations (compose already starts `obligation-service` after `catalog-service`).

## Auth

All routes under `/obligations/*` require:

`Authorization: Bearer <same value as APP_SECURITY_SERVICE_TOKEN / OBLIGATION_SERVICE_TOKEN>`

## Environment

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default `3000`) |
| `OBLIGATION_SERVICE_BASE_URL` | e.g. `http://obligation-service:8080` |
| `CATALOG_SERVICE_BASE_URL` | e.g. `http://catalog-service:8081` |
| `OBLIGATION_SERVICE_TOKEN` | Bearer secret for Java APIs |
| `KAFKA_BROKERS` | Comma-separated; in Docker `kafka:9092`, on host `localhost:9094` |
| `KAFKA_TOPIC_MAPPED` | Default `obligation.mapped` |
| `ANTHROPIC_API_KEY` | Required for suggest-mappings |
| `MAPPING_CORS_ORIGINS` | Optional comma-separated origins for the SPA |
