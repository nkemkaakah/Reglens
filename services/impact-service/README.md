# impact-service

Spring Boot (Java) — consumes `obligation.mapped`, generates impact summaries/tasks with Anthropic,
stores `impact_analyses` in Postgres (`impact` schema), and exposes `GET /obligations/{id}/impact`.
