import { ApiError } from '../lib/api'

const TITLES: Record<string, string> = {
  invalid_key: 'API key rejected',
  rate_limited: 'Rate limited',
  network: 'Provider unreachable',
  provider_error: 'Provider error',
  bad_request: 'Invalid request',
  not_found: 'Not found',
  offline: 'You are offline',
  backend_down: 'Backend not running',
}

export default function ErrorBanner({
  error,
  onRetry,
  onDismiss,
}: {
  error: unknown
  onRetry?: () => void
  onDismiss?: () => void
}) {
  if (!error) return null
  const isApi = error instanceof ApiError
  const title = isApi ? (TITLES[error.type] ?? 'Error') : 'Unexpected error'
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div
      role="alert"
      className="my-3 flex flex-col gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-red-300">{message}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="rounded-lg border border-red-500/40 px-3 py-1.5 font-medium text-red-300 hover:bg-red-500/20"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
