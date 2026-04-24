package com.reglens.impact_service.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Lightweight row for cross-obligation impact dashboards (list only; drill-in loads full
 * {@code GET /obligations/{id}/impact}).
 */
public record ImpactIndexRow(UUID obligationId, String summary, OffsetDateTime createdAt) {
}
