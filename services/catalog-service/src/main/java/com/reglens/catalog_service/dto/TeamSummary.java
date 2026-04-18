package com.reglens.catalog_service.dto;

import java.util.UUID;

/** Owning team embedded on control/system JSON — Feature 3 ownership context. */
public record TeamSummary(UUID id, String name, String domain) {
}
