import { motion } from 'framer-motion'
import { Activity, AlertTriangle, CircleUserRound, TerminalSquare, TrendingUp } from 'lucide-react'
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
  const { logs } = useLogsContext()
  const { data } = useApi('/api/dashboard', { pollMs: 3000 })

  const kpis = [
    {
      label: 'Total Logs',
      value: data?.totalLogs ?? '—',
      icon: TerminalSquare,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Failed Logins',
      value: data?.failedLogins ?? '—',
      icon: CircleUserRound,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'High Risk',
      value: data?.highRiskEvents ?? '—',
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Active IPs',
      value: data?.activeIPs ?? '—',
      icon: Activity,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-sora text-text-primary flex items-center gap-3">
            Security Overview
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM ACTIVE
            </span>
          </h1>
          <p className="text-xs md:text-sm text-text-secondary mt-1">
            Real-time telemetry and heuristic analysis of ingestion pipelines.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[0.7rem] font-mono text-text-secondary">
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
                  <p className="text-[0.65rem] text-text-secondary uppercase tracking-widest font-bold">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-text-primary">
                    {kpi.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${kpi.bg} border border-${kpi.color.split('-')[1]}-500/20 transition-transform group-hover:scale-110`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[0.6rem] text-text-secondary">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span>+12% vs last hour</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent-primary" />
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
                    fontSize: 10,
                    backdropFilter: 'blur(10px)'
                  }}
                  itemStyle={{ color: 'var(--text-primary)' }}
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
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 mb-6">
              <PieChartIcon className="w-4 h-4 text-accent-primary" />
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {(data?.eventDistribution || []).slice(0, 4).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-[0.65rem]">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'][i % 4] }} />
                    <span className="text-text-secondary">{p.name}</span>
                </div>
                <span className="font-mono text-text-primary">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden border-accent-primary/20">
        <div className="p-4 bg-accent-primary/5 border-b border-border-panel flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                <TerminalSquare className="w-4 h-4 text-accent-primary" />
                Raw Telemetry Stream
            </h3>
            <button className="text-[0.65rem] text-accent-primary hover:underline font-bold">View Full Stream</button>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="min-w-full text-[0.7rem] font-mono">
            <thead>
              <tr className="border-b border-border-panel/50 text-text-secondary text-left">
                <th className="px-6 py-3 font-medium uppercase tracking-tighter">Time</th>
                <th className="px-6 py-3 font-medium uppercase tracking-tighter">Entity</th>
                <th className="px-6 py-3 font-medium uppercase tracking-tighter">Source</th>
                <th className="px-6 py-3 font-medium uppercase tracking-tighter">Event Descriptor</th>
                <th className="px-6 py-3 font-medium uppercase tracking-tighter">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-panel/30">
              {logs.slice(0, 8).map((log) => (
                <tr key={log.id} className="hover:bg-accent-primary/5 transition-colors group">
                  <td className="px-6 py-3 text-text-secondary">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="px-6 py-3 text-text-primary font-bold">{log.user}</td>
                  <td className="px-6 py-3 text-accent-primary">{log.ip}</td>
                  <td className="px-6 py-3 text-text-secondary group-hover:text-text-primary transition-colors">{log.event}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[0.6rem] font-bold border ${
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

