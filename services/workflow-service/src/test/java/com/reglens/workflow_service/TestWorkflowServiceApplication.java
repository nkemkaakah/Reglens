package com.reglens.workflow_service;

import org.springframework.boot.SpringApplication;

public class TestWorkflowServiceApplication {

	public static void main(String[] args) {
		SpringApplication.from(WorkflowServiceApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
