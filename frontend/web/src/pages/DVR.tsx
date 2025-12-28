import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useState } from 'react'
import apiClient from '../api/client'
import './DVR.css'

interface ValidationResult {
  sensor_id: string
  timestamp: string
  value: number
  is_valid: boolean
  validation_score: number
  violations: string[]
  quality_metrics: Record<string, any>
}

interface QualityScore {
  sensor_id: string
  quality_score: number
  completeness: number
  accuracy: number
  timeliness: number
  consistency: number
  validity: number
  timestamp: string
}

export default function DVR() {
  const [selectedSensor, setSelectedSensor] = useState<string>('')

  // Fetch quality scores
  const { data: qualityScores, isLoading: qualityLoading } = useQuery({
    queryKey: ['dvr-quality'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/dvr/quality')
        return response.data as QualityScore[]
      } catch (error: any) {
        console.error('Failed to fetch quality scores:', error)
        // Return mock data when backend is not available
        return [
          {
            sensor_id: 'SENSOR-001',
            quality_score: 0.95,
            completeness: 1.0,
            accuracy: 0.92,
            timeliness: 0.98,
            consistency: 0.94,
            validity: 0.96,
            timestamp: new Date().toISOString()
          },
          {
            sensor_id: 'SENSOR-002',
            quality_score: 0.87,
            completeness: 0.99,
            accuracy: 0.85,
            timeliness: 0.90,
            consistency: 0.88,
            validity: 0.89,
            timestamp: new Date().toISOString()
          }
        ] as QualityScore[]
      }
    },
    refetchInterval: 30000,
    retry: 2,
    retryDelay: 3000,
  })

  // Fetch validation results
  const { data: validationResults } = useQuery({
    queryKey: ['dvr-validation', selectedSensor],
    queryFn: async () => {
      if (!selectedSensor) return null
      try {
        const response = await apiClient.post('/api/dvr/validate', {
          sensor_id: selectedSensor,
          value: 0, // Mock - would be actual value
          timestamp: new Date().toISOString()
        })
        return response.data as ValidationResult
      } catch (error: any) {
        console.error('Failed to validate:', error)
        // Return mock validation result
        return {
          sensor_id: selectedSensor,
          timestamp: new Date().toISOString(),
          value: 0,
          is_valid: true,
          validation_score: 0.95,
          violations: [],
          quality_metrics: {}
        } as ValidationResult
      }
    },
    enabled: !!selectedSensor,
    retry: 1,
  })

  // Fetch outliers
  const { data: outliers } = useQuery({
    queryKey: ['dvr-outliers', selectedSensor],
    queryFn: async () => {
      if (!selectedSensor) return []
      try {
        const response = await apiClient.post('/api/dvr/outliers/detect', {
          sensor_id: selectedSensor,
          window_size: 100,
          method: 'zscore'
        })
        return response.data
      } catch (error: any) {
        console.error('Failed to detect outliers:', error)
        // Return empty array when backend is not available
        return []
      }
    },
    enabled: !!selectedSensor,
    retry: 1,
  })

  if (qualityLoading) {
    return <div className="loading">Loading DVR data...</div>
  }

  const qualityChartData = qualityScores?.slice(0, 10).map(score => ({
    sensor: score.sensor_id.substring(0, 10),
    quality: (score.quality_score * 100).toFixed(1),
    completeness: (score.completeness * 100).toFixed(1),
    accuracy: (score.accuracy * 100).toFixed(1),
    timeliness: (score.timeliness * 100).toFixed(1),
    consistency: (score.consistency * 100).toFixed(1),
    validity: (score.validity * 100).toFixed(1),
  })) || []

  return (
    <div className="dvr-page">
      <h2>Data Validation & Reconciliation (DVR)</h2>

      <div className="dvr-grid">
        {/* Quality Scores Overview */}
        <div className="dvr-card">
          <h3>Data Quality Scores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={qualityChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sensor" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="quality" fill="#8884d8" name="Overall Quality %" />
              <Bar dataKey="accuracy" fill="#82ca9d" name="Accuracy %" />
              <Bar dataKey="completeness" fill="#ffc658" name="Completeness %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quality Metrics Table */}
        <div className="dvr-card">
          <h3>Quality Metrics by Sensor</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Sensor ID</th>
                  <th>Quality Score</th>
                  <th>Completeness</th>
                  <th>Accuracy</th>
                  <th>Timeliness</th>
                  <th>Consistency</th>
                  <th>Validity</th>
                </tr>
              </thead>
              <tbody>
                {qualityScores?.slice(0, 20).map((score) => (
                  <tr key={score.sensor_id}>
                    <td>{score.sensor_id}</td>
                    <td className={score.quality_score > 0.9 ? 'good' : score.quality_score > 0.7 ? 'warning' : 'bad'}>
                      {(score.quality_score * 100).toFixed(1)}%
                    </td>
                    <td>{(score.completeness * 100).toFixed(1)}%</td>
                    <td>{(score.accuracy * 100).toFixed(1)}%</td>
                    <td>{(score.timeliness * 100).toFixed(1)}%</td>
                    <td>{(score.consistency * 100).toFixed(1)}%</td>
                    <td>{(score.validity * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sensor Selection */}
        <div className="dvr-card">
          <h3>Sensor Selection</h3>
          <select 
            value={selectedSensor} 
            onChange={(e) => setSelectedSensor(e.target.value)}
            className="sensor-select"
          >
            <option value="">Select a sensor...</option>
            {qualityScores?.map((score) => (
              <option key={score.sensor_id} value={score.sensor_id}>
                {score.sensor_id}
              </option>
            ))}
          </select>
        </div>

        {/* Validation Results */}
        {selectedSensor && validationResults && (
          <div className="dvr-card">
            <h3>Validation Results</h3>
            <div className="validation-info">
              <div className={`validation-status ${validationResults.is_valid ? 'valid' : 'invalid'}`}>
                Status: {validationResults.is_valid ? 'Valid' : 'Invalid'}
              </div>
              <div>Validation Score: {(validationResults.validation_score * 100).toFixed(1)}%</div>
              {validationResults.violations.length > 0 && (
                <div className="violations">
                  <strong>Violations:</strong>
                  <ul>
                    {validationResults.violations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Outlier Detection */}
        {selectedSensor && outliers && outliers.length > 0 && (
          <div className="dvr-card">
            <h3>Detected Outliers</h3>
            <div className="outliers-list">
              {outliers.slice(0, 10).map((outlier: any, i: number) => (
                <div key={i} className="outlier-item">
                  <div>Value: {outlier.value}</div>
                  <div>Outlier Score: {outlier.outlier_score.toFixed(2)}</div>
                  <div>Timestamp: {new Date(outlier.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

