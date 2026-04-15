package com.reglens.obligation_service.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * JSON body for {@code POST /obligations} (single create). Bulk uses {@code List<ObligationRequest>}.
 * {@code documentId} must reference an existing document created via {@code POST /documents}.
 */
public record ObligationRequest(
		@NotNull UUID documentId,
		@NotBlank String ref,
		@NotBlank String title,
		@NotBlank String summary,
		@NotBlank String fullText,
		String sectionRef,
		List<String> topics,
		List<String> aiPrinciples,
		String riskRating,/** One of LOW, MEDIUM, HIGH, CRITICAL */
		LocalDate effectiveDate,
		/**
		 * Optional workflow status; defaults to UNMAPPED in the service layer when omitted.
		 * Must match DB check constraint when non-null.
		 */
		String status
) {
}
