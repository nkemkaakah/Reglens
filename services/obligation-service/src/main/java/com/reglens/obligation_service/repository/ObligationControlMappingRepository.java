package com.reglens.obligation_service.repository;

import com.reglens.obligation_service.domain.ObligationControlMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ObligationControlMappingRepository extends JpaRepository<ObligationControlMapping, UUID> {

	List<ObligationControlMapping> findByObligation_Id(UUID obligationId);

	Optional<ObligationControlMapping> findByObligation_IdAndControlId(UUID obligationId, UUID controlId);
}
