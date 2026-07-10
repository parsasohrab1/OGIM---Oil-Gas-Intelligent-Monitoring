import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from '../hooks/useWebSocket'
import { alertAPI } from '../api/services'
import './Alerts.css'

type Tab = 'all' | 'correlated'

function getMeta(alert: any): Record<string, any> {
  return alert.metadata_json || alert.metadata || {}
}

export default function Alerts() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('all')
  const [rcaResults, setRcaResults] = useState<Record<string, any>>({})

  const { transport } = useWebSocket({
    onSnapshot: (payload) => {
      if (payload.data.alerts) {
        queryClient.setQueryData(['alerts'], payload.data.alerts)
      }
    },
  })

  const { data: alertsResponse, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      try {
        return await alertAPI.getAlerts()
      } catch {
        return { count: 0, alerts: [] }
      }
    },
    refetchInterval: transport === 'disconnected' ? 30000 : false,
    retry: false,
  })

  const { data: correlationsData, isLoading: correlationsLoading } = useQuery({
    queryKey: ['alert-correlations'],
    queryFn: () => alertAPI.getCorrelatedAlerts('open'),
    enabled: tab === 'correlated',
    refetchInterval: transport === 'disconnected' ? 30000 : false,
  })

  const acknowledgeMutation = useMutation({
    mutationFn: ({ alertId, username }: { alertId: string; username: string }) =>
      alertAPI.acknowledgeAlert(alertId, username),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => alertAPI.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-correlations'] })
    },
  })

  const createWorkOrderMutation = useMutation({
    mutationFn: ({ alertId, erpType }: { alertId: string; erpType?: string }) =>
      alertAPI.createWorkOrder(alertId, erpType || 'sap'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      alert(`Work Order created: ${data.work_order_id}`)
    },
    onError: (error: any) => {
      alert(`Failed to create Work Order: ${error.response?.data?.detail || error.message}`)
    },
  })

  const rcaMutation = useMutation({
    mutationFn: (alertId: string) => alertAPI.runRCA(alertId, 60),
    onSuccess: (data) => {
      setRcaResults((prev) => ({ ...prev, [data.alert_id]: data.rca }))
    },
  })

  const handleAcknowledge = (alertId: string) => {
    const username = localStorage.getItem('username') || 'operator1'
    acknowledgeMutation.mutate({ alertId, username })
  }

  const handleResolve = (alertId: string) => resolveMutation.mutate(alertId)

  const handleCreateWorkOrder = (alertId: string) => {
    if (window.confirm('Create Work Order for this alert?')) {
      createWorkOrderMutation.mutate({ alertId })
    }
  }

  const alerts = alertsResponse?.alerts || []
  const groups = correlationsData?.groups || []

  if (isLoading) return <div className="loading">Loading alerts...</div>

  return (
    <div className="alerts-page">
      <div className="alerts-toolbar">
        <h2>Alerts</h2>
        <div className="alerts-toolbar-right">
          <span className={`transport-badge ${transport}`}>
            {transport === 'websocket' ? 'Live (WebSocket)' : transport === 'sse' ? 'Live (SSE)' : 'Polling'}
          </span>
          <div className="tab-buttons">
            <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All Alerts</button>
            <button className={tab === 'correlated' ? 'active' : ''} onClick={() => setTab('correlated')}>Correlated Groups</button>
          </div>
        </div>
      </div>

      {tab === 'correlated' ? (
        <div className="correlation-groups">
          {correlationsLoading ? <p>Loading correlations...</p> : groups.length === 0 ? (
            <div className="no-alerts"><p>No correlated alert groups.</p></div>
          ) : groups.map((group: any) => (
            <div key={group.correlation_id} className={`alert-card ${group.max_severity}`}>
              <div className="alert-header">
                <span className="alert-id">{group.correlation_id}</span>
                <span className={`alert-severity ${group.max_severity}`}>{group.max_severity}</span>
              </div>
              <div className="alert-body">
                <p><strong>Well:</strong> {group.well_name}</p>
                <p><strong>Alerts in group:</strong> {group.count}</p>
                <p><strong>Suppressed (fatigue):</strong> {group.suppressed_total}</p>
                <p><strong>Alert IDs:</strong> {group.alerts.join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {alerts.length === 0 && (
            <div className="no-alerts">
              <p>No alerts found. All systems operational.</p>
            </div>
          )}
          <div className="alerts-list">
            {alerts.map((alertItem: any) => {
              const meta = getMeta(alertItem)
              const rca = rcaResults[alertItem.alert_id] || meta.rca
              const suppressed = meta.suppressed_count || 0

              return (
                <div key={alertItem.alert_id} className={`alert-card ${alertItem.severity}`}>
                  <div className="alert-header">
                    <span className="alert-id">{alertItem.alert_id}</span>
                    <span className={`alert-severity ${alertItem.severity}`}>{alertItem.severity}</span>
                  </div>
                  <div className="alert-body">
                    <p><strong>Well:</strong> {alertItem.well_name}</p>
                    <p><strong>Message:</strong> {alertItem.message}</p>
                    <p><strong>Status:</strong> {alertItem.status}</p>
                    <p><strong>Time:</strong> {new Date(alertItem.timestamp).toLocaleString()}</p>
                    {meta.correlation_id && (
                      <p><strong>Correlation:</strong> {meta.correlation_id}</p>
                    )}
                    {suppressed > 0 && (
                      <p className="fatigue-badge"><strong>Fatigue suppressed:</strong> {suppressed} duplicate(s)</p>
                    )}
                    {alertItem.erp_work_order_id && (
                      <div className="work-order-info">
                        <p><strong>Work Order:</strong> {alertItem.erp_work_order_id}</p>
                      </div>
                    )}
                    {rca && (
                      <div className="rca-box">
                        <strong>Root Cause Analysis</strong>
                        <p>Dominant rule: {rca.dominant_rule || rca.primary_rule || '—'}</p>
                        <p>Dominant sensor: {rca.dominant_sensor || rca.primary_sensor || '—'}</p>
                        {rca.confidence !== undefined && <p>Confidence: {(rca.confidence * 100).toFixed(0)}%</p>}
                      </div>
                    )}
                    <div className="alert-actions">
                      <button onClick={() => rcaMutation.mutate(alertItem.alert_id)} disabled={rcaMutation.isPending}>
                        {rcaMutation.isPending ? 'Running RCA...' : 'Run RCA'}
                      </button>
                      {alertItem.status === 'open' && (
                        <>
                          <button onClick={() => handleAcknowledge(alertItem.alert_id)} disabled={acknowledgeMutation.isPending}>
                            Acknowledge
                          </button>
                          <button onClick={() => handleResolve(alertItem.alert_id)} disabled={resolveMutation.isPending}>
                            Resolve
                          </button>
                          {!alertItem.erp_work_order_id && (
                            <button onClick={() => handleCreateWorkOrder(alertItem.alert_id)}
                              disabled={createWorkOrderMutation.isPending} className="work-order-btn">
                              Create Work Order
                            </button>
                          )}
                        </>
                      )}
                      {alertItem.status === 'acknowledged' && (
                        <>
                          <button onClick={() => handleResolve(alertItem.alert_id)} disabled={resolveMutation.isPending}>
                            Resolve
                          </button>
                          {!alertItem.erp_work_order_id && (
                            <button onClick={() => handleCreateWorkOrder(alertItem.alert_id)}
                              disabled={createWorkOrderMutation.isPending} className="work-order-btn">
                              Create Work Order
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
