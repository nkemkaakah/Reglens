package com.reglens.catalog_service.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Liveness probe for compose / load balancers — independent of catalogue tables. */
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
