package com.reglens.workflow_service.dto.inbound;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiSystemLifecyclePayload(
		String eventId,
		String aiSystemId,
		String action,
		String occurredAt,
		String actor
) {
}
