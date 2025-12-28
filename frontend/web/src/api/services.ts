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
  },
  
  createWorkOrder: async (alertId: string, erpType: string = 'sap') => {
    const response = await apiClient.post(`/api/alert/alerts/${alertId}/create-work-order`, null, {
      params: { erp_type: erpType }
    })
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
  },
  
  forecastTimeSeries: async (request: { sensor_id: string; historical_data: number[]; forecast_steps: number }) => {
    const response = await apiClient.post('/api/ml-inference/forecast', request)
    return response
  },
  
  trainLSTMModel: async (request: any) => {
    const response = await apiClient.post('/api/ml-inference/lstm/train', request)
    return response
  },
  
  getLSTMModels: async () => {
    const response = await apiClient.get('/api/ml-inference/lstm/models')
    return response
  }
}

// Storage Optimization API
export const storageAPI = {
  getStorageStats: async () => {
    const response = await apiClient.get('/api/storage-optimization/storage/stats')
    return response.data
  },
  getCompressionStatus: async (tableName: string) => {
    const response = await apiClient.get(`/api/storage-optimization/compression/status/${tableName}`)
    return response.data
  },
  enableCompression: async (request: any) => {
    const response = await apiClient.post('/api/storage-optimization/compression/enable', request)
    return response.data
  },
  compressNow: async (tableName: string, olderThanDays: number) => {
    const response = await apiClient.post('/api/storage-optimization/compression/compress-now', null, {
      params: { table_name: tableName, older_than_days: olderThanDays }
    })
    return response.data
  },
  getChunks: async (tableName: string, limit: number = 100) => {
    const response = await apiClient.get(`/api/storage-optimization/chunks/${tableName}`, {
      params: { limit }
    })
    return response.data
  },
  getClusterStatus: async () => {
    const response = await apiClient.get('/api/storage-optimization/cluster/status')
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

// DVR API
export const dvrAPI = {
  validate: async (sensorId: string, value: number, timestamp: string) => {
    const response = await apiClient.post('/api/dvr/validate', {
      sensor_id: sensorId,
      value,
      timestamp
    })
    return response.data
  },
  getQualityScores: async () => {
    const response = await apiClient.get('/api/dvr/quality')
    return response.data
  },
  getQualityScore: async (sensorId: string) => {
    const response = await apiClient.get(`/api/dvr/quality/${sensorId}`)
    return response.data
  },
  detectOutliers: async (sensorId: string, method: string = 'zscore') => {
    const response = await apiClient.post('/api/dvr/outliers/detect', {
      sensor_id: sensorId,
      window_size: 100,
      method
    })
    return response.data
  },
  reconcile: async (sensorIds: string[], startTime: string, endTime: string) => {
    const response = await apiClient.post('/api/dvr/reconcile', {
      sensor_ids: sensorIds,
      start_time: startTime,
      end_time: endTime,
      reconciliation_method: 'statistical'
    })
    return response.data
  }
}

// Remote Operations API
export const remoteOpsAPI = {
  adjustSetpoint: async (request: any) => {
    const response = await apiClient.post('/api/remote-operations/setpoint/adjust', request)
    return response.data
  },
  controlEquipment: async (request: any) => {
    const response = await apiClient.post('/api/remote-operations/equipment/control', request)
    return response.data
  },
  controlValve: async (request: any) => {
    const response = await apiClient.post('/api/remote-operations/valve/control', request)
    return response.data
  },
  emergencyShutdown: async (request: any) => {
    const response = await apiClient.post('/api/remote-operations/emergency/shutdown', request)
    return response.data
  },
  getOperationStatus: async (operationId: string) => {
    const response = await apiClient.get(`/api/remote-operations/operation/${operationId}/status`)
    return response.data
  }
}

// Data Variables API
export const dataVariablesAPI = {
  getVariables: async () => {
    const response = await apiClient.get('/api/data-variables')
    return response.data
  },
  getVariableData: async (variableName: string, params?: any) => {
    const response = await apiClient.get(`/api/data-variables/${variableName}/data`, { params })
    return response.data
  },
  getVariablesByCategory: async (category: string) => {
    const response = await apiClient.get(`/api/data-variables/category/${category}`)
    return response.data
  }
}

// Maintenance API
export const maintenanceAPI = {
  getRULPredictions: async () => {
    const response = await apiClient.get('/api/ml-inference/rul/predictions')
    return response.data
  },
  predictRUL: async (equipmentType: string, equipmentId: string, features: any) => {
    const response = await apiClient.post('/api/ml-inference/rul/predict', {
      equipment_type: equipmentType,
      equipment_id: equipmentId,
      features
    })
    return response.data
  },
  getMaintenanceSchedule: async () => {
    const response = await apiClient.get('/api/maintenance/schedule')
    return response.data
  },
  getSpareParts: async () => {
    const response = await apiClient.get('/api/maintenance/spare-parts')
    return response.data
  }
}

// SCADA API
export const scadaAPI = {
  getConnections: async () => {
    const response = await apiClient.get('/api/scada/connections')
    return response.data
  },
  connect: async (connectionId: string) => {
    const response = await apiClient.post(`/api/scada/connections/${connectionId}/connect`)
    return response.data
  },
  disconnect: async (connectionId: string) => {
    const response = await apiClient.post(`/api/scada/connections/${connectionId}/disconnect`)
    return response.data
  },
  getOPCUANodes: async () => {
    const response = await apiClient.get('/api/data-ingestion/opcua/nodes')
    return response.data
  }
}

// Well 3D API
export const well3DAPI = {
  getWellData: async (wellName: string) => {
    try {
      const response = await apiClient.get(`/api/digital-twin/well/${wellName}/3d`)
      return response.data
    } catch (error) {
      // Return mock data if API fails
      return null
    }
  },
  getWells: async () => {
    try {
      const response = await apiClient.get('/api/digital-twin/wells')
      return response.data
    } catch (error) {
      return ['PROD-001', 'PROD-002', 'INJ-001', 'OBS-001']
    }
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
  dvr: dvrAPI,
  remoteOps: remoteOpsAPI,
  dataVariables: dataVariablesAPI,
  maintenance: maintenanceAPI,
  scada: scadaAPI,
  storage: storageAPI,
}

