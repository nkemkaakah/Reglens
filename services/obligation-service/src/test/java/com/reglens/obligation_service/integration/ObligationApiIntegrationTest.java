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

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end HTTP tests for the obligation REST API: security, validation, pagination, filters,
 * and persistence against a real Postgres instance managed by Testcontainers + Flyway.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ObligationApiIntegrationTest {

	private static final String SEED_DOCUMENT_ID = "d1000000-0000-0000-0000-000000000001";
	private static final String SEED_OBLIGATION_ID = "e1000000-0000-0000-0000-000000000001";
	/** Must match {@code app.security.service-token} in {@code src/test/resources/application.properties}. */
	private static final String SERVICE_TOKEN = "test-service-token";

	@Autowired
	private MockMvc mockMvc;

	@Test
	@DisplayName("GET /obligations returns a page containing Flyway seed obligations")
	void listObligations_returnsSeededData() throws Exception {
		mockMvc.perform(get("/obligations").param("size", "20"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(3))))
				.andExpect(jsonPath("$.totalElements").value(greaterThanOrEqualTo(3)));
	}

	@Test
	@DisplayName("GET /obligations filters by status (case-insensitive)")
	void listObligations_filtersByStatus() throws Exception {
		mockMvc.perform(get("/obligations").param("status", "unmapped").param("size", "20"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[?(@.ref == 'FCA-AI-2024-OB-002')]").isNotEmpty());
	}

	@Test
	@DisplayName("GET /obligations filters by regulator via joined document")
	void listObligations_filtersByRegulator() throws Exception {
		mockMvc.perform(get("/obligations").param("regulator", "fca").param("size", "20"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[?(@.regulator == 'FCA')]").isNotEmpty());
	}

	@Test
	@DisplayName("GET /obligations filters by topic using Postgres text[] semantics")
	void listObligations_filtersByTopic() throws Exception {
		mockMvc.perform(get("/obligations").param("topic", "Fairness").param("size", "20"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(greaterThanOrEqualTo(1)));
	}

	@Test
	@DisplayName("GET /obligations filters by free-text q on title or summary")
	void listObligations_filtersBySearchQuery() throws Exception {
		mockMvc.perform(get("/obligations").param("q", "explain").param("size", "20"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[?(@.ref == 'FCA-AI-2024-OB-001')]").isNotEmpty());
	}

	@Test
	@DisplayName("GET /obligations/{id} returns obligation detail for seed id")
	void getObligation_returnsDetail() throws Exception {
		mockMvc.perform(get("/obligations/" + SEED_OBLIGATION_ID))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(SEED_OBLIGATION_ID))
				.andExpect(jsonPath("$.ref").value("FCA-AI-2024-OB-001"))
				.andExpect(jsonPath("$.documentId").value(SEED_DOCUMENT_ID))
				.andExpect(jsonPath("$.regulator").value("FCA"))
				.andExpect(jsonPath("$.fullText").isNotEmpty());
	}

	@Test
	@DisplayName("GET /obligations/{id} returns 404 for unknown id")
	void getObligation_notFound() throws Exception {
		mockMvc.perform(get("/obligations/" + UUID.randomUUID()))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("GET /documents returns page including Flyway seed document")
	void listDocuments_includesSeed() throws Exception {
		mockMvc.perform(get("/documents").param("size", "20"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[?(@.ref == 'FCA-AI-UPDATE-2024')]").isNotEmpty());
	}

	@Test
	@DisplayName("GET /documents/{id} returns seed document")
	void getDocument_returnsDetail() throws Exception {
		mockMvc.perform(get("/documents/" + SEED_DOCUMENT_ID))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(SEED_DOCUMENT_ID))
				.andExpect(jsonPath("$.ref").value("FCA-AI-UPDATE-2024"))
				.andExpect(jsonPath("$.regulator").value("FCA"));
	}

	@Test
	@DisplayName("GET /documents/{id} returns 404 for unknown id")
	void getDocument_notFound() throws Exception {
		mockMvc.perform(get("/documents/" + UUID.randomUUID()))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("GET /documents/{id}/obligations returns obligations for seed document")
	void listObligationsForDocument_returnsLinkedRows() throws Exception {
		mockMvc.perform(get("/documents/" + SEED_DOCUMENT_ID + "/obligations").param("size", "20"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(3))))
				.andExpect(jsonPath("$.content[?(@.documentId == '" + SEED_DOCUMENT_ID + "')]").isNotEmpty());
	}

	@Test
	@DisplayName("GET /documents/{id}/obligations returns 404 when document does not exist")
	void listObligationsForDocument_documentNotFound() throws Exception {
		mockMvc.perform(get("/documents/" + UUID.randomUUID() + "/obligations"))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("POST /documents returns 403 without bearer token")
	void createDocument_rejectsUnauthenticated() throws Exception {
		mockMvc.perform(post("/documents")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "ref": "NO-AUTH-DOC",
								  "title": "No auth",
								  "regulator": "FCA"
								}
								"""))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("POST /documents returns 201 with body when Authorization bearer matches service token")
	void createDocument_withToken_persists() throws Exception {
		String ref = "IT-DOC-" + UUID.randomUUID();
		mockMvc.perform(post("/documents")
						.header("Authorization", "Bearer " + SERVICE_TOKEN)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "ref": "%s",
								  "title": "Integration test document",
								  "regulator": "PRA",
								  "docType": "Test",
								  "ingestedBy": "integration-test@reglens"
								}
								""".formatted(ref)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").exists())
				.andExpect(jsonPath("$.ref").value(ref))
				.andExpect(jsonPath("$.regulator").value("PRA"))
				.andExpect(jsonPath("$.ingestedBy").value("integration-test@reglens"));
	}

	@Test
	@DisplayName("POST /documents returns 400 when required fields are missing")
	void createDocument_validationError() throws Exception {
		mockMvc.perform(post("/documents")
						.header("Authorization", "Bearer " + SERVICE_TOKEN)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("POST /obligations returns 403 without bearer token")
	void createObligation_rejectsUnauthenticated() throws Exception {
		mockMvc.perform(post("/obligations")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "documentId": "%s",
								  "ref": "NO-AUTH-OB",
								  "title": "t",
								  "summary": "s",
								  "fullText": "f"
								}
								""".formatted(SEED_DOCUMENT_ID)))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("POST /obligations returns 201 and links to existing document")
	void createObligation_withToken_persists() throws Exception {
		String ref = "IT-OB-" + UUID.randomUUID();
		mockMvc.perform(post("/obligations")
						.header("Authorization", "Bearer " + SERVICE_TOKEN)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "documentId": "%s",
								  "ref": "%s",
								  "title": "Test obligation",
								  "summary": "Summary line",
								  "fullText": "Full regulatory text",
								  "sectionRef": "IT section",
								  "topics": ["Testing"],
								  "aiPrinciples": ["Accountability"],
								  "riskRating": "LOW",
								  "status": "UNMAPPED"
								}
								""".formatted(SEED_DOCUMENT_ID, ref)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").exists())
				.andExpect(jsonPath("$.ref").value(ref))
				.andExpect(jsonPath("$.documentId").value(SEED_DOCUMENT_ID))
				.andExpect(jsonPath("$.riskRating").value("LOW"));
	}

	@Test
	@DisplayName("POST /obligations returns 404 when document id does not exist")
	void createObligation_documentNotFound() throws Exception {
		mockMvc.perform(post("/obligations")
						.header("Authorization", "Bearer " + SERVICE_TOKEN)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "documentId": "%s",
								  "ref": "IT-ORPHAN-OB",
								  "title": "t",
								  "summary": "s",
								  "fullText": "f"
								}
								""".formatted(UUID.randomUUID())))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("POST /obligations/batch returns 201 with array of created obligations")
	void createObligationsBatch_persistsAll() throws Exception {
		String r1 = "IT-BATCH-" + UUID.randomUUID();
		String r2 = "IT-BATCH-" + UUID.randomUUID();
		mockMvc.perform(post("/obligations/batch")
						.header("Authorization", "Bearer " + SERVICE_TOKEN)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								[
								  {
								    "documentId": "%s",
								    "ref": "%s",
								    "title": "Batch one",
								    "summary": "s1",
								    "fullText": "f1"
								  },
								  {
								    "documentId": "%s",
								    "ref": "%s",
								    "title": "Batch two",
								    "summary": "s2",
								    "fullText": "f2"
								  }
								]
								""".formatted(SEED_DOCUMENT_ID, r1, SEED_DOCUMENT_ID, r2)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$", hasSize(2)))
				.andExpect(jsonPath("$[0].ref").value(r1))
				.andExpect(jsonPath("$[1].ref").value(r2));
	}

	@Test
	@DisplayName("GET /v3/api-docs exposes OpenAPI document")
	void openApiJson_isAvailable() throws Exception {
		mockMvc.perform(get("/v3/api-docs"))
				.andExpect(status().isOk())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.openapi").exists());
	}
}
