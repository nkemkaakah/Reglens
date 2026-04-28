package com.reglens.workflow_service.service;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reglens.workflow_service.domain.WorkflowEvent;
import com.reglens.workflow_service.dto.inbound.AiSystemLifecyclePayload;
import com.reglens.workflow_service.dto.inbound.DocumentIngestedPayload;
import com.reglens.workflow_service.dto.inbound.ImpactGeneratedPayload;
import com.reglens.workflow_service.dto.inbound.MappingSuggestedPayload;
import com.reglens.workflow_service.dto.inbound.ObligationMappedPayload;
import com.reglens.workflow_service.repository.WorkflowEventRepository;

/**
 * Normalises Kafka JSON into a single {@link WorkflowEvent} shape and persists idempotently
 * (Mongo {@code _id} = upstream {@code eventId}).
 */
@Service
public class WorkflowEventRecorder {

	private static final Logger log = LoggerFactory.getLogger(WorkflowEventRecorder.class);

	public static final String TYPE_OBLIGATION_MAPPED = "OBLIGATION_MAPPED";
	public static final String TYPE_IMPACT_GENERATED = "IMPACT_GENERATED";
	public static final String TYPE_MAPPING_SUGGESTED = "MAPPING_SUGGESTED";
	public static final String TYPE_DOCUMENT_INGESTED = "DOCUMENT_INGESTED";
	public static final String TYPE_AI_SYSTEM_CREATED = "AI_SYSTEM_CREATED";
	public static final String TYPE_AI_SYSTEM_UPDATED = "AI_SYSTEM_UPDATED";

	private final ObjectMapper objectMapper;
	private final WorkflowEventRepository repository;

	public WorkflowEventRecorder(ObjectMapper objectMapper, WorkflowEventRepository repository) {
		this.objectMapper = objectMapper;
		this.repository = repository;
	}

	public void record(String topic, String rawJson) {
		try {
			WorkflowEvent doc = switch (topic) {
				case "obligation.mapped" -> fromObligationMapped(topic, rawJson);
				case "impact.generated" -> fromImpactGenerated(topic, rawJson);
				case "mapping.suggested" -> fromMappingSuggested(topic, rawJson);
				case "document.ingested" -> fromDocumentIngested(topic, rawJson);
				case "ai_system.lifecycle" -> fromAiSystemLifecycle(topic, rawJson);
				default -> {
					log.warn("Ignoring unknown workflow topic: {}", topic);
					yield null;
				}
			};
			if (doc == null) {
				return;
			}
			repository.save(doc);
			// Future: optional denormalised lastActivityAt on obligation/ai_system via owner-service APIs.
		} catch (DuplicateKeyException ex) {
			log.debug("Duplicate workflow event skipped (idempotent): {}", ex.getMessage());
		} catch (JsonProcessingException ex) {
			log.error("Invalid JSON for topic {}: {}", topic, rawJson, ex);
		}
	}

	private WorkflowEvent fromObligationMapped(String topic, String rawJson) throws JsonProcessingException {
		ObligationMappedPayload p = objectMapper.readValue(rawJson, ObligationMappedPayload.class);
		if (p.eventId() == null || p.eventId().isBlank() || p.obligationId() == null || p.obligationId().isBlank()) {
			log.warn("obligation.mapped missing eventId or obligationId");
			return null;
		}
		int c = p.controlIds() == null ? 0 : p.controlIds().size();
		int s = p.systemIds() == null ? 0 : p.systemIds().size();
		WorkflowEvent e = base(topic, TYPE_OBLIGATION_MAPPED, p.eventId(), parseInstant(p.occurredAt()), p.approvedBy(), rawJson);
		e.setObligationId(p.obligationId());
		e.setSummary("Mappings approved: " + c + " control(s), " + s + " system(s)");
		return e;
	}

	private WorkflowEvent fromImpactGenerated(String topic, String rawJson) throws JsonProcessingException {
		ImpactGeneratedPayload p = objectMapper.readValue(rawJson, ImpactGeneratedPayload.class);
		if (p.eventId() == null || p.eventId().isBlank() || p.obligationId() == null || p.obligationId().isBlank()) {
			log.warn("impact.generated missing eventId or obligationId");
			return null;
		}
		WorkflowEvent e = base(topic, TYPE_IMPACT_GENERATED, p.eventId(), parseInstant(p.generatedAt()), null, rawJson);
		e.setObligationId(p.obligationId());
		e.setSummary("Impact analysis generated");
		return e;
	}

	private WorkflowEvent fromMappingSuggested(String topic, String rawJson) throws JsonProcessingException {
		MappingSuggestedPayload p = objectMapper.readValue(rawJson, MappingSuggestedPayload.class);
		if (p.eventId() == null || p.eventId().isBlank() || p.obligationId() == null || p.obligationId().isBlank()) {
			log.warn("mapping.suggested missing eventId or obligationId");
			return null;
		}
		WorkflowEvent e = base(topic, TYPE_MAPPING_SUGGESTED, p.eventId(), parseInstant(p.occurredAt()), p.suggestedBy(), rawJson);
		e.setObligationId(p.obligationId());
		e.setSummary("Mapping suggestions requested");
		return e;
	}

	private WorkflowEvent fromDocumentIngested(String topic, String rawJson) throws JsonProcessingException {
		DocumentIngestedPayload p = objectMapper.readValue(rawJson, DocumentIngestedPayload.class);
		if (p.eventId() == null || p.eventId().isBlank() || p.documentId() == null || p.documentId().isBlank()) {
			log.warn("document.ingested missing eventId or documentId");
			return null;
		}
		List<String> ids = p.obligationIds() == null ? List.of() : List.copyOf(p.obligationIds());
		WorkflowEvent e = base(topic, TYPE_DOCUMENT_INGESTED, p.eventId(), parseInstant(p.occurredAt()), p.ingestedBy(), rawJson);
		e.setDocumentId(p.documentId());
		e.setObligationIds(ids);
		e.setSummary("Document ingested: " + ids.size() + " obligation(s)");
		return e;
	}

	private WorkflowEvent fromAiSystemLifecycle(String topic, String rawJson) throws JsonProcessingException {
		AiSystemLifecyclePayload p = objectMapper.readValue(rawJson, AiSystemLifecyclePayload.class);
		if (p.eventId() == null || p.eventId().isBlank() || p.aiSystemId() == null || p.aiSystemId().isBlank()) {
			log.warn("ai_system.lifecycle missing eventId or aiSystemId");
			return null;
		}
		String action = p.action() == null ? "" : p.action().trim().toUpperCase();
		String type = "CREATED".equals(action) ? TYPE_AI_SYSTEM_CREATED : TYPE_AI_SYSTEM_UPDATED;
		WorkflowEvent e = base(topic, type, p.eventId(), parseInstant(p.occurredAt()), p.actor(), rawJson);
		e.setAiSystemId(p.aiSystemId());
		e.setSummary("CREATED".equals(action) ? "AI system registered" : "AI system updated");
		return e;
	}

	private static WorkflowEvent base(
			String kafkaTopic,
			String type,
			String id,
			Instant occurredAt,
			String actor,
			String rawJson
	) {
		WorkflowEvent e = new WorkflowEvent();
		e.setId(id);
		e.setTopic(kafkaTopic);
		e.setType(type);
		e.setOccurredAt(occurredAt != null ? occurredAt : Instant.now());
		e.setActor(actor);
		e.setPayload(rawJson);
		return e;
	}

	private static Instant parseInstant(String value) {
		if (value == null || value.isBlank()) {
			return Instant.now();
		}
		try {
			return Instant.parse(value);
		} catch (DateTimeParseException ex) {
			try {
				return OffsetDateTime.parse(value).toInstant();
			} catch (DateTimeParseException ex2) {
				return Instant.now();
			}
		}
	}
}
