package com.reglens.impact_service.config;

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
 * authenticated writes using the
 * {@link ServiceTokenAuthFilter} bearer secret. Stateless session policy matches typical API usage.
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
								"/v3/api-docs/**",
								"/error",
								"/error/**"
						).permitAll()
						.requestMatchers(HttpMethod.GET, "/").permitAll()
						.requestMatchers(HttpMethod.GET, "/impacts").permitAll()
						.requestMatchers(HttpMethod.GET, "/obligations/*/impact").permitAll()
						.requestMatchers(HttpMethod.GET, "/obligations/**", "/documents/**").permitAll()
						.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
						.requestMatchers(HttpMethod.POST, "/documents", "/documents/**", "/obligations", "/obligations/**")
						.authenticated()
						.anyRequest().denyAll()
				)
				.addFilterBefore(serviceTokenAuthFilter, UsernamePasswordAuthenticationFilter.class);
		return http.build();
	}
}
