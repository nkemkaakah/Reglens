package com.reglens.catalog_service.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;

/** Body for POST/PUT /systems — extends the internal systems catalogue (Feature 3). */
public record CatalogSystemWriteRequest(
		@NotBlank String ref,
		@NotBlank String displayName,
		String description,
		String domain,
		List<String> techStack,
		String repoUrl,
		UUID ownerTeamId,
		@NotBlank String criticality
) {
}
