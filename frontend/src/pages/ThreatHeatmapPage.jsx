import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useLogsContext } from '../hooks/LogsContext'
import { Activity, Clock, ShieldAlert, Info } from 'lucide-react'

export default function ThreatHeatmapPage() {
  const { logs } = useLogsContext()
  const [hoveredCell, setHoveredCell] = useState(null)

  const eventTypes = ['Failed Login', 'Brute Force Attempt', 'Privilege Escalation', 'Port Scan', 'Network Connection']
  
  const intensityData = useMemo(() => {
    const grid = {}
    eventTypes.forEach(type => {
      grid[type] = Array(24).fill(0)
    })

    logs.forEach(log => {
      const date = new Date(log.timestamp)
      const hour = date.getHours()
      
      // Match events to categories
      for (const type of eventTypes) {
        if (log.event.includes(type.split(' ')[0])) {
          grid[type][hour] += 1
          break
        }
      }
      
      // Catch-all for high risk into first matching
      if (log.risk === 'High') {
        const matched = eventTypes.find(t => log.event.includes(t.split(' ')[0]))
        if (!matched && grid['Port Scan']) {
          grid['Port Scan'][hour] += 1
        }
      }
    })

    return grid
  }, [logs])

  const stats = useMemo(() => {
    if (!logs || logs.length === 0) {
      return {
        peakHour: 'N/A', peakDesc: 'Awaiting telemetry.',
        criticalHour: 'N/A', criticalDesc: 'No critical events detected.',
        driftText: '0%', driftDesc: 'Insufficient data.'
      }
    }

    const hourCounts = Array(24).fill(0)
    const criticalCounts = Array(24).fill(0)
    let amCount = 0, pmCount = 0

    logs.forEach(log => {
      const h = new Date(log.timestamp).getHours()
      hourCounts[h]++
      if (log.risk === 'High' || log.event.includes('Brute Force') || log.event.includes('Privilege')) {
        criticalCounts[h]++
      }
      if (h >= 6 && h < 18) amCount++
      else pmCount++
    })

    const maxHour = hourCounts.indexOf(Math.max(...hourCounts))
    const endHour = (maxHour + 1) % 24
    const peakHour = `${String(maxHour).padStart(2,'0')}:00 - ${String(endHour).padStart(2,'0')}:00`
    const peakDesc = `Highest volume of events (${hourCounts[maxHour]}).`

    const maxCrit = Math.max(...criticalCounts)
    let criticalHour = 'None', criticalDesc = 'No critical event clusters.'
    if (maxCrit > 0) {
      const cHour = criticalCounts.indexOf(maxCrit)
      criticalHour = `${String(cHour).padStart(2,'0')}:00`
      criticalDesc = `High-risk signatures (${maxCrit}) detected.`
    }

    const total = logs.length
    const offHoursPct = Math.round((pmCount / total) * 100)
    const driftText = offHoursPct > 50 ? `+${offHoursPct - 50}% Shift` : `${offHoursPct}% Off-hours`
    const driftDesc = offHoursPct > 50 ? 'Events moving into evening shifts.' : 'Activity mostly in standard hours.'

    return { peakHour, peakDesc, criticalHour, criticalDesc, driftText, driftDesc }
  }, [logs])

  const getIntensityColor = (count) => {
    if (count === 0) return 'bg-[var(--bg-panel)] border-transparent'
    if (count < 3) return 'bg-blue-500/20 border-blue-500/30'
    if (count < 8) return 'bg-amber-500/40 border-amber-500/50'
    return 'bg-red-500/60 border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
  }

  const getIntensityLabel = (count) => {
    if (count === 0) return 'Idle'
    if (count < 3) return 'Low'
    if (count < 8) return 'Medium'
    return 'High'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-panel)] p-5 rounded-2xl border border-[var(--border-panel)]">
        <div>
          <h2 className="text-2xl font-bold font-sora flex items-center gap-3">
            <Activity className="w-7 h-7 text-[var(--accent-primary)]" />
            Temporal Threat Heatmap
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Security event density across a 24-hour operational window.
          </p>
        </div>
        {/* Legend */}
        <div className="flex gap-4 items-center px-4 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-panel)]">
          <div className="flex items-center gap-2 text-[0.6rem] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
            <div className="w-3 h-3 rounded bg-[var(--bg-panel)] border border-[var(--border-panel)]" />
            <span>Idle</span>
          </div>
          <div className="flex items-center gap-2 text-[0.6rem] font-bold text-blue-400 uppercase tracking-widest">
            <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2 text-[0.6rem] font-bold text-amber-400 uppercase tracking-widest">
            <div className="w-3 h-3 rounded bg-amber-500/40 border border-amber-500/50" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2 text-[0.6rem] font-bold text-red-400 uppercase tracking-widest">
            <div className="w-3 h-3 rounded bg-red-500/60 border border-red-500/80" />
            <span>High</span>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 overflow-x-auto scroll-thin">
        <div className="min-w-[800px]">
          {/* Time Header */}
          <div className="grid grid-cols-[140px_1fr] mb-4">
            <div />
            <div className="flex justify-between px-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="text-[0.55rem] font-mono text-[var(--text-secondary)] w-full text-center">
                  {String(i).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>

          {/* Grid Rows */}
          <div className="space-y-2">
            {Object.entries(intensityData).map(([type, hours]) => (
              <div key={type} className="grid grid-cols-[140px_1fr] items-center group">
                <div className="text-[0.65rem] font-bold text-[var(--text-primary)] px-3 py-2 bg-[var(--bg-panel)] rounded-l-xl border-l border-t border-b border-[var(--border-panel)] group-hover:bg-[var(--accent-glow)] transition-colors truncate">
                  {type}
                </div>
                <div className="flex h-10 gap-0.5 px-1 items-center bg-[var(--bg-main)] rounded-r-xl border border-[var(--border-panel)]">
                  {hours.map((count, i) => (
                    <div
                      key={i}
                      className="relative h-7 w-full"
                      onMouseEnter={() => setHoveredCell({ type, hour: i, count })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.008 }}
                        className={`h-full w-full rounded-sm border transition-all cursor-default ${getIntensityColor(count)} ${
                          count > 0 ? 'hover:brightness-125 hover:scale-110 hover:z-10' : ''
                        }`}
                      >
                        {/* Show count label for high intensity cells */}
                        {count >= 5 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[0.5rem] font-bold text-white/80">
                            {count}
                          </span>
                        )}
                      </motion.div>

                      {/* Tooltip */}
                      {hoveredCell && hoveredCell.type === type && hoveredCell.hour === i && count > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                          <div className="bg-[var(--bg-panel)] text-[var(--text-primary)] text-[0.6rem] px-3 py-1.5 rounded-lg border border-[var(--border-panel)] font-mono whitespace-nowrap shadow-2xl backdrop-blur-xl">
                            <span className="font-bold">{count}</span> events at <span className="font-bold">{String(i).padStart(2,'0')}:00</span>
                            <span className={`ml-2 px-1 py-0.5 rounded text-[0.5rem] ${
                              getIntensityLabel(count) === 'High' ? 'bg-red-500/20 text-red-400' :
                              getIntensityLabel(count) === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>{getIntensityLabel(count)}</span>
                          </div>
                        </div>
                      )}
                    </div>
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
            <p className="text-xl font-bold font-sora">{stats.peakHour}</p>
            <p className="text-[0.65rem] text-[var(--text-secondary)] mt-1">{stats.peakDesc}</p>
          </div>
        </div>
        <div className="glass-panel p-5 bg-gradient-to-br from-red-500/5 to-transparent flex gap-4">
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 h-fit">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h4 className="text-[0.65rem] font-bold uppercase tracking-widest text-red-400 mb-1">Critical Cluster</h4>
            <p className="text-xl font-bold font-sora">{stats.criticalHour}</p>
            <p className="text-[0.65rem] text-[var(--text-secondary)] mt-1">{stats.criticalDesc}</p>
          </div>
        </div>
        <div className="glass-panel p-5 bg-gradient-to-br from-purple-500/5 to-transparent flex gap-4">
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 h-fit">
            <Info className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h4 className="text-[0.65rem] font-bold uppercase tracking-widest text-purple-400 mb-1">Temporal Drift</h4>
            <p className="text-xl font-bold font-sora">{stats.driftText}</p>
            <p className="text-[0.65rem] text-[var(--text-secondary)] mt-1">{stats.driftDesc}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
