import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/60 transition-colors text-slate-400 hover:text-slate-100"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
