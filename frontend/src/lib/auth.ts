export const AUTH_HEADER = 'Authorization'
export const TOKEN_STORAGE_KEY = 'reglens_token'

export function getAuthHeaders(): Record<string, string> {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!token) {
    return {}
  }
  return {
    [AUTH_HEADER]: `Bearer ${token}`,
  }
}
