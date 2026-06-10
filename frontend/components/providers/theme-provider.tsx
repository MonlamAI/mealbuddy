'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('mealbuddy_theme') as Theme | null;
    if (saved && saved !== 'system') {
      setTimeout(() => setThemeState(saved), 0);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (t: Theme) => {
      let resolved: 'light' | 'dark' = 'light';
      if (t === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        resolved = t;
      }
      
      setResolvedTheme(resolved);
      
      if (resolved === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('mealbuddy_theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
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

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative z-[90]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2.5 bg-white/70 dark:bg-[#272727]/70 hover:bg-white dark:hover:bg-[#272727] border border-slate-200/60 dark:border-[#323232] backdrop-blur-md rounded-2xl shadow-sm hover:shadow transition-all duration-300 text-[#1F2A44] dark:text-[#F5F5F5] select-none cursor-pointer"
        aria-label="Toggle theme"
      >
        {resolvedTheme === 'light' ? (
          <Sun size={18} className="text-amber-500 animate-pulse" />
        ) : (
          <Moon size={18} className="text-indigo-300" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay to close the switcher */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-36 bg-white dark:bg-[#202020] rounded-2xl shadow-xl border border-slate-100/80 dark:border-[#323232] p-1.5 z-50 overflow-hidden"
            >
              <button
                onClick={() => {
                  setTheme('light');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[#2E5A88]/10 dark:bg-[#D7E8F4]/20 text-[#2E5A88] dark:text-[#D7E8F4]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#272727]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sun size={14} className="text-amber-500" />
                  Light
                </span>
                {theme === 'light' && <span className="w-1.5 h-1.5 bg-[#2E5A88] dark:bg-[#D7E8F4] rounded-full" />}
              </button>
              <button
                onClick={() => {
                  setTheme('dark');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#2E5A88]/10 dark:bg-[#D7E8F4]/20 text-[#2E5A88] dark:text-[#D7E8F4]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#272727]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Moon size={14} className="text-indigo-300" />
                  Dark
                </span>
                {theme === 'dark' && <span className="w-1.5 h-1.5 bg-[#2E5A88] dark:bg-[#D7E8F4] rounded-full" />}
              </button>
              <button
                onClick={() => {
                  setTheme('system');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  theme === 'system'
                    ? 'bg-[#2E5A88]/10 dark:bg-[#D7E8F4]/20 text-[#2E5A88] dark:text-[#D7E8F4]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#272727]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Monitor size={14} className="text-blue-400" />
                  System
                </span>
                {theme === 'system' && <span className="w-1.5 h-1.5 bg-[#2E5A88] dark:bg-[#D7E8F4] rounded-full" />}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
