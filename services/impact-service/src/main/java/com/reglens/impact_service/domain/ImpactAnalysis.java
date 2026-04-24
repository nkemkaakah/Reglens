package com.reglens.impact_service.domain;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "impact_analyses")
public class ImpactAnalysis {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "obligation_id", nullable = false, unique = true)
	private UUID obligationId;

	@Column(name = "event_id", nullable = false)
	private UUID eventId;

	@Column(nullable = false)
	private String summary;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "key_engineering_impacts", columnDefinition = "jsonb")
	private JsonNode keyEngineeringImpacts;

	@Column(name = "compliance_gap")
	private String complianceGap;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "suggested_tasks", nullable = false, columnDefinition = "jsonb")
	private JsonNode suggestedTasks;

	@Column(name = "generated_by", nullable = false)
	private String generatedBy;

	@Column(name = "reviewed_by")
	private String reviewedBy;

	@Column(name = "reviewed_at")
	private OffsetDateTime reviewedAt;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt = OffsetDateTime.now();

	public UUID getId() {
		return id;
	}

	public void setId(UUID id) {
		this.id = id;
	}

	public UUID getObligationId() {
		return obligationId;
	}

	public void setObligationId(UUID obligationId) {
		this.obligationId = obligationId;
	}

	public UUID getEventId() {
		return eventId;
	}

	public void setEventId(UUID eventId) {
		this.eventId = eventId;
	}

	public String getSummary() {
		return summary;
	}

	public void setSummary(String summary) {
		this.summary = summary;
	}

	public JsonNode getKeyEngineeringImpacts() {
		return keyEngineeringImpacts;
	}

	public void setKeyEngineeringImpacts(JsonNode keyEngineeringImpacts) {
		this.keyEngineeringImpacts = keyEngineeringImpacts;
	}

	public String getComplianceGap() {
		return complianceGap;
	}

	public void setComplianceGap(String complianceGap) {
		this.complianceGap = complianceGap;
	}

	public JsonNode getSuggestedTasks() {
		return suggestedTasks;
	}

	public void setSuggestedTasks(JsonNode suggestedTasks) {
		this.suggestedTasks = suggestedTasks;
	}

	public String getGeneratedBy() {
		return generatedBy;
	}

	public void setGeneratedBy(String generatedBy) {
		this.generatedBy = generatedBy;
	}

	public String getReviewedBy() {
		return reviewedBy;
	}

	public void setReviewedBy(String reviewedBy) {
		this.reviewedBy = reviewedBy;
	}

	public OffsetDateTime getReviewedAt() {
		return reviewedAt;
	}

	public void setReviewedAt(OffsetDateTime reviewedAt) {
		this.reviewedAt = reviewedAt;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(OffsetDateTime createdAt) {
		this.createdAt = createdAt;
	}
}
