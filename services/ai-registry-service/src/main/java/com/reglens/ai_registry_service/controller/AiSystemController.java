package com.reglens.ai_registry_service.controller;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.reglens.ai_registry_service.dto.AiSystemDetailResponse;
import com.reglens.ai_registry_service.dto.AiSystemSummaryResponse;
import com.reglens.ai_registry_service.dto.AiSystemWriteRequest;
import com.reglens.ai_registry_service.service.AiSystemService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/**
 * REST API for PRD Feature 6 — lists and returns governed AI/ML/GenAI systems and supports demo CRUD for local dev.
 */
@RestController
@RequestMapping("/ai-systems")
@Tag(name = "AI Systems")
public class AiSystemController {

	private static final Logger log = LoggerFactory.getLogger(AiSystemController.class);

	private final AiSystemService aiSystemService;

	public AiSystemController(AiSystemService aiSystemService) {
		this.aiSystemService = aiSystemService;
	}

	@GetMapping
	@Operation(summary = "List AI systems (paginated, optional filters)")
	public Page<AiSystemSummaryResponse> list(
			@RequestParam(required = false) String businessDomain,
			@RequestParam(required = false) String riskRating,
			@RequestParam(required = false) String status,
			@RequestParam(required = false) String aiType,
			@RequestParam(required = false) String q,
			@PageableDefault(size = 20, sort = "ref") Pageable pageable
	) {
		log.debug("GET /ai-systems domain={} risk={} status={} type={} q={}", businessDomain, riskRating, status, aiType, q);
		return aiSystemService.list(businessDomain, riskRating, status, aiType, q, pageable);
	}

	@GetMapping("/{id}")
	@Operation(summary = "Get AI system by id (assessments + catalogue join rows)")
	public AiSystemDetailResponse getById(@PathVariable UUID id) {
		return aiSystemService.getById(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAnyRole('AI_GOVERNANCE_LEAD', 'ADMIN')")
	@Operation(summary = "Register a new AI system (requires service bearer token)")
	public AiSystemDetailResponse create(@Valid @RequestBody AiSystemWriteRequest request) {
		AiSystemDetailResponse created = aiSystemService.create(request);
		log.info("POST /ai-systems created id={} ref={}", created.id(), created.ref());
		return created;
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('AI_GOVERNANCE_LEAD', 'ADMIN')")
	@Operation(summary = "Replace an AI system (requires service bearer token)")
	public AiSystemDetailResponse update(@PathVariable UUID id, @Valid @RequestBody AiSystemWriteRequest request) {
		AiSystemDetailResponse updated = aiSystemService.update(id, request);
		log.info("PUT /ai-systems/{} ref={}", id, updated.ref());
		return updated;
	}
}
