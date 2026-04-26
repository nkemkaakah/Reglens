# workflow-service

Spring Boot — Kafka + MongoDB (`reglens_workflow` database). **Step 1 (infra):** build and run via `infra/docker-compose.yml` on port **8084**.

Local defaults in `application.properties` use `localhost:9094` (Kafka PLAINTEXT_HOST) and `localhost:27017` for Mongo when not running inside Compose.
