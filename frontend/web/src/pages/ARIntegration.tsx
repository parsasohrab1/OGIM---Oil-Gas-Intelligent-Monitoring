import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './ARIntegration.css'

interface ARDevice {
  deviceId: string
  deviceType: 'HoloLens' | 'Magic Leap' | 'Tablet AR'
  user: string
  location: string
  wellName: string
  connectionStatus: 'connected' | 'disconnected'
  batteryLevel: number
  activeSession: boolean
  lastUpdate: string
}

interface ARSession {
  sessionId: string
  deviceId: string
  user: string
  wellName: string
  startTime: string
  duration: number // minutes
  componentsViewed: string[]
  annotationsCreated: number
  dataPointsAccessed: number
}

interface BIMComponent {
  componentId: string
  name: string
  type: 'pump' | 'valve' | 'sensor' | 'pipeline'
  location: string
  status: 'normal' | 'warning' | 'critical'
  realTimeData: {
    pressure?: number
    temperature?: number
    flowRate?: number
  }
}

export default function ARIntegration() {
  const [selectedDevice, setSelectedDevice] = useState<string>('AR-001')
  const [selectedWell, setSelectedWell] = useState<string>('PROD-001')

  // Mock data for AR devices
  const { data: arDevices = [] } = useQuery({
    queryKey: ['ar-devices'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return [
        {
          deviceId: 'AR-001',
          deviceType: 'HoloLens' as const,
          user: 'John Smith',
          location: 'Field A',
          wellName: 'PROD-001',
          connectionStatus: 'connected' as const,
          batteryLevel: 85,
          activeSession: true,
          lastUpdate: 'Just now'
        },
        {
          deviceId: 'AR-002',
          deviceType: 'Magic Leap' as const,
          user: 'Sarah Johnson',
          location: 'Field B',
          wellName: 'PROD-002',
          connectionStatus: 'connected' as const,
          batteryLevel: 72,
          activeSession: false,
          lastUpdate: '2 minutes ago'
        },
        {
          deviceId: 'AR-003',
          deviceType: 'Tablet AR' as const,
          user: 'Mike Davis',
          location: 'Field C',
          wellName: 'DEV-001',
          connectionStatus: 'disconnected' as const,
          batteryLevel: 0,
          activeSession: false,
          lastUpdate: '15 minutes ago'
        }
      ] as ARDevice[]
    },
    refetchInterval: 5000
  })

  // Mock data for active sessions
  const { data: activeSessions = [] } = useQuery({
    queryKey: ['ar-sessions'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return [
        {
          sessionId: 'SESSION-001',
          deviceId: 'AR-001',
          user: 'John Smith',
          wellName: 'PROD-001',
          startTime: '10:30 AM',
          duration: 25,
          componentsViewed: ['Pump-001', 'Valve-003', 'Sensor-005'],
          annotationsCreated: 3,
          dataPointsAccessed: 45
        }
      ] as ARSession[]
    },
    refetchInterval: 5000
  })

  // Mock data for BIM components
  const { data: bimComponents = [] } = useQuery({
    queryKey: ['bim-components', selectedWell],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return [
        {
          componentId: 'PUMP-001',
          name: 'Main Production Pump',
          type: 'pump' as const,
          location: 'Wellhead Platform',
          status: 'normal' as const,
          realTimeData: {
            pressure: 2500,
            temperature: 85,
            flowRate: 850
          }
        },
        {
          componentId: 'VALVE-003',
          name: 'Master Valve',
          type: 'valve' as const,
          location: 'Christmas Tree',
          status: 'warning' as const,
          realTimeData: {
            pressure: 2300
          }
        },
        {
          componentId: 'SENSOR-005',
          name: 'Pressure Sensor',
          type: 'sensor' as const,
          location: 'Tubing Head',
          status: 'normal' as const,
          realTimeData: {
            pressure: 2450,
            temperature: 82
          }
        },
        {
          componentId: 'PIPE-002',
          name: 'Production Pipeline',
          type: 'pipeline' as const,
          location: 'Flow Line',
          status: 'normal' as const,
          realTimeData: {
            flowRate: 850,
            temperature: 78
          }
        }
      ] as BIMComponent[]
    },
    refetchInterval: 3000
  })

  // Mock real-time data history
  const realTimeHistory = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    pressure: 2400 + Math.random() * 200,
    temperature: 80 + Math.random() * 10,
    flowRate: 800 + Math.random() * 100
  }))

  const selectedDeviceData = arDevices.find(d => d.deviceId === selectedDevice)

  return (
    <div className="ar-integration-page">
      <div className="page-header">
        <h1>AR Integration</h1>
        <p>3D BIM models connected to AR devices for field technicians</p>
      </div>

      <div className="ar-stats-grid">
        <div className="stat-card">
          <h3>Active AR Devices</h3>
          <div className="stat-value">{arDevices.filter(d => d.connectionStatus === 'connected').length}</div>
          <div className="stat-label">Total: {arDevices.length}</div>
        </div>
        <div className="stat-card">
          <h3>Active Sessions</h3>
          <div className="stat-value">{activeSessions.length}</div>
          <div className="stat-label">Technicians in field</div>
        </div>
        <div className="stat-card">
          <h3>Components Viewed</h3>
          <div className="stat-value">
            {activeSessions.reduce((sum, s) => sum + s.componentsViewed.length, 0)}
          </div>
          <div className="stat-label">In current sessions</div>
        </div>
        <div className="stat-card">
          <h3>Data Points Accessed</h3>
          <div className="stat-value">
            {activeSessions.reduce((sum, s) => sum + s.dataPointsAccessed, 0)}
          </div>
          <div className="stat-label">Real-time sensor data</div>
        </div>
      </div>

      <div className="ar-content-grid">
        <div className="devices-section">
          <h2>AR Devices</h2>
          <div className="devices-list">
            {arDevices.map(device => (
              <div
                key={device.deviceId}
                className={`device-card ${device.connectionStatus} ${selectedDevice === device.deviceId ? 'selected' : ''}`}
                onClick={() => setSelectedDevice(device.deviceId)}
              >
                <div className="device-header">
                  <span className="device-id">{device.deviceId}</span>
                  <span className={`connection-status ${device.connectionStatus}`}>
                    {device.connectionStatus}
                  </span>
                </div>
                <div className="device-info">
                  <p><strong>Type:</strong> {device.deviceType}</p>
                  <p><strong>User:</strong> {device.user}</p>
                  <p><strong>Location:</strong> {device.location}</p>
                  <p><strong>Well:</strong> {device.wellName}</p>
                  <p><strong>Battery:</strong> {device.batteryLevel}%</p>
                  <p><strong>Session:</strong> {device.activeSession ? 'Active' : 'Inactive'}</p>
                  <p><strong>Last Update:</strong> {device.lastUpdate}</p>
                </div>
                <div className="battery-indicator">
                  <div className="battery-bar">
                    <div 
                      className={`battery-fill ${device.batteryLevel > 50 ? 'high' : device.batteryLevel > 20 ? 'medium' : 'low'}`}
                      style={{ width: `${device.batteryLevel}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sessions-section">
          <h2>Active Sessions</h2>
          {activeSessions.length > 0 ? (
            <div className="sessions-list">
              {activeSessions.map(session => (
                <div key={session.sessionId} className="session-card">
                  <div className="session-header">
                    <h3>{session.user}</h3>
                    <span className="session-duration">{session.duration} min</span>
                  </div>
                  <div className="session-info">
                    <p><strong>Device:</strong> {session.deviceId}</p>
                    <p><strong>Well:</strong> {session.wellName}</p>
                    <p><strong>Started:</strong> {session.startTime}</p>
                    <p><strong>Components Viewed:</strong> {session.componentsViewed.length}</p>
                    <p><strong>Annotations:</strong> {session.annotationsCreated}</p>
                    <p><strong>Data Points:</strong> {session.dataPointsAccessed}</p>
                  </div>
                  <div className="components-list">
                    <strong>Components:</strong>
                    <div className="components-tags">
                      {session.componentsViewed.map(comp => (
                        <span key={comp} className="component-tag">{comp}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-sessions">
              <p>No active AR sessions</p>
            </div>
          )}
        </div>
      </div>

      <div className="bim-components-section">
        <h2>3D BIM Components - {selectedWell}</h2>
        <div className="well-selector">
          <select value={selectedWell} onChange={(e) => setSelectedWell(e.target.value)}>
            <option value="PROD-001">PROD-001</option>
            <option value="PROD-002">PROD-002</option>
            <option value="DEV-001">DEV-001</option>
            <option value="OBS-001">OBS-001</option>
          </select>
        </div>
        <div className="components-grid">
          {bimComponents.map(component => (
            <div key={component.componentId} className={`component-card ${component.status}`}>
              <div className="component-header">
                <h3>{component.name}</h3>
                <span className={`status-badge ${component.status}`}>{component.status}</span>
              </div>
              <div className="component-info">
                <p><strong>ID:</strong> {component.componentId}</p>
                <p><strong>Type:</strong> {component.type}</p>
                <p><strong>Location:</strong> {component.location}</p>
              </div>
              <div className="realtime-data">
                <h4>Real-Time Data (Visible in AR)</h4>
                {component.realTimeData.pressure && (
                  <p>Pressure: <strong>{component.realTimeData.pressure} psi</strong></p>
                )}
                {component.realTimeData.temperature && (
                  <p>Temperature: <strong>{component.realTimeData.temperature} °C</strong></p>
                )}
                {component.realTimeData.flowRate && (
                  <p>Flow Rate: <strong>{component.realTimeData.flowRate} bbl/day</strong></p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="realtime-chart-section">
        <h2>Real-Time Sensor Data (AR Overlay)</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={realTimeHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="pressure" stroke="#e74c3c" name="Pressure (psi)" />
              <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#f39c12" name="Temperature (°C)" />
              <Line yAxisId="right" type="monotone" dataKey="flowRate" stroke="#3498db" name="Flow Rate (bbl/day)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

