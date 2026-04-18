package com.reglens.catalog_service.repository;

import com.reglens.catalog_service.domain.CatalogSystem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface CatalogSystemRepository extends JpaRepository<CatalogSystem, UUID>, JpaSpecificationExecutor<CatalogSystem> {

	Optional<CatalogSystem> findByRefIgnoreCase(String ref);

	boolean existsByRefIgnoreCase(String ref);

	boolean existsByRefIgnoreCaseAndIdNot(String ref, UUID id);
}
