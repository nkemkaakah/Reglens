package com.reglens.ai_registry_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * Entry point for the AI Registry microservice (PRD Feature 6).
 * <p>
 * Postgres (JPA + Flyway) holds the canonical registry and join rows to the catalogue; MongoDB stores large governance documents.
 */
@SpringBootApplication
@EnableJpaRepositories(basePackages = "com.reglens.ai_registry_service.repository")
@EnableMongoRepositories(basePackages = "com.reglens.ai_registry_service.mongo")
public class AiRegistryServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(AiRegistryServiceApplication.class, args);
	}

}
