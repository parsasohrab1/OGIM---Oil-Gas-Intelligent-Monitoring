import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mlAPI } from '../api/services'
import './MLModels.css'

const MODEL_TYPES = [
  { id: 'anomaly_detection', label: 'Anomaly Detection' },
  { id: 'failure_prediction', label: 'Failure Prediction' },
  { id: 'time_series_forecast', label: 'Time Series Forecast' },
]

function pct(value: number | undefined): string {
  if (value === undefined || value === null) return '—'
  return `${(value * 100).toFixed(1)}%`
}

export default function MLModels() {
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState('anomaly_detection')
  const [baselineVersion, setBaselineVersion] = useState('')
  const [candidateVersion, setCandidateVersion] = useState('')
  const [candidateWeight, setCandidateWeight] = useState(0.2)
  const [compareResult, setCompareResult] = useState<any>(null)
  const [driftFeatures, setDriftFeatures] = useState('{"pressure": 320, "temperature": 85, "flow_rate": 450}')
  const [driftResult, setDriftResult] = useState<any>(null)

  const modelsQuery = useQuery({
    queryKey: ['ml-models'],
    queryFn: () => mlAPI.getModels(),
  })

  const versionsQuery = useQuery({
    queryKey: ['ml-versions', selectedType],
    queryFn: () => mlAPI.getModelVersions(selectedType),
    enabled: !!selectedType,
  })

  const abTestQuery = useQuery({
    queryKey: ['ml-ab-test', selectedType],
    queryFn: () => mlAPI.getABTestConfig(selectedType),
    enabled: !!selectedType,
  })

  const compareMutation = useMutation({
    mutationFn: () => mlAPI.compareModelVersions(selectedType, baselineVersion, candidateVersion),
    onSuccess: (data) => setCompareResult(data),
  })

  const abTestMutation = useMutation({
    mutationFn: () => mlAPI.configureABTest(selectedType, {
      baseline_version: baselineVersion,
      candidate_version: candidateVersion,
      candidate_weight: candidateWeight,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-ab-test', selectedType] })
    },
  })

  const driftBaselineMutation = useMutation({
    mutationFn: (features: Record<string, number>) => mlAPI.setDriftBaseline(selectedType, features),
  })

  const driftDetectMutation = useMutation({
    mutationFn: (features: Record<string, number>) => mlAPI.detectDrift(selectedType, features),
    onSuccess: (data) => setDriftResult(data),
  })

  const versions = versionsQuery.data?.versions || []
  const abTest = abTestQuery.data?.ab_test

  const handleDriftBaseline = () => {
    try {
      const features = JSON.parse(driftFeatures)
      driftBaselineMutation.mutate(features)
    } catch {
      alert('Invalid JSON for drift features')
    }
  }

  const handleDriftDetect = () => {
    try {
      const features = JSON.parse(driftFeatures)
      driftDetectMutation.mutate(features)
    } catch {
      alert('Invalid JSON for drift features')
    }
  }

  return (
    <div className="ml-models-page">
      <div className="ml-models-header">
        <h2>ML Model Management</h2>
        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
          {MODEL_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="ml-models-grid">
        <section className="ml-card">
          <h3>Registered Models</h3>
          {modelsQuery.isLoading ? <p>Loading...</p> : (
            <ul className="model-list">
              {(modelsQuery.data?.models || []).map((m: any) => (
                <li key={m.name || m.model_type}>
                  <strong>{m.name || m.model_type}</strong>
                  <span>{m.status || m.stage || 'active'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ml-card">
          <h3>Version History</h3>
          {versionsQuery.isLoading ? <p>Loading versions...</p> : versions.length === 0 ? (
            <p className="muted">No versions in registry (MLflow may be offline).</p>
          ) : (
            <table className="versions-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Stage</th>
                  <th>Metrics</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v: any) => (
                  <tr key={v.version}>
                    <td>v{v.version}</td>
                    <td>{v.stage || v.current_stage || '—'}</td>
                    <td>
                      {v.metrics ? Object.entries(v.metrics).slice(0, 3).map(([k, val]) => (
                        <span key={k} className="metric-tag">{k}: {typeof val === 'number' ? val.toFixed(3) : String(val)}</span>
                      )) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="ml-card">
          <h3>Version Comparison</h3>
          <div className="form-row">
            <input placeholder="Baseline version" value={baselineVersion} onChange={(e) => setBaselineVersion(e.target.value)} />
            <input placeholder="Candidate version" value={candidateVersion} onChange={(e) => setCandidateVersion(e.target.value)} />
            <button onClick={() => compareMutation.mutate()} disabled={!baselineVersion || !candidateVersion || compareMutation.isPending}>
              {compareMutation.isPending ? 'Comparing...' : 'Compare'}
            </button>
          </div>
          {compareResult && (
            <div className="compare-result">
              <div>Baseline: v{compareResult.baseline_version}</div>
              <div>Candidate: v{compareResult.candidate_version}</div>
              {compareResult.metric_deltas && (
                <ul>
                  {Object.entries(compareResult.metric_deltas).map(([k, v]) => (
                    <li key={k}>{k}: {typeof v === 'number' ? (v as number).toFixed(4) : String(v)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="ml-card">
          <h3>A/B Test Configuration</h3>
          {abTest ? (
            <div className="ab-active">
              <div>Baseline: v{abTest.baseline_version}</div>
              <div>Candidate: v{abTest.candidate_version} ({pct(abTest.candidate_weight)} traffic)</div>
            </div>
          ) : (
            <p className="muted">No active A/B test.</p>
          )}
          <div className="form-row">
            <label>
              Candidate weight
              <input type="range" min={0.05} max={0.5} step={0.05} value={candidateWeight}
                onChange={(e) => setCandidateWeight(parseFloat(e.target.value))} />
              {pct(candidateWeight)}
            </label>
            <button onClick={() => abTestMutation.mutate()} disabled={!baselineVersion || !candidateVersion || abTestMutation.isPending}>
              {abTestMutation.isPending ? 'Saving...' : 'Start A/B Test'}
            </button>
          </div>
        </section>

        <section className="ml-card full-width">
          <h3>Drift Detection</h3>
          <textarea rows={3} value={driftFeatures} onChange={(e) => setDriftFeatures(e.target.value)}
            placeholder='{"pressure": 320, "temperature": 85}' />
          <div className="form-row">
            <button onClick={handleDriftBaseline} disabled={driftBaselineMutation.isPending}>
              Set Baseline
            </button>
            <button onClick={handleDriftDetect} disabled={driftDetectMutation.isPending}>
              Detect Drift
            </button>
          </div>
          {driftBaselineMutation.isSuccess && <p className="success">Baseline saved.</p>}
          {driftResult && (
            <div className={`drift-result ${driftResult.drift_detected ? 'drift-alert' : ''}`}>
              <strong>{driftResult.drift_detected ? 'Drift Detected' : 'No Drift'}</strong>
              {driftResult.feature_scores && (
                <ul>
                  {Object.entries(driftResult.feature_scores).map(([k, v]) => (
                    <li key={k}>{k}: z={typeof v === 'number' ? (v as number).toFixed(2) : String(v)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
