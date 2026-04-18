package com.reglens.catalog_service.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS for the future Controls/Systems SPA pages — mirrors obligation-service origins until a gateway fronts all APIs.
 */
@Configuration
public class WebConfig {

	@Value("${app.cors.allowed-origins}")
	private String allowedOrigins;

	@Bean
	public WebMvcConfigurer corsConfigurer() {
		String[] origins = Arrays.stream(allowedOrigins.split(","))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.toArray(String[]::new);

		return new WebMvcConfigurer() {
			@Override
			public void addCorsMappings(CorsRegistry registry) {
				registry.addMapping("/**")
						.allowedOrigins(origins)
						.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
						.allowedHeaders("*")
						.allowCredentials(false);
			}
		};
	}
}
