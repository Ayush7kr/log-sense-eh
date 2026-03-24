import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useLogsContext } from '../hooks/LogsContext'
import { Activity, Clock, ShieldAlert, Info } from 'lucide-react'

export default function ThreatHeatmapPage() {
  const { logs } = useLogsContext()

  // Generate a 24-hour grid for different event types
  const eventTypes = ['Failed Login', 'Brute Force', 'Privilege Escalation', 'Lateral Movement', 'Anomaly']
  
  const intensityData = useMemo(() => {
    const grid = {}
    eventTypes.forEach(type => {
      grid[type] = Array(24).fill(0)
    })

    logs.forEach(log => {
      const date = new Date(log.timestamp)
      const hour = date.getHours()
      if (grid[log.event]) {
        grid[log.event][hour] += 1
      } else if (log.risk === 'High' && grid['Anomaly']) {
        grid['Anomaly'][hour] += 1
      }
    })

    return grid
  }, [logs])

  const getIntensityColor = (count) => {
    if (count === 0) return 'bg-[var(--bg-panel)]' // Empty
    if (count < 3) return 'bg-blue-500/20 border-blue-500/30' // Low
    if (count < 8) return 'bg-amber-500/40 border-amber-500/50' // Medium
    return 'bg-red-500/60 border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)]' // High
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-[var(--bg-panel)] p-5 rounded-2xl border border-[var(--border-panel)]">
        <div>
          <h2 className="text-2xl font-bold font-sora flex items-center gap-3">
            <Activity className="w-7 h-7 text-accent-primary" />
            Temporal Threat Heatmap
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Analyzing security event density across a 24-hour operational window.
          </p>
        </div>
        <div className="flex gap-4 items-center px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-panel)]">
            <div className="flex items-center gap-2 text-[0.6rem] font-bold text-text-secondary uppercase tracking-widest">
                <div className="w-3 h-3 rounded bg-[var(--bg-panel)] border border-[var(--border-panel)]" />
                <span>Idle</span>
            </div>
            <div className="flex items-center gap-2 text-[0.6rem] font-bold text-text-secondary uppercase tracking-widest">
                <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30" />
                <span>Low</span>
            </div>
            <div className="flex items-center gap-2 text-[0.6rem] font-bold text-text-secondary uppercase tracking-widest">
                <div className="w-3 h-3 rounded bg-amber-500/40 border border-amber-500/50" />
                <span>Medium</span>
            </div>
            <div className="flex items-center gap-2 text-[0.6rem] font-bold text-text-secondary uppercase tracking-widest">
                <div className="w-3 h-3 rounded bg-red-500/60 border border-red-500/80" />
                <span>High</span>
            </div>
        </div>
      </div>

      <div className="glass-panel p-6 overflow-x-auto scroll-thin">
        <div className="min-w-[800px]">
          {/* Time Header */}
          <div className="grid grid-cols-[160px_1fr] mb-4">
            <div />
            <div className="flex justify-between px-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="text-[0.6rem] font-mono text-text-secondary w-full text-center">
                  {i < 10 ? `0${i}` : i}:00
                </span>
              ))}
            </div>
          </div>

          {/* Grid Rows */}
          <div className="space-y-2">
            {Object.entries(intensityData).map(([type, hours]) => (
              <div key={type} className="grid grid-cols-[160px_1fr] items-center group">
                <div className="text-[0.65rem] font-bold text-text-primary px-3 py-2 bg-[var(--bg-panel)] rounded-l-xl border-l border-t border-b border-[var(--border-panel)] group-hover:brightness-110 transition-colors">
                  {type}
                </div>
                <div className="flex h-10 gap-1 px-2 items-center bg-[var(--bg-main)] rounded-r-xl border border-[var(--border-panel)]">
                  {hours.map((count, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.01 }}
                      className={`h-7 w-full rounded-md border transition-all relative group/cell ${getIntensityColor(count)}`}
                    >
                        {count > 0 && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cell:block z-50">
                                <div className="bg-[var(--bg-panel)] text-[var(--text-primary)] text-[0.6rem] px-2 py-1 rounded border border-[var(--border-panel)] font-mono whitespace-nowrap shadow-2xl">
                                    {count} Events at {i}:00
                                </div>
                            </div>
                        )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 bg-gradient-to-br from-blue-500/5 to-transparent flex gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 h-fit">
                <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
                <h4 className="text-[0.65rem] font-bold uppercase tracking-widest text-blue-400 mb-1">Peak Activity Hour</h4>
                <p className="text-xl font-bold font-sora">14:00 - 15:00</p>
                <p className="text-[0.6rem] text-text-secondary mt-1">Highest frequency of successful authentication.</p>
            </div>
        </div>
        <div className="glass-panel p-5 bg-gradient-to-br from-red-500/5 to-transparent flex gap-4">
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 h-fit">
                <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div>
                <h4 className="text-[0.65rem] font-bold uppercase tracking-widest text-red-400 mb-1">Critical Cluster</h4>
                <p className="text-xl font-bold font-sora">02:00 UTC</p>
                <p className="text-[0.6rem] text-text-secondary mt-1">Brute force signatures detected in off-hours.</p>
            </div>
        </div>
        <div className="glass-panel p-5 bg-gradient-to-br from-purple-500/5 to-transparent flex gap-4">
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 h-fit">
                <Info className="w-5 h-5 text-purple-500" />
            </div>
            <div>
                <h4 className="text-[0.65rem] font-bold uppercase tracking-widest text-purple-400 mb-1">Temporal Drift</h4>
                <p className="text-xl font-bold font-sora">+12% Shift</p>
                <p className="text-[0.6rem] text-text-secondary mt-1">Security events moving into evening shifts.</p>
            </div>
        </div>
      </div>
    </div>
  )
}

