package com.reglens.ai_registry_service.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.reglens.ai_registry_service.domain.AiSystem;

/**
 * Spring Data repository for {@link AiSystem} rows — supports paging and {@link AiSystemSpecifications} filters.
 */
public interface AiSystemRepository extends JpaRepository<AiSystem, UUID>, JpaSpecificationExecutor<AiSystem> {

	/**
	 * Resolves owner team display name and join counts for a set of AI systems in one round-trip (same Postgres DB,
	 * {@code catalog} + {@code ai_registry} schemas).
	 */
	@Query(value = """
			SELECT s.id,
			       t.name,
			       COALESCE((SELECT COUNT(*) FROM ai_system_to_control c WHERE c.ai_system_id = s.id), 0),
			       COALESCE((SELECT COUNT(*) FROM ai_system_to_system x WHERE x.ai_system_id = s.id), 0)
			FROM ai_systems s
			LEFT JOIN catalog.teams t ON t.id = s.owner_team_id
			WHERE s.id IN (:ids)
			""", nativeQuery = true)
	List<Object[]> findListEnrichment(@Param("ids") Collection<UUID> ids);
}
