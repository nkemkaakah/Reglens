package com.reglens.impact_service.client;

import com.reglens.impact_service.dto.upstream.ObligationDetail;
import com.reglens.impact_service.dto.upstream.ObligationMappingsResponse;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Component
public class ObligationClient {

	private final RestClient restClient;

	public ObligationClient(
			RestClient.Builder builder,
			@Value("${app.obligation.service.base-url}") String baseUrl
	) {
		this.restClient = builder.baseUrl(baseUrl).build();
	}

	public ObligationDetail getObligation(String obligationId) {
		try {
			return restClient.get()
					.uri("/obligations/{id}", obligationId)
					.retrieve()
					.body(ObligationDetail.class);
		} catch (RestClientException ex) {
			throw new ResponseStatusException(BAD_GATEWAY, "Failed to fetch obligation " + obligationId, ex);
		}
	}

	public ObligationMappingsResponse getMappings(UUID obligationId) {
		try {
			ObligationMappingsResponse body = restClient.get()
					.uri("/obligations/{id}/mappings", obligationId)
					.retrieve()
					.body(ObligationMappingsResponse.class);
			if (body == null) {
				throw new ResponseStatusException(BAD_GATEWAY, "Empty mappings response for obligation " + obligationId);
			}
			return body;
		} catch (RestClientException ex) {
			throw new ResponseStatusException(BAD_GATEWAY, "Failed to fetch mappings for obligation " + obligationId, ex);
		}
	}
}
