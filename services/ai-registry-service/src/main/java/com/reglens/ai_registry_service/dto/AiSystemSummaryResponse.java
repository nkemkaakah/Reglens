package com.reglens.ai_registry_service.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Compact row returned from {@code GET /ai-systems} for tables and cards in the AI Registry UI.
 */
public record AiSystemSummaryResponse(
		UUID id,
		String ref,
		String name,
		String useCase,
		String aiType,
		String businessDomain,
		String riskRating,
		String status,
		String ownerTeamName,
		int linkedControlCount,
		int linkedSystemCount,
		LocalDate deployedAt,
		OffsetDateTime createdAt
) {
}
