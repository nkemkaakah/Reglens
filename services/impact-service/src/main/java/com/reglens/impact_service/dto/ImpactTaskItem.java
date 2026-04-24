package com.reglens.impact_service.dto;

import java.util.List;

/**
 * One ticket-shaped backlog hint: short title for Jira/Linear summary plus supporting body.
 */
public record ImpactTaskItem(
		String title,
		String description,
		String obligationRef,
		List<String> linkedControlRefs,
		String priority
) {
}
