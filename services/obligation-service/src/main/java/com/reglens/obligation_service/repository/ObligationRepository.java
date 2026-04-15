package com.reglens.obligation_service.repository;

import com.reglens.obligation_service.domain.Obligation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ObligationRepository extends JpaRepository<Obligation, UUID> {

	List<Obligation> findByDocument_Id(UUID documentId);

	Page<Obligation> findByStatus(String status, Pageable pageable);
}
