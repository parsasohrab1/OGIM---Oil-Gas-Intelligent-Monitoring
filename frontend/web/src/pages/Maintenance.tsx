import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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

interface PreventiveMaintenanceRecommendation {
  id: string
  category: 'pressure_maintenance' | 'production_optimization' | 'well_integrity' | 'equipment_health' | 'cost_reduction'
  title: string
  description: string
  well_name?: string
  equipment_id?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  impact: string
  estimated_benefit: string
  action_required: string
  timeframe: string
  cost_estimate?: number
  roi?: number
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

  // Fetch preventive maintenance recommendations for oil & gas fields
  const { data: preventiveRecommendations, isLoading: recLoading } = useQuery({
    queryKey: ['preventive-maintenance-recommendations'],
    queryFn: async () => {
      try {
        // Try to fetch from API
        const response = await apiClient.get('/api/ml-inference/maintenance/recommendations')
        return response.data
      } catch (error) {
        // Return comprehensive mock data for oil & gas field maintenance
        return [
          {
            id: 'PM-001',
            category: 'pressure_maintenance',
            title: 'Prevent Pressure Decline in Well PROD-001',
            description: 'Well pressure is declining. It is recommended to inspect check valves and pressure control system.',
            well_name: 'PROD-001',
            priority: 'high',
            impact: 'Prevent 15% production decline',
            estimated_benefit: 'Increase production by 200 bbl/day',
            action_required: 'Inspect and repair check valves, calibrate pressure gauges, test BOP system',
            timeframe: 'Urgent - Within 48 hours',
            cost_estimate: 15000,
            roi: 350
          },
          {
            id: 'PM-002',
            category: 'production_optimization',
            title: 'Optimize Production in Well PROD-002',
            description: 'Well is producing below capacity. Choke adjustment and flow rate optimization is recommended.',
            well_name: 'PROD-002',
            priority: 'medium',
            impact: 'Increase production by 10%',
            estimated_benefit: 'Increase production by 150 bbl/day',
            action_required: 'Nodal analysis, adjust choke position, optimize artificial lift',
            timeframe: 'Within 1 week',
            cost_estimate: 8000,
            roi: 280
          },
          {
            id: 'PM-003',
            category: 'well_integrity',
            title: 'Inspect Casing Integrity in Well DEV-001',
            description: 'Signs of corrosion in casing have been observed. Integrity inspection and cement bond evaluation is recommended.',
            well_name: 'DEV-001',
            priority: 'critical',
            impact: 'Prevent leakage and contamination',
            estimated_benefit: 'Prevent $500,000 emergency repair costs',
            action_required: 'Casing inspection, Cement bond log, Corrosion monitoring',
            timeframe: 'Urgent - Within 24 hours',
            cost_estimate: 25000,
            roi: 2000
          },
          {
            id: 'PM-004',
            category: 'pressure_maintenance',
            title: 'Preventive Maintenance of Gas Lift System',
            description: 'Gas Lift system requires service. Reduced efficiency can cause pressure decline.',
            equipment_id: 'GASLIFT-001',
            priority: 'high',
            impact: 'Prevent 20% production decline',
            estimated_benefit: 'Increase production by 300 bbl/day',
            action_required: 'Compressor service, inspect gas lines, test control valves',
            timeframe: 'Within 3 days',
            cost_estimate: 12000,
            roi: 400
          },
          {
            id: 'PM-005',
            category: 'production_optimization',
            title: 'Optimize Artificial Lift System',
            description: 'ESP pump requires adjustment. Optimization can increase production by 12%.',
            equipment_id: 'ESP-001',
            priority: 'medium',
            impact: 'Increase pump efficiency',
            estimated_benefit: 'Increase production by 180 bbl/day, reduce power consumption by 8%',
            action_required: 'Adjust frequency, check motor temperature, optimize pump setting',
            timeframe: 'Within 1 week',
            cost_estimate: 6000,
            roi: 450
          },
          {
            id: 'PM-006',
            category: 'equipment_health',
            title: 'Preventive Maintenance of Separator',
            description: 'Separator requires cleaning and inspection. Deposits can reduce efficiency.',
            equipment_id: 'SEP-001',
            priority: 'medium',
            impact: 'Improve separation quality',
            estimated_benefit: 'Reduce water in oil by 5%, improve product quality',
            action_required: 'Internal cleaning, inspect plates, test control system',
            timeframe: 'Within 2 weeks',
            cost_estimate: 10000,
            roi: 180
          },
          {
            id: 'PM-007',
            category: 'pressure_maintenance',
            title: 'Prevent Pressure Decline in Pipeline',
            description: 'Signs of pressure decline in main pipeline have been observed. Leak inspection and deposit evaluation is essential.',
            equipment_id: 'PIPELINE-001',
            priority: 'high',
            impact: 'Prevent production shutdown',
            estimated_benefit: 'Prevent $1,000,000 production shutdown costs',
            action_required: 'Pipeline inspection, Pigging, Leak detection, Pressure testing',
            timeframe: 'Urgent - Within 72 hours',
            cost_estimate: 35000,
            roi: 2857
          },
          {
            id: 'PM-008',
            category: 'production_optimization',
            title: 'Optimize Choke Management',
            description: 'Multiple wells require choke adjustment. Optimization can increase total production by 8%.',
            well_name: 'Multiple',
            priority: 'medium',
            impact: 'Increase total field production',
            estimated_benefit: 'Increase production by 500 bbl/day across entire field',
            action_required: 'Production profile analysis, adjust choke for each well, continuous monitoring',
            timeframe: 'Within 2 weeks',
            cost_estimate: 15000,
            roi: 520
          },
          {
            id: 'PM-009',
            category: 'well_integrity',
            title: 'Inspect and Maintain BOP Stack',
            description: 'BOP requires testing and inspection. Ensuring proper function is essential for safety.',
            equipment_id: 'BOP-001',
            priority: 'critical',
            impact: 'Safety and prevent blowout',
            estimated_benefit: 'Prevent incident costing millions of dollars',
            action_required: 'BOP function test, Pressure test, Visual inspection, Maintenance records review',
            timeframe: 'Urgent - Within 24 hours',
            cost_estimate: 20000,
            roi: 10000
          },
          {
            id: 'PM-010',
            category: 'cost_reduction',
            title: 'Optimize Energy Consumption',
            description: 'Electrical systems and compressors can operate more efficiently. 15% energy reduction is achievable.',
            equipment_id: 'POWER-001',
            priority: 'low',
            impact: 'Reduce operational costs',
            estimated_benefit: 'Reduce electricity costs by $25,000 per month',
            action_required: 'Review load balancing, optimize compressor operation, install VFD',
            timeframe: 'Within 1 month',
            cost_estimate: 50000,
            roi: 600
          }
        ] as PreventiveMaintenanceRecommendation[]
      }
    },
    refetchInterval: 300000, // Refetch every 5 minutes
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
      <h2>PDM (Predictive Maintenance)</h2>

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

        {/* Preventive Maintenance Recommendations for Oil & Gas Fields */}
        <div className="maintenance-card full-width">
          <h3>Preventive Maintenance Recommendations for Oil & Gas Fields</h3>
          <p className="section-description">
            Intelligent recommendations for preventing pressure decline, optimizing production, and preventive equipment maintenance
          </p>
          
          {recLoading ? (
            <div className="loading">Loading recommendations...</div>
          ) : (
            <div className="preventive-recommendations">
              {/* Filter by category */}
              <div className="recommendation-filters">
                <button 
                  className="filter-btn active"
                  onClick={() => setSelectedEquipment('all')}
                >
                  All
                </button>
                <button 
                  className="filter-btn"
                  onClick={() => setSelectedEquipment('pressure_maintenance')}
                >
                  Pressure Maintenance
                </button>
                <button 
                  className="filter-btn"
                  onClick={() => setSelectedEquipment('production_optimization')}
                >
                  Production Optimization
                </button>
                <button 
                  className="filter-btn"
                  onClick={() => setSelectedEquipment('well_integrity')}
                >
                  Well Integrity
                </button>
                <button 
                  className="filter-btn"
                  onClick={() => setSelectedEquipment('equipment_health')}
                >
                  Equipment Health
                </button>
              </div>

              {/* Recommendations List */}
              <div className="preventive-recommendations-list">
                {preventiveRecommendations
                  ?.filter((rec: PreventiveMaintenanceRecommendation) => 
                    selectedEquipment === '' || 
                    selectedEquipment === 'all' || 
                    rec.category === selectedEquipment
                  )
                  .sort((a: PreventiveMaintenanceRecommendation, b: PreventiveMaintenanceRecommendation) => {
                    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
                    return priorityOrder[a.priority] - priorityOrder[b.priority]
                  })
                  .map((rec: PreventiveMaintenanceRecommendation) => {
                    const categoryLabels: Record<string, string> = {
                      pressure_maintenance: 'Pressure Maintenance',
                      production_optimization: 'Production Optimization',
                      well_integrity: 'Well Integrity',
                      equipment_health: 'Equipment Health',
                      cost_reduction: 'Cost Reduction'
                    }

                    return (
                      <div 
                        key={rec.id} 
                        className={`preventive-rec-item priority-${rec.priority}`}
                      >
                        <div className="rec-header">
                          <div className="rec-title-section">
                            <h4>{rec.title}</h4>
                            <span className="rec-category">{categoryLabels[rec.category] || rec.category}</span>
                          </div>
                          <div className="rec-priority-badge" style={{ backgroundColor: urgencyColors[rec.priority] }}>
                            {rec.priority === 'critical' ? 'Critical' : 
                             rec.priority === 'high' ? 'High' :
                             rec.priority === 'medium' ? 'Medium' : 'Low'}
                          </div>
                        </div>
                        
                        <div className="rec-body">
                          <p className="rec-description">{rec.description}</p>
                          
                          <div className="rec-details-grid">
                            <div className="rec-detail-item">
                              <span className="detail-label">Well/Equipment:</span>
                              <span className="detail-value">{rec.well_name || rec.equipment_id || 'General'}</span>
                            </div>
                            <div className="rec-detail-item">
                              <span className="detail-label">Impact:</span>
                              <span className="detail-value">{rec.impact}</span>
                            </div>
                            <div className="rec-detail-item">
                              <span className="detail-label">Estimated Benefit:</span>
                              <span className="detail-value highlight">{rec.estimated_benefit}</span>
                            </div>
                            <div className="rec-detail-item">
                              <span className="detail-label">Timeframe:</span>
                              <span className="detail-value">{rec.timeframe}</span>
                            </div>
                            {rec.cost_estimate && (
                              <div className="rec-detail-item">
                                <span className="detail-label">Estimated Cost:</span>
                                <span className="detail-value">${rec.cost_estimate.toLocaleString()}</span>
                              </div>
                            )}
                            {rec.roi && (
                              <div className="rec-detail-item">
                                <span className="detail-label">Return on Investment (ROI):</span>
                                <span className="detail-value highlight">{rec.roi}x</span>
                              </div>
                            )}
                          </div>

                          <div className="rec-actions">
                            <div className="action-required">
                              <strong>Actions Required:</strong>
                              <p>{rec.action_required}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {preventiveRecommendations && preventiveRecommendations.length === 0 && (
                <div className="no-recommendations">
                  <p>No recommendations available at this time.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

