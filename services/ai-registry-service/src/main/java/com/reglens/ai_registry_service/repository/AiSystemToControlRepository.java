package com.reglens.ai_registry_service.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.reglens.ai_registry_service.domain.AiSystemToControl;
import com.reglens.ai_registry_service.domain.AiSystemToControlId;

/**
 * Join rows between AI systems and catalogue controls — used when assembling {@code GET /ai-systems/{id}} payloads.
 */
public interface AiSystemToControlRepository extends JpaRepository<AiSystemToControl, AiSystemToControlId> {

	List<AiSystemToControl> findByAiSystemId(UUID aiSystemId);
}
