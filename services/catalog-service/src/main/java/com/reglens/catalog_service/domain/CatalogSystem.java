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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Internal application / microservice in the bank’s catalogue — a mapping target for obligations (Feature 4).
 * Named {@code CatalogSystem} to avoid clashing with {@link java.lang.System} in imports and generics.
 */
@Entity
@Table(name = "systems")
public class CatalogSystem {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, unique = true)
	private String ref;

	@Column(name = "display_name", nullable = false)
	private String displayName;

	@Column(columnDefinition = "TEXT")
	private String description;

	private String domain;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "tech_stack", columnDefinition = "text[]")
	private List<String> techStack;

	@Column(name = "repo_url")
	private String repoUrl;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "owner_team_id")
	private Team ownerTeam;

	private String criticality;

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

	public String getDisplayName() {
		return displayName;
	}

	public void setDisplayName(String displayName) {
		this.displayName = displayName;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getDomain() {
		return domain;
	}

	public void setDomain(String domain) {
		this.domain = domain;
	}

	public List<String> getTechStack() {
		return techStack;
	}

	public void setTechStack(List<String> techStack) {
		this.techStack = techStack;
	}

	public String getRepoUrl() {
		return repoUrl;
	}

	public void setRepoUrl(String repoUrl) {
		this.repoUrl = repoUrl;
	}

	public Team getOwnerTeam() {
		return ownerTeam;
	}

	public void setOwnerTeam(Team ownerTeam) {
		this.ownerTeam = ownerTeam;
	}

	public String getCriticality() {
		return criticality;
	}

	public void setCriticality(String criticality) {
		this.criticality = criticality;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(OffsetDateTime createdAt) {
		this.createdAt = createdAt;
	}
}
