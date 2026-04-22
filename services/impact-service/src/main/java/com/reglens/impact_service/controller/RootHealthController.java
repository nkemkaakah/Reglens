package com.reglens.impact_service.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class RootHealthController {

	@GetMapping("/")
	public ResponseEntity<Map<String, String>> root() {
		return ResponseEntity.ok(Map.of("service", "impact-service", "status", "ok"));
	}
}
