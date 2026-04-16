import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Eye, EyeOff, Activity, User, Lock, AlertCircle, Server, Zap } from 'lucide-react'

function LoginPage({ onAuthenticated }) {
  const [step, setStep] = useState(1) // 1: Creds, 2: Mode Select
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!email.trim()) errs.email = 'Operational ID is required'
    if (!password.trim()) errs.password = 'Access token is required'
    if (password.trim() && password.length < 3) errs.password = 'Token too short'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setStep(2)
    }, 900)
  }

  const handleModeSelection = (mode) => {
    onAuthenticated(mode)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] relative overflow-hidden">
      <div className="absolute inset-0 grid-background z-0 pointer-events-none" />
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-72 h-72 bg-blue-600/8 rounded-full" style={{ filter: 'blur(80px)' }} />
        <div className="absolute bottom-[10%] right-[15%] w-96 h-96 bg-purple-600/8 rounded-full" style={{ filter: 'blur(80px)' }} />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-full max-w-md px-4"
          >
            <div className="glass-panel p-8 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 neon-ring">
                  <Shield className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Terminal Access</p>
                  <h1 className="text-2xl font-bold font-sora text-[var(--text-primary)]">SOC Log-Sense</h1>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Operational ID</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      className={`glass-input w-full pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] ${errors.email ? 'ring-2 ring-red-500/50 border-red-500/50' : ''}`}
                      placeholder="Enter your ID"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })) }}
                    />
                  </div>
                  {errors.email && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-[0.7rem] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.email}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Access Token</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`glass-input w-full pl-10 pr-10 py-2.5 text-sm text-[var(--text-primary)] ${errors.password ? 'ring-2 ring-red-500/50 border-red-500/50' : ''}`}
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })) }}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-[0.7rem] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.password}
                    </motion.p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.01 }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 "
                  disabled={loading}
                >
                  {loading ? <Activity className="w-4 h-4 animate-spin" /> : <span>Authenticate</span>}
                </motion.button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="mode"
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-full max-w-md px-4"
          >
            <div className="glass-panel p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold font-sora text-[var(--text-primary)] mb-1">Select Operations Mode</h2>
                <p className="text-xs text-[var(--text-secondary)] pb-2">Environment isolation protocol.</p>
              </div>

              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelection('sim')}
                  className="w-full p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors flex items-center gap-4 text-left"
                >
                  <div className="p-3 bg-emerald-500/20 rounded-lg shrink-0">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-400">Simulation Mode</h3>
                    <p className="text-[0.65rem] text-[var(--text-secondary)] mt-1 line-clamp-2">Test platform defenses using synthetic brute force, port scan, and DDoS payloads safely.</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelection('aws')}
                  className="w-full p-4 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors flex items-center gap-4 text-left group"
                >
                  <div className="p-3 bg-red-500/20 rounded-lg shrink-0 group-hover:bg-red-500/30 transition-colors">
                    <Server className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-red-400">AWS Live Mode</h3>
                    <p className="text-[0.65rem] text-[var(--text-secondary)] mt-1 line-clamp-2">Connect to a live EC2 Instance via SSH. Hard disables simulator generation.</p>
                  </div>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelection('forensic')}
                  className="w-full p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors flex items-center gap-4 text-left group"
                >
                  <div className="p-3 bg-amber-500/20 rounded-lg shrink-0 group-hover:bg-amber-500/30 transition-colors">
                    <Eye className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-400">Forensic Analysis Mode</h3>
                    <p className="text-[0.65rem] text-[var(--text-secondary)] mt-1 line-clamp-2">Ingest offline text traces for massive bulk post-mortem root cause analysis algorithms.</p>
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LoginPage
