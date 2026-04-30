package com.reglens.api_gateway.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import reactor.core.publisher.Mono;

@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

	private static final String AUTH_SCHEME = "Bearer ";
	private static final String EXPECTED_ISSUER = "https://demo.reglens.io";
	private static final String EXPECTED_AUDIENCE = "https://api.reglens.io";
	private static final List<String> PUBLIC_PATH_PREFIXES = List.of("/actuator/", "/swagger-ui/", "/v3/api-docs/");
	private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
	};

	private final ObjectMapper objectMapper;

	public JwtAuthenticationFilter(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	@Override
	public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
		ServerHttpRequest request = exchange.getRequest();
		if (isPublicRequest(request)) {
			return chain.filter(exchange);
		}

		String authorization = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
		if (authorization == null || !authorization.regionMatches(true, 0, AUTH_SCHEME, 0, AUTH_SCHEME.length())) {
			return unauthorized(exchange);
		}

		String token = authorization.substring(AUTH_SCHEME.length()).trim();
		if (!isValid(token)) {
			return unauthorized(exchange);
		}

		return chain.filter(exchange);
	}

	@Override
	public int getOrder() {
		return Ordered.HIGHEST_PRECEDENCE;
	}

	private boolean isPublicRequest(ServerHttpRequest request) {
		if (HttpMethod.OPTIONS.equals(request.getMethod())) {
			return true;
		}
		String path = request.getPath().value();
		if ("/actuator/health".equals(path) || "/".equals(path)) {
			return true;
		}
		return PUBLIC_PATH_PREFIXES.stream().anyMatch(path::startsWith);
	}

	private boolean isValid(String token) {
		String[] parts = token.split("\\.");
		if (parts.length < 2) {
			return false;
		}

		try {
			String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
			Map<String, Object> payload = objectMapper.readValue(payloadJson, MAP_TYPE);
			if (!EXPECTED_ISSUER.equals(payload.get("iss"))) {
				return false;
			}
			if (!EXPECTED_AUDIENCE.equals(payload.get("aud"))) {
				return false;
			}
			Number exp = (Number) payload.get("exp");
			return exp != null && exp.longValue() > Instant.now().getEpochSecond();
		} catch (Exception ignored) {
			return false;
		}
	}

	private Mono<Void> unauthorized(ServerWebExchange exchange) {
		exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
		return exchange.getResponse().setComplete();
	}
}
