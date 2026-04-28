package com.reglens.ai_registry_service.workflow;

import java.util.UUID;

/**
 * Published from {@link com.reglens.ai_registry_service.service.AiSystemService} after a successful
 * write; consumed after transaction commit by {@link AiSystemLifecycleKafkaBridge}.
 */
public record AiSystemLifecycleDomainEvent(UUID aiSystemId, String action, String actor) {
}
