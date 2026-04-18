package com.reglens.catalog_service.domain;

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

/**
 * Risk / compliance control definition — the other main mapping target beside {@link System} (Feature 3).
 */
@Entity
@Table(name = "controls")
public class Control {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, unique = true)
	private String ref;

	@Column(nullable = false)
	private String category;

	@Column(nullable = false)
	private String title;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String description;

	@Column(name = "evidence_type")
	private String evidenceType;

	@Column(name = "review_frequency")
	private String reviewFrequency;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "owner_team_id")
	private Team ownerTeam;

	@Column(nullable = false)
	private String status = "ACTIVE";

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt = OffsetDateTime.now();

	public UUID getId() {
		return id;
	}

	public void setId(UUID id) {
		this.id = id;
	}

	public String getRef() {
		return ref;
	}

	public void setRef(String ref) {
		this.ref = ref;
	}

	public String getCategory() {
		return category;
	}

	public void setCategory(String category) {
		this.category = category;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getEvidenceType() {
		return evidenceType;
	}

	public void setEvidenceType(String evidenceType) {
		this.evidenceType = evidenceType;
	}

	public String getReviewFrequency() {
		return reviewFrequency;
	}

	public void setReviewFrequency(String reviewFrequency) {
		this.reviewFrequency = reviewFrequency;
	}

	public Team getOwnerTeam() {
		return ownerTeam;
	}

	public void setOwnerTeam(Team ownerTeam) {
		this.ownerTeam = ownerTeam;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(OffsetDateTime createdAt) {
		this.createdAt = createdAt;
	}
}
