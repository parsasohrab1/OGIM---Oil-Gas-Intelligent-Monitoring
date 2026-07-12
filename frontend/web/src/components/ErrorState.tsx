import './ErrorState.css'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export default function ErrorState({ message = 'Failed to load data from the backend.', onRetry }: ErrorStateProps) {
  return (
    <div className="error-state">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry}>Retry</button>
      )}
    </div>
  )
}
