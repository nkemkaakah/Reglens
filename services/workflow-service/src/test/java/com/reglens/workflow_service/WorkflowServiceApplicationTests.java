package com.reglens.workflow_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.kafka.test.context.EmbeddedKafka;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
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
class WorkflowServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
