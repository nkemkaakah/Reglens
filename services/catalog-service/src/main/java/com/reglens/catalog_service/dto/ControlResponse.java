package com.reglens.catalog_service.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Control catalogue row / detail — Feature 3 control library API contract. */
public record ControlResponse(
		UUID id,
		String ref,
		String category,
		String title,
		String description,
		String evidenceType,
		String reviewFrequency,
		String status,
		TeamSummary ownerTeam,
		OffsetDateTime createdAt,
		List<ControlLinkedSystemRow> linkedSystems
) {
}
