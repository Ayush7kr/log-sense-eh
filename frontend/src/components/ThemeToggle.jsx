import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/ThemeContext'
import { motion } from 'framer-motion'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggleTheme}
      className="p-2 rounded-xl border border-[var(--border-panel)] hover:bg-[var(--accent-glow)] transition-all"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-blue-500" />
      )}
    </motion.button>
  )
}
