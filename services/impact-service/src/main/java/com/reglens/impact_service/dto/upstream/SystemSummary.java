package com.reglens.impact_service.dto.upstream;

import java.util.UUID;

public record SystemSummary(
		UUID id,
		String ref,
		String displayName,
		String domain,
		String description
) {
}
