import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Sparkles } from 'lucide-react'

const examples = [
  'show failed logins',
  'show high risk events',
  'show logs from 192.168.1.10',
]

function AiSearchPage() {
  const [query, setQuery] = useState('')
  const [sql, setSql] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runSearch = async (q) => {
    if (!q.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Search failed')
      setSql(json.sql)
      setRows(json.results || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    runSearch(query)
  }

  const showQuery = (q) => {
    setQuery(q)
    runSearch(q)
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-panel)] bg-[var(--bg-panel)] px-3 py-1 text-[0.7rem] text-[var(--text-secondary)] mb-1">
          <Sparkles className="w-3 h-3 text-neon-purple" />
          Natural language → SQL over simulated logs
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">AI search console</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Ask questions in plain English. When configured, Gemini will translate to safe SQL over
          the `logs` table; otherwise rule-based mappings are used.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass-panel p-3 md:p-4 flex flex-col gap-3 items-stretch"
      >
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="w-4 h-4 text-[var(--text-secondary)]" />
          </div>
          <input
            className="glass-input glass-input-search w-full pr-28 py-2 text-sm"
            placeholder='e.g. "show failed logins from 10.0.0.7"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className="absolute inset-y-1.5 right-1.5 rounded-lg px-3 text-xs font-medium bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-md shadow-neon-purple/40 disabled:opacity-60"
          >
            {loading ? 'Running…' : 'Run query'}
          </motion.button>
        </div>
        <div className="flex flex-wrap gap-2 text-[0.7rem] text-[var(--text-secondary)]">
          <span className="text-[var(--text-secondary)]">Examples:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => showQuery(ex)}
              className="rounded-full border border-slate-700/80 px-2.5 py-0.5 hover:border-neon-blue/70 hover:text-neon-blue transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="glass-panel border-red-500/50 bg-red-950/30 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {sql && (
        <div className="glass-panel p-3 md:p-4 space-y-2">
          <p className="text-xs font-medium text-[var(--text-primary)]">Generated SQL</p>
          <pre className="text-[0.7rem] bg-[var(--bg-main)] border border-[var(--border-panel)] rounded-lg px-3 py-2 text-[var(--text-primary)] overflow-x-auto scroll-thin">
            {sql}
          </pre>
        </div>
      )}

      <div className="glass-panel p-3 md:p-4">
        <p className="text-xs font-medium text-[var(--text-primary)] mb-2">Query results</p>
        <div className="overflow-x-auto max-h-[420px] scroll-thin">
          <table className="min-w-full text-xs">
            <thead className="border-b border-[var(--border-panel)] text-[var(--text-secondary)]">
              <tr>
                <th className="py-2 text-left font-medium">Timestamp</th>
                <th className="py-2 text-left font-medium">User</th>
                <th className="py-2 text-left font-medium">IP</th>
                <th className="py-2 text-left font-medium">Event</th>
                <th className="py-2 text-left font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={`${row.timestamp}-${idx}`}
                  className="border-b border-[var(--border-panel)] hover:bg-[var(--accent-glow)] transition-colors"
                >
                  <td className="py-2 text-[var(--text-secondary)]">{row.timestamp}</td>
                  <td className="py-2 text-[var(--text-secondary)]">{row.user}</td>
                  <td className="py-2 text-[var(--text-secondary)]">{row.ip}</td>
                  <td className="py-2 text-[var(--text-secondary)]">{row.event}</td>
                  <td className="py-2 text-[var(--text-secondary)]">{row.risk}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--text-secondary)]">
                    No results yet. Run a query to populate this table.
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

export default AiSearchPage

