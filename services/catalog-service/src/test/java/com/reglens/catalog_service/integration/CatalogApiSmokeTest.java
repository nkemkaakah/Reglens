package com.reglens.catalog_service.integration;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.reglens.catalog_service.CatalogServiceApplication;
import com.reglens.catalog_service.TestcontainersConfiguration;
import com.reglens.catalog_service.support.TestDemoJwt;

/**
 * Boots the app against Testcontainers Postgres, runs Flyway V1–V5, then hits read-only catalogue endpoints (Feature 3).
 */
@SpringBootTest(classes = CatalogServiceApplication.class)
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CatalogApiSmokeTest {

	private static final String ACCESS_TOKEN = TestDemoJwt.build("integration-test@reglens", "ADMIN", 3600);

	private static RequestPostProcessor bearerAuth() {
		return request -> {
			request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN);
			return request;
		};
	}

	@Autowired
	private MockMvc mockMvc;

	@Test
	void getControls_returnsSeededPage() throws Exception {
		mockMvc.perform(get("/controls").param("size", "50").with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(greaterThanOrEqualTo(4)));
	}

	@Test
	void getSystems_returnsSeededPage() throws Exception {
		mockMvc.perform(get("/systems").param("size", "50").with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(greaterThanOrEqualTo(3)));
	}

	@Test
	void getSystemApis_returnsEmptyArray() throws Exception {
		mockMvc.perform(get("/systems/b1000000-0000-0000-0000-000000000001/apis").with(bearerAuth()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}
}
