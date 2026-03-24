import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// Centralised log stream for the dashboard so we only poll the backend once.
const LogsContext = createContext(null)

export function LogsProvider({ children }) {
  const [logs, setLogs] = useState([])
  const [streaming, setStreaming] = useState(true)
  const [settings, setSettings] = useState({
    demoMode: false,
    simulation: true,
    alerts: true,
  })

  // Poll /api/logs while streaming is enabled, keeping only the most recent 200 entries.
  useEffect(() => {
    if (!streaming) return

    let cancelled = false

    const fetchOnce = async () => {
      try {
        const res = await fetch('/api/logs')
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled && Array.isArray(json.logs)) {
          setLogs(json.logs.slice(0, 200))
        }
      } catch {
        // best-effort streaming; errors are ignored so the loop can recover on the next tick
      }
    }

    fetchOnce()
    const id = setInterval(fetchOnce, 1000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [streaming])

  // Load current simulator settings so the toggles reflect backend state.
  useEffect(() => {
    let cancelled = false
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) {
          setSettings((prev) => ({ ...prev, ...json }))
        }
      } catch {
        // ignore; settings are purely advisory for the UI
      }
    }
    loadSettings()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(
    () => ({
      logs,
      streaming,
      setStreaming,
      settings,
      setSettings,
    }),
    [logs, streaming, settings],
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

