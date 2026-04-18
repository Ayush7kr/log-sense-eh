import { motion } from 'framer-motion'
import { Activity, AlertTriangle, CircleUserRound, TerminalSquare, TrendingUp, TrendingDown, Minus, ShieldAlert } from 'lucide-react'
import { useLogsContext } from '../hooks/LogsContext'
import { useApi } from '../hooks/useApi'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const KPI_ICON_SIZE = 18

export default function OverviewPage() {
  const { logs, dashboardData, opsMode } = useLogsContext()
  const { data: polledData } = useApi(`/api/dashboard?mode=${opsMode}`, { pollMs: 5000 })
  const { data: threatData } = useApi(`/api/threat-score?mode=${opsMode}`, { pollMs: 5000 })

  // Prefer Socket.IO data, fallback to polled
  const data = dashboardData || polledData

  const trendPct = data?.trendPct ?? 0
  const TrendIcon = trendPct > 0 ? TrendingUp : trendPct < 0 ? TrendingDown : Minus
  const trendColor = trendPct > 0 ? 'text-emerald-400' : trendPct < 0 ? 'text-red-400' : 'text-gray-400'
  const trendText = trendPct > 0 ? `+${trendPct}%` : trendPct < 0 ? `${trendPct}%` : '0%'

  const kpis = [
    {
      label: 'Total Logs',
      value: data?.totalLogs ?? '—',
      icon: TerminalSquare,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      label: 'Failed Logins',
      value: data?.failedLogins ?? '—',
      icon: CircleUserRound,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    {
      label: 'High Risk',
      value: data?.highRiskEvents ?? '—',
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    {
      label: 'Active IPs',
      value: data?.activeIPs ?? '—',
      icon: Activity,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-sora text-[var(--text-primary)] flex items-center gap-3">
            Security Overview
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM ACTIVE
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">
            Real-time telemetry and heuristic analysis of ingestion pipelines.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[0.7rem] font-mono text-[var(--text-secondary)]">
            <HistoryIcon className="w-3.5 h-3.5" />
            Last Scan: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel p-4 relative overflow-hidden group"
            >
              <div className="relative flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[0.65rem] text-[var(--text-secondary)] uppercase tracking-widest font-bold">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                    {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${kpi.bg} border ${kpi.borderColor} transition-transform group-hover:scale-110`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
              <div className={`mt-3 flex items-center gap-1 text-[0.6rem] ${trendColor}`}>
                  <TrendIcon className="w-3 h-3" />
                  <span>{trendText} vs last hour</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Threat Score Meter */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-36 h-36 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-panel)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke={threatData?.level === 'Critical' ? '#ef4444' : threatData?.level === 'High' ? '#f97316' : threatData?.level === 'Medium' ? '#f59e0b' : '#10b981'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(threatData?.score || 0) * 3.267} 326.7`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">{threatData?.score ?? 0}</span>
            <span className={`text-[0.6rem] font-bold uppercase tracking-wider ${
              threatData?.level === 'Critical' ? 'text-red-400' : threatData?.level === 'High' ? 'text-orange-400' : threatData?.level === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
            }`}>{threatData?.level || 'Low'}</span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldAlert className={`w-5 h-5 ${threatData?.level === 'Critical' ? 'text-red-400' : threatData?.level === 'High' ? 'text-orange-400' : threatData?.level === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`} />
            SOC Threat Index
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Composite score derived from active alerts, open incidents, and blocked IP addresses within the current operating mode.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--bg-main)] p-2 rounded-lg border border-[var(--border-panel)] text-center">
              <p className="text-lg font-bold tabular-nums text-red-400">{threatData?.activeAlerts ?? 0}</p>
              <p className="text-[0.55rem] text-[var(--text-secondary)] uppercase font-bold">Alerts</p>
            </div>
            <div className="bg-[var(--bg-main)] p-2 rounded-lg border border-[var(--border-panel)] text-center">
              <p className="text-lg font-bold tabular-nums text-amber-400">{threatData?.activeIncidents ?? 0}</p>
              <p className="text-[0.55rem] text-[var(--text-secondary)] uppercase font-bold">Incidents</p>
            </div>
            <div className="bg-[var(--bg-main)] p-2 rounded-lg border border-[var(--border-panel)] text-center">
              <p className="text-lg font-bold tabular-nums text-blue-400">{threatData?.blockedIPs ?? 0}</p>
              <p className="text-[0.55rem] text-[var(--text-secondary)] uppercase font-bold">Blocked</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--accent-primary)]" />
                Ingestion Velocity
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.trafficTimeline || []}>
                <defs>
                  <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-panel)',
                    borderRadius: 12,
                    fontSize: 11,
                    backdropFilter: 'blur(10px)',
                    color: 'var(--text-primary)',
                  }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Area
                  type="monotone"
                  dataKey="events"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fill="url(#trafficGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2 mb-6">
              <PieChartIcon className="w-4 h-4 text-[var(--accent-primary)]" />
              Event Vector Mix
          </h3>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.eventDistribution || []}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                >
                  {(data?.eventDistribution || []).map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#F43F5E'][index % 5]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-panel)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: 'var(--text-primary)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {(data?.eventDistribution || []).slice(0, 4).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-[0.65rem]">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'][i % 4] }} />
                    <span className="text-[var(--text-secondary)] capitalize">{p.name}</span>
                </div>
                <span className="font-mono text-[var(--text-primary)]">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-4 bg-[var(--accent-glow)] border-b border-[var(--border-panel)] flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                <TerminalSquare className="w-4 h-4 text-[var(--accent-primary)]" />
                Raw Telemetry Stream
            </h3>
            <span className="text-[0.65rem] text-[var(--accent-primary)] font-bold font-mono">{logs.length} entries</span>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="min-w-full log-table">
            <thead>
              <tr className="border-b border-[var(--border-panel)] text-[var(--text-secondary)] text-left">
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Event Descriptor</th>
                <th className="px-5 py-3">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-panel)]" style={{ opacity: 0.01 }}>
              {/* Invisible spacer for initial render */}
            </tbody>
            <tbody className="divide-y divide-[var(--border-panel)]">
              {logs.slice(0, 8).map((log) => (
                <tr key={log.id} className="hover:bg-[var(--accent-glow)] transition-colors group">
                  <td className="px-5 py-2.5 text-[var(--text-secondary)]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="px-5 py-2.5 text-[var(--text-primary)] font-semibold">{log.user}</td>
                  <td className="px-5 py-2.5 text-[var(--accent-primary)]">{log.ip}</td>
                  <td className="px-5 py-2.5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{log.event}</td>
                  <td className="px-5 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold border ${
                        log.risk === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                        log.risk === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                        {log.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function HistoryIcon(props) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
    )
}

function PieChartIcon(props) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
    )
}
