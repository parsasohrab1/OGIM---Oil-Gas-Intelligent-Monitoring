import { useQuery } from '@tanstack/react-query'
import { useWebSocket } from '../hooks/useWebSocket'
import { kpiAPI } from '../api/services'
import './Performance.css'

const GRAFANA_URL = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3001'

function statusClass(status?: string): string {
  return status === 'ok' ? 'kpi-ok' : status === 'warning' ? 'kpi-warn' : 'kpi-neutral'
}

export default function Performance() {
  const { transport } = useWebSocket({ enabled: false })

  const kpiQuery = useQuery({
    queryKey: ['kpi-summary'],
    queryFn: () => kpiAPI.getSummary(),
    refetchInterval: 30000,
  })

  const cacheQuery = useQuery({
    queryKey: ['kpi-cache'],
    queryFn: () => kpiAPI.getCacheStats(),
    refetchInterval: 30000,
  })

  const kpi = kpiQuery.data
  const cache = cacheQuery.data

  const panels = [
    { title: 'Request Rate', desc: 'service_requests_total by service' },
    { title: 'Error Rate', desc: 'service_request_errors_total by service' },
    { title: 'P95 Latency', desc: 'service_request_latency_seconds (API Gateway)' },
    { title: 'ML Inference', desc: 'ml_inference_latency_seconds by model_type' },
  ]

  return (
    <div className="perf-page">
      <div className="perf-header">
        <h2>APM & Executive KPIs</h2>
        <a href={GRAFANA_URL} target="_blank" rel="noopener noreferrer" className="perf-grafana-link">
          Open Grafana Dashboard
        </a>
      </div>

      <div className="kpi-grid">
        <div className={`kpi-card ${statusClass(kpi?.latency?.status)}`}>
          <strong>Latency P95</strong>
          <span className="kpi-value">{kpi?.latency?.p95_ms ?? '—'} ms</span>
          <small>Target: &lt; {kpi?.latency?.target_p95_ms ?? 100} ms</small>
        </div>
        <div className={`kpi-card ${statusClass(kpi?.uptime?.status)}`}>
          <strong>Uptime</strong>
          <span className="kpi-value">{kpi?.uptime?.ratio != null ? `${(kpi.uptime.ratio * 100).toFixed(2)}%` : '—'}</span>
          <small>Target: ≥ {(kpi?.uptime?.target_ratio ?? 0.999) * 100}%</small>
        </div>
        <div className={`kpi-card ${statusClass(kpi?.adoption?.status)}`}>
          <strong>Adoption</strong>
          <span className="kpi-value">{kpi?.adoption?.total_events ?? 0} events</span>
          <small>{Object.keys(kpi?.adoption?.feature_hits ?? {}).length} features used</small>
        </div>
        <div className={`kpi-card ${statusClass(kpi?.alert_quality?.status)}`}>
          <strong>False Positive Rate</strong>
          <span className="kpi-value">
            {kpi?.alert_quality?.false_positive_rate != null
              ? `${(kpi.alert_quality.false_positive_rate * 100).toFixed(1)}%`
              : '—'}
          </span>
          <small>Target: ≤ {(kpi?.alert_quality?.target_max_false_positive_rate ?? 0.3) * 100}%</small>
        </div>
      </div>

      <div className="perf-stack">
        <section className="perf-card">
          <h3>API Response Cache</h3>
          <p>Hit rate: {cache?.hit_rate != null ? `${(cache.hit_rate * 100).toFixed(1)}%` : '—'}</p>
          <p>Entries: {cache?.entries ?? 0} | Hits: {cache?.hits ?? 0} | Misses: {cache?.misses ?? 0}</p>
        </section>

        <section className="perf-card">
          <h3>Real-time Transport</h3>
          <p className={`perf-transport ${transport}`}>
            {transport === 'disconnected' ? 'Not subscribed on this page' : transport}
          </p>
        </section>

        <section className="perf-card full">
          <h3>Observability Stack</h3>
          <ul className="perf-list">
            <li><strong>OpenTelemetry</strong> → Tempo</li>
            <li><strong>Prometheus</strong> + executive-kpis.yml alerts</li>
            <li><strong>Grafana</strong> — OGIM APM Overview</li>
            <li><strong>Security</strong> — Zero Trust, SIEM, threat detection</li>
          </ul>
        </section>

        <section className="perf-card full">
          <h3>Key Metrics Panels</h3>
          <div className="perf-panels-grid">
            {panels.map((p) => (
              <div key={p.title} className="perf-panel-item">
                <strong>{p.title}</strong>
                <span>{p.desc}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
