package com.reglens.ai_registry_service.workflow;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
@ConditionalOnBean(KafkaTemplate.class)
public class AiSystemLifecycleKafkaBridge {

	private static final Logger log = LoggerFactory.getLogger(AiSystemLifecycleKafkaBridge.class);

	private final KafkaTemplate<String, String> kafkaTemplate;
	private final ObjectMapper objectMapper;
	private final String topic;

	public AiSystemLifecycleKafkaBridge(
			KafkaTemplate<String, String> kafkaTemplate,
			ObjectMapper objectMapper,
			@Value("${app.kafka.topic-ai-system-lifecycle}") String topic
	) {
		this.kafkaTemplate = kafkaTemplate;
		this.objectMapper = objectMapper;
		this.topic = topic;
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onCommitted(AiSystemLifecycleDomainEvent event) {
		try {
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("eventId", UUID.randomUUID().toString());
			payload.put("aiSystemId", event.aiSystemId().toString());
			payload.put("action", event.action());
			payload.put("occurredAt", Instant.now().toString());
			payload.put("actor", event.actor() != null ? event.actor() : "");
			String json = objectMapper.writeValueAsString(payload);
			kafkaTemplate.send(topic, event.aiSystemId().toString(), json);
			log.debug("Published {} for aiSystemId={}", topic, event.aiSystemId());
		} catch (JsonProcessingException ex) {
			log.error("Failed to serialise ai_system.lifecycle payload for {}", event.aiSystemId(), ex);
		} catch (RuntimeException ex) {
			log.error("Kafka publish failed for ai_system.lifecycle aiSystemId={}", event.aiSystemId(), ex);
		}
	}
}
