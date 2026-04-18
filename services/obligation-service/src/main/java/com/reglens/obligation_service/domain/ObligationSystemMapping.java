package com.reglens.obligation_service.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Join row: obligation mapped to an internal system id from the catalogue (catalog-service).
 */
@Entity
@Table(name = "obligation_to_system")
public class ObligationSystemMapping {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "obligation_id", nullable = false)
	private Obligation obligation;

	@Column(name = "system_id", nullable = false)
	private UUID systemId;

	@Column(precision = 4, scale = 3)
	private BigDecimal confidence;

	@Column(nullable = false)
	private String source;

	@Column(columnDefinition = "TEXT")
	private String explanation;

	@Column(name = "approved_by")
	private String approvedBy;

	@Column(name = "approved_at")
	private OffsetDateTime approvedAt;

	public UUID getId() {
		return id;
	}

	public void setId(UUID id) {
		this.id = id;
	}

	public Obligation getObligation() {
		return obligation;
	}

	public void setObligation(Obligation obligation) {
		this.obligation = obligation;
	}

	public UUID getSystemId() {
		return systemId;
	}

	public void setSystemId(UUID systemId) {
		this.systemId = systemId;
	}

	public BigDecimal getConfidence() {
		return confidence;
	}

	public void setConfidence(BigDecimal confidence) {
		this.confidence = confidence;
	}

	public String getSource() {
		return source;
	}

	public void setSource(String source) {
		this.source = source;
	}

	public String getExplanation() {
		return explanation;
	}

	public void setExplanation(String explanation) {
		this.explanation = explanation;
	}

	public String getApprovedBy() {
		return approvedBy;
	}

	public void setApprovedBy(String approvedBy) {
		this.approvedBy = approvedBy;
	}

	public OffsetDateTime getApprovedAt() {
		return approvedAt;
	}

	public void setApprovedAt(OffsetDateTime approvedAt) {
		this.approvedAt = approvedAt;
	}
}
