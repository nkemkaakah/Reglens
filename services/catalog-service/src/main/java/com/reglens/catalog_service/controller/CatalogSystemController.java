package com.reglens.catalog_service.controller;

import java.util.List;
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

import com.reglens.catalog_service.dto.CatalogSystemResponse;
import com.reglens.catalog_service.dto.CatalogSystemWriteRequest;
import com.reglens.catalog_service.dto.SystemApiRow;
import com.reglens.catalog_service.service.CatalogSystemService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/**
 * HTTP API for internal systems in the catalogue — Feature 3; complements {@link ControlController} for mapping UIs.
 */
@RestController
@RequestMapping("/systems")
@Tag(name = "Systems")
public class CatalogSystemController {

	private static final Logger log = LoggerFactory.getLogger(CatalogSystemController.class);

	private final CatalogSystemService catalogSystemService;

	public CatalogSystemController(CatalogSystemService catalogSystemService) {
		this.catalogSystemService = catalogSystemService;
	}

	@GetMapping
	@Operation(summary = "List systems (paginated, optional filters)")
	public Page<CatalogSystemResponse> list(
			@RequestParam(required = false) String domain,
			@RequestParam(required = false) String criticality,
			@RequestParam(required = false) String q,
			@PageableDefault(size = 20, sort = "ref") Pageable pageable
	) {
		log.debug("GET /systems domain={} criticality={} q={}", domain, criticality, q);
		return catalogSystemService.list(domain, criticality, q, pageable);
	}

	@GetMapping("/{id}/apis")
	@Operation(summary = "List API endpoints for a system (placeholder — empty until system_apis exists)")
	public List<SystemApiRow> listApis(@PathVariable UUID id) {
		log.debug("GET /systems/{}/apis", id);
		return catalogSystemService.listApis(id);
	}

	@GetMapping("/{id}")
	@Operation(summary = "Get system by id (includes linked controls)")
	public CatalogSystemResponse getById(@PathVariable UUID id) {
		return catalogSystemService.getById(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAnyRole('RISK_CONTROL_MANAGER', 'TECHNOLOGY_LEAD', 'ADMIN')")
	@Operation(summary = "Create system")
	public CatalogSystemResponse create(@Valid @RequestBody CatalogSystemWriteRequest request) {
		CatalogSystemResponse created = catalogSystemService.create(request);
		log.info("POST /systems created id={}", created.id());
		return created;
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('RISK_CONTROL_MANAGER', 'TECHNOLOGY_LEAD', 'ADMIN')")
	@Operation(summary = "Replace system")
	public CatalogSystemResponse update(@PathVariable UUID id, @Valid @RequestBody CatalogSystemWriteRequest request) {
		CatalogSystemResponse updated = catalogSystemService.update(id, request);
		log.info("PUT /systems/{} ref={}", id, updated.ref());
		return updated;
	}
}
