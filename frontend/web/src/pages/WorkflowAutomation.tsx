import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { reportingAPI } from '../api/services'

type Step = {
  id: string
  type: string
  config: Record<string, any>
  depends_on: string[]
}

export default function WorkflowAutomation() {
  const [name, setName] = useState('Daily Ops Workflow')
  const [description, setDescription] = useState('Auto run DQ + notify')
  const [scheduleMinutes, setScheduleMinutes] = useState('60')
  const [steps, setSteps] = useState<Step[]>([
    { id: 'step1', type: 'data_quality_lineage', config: { lookback_hours: 24 }, depends_on: [] },
    { id: 'step2', type: 'http_request', config: { method: 'POST', url: 'http://localhost:8004/alerts/TEST/acknowledge' }, depends_on: ['step1'] }
  ])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('')

  const workflowsQuery = useQuery({
    queryKey: ['workflows'],
    queryFn: () => reportingAPI.listWorkflows(),
    refetchInterval: 15000
  })

  const stepTypesQuery = useQuery({
    queryKey: ['workflow-step-types'],
    queryFn: () => reportingAPI.getWorkflowStepTypes()
  })

  const createMutation = useMutation({
    mutationFn: () =>
      reportingAPI.createWorkflow({
        name,
        description,
        schedule_minutes: Number(scheduleMinutes) || undefined,
        steps
      }),
    onSuccess: () => workflowsQuery.refetch()
  })

  const runMutation = useMutation({
    mutationFn: () => reportingAPI.runWorkflow(selectedWorkflowId, {})
  })

  const runsQuery = useQuery({
    queryKey: ['workflow-runs', selectedWorkflowId],
    queryFn: () => reportingAPI.getWorkflowRuns(selectedWorkflowId),
    enabled: !!selectedWorkflowId
  })

  const addStep = () => {
    const idx = steps.length + 1
    setSteps((prev) => [
      ...prev,
      { id: `step${idx}`, type: 'http_request', config: { method: 'GET', url: 'http://localhost:8005/health' }, depends_on: [] }
    ])
  }

  const stepTypeOptions = useMemo(() => stepTypesQuery.data?.step_types || [], [stepTypesQuery.data])

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Workflow Automation (Airflow-like + Visual Builder)</h2>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.8rem', marginTop: '1rem' }}>
        <h3>Create Workflow</h3>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workflow name" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <input value={scheduleMinutes} onChange={(e) => setScheduleMinutes(e.target.value)} placeholder="Schedule minutes (optional)" />
        </div>

        <h4 style={{ marginTop: '0.8rem' }}>Steps</h4>
        {steps.map((step, idx) => (
          <div key={step.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: '0.6rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'grid', gap: '0.4rem' }}>
              <input
                value={step.id}
                onChange={(e) => {
                  const v = e.target.value
                  setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, id: v } : s)))
                }}
                placeholder="Step ID"
              />
              <select
                value={step.type}
                onChange={(e) => {
                  const v = e.target.value
                  setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, type: v } : s)))
                }}
              >
                {stepTypeOptions.map((opt: any) => (
                  <option key={opt.type} value={opt.type}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <textarea
                value={JSON.stringify(step.config)}
                onChange={(e) => {
                  const txt = e.target.value
                  try {
                    const parsed = JSON.parse(txt)
                    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, config: parsed } : s)))
                  } catch {
                    // keep editing until valid JSON
                  }
                }}
                rows={4}
              />
              <input
                value={step.depends_on.join(',')}
                onChange={(e) => {
                  const deps = e.target.value.split(',').map((x) => x.trim()).filter(Boolean)
                  setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, depends_on: deps } : s)))
                }}
                placeholder="depends_on (comma separated)"
              />
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={addStep}>Add Step</button>
          <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Workflow'}
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.8rem', marginTop: '1rem' }}>
        <h3>Workflows</h3>
        <select value={selectedWorkflowId} onChange={(e) => setSelectedWorkflowId(e.target.value)}>
          <option value="">Select workflow</option>
          {(workflowsQuery.data?.workflows || []).map((wf: any) => (
            <option key={wf.workflow_id} value={wf.workflow_id}>
              {wf.workflow_id} - {wf.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => runMutation.mutate()}
          disabled={!selectedWorkflowId || runMutation.isPending}
          style={{ marginLeft: '0.5rem' }}
        >
          {runMutation.isPending ? 'Running...' : 'Run Now'}
        </button>

        {runMutation.data && (
          <pre style={{ marginTop: '0.8rem', background: '#f8f8f8', padding: '0.6rem', maxHeight: 240, overflow: 'auto' }}>
            {JSON.stringify(runMutation.data, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.8rem', marginTop: '1rem' }}>
        <h3>Recent Runs</h3>
        <pre style={{ background: '#f8f8f8', padding: '0.6rem', maxHeight: 260, overflow: 'auto' }}>
          {JSON.stringify(runsQuery.data?.runs || [], null, 2)}
        </pre>
      </div>
    </div>
  )
}

