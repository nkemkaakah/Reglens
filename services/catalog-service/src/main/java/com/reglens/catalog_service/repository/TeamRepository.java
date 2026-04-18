package com.reglens.catalog_service.repository;

import com.reglens.catalog_service.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TeamRepository extends JpaRepository<Team, UUID> {
}
