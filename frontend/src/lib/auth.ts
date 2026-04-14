export const AUTH_HEADER = 'Authorization'

// Shared JWT placeholder used until real auth service is integrated.
export const DEV_BEARER_TOKEN =
  'Bearer dev-reglens-jwt-replace-with-keycloak-or-cognito'

export function getAuthHeaders(): Record<string, string> {
  return {
    [AUTH_HEADER]: DEV_BEARER_TOKEN,
  }
}
