package com.reglens.obligation_service.repository;

import com.reglens.obligation_service.domain.ObligationSystemMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ObligationSystemMappingRepository extends JpaRepository<ObligationSystemMapping, UUID> {

	List<ObligationSystemMapping> findByObligation_Id(UUID obligationId);

	Optional<ObligationSystemMapping> findByObligation_IdAndSystemId(UUID obligationId, UUID systemId);
}
