package com.reglens.obligation_service.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MappingRejectionRow(
		UUID id,
		String catalogueKind,
		UUID catalogueId,
		String rejectedBy,
		String reason,
		OffsetDateTime rejectedAt
) {
}
