package com.reglens.impact_service.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ImpactResponse(
		UUID obligationId,
		UUID eventId,
		String summary,
		List<String> keyEngineeringImpacts,
		String complianceGap,
		List<ImpactTaskRow> suggestedTasks,
		String generatedBy,
		OffsetDateTime generatedAt,
		String reviewedBy,
		OffsetDateTime reviewedAt
) {
}
