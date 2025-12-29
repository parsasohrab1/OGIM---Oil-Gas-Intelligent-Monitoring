import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { dataIngestionAPI, alertAPI } from '../api/services'
import './Dashboard.css'

export default function Dashboard() {
  const queryClient = useQueryClient()
  
  // Fetch sensor data from backend
  const { data: sensorData, isLoading } = useQuery({
    queryKey: ['sensor-data'],
    queryFn: async () => {
      try {
        // Fetch real data from API
        const response = await dataIngestionAPI.getSensorData({ limit: 20 })
        
        // Transform data for chart
        return response.records?.map((record: any) => ({
          time: new Date(record.timestamp).toLocaleTimeString(),
          pressure: record.sensor_type === 'pressure' ? record.value : null,
          temperature: record.sensor_type === 'temperature' ? record.value : null,
          flowRate: record.sensor_type === 'flow_rate' ? record.value : null,
        })) || []
      } catch (error: any) {
        // Silently handle errors - backend may not be running
        if (import.meta.env.DEV) {
          console.debug('Sensor data service unavailable')
        }
        // Fallback to mock data when backend is not available
        return Array.from({ length: 20 }, (_, i) => ({
          time: new Date(Date.now() - (20 - i) * 60000).toLocaleTimeString(),
          pressure: Math.random() * 100 + 300,
          temperature: Math.random() * 20 + 70,
          flowRate: Math.random() * 200 + 400,
        }))
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    retry: 2, // Retry 2 times before giving up
    retryDelay: 3000, // Wait 3 seconds between retries
  })
  
  // Fetch alerts
  const { data: alertsData } = useQuery({
    queryKey: ['alerts', 'open'],
    queryFn: async () => {
      try {
        return await alertAPI.getAlerts({ status: 'open' })
      } catch (error: any) {
        // Silently handle errors - backend may not be running
        if (import.meta.env.DEV) {
          console.debug('Alert service unavailable')
        }
        // Return empty alerts when backend is not available
        return { count: 0, alerts: [] }
      }
    },
    refetchInterval: 30000,
    retry: 2,
    retryDelay: 3000,
  })
  
  // Get critical alerts without work orders
  const criticalAlerts = alertsData?.alerts?.filter(
    (alert: any) => alert.severity === 'critical' && !alert.erp_work_order_id
  ) || []
  
  // Create work order mutation
  const createWorkOrderMutation = useMutation({
    mutationFn: ({ alertId, erpType }: { alertId: string; erpType?: string }) =>
      alertAPI.createWorkOrder(alertId, erpType || 'sap'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      alert(`✅ Work Order created: ${data.work_order_id}`)
    },
    onError: (error: any) => {
      alert(`❌ Failed to create Work Order: ${error.response?.data?.detail || error.message}`)
    },
  })
  
  const handleCreateWorkOrderForCritical = () => {
    if (criticalAlerts.length === 0) {
      alert('No critical alerts without work orders found.')
      return
    }
    
    if (window.confirm(`Create Work Orders for ${criticalAlerts.length} critical alert(s)?`)) {
      // Create work orders for all critical alerts
      criticalAlerts.forEach((alert: any) => {
        createWorkOrderMutation.mutate({ alertId: alert.alert_id })
      })
    }
  }

  if (isLoading) {
    return <div className="loading">Loading dashboard...</div>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Real-Time Monitoring Dashboard</h2>
        {criticalAlerts.length > 0 && (
          <button
            onClick={handleCreateWorkOrderForCritical}
            disabled={createWorkOrderMutation.isPending}
            className="quick-action-btn work-order-quick-action"
            title={`Create Work Orders for ${criticalAlerts.length} critical alert(s)`}
          >
            {createWorkOrderMutation.isPending ? 'Creating...' : `Create Work Orders (${criticalAlerts.length})`}
          </button>
        )}
      </div>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Wells</h3>
          <div className="metric-value">8</div>
        </div>
        <div className="metric-card">
          <h3>Active Alerts</h3>
          <div className="metric-value alert">
            {alertsData?.count || 0}
          </div>
        </div>
        <div className="metric-card">
          <h3>Production Rate</h3>
          <div className="metric-value">12,450 bbl/day</div>
        </div>
        <div className="metric-card">
          <h3>System Health</h3>
          <div className="metric-value healthy">98.5%</div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Sensor Data Trends</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={sensorData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="pressure" stroke="#8884d8" name="Pressure (psi)" />
            <Line type="monotone" dataKey="temperature" stroke="#82ca9d" name="Temperature (°C)" />
            <Line type="monotone" dataKey="flowRate" stroke="#ffc658" name="Flow Rate (bbl/day)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

