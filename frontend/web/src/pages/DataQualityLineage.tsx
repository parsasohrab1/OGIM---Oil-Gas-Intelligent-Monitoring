import { useQuery, useMutation } from '@tanstack/react-query'
import { reportingAPI } from '../api/services'

function pct(value: number | undefined): string {
  if (value === undefined || value === null) return '0.0%'
  return `${(value * 100).toFixed(1)}%`
}

export default function DataQualityLineage() {
  const latestQuery = useQuery({
    queryKey: ['dq-lineage-latest'],
    queryFn: () => reportingAPI.generateDataQualityLineage({ lookback_hours: 24 }),
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

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Data Quality + Lineage Dashboard</h2>
        <button
          onClick={() => autoGenerateMutation.mutate()}
          disabled={autoGenerateMutation.isPending}
          style={{ padding: '0.5rem 0.9rem', cursor: 'pointer' }}
        >
          {autoGenerateMutation.isPending ? 'Generating...' : 'Generate Auto Report'}
        </button>
      </div>

      {latestQuery.isLoading ? (
        <div>Loading quality report...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: '0.8rem' }}>
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.8rem' }}>
              <strong>Overall Score</strong>
              <div>{pct(quality?.overall_score)}</div>
            </div>
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.8rem' }}>
              <strong>Completeness</strong>
              <div>{pct(quality?.completeness)}</div>
            </div>
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.8rem' }}>
              <strong>Validity</strong>
              <div>{pct(quality?.validity)}</div>
            </div>
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.8rem' }}>
              <strong>Timeliness</strong>
              <div>{pct(quality?.timeliness)}</div>
            </div>
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.8rem' }}>
              <strong>Consistency</strong>
              <div>{pct(quality?.consistency)}</div>
            </div>
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.8rem' }}>
              <strong>Records</strong>
              <div>{quality?.record_count ?? 0}</div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', border: '1px solid #ddd', borderRadius: '8px', padding: '0.8rem' }}>
            <h3 style={{ marginTop: 0 }}>Lineage Overview</h3>
            <div>Nodes: {lineage?.nodes?.length ?? 0}</div>
            <div>Edges: {lineage?.edges?.length ?? 0}</div>
            <div style={{ marginTop: '0.5rem', maxHeight: '220px', overflow: 'auto', fontSize: '0.9rem' }}>
              {(lineage?.nodes || []).slice(0, 20).map((node: any) => (
                <div key={node.id}>
                  - {node.label} ({node.type})
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '1rem', border: '1px solid #ddd', borderRadius: '8px', padding: '0.8rem' }}>
            <h3 style={{ marginTop: 0 }}>Automatic Reports</h3>
            {autoReportsQuery.isLoading ? (
              <div>Loading auto reports...</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {(autoReportsQuery.data?.reports || []).map((item: any) => (
                  <div key={item.auto_report_id} style={{ border: '1px solid #eee', borderRadius: '6px', padding: '0.5rem' }}>
                    <div><strong>{item.auto_report_id}</strong></div>
                    <div>Created: {item.created_at}</div>
                    <div>Overall Score: {pct(item.report?.quality?.overall_score)}</div>
                    <div>Next ETA: {item.next_run_eta_minutes} min</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

