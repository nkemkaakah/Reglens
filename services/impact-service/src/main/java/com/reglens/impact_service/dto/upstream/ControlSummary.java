package com.reglens.impact_service.dto.upstream;

import java.util.UUID;

public record ControlSummary(
		UUID id,
		String ref,
		String category,
		String title,
		String description
) {
}
