import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useApi } from '../hooks/useApi'
import { useLogsContext } from '../hooks/LogsContext'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts'
import { Brain, Fingerprint, ShieldAlert, Cpu, Activity, Users, Globe, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

const smoothData = (data, windowSize = 4) => {
  return data.map((val, idx, arr) => {
    const start = Math.max(0, idx - windowSize + 1);
    const subset = arr.slice(start, idx + 1);
    const sum = subset.reduce((a, b) => a + b.score, 0);
    return { ...val, score: sum / subset.length };
  });
};

export default function AnomalyPage() {
  const { logs } = useLogsContext()
  const { data } = useApi('/api/anomalies', { pollMs: 4000 })

  const anomaliesCount = data?.anomalyCount || 0
  const avg = data?.avgScore || 0
  const rawSeries = data?.scoresOverTime || []
  const series = smoothData(rawSeries)
  const modelHealth = data?.modelHealth || 'Healthy'
  const patterns = data?.patterns || []

  const entityAnalytics = useMemo(() => {
    const ipCounts = {}
    const userCounts = {}
    
    logs.filter(l => l.risk === 'High').forEach(log => {
      ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1
      userCounts[log.user] = (userCounts[log.user] || 0) + 1
    })

    const topIps = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))

    const topUsers = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))

    return { topIps, topUsers }
  }, [logs])

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'Critical': return { border: 'border-red-500', bg: 'bg-red-500/5', text: 'text-red-400', icon: 'text-red-500' }
      case 'High': return { border: 'border-amber-500', bg: 'bg-amber-500/5', text: 'text-amber-400', icon: 'text-amber-500' }
      case 'Medium': return { border: 'border-blue-500', bg: 'bg-blue-500/5', text: 'text-blue-400', icon: 'text-blue-500' }
      default: return { border: 'border-emerald-500', bg: 'bg-emerald-500/5', text: 'text-emerald-400', icon: 'text-emerald-500' }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-[var(--bg-panel)] p-5 rounded-2xl border border-[var(--border-panel)]">
        <div>
          <h2 className="text-2xl font-bold font-sora flex items-center gap-3">
            <Brain className="w-7 h-7 text-purple-500" />
            AI Anomaly Intelligence
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Behavioral analysis using Isolation Forest heuristics on live telemetry.
          </p>
        </div>
        <div className="flex gap-3">
          <div className={`px-4 py-2 rounded-xl text-[0.65rem] font-bold uppercase tracking-widest flex items-center gap-2 border ${
            modelHealth === 'Healthy' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <Cpu className="w-3.5 h-3.5" />
            {modelHealth}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 bg-gradient-to-br from-red-500/5 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span className="text-[0.6rem] font-bold text-red-500/60 uppercase">High Risk</span>
          </div>
          <p className="text-3xl font-bold font-sora">{anomaliesCount}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Detected Deviations</p>
          <div className="mt-2 flex items-center gap-1 text-[0.6rem]">
            {anomaliesCount > 10 ? (
              <><TrendingUp className="w-3 h-3 text-red-400" /><span className="text-red-400">Elevated</span></>
            ) : (
              <><TrendingDown className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Normal</span></>
            )}
          </div>
        </div>
        <div className="glass-panel p-5 bg-gradient-to-br from-purple-500/5 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-purple-500" />
            <span className="text-[0.6rem] font-bold text-purple-500/60 uppercase">Model Output</span>
          </div>
          <p className="text-3xl font-bold font-sora">{avg.toFixed(3)}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Mean Outlier Score</p>
          <div className="mt-2 flex items-center gap-1 text-[0.6rem]">
            <span className={avg > 0.5 ? 'text-red-400' : 'text-emerald-400'}>
              {avg > 0.5 ? 'Above threshold' : 'Within baseline'}
            </span>
          </div>
        </div>
        <div className="glass-panel p-5 bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <span className="text-[0.6rem] font-bold text-blue-500/60 uppercase">Contextual</span>
          </div>
          <p className="text-3xl font-bold font-sora">{data?.totalSamples || logs.length}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Observation Points</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[0.7rem] font-bold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
                <Activity className="w-4 h-4" /> Probabilistic Risk Trend
              </h3>
              <span className="text-[0.6rem] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">LIVE</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="anomGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A855F7" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-panel)" vertical={false} opacity={0.3} />
                  <XAxis dataKey="t" hide />
                  <YAxis domain={[0, 1]} stroke="var(--text-secondary)" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)', borderRadius: '12px', color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--text-primary)', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#A855F7" fill="url(#anomGradient)" strokeWidth={3} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-5">
              <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-500" /> Top Anomalous IPs
              </h3>
              <div className="h-40">
                {entityAnalytics.topIps.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={entityAnalytics.topIps} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={10} width={100} />
                      <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)', color: 'var(--text-primary)' }} />
                      <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={15} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">No high-risk IP data yet</div>
                )}
              </div>
            </div>
            <div className="glass-panel p-5">
              <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-6 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Affected Identities
              </h3>
              <div className="h-40">
                {entityAnalytics.topUsers.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={entityAnalytics.topUsers} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={10} width={100} />
                      <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)', color: 'var(--text-primary)' }} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">No affected identity data yet</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detected Patterns — Dynamic from backend */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-5 bg-purple-500/5 border-purple-500/20 flex flex-col">
            <h3 className="text-[0.7rem] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Fingerprint className="w-5 h-5" /> Detected Patterns
            </h3>
            <div className="space-y-3 flex-1">
              {patterns.map((pattern, i) => {
                const colors = getSeverityColor(pattern.severity)
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-3 rounded-xl bg-[var(--bg-panel)] border-l-4 ${colors.border}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-xs font-bold ${colors.text}`}>{pattern.title}</p>
                      <span className={`text-[0.5rem] font-bold uppercase px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                        {pattern.severity}
                      </span>
                    </div>
                    <p className="text-[0.7rem] text-[var(--text-secondary)] leading-relaxed">
                      {pattern.description}
                    </p>
                  </motion.div>
                )
              })}
              {patterns.length === 0 && (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Analyzing patterns...</p>
                </div>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border-panel)]">
              <p className="text-[0.65rem] text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-panel)]">
                <AlertTriangle className="w-3.5 h-3.5 mb-1 inline text-[var(--accent-primary)]" />{' '}
                Patterns are detected from live log data using frequency analysis and behavioral heuristics. Updated every 4 seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
