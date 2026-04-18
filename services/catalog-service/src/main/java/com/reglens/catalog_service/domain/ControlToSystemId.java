package com.reglens.catalog_service.domain;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Composite primary key for {@link ControlToSystem} — links one control to one system with optional notes.
 */
public class ControlToSystemId implements Serializable {

	private UUID controlId;
	private UUID systemId;

	public ControlToSystemId() {
	}

	public ControlToSystemId(UUID controlId, UUID systemId) {
		this.controlId = controlId;
		this.systemId = systemId;
	}

	public UUID getControlId() {
		return controlId;
	}

	public void setControlId(UUID controlId) {
		this.controlId = controlId;
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
		ControlToSystemId that = (ControlToSystemId) o;
		return Objects.equals(controlId, that.controlId) && Objects.equals(systemId, that.systemId);
	}

	@Override
	public int hashCode() {
		return Objects.hash(controlId, systemId);
	}
}
