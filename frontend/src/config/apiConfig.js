const DEFAULT_API_BASE_URL = 'http://localhost:5000/api'

function getApiBaseUrl(configuredUrl) {
  const value = configuredUrl?.trim() || DEFAULT_API_BASE_URL
  let url

  try {
    url = new URL(value)
  } catch {
    throw new Error(
      `Invalid VITE_API_BASE_URL "${value}". Set it to an absolute HTTP or HTTPS URL, such as ${DEFAULT_API_BASE_URL}.`,
    )
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `Invalid VITE_API_BASE_URL "${value}". Set it to an absolute HTTP or HTTPS URL without credentials, query, or fragment.`,
    )
  }

  return url.toString().replace(/\/+$/, '')
}

export const API_BASE_URL = getApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export const API_ENDPOINTS = Object.freeze({
  auth: `${API_BASE_URL}/auth`,
  documents: `${API_BASE_URL}/documents`,
  users: `${API_BASE_URL}/users`,
})

export function getApiUrl(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.trim()) {
    throw new Error('API endpoint must be a non-empty string.')
  }

  return `${API_BASE_URL}/${endpoint.trim().replace(/^\/+/, '')}`
}
