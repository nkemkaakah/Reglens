package com.reglens.workflow_service.dto.inbound;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ImpactGeneratedPayload(
		String eventId,
		String obligationId,
		String sourceMappingEventId,
		String generatedAt
) {
}
