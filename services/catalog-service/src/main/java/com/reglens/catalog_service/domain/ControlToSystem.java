package com.reglens.catalog_service.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Join row: which {@link Control} governs which {@link System} — surfaced on detail APIs for Feature 3.
 */
@Entity
@Table(name = "control_to_system")
@IdClass(ControlToSystemId.class)
public class ControlToSystem {

	@Id
	@Column(name = "control_id", nullable = false)
	private UUID controlId;

	@Id
	@Column(name = "system_id", nullable = false)
	private UUID systemId;

	@Column(columnDefinition = "TEXT")
	private String notes;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "control_id", insertable = false, updatable = false)
	private Control control;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "system_id", insertable = false, updatable = false)
	private CatalogSystem system;

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

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public Control getControl() {
		return control;
	}

	public void setControl(Control control) {
		this.control = control;
	}

	public CatalogSystem getSystem() {
		return system;
	}

	public void setSystem(CatalogSystem system) {
		this.system = system;
	}
}
