import axios, { AxiosInstance, AxiosError } from 'axios'

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Suppress console errors for network issues (ERR_EMPTY_RESPONSE, ERR_NETWORK)
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  const originalConsoleLog = console.log
  
  // Intercept all console methods before they can log
  const suppressNetworkError = (errorString: string, stackTrace: string = '') => {
    const fullErrorString = (errorString + ' ' + stackTrace).toLowerCase()
    return (
      fullErrorString.includes('erremptyresponse') || 
      fullErrorString.includes('errnetwork') || 
      fullErrorString.includes('net::erremptyresponse') ||
      fullErrorString.includes('get http://localhost:8000/api/digital-twin') ||
      fullErrorString.includes('get http://localhost:8000/api/data-ingestion') ||
      fullErrorString.includes('get http://localhost:8000/api/data-variables') ||
      fullErrorString.includes('services.ts:382') ||
      fullErrorString.includes('services.ts:396') ||
      (fullErrorString.includes('services.ts:') && (fullErrorString.includes('erremptyresponse') || fullErrorString.includes('net::erremptyresponse'))) ||
      (fullErrorString.includes('getwells') && fullErrorString.includes('erremptyresponse')) ||
      (fullErrorString.includes('getwelldata') && fullErrorString.includes('erremptyresponse')) ||
      (fullErrorString.includes('dispatchxhrrequest') && fullErrorString.includes('erremptyresponse')) ||
      (fullErrorString.includes('xhr') && fullErrorString.includes('erremptyresponse')) ||
      (fullErrorString.includes('axios.js') && fullErrorString.includes('erremptyresponse'))
    )
  }
  
  // Also catch unhandled promise rejections for network errors
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    const errorString = error?.toString() || error?.message || JSON.stringify(error) || ''
    const stackTrace = error?.stack || ''
    
    if (suppressNetworkError(errorString, stackTrace)) {
      event.preventDefault() // Prevent default error handling
      return
    }
  })
  
  // Override console.log to filter network errors (axios sometimes uses console.log)
  console.log = (...args: any[]) => {
    const errorString = args.map(arg => {
      if (typeof arg === 'string') return arg
      if (arg?.toString) return arg.toString()
      if (arg?.stack) return arg.stack
      return JSON.stringify(arg)
    }).join(' ')
    
    const stackTrace = args.find(arg => arg?.stack)?.stack || ''
    
    if (suppressNetworkError(errorString, stackTrace)) {
      return
    }
    originalConsoleLog.apply(console, args)
  }
  
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
    // Also check if any argument is an Error object with stack
    const errorStack = args.find(arg => arg instanceof Error)?.stack || ''
    const fullErrorString = errorString + ' ' + stackTrace + ' ' + errorStack
    
    // Suppress network-related errors using the shared function
    if (suppressNetworkError(errorString, fullErrorString)) {
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
    
    const stackTrace = args.find(arg => arg?.stack)?.stack || ''
    
    // Suppress network-related warnings using the shared function
    if (suppressNetworkError(errorString, stackTrace)) {
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

