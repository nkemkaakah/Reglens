package com.reglens.obligation_service.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request body for attaching one catalogue control to an obligation (human-approved or AI-suggested row).
 */
public record ControlMappingRequest(
		@NotNull UUID controlId,
		BigDecimal confidence,
		String explanation,
		String source,
		String approvedBy
) {
}
