package com.reglens.obligation_service.integration;

import com.reglens.obligation_service.TestcontainersConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Feature 4 persistence slice: obligation→control/system joins and the GET aggregate for the UI drawer.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ObligationMappingApiIntegrationTest {

	private static final String SEED_OBLIGATION_ID = "e1000000-0000-0000-0000-000000000001";
	/** Seed obligation with no mapping writes in these tests — avoids ordering flakiness across methods. */
	private static final String SEED_OBLIGATION_ID_UNMAPPED = "e1000000-0000-0000-0000-000000000003";
	/** Same UUIDs seeded by test Flyway {@code V3_5__catalog_stub_for_mapping_fks.sql} and catalog-service seed. */
	private static final String STUB_CONTROL_ID = "c1000000-0000-0000-0000-000000000001";
	private static final String STUB_SYSTEM_ID = "b1000000-0000-0000-0000-000000000001";

	private static final String SERVICE_TOKEN = "test-service-token";

	@Autowired
	private MockMvc mockMvc;

	@Test
	@DisplayName("GET /obligations/{id}/mappings returns empty lists when no mappings exist")
	void getMappings_emptyInitially() throws Exception {
		mockMvc.perform(get("/obligations/" + SEED_OBLIGATION_ID_UNMAPPED + "/mappings"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.controls", hasSize(0)))
				.andExpect(jsonPath("$.systems", hasSize(0)));
	}

	@Test
	@DisplayName("POST /obligations/{id}/mappings/controls returns 403 without bearer token")
	void postControlMappings_requiresAuth() throws Exception {
		mockMvc.perform(post("/obligations/" + SEED_OBLIGATION_ID + "/mappings/controls")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								[ { "controlId": "%s", "source": "MANUAL", "approvedBy": "tester@reglens" } ]
								""".formatted(STUB_CONTROL_ID)))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("POST /obligations/{id}/mappings/controls persists then GET returns the row")
	void postControlMappings_thenGet() throws Exception {
		mockMvc.perform(post("/obligations/" + SEED_OBLIGATION_ID + "/mappings/controls")
						.header("Authorization", "Bearer " + SERVICE_TOKEN)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								[
								  {
								    "controlId": "%s",
								    "confidence": 0.88,
								    "explanation": "Maps to model explainability expectations.",
								    "source": "AI_SUGGESTED",
								    "approvedBy": "compliance@reglens.dev"
								  }
								]
								""".formatted(STUB_CONTROL_ID)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].controlId").value(STUB_CONTROL_ID))
				.andExpect(jsonPath("$[0].source").value("AI_SUGGESTED"));

		mockMvc.perform(get("/obligations/" + SEED_OBLIGATION_ID + "/mappings"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.controls", hasSize(1)))
				.andExpect(jsonPath("$.controls[0].controlId").value(STUB_CONTROL_ID));
	}

	@Test
	@DisplayName("POST /obligations/{id}/mappings/systems persists then GET returns the row")
	void postSystemMappings_thenGet() throws Exception {
		String obligationId = "e1000000-0000-0000-0000-000000000002";
		mockMvc.perform(post("/obligations/" + obligationId + "/mappings/systems")
						.header("Authorization", "Bearer " + SERVICE_TOKEN)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								[
								  {
								    "systemId": "%s",
								    "confidence": 0.75,
								    "explanation": "Service likely in scope for logging.",
								    "source": "MANUAL",
								    "approvedBy": "architect@reglens.dev"
								  }
								]
								""".formatted(STUB_SYSTEM_ID)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].systemId").value(STUB_SYSTEM_ID));

		mockMvc.perform(get("/obligations/" + obligationId + "/mappings"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.systems", hasSize(1)));
	}

	@Test
	@DisplayName("POST control mappings returns 400 for unknown control id (FK / integrity)")
	void postControlMappings_unknownControl() throws Exception {
		mockMvc.perform(post("/obligations/" + SEED_OBLIGATION_ID + "/mappings/controls")
						.header("Authorization", "Bearer " + SERVICE_TOKEN)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								[
								  {
								    "controlId": "%s",
								    "source": "MANUAL",
								    "approvedBy": "tester@reglens"
								  }
								]
								""".formatted(UUID.randomUUID())))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("GET /obligations/{id}/mappings returns 404 when obligation does not exist")
	void getMappings_obligationNotFound() throws Exception {
		mockMvc.perform(get("/obligations/" + UUID.randomUUID() + "/mappings"))
				.andExpect(status().isNotFound());
	}
}
