import { createContext, useContext, useEffect, useState } from 'react';
import { readStore, writeStore } from '../storage/useLocalStorage';

export type CustomBgs = Record<string, string>; // route → base64 jpeg

interface ThemeCtx {
  opacity: number;
  setOpacity: (v: number) => void;
  customBgs: CustomBgs;
  setCustomBg: (route: string, data: string) => void;
  removeCustomBg: (route: string) => void;
  bgForRoute: (route: string) => string;
}

const Ctx = createContext<ThemeCtx>(null!);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [opacity, setOpacityState] = useState<number>(() => readStore('bgOpacity', 0.5));
  const [customBgs, setCustomBgsState] = useState<CustomBgs>(() => readStore('customBgs', {}));

  // Применяем CSS-переменную при изменении
  useEffect(() => {
    document.documentElement.style.setProperty('--bg-opacity', String(opacity));
    writeStore('bgOpacity', opacity);
  }, [opacity]);

  // Инициализируем CSS-переменную при монтировании
  useEffect(() => {
    document.documentElement.style.setProperty('--bg-opacity', String(readStore('bgOpacity', 0.5)));
  }, []);

  useEffect(() => {
    writeStore('customBgs', customBgs);
  }, [customBgs]);

  function setOpacity(v: number) { setOpacityState(Math.round(v * 100) / 100); }

  function setCustomBg(route: string, data: string) {
    setCustomBgsState((prev) => ({ ...prev, [route]: data }));
  }

  function removeCustomBg(route: string) {
    setCustomBgsState((prev) => { const n = { ...prev }; delete n[route]; return n; });
  }

  function bgForRoute(route: string): string {
    return customBgs[route] ?? '';
  }

  return (
    <Ctx.Provider value={{ opacity, setOpacity, customBgs, setCustomBg, removeCustomBg, bgForRoute }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() { return useContext(Ctx); }
