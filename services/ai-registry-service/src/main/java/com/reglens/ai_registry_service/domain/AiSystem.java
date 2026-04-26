package com.reglens.ai_registry_service.domain;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * JPA mapping for {@code ai_systems} — the canonical row for one governed AI/ML/GenAI deployment.
 * <p>
 * {@code owner_team_id} is a UUID FK enforced in SQL to {@code catalog.teams}; this service does not load {@code Team}
 * entities from another schema.
 */
@Entity
@Table(name = "ai_systems")
public class AiSystem {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, unique = true)
	private String ref;

	@Column(nullable = false)
	private String name;

	private String description;

	@Column(name = "ai_type", nullable = false)
	private String aiType;

	@Column(name = "use_case", nullable = false)
	private String useCase;

	@Column(name = "business_domain")
	private String businessDomain;

	@Column(name = "model_provider")
	private String modelProvider;

	@Column(name = "model_name")
	private String modelName;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "data_sources", columnDefinition = "text[]")
	private List<String> dataSources;

	@Column(name = "owner_team_id", nullable = false)
	private UUID ownerTeamId;

	@Column(name = "tech_lead_email")
	private String techLeadEmail;

	@Column(name = "risk_rating")
	private String riskRating;

	@Column(name = "deployed_at")
	private LocalDate deployedAt;

	@Column(name = "last_reviewed")
	private LocalDate lastReviewed;

	@Column(nullable = false)
	private String status = "LIVE";

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

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getAiType() {
		return aiType;
	}

	public void setAiType(String aiType) {
		this.aiType = aiType;
	}

	public String getUseCase() {
		return useCase;
	}

	public void setUseCase(String useCase) {
		this.useCase = useCase;
	}

	public String getBusinessDomain() {
		return businessDomain;
	}

	public void setBusinessDomain(String businessDomain) {
		this.businessDomain = businessDomain;
	}

	public String getModelProvider() {
		return modelProvider;
	}

	public void setModelProvider(String modelProvider) {
		this.modelProvider = modelProvider;
	}

	public String getModelName() {
		return modelName;
	}

	public void setModelName(String modelName) {
		this.modelName = modelName;
	}

	public List<String> getDataSources() {
		return dataSources;
	}

	public void setDataSources(List<String> dataSources) {
		this.dataSources = dataSources;
	}

	public UUID getOwnerTeamId() {
		return ownerTeamId;
	}

	public void setOwnerTeamId(UUID ownerTeamId) {
		this.ownerTeamId = ownerTeamId;
	}

	public String getTechLeadEmail() {
		return techLeadEmail;
	}

	public void setTechLeadEmail(String techLeadEmail) {
		this.techLeadEmail = techLeadEmail;
	}

	public String getRiskRating() {
		return riskRating;
	}

	public void setRiskRating(String riskRating) {
		this.riskRating = riskRating;
	}

	public LocalDate getDeployedAt() {
		return deployedAt;
	}

	public void setDeployedAt(LocalDate deployedAt) {
		this.deployedAt = deployedAt;
	}

	public LocalDate getLastReviewed() {
		return lastReviewed;
	}

	public void setLastReviewed(LocalDate lastReviewed) {
		this.lastReviewed = lastReviewed;
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
