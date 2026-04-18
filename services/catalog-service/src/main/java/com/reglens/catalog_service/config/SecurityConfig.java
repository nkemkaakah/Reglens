package com.reglens.catalog_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Public reads for catalogue exploration; writes require the shared service bearer — Feature 3 until JWT resource server.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

	private final ServiceTokenAuthFilter serviceTokenAuthFilter;

	public SecurityConfig(ServiceTokenAuthFilter serviceTokenAuthFilter) {
		this.serviceTokenAuthFilter = serviceTokenAuthFilter;
	}

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
				.csrf(csrf -> csrf.disable())
				.sessionManagement(session ->
						session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.cors(cors -> {})
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(
								"/swagger-ui.html",
								"/swagger-ui/**",
								"/v3/api-docs/**"
						).permitAll()
						.requestMatchers("/actuator/**").permitAll()
						.requestMatchers(HttpMethod.GET, "/").permitAll()
						.requestMatchers(HttpMethod.GET, "/controls/**", "/systems/**").permitAll()
						.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
						.requestMatchers(HttpMethod.POST, "/controls", "/controls/**", "/systems", "/systems/**")
						.authenticated()
						.requestMatchers(HttpMethod.PUT, "/controls/**", "/systems/**")
						.authenticated()
						.anyRequest().denyAll()
				)
				.addFilterBefore(serviceTokenAuthFilter, UsernamePasswordAuthenticationFilter.class);
		return http.build();
	}
}
