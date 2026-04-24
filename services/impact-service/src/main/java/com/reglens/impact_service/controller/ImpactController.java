package com.reglens.impact_service.controller;

import com.reglens.impact_service.dto.ImpactIndexRow;
import com.reglens.impact_service.dto.ImpactResponse;
import com.reglens.impact_service.service.ImpactService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
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

	/**
	 * Cross-obligation impact inventory for dashboards; list shows obligation id + summary only.
	 */
	@GetMapping("/impacts")
	public Page<ImpactIndexRow> listImpacts(
			@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
			Pageable pageable
	) {
		return impactService.listImpactIndex(pageable);
	}

	@GetMapping("/obligations/{id}/impact")
	public ImpactResponse getImpact(@PathVariable("id") UUID obligationId) {
		return impactService.getImpact(obligationId);
	}
}
