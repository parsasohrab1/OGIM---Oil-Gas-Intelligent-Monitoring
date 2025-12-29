import axios, { AxiosInstance, AxiosError } from 'axios'

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Suppress console errors for network issues (ERR_EMPTY_RESPONSE, ERR_NETWORK)
// This must run BEFORE any other code to catch all errors
if (typeof window !== 'undefined') {
  // Store original console methods immediately
  const originalConsoleError = console.error.bind(console)
  const originalConsoleWarn = console.warn.bind(console)
  const originalConsoleLog = console.log.bind(console)
  
  // Intercept all console methods before they can log
  const suppressNetworkError = (errorString: string, stackTrace: string = '') => {
    const fullErrorString = (errorString + ' ' + stackTrace).toLowerCase()
    // More aggressive pattern matching - check for any combination of network error indicators
    const hasNetworkError = fullErrorString.includes('erremptyresponse') || 
      fullErrorString.includes('errnetwork') || 
      fullErrorString.includes('net::erremptyresponse')
    
    const hasDigitalTwinEndpoint = fullErrorString.includes('digital-twin')
    const hasServicesTs = fullErrorString.includes('services.ts:382') || 
      fullErrorString.includes('services.ts:396') ||
      (fullErrorString.includes('services.ts:') && hasNetworkError)
    const hasWell3D = fullErrorString.includes('well3d.tsx:831') ||
      fullErrorString.includes('well3d.tsx:850') ||
      fullErrorString.includes('well3d.tsx:861') ||
      (fullErrorString.includes('well3d.tsx:') && hasNetworkError)
    const hasAxiosPatterns = fullErrorString.includes('dispatchxhrrequest') ||
      fullErrorString.includes('xhr') ||
      fullErrorString.includes('axios.js')
    const hasQueryPatterns = fullErrorString.includes('queryfn') ||
      fullErrorString.includes('fetchfn') ||
      fullErrorString.includes('getwells') ||
      fullErrorString.includes('getwelldata')
    
    // Suppress if it's a network error AND matches any of our known patterns
    if (hasNetworkError && (
      hasDigitalTwinEndpoint ||
      hasServicesTs ||
      hasWell3D ||
      hasAxiosPatterns ||
      hasQueryPatterns ||
      fullErrorString.includes('get http://localhost:8000/api/digital-twin') ||
      fullErrorString.includes('get http://localhost:8000/api/data-ingestion') ||
      fullErrorString.includes('get http://localhost:8000/api/data-variables') ||
      fullErrorString.includes('localhost:8000')
    )) {
      return true
    }
    
    // Also suppress if it has services.ts or well3d.tsx line numbers with localhost:8000
    if ((hasServicesTs || hasWell3D) && (
      fullErrorString.includes('localhost:8000') ||
      fullErrorString.includes('digital-twin') ||
      hasAxiosPatterns
    )) {
      return true
    }
    
    return false
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
    // Build comprehensive error string from all arguments
    const errorParts: string[] = []
    
    args.forEach(arg => {
      if (typeof arg === 'string') {
        errorParts.push(arg)
      } else if (arg?.toString) {
        errorParts.push(arg.toString())
      }
      if (arg?.stack) {
        errorParts.push(arg.stack)
      }
      if (arg?.message) {
        errorParts.push(arg.message)
      }
      if (arg?.code) {
        errorParts.push(`code:${arg.code}`)
      }
      if (arg instanceof Error) {
        errorParts.push(arg.stack || arg.message || arg.toString())
      }
      try {
        const jsonStr = JSON.stringify(arg)
        if (jsonStr && jsonStr !== '{}' && jsonStr !== '[]') {
          errorParts.push(jsonStr)
        }
      } catch {
        // Ignore JSON stringify errors
      }
    })
    
    const fullErrorString = errorParts.join(' ').toLowerCase()
    
    // Suppress network-related errors using the shared function
    if (suppressNetworkError(fullErrorString, fullErrorString)) {
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

