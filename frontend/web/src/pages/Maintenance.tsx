import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import apiClient from '../api/client'
import './Maintenance.css'

interface RULPrediction {
  equipment_id: string
  equipment_type: string
  rul_hours: number
  rul_days: number
  confidence: number
  urgency: string
  recommendation: string
  maintenance_window_days: number
}

interface MaintenanceSchedule {
  equipment_id: string
  equipment_type: string
  maintenance_type: string
  scheduled_date: string
  estimated_duration: number
  priority: string
  status: string
}

export default function Maintenance() {
  const [selectedEquipment, setSelectedEquipment] = useState<string>('')

  // Fetch RUL predictions
  const { data: rulPredictions, isLoading: rulLoading } = useQuery({
    queryKey: ['rul-predictions'],
    queryFn: async () => {
      // Mock data - in production, fetch from API
      return [
        {
          equipment_id: 'PUMP-001',
          equipment_type: 'pump',
          rul_hours: 4320,
          rul_days: 180,
          confidence: 0.87,
          urgency: 'medium',
          recommendation: 'Schedule maintenance within 1 month',
          maintenance_window_days: 173
        },
        {
          equipment_id: 'COMP-001',
          equipment_type: 'compressor',
          rul_hours: 2160,
          rul_days: 90,
          confidence: 0.92,
          urgency: 'high',
          recommendation: 'Schedule maintenance within 1 week',
          maintenance_window_days: 83
        }
      ] as RULPrediction[]
    },
    refetchInterval: 60000, // Refetch every minute
  })

  // Fetch maintenance schedule
  const { data: maintenanceSchedule } = useQuery({
    queryKey: ['maintenance-schedule'],
    queryFn: async () => {
      // Mock data
      return [
        {
          equipment_id: 'PUMP-001',
          equipment_type: 'pump',
          maintenance_type: 'preventive',
          scheduled_date: '2025-12-20',
          estimated_duration: 4,
          priority: 'medium',
          status: 'scheduled'
        }
      ] as MaintenanceSchedule[]
    },
  })

  // Fetch spare parts optimization
  const { data: spareParts } = useQuery({
    queryKey: ['spare-parts'],
    queryFn: async () => {
      // Mock data
      return [
        { part: 'Bearing', current_stock: 5, required: 8, cost: 500 },
        { part: 'Seal', current_stock: 12, required: 15, cost: 200 },
        { part: 'Gasket', current_stock: 20, required: 25, cost: 50 },
      ]
    },
  })

  if (rulLoading) {
    return <div className="loading">Loading maintenance data...</div>
  }

  const rulChartData = rulPredictions?.map(pred => ({
    equipment: pred.equipment_id,
    rul_days: pred.rul_days,
    confidence: (pred.confidence * 100).toFixed(0),
  })) || []

  const urgencyColors: Record<string, string> = {
    critical: '#dc3545',
    high: '#ffc107',
    medium: '#17a2b8',
    low: '#28a745'
  }

  return (
    <div className="maintenance-page">
      <h2>Maintenance Intelligence</h2>

      <div className="maintenance-grid">
        {/* RUL Predictions */}
        <div className="maintenance-card">
          <h3>Remaining Useful Life (RUL) Predictions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rulChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="equipment" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="rul_days" fill="#8884d8" name="RUL (Days)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* RUL Table */}
        <div className="maintenance-card">
          <h3>RUL Predictions by Equipment</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Type</th>
                  <th>RUL (Days)</th>
                  <th>Confidence</th>
                  <th>Urgency</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {rulPredictions?.map((pred) => (
                  <tr key={pred.equipment_id}>
                    <td>{pred.equipment_id}</td>
                    <td>{pred.equipment_type}</td>
                    <td>{pred.rul_days.toFixed(0)}</td>
                    <td>{(pred.confidence * 100).toFixed(0)}%</td>
                    <td>
                      <span 
                        className="urgency-badge" 
                        style={{ backgroundColor: urgencyColors[pred.urgency] }}
                      >
                        {pred.urgency}
                      </span>
                    </td>
                    <td>{pred.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance Schedule */}
        <div className="maintenance-card">
          <h3>Maintenance Schedule</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Type</th>
                  <th>Maintenance Type</th>
                  <th>Scheduled Date</th>
                  <th>Duration (hrs)</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceSchedule?.map((schedule, idx) => (
                  <tr key={idx}>
                    <td>{schedule.equipment_id}</td>
                    <td>{schedule.equipment_type}</td>
                    <td>{schedule.maintenance_type}</td>
                    <td>{new Date(schedule.scheduled_date).toLocaleDateString()}</td>
                    <td>{schedule.estimated_duration}</td>
                    <td>
                      <span className={`priority-${schedule.priority}`}>
                        {schedule.priority}
                      </span>
                    </td>
                    <td>{schedule.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Spare Parts Optimization */}
        <div className="maintenance-card">
          <h3>Spare Parts Optimization</h3>
          <div className="spare-parts">
            {spareParts?.map((part, idx) => (
              <div key={idx} className="spare-part-item">
                <div className="part-name">{part.part}</div>
                <div className="part-stock">
                  Stock: {part.current_stock} / Required: {part.required}
                </div>
                <div className="part-status">
                  {part.current_stock >= part.required ? (
                    <span className="status-ok">✓ Sufficient</span>
                  ) : (
                    <span className="status-low">⚠ Low Stock</span>
                  )}
                </div>
                <div className="part-cost">Cost: ${part.cost}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance Cost Forecast */}
        <div className="maintenance-card">
          <h3>Maintenance Cost Forecast</h3>
          <div className="cost-forecast">
            <div className="cost-item">
              <div className="cost-label">This Month</div>
              <div className="cost-value">$45,000</div>
            </div>
            <div className="cost-item">
              <div className="cost-label">Next Month</div>
              <div className="cost-value">$52,000</div>
            </div>
            <div className="cost-item">
              <div className="cost-label">This Quarter</div>
              <div className="cost-value">$150,000</div>
            </div>
          </div>
        </div>

        {/* Predictive Maintenance Recommendations */}
        <div className="maintenance-card">
          <h3>Predictive Maintenance Recommendations</h3>
          <div className="recommendations">
            {rulPredictions?.filter(p => p.urgency === 'high' || p.urgency === 'critical').map((pred) => (
              <div key={pred.equipment_id} className="recommendation-item">
                <div className="rec-equipment">{pred.equipment_id}</div>
                <div className="rec-message">{pred.recommendation}</div>
                <div className="rec-urgency">
                  Urgency: <span style={{ color: urgencyColors[pred.urgency] }}>{pred.urgency}</span>
                </div>
                <div className="rec-window">
                  Maintenance Window: {pred.maintenance_window_days} days
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

