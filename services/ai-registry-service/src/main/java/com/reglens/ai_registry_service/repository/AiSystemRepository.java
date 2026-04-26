package com.reglens.ai_registry_service.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.reglens.ai_registry_service.domain.AiSystem;

/**
 * Spring Data repository for {@link AiSystem} rows — supports paging and {@link AiSystemSpecifications} filters.
 */
public interface AiSystemRepository extends JpaRepository<AiSystem, UUID>, JpaSpecificationExecutor<AiSystem> {
}
