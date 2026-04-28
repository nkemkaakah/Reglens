package com.reglens.workflow_service.controller;

import java.time.Instant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.reglens.workflow_service.dto.WorkflowEventResponse;
import com.reglens.workflow_service.service.WorkflowEventQueryService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Tag(name = "Workflow events")
public class WorkflowEventController {

	private final WorkflowEventQueryService queryService;

	public WorkflowEventController(WorkflowEventQueryService queryService) {
		this.queryService = queryService;
	}

	@GetMapping("/obligations/{id}/events")
	@Operation(summary = "Timeline for one obligation (includes document-ingest rows that list this obligation id)")
	public Page<WorkflowEventResponse> obligationEvents(
			@PathVariable("id") String id,
			@PageableDefault(size = 50, sort = "occurredAt", direction = Sort.Direction.ASC) Pageable pageable
	) {
		return queryService.forObligation(id, pageable);
	}

	@GetMapping("/ai-systems/{id}/events")
	@Operation(summary = "Timeline for one AI system")
	public Page<WorkflowEventResponse> aiSystemEvents(
			@PathVariable("id") String id,
			@PageableDefault(size = 50, sort = "occurredAt", direction = Sort.Direction.ASC) Pageable pageable
	) {
		return queryService.forAiSystem(id, pageable);
	}

	@GetMapping("/events")
	@Operation(summary = "Global activity feed (newest first)")
	public Page<WorkflowEventResponse> allEvents(
			@RequestParam(required = false) String type,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant since,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant until,
			@PageableDefault(size = 30, sort = "occurredAt", direction = Sort.Direction.DESC) Pageable pageable
	) {
		return queryService.global(type, since, until, pageable);
	}
}
