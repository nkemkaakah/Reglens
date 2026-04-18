package com.reglens.catalog_service.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** System catalogue row / detail — Feature 3 systems catalogue (internal apps). */
public record CatalogSystemResponse(
		UUID id,
		String ref,
		String displayName,
		String description,
		String domain,
		List<String> techStack,
		String repoUrl,
		String criticality,
		TeamSummary ownerTeam,
		OffsetDateTime createdAt,
		List<SystemLinkedControlRow> linkedControls
) {
}
