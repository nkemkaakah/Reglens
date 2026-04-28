package com.reglens.workflow_service.dto;

import java.time.Instant;
import java.util.List;

import com.reglens.workflow_service.domain.WorkflowEvent;

public record WorkflowEventResponse(
		String id,
		String topic,
		String type,
		Instant occurredAt,
		String actor,
		String obligationId,
		List<String> obligationIds,
		String documentId,
		String aiSystemId,
		String summary
) {
	public static WorkflowEventResponse fromEntity(WorkflowEvent e) {
		return new WorkflowEventResponse(
				e.getId(),
				e.getTopic(),
				e.getType(),
				e.getOccurredAt(),
				e.getActor(),
				e.getObligationId(),
				e.getObligationIds(),
				e.getDocumentId(),
				e.getAiSystemId(),
				e.getSummary()
		);
	}
}
