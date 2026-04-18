package com.reglens.catalog_service.repository;

import com.reglens.catalog_service.domain.Control;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface ControlRepository extends JpaRepository<Control, UUID>, JpaSpecificationExecutor<Control> {

	Optional<Control> findByRefIgnoreCase(String ref);

	boolean existsByRefIgnoreCase(String ref);

	boolean existsByRefIgnoreCaseAndIdNot(String ref, UUID id);
}
