package com.reglens.workflow_service.domain;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Append-only audit row — one document per upstream Kafka message (id = source {@code eventId}).
 */
@Document(collection = "events")
public class WorkflowEvent {

	@Id
	private String id;

	private String topic;

	private String type;

	private Instant occurredAt;

	private String actor;

	/** Single obligation correlation (most event types). */
	private String obligationId;

	/**
	 * For {@code DOCUMENT_INGESTED} only: every obligation id created in the same ingest so
	 * {@code GET /obligations/{id}/events} can match without emitting N Kafka messages.
	 */
	private List<String> obligationIds;

	private String documentId;

	private String aiSystemId;

	private String summary;

	/** Raw JSON from Kafka for debugging / future UI expansion. */
	private String payload;

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getTopic() {
		return topic;
	}

	public void setTopic(String topic) {
		this.topic = topic;
	}

	public String getType() {
		return type;
	}

	public void setType(String type) {
		this.type = type;
	}

	public Instant getOccurredAt() {
		return occurredAt;
	}

	public void setOccurredAt(Instant occurredAt) {
		this.occurredAt = occurredAt;
	}

	public String getActor() {
		return actor;
	}

	public void setActor(String actor) {
		this.actor = actor;
	}

	public String getObligationId() {
		return obligationId;
	}

	public void setObligationId(String obligationId) {
		this.obligationId = obligationId;
	}

	public List<String> getObligationIds() {
		return obligationIds;
	}

	public void setObligationIds(List<String> obligationIds) {
		this.obligationIds = obligationIds;
	}

	public String getDocumentId() {
		return documentId;
	}

	public void setDocumentId(String documentId) {
		this.documentId = documentId;
	}

	public String getAiSystemId() {
		return aiSystemId;
	}

	public void setAiSystemId(String aiSystemId) {
		this.aiSystemId = aiSystemId;
	}

	public String getSummary() {
		return summary;
	}

	public void setSummary(String summary) {
		this.summary = summary;
	}

	public String getPayload() {
		return payload;
	}

	public void setPayload(String payload) {
		this.payload = payload;
	}
}
