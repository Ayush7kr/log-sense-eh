import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { 
  BarChart3, 
  Target, 
  ShieldAlert, 
  Globe2, 
  Zap, 
  Flame,
  Bug,
  Ghost,
  Activity,
  ChevronRight,
  Database
} from 'lucide-react'

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

export default function ThreatIntelPage() {
  const { data: dashboard } = useApi('/api/dashboard', { pollMs: 5000 })
  const { data: logsData } = useApi('/api/logs', { pollMs: 5000 })
  const logs = logsData?.logs || []

  const [simulating, setSimulating] = useState(false)

  const topIps = (() => {
    const counts = {}
    logs.forEach(l => counts[l.ip] = (counts[l.ip] || 0) + 1)
    return Object.entries(counts)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
  })()

  const targetUsers = (() => {
    const counts = {}
    logs.forEach(l => counts[l.user] = (counts[l.user] || 0) + 1)
    return Object.entries(counts)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, value]) => ({ name, value }))
  })()

  const launchAttack = async (type) => {
    if (simulating) return
    setSimulating(true)
    try {
        await fetch('/api/simulator/launch-attack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type })
        })
    } finally {
        setTimeout(() => setSimulating(false), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-sora flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-accent-primary" />
            Threat Intelligence
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Tactical analysis of adversary patterns and infrastructure hotspots.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Attacking IPs */}
        <div className="glass-panel p-5 lg:col-span-2">
          <h3 className="text-[0.7rem] uppercase tracking-widest text-text-secondary font-bold mb-6 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Aggressor Infrastructure (Top IPs)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topIps} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} opacity={0.3} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={100} />
                <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Target Profiles */}
        <div className="glass-panel p-5">
          <h3 className="text-[0.7rem] uppercase tracking-widest text-text-secondary font-bold mb-6 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            Vulnerable Identities
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={targetUsers}
                  cx="50%" cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {targetUsers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 font-mono text-[0.6rem]">
            {targetUsers.map((u, i) => (
                <div key={u.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-text-secondary">{u.name}</span>
                </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Simulation Sandbox */}
        <div className="glass-panel p-5 lg:col-span-1 bg-gradient-to-br from-red-500/5 to-transparent border-red-500/20">
            <h3 className="text-[0.7rem] uppercase tracking-widest text-red-400 font-bold mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Defense Sandbox
            </h3>
            <div className="space-y-3">
                <p className="text-[0.65rem] text-text-secondary mb-4 leading-relaxed">
                    Trigger synthetic attack signatures to validate alerting and rule-engine responsiveness.
                </p>
                <button 
                    disabled={simulating}
                    onClick={() => launchAttack('brute-force')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-red-500/50 hover:bg-slate-800 transition-all font-bold text-xs group"
                >
                    <div className="flex items-center gap-3">
                        <Flame className="w-4 h-4 text-red-500 group-hover:animate-bounce" />
                        <span>Brute Force</span>
                    </div>
                    {simulating ? <Activity className="w-4 h-4 animate-spin text-accent-primary" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                </button>
                <button 
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700 opacity-50 cursor-not-allowed font-bold text-xs"
                >
                    <div className="flex items-center gap-3">
                        <Bug className="w-4 h-4 text-emerald-500" />
                        <span>DDoS Cluster</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-0" />
                </button>
            </div>
        </div>

        {/* Regional Concentration */}
        <div className="glass-panel p-5 lg:col-span-3">
            <h3 className="text-[0.7rem] uppercase tracking-widest text-text-secondary font-bold mb-6 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-accent-primary" />
                Regional Adversary Concentration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                            { name: 'North America', value: 45 },
                            { name: 'Eurasia', value: 32 },
                            { name: 'East Asia', value: 28 },
                            { name: 'South Asia', value: 15 },
                            { name: 'Latin America', value: 12 }
                        ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                            <YAxis stroke="#64748b" fontSize={9} />
                            <Tooltip 
                                contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px' }}
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                    <p className="text-[0.6rem] font-bold text-text-secondary uppercase tracking-widest mb-2">High-Risk Origins</p>
                    {[
                        { country: 'United States', code: 'US', threats: 1240, risk: 'Medium' },
                        { country: 'Netherlands', code: 'NL', threats: 890, risk: 'High' },
                        { country: 'China', code: 'CN', threats: 750, risk: 'High' },
                        { country: 'Russia', code: 'RU', threats: 420, risk: 'Critical' }
                    ].map(region => (
                        <div key={region.code} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-border-panel/20">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-4 bg-slate-800 rounded-sm flex items-center justify-center text-[0.5rem] font-bold">{region.code}</div>
                                <span className="text-xs font-semibold">{region.country}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[0.65rem] font-mono text-text-secondary">{region.threats} pts</span>
                                <span className={`text-[0.5rem] font-bold px-1.5 py-0.5 rounded ${
                                    region.risk === 'Critical' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                                }`}>{region.risk}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between p-3 rounded-xl bg-accent-primary/5 border border-accent-primary/10">
                <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-accent-primary" />
                    <span className="text-[0.65rem] text-text-secondary">Enriched via Global Threat Matrix v4.2</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[0.55rem] font-mono font-bold text-emerald-500 uppercase">Real-time Sync</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}
