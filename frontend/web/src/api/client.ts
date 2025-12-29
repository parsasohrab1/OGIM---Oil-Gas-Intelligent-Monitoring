import axios, { AxiosInstance, AxiosError } from 'axios'

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Suppress console errors for network issues (ERR_EMPTY_RESPONSE, ERR_NETWORK)
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  
  // Also catch unhandled promise rejections for network errors
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    const errorString = error?.toString() || error?.message || JSON.stringify(error) || ''
    const stackTrace = error?.stack || ''
    const fullErrorString = errorString + ' ' + stackTrace
    
    // Suppress network-related promise rejections
    if (fullErrorString.includes('ERR_EMPTY_RESPONSE') || 
        fullErrorString.includes('ERR_NETWORK') || 
        fullErrorString.includes('net::ERR_EMPTY_RESPONSE') ||
        fullErrorString.includes('GET http://localhost:8000/api/digital-twin') ||
        fullErrorString.includes('GET http://localhost:8000/api/data-ingestion')) {
      event.preventDefault() // Prevent default error handling
      return
    }
  })
  
  // Override console.error to filter network errors
  console.error = (...args: any[]) => {
    // Check all arguments and stack trace for network-related error messages
    const errorString = args.map(arg => {
      if (typeof arg === 'string') return arg
      if (arg?.toString) return arg.toString()
      if (arg?.stack) return arg.stack
      if (arg?.message) return arg.message
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    }).join(' ')
    
    // Get stack trace from Error object if available
    const stackTrace = args.find(arg => arg?.stack)?.stack || ''
    const fullErrorString = errorString + ' ' + stackTrace
    
    // Suppress network-related errors
    // Check for various patterns of network errors
    const isNetworkError = 
      fullErrorString.includes('ERR_EMPTY_RESPONSE') || 
      fullErrorString.includes('ERR_NETWORK') || 
      fullErrorString.includes('net::ERR_EMPTY_RESPONSE') ||
      fullErrorString.includes('GET http://localhost:8000/api/digital-twin') ||
      fullErrorString.includes('GET http://localhost:8000/api/data-ingestion') ||
      (fullErrorString.includes('services.ts:') && (fullErrorString.includes('ERR_EMPTY_RESPONSE') || fullErrorString.includes('net::ERR_EMPTY_RESPONSE') || fullErrorString.includes('GET http://localhost:8000'))) ||
      (fullErrorString.includes('dispatchXhrRequest') && (fullErrorString.includes('ERR_EMPTY_RESPONSE') || fullErrorString.includes('net::ERR_EMPTY_RESPONSE'))) ||
      (fullErrorString.includes('xhr') && (fullErrorString.includes('ERR_EMPTY_RESPONSE') || fullErrorString.includes('net::ERR_EMPTY_RESPONSE'))) ||
      (fullErrorString.includes('axios.js') && (fullErrorString.includes('ERR_EMPTY_RESPONSE') || fullErrorString.includes('net::ERR_EMPTY_RESPONSE')))
    
    if (isNetworkError) {
      // Silently ignore network errors - services may not be running
      return
    }
    // Log other errors normally
    originalConsoleError.apply(console, args)
  }
  
  // Also override console.warn for network warnings
  console.warn = (...args: any[]) => {
    const errorString = args.map(arg => {
      if (typeof arg === 'string') return arg
      if (arg?.toString) return arg.toString()
      if (arg?.stack) return arg.stack
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    }).join(' ')
    
    // Suppress network-related warnings
    if (errorString.includes('ERR_EMPTY_RESPONSE') || 
        errorString.includes('ERR_NETWORK') || 
        errorString.includes('net::ERR_EMPTY_RESPONSE')) {
      return
    }
    originalConsoleWarn.apply(console, args)
  }
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add correlation ID for tracing
    config.headers['X-Correlation-ID'] = generateCorrelationId()
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Silently handle network errors - services may not be running
    if (error.code === 'ERR_NETWORK' || error.code === 'ERR_EMPTY_RESPONSE' || error.message?.includes('Failed to fetch')) {
      // Don't log network errors - they're expected when services are not running
      // Return a rejected promise with a custom error that can be handled
      const networkError = {
        ...error,
        isNetworkError: true,
        message: 'Service unavailable',
        code: error.code || 'ERR_EMPTY_RESPONSE'
      }
      return Promise.reject(networkError)
    }

    if (error.response?.status === 401) {
      // Token expired, try to refresh
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken
          })
          
          const { access_token, refresh_token: newRefreshToken } = response.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', newRefreshToken)
          
          // Retry original request
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${access_token}`
            return apiClient.request(error.config)
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      } else {
        // No refresh token, redirect to login
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// Helper function to generate correlation ID
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export default apiClient

