package com.reglens.obligation_service.controller;

import com.reglens.obligation_service.dto.ControlMappingRequest;
import com.reglens.obligation_service.dto.ControlMappingRow;
import com.reglens.obligation_service.dto.MappingRejectionRequest;
import com.reglens.obligation_service.dto.MappingRejectionRow;
import com.reglens.obligation_service.dto.MappingsResponse;
import com.reglens.obligation_service.dto.SystemMappingRequest;
import com.reglens.obligation_service.dto.SystemMappingRow;
import com.reglens.obligation_service.service.MappingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST API for Feature 4: persisted obligation→control/system mappings (Nexus Bank catalogue ids).
 * Suggest/LLM/Kafka stay in mapping-service — this controller is the durable “source of truth” writes.
 */
@RestController
@Tag(name = "Obligation mappings")
public class ObligationMappingController {

	private final MappingService mappingService;

	public ObligationMappingController(MappingService mappingService) {
		this.mappingService = mappingService;
	}

	@GetMapping("/obligations/{id}/mappings")
	@Operation(summary = "List persisted control and system mappings for one obligation")
	public MappingsResponse getMappings(@PathVariable("id") UUID obligationId) {
		return mappingService.getMappings(obligationId);
	}

	@PostMapping("/obligations/{id}/mappings/controls")
	@Operation(summary = "Upsert control mappings for an obligation (requires service bearer token)")
	public List<ControlMappingRow> upsertControlMappings(
			@PathVariable("id") UUID obligationId,
			@Valid @RequestBody List<ControlMappingRequest> body
	) {
		return mappingService.upsertControlMappings(obligationId, body);
	}

	@PostMapping("/obligations/{id}/mappings/systems")
	@Operation(summary = "Upsert system mappings for an obligation (requires service bearer token)")
	public List<SystemMappingRow> upsertSystemMappings(
			@PathVariable("id") UUID obligationId,
			@Valid @RequestBody List<SystemMappingRequest> body
	) {
		return mappingService.upsertSystemMappings(obligationId, body);
	}

	@PostMapping("/obligations/{id}/mapping-rejections")
	@Operation(summary = "Record rejection of a suggested mapping candidate (requires service bearer token)")
	public MappingRejectionRow recordMappingRejection(
			@PathVariable("id") UUID obligationId,
			@Valid @RequestBody MappingRejectionRequest body
	) {
		return mappingService.recordMappingRejection(obligationId, body);
	}
}
