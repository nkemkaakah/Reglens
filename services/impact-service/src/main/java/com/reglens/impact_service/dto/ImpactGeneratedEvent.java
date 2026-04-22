package com.reglens.impact_service.dto;

import java.util.UUID;

public record ImpactGeneratedEvent(
		UUID eventId,
		UUID obligationId,
		UUID sourceMappingEventId,
		String generatedAt
) {
}

