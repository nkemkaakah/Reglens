package com.reglens.impact_service.controller;

import com.reglens.impact_service.dto.ImpactResponse;
import com.reglens.impact_service.service.ImpactService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class ImpactController {

	private final ImpactService impactService;

	public ImpactController(ImpactService impactService) {
		this.impactService = impactService;
	}

	@GetMapping("/obligations/{id}/impact")
	public ImpactResponse getImpact(@PathVariable("id") UUID obligationId) {
		return impactService.getImpact(obligationId);
	}
}
