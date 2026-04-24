package com.reglens.obligation_service.service;

import com.reglens.obligation_service.domain.Document;
import com.reglens.obligation_service.domain.Obligation;
import com.reglens.obligation_service.dto.ObligationRequest;
import com.reglens.obligation_service.dto.ObligationResponse;
import com.reglens.obligation_service.repository.DocumentRepository;
import com.reglens.obligation_service.repository.ObligationRepository;
import com.reglens.obligation_service.repository.ObligationSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Application layer for obligations — search, detail, per-document listing, and ingestion writes.
 */
@Service
public class ObligationService {

	private final ObligationRepository obligationRepository;
	private final DocumentRepository documentRepository;

	public ObligationService(
			ObligationRepository obligationRepository,
			DocumentRepository documentRepository
	) {
		this.obligationRepository = obligationRepository;
		this.documentRepository = documentRepository;
	}

	/**
	 * Explorer listing with optional filters. Delegates predicate construction to
	 * {@link ObligationSpecifications#filtered} and runs inside a read-only transaction so the
	 * joined {@link Document} can be accessed when mapping without lazy-init surprises.
	 */
	@Transactional(readOnly = true)
	public Page<ObligationResponse> list(
			String status,
			String statusIn,
			String regulator,
			String riskRating,
			String topic,
			String aiPrinciple,
			String q,
			Pageable pageable
	) {
		var spec = ObligationSpecifications.filtered(status, statusIn, regulator, riskRating, topic, aiPrinciple, q);
		return obligationRepository.findAll(spec, pageable).map(this::toResponse);
	}

	/**
	 * Single obligation for the detail drawer.
	 */
	@Transactional(readOnly = true)
	public ObligationResponse getById(UUID id) {
		return obligationRepository.findById(id)
				.map(this::toResponse)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Obligation not found: " + id));
	}

	/**
	 * All obligations for one document — supports pagination for large extractions.
	 */
	@Transactional(readOnly = true)
	public Page<ObligationResponse> listByDocument(UUID documentId, Pageable pageable) {
		if (!documentRepository.existsById(documentId)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found: " + documentId);
		}
		return obligationRepository.findByDocument_Id(documentId, pageable).map(this::toResponse);
	}

	/**
	 * Creates one obligation row (ingestion or manual). Loads the parent {@link Document} so the
	 * foreign key is satisfied and Hibernate can persist the association.
	 * <p>
	 * {@code @Transactional} (read-write default) ensures insert + any future side-effects commit atomically.
	 */
	@Transactional
	public ObligationResponse create(ObligationRequest request) {
		Document document = documentRepository.findById(request.documentId())
				.orElseThrow(() -> new ResponseStatusException(
						HttpStatus.NOT_FOUND,
						"Document not found: " + request.documentId()
				));

		Obligation obligation = new Obligation();
		obligation.setDocument(document);
		obligation.setRef(request.ref());
		obligation.setTitle(request.title());
		obligation.setSummary(request.summary());
		obligation.setFullText(request.fullText());
		obligation.setSectionRef(request.sectionRef());
		obligation.setTopics(request.topics());
		obligation.setAiPrinciples(request.aiPrinciples());
		if (StringUtils.hasText(request.riskRating())) {
			obligation.setRiskRating(request.riskRating().trim().toUpperCase());
		}
		obligation.setEffectiveDate(request.effectiveDate());
		if (StringUtils.hasText(request.status())) {
			obligation.setStatus(request.status().trim().toUpperCase());
		}

		return toResponse(obligationRepository.save(obligation));
	}

	/**
	 * Bulk insert used by {@code reg-ingestion-service} after stub/real pipeline — one transaction
	 * so either all obligations persist or none do (before any downstream eventing exists).
	 */
	@Transactional
	public List<ObligationResponse> createAll(List<ObligationRequest> requests) {
		return requests.stream().map(this::create).toList();
	}

	private ObligationResponse toResponse(Obligation obligation) {
		Document document = obligation.getDocument();
		return new ObligationResponse(
				obligation.getId(),
				document.getId(),
				document.getRef(),
				document.getTitle(),
				document.getRegulator(),
				obligation.getRef(),
				obligation.getTitle(),
				obligation.getSummary(),
				obligation.getFullText(),
				obligation.getSectionRef(),
				obligation.getTopics(),
				obligation.getAiPrinciples(),
				obligation.getRiskRating(),
				obligation.getEffectiveDate(),
				obligation.getStatus(),
				obligation.getTriagedBy(),
				obligation.getTriagedAt(),
				obligation.getCreatedAt()
		);
	}
}
