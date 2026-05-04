package com.reglens.impact_service.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Unsigned JWT matching frontend/src/lib/session.ts — obligation-service and catalog-service
 * {@code ServiceTokenAuthFilter} validates iss/aud/exp only.
 */
public final class DemoServiceJwt {

	private static final ObjectMapper MAPPER = new ObjectMapper();
	private static final String ISS = "https://demo.reglens.io";
	private static final String AUD = "https://api.reglens.io";

	private DemoServiceJwt() {
	}

	public static String build(String sub, String role, long ttlSeconds) {
		long now = Instant.now().getEpochSecond();
		try {
			Map<String, String> header = Map.of("alg", "HS256", "typ", "JWT");
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("sub", sub);
			payload.put("aud", AUD);
			payload.put("iss", ISS);
			payload.put("iat", now);
			payload.put("exp", now + ttlSeconds);
			payload.put("https://reglens.io/role", role);
			String h = b64url(MAPPER.writeValueAsString(header));
			String p = b64url(MAPPER.writeValueAsString(payload));
			return h + "." + p + ".local-signature";
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("Failed to build demo JWT", e);
		}
	}

	private static String b64url(String json) {
		return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
	}
}
