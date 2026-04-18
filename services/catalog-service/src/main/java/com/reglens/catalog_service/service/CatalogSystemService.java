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

import com.reglens.catalog_service.domain.CatalogSystem;
import com.reglens.catalog_service.domain.ControlToSystem;
import com.reglens.catalog_service.domain.Team;
import com.reglens.catalog_service.dto.CatalogSystemResponse;
import com.reglens.catalog_service.dto.CatalogSystemWriteRequest;
import com.reglens.catalog_service.dto.SystemApiRow;
import com.reglens.catalog_service.dto.SystemLinkedControlRow;
import com.reglens.catalog_service.dto.TeamSummary;
import com.reglens.catalog_service.repository.CatalogSystemRepository;
import com.reglens.catalog_service.repository.CatalogSystemSpecifications;
import com.reglens.catalog_service.repository.ControlToSystemRepository;
import com.reglens.catalog_service.repository.TeamRepository;

/**
 * Application service for the internal systems catalogue — Feature 3; systems are mapping targets alongside controls.
 */
@Service
public class CatalogSystemService {

	private static final Logger log = LoggerFactory.getLogger(CatalogSystemService.class);

	private static final Set<String> ALLOWED_CRITICALITY = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");

	private final CatalogSystemRepository catalogSystemRepository;
	private final TeamRepository teamRepository;
	private final ControlToSystemRepository controlToSystemRepository;

	public CatalogSystemService(
			CatalogSystemRepository catalogSystemRepository,
			TeamRepository teamRepository,
			ControlToSystemRepository controlToSystemRepository
	) {
		this.catalogSystemRepository = catalogSystemRepository;
		this.teamRepository = teamRepository;
		this.controlToSystemRepository = controlToSystemRepository;
	}

	/**
	 * Paginated systems list for architects / risk — filters are optional query params only.
	 */
	@Transactional(readOnly = true)
	public Page<CatalogSystemResponse> list(String domain, String criticality, String q, Pageable pageable) {
		var spec = CatalogSystemSpecifications.filtered(domain, criticality, q);
		Page<CatalogSystem> page = catalogSystemRepository.findAll(spec, pageable);
		log.debug("Listed systems page={} size={} totalElements={}", page.getNumber(), page.getSize(), page.getTotalElements());
		return page.map(s -> toResponse(s, false));
	}

	/**
	 * System detail including reverse join to controls — complements control detail for the same join table.
	 */
	@Transactional(readOnly = true)
	public CatalogSystemResponse getById(UUID id) {
		CatalogSystem system = catalogSystemRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "System not found: " + id));
		CatalogSystemResponse response = toResponse(system, true);
		log.info("Loaded system id={} ref={} linkedControls={}", id, response.ref(), response.linkedControls().size());
		return response;
	}

	/**
	 * Placeholder API surface for {@code system_apis} — returns empty until a migration adds that table (PRD optional).
	 */
	@Transactional(readOnly = true)
	public List<SystemApiRow> listApis(UUID systemId) {
		if (!catalogSystemRepository.existsById(systemId)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "System not found: " + systemId);
		}
		log.debug("GET /systems/{}/apis — no rows yet (system_apis not modelled)", systemId);
		return List.of();
	}

	/**
	 * Registers a new internal system in the catalogue (owned by a {@link Team} when {@code ownerTeamId} is present).
	 */
	@Transactional
	public CatalogSystemResponse create(CatalogSystemWriteRequest request) {
		String ref = request.ref().trim();
		if (catalogSystemRepository.existsByRefIgnoreCase(ref)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "System ref already exists: " + ref);
		}
		CatalogSystem entity = new CatalogSystem();
		entity.setRef(ref);
		entity.setDisplayName(request.displayName().trim());
		entity.setDescription(trimToNull(request.description()));
		entity.setDomain(trimToNull(request.domain()));
		entity.setTechStack(request.techStack() == null ? List.of() : List.copyOf(request.techStack()));
		entity.setRepoUrl(trimToNull(request.repoUrl()));
		entity.setCriticality(normalizeCriticality(request.criticality()));
		if (request.ownerTeamId() != null) {
			Team owner = teamRepository.findById(request.ownerTeamId())
					.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found: " + request.ownerTeamId()));
			entity.setOwnerTeam(owner);
		}

		CatalogSystem saved = catalogSystemRepository.save(entity);
		log.info("Created system id={} ref={}", saved.getId(), saved.getRef());
		return toResponse(saved, false);
	}

	/**
	 * Full replace of catalogue metadata for one system.
	 */
	@Transactional
	public CatalogSystemResponse update(UUID id, CatalogSystemWriteRequest request) {
		CatalogSystem entity = catalogSystemRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "System not found: " + id));
		String ref = request.ref().trim();
		if (catalogSystemRepository.existsByRefIgnoreCaseAndIdNot(ref, id)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "System ref already exists: " + ref);
		}
		entity.setRef(ref);
		entity.setDisplayName(request.displayName().trim());
		entity.setDescription(trimToNull(request.description()));
		entity.setDomain(trimToNull(request.domain()));
		entity.setTechStack(request.techStack() == null ? List.of() : List.copyOf(request.techStack()));
		entity.setRepoUrl(trimToNull(request.repoUrl()));
		entity.setCriticality(normalizeCriticality(request.criticality()));
		if (request.ownerTeamId() != null) {
			Team owner = teamRepository.findById(request.ownerTeamId())
					.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found: " + request.ownerTeamId()));
			entity.setOwnerTeam(owner);
		} else {
			entity.setOwnerTeam(null);
		}

		log.info("Updated system id={} ref={}", id, entity.getRef());
		return toResponse(entity, false);
	}

	private static String trimToNull(String s) {
		return StringUtils.hasText(s) ? s.trim() : null;
	}

	private String normalizeCriticality(String criticality) {
		String upper = criticality.trim().toUpperCase();
		if (!ALLOWED_CRITICALITY.contains(upper)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid criticality: " + criticality);
		}
		return upper;
	}

	private CatalogSystemResponse toResponse(CatalogSystem s, boolean includeLinks) {
		Team owner = s.getOwnerTeam();
		TeamSummary teamSummary = owner == null
				? null
				: new TeamSummary(owner.getId(), owner.getName(), owner.getDomain());

		List<SystemLinkedControlRow> links = List.of();
		if (includeLinks) {
			List<ControlToSystem> rows = controlToSystemRepository.findBySystemIdWithControls(s.getId());
			links = rows.stream()
					.map(r -> new SystemLinkedControlRow(
							r.getControl().getId(),
							r.getControl().getRef(),
							r.getControl().getTitle(),
							r.getControl().getCategory(),
							r.getNotes()
					))
					.toList();
		}

		return new CatalogSystemResponse(
				s.getId(),
				s.getRef(),
				s.getDisplayName(),
				s.getDescription(),
				s.getDomain(),
				s.getTechStack() == null ? List.of() : s.getTechStack(),
				s.getRepoUrl(),
				s.getCriticality(),
				teamSummary,
				s.getCreatedAt(),
				links
		);
	}
}
