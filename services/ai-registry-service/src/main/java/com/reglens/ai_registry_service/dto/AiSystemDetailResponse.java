package com.reglens.ai_registry_service.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/* Full governance view for one AI system — core fields plus assessments and catalogue join rows. */
public record AiSystemDetailResponse(
		UUID id,
		String ref,
		String name,
		String description,
		String aiType,
		String useCase,
		String businessDomain,
		String modelProvider,
		String modelName,
		List<String> dataSources,
		UUID ownerTeamId,
		String ownerTeamName,
		String techLeadEmail,
		String riskRating,
		LocalDate deployedAt,
		LocalDate lastReviewed,
		String status,
		OffsetDateTime createdAt,
		List<AiRiskAssessmentResponse> riskAssessments,
		List<AiSystemControlLinkResponse> linkedControls,
		List<AiSystemSystemLinkResponse> linkedSystems
) {
}
