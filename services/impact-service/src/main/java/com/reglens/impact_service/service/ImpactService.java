package com.reglens.impact_service.service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reglens.impact_service.client.CatalogClient;
import com.reglens.impact_service.client.ObligationClient;
import com.reglens.impact_service.domain.ImpactAnalysis;
import com.reglens.impact_service.dto.ImpactGeneratedEvent;
import com.reglens.impact_service.dto.ImpactResponse;
import com.reglens.impact_service.dto.ImpactTaskItem;
import com.reglens.impact_service.dto.ImpactTaskRow;
import com.reglens.impact_service.dto.ObligationMappedEvent;
import com.reglens.impact_service.dto.upstream.ControlSummary;
import com.reglens.impact_service.dto.upstream.ObligationDetail;
import com.reglens.impact_service.dto.upstream.ObligationMappingsResponse;
import com.reglens.impact_service.dto.upstream.SystemSummary;
import com.reglens.impact_service.repository.ImpactAnalysisRepository;

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
				parseKeyEngineeringImpacts(row.getKeyEngineeringImpacts()),
				row.getComplianceGap(),
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
		ObligationMappingsResponse mappings = obligationClient.getMappings(event.obligationId());
		List<ControlSummary> controls = new ArrayList<>();
		for (UUID controlId : distinctControlIds(mappings)) {
			controls.add(catalogClient.getControl(controlId));
		}
		List<SystemSummary> systems = new ArrayList<>();
		for (UUID systemId : distinctSystemIds(mappings)) {
			systems.add(catalogClient.getSystem(systemId));
		}

		AnthropicImpactGenerator.LlmImpactResult generated = anthropicImpactGenerator.generate(obligation, controls, systems);
		ImpactAnalysis target = existing == null ? new ImpactAnalysis() : existing;
		target.setObligationId(event.obligationId());
		target.setEventId(event.eventId());
		target.setSummary(generated.summary());
		target.setKeyEngineeringImpacts(writeStringList(generated.keyEngineeringImpacts()));
		target.setComplianceGap(generated.complianceGap());
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

	private static List<UUID> distinctControlIds(ObligationMappingsResponse mappings) {
		LinkedHashSet<UUID> ids = new LinkedHashSet<>();
		for (ObligationMappingsResponse.ControlMappingRef row : safeList(mappings.controls())) {
			if (row != null && row.controlId() != null) {
				ids.add(row.controlId());
			}
		}
		return new ArrayList<>(ids);
	}

	private static List<UUID> distinctSystemIds(ObligationMappingsResponse mappings) {
		LinkedHashSet<UUID> ids = new LinkedHashSet<>();
		for (ObligationMappingsResponse.SystemMappingRef row : safeList(mappings.systems())) {
			if (row != null && row.systemId() != null) {
				ids.add(row.systemId());
			}
		}
		return new ArrayList<>(ids);
	}

	private JsonNode writeStringList(List<String> items) {
		return objectMapper.valueToTree(items == null ? List.of() : items);
	}

	private List<String> parseKeyEngineeringImpacts(JsonNode value) {
		if (value == null || value.isNull()) {
			return List.of();
		}
		try {
			return objectMapper.convertValue(value, new TypeReference<>() {
			});
		} catch (IllegalArgumentException ex) {
			return List.of();
		}
	}

	private JsonNode writeTasks(List<ImpactTaskRow> tasks) {
		return objectMapper.valueToTree(tasks == null ? List.of() : tasks);
	}

	private List<ImpactTaskRow> parseTasks(JsonNode value) {
		if (value == null || value.isNull() || !value.isArray()) {
			return List.of();
		}
		try {
			return objectMapper.convertValue(value, new TypeReference<>() {
			});
		} catch (IllegalArgumentException ex) {
			return parseLegacySuggestedTasks(value);
		}
	}

	/**
	 * Older analyses stored {@code tasks} as string[]; coerce into {@link ImpactTaskItem} rows.
	 */
	private List<ImpactTaskRow> parseLegacySuggestedTasks(JsonNode array) {
		List<ImpactTaskRow> rows = new ArrayList<>();
		for (JsonNode node : array) {
			if (!node.isObject()) {
				continue;
			}
			String systemIdText = textOrNull(node.get("systemId"));
			if (systemIdText == null) {
				continue;
			}
			UUID systemId;
			try {
				systemId = UUID.fromString(systemIdText);
			} catch (IllegalArgumentException ex) {
				continue;
			}
			List<String> tags = readStringArray(node.get("tags"));
			JsonNode tasksNode = node.get("tasks");
			List<ImpactTaskItem> items = new ArrayList<>();
			if (tasksNode != null && tasksNode.isArray()) {
				for (JsonNode t : tasksNode) {
					if (t.isTextual()) {
						String body = t.asText().trim();
						if (!body.isEmpty()) {
							items.add(new ImpactTaskItem(ticketTitleFromBody(body), body, "", List.of(), ""));
						}
					}
				}
			}
			rows.add(new ImpactTaskRow(
					systemId,
					textOrEmpty(node, "systemRef"),
					textOrEmpty(node, "displayName"),
					tags,
					"",
					null,
					null,
					"",
					items
			));
		}
		return rows;
	}

	private static String ticketTitleFromBody(String body) {
		String oneLine = body.replace('\n', ' ').trim();
		if (oneLine.length() <= 120) {
			return oneLine;
		}
		return oneLine.substring(0, 117) + "...";
	}

	private static String textOrNull(JsonNode n) {
		if (n == null || n.isNull() || !n.isTextual()) {
			return null;
		}
		String t = n.asText().trim();
		return t.isEmpty() ? null : t;
	}

	private static String textOrEmpty(JsonNode parent, String field) {
		JsonNode n = parent.get(field);
		if (n == null || n.isNull() || !n.isTextual()) {
			return "";
		}
		return n.asText().trim();
	}

	private static List<String> readStringArray(JsonNode node) {
		if (node == null || !node.isArray()) {
			return List.of();
		}
		List<String> out = new ArrayList<>();
		for (JsonNode el : node) {
			if (el.isTextual()) {
				String v = el.asText().trim();
				if (!v.isEmpty()) {
					out.add(v);
				}
			}
		}
		return out;
	}
}
