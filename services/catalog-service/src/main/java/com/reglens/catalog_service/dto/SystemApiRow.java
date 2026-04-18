package com.reglens.catalog_service.dto;

import java.util.UUID;

/**
 * Placeholder for per-system API endpoints — {@code system_apis} table is deferred; Feature 3 returns an empty list.
 */
public record SystemApiRow(UUID id, String method, String path, String description) {
}
