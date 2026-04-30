package com.reglens.workflow_service.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class WorkflowJwtAuthFilter extends OncePerRequestFilter {

	private static final String AUTH_SCHEME = "Bearer ";
	private static final String EXPECTED_ISSUER = "https://demo.reglens.io";
	private static final String EXPECTED_AUDIENCE = "https://api.reglens.io";
	private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
	};

	private final ObjectMapper objectMapper;

	public WorkflowJwtAuthFilter(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	@Override
	protected void doFilterInternal(
			@NonNull HttpServletRequest request,
			@NonNull HttpServletResponse response,
			@NonNull FilterChain filterChain
	) throws ServletException, IOException {
		String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (authorization != null && authorization.regionMatches(true, 0, AUTH_SCHEME, 0, AUTH_SCHEME.length())) {
			String token = authorization.substring(AUTH_SCHEME.length()).trim();
			authenticateIfValid(token);
		}
		filterChain.doFilter(request, response);
	}

	private void authenticateIfValid(String token) {
		String[] parts = token.split("\\.");
		if (parts.length < 2) {
			return;
		}
		try {
			String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
			Map<String, Object> payload = objectMapper.readValue(payloadJson, MAP_TYPE);
			if (!EXPECTED_ISSUER.equals(payload.get("iss")) || !EXPECTED_AUDIENCE.equals(payload.get("aud"))) {
				return;
			}
			Number exp = (Number) payload.get("exp");
			if (exp == null || exp.longValue() <= Instant.now().getEpochSecond()) {
				return;
			}
			String subject = String.valueOf(payload.getOrDefault("sub", "unknown-user"));
			String role = String.valueOf(payload.getOrDefault("https://reglens.io/role", "USER"));
			var authentication = new UsernamePasswordAuthenticationToken(
					subject,
					null,
					List.of(new SimpleGrantedAuthority("ROLE_" + role))
			);
			SecurityContextHolder.getContext().setAuthentication(authentication);
		} catch (Exception ignored) {
			// Invalid tokens are treated as unauthenticated.
		}
	}
}
