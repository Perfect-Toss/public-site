import { useCallback, useEffect, useState } from 'react';

/**
 * A hook for persisting state to localStorage.
 * Reads the stored value on mount and writes on every change.
 *
 * @param key  The localStorage key.
 * @param initialValue  Fallback value if nothing is stored.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // Storage full or unavailable — silently ignore
    }
  }, [key, storedValue]);

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch {
      // ignore
    }
  }, [key, initialValue]);

  return [storedValue, setStoredValue, remove] as const;
}
