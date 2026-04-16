import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HardDrive, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useLogsContext } from '../hooks/LogsContext'

export default function SystemLogsPage() {
  const { opsMode } = useLogsContext()
  const [logs, setLogs] = useState([])
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)

  const fetchLogs = async () => {
    setIsFetching(true)
    setError(null)
    try {
      const resp = await fetch(`/api/system-logs?mode=${opsMode || 'sim'}`)
      const json = await resp.json()
      if (resp.ok) {
        setLogs(json.logs || [])
      } else {
        setError(json.error || 'Failed to fetch PC logs')
      }
    } catch (err) {
      setError('Network error fetching PC logs.')
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [opsMode])

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-sora flex items-center gap-3">
            <HardDrive className="w-7 h-7 text-emerald-500" />
            Backend System Logs
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Application-Level System State & Event Tracer
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isFetching}
          className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Fetching...' : 'Refresh Logs'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="glass-panel flex flex-col overflow-hidden flex-1 lg:min-h-[500px]">
        <div className="p-3 border-b border-[var(--border-panel)] bg-[var(--bg-panel)] flex items-center justify-between">
          <span className="text-[0.7rem] font-mono text-[var(--text-secondary)] uppercase tracking-widest">Windows Diagnostic Stream</span>
          <span className="text-[0.6rem] font-mono text-[var(--text-secondary)]">{logs.length} entries</span>
        </div>
        <div className="flex-1 overflow-auto scroll-thin">
          <table className="min-w-full log-table border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-[var(--bg-main)] backdrop-blur-md">
              <tr className="text-[var(--text-secondary)] text-left">
                <th className="px-4 py-3 border-b border-[var(--border-panel)]">Timestamp</th>
                <th className="px-4 py-3 border-b border-[var(--border-panel)]">Computer</th>
                <th className="px-4 py-3 border-b border-[var(--border-panel)]">Provider / Event</th>
                <th className="px-4 py-3 border-b border-[var(--border-panel)] text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-panel)]">
              {logs.map((log) => (
                <motion.tr 
                  key={log.id} 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => setSelectedLog(log)}
                  className={`group cursor-pointer hover:bg-[var(--accent-glow)] transition-colors ${
                    log.risk === 'High' ? 'bg-red-500/5' : log.risk === 'Medium' ? 'bg-amber-500/3' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 text-[var(--text-secondary)] whitespace-nowrap text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-[var(--text-primary)] font-semibold">{log.user}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] max-w-md truncate">{log.event}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold border ${
                        log.risk === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        log.risk === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {log.risk}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {logs.length === 0 && !isFetching && !error && (
                <tr>
                  <td colSpan="4">
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
                      <ShieldCheck className="w-12 h-12 mb-4 text-emerald-500/30" />
                      <p className="text-sm font-medium">No system logs available</p>
                      <p className="text-xs mt-1 opacity-50">System footprint traces are clean.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--bg-panel)] border border-[var(--border-panel)] shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 md:p-6 border-b border-[var(--border-panel)] flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] font-sora">Event Record View</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">ID: {selectedLog.id} | {new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-widest border ${
                  selectedLog.risk === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  selectedLog.risk === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {selectedLog.risk} RISK
                </span>
              </div>
              <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-1 scroll-thin">
                <div>
                  <h4 className="text-[0.65rem] uppercase tracking-widest font-bold text-[var(--text-secondary)] mb-2">Event Synopsis</h4>
                  <div className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-panel)] text-sm text-[var(--text-primary)]">
                    {selectedLog.event}
                  </div>
                </div>
                <div>
                  <h4 className="text-[0.65rem] uppercase tracking-widest font-bold text-[var(--text-secondary)] mb-2">Technical Details</h4>
                  <pre className="p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-panel)] text-xs text-blue-400 font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
                    {selectedLog.details || JSON.stringify(selectedLog, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="p-4 border-t border-[var(--border-panel)] bg-[var(--bg-main)] flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-6 py-2 rounded-xl text-sm font-bold bg-[var(--bg-panel)] border border-[var(--border-panel)] hover:bg-[var(--accent-glow)] transition-colors"
                >
                  Close Trace
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
