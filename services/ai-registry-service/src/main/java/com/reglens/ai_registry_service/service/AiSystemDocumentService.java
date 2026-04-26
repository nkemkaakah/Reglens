package com.reglens.ai_registry_service.service;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.reglens.ai_registry_service.dto.AiSystemDocumentDetailResponse;
import com.reglens.ai_registry_service.dto.AiSystemDocumentSummaryResponse;
import com.reglens.ai_registry_service.dto.AiSystemDocumentWriteRequest;
import com.reglens.ai_registry_service.mongo.AiSystemDocument;
import com.reglens.ai_registry_service.mongo.AiSystemDocumentRepository;
import com.reglens.ai_registry_service.repository.AiSystemRepository;

/**
 * Persists and reads large governance documents in MongoDB, scoped to a Postgres {@code ai_systems} row.
 */
@Service
public class AiSystemDocumentService {

	private final AiSystemDocumentRepository documentRepository;
	private final AiSystemRepository aiSystemRepository;

	public AiSystemDocumentService(AiSystemDocumentRepository documentRepository, AiSystemRepository aiSystemRepository) {
		this.documentRepository = documentRepository;
		this.aiSystemRepository = aiSystemRepository;
	}

	@Transactional(readOnly = true)
	public List<AiSystemDocumentSummaryResponse> listSummaries(UUID aiSystemId) {
		ensureAiSystemExists(aiSystemId);
		return documentRepository.findByAiSystemIdOrderByCreatedAtDesc(aiSystemId).stream()
				.map(d -> new AiSystemDocumentSummaryResponse(d.getId(), d.getTitle(), d.getContentType(), d.getCreatedAt()))
				.toList();
	}

	@Transactional(readOnly = true)
	public AiSystemDocumentDetailResponse getDetail(UUID aiSystemId, String documentId) {
		ensureAiSystemExists(aiSystemId);
		AiSystemDocument doc = documentRepository.findById(documentId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
		if (!aiSystemId.equals(doc.getAiSystemId())) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found for this AI system");
		}
		return new AiSystemDocumentDetailResponse(
				doc.getId(),
				doc.getAiSystemId(),
				doc.getTitle(),
				doc.getContentType(),
				doc.getBody(),
				doc.getCreatedAt()
		);
	}

	@Transactional
	public AiSystemDocumentDetailResponse create(UUID aiSystemId, AiSystemDocumentWriteRequest request) {
		ensureAiSystemExists(aiSystemId);
		AiSystemDocument doc = new AiSystemDocument();
		doc.setAiSystemId(aiSystemId);
		doc.setTitle(request.title());
		doc.setContentType(request.contentType());
		doc.setBody(request.body());
		AiSystemDocument saved = documentRepository.save(doc);
		return new AiSystemDocumentDetailResponse(
				saved.getId(),
				saved.getAiSystemId(),
				saved.getTitle(),
				saved.getContentType(),
				saved.getBody(),
				saved.getCreatedAt()
		);
	}

	private void ensureAiSystemExists(UUID aiSystemId) {
		if (!aiSystemRepository.existsById(aiSystemId)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "AI system not found");
		}
	}
}
