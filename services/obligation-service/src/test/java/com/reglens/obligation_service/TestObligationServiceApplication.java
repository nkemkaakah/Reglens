package com.reglens.obligation_service;

import org.springframework.boot.SpringApplication;

public class TestObligationServiceApplication {

	public static void main(String[] args) {
		SpringApplication.from(ObligationServiceApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
