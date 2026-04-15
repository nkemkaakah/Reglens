package com.reglens.obligation_service.service;

import com.reglens.obligation_service.domain.Document;
import com.reglens.obligation_service.dto.DocumentRequest;
import com.reglens.obligation_service.dto.DocumentResponse;
import com.reglens.obligation_service.repository.DocumentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Application layer for regulatory documents — maps entities to DTOs and enforces existence checks.
 */
@Service
public class DocumentService {

	private final DocumentRepository documentRepository;

	public DocumentService(DocumentRepository documentRepository) {
		this.documentRepository = documentRepository;
	}

	/**
	 * Paginated catalogue of ingested documents for the explorer / ingestion UIs.
	 * {@code @Transactional(readOnly = true)} keeps the persistence session read-only and allows
	 * lazy-loaded associations (if added later) within the transaction boundary.
	 */
	@Transactional(readOnly = true)
	public Page<DocumentResponse> list(Pageable pageable) {
		return documentRepository.findAll(pageable).map(this::toResponse);
	}

	/**
	 * Loads a single document by id or returns HTTP 404 semantics via {@link ResponseStatusException}.
	 */
	@Transactional(readOnly = true)
	public DocumentResponse getById(UUID id) {
		return documentRepository.findById(id)
				.map(this::toResponse)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found: " + id));
	}

	/**
	 * Persists a new document row after upload metadata is known — first step of the ingestion flow
	 * before obligations are {@link ObligationService#create created}.
	 */
	@Transactional
	public DocumentResponse create(DocumentRequest request) {
		Document document = new Document();
		document.setRef(request.ref());
		document.setTitle(request.title());
		document.setRegulator(request.regulator());
		document.setDocType(request.docType());
		document.setUrl(request.url());
		document.setPublishedDate(request.publishedDate());
		document.setEffectiveDate(request.effectiveDate());
		document.setTopics(request.topics());
		if (StringUtils.hasText(request.ingestedBy())) {
			document.setIngestedBy(request.ingestedBy().trim());
		}
		return toResponse(documentRepository.save(document));
	}

	private DocumentResponse toResponse(Document document) {
		return new DocumentResponse(
				document.getId(),
				document.getRef(),
				document.getTitle(),
				document.getRegulator(),
				document.getDocType(),
				document.getUrl(),
				document.getPublishedDate(),
				document.getEffectiveDate(),
				document.getStatus(),
				document.getTopics(),
				document.getIngestedAt(),
				document.getIngestedBy()
		);
	}
}
