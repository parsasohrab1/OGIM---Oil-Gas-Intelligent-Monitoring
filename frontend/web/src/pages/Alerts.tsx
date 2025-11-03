import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertAPI } from '../api/services'
import './Alerts.css'

export default function Alerts() {
  const queryClient = useQueryClient()
  
  const { data: alertsResponse, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertAPI.getAlerts(),
    refetchInterval: 30000,
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
  
  const handleAcknowledge = (alertId: string) => {
    const username = localStorage.getItem('username') || 'operator1'
    acknowledgeMutation.mutate({ alertId, username })
  }
  
  const handleResolve = (alertId: string) => {
    resolveMutation.mutate(alertId)
  }
  
  const alerts = alertsResponse?.alerts || []

  if (isLoading) return <div>Loading alerts...</div>

  return (
    <div className="alerts-page">
      <h2>Alerts</h2>
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
                  </>
                )}
                {alert.status === 'acknowledged' && (
                  <button 
                    onClick={() => handleResolve(alert.alert_id)}
                    disabled={resolveMutation.isPending}
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

