package com.reglens.ai_registry_service.domain;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Composite primary key for {@link AiSystemToSystem} — pairs one AI system with one internal catalogue system UUID.
 */
public class AiSystemToSystemId implements Serializable {

	private UUID aiSystemId;
	private UUID systemId;

	public AiSystemToSystemId() {
	}

	public AiSystemToSystemId(UUID aiSystemId, UUID systemId) {
		this.aiSystemId = aiSystemId;
		this.systemId = systemId;
	}

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

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		if (o == null || getClass() != o.getClass()) {
			return false;
		}
		AiSystemToSystemId that = (AiSystemToSystemId) o;
		return Objects.equals(aiSystemId, that.aiSystemId) && Objects.equals(systemId, that.systemId);
	}

	@Override
	public int hashCode() {
		return Objects.hash(aiSystemId, systemId);
	}
}
