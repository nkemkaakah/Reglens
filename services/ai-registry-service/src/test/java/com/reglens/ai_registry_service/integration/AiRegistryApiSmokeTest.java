package com.reglens.ai_registry_service.integration;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import com.reglens.ai_registry_service.AiRegistryServiceApplication;
import com.reglens.ai_registry_service.TestcontainersConfiguration;

/**
 * Boots ai-registry-service against Testcontainers Postgres (with catalog FK prerequisites) + Mongo, runs Flyway, then
 * hits read-only AI registry endpoints (Feature 6).
 */
@SpringBootTest(classes = AiRegistryServiceApplication.class)
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AiRegistryApiSmokeTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void getAiSystems_returnsSeededPage() throws Exception {
		mockMvc.perform(get("/ai-systems").param("size", "50").param("sort", "ref,asc"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(greaterThanOrEqualTo(3)))
				.andExpect(jsonPath("$.content[0].ref").value("NXB-AI-001"))
				.andExpect(jsonPath("$.content[0].useCase").isString())
				.andExpect(jsonPath("$.content[0].ownerTeamName").value("Credit Risk Technology"))
				.andExpect(jsonPath("$.content[0].linkedControlCount").value(4))
				.andExpect(jsonPath("$.content[0].linkedSystemCount").value(2));
	}

	@Test
	void getAiSystemById_returnsDetail() throws Exception {
		mockMvc.perform(get("/ai-systems/f1000000-0000-0000-0000-000000000001"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.ref").value("NXB-AI-001"))
				.andExpect(jsonPath("$.ownerTeamName").value("Credit Risk Technology"))
				.andExpect(jsonPath("$.linkedControls.length()").value(greaterThanOrEqualTo(1)));
	}
}
