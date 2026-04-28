package com.reglens.workflow_service.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.web.servlet.MockMvc;

import com.reglens.workflow_service.TestcontainersConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
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
class WorkflowHttpIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void globalEventsEndpointIsPublic() throws Exception {
		mockMvc.perform(get("/events").param("size", "5"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content").isArray());
	}

	@Test
	void obligationEventsEndpointIsPublic() throws Exception {
		mockMvc.perform(get("/obligations/00000000-0000-0000-0000-000000000099/events"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content").isArray());
	}
}
