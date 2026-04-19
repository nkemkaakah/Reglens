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

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "obligation_mapping_rejection")
public class ObligationMappingRejection {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "obligation_id", nullable = false)
	private Obligation obligation;

	@Column(name = "catalogue_kind", nullable = false)
	private String catalogueKind;

	@Column(name = "catalogue_id", nullable = false)
	private UUID catalogueId;

	@Column(name = "rejected_by", nullable = false)
	private String rejectedBy;

	@Column(columnDefinition = "TEXT")
	private String reason;

	@Column(name = "rejected_at", nullable = false)
	private OffsetDateTime rejectedAt;

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

	public String getCatalogueKind() {
		return catalogueKind;
	}

	public void setCatalogueKind(String catalogueKind) {
		this.catalogueKind = catalogueKind;
	}

	public UUID getCatalogueId() {
		return catalogueId;
	}

	public void setCatalogueId(UUID catalogueId) {
		this.catalogueId = catalogueId;
	}

	public String getRejectedBy() {
		return rejectedBy;
	}

	public void setRejectedBy(String rejectedBy) {
		this.rejectedBy = rejectedBy;
	}

	public String getReason() {
		return reason;
	}

	public void setReason(String reason) {
		this.reason = reason;
	}

	public OffsetDateTime getRejectedAt() {
		return rejectedAt;
	}

	public void setRejectedAt(OffsetDateTime rejectedAt) {
		this.rejectedAt = rejectedAt;
	}
}
