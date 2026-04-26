package com.reglens.ai_registry_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(classes = AiRegistryServiceApplication.class)
@Import(TestcontainersConfiguration.class)
class AiRegistryServiceApplicationTests {

	@Test
	void contextLoads() {
	}
}
