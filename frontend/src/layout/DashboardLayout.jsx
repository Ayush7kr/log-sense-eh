import { NavLink, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Shield,
  Activity,
  TerminalSquare,
  BellRing,
  Search,
  Globe2,
  Radar,
  Settings,
  PlayCircle,
  PauseCircle,
  GanttChartSquare,
  BarChart3,
} from 'lucide-react'
import { useLogsContext } from '../hooks/LogsContext'
import { ThemeToggle } from '../components/ThemeToggle'

const navItems = [
  { to: '/', label: 'Overview', icon: Shield },
  { to: '/incidents', label: 'Incidents', icon: GanttChartSquare },
  { to: '/logs', label: 'Live Logs', icon: TerminalSquare },
  { to: '/alerts', label: 'Alerts', icon: BellRing },
  { to: '/threat-intel', label: 'Threat Intel', icon: BarChart3 },
  { to: '/ai-search', label: 'AI Search', icon: Search },
  { to: '/heatmap', label: 'Threat Heatmap', icon: Globe2 },
  { to: '/anomalies', label: 'Anomalies', icon: Radar },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function DashboardLayout() {
  const { streaming, setStreaming } = useLogsContext()

  const handleStartLogs = async () => {
    setStreaming(true)
    try {
      await fetch('/api/simulation/start', { method: 'POST' })
    } catch {
      // if the request fails we still keep the UI responsive; the next poll will reconcile state
    }
  }

  const handleStopLogs = async () => {
    setStreaming(false)
    try {
      await fetch('/api/simulation/stop', { method: 'POST' })
    } catch {
      // ignore errors to keep header controls snappy
    }
  }
  return (
    <div className="flex min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r border-border-panel/30 bg-[var(--bg-panel)] backdrop-blur-md">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/80">
          <div className="relative">
            <div className="absolute inset-0 blur-md bg-gradient-to-tr from-neon-blue/60 via-neon-purple/40 to-neon-red/40 opacity-80" />
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-900/80 border border-slate-700/60 neon-ring">
              <Activity className="w-5 h-5 text-neon-blue" />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">SOC DASHBOARD</p>
            <p className="font-semibold text-slate-50">Log-Sense</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    'border border-transparent bg-slate-900/10 hover:bg-slate-900/60 hover:border-slate-700/80',
                    isActive
                      ? 'bg-slate-900/70 border-slate-700/90 shadow-lg shadow-neon-blue/20'
                      : 'text-slate-400',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <Icon
                        className={`w-4 h-4 transition-transform ${
                          isActive ? 'text-neon-blue scale-110' : 'group-hover:text-slate-100'
                        }`}
                      />
                      {isActive && (
                        <motion.span
                          layoutId="nav-indicator"
                          className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-gradient-to-b from-neon-blue to-neon-purple"
                        />
                      )}
                    </div>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="px-4 pb-4 pt-2 border-t border-slate-800/80">
          <div className="glass-panel px-3 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Cluster Health</p>
              <p className="text-sm font-medium text-emerald-400">Operational</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 md:px-6 py-3 border-b border-border-panel/30 bg-[var(--bg-panel)] backdrop-blur-md">
          <div className="flex-1 flex items-center gap-3">
            <div className="relative flex-1 max-w-xl">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="w-4 h-4 text-slate-500" />
              </div>
              <input
                className="glass-input glass-input-search w-full py-2 pr-4 text-sm"
                placeholder="Search logs, IPs, users, or queries…"
              />
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  streaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              Live ingest
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Shield className="w-3 h-3" />
              SOC: Active
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStartLogs}
                className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 px-2 py-1 text-[0.7rem] text-slate-200 hover:border-emerald-500/70 hover:text-emerald-400 transition-colors"
              >
                <PlayCircle className="w-3 h-3" />
                Start logs
              </button>
              <button
                type="button"
                onClick={handleStopLogs}
                className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 px-2 py-1 text-[0.7rem] text-slate-200 hover:border-red-500/70 hover:text-red-400 transition-colors"
              >
                <PauseCircle className="w-3 h-3" />
                Stop logs
              </button>
            </div>
            <div className="w-px h-6 bg-slate-800 mx-1" />
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 px-3 md:px-6 py-4 md:py-6 overflow-y-auto scroll-thin">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout

