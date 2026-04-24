package com.reglens.impact_service.dto.upstream;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Mirrors obligation-service {@code GET /obligations/{id}/mappings}. Extra row fields are ignored.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ObligationMappingsResponse(
		List<ControlMappingRef> controls,
		List<SystemMappingRef> systems
) {
	@JsonIgnoreProperties(ignoreUnknown = true)
	public record ControlMappingRef(UUID controlId) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record SystemMappingRef(UUID systemId) {
	}
}
