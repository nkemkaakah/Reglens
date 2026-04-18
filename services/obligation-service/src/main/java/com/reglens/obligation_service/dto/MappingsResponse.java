package com.reglens.obligation_service.dto;

import java.util.List;

/**
 * Aggregate read model for the obligation drawer “Mappings” panel (PRD Feature 4).
 * Control/system titles are resolved in the SPA via catalogue APIs — this stays obligation-owned.
 */
public record MappingsResponse(
		List<ControlMappingRow> controls,
		List<SystemMappingRow> systems
) {
}
