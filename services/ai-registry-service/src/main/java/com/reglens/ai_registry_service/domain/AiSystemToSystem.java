package com.reglens.ai_registry_service.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

/**
 * Join row linking an {@link AiSystem} to an internal system in {@code catalog.systems} (e.g. DEPLOYED_ON).
 */
@Entity
@Table(name = "ai_system_to_system")
@IdClass(AiSystemToSystemId.class)
public class AiSystemToSystem {

	@Id
	@Column(name = "ai_system_id", nullable = false)
	private UUID aiSystemId;

	@Id
	@Column(name = "system_id", nullable = false)
	private UUID systemId;

	private String relationship;

	public UUID getAiSystemId() {
		return aiSystemId;
	}

	public void setAiSystemId(UUID aiSystemId) {
		this.aiSystemId = aiSystemId;
	}

	public UUID getSystemId() {
		return systemId;
	}

	public void setSystemId(UUID systemId) {
		this.systemId = systemId;
	}

	public String getRelationship() {
		return relationship;
	}

	public void setRelationship(String relationship) {
		this.relationship = relationship;
	}
}
