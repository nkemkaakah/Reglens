package com.reglens.obligation_service.controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.reglens.obligation_service.dto.DocumentRequest;
import com.reglens.obligation_service.dto.DocumentResponse;
import com.reglens.obligation_service.service.DocumentService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/**
 * REST surface for regulatory documents (Feature 1 registration + Feature 2 catalogue).
 */
@RestController
@RequestMapping("/documents")
@Tag(name = "Documents")
public class DocumentController {

	private static final Logger log = LoggerFactory.getLogger(DocumentController.class);

	private final DocumentService documentService;

	public DocumentController(DocumentService documentService) {
		this.documentService = documentService;
	}

	/**
	 * Paginated list of ingested documents — backs catalogue views and admin triage screens.
	 */
	@GetMapping
	@Operation(summary = "List ingested documents")
	public Page<DocumentResponse> list(
			@PageableDefault(size = 20, sort = "ingestedAt") Pageable pageable
	) {
		log.debug("GET /documents page={} size={}", pageable.getPageNumber(), pageable.getPageSize());
		return documentService.list(pageable);
	}

	/**
	 * Fetches one document by primary key (404 when missing).
	 */
	@GetMapping("/{id}")
	@Operation(summary = "Get document by id")
	public DocumentResponse getById(@PathVariable UUID id) {
		DocumentResponse doc = documentService.getById(id);
		log.info("GET /documents/{} ref={}", id, doc.ref());
		return doc;
	}

	/**
	 * Creates a document metadata row after upload — {@code reg-ingestion-service} calls this
	 * (with service token) before posting obligations.
	 */
	@PostMapping
	@PreAuthorize("hasAnyRole('COMPLIANCE_OFFICER', 'ADMIN')")
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Register an ingested document")
	public DocumentResponse create(@Valid @RequestBody DocumentRequest request) {
		DocumentResponse created = documentService.create(request);
		log.info("POST /documents created id={} ref={} regulator={}", created.id(), created.ref(), created.regulator());
		return created;
	}
}
