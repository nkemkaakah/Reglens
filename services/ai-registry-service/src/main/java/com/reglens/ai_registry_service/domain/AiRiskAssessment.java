package com.reglens.ai_registry_service.domain;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * JPA mapping for {@code ai_risk_assessments} — stores each formal assessment cycle for an {@link AiSystem}.
 */
@Entity
@Table(name = "ai_risk_assessments")
public class AiRiskAssessment {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "ai_system_id", nullable = false)
	private AiSystem aiSystem;

	@Column(name = "assessment_date", nullable = false)
	private LocalDate assessmentDate;

	@Column(name = "assessed_by", nullable = false)
	private String assessedBy;

	@Column(name = "overall_rating", nullable = false)
	private String overallRating;

	@Column(name = "bias_risk")
	private String biasRisk;

	@Column(name = "explainability_risk")
	private String explainabilityRisk;

	@Column(name = "data_quality_risk")
	private String dataQualityRisk;

	@Column(name = "operational_risk")
	private String operationalRisk;

	private String notes;

	@Column(name = "next_review_date")
	private LocalDate nextReviewDate;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt = OffsetDateTime.now();

	public UUID getId() {
		return id;
	}

	public void setId(UUID id) {
		this.id = id;
	}

	public AiSystem getAiSystem() {
		return aiSystem;
	}

	public void setAiSystem(AiSystem aiSystem) {
		this.aiSystem = aiSystem;
	}

	public LocalDate getAssessmentDate() {
		return assessmentDate;
	}

	public void setAssessmentDate(LocalDate assessmentDate) {
		this.assessmentDate = assessmentDate;
	}

	public String getAssessedBy() {
		return assessedBy;
	}

	public void setAssessedBy(String assessedBy) {
		this.assessedBy = assessedBy;
	}

	public String getOverallRating() {
		return overallRating;
	}

	public void setOverallRating(String overallRating) {
		this.overallRating = overallRating;
	}

	public String getBiasRisk() {
		return biasRisk;
	}

	public void setBiasRisk(String biasRisk) {
		this.biasRisk = biasRisk;
	}

	public String getExplainabilityRisk() {
		return explainabilityRisk;
	}

	public void setExplainabilityRisk(String explainabilityRisk) {
		this.explainabilityRisk = explainabilityRisk;
	}

	public String getDataQualityRisk() {
		return dataQualityRisk;
	}

	public void setDataQualityRisk(String dataQualityRisk) {
		this.dataQualityRisk = dataQualityRisk;
	}

	public String getOperationalRisk() {
		return operationalRisk;
	}

	public void setOperationalRisk(String operationalRisk) {
		this.operationalRisk = operationalRisk;
	}

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public LocalDate getNextReviewDate() {
		return nextReviewDate;
	}

	public void setNextReviewDate(LocalDate nextReviewDate) {
		this.nextReviewDate = nextReviewDate;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(OffsetDateTime createdAt) {
		this.createdAt = createdAt;
	}
}
