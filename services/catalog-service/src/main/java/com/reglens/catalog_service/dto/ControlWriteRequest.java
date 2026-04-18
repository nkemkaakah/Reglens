package com.reglens.catalog_service.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Body for POST/PUT /controls — maintains the control library (Feature 3 CRUD, auth via service token). */
public record ControlWriteRequest(
		@NotBlank String ref,
		@NotBlank String category,
		@NotBlank String title,
		@NotBlank String description,
		String evidenceType,
		String reviewFrequency,
		@NotNull UUID ownerTeamId,
		String status
) {
}
