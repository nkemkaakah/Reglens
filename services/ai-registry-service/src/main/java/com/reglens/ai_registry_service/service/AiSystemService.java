package com.reglens.ai_registry_service.service;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.reglens.ai_registry_service.domain.AiRiskAssessment;
import com.reglens.ai_registry_service.domain.AiSystem;
import com.reglens.ai_registry_service.domain.AiSystemToControl;
import com.reglens.ai_registry_service.domain.AiSystemToSystem;
import com.reglens.ai_registry_service.dto.AiRiskAssessmentResponse;
import com.reglens.ai_registry_service.dto.AiSystemControlLinkResponse;
import com.reglens.ai_registry_service.dto.AiSystemDetailResponse;
import com.reglens.ai_registry_service.dto.AiSystemSummaryResponse;
import com.reglens.ai_registry_service.dto.AiSystemSystemLinkResponse;
import com.reglens.ai_registry_service.dto.AiSystemWriteRequest;
import com.reglens.ai_registry_service.repository.AiRiskAssessmentRepository;
import com.reglens.ai_registry_service.repository.AiSystemRepository;
import com.reglens.ai_registry_service.repository.AiSystemSpecifications;
import com.reglens.ai_registry_service.repository.AiSystemToControlRepository;
import com.reglens.ai_registry_service.repository.AiSystemToSystemRepository;

/**
 * Application service for AI registry operations — orchestrates repositories and maps entities to API DTOs.
 */
@Service
public class AiSystemService {

	private final AiSystemRepository aiSystemRepository;
	private final AiRiskAssessmentRepository riskAssessmentRepository;
	private final AiSystemToControlRepository systemToControlRepository;
	private final AiSystemToSystemRepository systemToSystemRepository;

	public AiSystemService(
			AiSystemRepository aiSystemRepository,
			AiRiskAssessmentRepository riskAssessmentRepository,
			AiSystemToControlRepository systemToControlRepository,
			AiSystemToSystemRepository systemToSystemRepository
	) {
		this.aiSystemRepository = aiSystemRepository;
		this.riskAssessmentRepository = riskAssessmentRepository;
		this.systemToControlRepository = systemToControlRepository;
		this.systemToSystemRepository = systemToSystemRepository;
	}

	@Transactional(readOnly = true)
	public Page<AiSystemSummaryResponse> list(
			String businessDomain,
			String riskRating,
			String status,
			String aiType,
			String q,
			Pageable pageable
	) {
		Specification<AiSystem> spec = AiSystemSpecifications.filtered(businessDomain, riskRating, status, aiType, q);
		return aiSystemRepository.findAll(spec, pageable).map(AiSystemService::toSummary);
	}

	@Transactional(readOnly = true)
	public AiSystemDetailResponse getById(UUID id) {
		AiSystem system = aiSystemRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AI system not found"));
		return toDetail(system);
	}

	@Transactional
	public AiSystemDetailResponse create(AiSystemWriteRequest request) {
		AiSystem entity = new AiSystem();
		applyWriteRequest(entity, request);
		AiSystem saved = aiSystemRepository.save(entity);
		return toDetail(saved);
	}

	@Transactional
	public AiSystemDetailResponse update(UUID id, AiSystemWriteRequest request) {
		AiSystem entity = aiSystemRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AI system not found"));
		applyWriteRequest(entity, request);
		AiSystem saved = aiSystemRepository.save(entity);
		return toDetail(saved);
	}

	private static void applyWriteRequest(AiSystem entity, AiSystemWriteRequest request) {
		entity.setRef(request.ref());
		entity.setName(request.name());
		entity.setDescription(request.description());
		entity.setAiType(request.aiType());
		entity.setUseCase(request.useCase());
		entity.setBusinessDomain(request.businessDomain());
		entity.setModelProvider(request.modelProvider());
		entity.setModelName(request.modelName());
		entity.setDataSources(request.dataSources());
		entity.setOwnerTeamId(request.ownerTeamId());
		entity.setTechLeadEmail(request.techLeadEmail());
		entity.setRiskRating(request.riskRating());
		entity.setDeployedAt(request.deployedAt());
		entity.setLastReviewed(request.lastReviewed());
		entity.setStatus(request.status());
	}

	private static AiSystemSummaryResponse toSummary(AiSystem s) {
		return new AiSystemSummaryResponse(
				s.getId(),
				s.getRef(),
				s.getName(),
				s.getAiType(),
				s.getBusinessDomain(),
				s.getRiskRating(),
				s.getStatus(),
				s.getDeployedAt(),
				s.getCreatedAt()
		);
	}

	private AiSystemDetailResponse toDetail(AiSystem s) {
		List<AiRiskAssessmentResponse> assessments = riskAssessmentRepository
				.findByAiSystem_IdOrderByAssessmentDateDesc(s.getId())
				.stream()
				.map(AiSystemService::toAssessmentResponse)
				.toList();

		List<AiSystemControlLinkResponse> controls = systemToControlRepository.findByAiSystemId(s.getId()).stream()
				.map(AiSystemService::toControlLink)
				.toList();

		List<AiSystemSystemLinkResponse> systems = systemToSystemRepository.findByAiSystemId(s.getId()).stream()
				.map(AiSystemService::toSystemLink)
				.toList();

		return new AiSystemDetailResponse(
				s.getId(),
				s.getRef(),
				s.getName(),
				s.getDescription(),
				s.getAiType(),
				s.getUseCase(),
				s.getBusinessDomain(),
				s.getModelProvider(),
				s.getModelName(),
				s.getDataSources(),
				s.getOwnerTeamId(),
				s.getTechLeadEmail(),
				s.getRiskRating(),
				s.getDeployedAt(),
				s.getLastReviewed(),
				s.getStatus(),
				s.getCreatedAt(),
				assessments,
				controls,
				systems
		);
	}

	private static AiRiskAssessmentResponse toAssessmentResponse(AiRiskAssessment a) {
		return new AiRiskAssessmentResponse(
				a.getId(),
				a.getAssessmentDate(),
				a.getAssessedBy(),
				a.getOverallRating(),
				a.getBiasRisk(),
				a.getExplainabilityRisk(),
				a.getDataQualityRisk(),
				a.getOperationalRisk(),
				a.getNotes(),
				a.getNextReviewDate(),
				a.getCreatedAt()
		);
	}

	private static AiSystemControlLinkResponse toControlLink(AiSystemToControl row) {
		return new AiSystemControlLinkResponse(row.getControlId(), row.getNotes());
	}

	private static AiSystemSystemLinkResponse toSystemLink(AiSystemToSystem row) {
		return new AiSystemSystemLinkResponse(row.getSystemId(), row.getRelationship());
	}
}
