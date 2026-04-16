package com.reglens.obligation_service.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@Tag(name = "Health")
public class RootHealthController {

	private final String applicationName;

	public RootHealthController(@Value("${spring.application.name}") String applicationName) {
		this.applicationName = applicationName;
	}

	@GetMapping("/")
	@Operation(summary = "Service name and liveness status")
	public Map<String, String> root() {
		return Map.of("service", applicationName, "status", "UP");
	}
}
