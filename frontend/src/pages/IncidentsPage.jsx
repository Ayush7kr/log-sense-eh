import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import { useSOCStore } from '../store/SOCStore'
import { 
  GanttChartSquare, 
  ChevronRight, 
  ShieldAlert, 
  Clock, 
  Search,
  ArrowRight,
  Activity,
  History,
  Info,
  ShieldCheck,
  ZapOff
} from 'lucide-react'

export default function IncidentsPage() {
  const { data, loading, refetch } = useApi('/api/incidents', { pollMs: 5000 })
  const incidents = data?.incidents || []
  
  const { systemStatus, setSystemStatus } = useSOCStore()
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const handleInvestigate = async (id) => {
    setSelectedId(id)
    setSystemStatus('investigating')
    setLoadingDetail(true)
    try {
      const resp = await fetch(`/api/incidents/${id}`)
      const json = await resp.json()
      setDetail(json)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleAction = async (action, id) => {
    try {
      await fetch(`/api/incidents/${id}/${action}`, { method: 'POST' })
      refetch()
      if (action === 'resolve') {
        setSelectedId(null)
        setSystemStatus('streaming')
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Reset system status if nothing selected
  useEffect(() => {
    if (!selectedId && systemStatus === 'investigating') {
      setSystemStatus('streaming')
    }
  }, [selectedId, systemStatus, setSystemStatus])

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between bg-slate-900/40 p-5 rounded-2xl border border-border-panel/30">
        <div>
          <h2 className="text-2xl font-bold font-sora flex items-center gap-3">
            <GanttChartSquare className="w-7 h-7 text-accent-primary" />
            Security Incidents
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Stateful investigation of correlated multi-stage attack chains.
          </p>
        </div>
        <div className="flex gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input className="glass-input glass-input-search text-xs w-72" placeholder="Search by ID, IP, or Signature..." />
            </div>
            <div className={`px-4 py-2 rounded-xl text-[0.65rem] font-bold uppercase tracking-widest flex items-center gap-2 border transition-all ${
                systemStatus === 'investigating' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
            }`}>
                <span className={`h-2 w-2 rounded-full ${systemStatus === 'investigating' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                {systemStatus}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
        {/* Incident List */}
        <div className={`lg:col-span-4 flex flex-col gap-3 ${selectedId ? 'hidden lg:flex' : ''}`}>
          <div className="h-[calc(100vh-280px)] overflow-y-auto pr-2 scroll-thin space-y-3">
            {incidents.map((incident) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => handleInvestigate(incident.id)}
                className={`glass-panel p-4 cursor-pointer group transition-all relative overflow-hidden ${
                  selectedId === incident.id ? 'border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary/20' : ''
                }`}
              >
                {selectedId === incident.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-[0.6rem] font-bold uppercase tracking-wider ${
                        incident.severity === 'High' || incident.severity === 'Critical' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                      }`}>
                        {incident.severity}
                      </span>
                      <span className="text-[0.7rem] text-text-secondary flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(incident.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-text-primary group-hover:text-accent-primary transition-colors">
                      {incident.type}
                    </h3>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border-panel/30 text-[0.6rem] font-mono">
                      <span className="text-accent-primary font-bold">{incident.attacker_ip}</span>
                      <span className="text-text-secondary">→</span>
                      <span className="text-slate-200">{incident.target_user}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-secondary group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
            {loading && incidents.length === 0 && <p className="text-center py-10 text-text-secondary">Fetching incidents...</p>}
          </div>
        </div>

        {/* Investigation Panel */}
        <div className="lg:col-span-8 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {!selectedId ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass-panel flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-900/20"
              >
                <div className="w-20 h-20 rounded-3xl bg-slate-800/50 flex items-center justify-center mb-6 border border-slate-700/50">
                    <ShieldAlert className="w-10 h-10 text-text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-text-primary font-sora">Incident Forensic Workbench</h3>
                <p className="text-sm text-text-secondary max-w-sm mt-3 leading-relaxed">
                    Select a security cluster from the operational list to access deep timeline forensics and entity relationship graphs.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedId}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="glass-panel flex-1 flex flex-col overflow-hidden border-accent-primary/40 bg-slate-950/40"
              >
                {loadingDetail ? (
                   <div className="flex-1 flex items-center justify-center flex-col gap-4">
                        <Activity className="w-10 h-10 text-accent-primary animate-spin" />
                        <span className="text-xs font-mono text-text-secondary uppercase tracking-[0.2em]">Correlating Evidence...</span>
                   </div>
                ) : detail && (
                   <>
                    <div className="p-6 border-b border-border-panel flex items-center justify-between bg-slate-900/60 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedId(null)} className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors">
                                <ArrowRight className="w-5 h-5 rotate-180" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold font-sora">Incident Investigation</h3>
                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[0.65rem] font-mono text-text-secondary border border-slate-700 tracking-tighter">ID: {detail.incident.id}</span>
                                </div>
                                <p className="text-xs text-text-secondary mt-1">{detail.incident.description}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {detail.incident.status === 'Resolved' ? (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Resolved
                                </div>
                            ) : detail.incident.status === 'Blocked' ? (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold">
                                    <ZapOff className="w-3.5 h-3.5" /> IP Blocked
                                </div>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => handleAction('block', detail.incident.id)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20 text-xs font-bold hover:bg-red-600 hover:text-white transition-all"
                                    >
                                        <ZapOff className="w-3.5 h-3.5" /> Block IP
                                    </button>
                                    <button 
                                        onClick={() => handleAction('resolve', detail.incident.id)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all"
                                    >
                                        <ShieldCheck className="w-3.5 h-3.5" /> Mark Resolved
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 scroll-thin space-y-10">
                        {/* Graph Preview */}
                        <div className="bg-slate-900/40 p-6 rounded-2xl border border-border-panel/30">
                             <h4 className="text-[0.6rem] uppercase tracking-widest text-accent-primary font-bold mb-8 flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Entity Relationship Logic
                             </h4>
                             <div className="relative flex items-center justify-between px-10">
                                <div className="absolute top-1/2 left-[15%] right-[15%] h-px bg-gradient-to-r from-red-500/50 via-accent-primary/50 to-emerald-500/50" />
                                
                                <div className="z-10 flex flex-col items-center gap-3 group">
                                    <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-red-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.1)] group-hover:scale-110 transition-transform">
                                        <ShieldAlert className="w-7 h-7 text-red-500" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-mono font-bold">{detail.incident.attacker_ip}</p>
                                        <p className="text-[0.55rem] text-text-secondary uppercase mt-0.5">Aggressor Node</p>
                                    </div>
                                </div>

                                <div className="z-10 flex flex-col items-center gap-3 bg-slate-900 px-4 py-2 border border-slate-800 rounded-xl">
                                    <div className="text-[0.6rem] font-bold text-slate-400 font-mono italic">"{detail.incident.type}"</div>
                                    <ArrowRight className="w-4 h-4 text-text-secondary" />
                                </div>

                                <div className="z-10 flex flex-col items-center gap-3 group">
                                    <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.1)] group-hover:scale-110 transition-transform">
                                        <History className="w-7 h-7 text-emerald-500" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-mono font-bold leading-none">{detail.incident.target_user}</p>
                                        <p className="text-[0.55rem] text-text-secondary uppercase mt-1">Target Asset</p>
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* Timeline */}
                        <div className="space-y-6">
                             <h4 className="text-[0.6rem] uppercase tracking-widest text-accent-primary font-bold flex items-center gap-2">
                                <History className="w-4 h-4" /> Attack Chain Forensics
                             </h4>
                             <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                                {detail.timeline.map((log) => (
                                    <div key={log.id} className="relative pl-8 group">
                                        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 ${log.risk === 'High' ? 'border-red-500 bg-slate-950' : 'border-slate-700 bg-slate-900'} flex items-center justify-center z-10 transition-all group-hover:scale-110`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${log.risk === 'High' ? 'bg-red-500' : 'bg-slate-600'}`} />
                                        </div>
                                        <div className="glass-panel p-4 text-[0.7rem] bg-slate-900/20 hover:bg-slate-900/40 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-mono text-text-secondary text-[0.6rem] bg-slate-800 px-2 py-0.5 rounded">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[0.55rem] font-bold uppercase tracking-widest ${log.risk === 'High' ? 'bg-red-500/10 text-red-500' : 'bg-slate-500/10 text-slate-400'}`}>
                                                    {log.risk} RISK
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <p className="text-slate-200 font-bold mb-1">{log.event}</p>
                                                    <p className="text-slate-500 font-mono text-[0.6rem]">
                                                        {log.ip} <ArrowRight className="inline w-2 h-2 mx-1" /> {log.user}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex gap-4 backdrop-blur-sm">
                            <Info className="w-6 h-6 text-accent-primary shrink-0" />
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-accent-primary uppercase tracking-widest">Adversary TTP Insight</p>
                                <p className="text-xs text-text-secondary italic leading-relaxed">
                                    "This attack chain demonstrates a rapid transition from brute force to privilege escalation. 
                                    The source IP exhibits behavior consistent with known botnet infrastructure using rotating user-agents."
                                </p>
                            </div>
                        </div>
                    </div>
                   </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
