package com.reglens.ai_registry_service.controller;

import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.reglens.ai_registry_service.dto.AiSystemDocumentDetailResponse;
import com.reglens.ai_registry_service.dto.AiSystemDocumentSummaryResponse;
import com.reglens.ai_registry_service.dto.AiSystemDocumentWriteRequest;
import com.reglens.ai_registry_service.service.AiSystemDocumentService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/** Mongo-backed governance documents for an AI system — large text blobs stay out of Postgres. */
@RestController
@RequestMapping("/ai-systems/{aiSystemId}/documents")
@Tag(name = "AI System Documents")
public class AiSystemDocumentController {

	private static final Logger log = LoggerFactory.getLogger(AiSystemDocumentController.class);

	private final AiSystemDocumentService documentService;

	public AiSystemDocumentController(AiSystemDocumentService documentService) {
		this.documentService = documentService;
	}

	@GetMapping
	@Operation(summary = "List document metadata for an AI system (no large bodies)")
	public List<AiSystemDocumentSummaryResponse> list(@PathVariable UUID aiSystemId) {
		return documentService.listSummaries(aiSystemId);
	}

	@GetMapping("/{documentId}")
	@Operation(summary = "Fetch one document including body")
	public AiSystemDocumentDetailResponse getOne(@PathVariable UUID aiSystemId, @PathVariable String documentId) {
		return documentService.getDetail(aiSystemId, documentId);
	}

	@PostMapping
	@PreAuthorize("hasRole('AI_GOVERNANCE_LEAD')")
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Store a governance document (requires service bearer token)")
	public AiSystemDocumentDetailResponse create(
			@PathVariable UUID aiSystemId,
			@Valid @RequestBody AiSystemDocumentWriteRequest request
	) {
		AiSystemDocumentDetailResponse created = documentService.create(aiSystemId, request);
		log.info("POST /ai-systems/{}/documents id={}", aiSystemId, created.id());
		return created;
	}
}
