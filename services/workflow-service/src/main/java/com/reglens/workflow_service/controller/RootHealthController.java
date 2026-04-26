package com.reglens.workflow_service.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class RootHealthController {

	private final String applicationName;

	public RootHealthController(@Value("${spring.application.name}") String applicationName) {
		this.applicationName = applicationName;
	}

	@GetMapping("/")
	public Map<String, String> root() {
		return Map.of("service", applicationName, "status", "UP");
	}
}
