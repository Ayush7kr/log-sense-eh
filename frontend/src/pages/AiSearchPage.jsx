import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Sparkles, Clock, Filter, ArrowRight } from 'lucide-react'
import { useLogsContext } from '../hooks/LogsContext'

const examples = [
  'show failed logins',
  'show high risk events',
  'failed logins from 10.0.0.7',
  'port scans in last hour',
  'show brute force attacks',
  'events by admin',
  'show ddos activity',
]

function AiSearchPage() {
  const { opsMode } = useLogsContext()
  const [query, setQuery] = useState('')
  const [sql, setSql] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultCount, setResultCount] = useState(0)

  const runSearch = async (q) => {
    if (!q.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/search?mode=${opsMode || 'sim'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Search failed')
      setSql(json.sql)
      setRows(json.results || [])
      setResultCount(json.count || json.results?.length || 0)
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
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-panel)] bg-[var(--bg-panel)] px-3 py-1 text-[0.7rem] text-[var(--text-secondary)] mb-1">
          <Sparkles className="w-3 h-3 text-purple-400" />
          Natural language → SQL over live logs
        </div>
        <h2 className="text-2xl font-bold font-sora text-[var(--text-primary)]">AI Search Console</h2>
        <p className="text-xs text-[var(--text-secondary)] max-w-lg mx-auto">
          Ask questions in plain English. The engine extracts IPs, usernames, event types, and time
          ranges to build targeted queries.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass-panel p-4 flex flex-col gap-3"
      >
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="w-4 h-4 text-[var(--text-secondary)]" />
          </div>
          <input
            className="glass-input glass-input-search w-full pr-28 py-2.5 text-sm"
            placeholder='e.g. "show failed logins from 10.0.0.7"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className="absolute inset-y-1.5 right-1.5 rounded-lg px-4 text-xs font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-purple-500/30 disabled:opacity-60 flex items-center gap-1.5"
          >
            {loading ? 'Running…' : <><Filter className="w-3 h-3" /> Query</>}
          </motion.button>
        </div>
        <div className="flex flex-wrap gap-2 text-[0.7rem]">
          <span className="text-[var(--text-secondary)] flex items-center gap-1"><Sparkles className="w-3 h-3" /> Try:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => showQuery(ex)}
              className="rounded-full border border-[var(--border-panel)] px-2.5 py-0.5 text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="glass-panel border-red-500/50 bg-red-500/5 p-3 text-xs text-red-400 flex items-center gap-2">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {sql && (
        <div className="glass-panel p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--text-primary)]">Generated SQL</p>
            <span className="text-[0.6rem] font-mono text-[var(--text-secondary)]">{resultCount} results</span>
          </div>
          <pre className="text-[0.75rem] font-mono bg-[var(--bg-main)] border border-[var(--border-panel)] rounded-lg px-4 py-3 text-[var(--accent-primary)] overflow-x-auto scroll-thin">
            {sql}
          </pre>
        </div>
      )}

      <div className="glass-panel p-4">
        <p className="text-xs font-bold text-[var(--text-primary)] mb-3">Query Results</p>
        <div className="overflow-x-auto max-h-[450px] scroll-thin">
          <table className="min-w-full log-table">
            <thead className="border-b border-[var(--border-panel)] text-[var(--text-secondary)]">
              <tr>
                <th className="py-2.5 px-4 text-left">Timestamp</th>
                <th className="py-2.5 px-4 text-left">User</th>
                <th className="py-2.5 px-4 text-left">IP</th>
                <th className="py-2.5 px-4 text-left">Event</th>
                <th className="py-2.5 px-4 text-left">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <motion.tr
                  key={`${row.id || row.timestamp}-${idx}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="border-b border-[var(--border-panel)] hover:bg-[var(--accent-glow)] transition-colors"
                >
                  <td className="py-2 px-4 text-[var(--text-secondary)] whitespace-nowrap">{new Date(row.timestamp).toLocaleString()}</td>
                  <td className="py-2 px-4 text-[var(--text-primary)] font-semibold">{row.user}</td>
                  <td className="py-2 px-4 text-[var(--accent-primary)] font-mono">{row.ip}</td>
                  <td className="py-2 px-4 text-[var(--text-secondary)] max-w-xs truncate">{row.event}</td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[0.6rem] font-bold border ${
                      row.risk === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                      row.risk === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {row.risk}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[var(--text-secondary)]">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No results yet. Run a query above.</p>
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
