import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);
const normalize = (value?: string | null): Theme => value === 'light' ? 'light' : 'dark';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => normalize(document.documentElement.dataset.theme));
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3f5f9' : '#191e27');
  }, [theme]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === 'gavyo.theme' || event.key === null) setTheme(normalize(event.newValue)); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('gavyo.theme', next); } catch { /* The current tab still changes appearance. */ }
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider ausente.');
  const light = context.theme === 'light';
  const label = light ? 'Ativar modo escuro' : 'Ativar modo claro';
  return <button type="button" className="secondary-button theme-toggle" onClick={context.toggle} aria-label={label} title={label}><span className="theme-icon" key={context.theme}>{light ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}</span><span>{light ? 'Modo escuro' : 'Modo claro'}</span></button>;
}
