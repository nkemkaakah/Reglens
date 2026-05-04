package com.reglens.catalog_service.controller;

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

import com.reglens.catalog_service.dto.ControlResponse;
import com.reglens.catalog_service.dto.ControlWriteRequest;
import com.reglens.catalog_service.service.ControlService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/**
 * HTTP API for the control library — Feature 3; these records become mapping targets in Feature 4.
 */
@RestController
@RequestMapping("/controls")
@Tag(name = "Controls")
public class ControlController {

	private static final Logger log = LoggerFactory.getLogger(ControlController.class);

	private final ControlService controlService;

	public ControlController(ControlService controlService) {
		this.controlService = controlService;
	}

	@GetMapping
	@Operation(summary = "List controls (paginated, optional filters)")
	public Page<ControlResponse> list(
			@RequestParam(required = false) String category,
			@RequestParam(required = false) String status,
			@RequestParam(required = false) String q,
			@PageableDefault(size = 20, sort = "ref") Pageable pageable
	) {
		log.debug("GET /controls category={} status={} q={}", category, status, q);
		return controlService.list(category, status, q, pageable);
	}

	@GetMapping("/{id}")
	@Operation(summary = "Get control by id (includes linked systems)")
	public ControlResponse getById(@PathVariable UUID id) {
		return controlService.getById(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAnyRole('RISK_CONTROL_MANAGER', 'ADMIN')")
	@Operation(summary = "Create control")
	public ControlResponse create(@Valid @RequestBody ControlWriteRequest request) {
		ControlResponse created = controlService.create(request);
		log.info("POST /controls created id={}", created.id());
		return created;
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('RISK_CONTROL_MANAGER', 'ADMIN')")
	@Operation(summary = "Replace control")
	public ControlResponse update(@PathVariable UUID id, @Valid @RequestBody ControlWriteRequest request) {
		ControlResponse updated = controlService.update(id, request);
		log.info("PUT /controls/{} ref={}", id, updated.ref());
		return updated;
	}
}
