package com.reglens.workflow_service.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.reglens.workflow_service.domain.WorkflowEvent;

public interface WorkflowEventRepository extends MongoRepository<WorkflowEvent, String> {

	/**
	 * Obligation timeline: direct obligation id, or document-ingest rows that list this id in
	 * {@code obligationIds} (Mongo matches scalar against array membership).
	 */
	@Query("{ $or: [ { obligationId: ?0 }, { obligationIds: ?0 } ] }")
	Page<WorkflowEvent> findTimelineForObligation(String obligationId, Pageable pageable);

	Page<WorkflowEvent> findByAiSystemIdOrderByOccurredAtAsc(String aiSystemId, Pageable pageable);

	Page<WorkflowEvent> findAllByOrderByOccurredAtDesc(Pageable pageable);
}
