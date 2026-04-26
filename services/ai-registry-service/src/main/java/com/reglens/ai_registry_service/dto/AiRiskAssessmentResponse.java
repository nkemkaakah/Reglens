package com.reglens.ai_registry_service.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/** One stored risk assessment cycle (nested under {@link AiSystemDetailResponse}). */
public record AiRiskAssessmentResponse(
		UUID id,
		LocalDate assessmentDate,
		String assessedBy,
		String overallRating,
		String biasRisk,
		String explainabilityRisk,
		String dataQualityRisk,
		String operationalRisk,
		String notes,
		LocalDate nextReviewDate,
		OffsetDateTime createdAt
) {
}
