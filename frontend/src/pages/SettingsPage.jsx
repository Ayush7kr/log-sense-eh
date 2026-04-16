import { useState, useEffect } from 'react'
import { Save, AlertTriangle, ShieldAlert, Monitor, Activity, Database, Server, Smartphone, Key } from 'lucide-react'
import { useLogsContext } from '../hooks/LogsContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../hooks/useSocket'

export default function SettingsPage() {
  const { settings, setSettings, ec2Status, opsMode } = useLogsContext()
  const [localSettings, setLocalSettings] = useState(settings)
  const [ec2Config, setEc2Config] = useState({ host: '3.110.131.91', username: 'ubuntu', key_path: '', enabled: false })
  const [ec2Saving, setEc2Saving] = useState(false)
  const [toast, setToast] = useState(null)
  const { on } = useSocket()
  const isAwsMode = opsMode === 'aws'

  useEffect(() => {
    fetch('/api/ec2/config').then(r => r.json()).then(data => {
      if (data && data.host) setEc2Config(data)
    }).catch(e => console.log('No ec2 config yet.'))
  }, [])

  useEffect(() => {
    const cleanup = on('ec2:error', (data) => {
      setToast({ type: 'error', message: `SSH Auth Failed: ${data.message}` })
      setEc2Config(p => ({...p, enabled: false}))
      setTimeout(() => setToast(null), 5000);
    });
    return cleanup;
  }, [on])

  const handleSaveConfig = async () => {
    if (!isAwsMode) return;
    setEc2Saving(true)
    try {
      await fetch('/api/ec2/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ec2Config)
      })
      setToast({ type: 'success', message: 'EC2 Configuration Synchronized!' })
      setTimeout(() => setToast(null), 3000)
    } catch(e) {}
    setEc2Saving(false)
  }

  const [clearing, setClearing] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)

  const handleClearLogs = async () => {
    if (!clearConfirm) { setClearConfirm(true); return; }
    setClearing(true)
    await fetch('/api/logs/clear', { method: 'POST' })
    setClearing(false)
    setClearConfirm(false)
    setToast({ type: 'success', message: 'Data Storage Wiped Successfully' })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-50">
            <div className={`px-4 py-2 rounded-xl border shadow-2xl flex items-center gap-2 text-sm font-bold ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'}`}>
              <CheckCircle className="w-4 h-4" /> {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6">
        <h2 className="text-2xl font-bold font-sora flex items-center gap-3">
          <Monitor className="w-7 h-7 text-[var(--accent-primary)]" /> System Configuration
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Configure telemetry sources and storage parameters.</p>
      </div>

      <div className="glass-panel p-5 border-l-4 border-[var(--accent-primary)] mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-sora text-[var(--text-primary)] mb-1">Environment Operating Mode</h3>
          <p className="text-xs text-[var(--text-secondary)]">Currently executing in isolated system conditions.</p>
        </div>
        <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${isAwsMode ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isAwsMode ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
          <span className="text-xs font-bold uppercase tracking-widest">{isAwsMode ? 'Live AWS Mode Active' : 'Simulation Mode Active'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`glass-panel p-6 relative overflow-hidden flex flex-col ${!isAwsMode ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-[0.7rem] uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-2 mb-2">
                <Server className="w-4 h-4" /> Live Log Ingestion (AWS/SSH)
              </h3>
              <p className="text-[0.65rem] text-[var(--text-secondary)] leading-relaxed max-w-sm">
                Connect to a live EC2 instance to stream real production telemetry. Only available in AWS Live Mode. 
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border text-[0.65rem] font-bold uppercase flex items-center gap-2 ${ec2Status?.connected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-[var(--bg-main)] border-[var(--border-panel)] text-[var(--text-secondary)]'}`}>
              {ec2Status?.connected ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected</> : <><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Disconnected</>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[0.65rem] text-[var(--text-secondary)] uppercase font-bold">IP Address</label>
                <input className="glass-input w-full font-mono text-sm" value={ec2Config.host} onChange={(e) => setEc2Config(p => ({...p, host: e.target.value}))} />
              </div>
              <div className="space-y-1">
                <label className="text-[0.65rem] text-[var(--text-secondary)] uppercase font-bold">Username</label>
                <input className="glass-input w-full font-mono text-sm" value={ec2Config.username} onChange={(e) => setEc2Config(p => ({...p, username: e.target.value}))} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[0.65rem] text-[var(--text-secondary)] uppercase font-bold flex items-center gap-1.5">
                <Key className="w-3 h-3" /> PEM Key Path (Local Machine Path)
              </label>
              <input className="glass-input w-full font-mono text-xs" placeholder="/home/user/key.pem" value={ec2Config.key_path} onChange={(e) => setEc2Config(p => ({...p, key_path: e.target.value}))} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-[var(--border-panel)] bg-[var(--bg-panel)] hover:bg-[var(--accent-glow)] transition-all">
              <input type="checkbox" className="sr-only" checked={ec2Config.enabled} onChange={(e) => setEc2Config(p => ({ ...p, enabled: e.target.checked }))} />
              <div className={`w-9 h-5 rounded-full transition-colors relative ${ec2Config.enabled ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${ec2Config.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-[var(--text-primary)]">Enable AWS Ingestion</div>
                <div className="text-[0.65rem] text-[var(--text-secondary)]">Establish SSH handshake on save.</div>
              </div>
            </label>

            <button onClick={handleSaveConfig} disabled={ec2Saving || !isAwsMode} className="w-full flex justify-center py-2.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs transition-all mt-4 disabled:opacity-50">
              {ec2Saving ? 'Binding Handshake...' : 'Synchronize Config'}
            </button>
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-[0.7rem] uppercase tracking-widest text-red-500 font-bold flex items-center gap-2 mb-2">
                <Database className="w-4 h-4" /> Data Retention Policies
              </h3>
              <p className="text-[0.65rem] text-[var(--text-secondary)] leading-relaxed">
                Log-Sense automatically truncates telemetry older than <code className="text-red-400">1 hour</code> or exceeding <code className="text-red-400">10,000 requests</code>.
                You can manually wipe storage manually here.
              </p>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-4 text-[0.65rem] text-red-400 font-mono">
            WARNING: Flushing data permanently deletes all Incidents, Alerts, Logs, and Blocked IPs.
          </div>
          <button 
            onClick={handleClearLogs}
            disabled={clearing}
            className={`w-full py-2.5 rounded-xl border font-bold text-xs transition-all flex justify-center items-center gap-2 ${
              clearConfirm 
                ? 'border-red-500 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30' 
                : 'border-red-500/20 bg-transparent text-red-500 hover:bg-red-500/5'
            }`}
          >
            {clearing ? <Activity className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            {clearConfirm ? 'CONFIRM PERMANENT WIPE' : 'Wipe Database'}
          </button>
        </div>
      </div>
    </div>
  )
}
const CheckCircle = ({className}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
