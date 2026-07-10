/** Shared API base URL — uses Vite proxy in dev when VITE_API_BASE_URL is unset. */
export function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')
  }
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:8000'
}

export function toWebSocketBaseUrl(httpBaseUrl: string): string {
  const url = new URL(httpBaseUrl)
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${url.host}`
}
