import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'
import { useLogsContext } from '../hooks/LogsContext'
import { 
  TerminalSquare, 
  Upload, 
  FileText, 
  Search, 
  Filter, 
  CircleDot,
  ArrowDownToLine,
  Activity,
  Pause,
  Play,
} from 'lucide-react'

export default function LiveLogsPage() {
  const { logs, paused, togglePause, connected, opsMode } = useLogsContext()
  const [eventType, setEventType] = useState('All')
  const [riskLevel, setRiskLevel] = useState('All')
  const [ipFilter, setIpFilter] = useState('')
  
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchType = eventType === 'All' || log.event.includes(eventType)
      const matchRisk = riskLevel === 'All' || log.risk === riskLevel
      const matchIp = !ipFilter || log.ip.includes(ipFilter.trim())
      return matchType && matchRisk && matchIp
    })
  }, [logs, eventType, riskLevel, ipFilter])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const text = await file.text()
      const resp = await fetch('/api/forensic/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text
      })
      const json = await resp.json()
      setUploadStatus({ type: 'success', message: `Imported ${json.ingestedCount} forensic logs successfully.` })
    } catch (err) {
      setUploadStatus({ type: 'error', message: 'Failed to parse/upload logs.' })
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadStatus(null), 5000)
    }
  }

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-sora flex items-center gap-3">
            <TerminalSquare className="w-7 h-7 text-[var(--accent-primary)]" />
            Live Telemetry Ingest
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time packet capture and authentication audit stream.
          </p>
        </div>
        <div className="flex items-center gap-3">
            {/* Live/Paused status badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              paused 
                ? 'bg-amber-500/10 border-amber-500/30' 
                : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
                <CircleDot className={`w-3 h-3 ${paused ? 'text-amber-400' : 'text-emerald-500 animate-pulse'}`} />
                <span className={`text-[0.65rem] font-bold uppercase tracking-widest ${paused ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {paused ? 'PAUSED' : 'LIVE'}
                </span>
            </div>

            {/* WebSocket connection indicator */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[0.6rem] font-mono ${
              connected ? 'text-emerald-500' : 'text-red-400'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-400 animate-pulse'}`} />
              {connected ? 'WS' : 'HTTP'}
            </div>

            {/* Pause/Resume button */}
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={togglePause}
                className={`p-2.5 rounded-xl border transition-all ${
                  paused 
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                    : 'border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                }`}
                title={paused ? 'Resume stream' : 'Pause stream'}
            >
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <div className="space-y-6">
            <div className="glass-panel p-5 space-y-4">
                <h3 className="text-[0.65rem] font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5" /> Filter Matrix
                </h3>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[0.6rem] text-[var(--text-secondary)] uppercase font-bold">Event Vector</label>
                        <select className="glass-input w-full text-xs" value={eventType} onChange={e => setEventType(e.target.value)}>
                            <option value="All">All</option>
                            <option value="Login Success">Login Success</option>
                            <option value="Failed Login">Failed Login</option>
                            <option value="Port Scan">Port Scan</option>
                            <option value="Privilege Escalation">Privilege Escalation</option>
                            <option value="Network Connection">Network Connection</option>
                            <option value="Brute Force">Brute Force</option>
                            <option value="DDoS">DDoS</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[0.6rem] text-[var(--text-secondary)] uppercase font-bold">Severity</label>
                        <select className="glass-input w-full text-xs" value={riskLevel} onChange={e => setRiskLevel(e.target.value)}>
                            <option value="All">All</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[0.6rem] text-[var(--text-secondary)] uppercase font-bold">Origin IP</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                            <input className="glass-input glass-input-search w-full text-xs" placeholder="e.g. 192.168..." value={ipFilter} onChange={e => setIpFilter(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className={`glass-panel p-5 border-dashed relative group overflow-hidden ${opsMode === 'forensic' ? 'border-amber-500/40' : 'border-[var(--border-panel)] opacity-50'}`}>
                {opsMode === 'forensic' && <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />}
                <h3 className={`text-[0.65rem] font-bold uppercase tracking-widest flex items-center gap-2 mb-3 ${opsMode === 'forensic' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}>
                    <Upload className="w-3.5 h-3.5" /> Upload Forensic Logs
                </h3>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-all relative ${opsMode === 'forensic' ? 'border-amber-500/30 hover:border-amber-400 cursor-pointer' : 'border-[var(--border-panel)] cursor-not-allowed'}`}>
                    <input type="file" className="hidden" accept=".log,.txt" onChange={handleFileUpload} disabled={isUploading || opsMode !== 'forensic'} />
                    <FileText className={`w-8 h-8 mb-2 ${isUploading ? 'text-amber-400 animate-bounce' : 'text-[var(--text-secondary)]'}`} />
                    <span className="text-[0.65rem] font-bold text-[var(--text-primary)]">Drop forensic logs</span>
                    <span className="text-[0.55rem] text-[var(--text-secondary)] mt-1">.log, .txt supported</span>
                </label>
                {opsMode !== 'forensic' && (
                  <div className="mt-3 text-[0.55rem] font-medium text-center text-[var(--text-secondary)]">Available only under Forensic Mode.</div>
                )}
                <AnimatePresence>
                    {uploadStatus && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-3 p-2 rounded text-[0.65rem] font-bold text-center ${uploadStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {uploadStatus.message}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Quick stats */}
            <div className="glass-panel p-4">
              <div className="text-[0.6rem] text-[var(--text-secondary)] uppercase font-bold mb-2">Stream Stats</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Showing</span>
                  <span className="font-mono text-[var(--text-primary)]">{filteredLogs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">High Risk</span>
                  <span className="font-mono text-red-400">{filteredLogs.filter(l => l.risk === 'High').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Unique IPs</span>
                  <span className="font-mono text-[var(--text-primary)]">{new Set(filteredLogs.map(l => l.ip)).size}</span>
                </div>
              </div>
            </div>
        </div>

        {/* Log Table */}
        <div className="lg:col-span-3 glass-panel flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[var(--border-panel)] bg-[var(--bg-panel)] flex items-center justify-between">
                <span className="text-[0.7rem] font-mono text-[var(--text-secondary)] uppercase tracking-widest">Active Packet Stream</span>
                <div className="flex items-center gap-2">
                  <span className="text-[0.6rem] font-mono text-[var(--text-secondary)]">{filteredLogs.length} entries</span>
                  <button className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="Export">
                      <ArrowDownToLine className="w-4 h-4" />
                  </button>
                </div>
            </div>
            <div className="flex-1 h-[calc(100vh-250px)] overflow-auto scroll-thin">
                <table className="min-w-full log-table border-separate border-spacing-0">
                    <thead className="sticky top-0 z-20 bg-[var(--bg-main)] backdrop-blur-md">
                        <tr className="text-[var(--text-secondary)] text-left">
                            <th className="px-4 py-3 border-b border-[var(--border-panel)]">Source</th>
                            <th className="px-4 py-3 border-b border-[var(--border-panel)]">Timestamp</th>
                            <th className="px-4 py-3 border-b border-[var(--border-panel)]">Identity</th>
                            <th className="px-4 py-3 border-b border-[var(--border-panel)]">Origin</th>
                            <th className="px-4 py-3 border-b border-[var(--border-panel)]">Activity</th>
                            <th className="px-4 py-3 border-b border-[var(--border-panel)] text-right">Risk</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-panel)]">
                        {filteredLogs.map((log) => (
                            <motion.tr 
                                key={log.id} 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className={`group hover:bg-[var(--accent-glow)] transition-colors ${log.risk === 'High' ? 'bg-red-500/5' : ''}`}
                            >
                                <td className="px-4 py-2.5">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[0.6rem] font-bold border ${log.source === 'AWS' ? 'bg-red-500/10 text-red-400 border-red-500/20' : log.source === 'FORENSIC' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${log.source === 'AWS' ? 'bg-red-500' : log.source === 'FORENSIC' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                        {log.source === 'AWS' ? 'AWS' : log.source === 'FORENSIC' ? 'FOR' : 'SIM'}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                <td className="px-4 py-2.5 text-[var(--text-primary)] font-semibold">{log.user}</td>
                                <td className="px-4 py-2.5 text-[var(--accent-primary)]">{log.ip}</td>
                                <td className="px-4 py-2.5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] max-w-xs truncate">{log.event}</td>
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
                    </tbody>
                </table>
                {filteredLogs.length === 0 && !isUploading && (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
                        {opsMode === 'forensic' ? (
                            <>
                                <Activity className="w-12 h-12 mb-4 text-amber-500/30" />
                                <p className="font-bold text-sm">No forensic data loaded.</p>
                                <p className="text-xs opacity-60 mt-1">Upload a log file to begin analysis.</p>
                            </>
                        ) : (
                            <>
                                <TerminalSquare className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-sm">No telemetry matching current filters.</p>
                                <p className="text-xs mt-1 opacity-50">Adjust filters or wait for new events.</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}
