package com.reglens.obligation_service.controller;

import com.reglens.obligation_service.dto.ObligationRequest;
import com.reglens.obligation_service.dto.ObligationResponse;
import com.reglens.obligation_service.service.ObligationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST surface for obligations — explorer, detail drawer, per-document views, and ingestion writes.
 */
@RestController
@Tag(name = "Obligations")
public class ObligationController {

	private final ObligationService obligationService;

	public ObligationController(ObligationService obligationService) {
		this.obligationService = obligationService;
	}

	/**
	 * Feature 2 explorer: paginated obligations with optional filters (all query params optional).
	 */
	@GetMapping("/obligations")
	@Operation(summary = "List obligations with optional filters")
	public Page<ObligationResponse> list(
			@RequestParam(required = false) String status,
			@RequestParam(required = false) String regulator,
			@RequestParam(required = false) String riskRating,
			@RequestParam(required = false) String topic,
			@RequestParam(required = false) String aiPrinciple,
			@RequestParam(required = false) String q,
			@PageableDefault(size = 20, sort = "createdAt") Pageable pageable
	) {
		return obligationService.list(status, regulator, riskRating, topic, aiPrinciple, q, pageable);
	}

	/**
	 * Feature 2 detail drawer: full obligation payload including embedded document context fields.
	 */
	@GetMapping("/obligations/{id}")
	@Operation(summary = "Get obligation by id")
	public ObligationResponse getById(@PathVariable UUID id) {
		return obligationService.getById(id);
	}

	/**
	 * Lists obligations extracted for a single document — ingestion preview and document drill-down.
	 */
	@GetMapping("/documents/{id}/obligations")
	@Operation(summary = "List obligations for a document")
	public Page<ObligationResponse> listByDocument(
			@PathVariable("id") UUID documentId,
			@PageableDefault(size = 50, sort = "createdAt") Pageable pageable
	) {
		return obligationService.listByDocument(documentId, pageable);
	}

	/**
	 * Single obligation create — used by ingestion pipeline for one extracted unit at a time.
	 */
	@PostMapping("/obligations")
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Create one obligation")
	public ObligationResponse create(@Valid @RequestBody ObligationRequest request) {
		return obligationService.create(request);
	}

	/**
	 * Bulk create after pipeline run — one HTTP round-trip for many obligations on the same document.
	 */
	@PostMapping("/obligations/batch")
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Bulk create obligations")
	public List<ObligationResponse> createBatch(@Valid @RequestBody List<ObligationRequest> requests) {
		return obligationService.createAll(requests);
	}
}
