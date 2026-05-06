package com.reglens.obligation_service.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reglens.obligation_service.TestcontainersConfiguration;
import com.reglens.obligation_service.support.TestDemoJwt;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.UUID;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
	private static final String STUB_CONTROL_ID = "c1000000-0000-0000-0000-000000000001";

	private static final String ACCESS_TOKEN = TestDemoJwt.build("integration-test@reglens", "ADMIN", 3600);

	private static RequestPostProcessor bearerAuth() {
		return request -> {
			request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN);
			return request;
		};
	}

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private String postCreateObligation(String ref) throws Exception {
		var mvcResult = mockMvc.perform(post("/obligations")
						.with(bearerAuth())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "documentId": "%s",
								  "ref": "%s",
								  "title": "%s",
								  "summary": "s",
								  "fullText": "f"
								}
								""".formatted(SEED_DOCUMENT_ID, ref, ref)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(mvcResult.getResponse().getContentAsString()).get("id").asText();
	}

	@Test
	@DisplayName("GET /obligations returns a page containing Flyway seed obligations")
	void listObligations_returnsSeededData() throws Exception {
		mockMvc.perform(get("/obligations").param("size", "20").with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(3))))
				.andExpect(jsonPath("$.totalElements").value(greaterThanOrEqualTo(3)));
	}

	@Test
	@DisplayName("GET /obligations filters by status (case-insensitive)")
	void listObligations_filtersByStatus() throws Exception {
		mockMvc.perform(get("/obligations").param("status", "unmapped").param("size", "20").with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[?(@.ref == 'FCA-AI-2024-OB-002')]").isNotEmpty());
	}

	@Test
	@DisplayName("GET /obligations filters by statusIn (comma-separated, precedence over status)")
	void listObligations_filtersByStatusIn() throws Exception {
		String refUnmapped = "IT-STATUSIN-UM-" + UUID.randomUUID();
		String refInProgress = "IT-STATUSIN-IP-" + UUID.randomUUID();
		postCreateObligation(refUnmapped);
		String idInProgress = postCreateObligation(refInProgress);
		mockMvc.perform(post("/obligations/" + idInProgress + "/mapping-suggest-started")
						.with(bearerAuth()))
				.andExpect(status().isNoContent());

		mockMvc.perform(
						get("/obligations")
								.param("status", "MAPPED")
								.param("statusIn", "UNMAPPED,IN_PROGRESS")
								.param("q", "IT-STATUSIN-")
								.param("size", "50")
								.with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[*].ref", hasItem(refUnmapped)))
				.andExpect(jsonPath("$.content[*].ref", hasItem(refInProgress)))
				.andExpect(jsonPath("$.content[?(@.ref == '" + refUnmapped + "')].status", hasItem("UNMAPPED")))
				.andExpect(jsonPath("$.content[?(@.ref == '" + refInProgress + "')].status", hasItem("IN_PROGRESS")));
	}

	@Test
	@DisplayName("GET /obligations filters by regulator via joined document")
	void listObligations_filtersByRegulator() throws Exception {
		mockMvc.perform(get("/obligations").param("regulator", "fca").param("size", "20").with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[?(@.regulator == 'FCA')]").isNotEmpty());
	}

	@Test
	@DisplayName("GET /obligations filters by topic using Postgres text[] semantics")
	void listObligations_filtersByTopic() throws Exception {
		mockMvc.perform(get("/obligations").param("topic", "Fairness").param("size", "20").with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content.length()").value(greaterThanOrEqualTo(1)));
	}

	@Test
	@DisplayName("GET /obligations filters by free-text q on title or summary")
	void listObligations_filtersBySearchQuery() throws Exception {
		mockMvc.perform(get("/obligations").param("q", "explain").param("size", "20").with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[?(@.ref == 'FCA-AI-2024-OB-001')]").isNotEmpty());
	}

	@Test
	@DisplayName("GET /obligations/{id} returns obligation detail for seed id")
	void getObligation_returnsDetail() throws Exception {
		mockMvc.perform(get("/obligations/" + SEED_OBLIGATION_ID).with(bearerAuth()))
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
		mockMvc.perform(get("/obligations/" + UUID.randomUUID()).with(bearerAuth()))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("GET /documents returns page including Flyway seed document")
	void listDocuments_includesSeed() throws Exception {
		mockMvc.perform(get("/documents").param("size", "20").with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[?(@.ref == 'FCA-AI-UPDATE-2024')]").isNotEmpty());
	}

	@Test
	@DisplayName("GET /documents/{id} returns seed document")
	void getDocument_returnsDetail() throws Exception {
		mockMvc.perform(get("/documents/" + SEED_DOCUMENT_ID).with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(SEED_DOCUMENT_ID))
				.andExpect(jsonPath("$.ref").value("FCA-AI-UPDATE-2024"))
				.andExpect(jsonPath("$.regulator").value("FCA"));
	}

	@Test
	@DisplayName("GET /documents/{id} returns 404 for unknown id")
	void getDocument_notFound() throws Exception {
		mockMvc.perform(get("/documents/" + UUID.randomUUID()).with(bearerAuth()))
				.andExpect(status().isNotFound());
	}

	@Test
	@DisplayName("GET /documents/{id}/obligations returns obligations for seed document")
	void listObligationsForDocument_returnsLinkedRows() throws Exception {
		mockMvc.perform(get("/documents/" + SEED_DOCUMENT_ID + "/obligations").param("size", "20").with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(3))))
				.andExpect(jsonPath("$.content[?(@.documentId == '" + SEED_DOCUMENT_ID + "')]").isNotEmpty());
	}

	@Test
	@DisplayName("GET /documents/{id}/obligations returns 404 when document does not exist")
	void listObligationsForDocument_documentNotFound() throws Exception {
		mockMvc.perform(get("/documents/" + UUID.randomUUID() + "/obligations").with(bearerAuth()))
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
	@DisplayName("POST /documents returns 201 with body when Authorization bearer is a valid demo JWT")
	void createDocument_withToken_persists() throws Exception {
		String ref = "IT-DOC-" + UUID.randomUUID();
		mockMvc.perform(post("/documents")
						.with(bearerAuth())
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
						.with(bearerAuth())
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
						.with(bearerAuth())
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
				.andExpect(jsonPath("$.riskRating").value("LOW"))
				.andExpect(jsonPath("$.status").value("UNMAPPED"));
	}

	@Test
	@DisplayName("POST /obligations ignores request status — always persists UNMAPPED")
	void createObligation_ignoresRequestStatus() throws Exception {
		String ref = "IT-OB-STATUS-" + UUID.randomUUID();
		mockMvc.perform(post("/obligations")
						.with(bearerAuth())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "documentId": "%s",
								  "ref": "%s",
								  "title": "t",
								  "summary": "s",
								  "fullText": "f",
								  "status": "MAPPED"
								}
								""".formatted(SEED_DOCUMENT_ID, ref)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("UNMAPPED"));
	}

	@Test
	@DisplayName("POST /obligations returns 404 when document id does not exist")
	void createObligation_documentNotFound() throws Exception {
		mockMvc.perform(post("/obligations")
						.with(bearerAuth())
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
						.with(bearerAuth())
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
								    "fullText": "f2",
								    "status": "IN_PROGRESS"
								  }
								]
								""".formatted(SEED_DOCUMENT_ID, r1, SEED_DOCUMENT_ID, r2)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$", hasSize(2)))
				.andExpect(jsonPath("$[0].ref").value(r1))
				.andExpect(jsonPath("$[1].ref").value(r2))
				.andExpect(jsonPath("$[0].status").value("UNMAPPED"))
				.andExpect(jsonPath("$[1].status").value("UNMAPPED"));
	}

	@Test
	@DisplayName("POST /obligations/{id}/mapping-suggest-started returns 403 without token")
	void mappingSuggestStarted_requiresAuth() throws Exception {
		mockMvc.perform(post("/obligations/" + SEED_OBLIGATION_ID + "/mapping-suggest-started"))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("POST /obligations/{id}/mapping-suggest-started moves UNMAPPED to IN_PROGRESS")
	void mappingSuggestStarted_unmappedToInProgress() throws Exception {
		String id = postCreateObligation("IT-SUGGEST-" + UUID.randomUUID());
		mockMvc.perform(get("/obligations/" + id).with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("UNMAPPED"));
		mockMvc.perform(post("/obligations/" + id + "/mapping-suggest-started")
						.with(bearerAuth()))
				.andExpect(status().isNoContent());
		mockMvc.perform(get("/obligations/" + id).with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("IN_PROGRESS"));
	}

	@Test
	@DisplayName("PATCH /obligations/{id}/status returns 403 without token")
	void patchStatus_requiresAuth() throws Exception {
		mockMvc.perform(patch("/obligations/" + SEED_OBLIGATION_ID + "/status")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "status": "IMPLEMENTED", "confirmedBy": "u@reglens" }
								"""))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("PATCH /obligations/{id}/status MAPPED → IMPLEMENTED")
	void patchStatus_mappedToImplemented() throws Exception {
		String id = postCreateObligation("IT-IMPL-" + UUID.randomUUID());
		mockMvc.perform(post("/obligations/" + id + "/mappings/controls")
						.with(bearerAuth())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								[ { "controlId": "%s", "source": "MANUAL", "approvedBy": "t@reglens" } ]
								""".formatted(STUB_CONTROL_ID)))
				.andExpect(status().isOk());
		mockMvc.perform(get("/obligations/" + id).with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("MAPPED"));

		mockMvc.perform(patch("/obligations/" + id + "/status")
						.with(bearerAuth())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "status": "IMPLEMENTED", "confirmedBy": "lead@reglens" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("IMPLEMENTED"))
				.andExpect(jsonPath("$.triagedBy").value("lead@reglens"));

		mockMvc.perform(patch("/obligations/" + id + "/status")
						.with(bearerAuth())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "status": "IMPLEMENTED", "confirmedBy": "again@reglens" }
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("IMPLEMENTED"));
	}

	@Test
	@DisplayName("PATCH /obligations/{id}/status returns 409 when not MAPPED")
	void patchStatus_conflictWhenUnmapped() throws Exception {
		String id = postCreateObligation("IT-NOIMPL-" + UUID.randomUUID());
		mockMvc.perform(patch("/obligations/" + id + "/status")
						.with(bearerAuth())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{ "status": "IMPLEMENTED", "confirmedBy": "u@reglens" }
								"""))
				.andExpect(status().isConflict());
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
