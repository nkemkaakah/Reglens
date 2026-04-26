package com.reglens.ai_registry_service.dto;

import java.time.Instant;

/** List row for Mongo-backed attachments — excludes large {@code body} payload. */
public record AiSystemDocumentSummaryResponse(String id, String title, String contentType, Instant createdAt) {
}
