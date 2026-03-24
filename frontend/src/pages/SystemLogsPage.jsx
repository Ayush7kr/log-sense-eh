import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HardDrive, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react'

export default function SystemLogsPage() {
  const [logs, setLogs] = useState([])
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)

  const fetchLogs = async () => {
    setIsFetching(true)
    setError(null)
    try {
      const resp = await fetch('/api/pc-logs')
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
  }, [])

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-sora flex items-center gap-3">
            <HardDrive className="w-7 h-7 text-emerald-500" />
            Local System Logs
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Windows Event Viewer Diagnostics (Application & System)
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
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="glass-panel flex flex-col overflow-hidden border-border-panel/30 flex-1 lg:min-h-[500px]">
        <div className="p-3 border-b border-border-panel/50 bg-[var(--bg-panel)] flex items-center gap-2">
          <span className="text-[0.7rem] font-mono text-text-secondary uppercase tracking-widest">Windows Diagnostic Stream</span>
        </div>
        <div className="flex-1 overflow-auto scroll-thin">
          <table className="min-w-full text-[0.7rem] font-mono border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-[var(--bg-main)] backdrop-blur-md">
              <tr className="text-text-secondary text-left">
                <th className="px-5 py-3 border-b border-border-panel/50">Timestamp</th>
                <th className="px-5 py-3 border-b border-border-panel/50">Computer</th>
                <th className="px-5 py-3 border-b border-border-panel/50">Provider / Event</th>
                <th className="px-5 py-3 border-b border-border-panel/50 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-panel/10">
              {logs.map((log) => (
                <motion.tr 
                  key={log.id} 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`group hover:brightness-[0.9] dark:hover:brightness-[1.1] transition-colors ${log.risk === 'High' ? 'bg-red-500/5' : ''}`}
                >
                  <td className="px-5 py-3 text-text-secondary whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-5 py-3 text-text-primary font-bold">{log.user}</td>
                  <td className="px-5 py-3 text-text-secondary group-hover:text-text-primary">{log.event}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[0.6rem] font-bold border ${
                        log.risk === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        log.risk === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      {log.risk}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {logs.length === 0 && !isFetching && !error && (
                <tr>
                  <td colSpan="4">
                    <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                      <ShieldCheck className="w-12 h-12 mb-4 text-emerald-500/50" />
                      <p className="text-sm">No warnings or errors found in local system logs.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
