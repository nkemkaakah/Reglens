package com.reglens.obligation_service.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Body for {@code PATCH /obligations/{id}/status}. Only advancing to {@code IMPLEMENTED} is supported.
 */
public record ObligationStatusPatchRequest(
		@NotBlank String status,
		@NotBlank String confirmedBy
) {
}
