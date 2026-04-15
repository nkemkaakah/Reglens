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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "obligations")
public class Obligation {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "document_id", nullable = false)
	private Document document;

	@Column(nullable = false, unique = true)
	private String ref;

	@Column(nullable = false)
	private String title;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String summary;

	@Column(name = "full_text", nullable = false, columnDefinition = "TEXT")
	private String fullText;

	@Column(name = "section_ref")
	private String sectionRef;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(columnDefinition = "text[]")
	private List<String> topics;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "ai_principles", columnDefinition = "text[]")
	private List<String> aiPrinciples;

	@Column(name = "risk_rating")
	private String riskRating;

	@Column(name = "effective_date")
	private LocalDate effectiveDate;

	@Column(nullable = false)
	private String status = "UNMAPPED";

	@Column(name = "triaged_by")
	private String triagedBy;

	@Column(name = "triaged_at")
	private OffsetDateTime triagedAt;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt = OffsetDateTime.now();

	public UUID getId() {
		return id;
	}

	public void setId(UUID id) {
		this.id = id;
	}

	public Document getDocument() {
		return document;
	}

	public void setDocument(Document document) {
		this.document = document;
	}

	public String getRef() {
		return ref;
	}

	public void setRef(String ref) {
		this.ref = ref;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getSummary() {
		return summary;
	}

	public void setSummary(String summary) {
		this.summary = summary;
	}

	public String getFullText() {
		return fullText;
	}

	public void setFullText(String fullText) {
		this.fullText = fullText;
	}

	public String getSectionRef() {
		return sectionRef;
	}

	public void setSectionRef(String sectionRef) {
		this.sectionRef = sectionRef;
	}

	public List<String> getTopics() {
		return topics;
	}

	public void setTopics(List<String> topics) {
		this.topics = topics;
	}

	public List<String> getAiPrinciples() {
		return aiPrinciples;
	}

	public void setAiPrinciples(List<String> aiPrinciples) {
		this.aiPrinciples = aiPrinciples;
	}

	public String getRiskRating() {
		return riskRating;
	}

	public void setRiskRating(String riskRating) {
		this.riskRating = riskRating;
	}

	public LocalDate getEffectiveDate() {
		return effectiveDate;
	}

	public void setEffectiveDate(LocalDate effectiveDate) {
		this.effectiveDate = effectiveDate;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getTriagedBy() {
		return triagedBy;
	}

	public void setTriagedBy(String triagedBy) {
		this.triagedBy = triagedBy;
	}

	public OffsetDateTime getTriagedAt() {
		return triagedAt;
	}

	public void setTriagedAt(OffsetDateTime triagedAt) {
		this.triagedAt = triagedAt;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(OffsetDateTime createdAt) {
		this.createdAt = createdAt;
	}
}
