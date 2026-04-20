package com.reglens.impact_service;

import org.springframework.boot.SpringApplication;

public class TestImpactServiceApplication {

	public static void main(String[] args) {
		SpringApplication.from(ImpactServiceApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
