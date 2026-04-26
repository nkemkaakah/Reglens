package com.reglens.ai_registry_service.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for {@code POST /ai-systems} and {@code PUT /ai-systems/{id}} — mirrors {@code ai_systems} columns.
 */
public record AiSystemWriteRequest(
		@NotBlank String ref,
		@NotBlank String name,
		String description,
		@NotBlank String aiType,
		@NotBlank String useCase,
		String businessDomain,
		String modelProvider,
		String modelName,
		List<String> dataSources,
		@NotNull UUID ownerTeamId,
		String techLeadEmail,
		String riskRating,
		LocalDate deployedAt,
		LocalDate lastReviewed,
		@NotBlank String status
) {
}
