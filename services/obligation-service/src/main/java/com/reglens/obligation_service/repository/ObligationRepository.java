package com.reglens.obligation_service.repository;

import com.reglens.obligation_service.domain.Obligation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

/**
 * Persistence for obligations. {@link JpaSpecificationExecutor} powers dynamic filters on
 * {@code GET /obligations} (status, regulator via join, risk, topics, AI principles, free-text).
 */
public interface ObligationRepository extends JpaRepository<Obligation, UUID>, JpaSpecificationExecutor<Obligation> {

	/**
	 * Obligations belonging to a single document — used by {@code GET /documents/{id}/obligations}.
	 */
	Page<Obligation> findByDocument_Id(UUID documentId, Pageable pageable);
}
