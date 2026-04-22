package com.reglens.impact_service.kafka;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reglens.impact_service.dto.ObligationMappedEvent;
import com.reglens.impact_service.service.ImpactService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ObligationMappedConsumer {

	private static final Logger log = LoggerFactory.getLogger(ObligationMappedConsumer.class);

	private final ObjectMapper objectMapper;
	private final ImpactService impactService;

	public ObligationMappedConsumer(ObjectMapper objectMapper, ImpactService impactService) {
		this.objectMapper = objectMapper;
		this.impactService = impactService;
	}

	@KafkaListener(topics = "${app.kafka.topic-mapped}")
	public void onMessage(String payload) {
		try {
			ObligationMappedEvent event = objectMapper.readValue(payload, ObligationMappedEvent.class);
			if (event.eventId() == null || event.obligationId() == null) {
				throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "eventId and obligationId are required");
			}
			impactService.processMappedEvent(event);
		} catch (JsonProcessingException ex) {
			log.error("Failed to parse obligation.mapped payload: {}", payload, ex);
			throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid Kafka payload", ex);
		}
	}
}
