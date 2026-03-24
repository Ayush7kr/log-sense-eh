import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { MotionConfig, AnimatePresence } from 'framer-motion'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './layout/DashboardLayout'
import OverviewPage from './pages/OverviewPage'
import LiveLogsPage from './pages/LiveLogsPage'
import SystemLogsPage from './pages/SystemLogsPage'
import AlertsPage from './pages/AlertsPage'
import AiSearchPage from './pages/AiSearchPage'
import ThreatHeatmapPage from './pages/ThreatHeatmapPage'
import AnomalyPage from './pages/AnomalyPage'
import SettingsPage from './pages/SettingsPage'
import IncidentsPage from './pages/IncidentsPage'
import ThreatIntelPage from './pages/ThreatIntelPage'
import { LogsProvider } from './hooks/LogsContext'
import { ThemeProvider } from './hooks/ThemeContext'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen">
          <AnimatePresence mode="wait">
            {!isAuthenticated ? (
              <Routes>
                <Route
                  path="*"
                  element={<LoginPage onAuthenticated={() => setIsAuthenticated(true)} />}
                />
              </Routes>
            ) : (
              <LogsProvider>
                <Routes>
                  <Route path="/" element={<DashboardLayout />}>
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
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </ThemeProvider>
  )
}

export default App
