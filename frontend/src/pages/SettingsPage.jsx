import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLogsContext } from '../hooks/LogsContext'

function SettingsToggle({ label, description, checked, onChange, accent }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div>
        <p className="text-xs font-medium text-slate-200">{label}</p>
        <p className="text-[0.7rem] text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border border-slate-600/80 bg-slate-900/90 transition-colors ${
          checked ? accent : ''
        }`}
      >
        <motion.span
          layout
          className="h-4 w-4 rounded-full bg-slate-200 shadow-md"
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          style={{ x: checked ? 18 : 4 }}
        />
      </button>
    </div>
  )
}

function SettingsPage() {
  const { settings, setSettings, setStreaming } = useLogsContext()
  const [localSettings, setLocalSettings] = useState(settings)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const updateSettings = async (next) => {
    const merged = { ...localSettings, ...next }
    setLocalSettings(merged)
    setSettings(merged)
    // Real-time simulation toggle controls the backend simulator;
    // the separate "Start/Stop streaming" button on the Live Logs page controls frontend polling.
    if (typeof next.simulation === 'boolean') {
      setStreaming(next.simulation)
    }
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demoMode: merged.demoMode,
          simulation: merged.simulation,
          alerts: merged.alerts,
        }),
      })
    } catch {
      // best-effort only; UI state will reconcile on next successful GET /api/settings
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Settings</h2>
          <p className="text-xs text-slate-400 mt-1">
            Tune simulation behaviour and UI preferences for this demo environment.
          </p>
        </div>
      </div>

      <div className="glass-panel p-3 md:p-4 space-y-3">
        <p className="text-xs font-medium text-slate-300 mb-1">Simulation controls</p>
        <SettingsToggle
          label="Demo attack mode"
          description="Increase the frequency of high-risk simulated events (privilege escalation, port scans)."
          checked={!!localSettings.demoMode}
          onChange={(value) => updateSettings({ demoMode: value })}
          accent="border-red-500/70 bg-red-500/20"
        />
        <SettingsToggle
          label="Real-time simulation"
          description="Toggle whether new simulated logs are streamed continuously to the dashboard."
          checked={!!localSettings.simulation}
          onChange={(value) => updateSettings({ simulation: value })}
          accent="border-emerald-500/70 bg-emerald-500/10"
        />
        <SettingsToggle
          label="Alert notifications"
          description="Surface visual attention cues for new high-risk alerts inside this UI."
          checked={!!localSettings.notifications}
          onChange={(value) => updateSettings({ notifications: value })}
          accent="border-neon-blue/70 bg-neon-blue/10"
        />
      </div>
    </div>
  )
}

export default SettingsPage

