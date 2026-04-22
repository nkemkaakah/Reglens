package com.reglens.impact_service.dto;

import java.util.List;
import java.util.UUID;

public record ImpactTaskRow(
		UUID systemId,
		String systemRef,
		String displayName,
		List<String> tags,
		List<String> tasks
) {
}
