package com.reglens.catalog_service.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.reglens.catalog_service.domain.ControlToSystem;
import com.reglens.catalog_service.domain.ControlToSystemId;

public interface ControlToSystemRepository extends JpaRepository<ControlToSystem, ControlToSystemId> {

	List<ControlToSystem> findByControlIdOrderBySystemId(UUID controlId);

	List<ControlToSystem> findBySystemIdOrderByControlId(UUID systemId);

	/** Join-fetch systems for control detail — avoids N+1 when mapping {@code linkedSystems}. */
	@Query("SELECT cts FROM ControlToSystem cts JOIN FETCH cts.system WHERE cts.controlId = :controlId ORDER BY cts.systemId")
	List<ControlToSystem> findByControlIdWithSystems(@Param("controlId") UUID controlId);

	/** Join-fetch controls for system detail — avoids N+1 for {@code linkedControls}. */
	@Query("SELECT cts FROM ControlToSystem cts JOIN FETCH cts.control WHERE cts.systemId = :systemId ORDER BY cts.controlId")
	List<ControlToSystem> findBySystemIdWithControls(@Param("systemId") UUID systemId);
}
