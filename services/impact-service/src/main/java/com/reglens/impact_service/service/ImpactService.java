package com.reglens.impact_service.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reglens.impact_service.client.CatalogClient;
import com.reglens.impact_service.client.ObligationClient;
import com.reglens.impact_service.domain.ImpactAnalysis;
import com.reglens.impact_service.dto.ImpactGeneratedEvent;
import com.reglens.impact_service.dto.ImpactResponse;
import com.reglens.impact_service.dto.ImpactTaskRow;
import com.reglens.impact_service.dto.ObligationMappedEvent;
import com.reglens.impact_service.dto.upstream.ControlSummary;
import com.reglens.impact_service.dto.upstream.ObligationDetail;
import com.reglens.impact_service.dto.upstream.SystemSummary;
import com.reglens.impact_service.repository.ImpactAnalysisRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ImpactService {

	private final ImpactAnalysisRepository impactAnalysisRepository;
	private final ObligationClient obligationClient;
	private final CatalogClient catalogClient;
	private final AnthropicImpactGenerator anthropicImpactGenerator;
	private final ObjectMapper objectMapper;
	private final KafkaTemplate<String, String> kafkaTemplate;
	private final String impactGeneratedTopic;

	public ImpactService(
			ImpactAnalysisRepository impactAnalysisRepository,
			ObligationClient obligationClient,
			CatalogClient catalogClient,
			AnthropicImpactGenerator anthropicImpactGenerator,
			ObjectMapper objectMapper,
			KafkaTemplate<String, String> kafkaTemplate,
			@Value("${app.kafka.topic-impact-generated}") String impactGeneratedTopic
	) {
		this.impactAnalysisRepository = impactAnalysisRepository;
		this.obligationClient = obligationClient;
		this.catalogClient = catalogClient;
		this.anthropicImpactGenerator = anthropicImpactGenerator;
		this.objectMapper = objectMapper;
		this.kafkaTemplate = kafkaTemplate;
		this.impactGeneratedTopic = impactGeneratedTopic;
	}

	@Transactional(readOnly = true)
	public ImpactResponse getImpact(UUID obligationId) {
		ImpactAnalysis row = impactAnalysisRepository.findByObligationId(obligationId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Impact not generated yet"));
		List<ImpactTaskRow> tasks = parseTasks(row.getSuggestedTasks());
		return new ImpactResponse(
				row.getObligationId(),
				row.getEventId(),
				row.getSummary(),
				tasks,
				row.getGeneratedBy(),
				row.getCreatedAt(),
				row.getReviewedBy(),
				row.getReviewedAt()
		);
	}

	@Transactional
	public void processMappedEvent(ObligationMappedEvent event) {
		ImpactAnalysis existing = impactAnalysisRepository.findByObligationId(event.obligationId()).orElse(null);
		if (existing != null && existing.getEventId().equals(event.eventId())) {
			return;
		}

		ObligationDetail obligation = obligationClient.getObligation(event.obligationId().toString());
		List<ControlSummary> controls = new ArrayList<>();
		for (UUID controlId : safeList(event.controlIds())) {
			controls.add(catalogClient.getControl(controlId));
		}
		List<SystemSummary> systems = new ArrayList<>();
		for (UUID systemId : safeList(event.systemIds())) {
			systems.add(catalogClient.getSystem(systemId));
		}

		AnthropicImpactGenerator.LlmImpactResult generated = anthropicImpactGenerator.generate(obligation, controls, systems);
		ImpactAnalysis target = existing == null ? new ImpactAnalysis() : existing;
		target.setObligationId(event.obligationId());
		target.setEventId(event.eventId());
		target.setSummary(generated.summary());
		target.setSuggestedTasks(writeTasks(generated.suggestedTasks()));
		target.setGeneratedBy(generated.generatedBy());
		target.setCreatedAt(OffsetDateTime.now());
		impactAnalysisRepository.save(target);

		ImpactGeneratedEvent emitted = new ImpactGeneratedEvent(
				UUID.randomUUID(),
				event.obligationId(),
				event.eventId(),
				OffsetDateTime.now().toString()
		);
		try {
			kafkaTemplate.send(
					impactGeneratedTopic,
					event.obligationId().toString(),
					objectMapper.writeValueAsString(emitted)
			);
		} catch (JsonProcessingException ex) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize impact.generated", ex);
		}
	}

	private static <T> List<T> safeList(List<T> list) {
		return list == null ? List.of() : list;
	}

	private String writeTasks(List<ImpactTaskRow> tasks) {
		try {
			return objectMapper.writeValueAsString(tasks == null ? List.of() : tasks);
		} catch (JsonProcessingException ex) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize suggested tasks", ex);
		}
	}

	private List<ImpactTaskRow> parseTasks(String value) {
		try {
			return objectMapper.readValue(value, new TypeReference<>() {
			});
		} catch (JsonProcessingException ex) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Invalid suggested_tasks payload", ex);
		}
	}
}
