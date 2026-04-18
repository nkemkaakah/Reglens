package com.reglens.obligation_service.config;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Maps FK violations (e.g. unknown control UUID) to HTTP 400 so mapping-service gets a clear signal
 * instead of a generic 500 when catalogue ids are wrong.
 */
@RestControllerAdvice
public class RestExceptionHandler {

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
		ProblemDetail detail = ProblemDetail.forStatusAndDetail(
				HttpStatus.BAD_REQUEST,
				"Data integrity violation — often an unknown control/system id or duplicate mapping."
		);
		detail.setTitle("Invalid mapping reference");
		return detail;
	}
}
