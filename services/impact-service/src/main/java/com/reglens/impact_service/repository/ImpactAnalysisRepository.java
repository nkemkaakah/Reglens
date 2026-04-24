package com.reglens.impact_service.repository;

import com.reglens.impact_service.domain.ImpactAnalysis;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ImpactAnalysisRepository extends JpaRepository<ImpactAnalysis, UUID> {
	Optional<ImpactAnalysis> findByObligationId(UUID obligationId);

	Page<ImpactAnalysis> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
