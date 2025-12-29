import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import './FederatedLearning.css'

interface EdgeNode {
  nodeId: string
  location: string
  wellName: string
  modelVersion: string
  localAccuracy: number
  dataSize: number // MB
  trainingStatus: 'training' | 'idle' | 'syncing'
  lastSync: string
  bandwidthSaved: number // MB
}

interface GlobalModel {
  modelId: string
  version: string
  globalAccuracy: number
  aggregatedWeights: number
  participatingNodes: number
  lastUpdate: string
  convergenceStatus: 'converged' | 'converging' | 'diverged'
}

export default function FederatedLearning() {
  const [selectedNode, setSelectedNode] = useState<string>('NODE-001')

  // Mock data for edge nodes
  const { data: edgeNodes = [] } = useQuery({
    queryKey: ['federated-nodes'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return [
        {
          nodeId: 'NODE-001',
          location: 'Field A',
          wellName: 'PROD-001',
          modelVersion: 'LSTM-FL-v2.3',
          localAccuracy: 92.5,
          dataSize: 1250,
          trainingStatus: 'training' as const,
          lastSync: '2 minutes ago',
          bandwidthSaved: 1245
        },
        {
          nodeId: 'NODE-002',
          location: 'Field B',
          wellName: 'PROD-002',
          modelVersion: 'LSTM-FL-v2.3',
          localAccuracy: 91.8,
          dataSize: 980,
          trainingStatus: 'syncing' as const,
          lastSync: '5 minutes ago',
          bandwidthSaved: 975
        },
        {
          nodeId: 'NODE-003',
          location: 'Field C',
          wellName: 'DEV-001',
          modelVersion: 'LSTM-FL-v2.3',
          localAccuracy: 93.2,
          dataSize: 1560,
          trainingStatus: 'training' as const,
          lastSync: '1 minute ago',
          bandwidthSaved: 1555
        },
        {
          nodeId: 'NODE-004',
          location: 'Field D',
          wellName: 'OBS-001',
          modelVersion: 'LSTM-FL-v2.3',
          localAccuracy: 90.5,
          dataSize: 890,
          trainingStatus: 'idle' as const,
          lastSync: '10 minutes ago',
          bandwidthSaved: 885
        }
      ] as EdgeNode[]
    },
    refetchInterval: 5000
  })

  // Mock data for global model
  const { data: globalModel } = useQuery({
    queryKey: ['global-model'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return {
        modelId: 'GLOBAL-LSTM-001',
        version: 'v2.3',
        globalAccuracy: 93.1,
        aggregatedWeights: 156,
        participatingNodes: 4,
        lastUpdate: '3 minutes ago',
        convergenceStatus: 'converging' as const
      } as GlobalModel
    },
    refetchInterval: 5000
  })

  // Mock training history
  const trainingHistory = Array.from({ length: 20 }, (_, i) => ({
    epoch: i + 1,
    globalAccuracy: 85 + (i * 0.4) + Math.random() * 0.5,
    avgLocalAccuracy: 84 + (i * 0.4) + Math.random() * 0.5
  }))

  // Mock bandwidth savings
  const bandwidthData = [
    { approach: 'Centralized', bandwidth: 5000, privacy: 'Low' },
    { approach: 'Federated', bandwidth: 156, privacy: 'High' }
  ]

  const selectedNodeData = edgeNodes.find(n => n.nodeId === selectedNode)

  const COLORS = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c']

  return (
    <div className="federated-learning-page">
      <div className="page-header">
        <h1>Federated Learning</h1>
        <p>Privacy-preserving distributed training with minimal bandwidth usage</p>
      </div>

      <div className="fl-stats-grid">
        <div className="stat-card">
          <h3>Participating Nodes</h3>
          <div className="stat-value">{edgeNodes.length}</div>
          <div className="stat-label">Active: {edgeNodes.filter(n => n.trainingStatus === 'training').length}</div>
        </div>
        <div className="stat-card">
          <h3>Global Model Accuracy</h3>
          <div className="stat-value">{globalModel?.globalAccuracy.toFixed(1)}%</div>
          <div className="stat-label">{globalModel?.convergenceStatus}</div>
        </div>
        <div className="stat-card">
          <h3>Bandwidth Saved</h3>
          <div className="stat-value">
            {edgeNodes.reduce((sum, n) => sum + n.bandwidthSaved, 0).toFixed(0)} MB
          </div>
          <div className="stat-label">vs Centralized Training</div>
        </div>
        <div className="stat-card">
          <h3>Data Privacy</h3>
          <div className="stat-value">100%</div>
          <div className="stat-label">No raw data transmitted</div>
        </div>
      </div>

      <div className="fl-content-grid">
        <div className="nodes-section">
          <h2>Edge Nodes</h2>
          <div className="nodes-list">
            {edgeNodes.map(node => (
              <div
                key={node.nodeId}
                className={`node-card ${node.trainingStatus} ${selectedNode === node.nodeId ? 'selected' : ''}`}
                onClick={() => setSelectedNode(node.nodeId)}
              >
                <div className="node-header">
                  <span className="node-id">{node.nodeId}</span>
                  <span className={`node-status ${node.trainingStatus}`}>{node.trainingStatus}</span>
                </div>
                <div className="node-info">
                  <p><strong>Location:</strong> {node.location}</p>
                  <p><strong>Well:</strong> {node.wellName}</p>
                  <p><strong>Model:</strong> {node.modelVersion}</p>
                  <p><strong>Local Accuracy:</strong> {node.localAccuracy}%</p>
                  <p><strong>Data Size:</strong> {node.dataSize} MB</p>
                  <p><strong>Bandwidth Saved:</strong> {node.bandwidthSaved} MB</p>
                  <p><strong>Last Sync:</strong> {node.lastSync}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="global-model-section">
          <h2>Global Model</h2>
          {globalModel && (
            <div className="global-model-card">
              <div className="model-header">
                <h3>{globalModel.modelId}</h3>
                <span className={`convergence-status ${globalModel.convergenceStatus}`}>
                  {globalModel.convergenceStatus}
                </span>
              </div>
              <div className="model-metrics">
                <div className="metric-item">
                  <span className="metric-label">Version</span>
                  <span className="metric-value">{globalModel.version}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Global Accuracy</span>
                  <span className="metric-value">{globalModel.globalAccuracy}%</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Aggregated Weights</span>
                  <span className="metric-value">{globalModel.aggregatedWeights}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Participating Nodes</span>
                  <span className="metric-value">{globalModel.participatingNodes}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Last Update</span>
                  <span className="metric-value">{globalModel.lastUpdate}</span>
                </div>
              </div>

              <div className="training-history">
                <h3>Training History</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trainingHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="epoch" />
                    <YAxis domain={[80, 95]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="globalAccuracy" stroke="#3498db" name="Global Accuracy" />
                    <Line type="monotone" dataKey="avgLocalAccuracy" stroke="#2ecc71" name="Avg Local Accuracy" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="comparison-section">
        <h2>Bandwidth & Privacy Comparison</h2>
        <div className="comparison-grid">
          <div className="comparison-chart">
            <h3>Bandwidth Usage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bandwidthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="approach" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bandwidth" fill="#8884d8" name="Bandwidth (MB)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="privacy-benefits">
            <h3>Privacy Benefits</h3>
            <div className="benefit-list">
              <div className="benefit-item">
                <span className="benefit-icon">🔒</span>
                <div>
                  <h4>Data Stays Local</h4>
                  <p>Raw sensor data never leaves the edge device</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">📊</span>
                <div>
                  <h4>Only Weights Transmitted</h4>
                  <p>Only model weights (156 KB) sent to central server</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">⚡</span>
                <div>
                  <h4>Reduced Bandwidth</h4>
                  <p>97% reduction in bandwidth usage vs centralized training</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🛡️</span>
                <div>
                  <h4>Enhanced Security</h4>
                  <p>No sensitive operational data exposed during training</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedNodeData && (
        <div className="node-details-section">
          <h2>Node Details: {selectedNodeData.nodeId}</h2>
          <div className="node-details-grid">
            <div className="detail-card">
              <h3>Training Progress</h3>
              <div className="progress-info">
                <p>Local Accuracy: <strong>{selectedNodeData.localAccuracy}%</strong></p>
                <p>Data Processed: <strong>{selectedNodeData.dataSize} MB</strong></p>
                <p>Status: <strong>{selectedNodeData.trainingStatus}</strong></p>
              </div>
            </div>
            <div className="detail-card">
              <h3>Bandwidth Savings</h3>
              <div className="savings-info">
                <p>Saved: <strong>{selectedNodeData.bandwidthSaved} MB</strong></p>
                <p>Reduction: <strong>97%</strong></p>
                <p>Last Sync: <strong>{selectedNodeData.lastSync}</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

