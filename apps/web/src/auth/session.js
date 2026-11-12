const TOKEN_KEY = 'accessToken'
const EXPIRES_AT_KEY = 'expiresAt'

export function saveSession(accessToken, expiresInSeconds) {
  const expiresAt = Date.now() + Number(expiresInSeconds) * 1000
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRES_AT_KEY)
}

export function getValidToken() {
  const token = localStorage.getItem(TOKEN_KEY)
  const expiresAtRaw = localStorage.getItem(EXPIRES_AT_KEY)

  if (!token || !expiresAtRaw) {
    return null
  }

  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    clearSession()
    return null
  }

  return token
}

export function isSessionValid() {
  return getValidToken() !== null
}
