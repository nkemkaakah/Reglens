package com.reglens.ai_registry_service.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

/**
 * Join row linking an {@link AiSystem} to a control in {@code catalog.controls} (governed relationship; FK in SQL).
 */
@Entity
@Table(name = "ai_system_to_control")
@IdClass(AiSystemToControlId.class)
public class AiSystemToControl {

	@Id
	@Column(name = "ai_system_id", nullable = false)
	private UUID aiSystemId;

	@Id
	@Column(name = "control_id", nullable = false)
	private UUID controlId;

	private String notes;

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

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}
}
