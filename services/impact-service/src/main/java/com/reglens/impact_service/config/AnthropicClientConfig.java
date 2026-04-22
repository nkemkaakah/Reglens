package com.reglens.impact_service.config;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class AnthropicClientConfig {

	@Bean
	public AnthropicClient anthropicClient(
			@Value("${anthropic.api-key:}") String apiKeyFromProperty,
			@Value("${app.upstream.timeout-ms:60000}") long timeoutMs
	) {
		var builder = AnthropicOkHttpClient.builder()
				.fromEnv()
				.timeout(Duration.ofMillis(timeoutMs));
		String override = apiKeyFromProperty == null ? "" : apiKeyFromProperty.trim();
		if (!override.isEmpty()) {
			builder = builder.apiKey(override);
		}
		return builder.build();
	}
}
