package com.reglens.obligation_service.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** One persisted obligation→control mapping returned to the explorer / future mapping UI. */
public record ControlMappingRow(
		UUID id,
		UUID controlId,
		BigDecimal confidence,
		String source,
		String explanation,
		String approvedBy,
		OffsetDateTime approvedAt
) {
}
