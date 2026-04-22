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
		You are a regulatory impact analyst for engineering teams.

		Using only the provided obligation, mapped controls, and mapped systems:
		1. Write a concise engineering impact summary.
		2. For each mapped system, suggest concrete engineering tasks.
		3. For each task, explain why it is needed and which obligation/control it supports.
		4. Keep the output grounded in the provided data. Do not invent systems, controls, or requirements.
		5. If information is missing, state the assumption briefly.

		Return:
		- Impact summary
		- System-by-system tasks
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

			List<ImpactTaskRow> rows = new ArrayList<>();
			for (SuggestedTask task : safeList(output.suggestedTasks)) {
				rows.add(new ImpactTaskRow(
						parseUuid(task.systemId),
						emptyIfNull(task.systemRef),
						emptyIfNull(task.displayName),
						trimmedNonBlank(task.tags),
						trimmedNonBlank(task.tasks)
				));
			}
			return new LlmImpactResult(summary, rows, MODEL.asString());
		} catch (AnthropicException ex) {
			throw mapAnthropicException(ex);
		} catch (IOException ex) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Anthropic API request failed", ex);
		}
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

	private static List<String> trimmedNonBlank(List<String> items) {
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

		@JsonProperty("suggestedTasks")
		public List<SuggestedTask> suggestedTasks;
	}

	public static class SuggestedTask {
		@JsonProperty("systemId")
		public String systemId;

		@JsonProperty("systemRef")
		public String systemRef;

		@JsonProperty("displayName")
		public String displayName;

		@JsonProperty("tags")
		public List<String> tags;

		@JsonProperty("tasks")
		public List<String> tasks;
	}

	private record PromptPayload(
			ObligationDetail obligation,
			List<ControlSummary> controls,
			List<SystemSummary> systems
	) {
	}

	public record LlmImpactResult(
			String summary,
			List<ImpactTaskRow> suggestedTasks,
			String generatedBy
	) {
	}
}
