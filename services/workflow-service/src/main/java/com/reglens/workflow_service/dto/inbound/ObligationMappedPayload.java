package com.reglens.workflow_service.dto.inbound;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ObligationMappedPayload(
		String eventId,
		String obligationId,
		String approvedBy,
		List<String> controlIds,
		List<String> systemIds,
		String occurredAt
) {
}
