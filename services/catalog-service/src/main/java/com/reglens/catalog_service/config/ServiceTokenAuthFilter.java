package com.reglens.catalog_service.config;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Dev bearer gate for catalogue writes — same contract as obligation-service so ops scripts share one secret.
 */
@Component
public class ServiceTokenAuthFilter extends OncePerRequestFilter {

	private final String expectedToken;

	public ServiceTokenAuthFilter(@Value("${app.security.service-token}") String expectedToken) {
		this.expectedToken = expectedToken;
	}

	@Override
	protected void doFilterInternal(
			@NonNull HttpServletRequest request,
			@NonNull HttpServletResponse response,
			@NonNull FilterChain filterChain
	) throws ServletException, IOException {
		String header = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)) {
			String token = header.substring(7).trim();
			if (expectedToken.equals(token)) {
				var authentication = new UsernamePasswordAuthenticationToken(
						"service-client",
						null,
						List.of(new SimpleGrantedAuthority("ROLE_SERVICE"))
				);
				SecurityContextHolder.getContext().setAuthentication(authentication);
			}
		}
		filterChain.doFilter(request, response);
	}
}
