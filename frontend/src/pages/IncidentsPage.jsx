import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, Crosshair, Network, History, CheckCircle, ShieldBan, X, AlertTriangle, ArrowRight } from 'lucide-react'
import { useLogsContext } from '../hooks/LogsContext'

export default function IncidentsPage() {
  const { incidents: liveIncidents, alerts, opsMode } = useLogsContext()
  const [dbIncidents, setDbIncidents] = useState([])
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [details, setDetails] = useState({ logs: [], alerts: [] })
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    fetch(`/api/incidents?mode=${opsMode || 'sim'}`)
      .then(r => r.json())
      .then(d => setDbIncidents(d.incidents || []))
      .catch(() => {})
  }, [opsMode])

  const merged = [...liveIncidents, ...dbIncidents].reduce((acc, current) => {
    if (!acc.find(item => item.id === current.id)) acc.push(current);
    return acc;
  }, [])

  const activeIncidents = merged.filter(i => i.status !== 'resolved')

  const loadDetails = async (incident) => {
    setSelectedIncident(incident)
    setLoadingDetails(true)
    try {
      const res = await fetch(`/api/incidents/${incident.id}`)
      const data = await res.json()
      setDetails({ logs: data.timeline || [], alerts: data.alerts || [] })
    } catch(e){}
    setLoadingDetails(false)
  }

  const handleAction = async (id, action) => {
    try {
      await fetch(`/api/incidents/${id}/${action}`, { method: 'POST' })
      if (action === 'resolve') setSelectedIncident(null)
    } catch(e) {}
  }

  // Live Updates for Selected Incident
  useEffect(() => {
    if (selectedIncident) {
      const liveUpdate = activeIncidents.find(i => i.id === selectedIncident.id);
      if (liveUpdate && liveUpdate !== selectedIncident) {
        setSelectedIncident(liveUpdate)
        // refresh payload automatically
        fetch(`/api/incidents/${liveUpdate.id}`).then(r=>r.json()).then(data => setDetails({ logs: data.timeline || [], alerts: data.alerts || [] }))
      }
    }
  }, [liveIncidents, dbIncidents])

  const getStatusColor = (status) => {
    if (status === 'blocked') return 'border-amber-500/50 bg-amber-500/10 text-amber-400'
    return 'border-red-500/50 bg-red-500/10 text-red-400'
  }

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 relative">
      {/* List Panel */}
      <div className={`flex-[1] flex flex-col space-y-4 transition-all ${selectedIncident ? 'hidden lg:flex lg:w-1/3 max-w-[400px]' : 'w-full'}`}>
        <div>
          <h2 className="text-2xl font-bold font-sora flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-red-500" />
            Security Incidents
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Aggregated multi-stage threat events.</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 scroll-thin">
          <AnimatePresence>
            {activeIncidents.length === 0 && (
              <motion.div initial={{ opacity: 0 }} className="py-20 text-center text-[var(--text-secondary)]">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500/30" />
                <p className="font-bold text-sm">No active incidents detected.</p>
                <p className="text-xs opacity-60 mt-1">System operating normally.</p>
              </motion.div>
            )}
            {activeIncidents.map(incident => (
              <motion.div
                key={incident.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => loadDetails(incident)}
                className={`glass-panel p-4 cursor-pointer hover:border-[var(--accent-primary)] transition-all ${selectedIncident?.id === incident.id ? 'border-[var(--accent-primary)] bg-[var(--accent-glow)]' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">{incident.type}</h3>
                  <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(incident.status)} uppercase`}>
                    {incident.status}
                  </span>
                </div>
                <p className="text-[0.7rem] text-[var(--text-secondary)] mb-3 line-clamp-2">{incident.description}</p>
                <div className="flex items-center gap-4 text-[0.65rem] font-mono">
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <Network className="w-3.5 h-3.5" />
                    <span>{incident.attacker_ip}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Investigation Panel */}
      {selectedIncident && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-[2] glass-panel flex flex-col overflow-hidden shadow-2xl relative"
        >
          <div className="p-5 md:p-6 border-b border-[var(--border-panel)] flex items-start justify-between bg-gradient-to-br from-red-500/5 to-transparent">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold font-sora text-[var(--text-primary)]">{selectedIncident.type}</h3>
                <span className={`px-2 py-0.5 text-[0.6rem] font-bold uppercase rounded-full border ${getStatusColor(selectedIncident.status)}`}>
                  {selectedIncident.status}
                </span>
                <span className="px-2 py-0.5 text-[0.65rem] font-mono bg-[var(--bg-main)] text-[var(--text-secondary)] rounded-md border border-[var(--border-panel)]">
                  INC-{selectedIncident.id}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{selectedIncident.description}</p>
            </div>
            <button onClick={() => setSelectedIncident(null)} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors hidden md:block">
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          <div className="p-3 bg-[var(--bg-main)] border-b border-[var(--border-panel)] flex flex-wrap gap-4">
            <button 
              onClick={() => handleAction(selectedIncident.id, 'block')}
              disabled={selectedIncident.status === 'blocked'}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <ShieldBan className="w-4 h-4" />
              {selectedIncident.status === 'blocked' ? 'IP Blocked' : 'Block IP'}
            </button>
            <button 
              onClick={() => handleAction(selectedIncident.id, 'resolve')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Resolved
            </button>
          </div>

          {/* Timeline and Logs View */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 scroll-thin space-y-8">
            {loadingDetails ? (
              <div className="flex justify-center py-10"><span className="animate-pulse text-[var(--accent-primary)] font-mono text-sm">Loading telemetry...</span></div>
            ) : (
              <>
                {/* Visual Timeline Graph */}
                <div className="space-y-4">
                  <h4 className="text-[0.65rem] font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4" /> Event Trace Timeline
                  </h4>
                  <div className="bg-[var(--bg-main)] border border-[var(--border-panel)] rounded-xl p-4 md:p-6 overflow-x-auto scroll-thin">
                    <div className="flex items-center min-w-max gap-4 px-4 py-8">
                      {/* Attacker Node */}
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full border-2 border-amber-500/50 bg-amber-500/10 flex items-center justify-center neon-ring">
                          <Network className="w-5 h-5 text-amber-400" />
                        </div>
                        <p className="text-[0.65rem] font-mono mt-3 text-amber-400 max-w-[100px] text-center truncate">{selectedIncident.attacker_ip}</p>
                        <p className="text-[0.55rem] text-[var(--text-secondary)] uppercase">Attacker IP</p>
                      </div>

                      {/* Timeline Events from JSON */}
                      {(() => {
                        let parsedT = [];
                        try { parsedT = JSON.parse(selectedIncident.timeline) } catch(e){}
                        return parsedT.map((evt, idx) => (
                          <div key={idx} className="flex items-center">
                            <ArrowRight className="w-6 h-6 text-[var(--border-panel)] mx-2 shrink-0" />
                            <div className="flex flex-col items-center">
                              <div className="w-12 h-12 rounded-xl border border-red-500/30 bg-[var(--bg-panel)] flex items-center justify-center relative shadow-lg shadow-red-500/10">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[0.5rem] font-bold w-4 h-4 rounded-full flex items-center justify-center">{idx + 1}</span>
                              </div>
                              <p className="text-[0.6rem] font-semibold mt-3 text-[var(--text-primary)] max-w-[120px] text-center">{evt.step}</p>
                              <p className="text-[0.55rem] text-[var(--text-secondary)] mt-0.5">{new Date(evt.time).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                </div>

                {/* Attached Logs Grid */}
                <div>
                  <h4 className="text-[0.65rem] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Attached Telemetry ({details.logs.length})</h4>
                  <div className="rounded-xl border border-[var(--border-panel)] overflow-hidden">
                    <table className="min-w-full log-table text-left">
                      <thead className="bg-[var(--bg-main)]">
                        <tr className="text-[var(--text-secondary)]">
                          <th>Time</th>
                          <th>IP</th>
                          <th>Event</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-panel)]">
                        {details.logs.map(log => (
                          <tr key={log.id} className="hover:bg-[var(--accent-glow)] transition-colors">
                            <td className="text-[var(--text-secondary)]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                            <td className="text-blue-400 mono-trace">{log.ip}</td>
                            <td className={`mono-trace ${log.risk === 'High' ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>{log.event}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
