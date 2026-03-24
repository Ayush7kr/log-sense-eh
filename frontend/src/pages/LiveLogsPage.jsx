import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'
import { useLogsContext } from '../hooks/LogsContext'
import { 
  TerminalSquare, 
  Upload, 
  FileText, 
  X, 
  Search, 
  Filter, 
  CircleDot,
  ArrowDownToLine,
  Activity
} from 'lucide-react'

export default function LiveLogsPage() {
  const { logs, streaming, setStreaming } = useLogsContext()
  const [eventType, setEventType] = useState('All')
  const [riskLevel, setRiskLevel] = useState('All')
  const [ipFilter, setIpFilter] = useState('')
  
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchType = eventType === 'All' || log.event === eventType
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
      const resp = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      })
      const json = await resp.json()
      setUploadStatus({ type: 'success', message: `Imported ${json.count} logs successfully.` })
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
            <TerminalSquare className="w-7 h-7 text-accent-primary" />
            Live Telemetry Ingest
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Real-time packet capture and authentication audit stream.
          </p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CircleDot className={`w-3 h-3 ${streaming ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`} />
                <span className="text-[0.65rem] font-bold text-emerald-400 uppercase tracking-widest">{streaming ? 'Live Ingesting' : 'Paused'}</span>
            </div>
            <button
                onClick={() => setStreaming(!streaming)}
                className="p-2 rounded-xl border border-border-panel hover:brightness-110 transition-all text-text-primary"
            >
                {streaming ? <X className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <div className="space-y-6">
            <div className="glass-panel p-5 space-y-4">
                <h3 className="text-[0.65rem] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5" /> Filter Matrix
                </h3>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[0.6rem] text-text-secondary uppercase font-bold">Event Vector</label>
                        <select className="glass-input w-full text-xs" value={eventType} onChange={e => setEventType(e.target.value)}>
                            <option>All</option>
                            <option>Login Success</option>
                            <option>Failed Login</option>
                            <option>Port Scan</option>
                            <option>Privilege Escalation</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[0.6rem] text-text-secondary uppercase font-bold">Severity Thresh.</label>
                        <select className="glass-input w-full text-xs" value={riskLevel} onChange={e => setRiskLevel(e.target.value)}>
                            <option>All</option>
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[0.6rem] text-text-secondary uppercase font-bold">Origin Trace (IP)</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                            <input className="glass-input glass-input-search w-full text-xs" placeholder="192.168..." value={ipFilter} onChange={e => setIpFilter(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-5 border-dashed border-accent-primary/40 relative group overflow-hidden">
                <div className="absolute inset-0 bg-accent-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <h3 className="text-[0.65rem] font-bold text-accent-primary uppercase tracking-widest flex items-center gap-2 mb-3">
                    <Upload className="w-3.5 h-3.5" /> Manual Ingestion
                </h3>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border-panel rounded-xl p-4 cursor-pointer hover:border-accent-primary transition-all relative">
                    <input type="file" className="hidden" accept=".log,.txt" onChange={handleFileUpload} disabled={isUploading} />
                    <FileText className={`w-8 h-8 mb-2 ${isUploading ? 'text-accent-primary animate-bounce' : 'text-text-secondary'}`} />
                    <span className="text-[0.65rem] font-bold text-text-primary">Drop forensic logs</span>
                    <span className="text-[0.55rem] text-text-secondary mt-1">.log, .txt supported</span>
                </label>
                <AnimatePresence>
                    {uploadStatus && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-3 p-2 rounded text-[0.6rem] font-bold text-center ${uploadStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {uploadStatus.message}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* Log Table */}
        <div className="lg:col-span-3 glass-panel flex flex-col overflow-hidden border-border-panel/30">
            <div className="p-3 border-b border-border-panel/50 bg-[var(--bg-panel)] flex items-center justify-between">
                <span className="text-[0.7rem] font-mono text-text-secondary uppercase tracking-widest">Active Packet Stream</span>
                <button className="p-1 text-text-secondary hover:text-text-primary transition-colors">
                    <ArrowDownToLine className="w-4 h-4" />
                </button>
            </div>
            <div className="flex-1 h-[calc(100vh-250px)] overflow-auto scroll-thin">
                <table className="min-w-full text-[0.7rem] font-mono border-separate border-spacing-0">
                    <thead className="sticky top-0 z-20 bg-[var(--bg-main)] backdrop-blur-md">
                        <tr className="text-text-secondary text-left">
                            <th className="px-5 py-3 border-b border-border-panel/50">Timestamp</th>
                            <th className="px-5 py-3 border-b border-border-panel/50">Identity</th>
                            <th className="px-5 py-3 border-b border-border-panel/50">Origin</th>
                            <th className="px-5 py-3 border-b border-border-panel/50">Activity</th>
                            <th className="px-5 py-3 border-b border-border-panel/50 text-right">Risk</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-panel/10">
                        {filteredLogs.map((log) => (
                            <motion.tr 
                                key={log.id} 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className={`group hover:brightness-[0.9] dark:hover:brightness-[1.1] transition-colors ${log.risk === 'High' ? 'bg-red-500/5' : ''}`}
                            >
                                <td className="px-5 py-3 text-text-secondary">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                <td className="px-5 py-3 text-text-primary font-bold">{log.user}</td>
                                <td className="px-5 py-3 text-accent-primary">{log.ip}</td>
                                <td className="px-5 py-3 text-text-secondary group-hover:text-text-primary">{log.event}</td>
                                <td className="px-5 py-3 text-right">
                                    <span className={`px-2 py-0.5 rounded-full text-[0.6rem] font-bold border ${
                                        log.risk === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' :
                                        log.risk === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                        'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    }`}>
                                        {log.risk}
                                    </span>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
                {filteredLogs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                        <TerminalSquare className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">No telemetry matching current matrices.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}

