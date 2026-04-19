export const AUTH_HEADER = 'Authorization'

/** Raw secret; must match local stack `APP_SECURITY_SERVICE_TOKEN` / `OBLIGATION_SERVICE_TOKEN`. */
const DEFAULT_SERVICE_TOKEN = 'dev-service-token-change-me'

export function getAuthHeaders(): Record<string, string> {
  const token =
    import.meta.env.VITE_REGLENS_SERVICE_TOKEN ?? DEFAULT_SERVICE_TOKEN
  return {
    [AUTH_HEADER]: `Bearer ${token}`,
  }
}
