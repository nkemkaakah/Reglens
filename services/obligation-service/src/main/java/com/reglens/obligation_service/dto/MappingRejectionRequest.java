package com.reglens.obligation_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record MappingRejectionRequest(
		@NotBlank String catalogueKind,
		@NotNull UUID catalogueId,
		@NotBlank String rejectedBy,
		String reason
) {
}
