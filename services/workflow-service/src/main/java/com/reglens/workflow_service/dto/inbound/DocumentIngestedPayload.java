package com.reglens.workflow_service.dto.inbound;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DocumentIngestedPayload(
		String eventId,
		String documentId,
		List<String> obligationIds,
		String ingestedBy,
		String occurredAt
) {
}
