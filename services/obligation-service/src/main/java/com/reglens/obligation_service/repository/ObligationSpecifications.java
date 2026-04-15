package com.reglens.obligation_service.repository;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import com.reglens.obligation_service.domain.Document;
import com.reglens.obligation_service.domain.Obligation;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

/**
 * Builds a single {@link Specification} for paginated obligation search. Keeps all filter logic in one
 * place
 */
public final class ObligationSpecifications {

	private ObligationSpecifications() {
	}

	/**
	 * Composes optional predicates for the obligation explorer. Joins {@code document} so regulator
	 * filtering works without denormalising columns onto {@link Obligation}.
	 */
	public static Specification<Obligation> filtered(
			String status,
			String regulator,
			String riskRating,
			String topic,
			String aiPrinciple,
			String q
	) {
		return (root, query, cb) -> {
			/*
			 * SQL mental model (predicates below are AND-ed into the WHERE clause):
			 *
			 *   SELECT o.*
			 *   FROM obligations o
			 *   INNER JOIN documents d ON d.id = o.document_id
			 *   WHERE ... optional filters on o.status, d.regulator, o.risk_rating,
			 *         o.topics / o.ai_principles (via array_position), o.title / o.summary (ILIKE)
			 *
			 * The join keeps regulator on one query instead of loading documents lazily per row (N+1).
			 */
			Join<Obligation, Document> doc = root.join("document", JoinType.INNER);
			List<Predicate> predicates = new ArrayList<>();

			if (StringUtils.hasText(status)) {
				predicates.add(cb.equal(cb.upper(root.get("status")), status.trim().toUpperCase()));
			}
			if (StringUtils.hasText(regulator)) {
				predicates.add(cb.equal(cb.lower(doc.get("regulator")), regulator.trim().toLowerCase()));
			}
			if (StringUtils.hasText(riskRating)) {
				predicates.add(cb.equal(cb.upper(root.get("riskRating")), riskRating.trim().toUpperCase()));
			}
			if (StringUtils.hasText(topic)) {
				// PostgreSQL: array_position(text[], text) — null if element not present.
				var pos = cb.function(
						"array_position", 
						Integer.class, 
						root.get("topics"), 
						cb.literal(topic.trim())
				);
				predicates.add(cb.isNotNull(pos));
			}
			if (StringUtils.hasText(aiPrinciple)) {
				var pos = cb.function(
						"array_position",
						Integer.class,
						root.get("aiPrinciples"),
						cb.literal(aiPrinciple.trim())
				);
				predicates.add(cb.isNotNull(pos));
			}
			if (StringUtils.hasText(q)) {
				String pattern = "%" + q.trim().toLowerCase() + "%";
				predicates.add(cb.or(
						cb.like(cb.lower(root.get("title")), pattern),
						cb.like(cb.lower(root.get("summary")), pattern)
				));
			}

			if (predicates.isEmpty()) {
				return cb.conjunction();
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}
}
