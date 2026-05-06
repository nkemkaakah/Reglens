package com.reglens.ai_registry_service;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.kafka.KafkaContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Spins up disposable Postgres + MongoDB for integration tests — Postgres is pre-seeded with {@code catalog} tables so
 * ai-registry Flyway cross-schema FK migrations apply cleanly.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	@Bean
	@ServiceConnection
	public KafkaContainer kafkaContainer() {
		return new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.0"));
	}

	@Bean
	@ServiceConnection
	public PostgreSQLContainer<?> postgresContainer() {
		return new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
				.withDatabaseName("reglens")
				.withUsername("reglens")
				.withPassword("reglens_dev")
				.withInitScript("init-catalog-for-ai-registry-fk.sql");
	}

	@Bean
	@ServiceConnection
	public MongoDBContainer mongoContainer() {
		return new MongoDBContainer(DockerImageName.parse("mongo:7"));
	}
}
