package com.reglens.obligation_service.service;

import com.reglens.obligation_service.domain.Obligation;
import com.reglens.obligation_service.domain.ObligationControlMapping;
import com.reglens.obligation_service.domain.ObligationSystemMapping;
import com.reglens.obligation_service.dto.ControlMappingRequest;
import com.reglens.obligation_service.dto.ControlMappingRow;
import com.reglens.obligation_service.dto.MappingsResponse;
import com.reglens.obligation_service.dto.SystemMappingRequest;
import com.reglens.obligation_service.dto.SystemMappingRow;
import com.reglens.obligation_service.repository.ObligationControlMappingRepository;
import com.reglens.obligation_service.repository.ObligationRepository;
import com.reglens.obligation_service.repository.ObligationSystemMappingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Persists obligation↔control/system links for Feature 4 (AI-assisted mapping). This is the
 * authoritative store mapping-service will call after human approval; Kafka is handled elsewhere.
 */
@Service
public class MappingService {

	private static final Set<String> ALLOWED_SOURCES = Set.of("AI_SUGGESTED", "MANUAL");

	private final ObligationRepository obligationRepository;
	private final ObligationControlMappingRepository controlMappingRepository;
	private final ObligationSystemMappingRepository systemMappingRepository;

	public MappingService(
			ObligationRepository obligationRepository,
			ObligationControlMappingRepository controlMappingRepository,
			ObligationSystemMappingRepository systemMappingRepository
	) {
		this.obligationRepository = obligationRepository;
		this.controlMappingRepository = controlMappingRepository;
		this.systemMappingRepository = systemMappingRepository;
	}

	@Transactional(readOnly = true)
	public MappingsResponse getMappings(UUID obligationId) {
		requireObligation(obligationId);
		List<ControlMappingRow> controls = controlMappingRepository.findByObligation_Id(obligationId).stream()
				.map(this::toControlRow)
				.toList();
		List<SystemMappingRow> systems = systemMappingRepository.findByObligation_Id(obligationId).stream()
				.map(this::toSystemRow)
				.toList();
		return new MappingsResponse(controls, systems);
	}

	@Transactional
	public List<ControlMappingRow> upsertControlMappings(UUID obligationId, List<ControlMappingRequest> requests) {
		Obligation obligation = requireObligation(obligationId);
		OffsetDateTime now = OffsetDateTime.now();
		for (ControlMappingRequest request : requests) {
			validateConfidence(request.confidence());
			String source = normalizeSource(request.source());
			ObligationControlMapping row = controlMappingRepository
					.findByObligation_IdAndControlId(obligationId, request.controlId())
					.orElseGet(() -> newControlRow(obligation, request.controlId()));
			row.setObligation(obligation);
			row.setControlId(request.controlId());
			row.setConfidence(request.confidence());
			row.setExplanation(trimToNull(request.explanation()));
			row.setSource(source);
			row.setApprovedBy(trimToNull(request.approvedBy()));
			row.setApprovedAt(now);
			controlMappingRepository.save(row);
		}
		return controlMappingRepository.findByObligation_Id(obligationId).stream()
				.map(this::toControlRow)
				.toList();
	}

	@Transactional
	public List<SystemMappingRow> upsertSystemMappings(UUID obligationId, List<SystemMappingRequest> requests) {
		Obligation obligation = requireObligation(obligationId);
		OffsetDateTime now = OffsetDateTime.now();
		for (SystemMappingRequest request : requests) {
			validateConfidence(request.confidence());
			String source = normalizeSource(request.source());
			ObligationSystemMapping row = systemMappingRepository
					.findByObligation_IdAndSystemId(obligationId, request.systemId())
					.orElseGet(() -> newSystemRow(obligation, request.systemId()));
			row.setObligation(obligation);
			row.setSystemId(request.systemId());
			row.setConfidence(request.confidence());
			row.setExplanation(trimToNull(request.explanation()));
			row.setSource(source);
			row.setApprovedBy(trimToNull(request.approvedBy()));
			row.setApprovedAt(now);
			systemMappingRepository.save(row);
		}
		return systemMappingRepository.findByObligation_Id(obligationId).stream()
				.map(this::toSystemRow)
				.toList();
	}

	private static ObligationControlMapping newControlRow(Obligation obligation, UUID controlId) {
		ObligationControlMapping row = new ObligationControlMapping();
		row.setObligation(obligation);
		row.setControlId(controlId);
		return row;
	}

	private static ObligationSystemMapping newSystemRow(Obligation obligation, UUID systemId) {
		ObligationSystemMapping row = new ObligationSystemMapping();
		row.setObligation(obligation);
		row.setSystemId(systemId);
		return row;
	}

	private Obligation requireObligation(UUID obligationId) {
		return obligationRepository.findById(obligationId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Obligation not found: " + obligationId));
	}

	private static void validateConfidence(BigDecimal confidence) {
		if (confidence == null) {
			return;
		}
		if (confidence.compareTo(BigDecimal.ZERO) < 0 || confidence.compareTo(BigDecimal.ONE) > 0) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "confidence must be between 0 and 1");
		}
	}

	private static String normalizeSource(String source) {
		if (!StringUtils.hasText(source)) {
			return "MANUAL";
		}
		String upper = source.trim().toUpperCase();
		if (!ALLOWED_SOURCES.contains(upper)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "source must be AI_SUGGESTED or MANUAL");
		}
		return upper;
	}

	private static String trimToNull(String value) {
		return StringUtils.hasText(value) ? value.trim() : null;
	}

	private ControlMappingRow toControlRow(ObligationControlMapping entity) {
		return new ControlMappingRow(
				entity.getId(),
				entity.getControlId(),
				entity.getConfidence(),
				entity.getSource(),
				entity.getExplanation(),
				entity.getApprovedBy(),
				entity.getApprovedAt()
		);
	}

	private SystemMappingRow toSystemRow(ObligationSystemMapping entity) {
		return new SystemMappingRow(
				entity.getId(),
				entity.getSystemId(),
				entity.getConfidence(),
				entity.getSource(),
				entity.getExplanation(),
				entity.getApprovedBy(),
				entity.getApprovedAt()
		);
	}
}
