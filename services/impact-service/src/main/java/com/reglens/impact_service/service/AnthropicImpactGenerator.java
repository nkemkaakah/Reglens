package com.reglens.impact_service.service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.errors.AnthropicException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.errors.RateLimitException;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.StructuredMessage;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reglens.impact_service.dto.ImpactTaskItem;
import com.reglens.impact_service.dto.ImpactTaskRow;
import com.reglens.impact_service.dto.upstream.ControlSummary;
import com.reglens.impact_service.dto.upstream.ObligationDetail;
import com.reglens.impact_service.dto.upstream.SystemSummary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AnthropicImpactGenerator {

	private static final Model MODEL = Model.CLAUDE_SONNET_4_5;
	private static final String SYSTEM_PROMPT = """
		You are a regulatory impact analyst for engineering teams. Output must be scannable: short summary,
		bullets, per-system "why / gap / evidence", then ticket-shaped tasks with traceability.

		Rules:
		1. Use ONLY obligation, mapped controls, and mapped systems from the user JSON. Do not invent systems,
		   controls, or legal requirements.
		2. summary: 2–4 sentences, engineering-focused (what must change operationally or in systems).
		3. keyEngineeringImpacts: 3–8 short bullets (each one line), concrete engineering implications.
		4. complianceGap: one short paragraph or null if no material gap is visible from the inputs.
		5. suggestedTasks: one entry per mapped system (systemId MUST match a system id from the payload).
		   For each system:
		   - impactReason: why this obligation matters for this system (2–4 sentences).
		   - complianceGap: system-specific gap or null.
		   - evidenceRequired: what auditors/regulators would expect as proof (bullets acceptable in one string).
		   - systemPriority: one of HIGH, MEDIUM, LOW based on risk/exposure for this system.
		   - tags: 0–4 short labels e.g. breaking, config-only, docs-only, data-model, api, reporting.
		   - tasks: 1–6 items. Each task MUST have:
		     title: concise ticket title (<=120 chars).
		     description: what to implement or verify (2–6 sentences).
		     obligationRef: use obligation.ref from payload when relevant, or empty string.
		     linkedControlRefs: control ref strings from payload (empty if none apply).
		     priority: HIGH, MEDIUM, or LOW for the task.
		6. If data is missing, say so briefly in the relevant field; do not fabricate IDs or refs.

		Return JSON matching the structured schema exactly.
		""";

	private final ObjectMapper objectMapper;
	private final AnthropicClient anthropicClient;
	private final String apiKey;

	public AnthropicImpactGenerator(
			ObjectMapper objectMapper,
			AnthropicClient anthropicClient,
			@Value("${anthropic.api-key:}") String apiKey
	) {
		this.objectMapper = objectMapper;
		this.anthropicClient = anthropicClient;
		this.apiKey = apiKey == null ? "" : apiKey.trim();
	}

	public LlmImpactResult generate(
			ObligationDetail obligation,
			List<ControlSummary> controls,
			List<SystemSummary> systems
	) {
		if (apiKey.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "ANTHROPIC_API_KEY is not configured");
		}
		try {
			String userPayload = objectMapper.writeValueAsString(new PromptPayload(obligation, controls, systems));
			StructuredMessageCreateParams<ImpactOutput> params = MessageCreateParams.builder()
					.model(MODEL)
					.maxTokens(4096L)
					.system(SYSTEM_PROMPT)
					.outputConfig(ImpactOutput.class)
					.addUserMessage(userPayload)
					.build();

			StructuredMessage<ImpactOutput> response = anthropicClient.messages().create(params);
			ImpactOutput output = response.content().stream()
					.flatMap(block -> block.text().stream())
					.findFirst()
					.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Anthropic response contained no structured output"))
					.text();
			String summary = output.summary == null ? "" : output.summary.trim();
			if (summary.isBlank()) {
				throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "LLM summary was empty");
			}

			List<String> keyImpacts = trimmedNonBlankStrings(output.keyEngineeringImpacts);
			String globalGap = blankToNull(output.complianceGap);

			List<ImpactTaskRow> rows = new ArrayList<>();
			for (SuggestedSystemBlock block : safeList(output.suggestedTasks)) {
				List<ImpactTaskItem> items = new ArrayList<>();
				for (SuggestedTaskItem st : safeList(block.tasks)) {
					String title = trimToEmpty(st.title);
					String description = trimToEmpty(st.description);
					if (title.isEmpty() && !description.isEmpty()) {
						title = ticketTitleFromDescription(description);
					}
					if (title.isEmpty() && description.isEmpty()) {
						continue;
					}
					String obligationRef = trimToEmpty(st.obligationRef);
					if (obligationRef.isEmpty() && obligation.ref() != null) {
						obligationRef = obligation.ref();
					}
					items.add(new ImpactTaskItem(
							title,
							description,
							obligationRef,
							trimmedNonBlankStrings(st.linkedControlRefs),
							normalizePriority(st.priority)
					));
				}
				rows.add(new ImpactTaskRow(
						parseUuid(block.systemId),
						emptyIfNull(block.systemRef),
						emptyIfNull(block.displayName),
						trimmedNonBlankStrings(block.tags),
						trimToEmpty(block.impactReason),
						blankToNull(block.complianceGap),
						blankToNull(block.evidenceRequired),
						normalizePriority(block.systemPriority),
						items
				));
			}

			if (globalGap == null && controls.isEmpty()) {
				globalGap = "No controls are mapped for this obligation; mapping is required before a reliable compliance gap can be stated.";
			}

			return new LlmImpactResult(summary, keyImpacts, globalGap, rows, MODEL.asString());
		} catch (AnthropicException ex) {
			throw mapAnthropicException(ex);
		} catch (IOException ex) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Anthropic API request failed", ex);
		}
	}

	private static String ticketTitleFromDescription(String description) {
		String oneLine = description.replace('\n', ' ').trim();
		if (oneLine.length() <= 120) {
			return oneLine;
		}
		return oneLine.substring(0, 117) + "...";
	}

	private static String normalizePriority(String raw) {
		if (raw == null) {
			return "";
		}
		String p = raw.trim().toUpperCase();
		if (p.equals("HIGH") || p.equals("MEDIUM") || p.equals("LOW")) {
			return p;
		}
		return "";
	}

	private static String blankToNull(String value) {
		if (value == null) {
			return null;
		}
		String t = value.trim();
		return t.isEmpty() ? null : t;
	}

	private static String trimToEmpty(String value) {
		return value == null ? "" : value.trim();
	}

	private static ResponseStatusException mapAnthropicException(AnthropicException ex) {
		HttpStatus status = HttpStatus.BAD_GATEWAY;
		if (ex instanceof RateLimitException) {
			status = HttpStatus.SERVICE_UNAVAILABLE;
		} else if (ex instanceof AnthropicServiceException svc) {
			int code = svc.statusCode();
			if (code == 401 || code == 403) {
				status = HttpStatus.SERVICE_UNAVAILABLE;
			}
		}
		return new ResponseStatusException(status, "Anthropic API request failed", ex);
	}

	private static UUID parseUuid(String value) {
		try {
			return UUID.fromString(value);
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "LLM returned invalid systemId: " + value, e);
		}
	}

	private static <T> List<T> safeList(List<T> values) {
		return values == null ? List.of() : values;
	}

	private static String emptyIfNull(String value) {
		return value == null ? "" : value;
	}

	private static List<String> trimmedNonBlankStrings(List<String> items) {
		List<String> cleaned = new ArrayList<>();
		for (String item : safeList(items)) {
			String v = item == null ? "" : item.trim();
			if (!v.isEmpty()) {
				cleaned.add(v);
			}
		}
		return cleaned;
	}

	public static class ImpactOutput {
		@JsonProperty("summary")
		public String summary;

		@JsonProperty("keyEngineeringImpacts")
		public List<String> keyEngineeringImpacts;

		@JsonProperty("complianceGap")
		public String complianceGap;

		@JsonProperty("suggestedTasks")
		public List<SuggestedSystemBlock> suggestedTasks;
	}

	public static class SuggestedSystemBlock {
		@JsonProperty("systemId")
		public String systemId;

		@JsonProperty("systemRef")
		public String systemRef;

		@JsonProperty("displayName")
		public String displayName;

		@JsonProperty("tags")
		public List<String> tags;

		@JsonProperty("impactReason")
		public String impactReason;

		@JsonProperty("complianceGap")
		public String complianceGap;

		@JsonProperty("evidenceRequired")
		public String evidenceRequired;

		@JsonProperty("systemPriority")
		public String systemPriority;

		@JsonProperty("tasks")
		public List<SuggestedTaskItem> tasks;
	}

	public static class SuggestedTaskItem {
		@JsonProperty("title")
		public String title;

		@JsonProperty("description")
		public String description;

		@JsonProperty("obligationRef")
		public String obligationRef;

		@JsonProperty("linkedControlRefs")
		public List<String> linkedControlRefs;

		@JsonProperty("priority")
		public String priority;
	}

	private record PromptPayload(
			ObligationDetail obligation,
			List<ControlSummary> controls,
			List<SystemSummary> systems
	) {
	}

	public record LlmImpactResult(
			String summary,
			List<String> keyEngineeringImpacts,
			String complianceGap,
			List<ImpactTaskRow> suggestedTasks,
			String generatedBy
	) {
	}
}
