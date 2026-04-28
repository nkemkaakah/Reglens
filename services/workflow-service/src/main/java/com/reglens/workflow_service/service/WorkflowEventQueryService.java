package com.reglens.workflow_service.service;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import com.reglens.workflow_service.domain.WorkflowEvent;
import com.reglens.workflow_service.dto.WorkflowEventResponse;
import com.reglens.workflow_service.repository.WorkflowEventRepository;

@Service
public class WorkflowEventQueryService {

	private final WorkflowEventRepository repository;
	private final MongoTemplate mongoTemplate;

	public WorkflowEventQueryService(WorkflowEventRepository repository, MongoTemplate mongoTemplate) {
		this.repository = repository;
		this.mongoTemplate = mongoTemplate;
	}

	public Page<WorkflowEventResponse> forObligation(String obligationId, Pageable pageable) {
		Page<WorkflowEvent> page = repository.findTimelineForObligation(obligationId, pageable);
		return page.map(WorkflowEventResponse::fromEntity);
	}

	public Page<WorkflowEventResponse> forAiSystem(String aiSystemId, Pageable pageable) {
		Page<WorkflowEvent> page = repository.findByAiSystemIdOrderByOccurredAtAsc(aiSystemId, pageable);
		return page.map(WorkflowEventResponse::fromEntity);
	}

	public Page<WorkflowEventResponse> global(
			String type,
			Instant since,
			Instant until,
			Pageable pageable
	) {
		Query q = new Query();
		if (type != null && !type.isBlank()) {
			q.addCriteria(Criteria.where("type").is(type.trim()));
		}
		if (since != null) {
			q.addCriteria(Criteria.where("occurredAt").gte(since));
		}
		if (until != null) {
			q.addCriteria(Criteria.where("occurredAt").lte(until));
		}
		Pageable sorted = PageRequest.of(
				pageable.getPageNumber(),
				pageable.getPageSize(),
				Sort.by(Sort.Direction.DESC, "occurredAt")
		);
		q.with(sorted.getSort());
		long total = mongoTemplate.count(q, WorkflowEvent.class);
		q.skip(sorted.getOffset());
		q.limit(sorted.getPageSize());
		List<WorkflowEvent> list = mongoTemplate.find(q, WorkflowEvent.class);
		List<WorkflowEventResponse> content = list.stream().map(WorkflowEventResponse::fromEntity).toList();
		return new PageImpl<>(content, sorted, total);
	}
}
