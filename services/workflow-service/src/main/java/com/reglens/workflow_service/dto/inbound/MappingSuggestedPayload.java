package com.reglens.workflow_service.dto.inbound;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MappingSuggestedPayload(
		String eventId,
		String obligationId,
		String suggestedBy,
		String occurredAt
) {
}
