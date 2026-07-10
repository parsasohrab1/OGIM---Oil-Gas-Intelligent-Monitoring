import { useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { reportingAPI, dvrAPI } from '../api/services'
import './DataQualityLineage.css'

function pct(value: number | undefined): string {
  if (value === undefined || value === null) return '0.0%'
  return `${(value * 100).toFixed(1)}%`
}

function LineageGraph({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  const layout = useMemo(() => {
    const cols = 3
    const nodeW = 140
    const nodeH = 48
    const gapX = 60
    const gapY = 40
    const positions: Record<string, { x: number; y: number }> = {}
    nodes.forEach((node, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      positions[node.id] = { x: 20 + col * (nodeW + gapX), y: 20 + row * (nodeH + gapY) }
    })
    return { positions, width: cols * (nodeW + gapX) + 40, height: Math.ceil(nodes.length / cols) * (nodeH + gapY) + 40, nodeW, nodeH }
  }, [nodes])

  if (!nodes.length) return <p className="dq-muted">No lineage nodes available.</p>

  return (
    <svg className="lineage-graph" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="Data lineage graph">
      {edges.map((edge, i) => {
        const from = layout.positions[edge.from]
        const to = layout.positions[edge.to]
        if (!from || !to) return null
        const x1 = from.x + layout.nodeW / 2
        const y1 = from.y + layout.nodeH
        const x2 = to.x + layout.nodeW / 2
        const y2 = to.y
        return (
          <line key={`${edge.from}-${edge.to}-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#4a6cf7" strokeWidth="1.5" markerEnd="url(#arrow)" opacity="0.6" />
        )
      })}
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#4a6cf7" />
        </marker>
      </defs>
      {nodes.map((node) => {
        const pos = layout.positions[node.id]
        if (!pos) return null
        return (
          <g key={node.id}>
            <rect x={pos.x} y={pos.y} width={layout.nodeW} height={layout.nodeH} rx="6"
              fill="#2a2a2a" stroke="#4a6cf7" strokeWidth="1" />
            <text x={pos.x + layout.nodeW / 2} y={pos.y + 20} textAnchor="middle" fill="#fff" fontSize="11">
              {node.label?.length > 18 ? `${node.label.slice(0, 16)}…` : node.label}
            </text>
            <text x={pos.x + layout.nodeW / 2} y={pos.y + 36} textAnchor="middle" fill="#888" fontSize="9">
              {node.type}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function DataQualityLineage() {
  const latestQuery = useQuery({
    queryKey: ['dq-lineage-latest'],
    queryFn: () => reportingAPI.generateDataQualityLineage({ lookback_hours: 24 }),
    refetchInterval: 60000,
  })

  const dvrQualityQuery = useQuery({
    queryKey: ['dvr-quality'],
    queryFn: () => dvrAPI.getQualityScores(),
    refetchInterval: 60000,
  })

  const autoReportsQuery = useQuery({
    queryKey: ['dq-lineage-auto'],
    queryFn: () => reportingAPI.getAutoDataQualityLineageReports(10),
    refetchInterval: 60000,
  })

  const autoGenerateMutation = useMutation({
    mutationFn: () => reportingAPI.generateAutoDataQualityLineage({ lookback_hours: 24 }),
    onSuccess: () => {
      autoReportsQuery.refetch()
      latestQuery.refetch()
    },
  })

  const report = latestQuery.data
  const quality = report?.quality
  const lineage = report?.lineage
  const dvrSensors = dvrQualityQuery.data?.sensors || dvrQualityQuery.data || []

  const scoreCards = [
    { label: 'Overall Score', value: pct(quality?.overall_score) },
    { label: 'Completeness', value: pct(quality?.completeness) },
    { label: 'Validity', value: pct(quality?.validity) },
    { label: 'Timeliness', value: pct(quality?.timeliness) },
    { label: 'Consistency', value: pct(quality?.consistency) },
    { label: 'Records', value: String(quality?.record_count ?? 0) },
  ]

  return (
    <div className="dq-page">
      <div className="dq-header">
        <h2>Data Quality + Lineage Dashboard</h2>
        <button className="dq-btn" onClick={() => autoGenerateMutation.mutate()} disabled={autoGenerateMutation.isPending}>
          {autoGenerateMutation.isPending ? 'Generating...' : 'Generate Auto Report'}
        </button>
      </div>

      {latestQuery.isLoading ? (
        <div>Loading quality report...</div>
      ) : (
        <>
          <div className="dq-score-grid">
            {scoreCards.map((card) => (
              <div key={card.label} className="dq-score-card">
                <strong>{card.label}</strong>
                <div className="dq-score-value">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="dq-panels">
            <section className="dq-panel">
              <h3>Data Lineage</h3>
              <div className="dq-lineage-meta">
                <span>Nodes: {lineage?.nodes?.length ?? 0}</span>
                <span>Edges: {lineage?.edges?.length ?? 0}</span>
              </div>
              <LineageGraph nodes={lineage?.nodes || []} edges={lineage?.edges || []} />
            </section>

            <section className="dq-panel">
              <h3>DVR Sensor Quality</h3>
              {dvrQualityQuery.isLoading ? <p>Loading DVR scores...</p> : (
                <div className="dq-sensor-list">
                  {(Array.isArray(dvrSensors) ? dvrSensors : []).slice(0, 15).map((s: any) => (
                    <div key={s.sensor_id || s.id} className="dq-sensor-row">
                      <span>{s.sensor_id || s.id}</span>
                      <span className="dq-sensor-score">{pct(s.overall_score ?? s.score)}</span>
                    </div>
                  ))}
                  {(!Array.isArray(dvrSensors) || dvrSensors.length === 0) && (
                    <p className="dq-muted">DVR service offline or no sensor data.</p>
                  )}
                </div>
              )}
            </section>
          </div>

          <section className="dq-panel">
            <h3>Automatic Reports</h3>
            {autoReportsQuery.isLoading ? (
              <div>Loading auto reports...</div>
            ) : (
              <div className="dq-reports-grid">
                {(autoReportsQuery.data?.reports || []).map((item: any) => (
                  <div key={item.auto_report_id} className="dq-report-card">
                    <div><strong>{item.auto_report_id}</strong></div>
                    <div>Created: {item.created_at}</div>
                    <div>Overall Score: {pct(item.report?.quality?.overall_score)}</div>
                    <div>Next ETA: {item.next_run_eta_minutes} min</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
