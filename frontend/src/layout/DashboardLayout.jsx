import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
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
  HardDrive,
  Menu,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useLogsContext } from '../hooks/LogsContext'
import { ThemeToggle } from '../components/ThemeToggle'

const navItems = [
  { to: '/', label: 'Overview', icon: Shield },
  { to: '/incidents', label: 'Incidents', icon: GanttChartSquare },
  { to: '/logs', label: 'Network Logs', icon: TerminalSquare },
  { to: '/pc-logs', label: 'System Logs', icon: HardDrive },
  { to: '/alerts', label: 'Alerts', icon: BellRing },
  { to: '/threat-intel', label: 'Threat Intel', icon: BarChart3 },
  { to: '/ai-search', label: 'AI Search', icon: Search },
  { to: '/heatmap', label: 'Threat Heatmap', icon: Globe2 },
  { to: '/anomalies', label: 'Anomalies', icon: Radar },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function DashboardLayout({ opsMode }) {
  const { streaming, setStreaming, paused, togglePause, connected } = useLogsContext()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const navigate = useNavigate()

  const handleStartLogs = async () => {
    setStreaming(true)
    try {
      await fetch('/api/simulation/start', { method: 'POST' })
    } catch {}
  }

  const handleStopLogs = async () => {
    setStreaming(false)
    try {
      await fetch('/api/simulation/stop', { method: 'POST' })
    } catch {}
  }

  const handleHeaderSearch = (e) => {
    e.preventDefault()
    if (searchValue.trim()) {
      navigate('/ai-search')
    }
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-50 md:z-auto
        flex flex-col w-72 border-r border-[var(--border-panel)] bg-[var(--bg-panel)] backdrop-blur-md
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        h-screen md:h-auto
      `}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-panel)]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 blur-md bg-gradient-to-tr from-blue-500/60 via-purple-500/40 to-red-400/40 opacity-80" />
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-panel)] neon-ring">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">SOC DASHBOARD</p>
              <p className="font-semibold text-[var(--text-primary)]">Log-Sense</p>
            </div>
          </div>
          <button className="md:hidden p-1" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  [
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    'border border-transparent hover:bg-[var(--accent-glow)] hover:border-[var(--border-panel)]',
                    isActive
                      ? 'bg-[var(--accent-glow)] border-[var(--border-panel)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)]',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <Icon
                        className={`w-4 h-4 transition-transform ${
                          isActive ? 'text-[var(--accent-primary)] scale-110' : 'group-hover:text-[var(--text-primary)]'
                        }`}
                      />
                      {isActive && (
                        <motion.span
                          layoutId="nav-indicator"
                          className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-gradient-to-b from-blue-500 to-purple-500"
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

        <div className="px-4 pb-4 pt-2 border-t border-[var(--border-panel)]">
          <div className="glass-panel px-3 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Cluster Health</p>
              <p className="text-sm font-medium text-emerald-500">Operational</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-[var(--border-panel)] bg-[var(--bg-panel)] backdrop-blur-md">
          {/* Mobile menu button */}
          <button className="md:hidden p-1.5" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>

          <div className="flex-1 flex items-center gap-3">
            <form onSubmit={handleHeaderSearch} className="relative flex-1 max-w-xl">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
              <input
                className="glass-input glass-input-search w-full py-2 pr-4 text-sm"
                placeholder="Search logs, IPs, users, or queries…"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </form>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            {/* Mode Badge & Switch */}
            <div className="flex items-center gap-2">
              <div className={`px-2.5 py-1 rounded-full border text-[0.65rem] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                opsMode === 'aws' 
                  ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                  : opsMode === 'forensic'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${opsMode === 'aws' ? 'bg-red-500 animate-pulse' : opsMode === 'forensic' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                {opsMode === 'aws' ? 'Live AWS Mode' : opsMode === 'forensic' ? 'Forensic Mode' : 'Simulation Mode'}
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('log-sense-auth')
                  localStorage.removeItem('log-sense-mode')
                  window.location.reload()
                }}
                className="px-2 py-1 rounded-lg border border-[var(--border-panel)] hover:bg-[var(--accent-glow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-bold text-[0.6rem] uppercase tracking-wider"
                title="Log out and switch mode"
              >
                Switch
              </button>
            </div>
            
            <div className="w-px h-6 bg-[var(--border-panel)] mx-1" />

            {/* WebSocket status */}
            <span className="flex items-center gap-1.5">
              {connected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">WS</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  <span className="text-amber-500 font-medium">HTTP</span>
                </>
              )}
            </span>

            <span className="flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  streaming && !paused ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`}
              />
              {paused ? 'Paused' : streaming ? 'Live' : 'Stopped'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStartLogs}
                disabled={opsMode === 'aws' || opsMode === 'forensic'}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.7rem] transition-colors disabled:opacity-30 ${
                  streaming 
                    ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' 
                    : 'border-[var(--border-panel)] text-[var(--text-secondary)] hover:border-emerald-500/70 hover:text-emerald-500'
                }`}
              >
                <PlayCircle className="w-3 h-3" />
                Start
              </button>
              <button
                type="button"
                onClick={handleStopLogs}
                disabled={opsMode === 'aws' || opsMode === 'forensic'}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.7rem] transition-colors disabled:opacity-30 ${
                  !streaming 
                    ? 'border-red-500/50 text-red-500 bg-red-500/10' 
                    : 'border-[var(--border-panel)] text-[var(--text-secondary)] hover:border-red-500/70 hover:text-red-500'
                }`}
              >
                <PauseCircle className="w-3 h-3" />
                Stop
              </button>
            </div>
            <div className="w-px h-6 bg-[var(--border-panel)] mx-1" />
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
