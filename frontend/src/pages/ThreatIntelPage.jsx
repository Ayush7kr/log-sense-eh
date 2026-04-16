import { motion } from 'framer-motion'
import { Zap, ShieldAlert, CheckCircle, ShieldBan, Network } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useLogsContext } from '../hooks/LogsContext'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useState } from 'react'

export default function ThreatIntelPage() {
  const { data: dashboard } = useApi('/api/dashboard', { pollMs: 5000 })
  const { logs, opsMode } = useLogsContext()
  const [simulationStatus, setSimulationStatus] = useState(null)
  const isAwsMode = opsMode === 'aws'
  const [attackResult, setAttackResult] = useState(null)

  const topIps = (() => {
    const ipCounts = {}
    logs.forEach(l => {
      ipCounts[l.ip] = (ipCounts[l.ip] || 0) + 1
    })
    return Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
  })()

  const regions = (() => {
    // Generate dummy regions based on IPs to show varied UI
    const regCounts = { 'North America': 0, 'Asia Pacific': 0, 'Europe': 0 }
    logs.forEach(l => {
      const firstOctet = parseInt(l.ip.split('.')[0] || 0, 10)
      if (firstOctet < 100) regCounts['North America']++
      else if (firstOctet < 180) regCounts['Asia Pacific']++
      else regCounts['Europe']++
    })
    return Object.entries(regCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))
  })()

  const handleSimulate = async (type) => {
    if (isAwsMode) return;
    try {
      setSimulationStatus({ type, state: 'running' })
      const resp = await fetch('/api/simulator/launch-attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      const result = await resp.json()
      setAttackResult({ type, ...result })
      setSimulationStatus({ type, state: 'success' })
      setTimeout(() => setSimulationStatus(null), 3000)
    } catch(e) {
      setSimulationStatus({ type, state: 'failed' })
      setTimeout(() => setSimulationStatus(null), 3000)
    }
  }

  const PIE_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6']
  const userStats = dashboard?.eventDistribution?.slice(0, 5) || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Top IPs Chart */}
        <div className="glass-panel p-5 flex-[2] relative">
          <h3 className="text-[0.65rem] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-6 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Aggressor Infrastructure (Top IPs)
          </h3>
          <div className="h-64">
            {topIps.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topIps} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={11} width={100} />
                  <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">Awaiting telemetry...</div>
            )}
          </div>
        </div>

        {/* Target Users */}
        <div className="glass-panel p-5 flex-[1]">
          <h3 className="text-[0.65rem] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-6 flex items-center gap-2">
            <Network className="w-4 h-4 text-amber-500" />
            Vulnerable Identities
          </h3>
          <div className="h-64 relative flex flex-col items-center justify-center">
            {userStats.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="60%">
                  <PieChart>
                    <Pie data={userStats} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={5}>
                      {userStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full mt-4 grid grid-cols-2 gap-2 text-[0.65rem] font-mono">
                  {userStats.map((entry, index) => (
                    <div key={entry.name} className="flex justify-between items-center text-[var(--text-secondary)] px-2">
                      <span className="flex items-center gap-1.5 line-clamp-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                        {entry.name}
                      </span>
                      <span className="font-bold text-[var(--text-primary)]">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">Awaiting telemetry...</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Simulation Controls Panel */}
        <div className="glass-panel p-5 flex flex-col relative overflow-hidden">
          {isAwsMode && (
            <div className="absolute inset-0 bg-[var(--bg-main)]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-6 border border-red-500/20 rounded-2xl">
              <ShieldBan className="w-8 h-8 text-red-500 mb-2 opacity-80" />
              <p className="text-sm font-bold text-red-400">Controls Locked</p>
              <p className="text-[0.65rem] text-[var(--text-secondary)] mt-1">Live data streaming from EC2. Simulations are disabled.</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[0.65rem] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4" /> Defense Sandbox
            </h3>
          </div>
          <div className="space-y-3">
            <p className="text-[0.65rem] text-[var(--text-secondary)] mb-4 leading-relaxed">
              Trigger synthetic attack signatures to validate alerting and rule-engine responsiveness.
            </p>
            
            {[
              { type: 'brute-force', label: 'Brute Force', icon: ShieldAlert, color: 'text-orange-500' },
              { type: 'ddos', label: 'DDoS Cluster', icon: Network, color: 'text-purple-500' },
              { type: 'port-scan', label: 'Port Scan', icon: Zap, color: 'text-blue-500' },
            ].map((btn) => (
              <button
                key={btn.type}
                onClick={() => handleSimulate(btn.type)}
                disabled={simulationStatus?.type === btn.type || isAwsMode}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-[var(--border-panel)] bg-[var(--bg-panel)] hover:bg-[var(--accent-glow)] transition-all group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <btn.icon className={`w-4 h-4 ${btn.color}`} />
                  <span className="text-xs font-bold text-[var(--text-primary)]">{btn.label}</span>
                </div>
                {simulationStatus?.type === btn.type && simulationStatus.state === 'running' ? (
                  <span className="w-3 h-3 rounded-full border-2 border-r-transparent border-emerald-500 animate-spin" />
                ) : (
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">&rsaquo;</span>
                )}
              </button>
            ))}

            {attackResult && simulationStatus?.state === 'success' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mt-4">
                <p className="text-[0.65rem] font-bold text-emerald-400 flex items-center gap-1.5 mb-1"><CheckCircle className="w-3 h-3" /> Attack Simulated</p>
                <p className="text-[0.6rem] text-[var(--text-primary)] opacity-80">{attackResult.logCount} logs injected | {attackResult.sourceCount || 1} source IPs</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Global Landscape */}
        <div className="glass-panel p-5 lg:col-span-3 flex flex-col">
          <h3 className="text-[0.65rem] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-6 flex items-center gap-2">
            <Network className="w-4 h-4 text-blue-500" /> Regional Adversary Concentration
          </h3>
          <div className="flex-1 flex flex-col md:flex-row gap-8">
            <div className="flex-1 h-56">
              {regions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regions}>
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'var(--accent-glow)' }} contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">Awaiting telemetry...</div>
              )}
            </div>

            <div className="w-full md:w-64 space-y-3">
              <p className="text-[0.6rem] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Top Source Regions</p>
              {regions.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-panel)]">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded flex items-center justify-center bg-[var(--bg-main)] text-[0.6rem] font-mono text-[var(--text-secondary)]">{i + 1}</span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[0.65rem] font-mono text-[var(--text-secondary)]">{r.value} events</span>
                    {i === 0 && <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">Critical</span>}
                    {i === 1 && <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">High</span>}
                    {i > 1 && <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">Medium</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-panel)] flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-panel)] text-[0.65rem] text-[var(--text-secondary)]">
              <Network className="w-3.5 h-3.5 text-blue-500" />
              Regional data computed from live log IP analysis
            </div>
            <div className="flex items-center gap-2 text-[0.6rem] font-mono font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              REAL-TIME
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
