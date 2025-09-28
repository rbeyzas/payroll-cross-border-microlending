import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface RealtimeMetrics {
  totalLoans: number
  totalPayrolls: number
  totalTransactions: number
  activeUsers: number
  totalVolume: number
  networkHealth: string
  lastUpdated: string
}

interface RealtimeAlert {
  id: string
  type: string
  title: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  resolved: boolean
}

export function useRealtime() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null)
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([])
  const [error, setError] = useState<string | null>(null)

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  useEffect(() => {
    const newSocket = io(API_BASE)
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('🔌 Connected to real-time updates')
      setConnected(true)
      setError(null)
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
    })

    newSocket.on('analytics:metrics', (data: RealtimeMetrics) => {
      setMetrics(data)
    })

    newSocket.on('monitoring:alert', (alert: RealtimeAlert) => {
      setAlerts((prev) => [alert, ...prev.slice(0, 99)])
    })

    return () => {
      newSocket.close()
    }
  }, [API_BASE])

  const getActiveAlerts = useCallback(() => {
    return alerts.filter((alert) => !alert.resolved)
  }, [alerts])

  const getCriticalAlerts = useCallback(() => {
    return alerts.filter((alert) => !alert.resolved && alert.severity === 'critical')
  }, [alerts])

  const isSystemHealthy = useCallback(() => {
    return metrics?.networkHealth === 'healthy'
  }, [metrics])

  return {
    socket,
    connected,
    metrics,
    alerts,
    error,
    getActiveAlerts,
    getCriticalAlerts,
    isSystemHealthy,
  }
}
