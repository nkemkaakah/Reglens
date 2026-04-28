package com.reglens.workflow_service.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.kafka.config.KafkaListenerEndpointRegistry;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.MessageListenerContainer;
import org.springframework.kafka.test.context.EmbeddedKafka;

import com.reglens.workflow_service.TestcontainersConfiguration;
import com.reglens.workflow_service.domain.WorkflowEvent;
import com.reglens.workflow_service.repository.WorkflowEventRepository;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@EmbeddedKafka(
		partitions = 1,
		topics = {
				"obligation.mapped",
				"impact.generated",
				"mapping.suggested",
				"document.ingested",
				"ai_system.lifecycle"
		}
)
class WorkflowKafkaIntegrationTest {

	private static final List<String> LISTENER_IDS = List.of(
			"workflow-listener-obligation-mapped",
			"workflow-listener-impact-generated",
			"workflow-listener-mapping-suggested",
			"workflow-listener-document-ingested",
			"workflow-listener-ai-system-lifecycle"
	);

	@Autowired
	private KafkaTemplate<String, String> kafkaTemplate;

	@Autowired
	private WorkflowEventRepository workflowEventRepository;

	@Autowired
	private KafkaListenerEndpointRegistry kafkaListenerEndpointRegistry;

	@BeforeEach
	void awaitListenersAssignedAndCleanMongo() {
		for (String listenerId : LISTENER_IDS) {
			await().atMost(Duration.ofSeconds(60)).pollInterval(Duration.ofMillis(100)).untilAsserted(() -> {
				MessageListenerContainer c = kafkaListenerEndpointRegistry.getListenerContainer(listenerId);
				assertThat(c).isNotNull();
				assertThat(c.isRunning()).isTrue();
				assertThat(c.getAssignedPartitions()).isNotEmpty();
			});
		}
		workflowEventRepository.deleteAll();
	}

	@Test
	@Order(1)
	void documentIngestedWithObligationIdsIsQueryableByObligation() throws Exception {
		String eventId = UUID.randomUUID().toString();
		String docId = UUID.randomUUID().toString();
		String obA = UUID.randomUUID().toString();
		String obB = UUID.randomUUID().toString();
		String json = "{\"eventId\":\"" + eventId + "\",\"documentId\":\"" + docId + "\",\"obligationIds\":[\""
				+ obA + "\",\"" + obB + "\"],\"ingestedBy\":\"ingest@reglens\",\"occurredAt\":\"2026-02-01T10:00:00Z\"}";

		kafkaTemplate.send("document.ingested", docId, json).get();

		await().atMost(Duration.ofSeconds(30)).pollInterval(Duration.ofMillis(200)).untilAsserted(() ->
				assertThat(workflowEventRepository.findById(eventId)).isPresent()
		);

		var page = workflowEventRepository.findTimelineForObligation(
				obA,
				org.springframework.data.domain.PageRequest.of(0, 20)
		);
		assertThat(page.getContent()).hasSize(1);
		assertThat(page.getContent().getFirst().getDocumentId()).isEqualTo(docId);
		assertThat(page.getContent().getFirst().getObligationIds()).isEqualTo(List.of(obA, obB));
	}

	@Test
	@Order(2)
	void obligationMappedMessageIsPersistedIdempotently() throws Exception {
		String eventId = UUID.randomUUID().toString();
		String obligationId = UUID.randomUUID().toString();
		String json = "{\"eventId\":\"" + eventId + "\",\"obligationId\":\"" + obligationId
				+ "\",\"approvedBy\":\"tester@reglens\",\"controlIds\":[],\"systemIds\":[],\"occurredAt\":\"2026-01-15T12:00:00Z\"}";

		kafkaTemplate.send("obligation.mapped", obligationId, json).get();

		await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
				assertThat(workflowEventRepository.findById(eventId)).isPresent()
		);

		WorkflowEvent row = workflowEventRepository.findById(eventId).orElseThrow();
		assertThat(row.getType()).isEqualTo("OBLIGATION_MAPPED");
		assertThat(row.getObligationId()).isEqualTo(obligationId);

		kafkaTemplate.send("obligation.mapped", obligationId, json).get();
		Thread.sleep(500);
		long mappedCount = workflowEventRepository.findAll().stream()
				.filter(e -> "OBLIGATION_MAPPED".equals(e.getType()))
				.count();
		assertThat(mappedCount).isEqualTo(1);
	}
}
