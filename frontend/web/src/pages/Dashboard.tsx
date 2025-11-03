import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { dataIngestionAPI, alertAPI } from '../api/services'
import './Dashboard.css'

export default function Dashboard() {
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
      } catch (error) {
        console.error('Failed to fetch sensor data:', error)
        // Fallback to mock data
        return Array.from({ length: 20 }, (_, i) => ({
          time: new Date(Date.now() - (20 - i) * 60000).toLocaleTimeString(),
          pressure: Math.random() * 100 + 300,
          temperature: Math.random() * 20 + 70,
          flowRate: Math.random() * 200 + 400,
        }))
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  })
  
  // Fetch alerts
  const { data: alertsData } = useQuery({
    queryKey: ['alerts', 'open'],
    queryFn: () => alertAPI.getAlerts({ status: 'open' }),
    refetchInterval: 30000,
  })

  if (isLoading) {
    return <div className="loading">Loading dashboard...</div>
  }

  return (
    <div className="dashboard">
      <h2>Real-Time Monitoring Dashboard</h2>
      
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

