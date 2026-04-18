package com.reglens.catalog_service.repository;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import com.reglens.catalog_service.domain.CatalogSystem;

import jakarta.persistence.criteria.Predicate;

/**
 * Optional filters for the systems catalogue list (Feature 3).
 */
public final class CatalogSystemSpecifications {

	private CatalogSystemSpecifications() {
	}

	public static Specification<CatalogSystem> filtered(String domain, String criticality, String q) {
		return (root, query, cb) -> {
			/*
			 * SQL mental model (predicates below are AND-ed into the WHERE clause):
			 *
			 *   SELECT s.*
			 *   FROM systems s
			 *   WHERE ... optional filters on lower(s.domain), upper(s.criticality),
			 *         and (lower(s.ref) ILIKE :q OR lower(s.display_name) ILIKE :q OR lower(s.description) ILIKE :q)
			 *
			 * Entity field `displayName` maps to column `display_name`. No join here — filters are only on `systems`.
			 */
			List<Predicate> predicates = new ArrayList<>();

			if (StringUtils.hasText(domain)) {
				predicates.add(cb.equal(cb.lower(root.get("domain")), domain.trim().toLowerCase()));
			}
			if (StringUtils.hasText(criticality)) {
				predicates.add(cb.equal(cb.upper(root.get("criticality")), criticality.trim().toUpperCase()));
			}
			if (StringUtils.hasText(q)) {
				String pattern = "%" + q.trim().toLowerCase() + "%";
				predicates.add(cb.or(
						cb.like(cb.lower(root.get("ref")), pattern),
						cb.like(cb.lower(root.get("displayName")), pattern),
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
