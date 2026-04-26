package com.reglens.ai_registry_service.dto;

import jakarta.validation.constraints.NotBlank;

/** Request body for {@code POST /ai-systems/{id}/documents} — creates a Mongo-backed governance artefact. */
public record AiSystemDocumentWriteRequest(
		@NotBlank String title,
		@NotBlank String contentType,
		@NotBlank String body
) {
}
