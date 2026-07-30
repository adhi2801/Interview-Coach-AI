import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ic_theme');
    return saved || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('ic_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * ThemeToggle
 * Tactile Sun/Moon switch component to place in header HUDs.
 */
export function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Studio Mode" : "Switch to Dark Flight Mode"}
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold transition-all outline-none ${
        isDark
          ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
          : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-black hover:bg-slate-200'
      } ${className}`}
    >
      {isDark ? (
        <>
          <Moon size={13} className="text-blue-400" />
          <span className="hidden sm:inline text-[10px] uppercase tracking-widest">Dark</span>
        </>
      ) : (
        <>
          <Sun size={13} className="text-amber-500" />
          <span className="hidden sm:inline text-[10px] uppercase tracking-widest">Light</span>
        </>
      )}
    </motion.button>
  );
}