package com.reglens.ai_registry_service.repository;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import com.reglens.ai_registry_service.domain.AiSystem;

import jakarta.persistence.criteria.Predicate;

/**
 * Builds dynamic {@link Specification} predicates for the AI Registry list endpoint (filters on domain, risk, status,
 * type, and free-text search across ref/name/description).
 */
public final class AiSystemSpecifications {

	private AiSystemSpecifications() {
	}

	public static Specification<AiSystem> filtered(
			String businessDomain,
			String riskRating,
			String status,
			String aiType,
			String q
	) {
		return (root, query, cb) -> {
			/*
			 * SQL mental model (predicates below are AND-ed; `q` adds one OR group):
			 *
			 *   SELECT s.*
			 *   FROM ai_registry.ai_systems s
			 *   WHERE ... optional: lower(s.business_domain) = :domain
			 *         AND upper(s.risk_rating) = :risk
			 *         AND upper(s.status) = :status
			 *         AND upper(s.ai_type) = :aiType
			 *         AND ( lower(s.ref) LIKE :q OR lower(s.name) LIKE :q OR lower(s.description) LIKE :q )
			 *
			 * All filtered columns live on `ai_systems`; no join to catalogue tables for list filters.
			 */
			List<Predicate> predicates = new ArrayList<>();

			if (StringUtils.hasText(businessDomain)) {
				predicates.add(cb.equal(cb.lower(root.get("businessDomain")), businessDomain.trim().toLowerCase()));
			}
			if (StringUtils.hasText(riskRating)) {
				predicates.add(cb.equal(cb.upper(root.get("riskRating")), riskRating.trim().toUpperCase()));
			}
			if (StringUtils.hasText(status)) {
				predicates.add(cb.equal(cb.upper(root.get("status")), status.trim().toUpperCase()));
			}
			if (StringUtils.hasText(aiType)) {
				predicates.add(cb.equal(cb.upper(root.get("aiType")), aiType.trim().toUpperCase()));
			}
			if (StringUtils.hasText(q)) {
				String pattern = "%" + q.trim().toLowerCase() + "%";
				predicates.add(cb.or(
						cb.like(cb.lower(root.get("ref")), pattern),
						cb.like(cb.lower(root.get("name")), pattern),
						cb.like(cb.lower(root.get("description")), pattern)
				));
			}

			if (predicates.isEmpty()) {
				return cb.conjunction();
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}
}
