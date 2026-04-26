package com.reglens.ai_registry_service.dto;

import java.util.UUID;

/** Internal system UUID linked to an AI system plus relationship label (from {@code ai_system_to_system}). */
public record AiSystemSystemLinkResponse(UUID systemId, String relationship) {
}
