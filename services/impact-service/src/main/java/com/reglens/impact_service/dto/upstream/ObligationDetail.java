package com.reglens.impact_service.dto.upstream;

import java.util.List;
import java.util.UUID;

public record ObligationDetail(
		UUID id,
		UUID documentId,
		String documentRef,
		String documentTitle,
		String regulator,
		String ref,
		String title,
		String summary,
		String fullText,
		String sectionRef,
		List<String> topics,
		List<String> aiPrinciples,
		String riskRating,
		String effectiveDate,
		String status
) {
}
