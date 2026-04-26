package com.reglens.ai_registry_service.domain;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Composite primary key for {@link AiSystemToControl} — pairs one AI system with one catalogue control UUID.
 */
public class AiSystemToControlId implements Serializable {

	private UUID aiSystemId;
	private UUID controlId;

	public AiSystemToControlId() {
	}

	public AiSystemToControlId(UUID aiSystemId, UUID controlId) {
		this.aiSystemId = aiSystemId;
		this.controlId = controlId;
	}

	public UUID getAiSystemId() {
		return aiSystemId;
	}

	public void setAiSystemId(UUID aiSystemId) {
		this.aiSystemId = aiSystemId;
	}

	public UUID getControlId() {
		return controlId;
	}

	public void setControlId(UUID controlId) {
		this.controlId = controlId;
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		if (o == null || getClass() != o.getClass()) {
			return false;
		}
		AiSystemToControlId that = (AiSystemToControlId) o;
		return Objects.equals(aiSystemId, that.aiSystemId) && Objects.equals(controlId, that.controlId);
	}

	@Override
	public int hashCode() {
		return Objects.hash(aiSystemId, controlId);
	}
}
