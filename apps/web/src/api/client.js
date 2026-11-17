import { clearSession, getValidToken } from '../auth/session.js'

const OFFLINE_MESSAGE = 'Sem conexão. Verifique a internet e tente de novo.'

const BASE_URL = String(import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(
  /\/+$/,
  ''
)

function buildUrl(path) {
  const cleanPath = String(path ?? '').startsWith('/') ? path : `/${path}`
  return `${BASE_URL}${cleanPath}`
}

export async function request(path, options = {}) {
  const { method = 'GET', body, headers = {}, ...rest } = options
  const token = getValidToken()

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  let serializedBody = body
  if (body !== undefined && body !== null && typeof body !== 'string') {
    requestHeaders['Content-Type'] = 'application/json'
    serializedBody = JSON.stringify(body)
  } else if (typeof body === 'string' && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  let response
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: requestHeaders,
      body: serializedBody,
      ...rest,
    })
  } catch (err) {
    if (err instanceof TypeError) {
      throw new TypeError(OFFLINE_MESSAGE)
    }
    throw err
  }

  const rawText = await response.text()
  let data = null
  if (rawText) {
    try {
      data = JSON.parse(rawText)
    } catch {
      data = null
    }
  }

  if (response.status === 401 && path !== '/auth/login') {
    clearSession()
    if (window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Erro na requisição (${response.status})`)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}
