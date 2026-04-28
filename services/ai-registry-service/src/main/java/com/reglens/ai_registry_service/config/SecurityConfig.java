package com.reglens.ai_registry_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Stateless API security: public reads for the governance UI; writes (including Mongo document uploads) require the
 * shared service bearer — mirrors catalog-service until a JWT resource server is introduced.
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
				.cors(AbstractHttpConfigurer::disable)
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(
								"/swagger-ui.html",
								"/swagger-ui/**",
								"/v3/api-docs/**"
						).permitAll()
						.requestMatchers("/actuator/**").permitAll()
						.requestMatchers(HttpMethod.GET, "/").permitAll()
						.requestMatchers(HttpMethod.GET, "/ai-systems", "/ai-systems/**").permitAll()
						.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
						.requestMatchers(HttpMethod.POST, "/ai-systems", "/ai-systems/**").authenticated()
						.requestMatchers(HttpMethod.PUT, "/ai-systems/**").authenticated()
						.anyRequest().denyAll()
				)
				.addFilterBefore(serviceTokenAuthFilter, UsernamePasswordAuthenticationFilter.class);
		return http.build();
	}
}
