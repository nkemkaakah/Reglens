package com.reglens.obligation_service.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Validates bearer JWT claims (issuer, audience, expiry) and installs an authenticated principal so
 * Spring Security's {@code authenticated()} rules can protect API routes.
 */
@Component
public class ServiceTokenAuthFilter extends OncePerRequestFilter {

	private static final String AUTH_SCHEME = "Bearer ";
	private static final String EXPECTED_ISSUER = "https://demo.reglens.io";
	private static final String EXPECTED_AUDIENCE = "https://api.reglens.io";
	private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
	};

	private final ObjectMapper objectMapper;

	public ServiceTokenAuthFilter(ObjectMapper objectMapper) {
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
		// JWT must have at least header.payload (signature is ignored in this local demo flow).
		String[] parts = token.split("\\.");
		if (parts.length < 2) {
			return;
		}
		try {
			// Decode payload JSON from base64url and parse as generic claims map.
			String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
			Map<String, Object> payload = objectMapper.readValue(payloadJson, MAP_TYPE);
			// Accept only tokens minted by our expected issuer and intended for this API audience.
			if (!EXPECTED_ISSUER.equals(payload.get("iss")) || !EXPECTED_AUDIENCE.equals(payload.get("aud"))) {
				return;
			}

			// Token must not be expired.
			Number exp = (Number) payload.get("exp");
			if (exp == null || exp.longValue() <= Instant.now().getEpochSecond()) {
				return;
			}

			// Build Spring Security authentication from token subject + role claim.
			String subject = String.valueOf(payload.getOrDefault("sub", "unknown-user"));
			String role = String.valueOf(payload.getOrDefault("https://reglens.io/role", "USER"));
			var authentication = new UsernamePasswordAuthenticationToken(
					subject,
					null,
					List.of(new SimpleGrantedAuthority("ROLE_" + role))
			);
			// Store auth in the security context so downstream endpoint rules see this request as authenticated.
			SecurityContextHolder.getContext().setAuthentication(authentication);
		} catch (Exception ignored) {
			// Invalid tokens are treated as unauthenticated.
		}
	}
}
