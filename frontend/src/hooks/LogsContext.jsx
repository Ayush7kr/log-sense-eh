import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useSocket } from './useSocket'

const LogsContext = createContext(null)

export function LogsProvider({ children, opsMode }) {
  const [logs, setLogs] = useState([])
  const [alerts, setAlerts] = useState([])
  const [incidents, setIncidents] = useState([])
  const [stats, setStats] = useState(null)
  const [streaming, setStreaming] = useState(opsMode === 'sim')
  const [paused, setPaused] = useState(false)
  const bufferRef = useRef([])
  const { socket, connected, on } = useSocket()
  const [settings, setSettings] = useState({
    demoMode: false,
    simulation: opsMode === 'sim',
    notifications: true,
    intensity: 'medium',
  })
  const [dashboardData, setDashboardData] = useState(null)
  const [ec2Status, setEc2Status] = useState({ connected: false })

  // Initial fetch to populate logs & reset state on mode switch
  useEffect(() => {
    setLogs([])
    setAlerts([])
    setIncidents([])
    setDashboardData(null)

    const loadInitial = async () => {
      try {
        const res = await fetch(`/api/logs?mode=${opsMode}`)
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.logs)) setLogs(json.logs.slice(0, 200))
        }
      } catch {
        // best-effort
      }
    }
    loadInitial()
  }, [opsMode])

  // Socket.IO listeners
  useEffect(() => {
    if (!socket) return

    const cleanups = []

    // New log events
    cleanups.push(
      on('log:new', (log) => {
        let expectedSource = 'SIMULATION';
        if (opsMode === 'aws') expectedSource = 'AWS';
        if (opsMode === 'forensic') expectedSource = 'FORENSIC';
        if (log.source && log.source !== expectedSource) return;

        if (paused) {
          bufferRef.current.push(log)
          if (bufferRef.current.length > 500) bufferRef.current.shift()
        } else {
          setLogs((prev) => [log, ...prev].slice(0, 200))
        }
      })
    )

    // Dashboard stats
    cleanups.push(on('stats:update', (data) => setDashboardData(data)))

    // EC2 status
    cleanups.push(on('ec2:status', (status) => setEc2Status(status)))

    // Data cleared
    cleanups.push(on('data:cleared', () => {
      setLogs([])
      setDashboardData(null)
    }))

    // Alerts and Incidents
    cleanups.push(on('alert:new', (alert) => {
      let expectedSource = 'SIMULATION';
      if (opsMode === 'aws') expectedSource = 'AWS';
      if (opsMode === 'forensic') expectedSource = 'FORENSIC';
      if (alert.source !== expectedSource) return;
      setAlerts((prev) => [alert, ...prev].slice(0, 50))
    }))

    cleanups.push(on('alert:update', (updatedAlert) => {
      let expectedSource = 'SIMULATION';
      if (opsMode === 'aws') expectedSource = 'AWS';
      if (opsMode === 'forensic') expectedSource = 'FORENSIC';
      if (updatedAlert.source && updatedAlert.source !== expectedSource) return;
      
      setAlerts((prev) => {
        if (updatedAlert.status === 'resolved') {
          return prev.filter(al => al.id !== updatedAlert.id)
        }
        return prev.map(al => al.id === updatedAlert.id ? { ...al, ...updatedAlert } : al)
      })
    }))

    cleanups.push(on('incident:new', (incident) => {
      let expectedSource = 'SIMULATION';
      if (opsMode === 'aws') expectedSource = 'AWS';
      if (opsMode === 'forensic') expectedSource = 'FORENSIC';
      if (incident.source !== expectedSource) return;
      setIncidents((prev) => [incident, ...prev].slice(0, 50))
    }))

    cleanups.push(on('incident:update', (updatedIncident) => {
      let expectedSource = 'SIMULATION';
      if (opsMode === 'aws') expectedSource = 'AWS';
      if (opsMode === 'forensic') expectedSource = 'FORENSIC';
      if (updatedIncident.source && updatedIncident.source !== expectedSource) return;

      setIncidents((prev) => {
        if (updatedIncident.status === 'resolved') {
          return prev.filter(inc => inc.id !== updatedIncident.id)
        }
        let exists = false;
        const mapped = prev.map(inc => {
          if (inc.id === updatedIncident.id) {
            exists = true;
            return { ...inc, ...updatedIncident }
          }
          return inc;
        });
        if (!exists) return [updatedIncident, ...mapped].slice(0, 50);
        return mapped;
      })
    }))

    return () => cleanups.forEach((fn) => fn())
  }, [socket, on, paused])

  // When unpaused, flush buffer
  useEffect(() => {
    if (!paused && bufferRef.current.length > 0) {
      setLogs((prev) => [...bufferRef.current.reverse(), ...prev].slice(0, 200))
      bufferRef.current = []
    }
  }, [paused])

  // Load settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const json = await res.json()
          setSettings((prev) => ({ ...prev, ...json }))
        }
      } catch {
        // ignore
      }
    }
    loadSettings()
  }, [])

  // Fallback polling when WebSocket is not connected
  useEffect(() => {
    if (connected || paused) return

    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/logs?mode=${opsMode}`)
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.logs)) setLogs(json.logs.slice(0, 200))
        }
      } catch {
        // ignore
      }
    }, 2000)

    return () => clearInterval(id)
  }, [connected, paused, opsMode])

  const togglePause = useCallback(() => {
    setPaused((p) => !p)
  }, [])

  const value = useMemo(
    () => ({
      logs,
      alerts,
      incidents,
      stats,
      streaming,
      setStreaming,
      paused,
      setPaused,
      togglePause,
      settings,
      setSettings,
      dashboardData,
      connected,
      ec2Status,
      opsMode
    }),
    [logs, alerts, incidents, stats, streaming, paused, settings, dashboardData, connected, ec2Status, togglePause, opsMode]
  )

  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>
}

export function useLogsContext() {
  const ctx = useContext(LogsContext)
  if (!ctx) {
    throw new Error('useLogsContext must be used within a LogsProvider')
  }
  return ctx
}
