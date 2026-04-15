package com.reglens.obligation_service.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Dev-oriented bearer gate for write paths. Compares {@code Authorization: Bearer …} to a shared
 * secret configured in {@code app.security.service-token}. When it matches, installs an authenticated
 * principal so Spring Security's {@code authenticated()} rule passes — a stand-in until a real JWT
 * resource server (JWKS) is wired in.
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
