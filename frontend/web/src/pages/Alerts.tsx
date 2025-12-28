import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertAPI } from '../api/services'
import './Alerts.css'

export default function Alerts() {
  const queryClient = useQueryClient()
  
  const { data: alertsResponse, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      try {
        return await alertAPI.getAlerts()
      } catch (error: any) {
        console.error('Failed to fetch alerts:', error)
        // Return mock data when backend is not available
        return {
          count: 0,
          alerts: []
        }
      }
    },
    refetchInterval: 30000,
    retry: 2,
    retryDelay: 3000,
  })
  
  const acknowledgeMutation = useMutation({
    mutationFn: ({ alertId, username }: { alertId: string; username: string }) =>
      alertAPI.acknowledgeAlert(alertId, username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
  
  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => alertAPI.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
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
  
  const handleAcknowledge = (alertId: string) => {
    const username = localStorage.getItem('username') || 'operator1'
    acknowledgeMutation.mutate({ alertId, username })
  }
  
  const handleResolve = (alertId: string) => {
    resolveMutation.mutate(alertId)
  }
  
  const handleCreateWorkOrder = (alertId: string) => {
    if (window.confirm('Create Work Order for this alert?')) {
      createWorkOrderMutation.mutate({ alertId })
    }
  }
  
  const alerts = alertsResponse?.alerts || []

  if (isLoading) return <div className="loading">Loading alerts...</div>

  return (
    <div className="alerts-page">
      <h2>Alerts</h2>
      {alerts.length === 0 && !isLoading && (
        <div className="no-alerts">
          <p>No alerts found. {alertsResponse?.count === 0 ? 'All systems operational.' : 'Backend service may not be running.'}</p>
        </div>
      )}
      <div className="alerts-list">
        {alerts.map((alert: any) => (
          <div key={alert.alert_id} className={`alert-card ${alert.severity}`}>
            <div className="alert-header">
              <span className="alert-id">{alert.alert_id}</span>
              <span className={`alert-severity ${alert.severity}`}>{alert.severity}</span>
            </div>
            <div className="alert-body">
              <p><strong>Well:</strong> {alert.well_name}</p>
              <p><strong>Message:</strong> {alert.message}</p>
              <p><strong>Status:</strong> {alert.status}</p>
              <p><strong>Time:</strong> {new Date(alert.timestamp).toLocaleString()}</p>
              
              {alert.erp_work_order_id && (
                <div className="work-order-info">
                  <p><strong>Work Order:</strong> {alert.erp_work_order_id}</p>
                </div>
              )}
              
              <div className="alert-actions">
                {alert.status === 'open' && (
                  <>
                    <button 
                      onClick={() => handleAcknowledge(alert.alert_id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      Acknowledge
                    </button>
                    <button 
                      onClick={() => handleResolve(alert.alert_id)}
                      disabled={resolveMutation.isPending}
                    >
                      Resolve
                    </button>
                    {!alert.erp_work_order_id && (
                      <button 
                        onClick={() => handleCreateWorkOrder(alert.alert_id)}
                        disabled={createWorkOrderMutation.isPending}
                        className="work-order-btn"
                        title="Create Work Order in CMMS"
                      >
                        {createWorkOrderMutation.isPending ? 'Creating...' : 'Create Work Order'}
                      </button>
                    )}
                  </>
                )}
                {alert.status === 'acknowledged' && (
                  <>
                    <button 
                      onClick={() => handleResolve(alert.alert_id)}
                      disabled={resolveMutation.isPending}
                    >
                      Resolve
                    </button>
                    {!alert.erp_work_order_id && (
                      <button 
                        onClick={() => handleCreateWorkOrder(alert.alert_id)}
                        disabled={createWorkOrderMutation.isPending}
                        className="work-order-btn"
                        title="Create Work Order in CMMS"
                      >
                        {createWorkOrderMutation.isPending ? 'Creating...' : 'Create Work Order'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

