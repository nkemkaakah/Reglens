package com.reglens.ai_registry_service.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.reglens.ai_registry_service.domain.AiRiskAssessment;

/**
 * Loads formal risk assessments for a given AI system id (detail view and governance history).
 */
public interface AiRiskAssessmentRepository extends JpaRepository<AiRiskAssessment, UUID> {

	List<AiRiskAssessment> findByAiSystem_IdOrderByAssessmentDateDesc(UUID aiSystemId);
}
