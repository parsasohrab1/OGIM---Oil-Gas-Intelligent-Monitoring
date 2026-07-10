import { getApiBaseUrl, toWebSocketBaseUrl } from './config'

export type RealtimeSnapshotPayload = {
  type: 'snapshot'
  timestamp: string
  data: {
    sensor_records: Array<any>
    alerts: {
      count?: number
      alerts?: Array<any>
    }
  }
}

type RealtimeStreamHandlers = {
  onSnapshot: (payload: RealtimeSnapshotPayload) => void
  onTransportChange?: (transport: 'websocket' | 'sse' | 'disconnected') => void
}

const WS_RETRY_BASE_MS = 2000
const WS_RETRY_MAX_MS = 30000
const SSE_RETRY_BASE_MS = 3000
const SSE_RETRY_MAX_MS = 20000

export function startRealtimeStream(handlers: RealtimeStreamHandlers): () => void {
  const token = localStorage.getItem('access_token')
  if (!token) {
    handlers.onTransportChange?.('disconnected')
    return () => undefined
  }

  const apiBase = getApiBaseUrl()
  let closed = false
  let socket: WebSocket | null = null
  let sse: EventSource | null = null
  let wsRetryTimeout: number | undefined
  let sseRetryTimeout: number | undefined
  let wsRetryAttempt = 0
  let sseRetryAttempt = 0

  const cleanup = () => {
    if (wsRetryTimeout) {
      window.clearTimeout(wsRetryTimeout)
      wsRetryTimeout = undefined
    }
    if (sseRetryTimeout) {
      window.clearTimeout(sseRetryTimeout)
      sseRetryTimeout = undefined
    }
    if (socket) {
      socket.close()
      socket = null
    }
    if (sse) {
      sse.close()
      sse = null
    }
  }

  const scheduleWsRetry = () => {
    if (closed) return
    const delay = Math.min(WS_RETRY_BASE_MS * 2 ** wsRetryAttempt, WS_RETRY_MAX_MS)
    wsRetryAttempt += 1
    wsRetryTimeout = window.setTimeout(connectWebSocket, delay)
  }

  const scheduleSseRetry = () => {
    if (closed || sse) return
    const delay = Math.min(SSE_RETRY_BASE_MS * 2 ** sseRetryAttempt, SSE_RETRY_MAX_MS)
    sseRetryAttempt += 1
    sseRetryTimeout = window.setTimeout(trySSEFallback, delay)
  }

  const trySSEFallback = () => {
    if (closed || sse) return

    const sseUrl = `${apiBase}/stream/realtime/sse?token=${encodeURIComponent(token)}`
    sse = new EventSource(sseUrl)
    handlers.onTransportChange?.('sse')

    sse.addEventListener('snapshot', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as RealtimeSnapshotPayload
        handlers.onSnapshot(payload)
        sseRetryAttempt = 0
      } catch {
        // Ignore malformed payloads to keep stream alive.
      }
    })

    sse.onerror = () => {
      if (sse) {
        sse.close()
        sse = null
      }
      if (!closed) {
        handlers.onTransportChange?.('disconnected')
        scheduleSseRetry()
      }
    }
  }

  const connectWebSocket = () => {
    if (closed) return

    const wsBaseUrl = toWebSocketBaseUrl(apiBase)
    const wsUrl = `${wsBaseUrl}/stream/realtime/ws?token=${encodeURIComponent(token)}`
    socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      wsRetryAttempt = 0
      handlers.onTransportChange?.('websocket')
      if (sse) {
        sse.close()
        sse = null
      }
    }

    socket.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as RealtimeSnapshotPayload
        handlers.onSnapshot(payload)
      } catch {
        // Ignore malformed payloads to keep stream alive.
      }
    }

    socket.onerror = () => {
      trySSEFallback()
    }

    socket.onclose = () => {
      socket = null
      if (closed) return
      trySSEFallback()
      scheduleWsRetry()
    }
  }

  connectWebSocket()

  return () => {
    closed = true
    handlers.onTransportChange?.('disconnected')
    cleanup()
  }
}
