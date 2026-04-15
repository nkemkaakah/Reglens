package com.reglens.obligation_service.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Read model for explorer table and detail drawer — embeds a slice of parent document fields so the
 * UI does not need a second round-trip for regulator / document ref.
 */
public record ObligationResponse(
		UUID id,
		UUID documentId,
		String documentRef,
		String documentTitle,
		String regulator,
		String ref,
		String title,
		String summary,
		String fullText,
		String sectionRef,
		List<String> topics,
		List<String> aiPrinciples,
		String riskRating,
		LocalDate effectiveDate,
		String status,
		String triagedBy,
		OffsetDateTime triagedAt,
		OffsetDateTime createdAt
) {
}
