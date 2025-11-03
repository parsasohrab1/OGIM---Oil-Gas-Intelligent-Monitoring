import apiClient from './client'

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    
    const response = await apiClient.post('/api/auth/token', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
  
  getCurrentUser: async () => {
    const response = await apiClient.get('/api/auth/users/me')
    return response.data
  },
  
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
}

// Data Ingestion API
export const dataIngestionAPI = {
  getSensorData: async (params?: { limit?: number; well_name?: string }) => {
    const response = await apiClient.get('/api/data-ingestion/sensor-data', { params })
    return response.data
  },
  
  getConnectors: async () => {
    const response = await apiClient.get('/api/data-ingestion/connectors')
    return response.data
  }
}

// Alert API
export const alertAPI = {
  getAlerts: async (params?: { well_name?: string; status?: string; severity?: string }) => {
    const response = await apiClient.get('/api/alert/alerts', { params })
    return response.data
  },
  
  acknowledgeAlert: async (alertId: string, acknowledgedBy: string) => {
    const response = await apiClient.post(`/api/alert/alerts/${alertId}/acknowledge`, {
      acknowledged_by: acknowledgedBy
    })
    return response.data
  },
  
  resolveAlert: async (alertId: string) => {
    const response = await apiClient.post(`/api/alert/alerts/${alertId}/resolve`)
    return response.data
  },
  
  getAlertRules: async () => {
    const response = await apiClient.get('/api/alert/rules')
    return response.data
  }
}

// Tag Catalog API
export const tagCatalogAPI = {
  getTags: async (params?: { well_name?: string; status?: string }) => {
    const response = await apiClient.get('/api/tag-catalog/tags', { params })
    return response.data
  },
  
  getTag: async (tagId: string) => {
    const response = await apiClient.get(`/api/tag-catalog/tags/${tagId}`)
    return response.data
  },
  
  createTag: async (tag: any) => {
    const response = await apiClient.post('/api/tag-catalog/tags', tag)
    return response.data
  },
  
  updateTag: async (tagId: string, tag: any) => {
    const response = await apiClient.put(`/api/tag-catalog/tags/${tagId}`, tag)
    return response.data
  }
}

// Command Control API
export const commandAPI = {
  getCommands: async (params?: { well_name?: string; status?: string }) => {
    const response = await apiClient.get('/api/command-control/commands', { params })
    return response.data
  },
  
  createCommand: async (command: any) => {
    const response = await apiClient.post('/api/command-control/commands', command)
    return response.data
  },
  
  approveCommand: async (commandId: string, approvedBy: string) => {
    const response = await apiClient.post(
      `/api/command-control/commands/${commandId}/approve`,
      { approved_by: approvedBy }
    )
    return response.data
  },
  
  executeCommand: async (commandId: string) => {
    const response = await apiClient.post(`/api/command-control/commands/${commandId}/execute`)
    return response.data
  }
}

// Reporting API
export const reportingAPI = {
  getReports: async (params?: { well_name?: string; limit?: number }) => {
    const response = await apiClient.get('/api/reporting/reports', { params })
    return response.data
  },
  
  generateReport: async (reportRequest: any) => {
    const response = await apiClient.post('/api/reporting/reports/generate', reportRequest)
    return response.data
  },
  
  getReport: async (reportId: string) => {
    const response = await apiClient.get(`/api/reporting/reports/${reportId}`)
    return response.data
  }
}

// ML Inference API
export const mlAPI = {
  getModels: async () => {
    const response = await apiClient.get('/api/ml-inference/models')
    return response.data
  },
  
  runInference: async (inferenceRequest: any) => {
    const response = await apiClient.post('/api/ml-inference/infer', inferenceRequest)
    return response.data
  }
}

// Digital Twin API
export const digitalTwinAPI = {
  runSimulation: async (simulationRequest: any) => {
    const response = await apiClient.post('/api/digital-twin/simulate', simulationRequest)
    return response.data
  },
  
  getSimulations: async (params?: { well_name?: string }) => {
    const response = await apiClient.get('/api/digital-twin/simulations', { params })
    return response.data
  }
}

export default {
  auth: authAPI,
  dataIngestion: dataIngestionAPI,
  alerts: alertAPI,
  tags: tagCatalogAPI,
  commands: commandAPI,
  reports: reportingAPI,
  ml: mlAPI,
  digitalTwin: digitalTwinAPI,
}

