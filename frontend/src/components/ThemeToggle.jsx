import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl border border-[var(--border-panel)] bg-[var(--bg-panel)] hover:brightness-110 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
