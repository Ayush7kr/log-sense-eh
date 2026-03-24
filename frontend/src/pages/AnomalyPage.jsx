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
import { Brain, Fingerprint, ShieldAlert, Cpu, Search, Activity, Users, Globe, Info } from 'lucide-react'

// Moving average smoothing
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
  const { data } = useApi('/api/anomalies', { pollMs: 3000 })

  const anomaliesCount = data?.anomalyCount || 0
  const avg = data?.avgScore || 0
  const rawSeries = data?.scoresOverTime || []
  const series = smoothData(rawSeries)
  const modelHealth = data?.modelHealth || 'Healthy'

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-900/40 p-5 rounded-2xl border border-border-panel/30">
        <div>
          <h2 className="text-2xl font-bold font-sora flex items-center gap-3">
            <Brain className="w-7 h-7 text-neon-purple" />
            AI Anomaly Intelligence
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Unsupervised behavioral analysis using Isolation Forest and frequency heuristics.
          </p>
        </div>
        <div className="flex gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input className="glass-input glass-input-search text-xs w-64" placeholder="Scan model weights..." />
            </div>
            <div className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[0.65rem] font-bold uppercase tracking-widest flex items-center gap-2">
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
            <p className="text-xs text-text-secondary mt-1">Detected Deviations</p>
        </div>
        <div className="glass-panel p-5 bg-gradient-to-br from-purple-500/5 to-transparent">
            <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-purple-500" />
                <span className="text-[0.6rem] font-bold text-purple-500/60 uppercase">Model Output</span>
            </div>
            <p className="text-3xl font-bold font-sora">{avg.toFixed(3)}</p>
            <p className="text-xs text-text-secondary mt-1">Mean Outlier Score</p>
        </div>
        <div className="glass-panel p-5 bg-gradient-to-br from-blue-500/5 to-transparent">
            <div className="flex items-center justify-between mb-2">
                <Globe className="w-5 h-5 text-blue-500" />
                <span className="text-[0.6rem] font-bold text-blue-500/60 uppercase">Contextual</span>
            </div>
            <p className="text-3xl font-bold font-sora">{logs.length}</p>
            <p className="text-xs text-text-secondary mt-1">Observation Points</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-8 space-y-6">
            <div className="glass-panel p-6 bg-slate-900/20">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[0.7rem] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Probabilistic Risk Trend
                    </h3>
                    <span className="text-[0.6rem] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">INFERENCE_SYNCED</span>
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
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.2} />
                            <XAxis dataKey="t" hide />
                            <YAxis domain={[0, 1]} stroke="#64748b" fontSize={10} />
                            <Tooltip 
                                contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff', fontSize: '10px' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="score" 
                                stroke="#A855F7" 
                                fill="url(#anomGradient)" 
                                strokeWidth={3}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-5">
                    <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-text-secondary mb-6 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-red-500" /> Top anomalous IPs
                    </h3>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={entityAnalytics.topIps} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={90} />
                                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={15} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="glass-panel p-5">
                    <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-text-secondary mb-6 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" /> Affected Identities
                    </h3>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={entityAnalytics.topUsers} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={90} />
                                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>

        {/* Behavioral Explanation Sidebar */}
        <div className="lg:col-span-4 space-y-6">
            <div className="glass-panel p-5 bg-neon-purple/5 border-neon-purple/20 flex flex-col h-full">
                <h3 className="text-[0.7rem] font-bold text-neon-purple uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Fingerprint className="w-5 h-5" /> Behavioral Logic
                </h3>
                <div className="space-y-4 flex-1">
                    <div className="p-3 rounded-xl bg-slate-900/60 border-l-4 border-red-500">
                        <p className="text-xs font-bold text-red-400">Low Entropy Auth</p>
                        <p className="text-[0.7rem] text-text-secondary mt-1 leading-relaxed italic">
                            "Repetitive authentication attempts with high velocity but varying user-agents detected. Probability of automated script: 94%."
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60 border-l-4 border-amber-500">
                        <p className="text-xs font-bold text-amber-400">Geometric Deviation</p>
                        <p className="text-[0.7rem] text-text-secondary mt-1 leading-relaxed italic">
                            "User accessing resources from geographically distant points within 2 hours. Impossible travel heuristic triggered."
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60 border-l-4 border-blue-500">
                        <p className="text-xs font-bold text-blue-400">Frequency Spike</p>
                        <p className="text-[0.7rem] text-text-secondary mt-1 leading-relaxed italic">
                            "Resource access density significantly exceeds historical baseline for current operational window."
                        </p>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-border-panel/30">
                    <p className="text-[0.65rem] text-text-secondary leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-border-panel/20">
                        <Info className="w-3.5 h-3.5 mb-1 text-accent-primary" />
                        Isolation Forest model identifies anomalies based on how 'easy' it is to isolate a point in the dataset. Points with shorter search paths are flagged as outliers.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}

function Target({ className, ...props }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
