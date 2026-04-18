package com.reglens.obligation_service.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/** Request body for attaching one internal system (from catalogue) to an obligation. */
public record SystemMappingRequest(
		@NotNull UUID systemId,
		BigDecimal confidence,
		String explanation,
		String source,
		String approvedBy
) {
}
