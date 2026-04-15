package com.reglens.obligation_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

/**
 * Boots the obligation API. {@link UserDetailsServiceAutoConfiguration} is excluded so we do not get
 * a random in-memory user/password alongside the bearer-token service client model.
 */
@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
public class ObligationServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ObligationServiceApplication.class, args);
	}

}
