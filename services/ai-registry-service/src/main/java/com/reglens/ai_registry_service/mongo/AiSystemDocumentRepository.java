package com.reglens.ai_registry_service.mongo;

import java.util.List;
import java.util.UUID;

import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Spring Data Mongo access for {@link AiSystemDocument} — list and fetch by AI system id for governance attachments.
 */
public interface AiSystemDocumentRepository extends MongoRepository<AiSystemDocument, String> {

	List<AiSystemDocument> findByAiSystemIdOrderByCreatedAtDesc(UUID aiSystemId);
}
