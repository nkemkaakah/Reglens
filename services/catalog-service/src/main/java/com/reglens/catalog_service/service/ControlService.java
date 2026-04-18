package com.reglens.catalog_service.service;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import com.reglens.catalog_service.domain.Control;
import com.reglens.catalog_service.domain.ControlToSystem;
import com.reglens.catalog_service.domain.Team;
import com.reglens.catalog_service.dto.ControlLinkedSystemRow;
import com.reglens.catalog_service.dto.ControlResponse;
import com.reglens.catalog_service.dto.ControlWriteRequest;
import com.reglens.catalog_service.dto.TeamSummary;
import com.reglens.catalog_service.repository.ControlRepository;
import com.reglens.catalog_service.repository.ControlSpecifications;
import com.reglens.catalog_service.repository.ControlToSystemRepository;
import com.reglens.catalog_service.repository.TeamRepository;

/**
 * Application service for the risk/compliance control library — Feature 3 backbone for later obligation→control mapping.
 */
@Service
public class ControlService {

	private static final Logger log = LoggerFactory.getLogger(ControlService.class);

	private static final Set<String> ALLOWED_STATUS = Set.of("ACTIVE", "UNDER_REVIEW", "DEPRECATED");

	private final ControlRepository controlRepository;
	private final TeamRepository teamRepository;
	private final ControlToSystemRepository controlToSystemRepository;

	public ControlService(
			ControlRepository controlRepository,
			TeamRepository teamRepository,
			ControlToSystemRepository controlToSystemRepository
	) {
		this.controlRepository = controlRepository;
		this.teamRepository = teamRepository;
		this.controlToSystemRepository = controlToSystemRepository;
	}

	/**
	 * Paginated control catalogue for admin / future UI tables — optional filters only narrow the page, never mutate data.
	 */
	@Transactional(readOnly = true)
	public Page<ControlResponse> list(String category, String status, String q, Pageable pageable) {
		var spec = ControlSpecifications.filtered(category, status, q);
		Page<Control> page = controlRepository.findAll(spec, pageable);
		log.debug("Listed controls page={} size={} totalElements={}", page.getNumber(), page.getSize(), page.getTotalElements());
		return page.map(c -> toResponse(c, false));
	}

	/**
	 * Single control with join rows to systems — prepares the “which services implement this control?” story for Feature 4.
	 */
	@Transactional(readOnly = true)
	public ControlResponse getById(UUID id) {
		Control control = controlRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Control not found: " + id));
		ControlResponse response = toResponse(control, true);
		log.info("Loaded control id={} ref={} linkedSystems={}", id, response.ref(), response.linkedSystems().size());
		return response;
	}

	/**
	 * Creates a new control row (catalogue maintenance); {@code mapping-service} will read these targets in Phase 3–4.
	 */
	@Transactional
	public ControlResponse create(ControlWriteRequest request) {
		String ref = request.ref().trim();
		if (controlRepository.existsByRefIgnoreCase(ref)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Control ref already exists: " + ref);
		}
		Team owner = teamRepository.findById(request.ownerTeamId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found: " + request.ownerTeamId()));

		Control entity = new Control();
		entity.setRef(ref);
		entity.setCategory(request.category().trim());
		entity.setTitle(request.title().trim());
		entity.setDescription(request.description().trim());
		entity.setEvidenceType(trimToNull(request.evidenceType()));
		entity.setReviewFrequency(trimToNull(request.reviewFrequency()));
		entity.setOwnerTeam(owner);
		entity.setStatus(normalizeStatus(request.status()));

		Control saved = controlRepository.save(entity);
		log.info("Created control id={} ref={}", saved.getId(), saved.getRef());
		return toResponse(saved, false);
	}

	/**
	 * Full replace of an existing control — keeps catalogue authoritative before obligation mappings reference stable UUIDs.
	 */
	@Transactional
	public ControlResponse update(UUID id, ControlWriteRequest request) {
		Control entity = controlRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Control not found: " + id));
		String ref = request.ref().trim();
		if (controlRepository.existsByRefIgnoreCaseAndIdNot(ref, id)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Control ref already exists: " + ref);
		}
		Team owner = teamRepository.findById(request.ownerTeamId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found: " + request.ownerTeamId()));

		entity.setRef(ref);
		entity.setCategory(request.category().trim());
		entity.setTitle(request.title().trim());
		entity.setDescription(request.description().trim());
		entity.setEvidenceType(trimToNull(request.evidenceType()));
		entity.setReviewFrequency(trimToNull(request.reviewFrequency()));
		entity.setOwnerTeam(owner);
		entity.setStatus(normalizeStatus(request.status()));

		log.info("Updated control id={} ref={}", id, entity.getRef());
		return toResponse(entity, false);
	}

	private static String trimToNull(String s) {
		return StringUtils.hasText(s) ? s.trim() : null;
	}

	private String normalizeStatus(String status) {
		if (!StringUtils.hasText(status)) {
			return "ACTIVE";
		}
		String upper = status.trim().toUpperCase();
		if (!ALLOWED_STATUS.contains(upper)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + status);
		}
		return upper;
	}

	private ControlResponse toResponse(Control c, boolean includeLinks) {
		Team owner = c.getOwnerTeam();
		TeamSummary teamSummary = owner == null
				? null
				: new TeamSummary(owner.getId(), owner.getName(), owner.getDomain());

		List<ControlLinkedSystemRow> links = List.of();
		if (includeLinks) {
			List<ControlToSystem> rows = controlToSystemRepository.findByControlIdWithSystems(c.getId());
			links = rows.stream()
					.map(r -> new ControlLinkedSystemRow(
							r.getSystem().getId(),
							r.getSystem().getRef(),
							r.getSystem().getDisplayName(),
							r.getNotes()
					))
					.toList();
		}

		return new ControlResponse(
				c.getId(),
				c.getRef(),
				c.getCategory(),
				c.getTitle(),
				c.getDescription(),
				c.getEvidenceType(),
				c.getReviewFrequency(),
				c.getStatus(),
				teamSummary,
				c.getCreatedAt(),
				links
		);
	}
}
