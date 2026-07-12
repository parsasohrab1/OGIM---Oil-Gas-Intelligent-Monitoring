import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { dataIngestionAPI, well3DAPI, alertAPI, tagCatalogAPI } from '../api/services'
import ErrorState from '../components/ErrorState'
import './Wells.css'

interface WellData {
  well_name: string
  pressure: number | null
  temperature: number | null
  flowRate: number | null
  waterCut: number | null
  status: 'normal' | 'warning' | 'critical' | 'unknown'
  lastUpdate: string | null
  alertsCount: number
  tagsCount: number
  dataUnavailable?: boolean
}

export default function Wells() {
  const [selectedWell, setSelectedWell] = useState<string>('')
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h')

  // Fetch list of wells
  const { data: wellsResponse, isError: isWellsListError, refetch: refetchWellsList } = useQuery({
    queryKey: ['wells-list'],
    queryFn: async () => {
      const response = await well3DAPI.getWells()
      return response.wells || response || []
    },
  })

  const wells: string[] = Array.isArray(wellsResponse)
    ? wellsResponse
    : wellsResponse?.wells || []

  // Fetch sensor data for selected well
  const { data: sensorData, isLoading: isLoadingSensor } = useQuery({
    queryKey: ['well-sensor-data', selectedWell, timeRange],
    queryFn: async () => {
      if (!selectedWell) return []
      try {
        const response = await dataIngestionAPI.getSensorData({ 
          well_name: selectedWell,
          limit: timeRange === '1h' ? 60 : timeRange === '24h' ? 1440 : 10080
        })
        return response.records || []
      } catch (error) {
        if (import.meta.env.DEV) {
          console.debug('Sensor data service unavailable')
        }
        return []
      }
    },
    enabled: !!selectedWell,
    refetchInterval: 10000, // Refetch every 10 seconds
  })

  // Fetch well summary data
  const { data: wellsSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['wells-summary', wells.join(',')],
    queryFn: async () => {
      const summary: WellData[] = []

      for (const wellName of wells) {
        try {
          // Fetch latest sensor data for each well
          const sensorResponse = await dataIngestionAPI.getSensorData({
            well_name: wellName,
            limit: 1
          })

          // Fetch alerts count
          const alertsResponse = await alertAPI.getAlerts({ well_name: wellName, status: 'open' })

          // Fetch tags count
          const tagsResponse = await tagCatalogAPI.getTags({ well_name: wellName })

          const latestRecord = sensorResponse?.records?.[0]

          if (latestRecord) {
            let status: WellData['status'] = 'normal'
            const value = latestRecord.value ?? 0
            if (value > 3000 || value > 120) {
              status = 'critical'
            } else if (value > 2500 || value > 100) {
              status = 'warning'
            }

            summary.push({
              well_name: wellName,
              pressure: latestRecord.sensor_type === 'pressure' ? latestRecord.value : null,
              temperature: latestRecord.sensor_type === 'temperature' ? latestRecord.value : null,
              flowRate: latestRecord.sensor_type === 'flow_rate' ? latestRecord.value : null,
              waterCut: null,
              status,
              lastUpdate: latestRecord.timestamp || null,
              alertsCount: alertsResponse?.count || 0,
              tagsCount: tagsResponse?.count || 0,
            })
          } else {
            summary.push({
              well_name: wellName,
              pressure: null,
              temperature: null,
              flowRate: null,
              waterCut: null,
              status: 'unknown',
              lastUpdate: null,
              alertsCount: alertsResponse?.count || 0,
              tagsCount: tagsResponse?.count || 0,
              dataUnavailable: true,
            })
          }
        } catch (error) {
          summary.push({
            well_name: wellName,
            pressure: null,
            temperature: null,
            flowRate: null,
            waterCut: null,
            status: 'unknown',
            lastUpdate: null,
            alertsCount: 0,
            tagsCount: 0,
            dataUnavailable: true,
          })
        }
      }

      return summary
    },
    enabled: wells.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Process sensor data for charts
  const chartData = sensorData?.map((record: any) => {
    const timestamp = new Date(record.timestamp)
    return {
      time: timestamp.toLocaleTimeString(),
      datetime: timestamp,
      pressure: record.sensor_type === 'pressure' ? record.value : null,
      temperature: record.sensor_type === 'temperature' ? record.value : null,
      flowRate: record.sensor_type === 'flow_rate' ? record.value : null,
    }
  }).filter((d: any) => d.pressure !== null || d.temperature !== null || d.flowRate !== null) || []

  // Group by sensor type for better visualization
  const pressureData = sensorData?.filter((r: any) => r.sensor_type === 'pressure').slice(-100) || []
  const temperatureData = sensorData?.filter((r: any) => r.sensor_type === 'temperature').slice(-100) || []
  const flowRateData = sensorData?.filter((r: any) => r.sensor_type === 'flow_rate').slice(-100) || []

  const pressureChartData = pressureData.map((record: any) => ({
    time: new Date(record.timestamp).toLocaleTimeString(),
    value: record.value,
  }))

  const temperatureChartData = temperatureData.map((record: any) => ({
    time: new Date(record.timestamp).toLocaleTimeString(),
    value: record.value,
  }))

  const flowRateChartData = flowRateData.map((record: any) => ({
    time: new Date(record.timestamp).toLocaleTimeString(),
    value: record.value,
  }))

  const displaySummary: WellData[] = wellsSummary || []

  if (isWellsListError) {
    return <ErrorState message="Unable to load the wells list." onRetry={() => refetchWellsList()} />
  }

  return (
    <div className="wells-page">
      <div className="wells-header">
        <h2>Wells Management</h2>
        <div className="time-range-selector">
          <button 
            className={timeRange === '1h' ? 'active' : ''}
            onClick={() => setTimeRange('1h')}
          >
            1 Hour
          </button>
          <button 
            className={timeRange === '24h' ? 'active' : ''}
            onClick={() => setTimeRange('24h')}
          >
            24 Hours
          </button>
          <button 
            className={timeRange === '7d' ? 'active' : ''}
            onClick={() => setTimeRange('7d')}
          >
            7 Days
          </button>
        </div>
      </div>

      {isLoadingSummary && (
        <div className="loading-message">Loading wells data...</div>
      )}

      {/* Wells Summary Cards */}
      <div className="wells-summary">
        {displaySummary?.map((well) => (
          <div 
            key={well.well_name} 
            className={`well-card ${well.status}`}
            onClick={() => setSelectedWell(well.well_name)}
          >
            <div className="well-card-header">
              <h3>{well.well_name}</h3>
              <span className={`status-badge ${well.status}`}>{well.status}</span>
            </div>
            <div className="well-card-body">
              {well.dataUnavailable && (
                <p className="well-data-unavailable">No recent sensor data available</p>
              )}
              <div className="well-metric">
                <span className="metric-label">Pressure</span>
                <span className="metric-value">{well.pressure !== null ? `${well.pressure.toFixed(1)} psi` : '—'}</span>
              </div>
              <div className="well-metric">
                <span className="metric-label">Temperature</span>
                <span className="metric-value">{well.temperature !== null ? `${well.temperature.toFixed(1)} °C` : '—'}</span>
              </div>
              <div className="well-metric">
                <span className="metric-label">Flow Rate</span>
                <span className="metric-value">{well.flowRate !== null ? `${well.flowRate.toFixed(1)} bbl/day` : '—'}</span>
              </div>
              <div className="well-metric">
                <span className="metric-label">Water Cut</span>
                <span className="metric-value">{well.waterCut !== null ? `${well.waterCut.toFixed(1)}%` : '—'}</span>
              </div>
              <div className="well-meta">
                <span>Alerts: {well.alertsCount}</span>
                <span>Tags: {well.tagsCount}</span>
              </div>
              <div className="well-update">
                Last Update: {well.lastUpdate ? new Date(well.lastUpdate).toLocaleString() : '—'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Well Details */}
      {selectedWell && (
        <div className="well-details">
          <h3>Well Details: {selectedWell}</h3>
          
          {isLoadingSensor ? (
            <div className="loading">Loading sensor data...</div>
          ) : (
            <>
              {sensorData && sensorData.length > 0 ? (
                <div className="well-charts">
                  {/* Pressure Chart */}
                  {pressureChartData.length > 0 && (
                    <div className="chart-container">
                      <h4>Pressure (psi)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={pressureChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Temperature Chart */}
                  {temperatureChartData.length > 0 && (
                    <div className="chart-container">
                      <h4>Temperature (°C)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={temperatureChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="value" stroke="#82ca9d" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Flow Rate Chart */}
                  {flowRateChartData.length > 0 && (
                    <div className="chart-container">
                      <h4>Flow Rate (bbl/day)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={flowRateChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="value" stroke="#ffc658" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Combined Chart */}
                  {chartData.length > 0 && (
                    <div className="chart-container">
                      <h4>Combined Metrics</h4>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          {pressureChartData.length > 0 && (
                            <Line yAxisId="left" type="monotone" dataKey="pressure" stroke="#8884d8" strokeWidth={2} name="Pressure (psi)" />
                          )}
                          {temperatureChartData.length > 0 && (
                            <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#82ca9d" strokeWidth={2} name="Temperature (°C)" />
                          )}
                          {flowRateChartData.length > 0 && (
                            <Line yAxisId="right" type="monotone" dataKey="flowRate" stroke="#ffc658" strokeWidth={2} name="Flow Rate (bbl/day)" />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-data">
                  <p>No sensor data available for {selectedWell}</p>
                  <p>Please ensure the data ingestion service is running and data has been loaded.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!selectedWell && (
        <div className="well-selection-hint">
          <p>Select a well from the cards above to view detailed sensor data and charts.</p>
        </div>
      )}
    </div>
  )
}
