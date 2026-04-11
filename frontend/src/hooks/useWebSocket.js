import { useCallback, useEffect, useRef, useState } from 'react'

const RECONNECT_DELAY_MS = 3000

export default function useWebSocket(workspaceId) {
  const [lastMessage, setLastMessage] = useState(null)
  const [status, setStatus] = useState('disconnected') // 'connecting' | 'connected' | 'disconnected'
  const wsRef = useRef(null)
  const shouldReconnect = useRef(true)
  const reconnectTimer = useRef(null)

  const connect = useCallback(() => {
    if (!workspaceId) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    setStatus('connecting')
    const url = `ws://localhost:8001/ws/documents/${workspaceId}/?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setLastMessage(data)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      if (shouldReconnect.current) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [workspaceId])

  useEffect(() => {
    shouldReconnect.current = true
    connect()

    return () => {
      shouldReconnect.current = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }))
    }
  }, [])

  return { lastMessage, status, sendPing }
}
