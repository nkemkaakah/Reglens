package com.reglens.obligation_service.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "documents")
public class Document {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, unique = true)
	private String ref;

	@Column(nullable = false)
	private String title;

	@Column(nullable = false)
	private String regulator;

	@Column(name = "doc_type")
	private String docType;

	private String url;

	@Column(name = "published_date")
	private LocalDate publishedDate;

	@Column(name = "effective_date")
	private LocalDate effectiveDate;

	@Column(nullable = false)
	private String status = "ACTIVE";

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(columnDefinition = "text[]")
	private List<String> topics;

	@Column(name = "ingested_at", nullable = false)
	private OffsetDateTime ingestedAt = OffsetDateTime.now();

	@Column(name = "ingested_by", nullable = false)
	private String ingestedBy = "system";

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

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getRegulator() {
		return regulator;
	}

	public void setRegulator(String regulator) {
		this.regulator = regulator;
	}

	public String getDocType() {
		return docType;
	}

	public void setDocType(String docType) {
		this.docType = docType;
	}

	public String getUrl() {
		return url;
	}

	public void setUrl(String url) {
		this.url = url;
	}

	public LocalDate getPublishedDate() {
		return publishedDate;
	}

	public void setPublishedDate(LocalDate publishedDate) {
		this.publishedDate = publishedDate;
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

	public List<String> getTopics() {
		return topics;
	}

	public void setTopics(List<String> topics) {
		this.topics = topics;
	}

	public OffsetDateTime getIngestedAt() {
		return ingestedAt;
	}

	public void setIngestedAt(OffsetDateTime ingestedAt) {
		this.ingestedAt = ingestedAt;
	}

	public String getIngestedBy() {
		return ingestedBy;
	}

	public void setIngestedBy(String ingestedBy) {
		this.ingestedBy = ingestedBy;
	}
}
