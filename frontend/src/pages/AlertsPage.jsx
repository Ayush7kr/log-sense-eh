import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, Search } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useLogsContext } from '../hooks/LogsContext'
import { useSOCStore } from '../store/SOCStore'
import { useNavigate } from 'react-router-dom'

function AlertsPage() {
  const { settings } = useLogsContext()
  const { data, refetch } = useApi('/api/alerts', { pollMs: 4000 })
  const setSystemStatus = useSOCStore((state) => state.setSystemStatus)
  const navigate = useNavigate()
  const alerts = data?.alerts ?? []

  const handleInvestigate = useCallback(
    async (id) => {
      try {
        await fetch('/api/alerts/investigate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertId: id }),
        })
        setSystemStatus('investigating')
        refetch()
        // Navigate to incidents to show the detail
        navigate('/incidents')
      } catch {
        // best-effort
      }
    },
    [refetch, setSystemStatus, navigate],
  )

  const handleResolve = useCallback(
    async (id) => {
      try {
        await fetch('/api/alerts/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertId: id }),
        })
        refetch()
      } catch {
        // ignore; resolved alerts will disappear on the next successful poll
      }
    },
    [refetch],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-panel)]">
        <div>
          <h2 className="text-xl font-bold font-sora text-[var(--text-primary)]">Operational Alerts</h2>
          <p className="text-xs text-text-secondary mt-1">
            Real-time threat detection from the security simulation engine.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input className="glass-input glass-input-search text-xs w-64" placeholder="Search alerts..." />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {alerts.map((alert, idx) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="glass-panel p-3 md:p-4 border-red-500/30 bg-gradient-to-br from-red-500/10 via-slate-950/80 to-slate-950/95"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{alert.event}</p>
                  <span className="inline-flex items-center rounded-full bg-red-500/15 border border-red-500/40 px-1.5 py-0.5 text-[0.65rem] font-semibold text-red-400">
                    Score {alert.risk_score}
                  </span>
                  {alert.status === 'investigating' && (
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/40 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-300">
                      Investigating
                    </span>
                  )}
                </div>
                <p className="text-[0.7rem] text-[var(--text-secondary)] mt-1">
                  {alert.description || `Potential malicious activity detected from ${alert.ip}.`}
                </p>
                  <p className="text-[0.65rem] text-[var(--text-secondary)] mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[0.7rem]">
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    settings.notifications ? 'bg-red-400 animate-pulse' : 'bg-gray-400'
                  }`}
                />
                <span>Requires triage</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleInvestigate(alert.id)}
                  disabled={alert.status === 'investigating'}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border-panel)] px-2.5 py-1 text-[0.65rem] text-[var(--text-secondary)] hover:border-blue-500/60 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span>{alert.status === 'investigating' ? 'Investigating...' : 'Investigate'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve(alert.id)}
                  className="inline-flex items-center rounded-full border border-[var(--border-panel)] px-2.5 py-1 text-[0.65rem] text-[var(--text-secondary)] hover:border-emerald-500/60 hover:text-emerald-500 transition-colors"
                >
                  Mark safe
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {!alerts.length && (
          <div className="col-span-full glass-panel p-4 text-center text-xs text-[var(--text-secondary)]">
            No high-risk alerts yet. Enable demo attack mode in Settings to spike activity.
          </div>
        )}
      </div>
    </div>
  )
}

export default AlertsPage

