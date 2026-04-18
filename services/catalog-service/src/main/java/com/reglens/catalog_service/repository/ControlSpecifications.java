package com.reglens.catalog_service.repository;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import com.reglens.catalog_service.domain.Control;

import jakarta.persistence.criteria.Predicate;

/**
 * Optional filters for the controls catalogue list (Feature 3 explorer / admin tables).
 */
public final class ControlSpecifications {

	private ControlSpecifications() {
	}

	public static Specification<Control> filtered(String category, String status, String q) {
		return (root, query, cb) -> {
			/*
			 * SQL mental model (predicates below are AND-ed into the WHERE clause):
			 *
			 *   SELECT c.*
			 *   FROM controls c
			 *   WHERE ... optional filters on lower(c.category), upper(c.status),
			 *         and (lower(c.ref) ILIKE :q OR lower(c.title) ILIKE :q OR lower(c.description) ILIKE :q)
			 *
			 * All columns live on `controls`; no join is required for these list filters (unlike obligations + documents).
			 */
			List<Predicate> predicates = new ArrayList<>();

			if (StringUtils.hasText(category)) {
				predicates.add(cb.equal(cb.lower(root.get("category")), category.trim().toLowerCase()));
			}
			if (StringUtils.hasText(status)) {
				predicates.add(cb.equal(cb.upper(root.get("status")), status.trim().toUpperCase()));
			}
			if (StringUtils.hasText(q)) {
				String pattern = "%" + q.trim().toLowerCase() + "%";
				predicates.add(cb.or(
						cb.like(cb.lower(root.get("ref")), pattern),
						cb.like(cb.lower(root.get("title")), pattern),
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
