import { useQuery } from '@tanstack/react-query'
import { securityAPI } from '../api/services'
import './SecurityCenter.css'

const SEVERITY_CLASS: Record<string, string> = {
  critical: 'sev-critical',
  high: 'sev-high',
  medium: 'sev-medium',
  low: 'sev-low',
}

export default function SecurityCenter() {
  const statusQuery = useQuery({
    queryKey: ['security-status'],
    queryFn: () => securityAPI.getThreatStatus(),
    refetchInterval: 15000,
  })

  const eventsQuery = useQuery({
    queryKey: ['siem-events'],
    queryFn: () => securityAPI.getSiemEvents(50),
    refetchInterval: 10000,
  })

  const status = statusQuery.data
  const events = eventsQuery.data?.events || []
  const summary = eventsQuery.data?.summary || status?.siem_summary

  return (
    <div className="sec-page">
      <h2>Security Center</h2>
      <p className="sec-subtitle">Zero Trust, SIEM events, and threat detection</p>

      <div className="sec-cards">
        <div className="sec-card">
          <strong>Zero Trust</strong>
          <span className={status?.zero_trust_enforced ? 'on' : 'off'}>
            {status?.zero_trust_enforced ? 'Enforced' : 'Disabled'}
          </span>
          {status?.zero_trust_networks?.length > 0 && (
            <small>Networks: {status.zero_trust_networks.join(', ')}</small>
          )}
        </div>
        <div className="sec-card">
          <strong>Threat Block Threshold</strong>
          <span>{status?.threat_block_threshold ?? 70}</span>
        </div>
        <div className="sec-card">
          <strong>API Hardening</strong>
          <span className={status?.api_security_hardening ? 'on' : 'off'}>
            {status?.api_security_hardening ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="sec-card">
          <strong>SIEM Events (buffered)</strong>
          <span>{summary?.total_buffered ?? 0}</span>
        </div>
      </div>

      <section className="sec-panel">
        <h3>Recent SIEM Events</h3>
        {eventsQuery.isLoading ? <p>Loading events...</p> : events.length === 0 ? (
          <p className="sec-muted">No security events recorded yet.</p>
        ) : (
          <div className="sec-events">
            {events.map((event: any, i: number) => (
              <div key={i} className={`sec-event ${SEVERITY_CLASS[event.severity] || ''}`}>
                <div className="sec-event-header">
                  <strong>{event.event_type}</strong>
                  <span className="sec-sev">{event.severity}</span>
                </div>
                <div className="sec-event-time">{event.timestamp}</div>
                <pre>{JSON.stringify(event.payload, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="sec-panel">
        <h3>Threat Detection Rules</h3>
        <ul className="sec-rules">
          <li>High request rate per IP (&gt;120 req / 5 min) — risk +45</li>
          <li>High request rate per user (&gt;80 req / 5 min) — risk +35</li>
          <li>Auth failures (401/403) — risk +20</li>
          <li>Known attack patterns (SQLi, sqlmap UA) — risk +60</li>
          <li>Requests blocked when risk score ≥ threshold</li>
        </ul>
      </section>
    </div>
  )
}
