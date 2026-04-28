package com.reglens.workflow_service.kafka;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.reglens.workflow_service.service.WorkflowEventRecorder;

@Component
public class WorkflowKafkaListeners {

	private static final Logger log = LoggerFactory.getLogger(WorkflowKafkaListeners.class);

	private final WorkflowEventRecorder recorder;

	public WorkflowKafkaListeners(WorkflowEventRecorder recorder) {
		this.recorder = recorder;
	}

	@KafkaListener(id = "workflow-listener-obligation-mapped", topics = "${app.kafka.topic-mapped}")
	public void onObligationMapped(String payload) {
		log.debug("Received obligation.mapped");
		recorder.record("obligation.mapped", payload);
	}

	@KafkaListener(id = "workflow-listener-impact-generated", topics = "${app.kafka.topic-impact-generated}")
	public void onImpactGenerated(String payload) {
		log.debug("Received impact.generated");
		recorder.record("impact.generated", payload);
	}

	@KafkaListener(id = "workflow-listener-mapping-suggested", topics = "${app.kafka.topic-mapping-suggested}")
	public void onMappingSuggested(String payload) {
		log.debug("Received mapping.suggested");
		recorder.record("mapping.suggested", payload);
	}

	@KafkaListener(id = "workflow-listener-document-ingested", topics = "${app.kafka.topic-document-ingested}")
	public void onDocumentIngested(String payload) {
		log.debug("Received document.ingested");
		recorder.record("document.ingested", payload);
	}

	@KafkaListener(id = "workflow-listener-ai-system-lifecycle", topics = "${app.kafka.topic-ai-system-lifecycle}")
	public void onAiSystemLifecycle(String payload) {
		log.debug("Received ai_system.lifecycle");
		recorder.record("ai_system.lifecycle", payload);
	}
}
