package com.reglens.obligation_service.dto;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.NotBlank;

/**
 * JSON body for {@code POST /documents}. Used by {@code reg-ingestion-service} (or the UI in dev)
 * to register metadata for an ingested file before obligations are persisted.
 */
public record DocumentRequest(
		@NotBlank String ref,
		@NotBlank String title,
		@NotBlank String regulator,
		String docType,
		String url,
		LocalDate publishedDate,
		LocalDate effectiveDate,
		List<String> topics,
		String ingestedBy
) {
}
