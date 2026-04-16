import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './hooks/ThemeContext'
import { LogsProvider } from './hooks/LogsContext'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './layout/DashboardLayout'
import OverviewPage from './pages/OverviewPage'
import IncidentsPage from './pages/IncidentsPage'
import LiveLogsPage from './pages/LiveLogsPage'
import SystemLogsPage from './pages/SystemLogsPage'
import AlertsPage from './pages/AlertsPage'
import ThreatIntelPage from './pages/ThreatIntelPage'
import AiSearchPage from './pages/AiSearchPage'
import ThreatHeatmapPage from './pages/ThreatHeatmapPage'
import AnomalyPage from './pages/AnomalyPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('log-sense-auth') === 'true'
  })
  
  const [opsMode, setOpsMode] = useState(() => {
    return localStorage.getItem('log-sense-mode') || 'sim' // 'sim' | 'aws' | 'forensic'
  })

  const [booting, setBooting] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      // Sync strictly with backend across reloads
      fetch('/api/settings/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: opsMode })
      }).finally(() => setBooting(false))
    } else {
      setBooting(false)
    }
  }, [isAuthenticated, opsMode])

  const handleAuthenticated = (mode) => {
    localStorage.setItem('log-sense-auth', 'true')
    localStorage.setItem('log-sense-mode', mode)
    setOpsMode(mode)
    setIsAuthenticated(true)
  }

  if (booting) return <div className="h-screen w-screen bg-[var(--bg-main)] flex items-center justify-center text-[var(--accent-primary)] text-sm font-mono">Initializing System Constraints...</div>

  if (!isAuthenticated) {
    return <LoginPage onAuthenticated={handleAuthenticated} />
  }

  return (
    <ThemeProvider>
      <LogsProvider opsMode={opsMode}>
        <Routes>
          <Route path="/" element={<DashboardLayout opsMode={opsMode} />}>
            <Route index element={<OverviewPage />} />
            <Route path="incidents" element={<IncidentsPage />} />
            <Route path="logs" element={<LiveLogsPage />} />
            <Route path="pc-logs" element={<SystemLogsPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="threat-intel" element={<ThreatIntelPage />} />
            <Route path="ai-search" element={<AiSearchPage />} />
            <Route path="heatmap" element={<ThreatHeatmapPage />} />
            <Route path="anomalies" element={<AnomalyPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </LogsProvider>
    </ThemeProvider>
  )
}

export default App
