package com.reglens.impact_service.dto;

import java.util.List;
import java.util.UUID;

public record ObligationMappedEvent(
		UUID eventId,
		UUID obligationId,
		String approvedBy,
		List<UUID> controlIds,
		List<UUID> systemIds,
		String occurredAt
) {
}
