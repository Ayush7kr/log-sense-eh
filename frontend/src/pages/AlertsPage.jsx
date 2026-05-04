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
  const [investigationPopup, setInvestigationPopup] = useState({ isOpen: false, alert: null })

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
      if (action === 'resolve') {
        setDbAlerts(dbAlerts.filter(a => a.id !== alertId));
      } else if (action === 'investigate') {
        setDbAlerts(dbAlerts.map(a => a.id === alertId ? { ...a, status: 'investigating' } : a));
      }

      await fetch(`/api/alerts/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      })
    } catch(e) {}
  }

  const handleInvestigateClick = (alert) => {
    handleAction(alert.id, 'investigate');
    setInvestigationPopup({ isOpen: true, alert });
  };

  const getInvestigationSteps = (type) => {
    switch (type) {
      case 'Suspicious Login Activity':
        return [
          'Verify if the target IP is associated with a known VPN or anonymizer.',
          'Check user history for typical login locations.',
          'Reset user credentials if logins were successful.',
          'Implement rate limiting on the authentication endpoint.',
          'Search logs for other users targeted by this IP.'
        ];
      case 'Blocked IP Activity':
        return [
          'Confirm that the firewall correctly dropped the payload.',
          'Review the payload signature to understand the attack type.',
          'Check if other internal systems were targeted by this IP before the block.',
          'Add the IP to global blocklists if part of a broader campaign.'
        ];
      case 'Port Scan':
        return [
          'Identify which ports were targeted to understand the attacker\'s objective.',
          'Ensure no critical services are exposed on the targeted ports.',
          'Correlate the source IP with known scanning entities (e.g., Shodan, Censys).',
          'Temporarily block the source IP if the scan is aggressive.'
        ];
      case 'Privilege Escalation':
        return [
          'IMMEDIATELY isolate the affected instance or user session.',
          'Identify the exploit path or misconfiguration used.',
          'Review all actions taken by the user post-escalation.',
          'Initiate incident response protocols for potential data breach.'
        ];
      case 'New Login Location':
        return [
          'Contact the user via a secondary channel to confirm the login.',
          'Review the device fingerprint if available.',
          'Require multi-factor authentication (MFA) for the session.',
          'Monitor the session for unusual data access patterns.'
        ];
      default:
        return [
          'Review the attached log traces for anomalous patterns.',
          'Correlate the event time with known system changes or deployments.',
          'Monitor the source IP for continued suspicious activity.',
          'Escalate to a senior analyst if the activity persists.'
        ];
    }
  };

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
                      {alert.explanation && (
                        <div className="mt-2 p-2 bg-blue-500/5 border border-blue-500/20 rounded-md text-blue-300">
                          <span className="font-bold text-[0.65rem] uppercase block mb-1">AI Risk Context</span>
                          {alert.explanation}
                        </div>
                      )}
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
                          onClick={() => handleInvestigateClick(alert)}
                          className="px-3 py-1.5 rounded-lg text-[0.65rem] bg-[var(--bg-main)] border border-[var(--border-panel)] hover:border-[var(--text-primary)] transition-all"
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

      {/* Investigation Popup Modal */}
      <AnimatePresence>
        {investigationPopup.isOpen && investigationPopup.alert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-panel w-full max-w-lg overflow-hidden border border-[var(--border-panel)] shadow-2xl bg-[var(--bg-main)]"
            >
              <div className="p-5 border-b border-[var(--border-panel)] flex items-start justify-between bg-blue-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)]">Investigation Playbook</h3>
                    <p className="text-xs text-[var(--text-secondary)]">{investigationPopup.alert.type}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setInvestigationPopup({ isOpen: false, alert: null })}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xl font-medium leading-none"
                >
                  &times;
                </button>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="text-sm text-[var(--text-secondary)] mb-2">
                  Recommended response actions for <span className="font-medium text-[var(--text-primary)]">{investigationPopup.alert.ip}</span>:
                </div>
                
                <ul className="space-y-3">
                  {getInvestigationSteps(investigationPopup.alert.type).map((step, idx) => (
                    <motion.li 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      key={idx} 
                      className="flex items-start gap-3 text-sm bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-panel)]"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-[var(--text-primary)]">{step}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
              
              <div className="p-4 border-t border-[var(--border-panel)] flex justify-end gap-3">
                <button 
                  onClick={() => setInvestigationPopup({ isOpen: false, alert: null })}
                  className="px-4 py-2 rounded-lg text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
                >
                  Acknowledge & Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

