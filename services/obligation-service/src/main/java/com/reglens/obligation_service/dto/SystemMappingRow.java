package com.reglens.obligation_service.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** One persisted obligation→system mapping. */
public record SystemMappingRow(
		UUID id,
		UUID systemId,
		BigDecimal confidence,
		String source,
		String explanation,
		String approvedBy,
		OffsetDateTime approvedAt
) {
}
