import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import apiClient from '../api/client'
import './SCADA.css'

interface SCADAConnection {
  connection_id: string
  protocol: string
  status: string
  host: string
  port: number
  connected: boolean
  last_update: string
}

interface PLCNode {
  node_id: string
  name: string
  value: any
  data_type: string
  timestamp: string
}

export default function SCADA() {
  const [selectedConnection, setSelectedConnection] = useState<string>('')
  const queryClient = useQueryClient()

  // Fetch SCADA connections
  const { data: connections, isLoading } = useQuery({
    queryKey: ['scada-connections'],
    queryFn: async () => {
      // Mock data - in production, fetch from API
      return [
        {
          connection_id: 'OPCUA-001',
          protocol: 'OPC UA',
          status: 'connected',
          host: '192.168.1.100',
          port: 4840,
          connected: true,
          last_update: new Date().toISOString()
        },
        {
          connection_id: 'MODBUS-001',
          protocol: 'Modbus TCP',
          status: 'connected',
          host: '192.168.1.101',
          port: 502,
          connected: true,
          last_update: new Date().toISOString()
        }
      ] as SCADAConnection[]
    },
    refetchInterval: 10000,
  })

  // Fetch OPC UA nodes
  const { data: opcuaNodes } = useQuery({
    queryKey: ['opcua-nodes', selectedConnection],
    queryFn: async () => {
      if (!selectedConnection || !selectedConnection.includes('OPCUA')) return []
      const response = await apiClient.get('/api/data-ingestion/opcua/nodes')
      return response.data.nodes || []
    },
    enabled: !!selectedConnection && selectedConnection.includes('OPCUA'),
  })

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await apiClient.post(`/api/scada/connections/${connectionId}/connect`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scada-connections'] })
    },
  })

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await apiClient.post(`/api/scada/connections/${connectionId}/disconnect`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scada-connections'] })
    },
  })

  if (isLoading) {
    return <div className="loading">Loading SCADA connections...</div>
  }

  return (
    <div className="scada-page">
      <h2>SCADA/PLC Integration</h2>

      <div className="scada-grid">
        {/* Connections Overview */}
        <div className="scada-card">
          <h3>SCADA/PLC Connections</h3>
          <div className="connections-list">
            {connections?.map((conn) => (
              <div key={conn.connection_id} className="connection-item">
                <div className="connection-header">
                  <div className="connection-id">{conn.connection_id}</div>
                  <div className={`connection-status ${conn.connected ? 'connected' : 'disconnected'}`}>
                    {conn.connected ? '● Connected' : '○ Disconnected'}
                  </div>
                </div>
                <div className="connection-details">
                  <div>Protocol: {conn.protocol}</div>
                  <div>Host: {conn.host}:{conn.port}</div>
                  <div>Last Update: {new Date(conn.last_update).toLocaleString()}</div>
                </div>
                <div className="connection-actions">
                  {conn.connected ? (
                    <button 
                      onClick={() => disconnectMutation.mutate(conn.connection_id)}
                      className="btn-disconnect"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button 
                      onClick={() => connectMutation.mutate(conn.connection_id)}
                      className="btn-connect"
                    >
                      Connect
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedConnection(conn.connection_id)}
                    className="btn-select"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OPC UA Nodes */}
        {selectedConnection && selectedConnection.includes('OPCUA') && (
          <div className="scada-card">
            <h3>OPC UA Nodes</h3>
            <div className="nodes-list">
              {opcuaNodes?.map((node: PLCNode) => (
                <div key={node.node_id} className="node-item">
                  <div className="node-id">{node.node_id}</div>
                  <div className="node-name">{node.name}</div>
                  <div className="node-value">Value: {String(node.value)}</div>
                  <div className="node-type">Type: {node.data_type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Protocol Statistics */}
        <div className="scada-card">
          <h3>Protocol Statistics</h3>
          <div className="protocol-stats">
            <div className="stat-item">
              <div className="stat-label">OPC UA Connections</div>
              <div className="stat-value">
                {connections?.filter(c => c.protocol === 'OPC UA').length || 0}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Modbus TCP Connections</div>
              <div className="stat-value">
                {connections?.filter(c => c.protocol === 'Modbus TCP').length || 0}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Connected</div>
              <div className="stat-value">
                {connections?.filter(c => c.connected).length || 0} / {connections?.length || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Synchronization */}
        <div className="scada-card">
          <h3>Real-time Data Synchronization</h3>
          <div className="sync-status">
            <div className="sync-item">
              <div className="sync-label">Synchronization Status</div>
              <div className="sync-value active">Active</div>
            </div>
            <div className="sync-item">
              <div className="sync-label">Data Points/sec</div>
              <div className="sync-value">1,250</div>
            </div>
            <div className="sync-item">
              <div className="sync-label">Last Sync</div>
              <div className="sync-value">{new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>

        {/* Protocol Conversion */}
        <div className="scada-card">
          <h3>Protocol Conversion & Normalization</h3>
          <div className="conversion-info">
            <div className="conversion-item">
              <div className="conv-source">OPC UA → Normalized</div>
              <div className="conv-status">✓ Active</div>
            </div>
            <div className="conversion-item">
              <div className="conv-source">Modbus TCP → Normalized</div>
              <div className="conv-status">✓ Active</div>
            </div>
            <div className="conversion-item">
              <div className="conv-source">Legacy SCADA → Normalized</div>
              <div className="conv-status">✓ Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

