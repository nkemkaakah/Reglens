package com.reglens.obligation_service.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Read model for a regulatory document row — returned by list/detail document endpoints.
 */
public record DocumentResponse(
		UUID id,
		String ref,
		String title,
		String regulator,
		String docType,
		String url,
		LocalDate publishedDate,
		LocalDate effectiveDate,
		String status,
		List<String> topics,
		OffsetDateTime ingestedAt,
		String ingestedBy
) {
}
