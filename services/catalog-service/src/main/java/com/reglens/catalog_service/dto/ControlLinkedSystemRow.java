package com.reglens.catalog_service.dto;

import java.util.UUID;

/** One row of the control ↔ system join — shown on control detail before Feature 4 mapping UI. */
public record ControlLinkedSystemRow(UUID systemId, String ref, String displayName, String notes) {
}
