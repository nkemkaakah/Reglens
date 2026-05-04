package com.reglens.impact_service.config;

import com.reglens.impact_service.util.DemoServiceJwt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Bearer value for server-to-server calls to obligation-service and catalog-service.
 * If {@code app.security.service-token} is set, it is used as the raw JWT; otherwise a demo JWT is built at startup.
 */
@Component
public class UpstreamAuthorizationHeader {

	private final String headerValue;

	public UpstreamAuthorizationHeader(
			@Value("${app.security.service-token:}") String serviceTokenOverride,
			@Value("${app.security.upstream-jwt-sub:impact-service}") String jwtSub,
			@Value("${app.security.upstream-jwt-role:ADMIN}") String jwtRole,
			@Value("${app.security.upstream-jwt-ttl-seconds:86400}") long jwtTtlSeconds
	) {
		String token = serviceTokenOverride != null && !serviceTokenOverride.isBlank()
				? serviceTokenOverride.trim()
				: DemoServiceJwt.build(jwtSub, jwtRole, jwtTtlSeconds);
		this.headerValue = "Bearer " + token;
	}

	public String value() {
		return headerValue;
	}
}
