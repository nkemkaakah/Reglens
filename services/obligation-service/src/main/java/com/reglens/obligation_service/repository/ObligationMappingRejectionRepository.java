package com.reglens.obligation_service.repository;

import com.reglens.obligation_service.domain.ObligationMappingRejection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ObligationMappingRejectionRepository extends JpaRepository<ObligationMappingRejection, UUID> {
}
