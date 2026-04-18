package com.reglens.catalog_service.dto;

import java.util.UUID;

/** One control linked to a system — Feature 3 detail panel until obligation mappings exist. */
public record SystemLinkedControlRow(UUID controlId, String ref, String title, String category, String notes) {
}
