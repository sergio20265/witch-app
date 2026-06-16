import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'grimoire:';

/** Read once (used outside React, e.g. one-off lookups). */
export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStore<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota / private mode — silently ignore on MVP */
  }
}

/**
 * Persistent state backed by localStorage. The single source of truth for the
 * MVP — все разделы хранятся локально на устройстве.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStore(key, initial));

  useEffect(() => {
    writeStore(key, value);
  }, [key, value]);

  const reset = useCallback(() => setValue(initial), [initial]);

  return [value, setValue, reset] as const;
}

/** Простой генератор id для локальных записей. */
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
