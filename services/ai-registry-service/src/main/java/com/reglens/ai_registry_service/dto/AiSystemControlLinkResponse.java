package com.reglens.ai_registry_service.dto;

import java.util.UUID;

/** Catalogue control UUID linked to an AI system plus optional governance note (from {@code ai_system_to_control}). */
public record AiSystemControlLinkResponse(UUID controlId, String notes) {
}
