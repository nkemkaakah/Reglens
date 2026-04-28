package com.reglens.ai_registry_service.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
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
import com.reglens.ai_registry_service.workflow.AiSystemLifecycleDomainEvent;

/**
 * Application service for AI registry operations — orchestrates repositories and maps entities to API DTOs.
 */
@Service
public class AiSystemService {

	private final AiSystemRepository aiSystemRepository;
	private final AiRiskAssessmentRepository riskAssessmentRepository;
	private final AiSystemToControlRepository systemToControlRepository;
	private final AiSystemToSystemRepository systemToSystemRepository;
	private final ApplicationEventPublisher eventPublisher;

	public AiSystemService(
			AiSystemRepository aiSystemRepository,
			AiRiskAssessmentRepository riskAssessmentRepository,
			AiSystemToControlRepository systemToControlRepository,
			AiSystemToSystemRepository systemToSystemRepository,
			ApplicationEventPublisher eventPublisher
	) {
		this.aiSystemRepository = aiSystemRepository;
		this.riskAssessmentRepository = riskAssessmentRepository;
		this.systemToControlRepository = systemToControlRepository;
		this.systemToSystemRepository = systemToSystemRepository;
		this.eventPublisher = eventPublisher;
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
		var entityPage = aiSystemRepository.findAll(spec, pageable);
		List<UUID> ids = entityPage.getContent().stream().map(AiSystem::getId).toList();
		Map<UUID, ListEnrichment> enrichments = loadListEnrichments(ids);
		return entityPage.map(s -> toSummary(s, enrichments.getOrDefault(s.getId(), ListEnrichment.EMPTY)));
	}

	@Transactional(readOnly = true)
	public AiSystemDetailResponse getById(UUID id) {
		AiSystem system = aiSystemRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AI system not found"));
		Map<UUID, ListEnrichment> enrichments = loadListEnrichments(List.of(system.getId()));
		return toDetail(system, enrichments.getOrDefault(system.getId(), ListEnrichment.EMPTY));
	}

	@Transactional
	public AiSystemDetailResponse create(AiSystemWriteRequest request) {
		AiSystem entity = new AiSystem();
		applyWriteRequest(entity, request);
		AiSystem saved = aiSystemRepository.save(entity);
		eventPublisher.publishEvent(
				new AiSystemLifecycleDomainEvent(saved.getId(), "CREATED", actorFrom(request)));
		return toDetailAfterWrite(saved);
	}

	@Transactional
	public AiSystemDetailResponse update(UUID id, AiSystemWriteRequest request) {
		AiSystem entity = aiSystemRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AI system not found"));
		applyWriteRequest(entity, request);
		AiSystem saved = aiSystemRepository.save(entity);
		eventPublisher.publishEvent(
				new AiSystemLifecycleDomainEvent(saved.getId(), "UPDATED", actorFrom(request)));
		return toDetailAfterWrite(saved);
	}

	private static String actorFrom(AiSystemWriteRequest request) {
		String email = request.techLeadEmail();
		return email != null && !email.isBlank() ? email.trim() : "ai-registry-service";
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

	private AiSystemDetailResponse toDetailAfterWrite(AiSystem s) {
		Map<UUID, ListEnrichment> enrichments = loadListEnrichments(List.of(s.getId()));
		return toDetail(s, enrichments.getOrDefault(s.getId(), ListEnrichment.EMPTY));
	}

	private static AiSystemSummaryResponse toSummary(AiSystem s, ListEnrichment e) {
		return new AiSystemSummaryResponse(
				s.getId(),
				s.getRef(),
				s.getName(),
				s.getUseCase(),
				s.getAiType(),
				s.getBusinessDomain(),
				s.getRiskRating(),
				s.getStatus(),
				e.ownerTeamName(),
				e.linkedControlCount(),
				e.linkedSystemCount(),
				s.getDeployedAt(),
				s.getCreatedAt()
		);
	}

	private Map<UUID, ListEnrichment> loadListEnrichments(List<UUID> ids) {
		if (ids.isEmpty()) {
			return Map.of();
		}
		List<Object[]> rows = aiSystemRepository.findListEnrichment(ids);
		Map<UUID, ListEnrichment> map = HashMap.newHashMap(rows.size());
		for (Object[] row : rows) {
			UUID id = (UUID) row[0];
			String ownerTeamName = row[1] != null ? row[1].toString() : null;
			int controlCount = ((Number) row[2]).intValue();
			int systemCount = ((Number) row[3]).intValue();
			map.put(id, new ListEnrichment(ownerTeamName, controlCount, systemCount));
		}
		return map;
	}

	private AiSystemDetailResponse toDetail(AiSystem s, ListEnrichment teamRow) {
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
				teamRow.ownerTeamName(),
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

	private record ListEnrichment(String ownerTeamName, int linkedControlCount, int linkedSystemCount) {
		static final ListEnrichment EMPTY = new ListEnrichment(null, 0, 0);
	}
}
