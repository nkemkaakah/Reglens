package com.reglens.ai_registry_service.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.reglens.ai_registry_service.domain.AiSystemToSystem;
import com.reglens.ai_registry_service.domain.AiSystemToSystemId;

/**
 * Join rows between AI systems and internal catalogue systems — used for deployment / data-flow edges on detail API.
 */
public interface AiSystemToSystemRepository extends JpaRepository<AiSystemToSystem, AiSystemToSystemId> {

	List<AiSystemToSystem> findByAiSystemId(UUID aiSystemId);
}
