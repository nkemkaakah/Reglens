package com.reglens.ai_registry_service;

import org.springframework.boot.SpringApplication;

public class TestAiRegistryServiceApplication {

	public static void main(String[] args) {
		SpringApplication.from(AiRegistryServiceApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
