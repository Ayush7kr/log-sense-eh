import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff, Activity, User } from 'lucide-react'

function LoginPage({ onAuthenticated }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onAuthenticated()
    }, 900)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] relative overflow-hidden">
      {/* Grid overlay with low opacity */}
      <div className="absolute inset-0 grid-background z-0 pointer-events-none" />
      
      {/* Dynamic Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[10%] left-[15%] w-72 h-72 bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[15%] w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="glass-panel p-8 md:p-10 shadow-2xl relative">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <Shield className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-text-secondary">Terminal Access</p>
              <h1 className="text-2xl font-bold font-sora text-text-primary">SOC Log-Sense</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                className="glass-input glass-input-search w-full pr-4 py-3 text-text-primary placeholder:text-text-secondary/50"
                placeholder="Operational ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Access Token</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="glass-input w-full pr-10"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[0.65rem] text-text-secondary font-mono">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Encrypted Connection</span>
              </div>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Live: 124 Nodes
              </span>
            </div>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Establishing Handshake...</span>
                </>
              ) : (
                <>
                  <span>Initialize Dashboard</span>
                </>
              )}
            </motion.button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-border-panel text-center">
            <p className="text-[0.6rem] text-text-secondary uppercase tracking-widest leading-relaxed">
              Authorized Personnel Only. <br/> Access is logged and monitored under SOC-2 Protocol.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default LoginPage
