import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRing, CheckCircle, Search, ShieldAlert, Activity } from 'lucide-react'
import { useLogsContext } from '../hooks/LogsContext'

export default function AlertsPage() {
  const { alerts: liveAlerts, opsMode } = useLogsContext()
  const [dbAlerts, setDbAlerts] = useState([])
  const [dbSuspicious, setDbSuspicious] = useState([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('alerts')

  useEffect(() => {
    fetch(`/api/alerts?mode=${opsMode || 'sim'}`)
      .then(res => res.json())
      .then(data => setDbAlerts(data.alerts || []))
      .catch(() => {})
      
    if (opsMode === 'aws') {
      fetch(`/api/logs/suspicious?mode=aws`)
        .then(res => res.json())
        .then(data => setDbSuspicious(data.logs || []))
        .catch(() => {})
    }
  }, [opsMode])

  useEffect(() => {
    if (opsMode === 'aws' && !liveAlerts.length && !dbAlerts.length && dbSuspicious.length > 0) {
      setViewMode('suspicious')
    } else {
      setViewMode('alerts')
    }
  }, [opsMode, liveAlerts.length, dbAlerts.length, dbSuspicious.length])

  // Merge live WS updates with initial DB load
  const mergedAlerts = [...liveAlerts, ...dbAlerts].reduce((acc, current) => {
    if (!acc.find(item => item.id === current.id)) {
      acc.push(current)
    }
    return acc
  }, []).filter(a => a.status !== 'resolved')

  const filteredAlerts = mergedAlerts.filter(a => 
    a.type?.toLowerCase().includes(search.toLowerCase()) ||
    a.description?.toLowerCase().includes(search.toLowerCase()) ||
    a.ip?.includes(search)
  )

  const handleAction = async (alertId, action) => {
    try {
      await fetch(`/api/alerts/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      })
    } catch(e) {}
  }

  const getSeverityStyles = (sev) => {
    if (sev === 'Critical') return 'border-red-500/50 bg-red-500/10 text-red-400'
    if (sev === 'High') return 'border-orange-500/50 bg-orange-500/10 text-orange-400'
    return 'border-amber-500/50 bg-amber-500/10 text-amber-400'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-sora flex items-center gap-3">
            <BellRing className="w-7 h-7 text-red-500" />
            Operational Alerts
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">{mergedAlerts.length} Active</span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time threat detection from the strict security logic engine.
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input 
            type="text" 
            placeholder="Search filters..." 
            className="glass-input pl-9 pr-4 py-2 text-sm w-full md:w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-4 border-b border-[var(--border-panel)] pb-2">
        <button 
          onClick={() => setViewMode('alerts')}
          className={`text-sm font-bold pb-2 transition-colors ${viewMode === 'alerts' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          Show Escalated Alerts
        </button>
        {opsMode === 'aws' && (
          <button 
            onClick={() => setViewMode('suspicious')}
            className={`text-sm font-bold pb-2 transition-colors ${viewMode === 'suspicious' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Show Suspicious Activity ({dbSuspicious.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {viewMode === 'suspicious' ? (
            <>
              {dbSuspicious.length === 0 && (
                <motion.div initial={{ opacity: 0 }} className="col-span-full py-20 text-center text-[var(--text-secondary)]">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500/50" />
                  <p>No suspicious activities matched the backend filter logs.</p>
                </motion.div>
              )}
              {dbSuspicious.filter(l => l.event.includes(search) || l.ip.includes(search)).map(log => (
                <motion.div
                  key={log.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  className="glass-panel p-5 border-l-4 border-l-amber-500/50 flex flex-col transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      <h3 className="font-bold text-sm text-amber-400">Suspicious Event</h3>
                    </div>
                    <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full border ${getSeverityStyles(log.risk)}`}>
                      {log.risk}
                    </span>
                  </div>
                  <div className="text-[0.75rem] text-[var(--text-secondary)] mb-4 flex-1">
                    <p className="leading-relaxed font-medium text-[var(--text-primary)]">{log.event}</p>
                    <div className="mt-3 text-[0.65rem] space-y-1">
                      <p>Mapped IP: <span className="font-mono text-amber-400">{log.ip}</span></p>
                      <p>Time Trace: {new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="border-t border-[var(--border-panel)] pt-4 mt-auto">
                    <span className="text-[0.65rem] text-[var(--text-secondary)]">
                      Not Escalated (Rule bounds unmet)
                    </span>
                  </div>
                </motion.div>
              ))}
            </>
          ) : (
            <>
              {filteredAlerts.length === 0 && (
                <motion.div initial={{ opacity: 0 }} className="col-span-full py-20 text-center text-[var(--text-secondary)]">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500/50" />
                  {opsMode === 'aws' ? (
                    <p>No high-risk alerts detected.<br/><span className="text-sm cursor-pointer hover:underline text-blue-400 mt-2 block" onClick={() => setViewMode('suspicious')}>Showing suspicious activity instead.</span></p>
                  ) : <p>No active operational alerts.</p>}
                </motion.div>
              )}
              {filteredAlerts.map(alert => {
                const isInvestigating = alert.status === 'investigating';
                const logs = (() => { try { return JSON.parse(alert.log_ids) } catch(e){ return [] } })();
                
                return (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    className={`glass-panel p-5 border-l-4 flex flex-col transition-all ${
                      isInvestigating ? 'border-l-blue-500/50 bg-blue-500/5' : 'border-l-red-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className={`w-4 h-4 ${isInvestigating ? 'text-blue-400' : 'text-red-400'}`} />
                        <h3 className={`font-bold text-sm ${isInvestigating ? 'text-blue-400' : 'text-red-400'}`}>
                          {alert.type}
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full border ${getSeverityStyles(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        {isInvestigating && (
                          <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 animate-pulse">
                            Investigating
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[0.75rem] text-[var(--text-secondary)] mb-4 flex-1">
                      <p className="leading-relaxed font-medium text-[var(--text-primary)]">{alert.description}</p>
                      <div className="mt-3 text-[0.65rem] space-y-1">
                        <p>Target IP: <span className="font-mono text-blue-400">{alert.ip}</span></p>
                        <p>Trigger Time: {new Date(alert.timestamp).toLocaleString()}</p>
                        <p>Mapped Logs: {logs.length} trace(s) attached.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--border-panel)] pt-4 mt-auto">
                      <span className="flex items-center gap-2 text-[0.65rem] text-[var(--text-secondary)]">
                        <span className={`w-2 h-2 rounded-full ${isInvestigating ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`} />
                        {isInvestigating ? 'Under review' : 'Requires triage'}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAction(alert.id, 'investigate')}
                          disabled={isInvestigating}
                          className="px-3 py-1.5 rounded-lg text-[0.65rem] bg-[var(--bg-main)] border border-[var(--border-panel)] hover:border-[var(--text-primary)] transition-all disabled:opacity-50"
                        >
                          Investigate &rarr;
                        </button>
                        <button 
                          onClick={() => handleAction(alert.id, 'resolve')}
                          className="px-3 py-1.5 rounded-lg text-[0.65rem] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-1 transition-all"
                        >
                          <CheckCircle className="w-3 h-3" /> Mark safe
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
