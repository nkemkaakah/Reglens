package com.reglens.ai_registry_service.dto;

import java.time.Instant;
import java.util.UUID;

/** Full attachment including body — returned from {@code GET .../documents/{documentId}} only. */
public record AiSystemDocumentDetailResponse(
		String id,
		UUID aiSystemId,
		String title,
		String contentType,
		String body,
		Instant createdAt
) {
}
