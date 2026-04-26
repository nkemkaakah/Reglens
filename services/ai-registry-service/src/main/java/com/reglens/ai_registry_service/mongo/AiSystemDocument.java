package com.reglens.ai_registry_service.mongo;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * MongoDB document for optional large governance artefacts (model cards, long narratives, exports) tied to an AI
 * system — keeps Postgres lean; relational registry remains source of truth for structured fields.
 */
@Document(collection = "ai_system_documents")
public class AiSystemDocument {

	@Id
	private String id;

	private UUID aiSystemId;

	private String title;

	private String contentType;

	/** Large body text or pasted export — avoid loading in list endpoints. */
	private String body;

	private Instant createdAt = Instant.now();

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public UUID getAiSystemId() {
		return aiSystemId;
	}

	public void setAiSystemId(UUID aiSystemId) {
		this.aiSystemId = aiSystemId;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getContentType() {
		return contentType;
	}

	public void setContentType(String contentType) {
		this.contentType = contentType;
	}

	public String getBody() {
		return body;
	}

	public void setBody(String body) {
		this.body = body;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}
}
