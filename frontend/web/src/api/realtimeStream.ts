type RealtimeSnapshotPayload = {
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function toWebSocketBaseUrl(httpBaseUrl: string): string {
  const url = new URL(httpBaseUrl)
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${url.host}`
}

export function startRealtimeStream(handlers: RealtimeStreamHandlers): () => void {
  const token = localStorage.getItem('access_token')
  if (!token) {
    handlers.onTransportChange?.('disconnected')
    return () => undefined
  }

  let closed = false
  let socket: WebSocket | null = null
  let sse: EventSource | null = null
  let wsRetryTimeout: number | undefined

  const cleanup = () => {
    if (wsRetryTimeout) {
      window.clearTimeout(wsRetryTimeout)
      wsRetryTimeout = undefined
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

  const trySSEFallback = () => {
    if (closed || sse) {
      return
    }

    const sseUrl = `${API_BASE_URL}/stream/realtime/sse?token=${encodeURIComponent(token)}`
    sse = new EventSource(sseUrl)
    handlers.onTransportChange?.('sse')

    sse.addEventListener('snapshot', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as RealtimeSnapshotPayload
        handlers.onSnapshot(payload)
      } catch {
        // Ignore malformed payloads to keep stream alive.
      }
    })

    sse.onerror = () => {
      if (!closed) {
        handlers.onTransportChange?.('disconnected')
      }
    }
  }

  const connectWebSocket = () => {
    if (closed) {
      return
    }

    const wsBaseUrl = toWebSocketBaseUrl(API_BASE_URL)
    const wsUrl = `${wsBaseUrl}/stream/realtime/ws?token=${encodeURIComponent(token)}`

    socket = new WebSocket(wsUrl)

    socket.onopen = () => {
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
      if (closed) {
        return
      }
      trySSEFallback()
      wsRetryTimeout = window.setTimeout(connectWebSocket, 8000)
    }
  }

  connectWebSocket()

  return () => {
    closed = true
    handlers.onTransportChange?.('disconnected')
    cleanup()
  }
}

