package com.reglens.impact_service.client;

import com.reglens.impact_service.dto.upstream.ControlSummary;
import com.reglens.impact_service.dto.upstream.SystemSummary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Component
public class CatalogClient {

	private final RestClient restClient;

	public CatalogClient(
			RestClient.Builder builder,
			@Value("${app.catalog-service.base-url}") String baseUrl
	) {
		this.restClient = builder.baseUrl(baseUrl).build();
	}

	public ControlSummary getControl(UUID controlId) {
		try {
			return restClient.get()
					.uri("/controls/{id}", controlId)
					.retrieve()
					.body(ControlSummary.class);
		} catch (RestClientException ex) {
			throw new ResponseStatusException(BAD_GATEWAY, "Failed to fetch control " + controlId, ex);
		}
	}

	public SystemSummary getSystem(UUID systemId) {
		try {
			return restClient.get()
					.uri("/systems/{id}", systemId)
					.retrieve()
					.body(SystemSummary.class);
		} catch (RestClientException ex) {
			throw new ResponseStatusException(BAD_GATEWAY, "Failed to fetch system " + systemId, ex);
		}
	}
}
