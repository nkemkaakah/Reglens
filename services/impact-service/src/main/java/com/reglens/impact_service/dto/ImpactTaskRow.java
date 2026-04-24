package com.reglens.impact_service.dto;

import java.util.List;
import java.util.UUID;

/**
 * Per-system impact block: scan-friendly reason, gap, evidence, then structured tasks.
 */
public record ImpactTaskRow(
		UUID systemId,
		String systemRef,
		String displayName,
		List<String> tags,
		String impactReason,
		String complianceGap,
		String evidenceRequired,
		String systemPriority,
		List<ImpactTaskItem> tasks
) {
}
