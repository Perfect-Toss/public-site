import { useCallback, useRef, useState, type ReactNode } from 'react';
import { SnackbarContext, type SnackbarKind } from './useSnackbar';
import './Snackbar.css';

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<SnackbarKind>('success');
  const timerRef = useRef<number | undefined>(undefined);

  const showSnackbar = useCallback((msg: string, k: SnackbarKind = 'success') => {
    window.clearTimeout(timerRef.current);
    setMessage(msg);
    setKind(k);
    timerRef.current = window.setTimeout(() => setMessage(null), 2500);
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <div
        className={`snackbar ${kind} ${message ? 'visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </SnackbarContext.Provider>
  );
}

export default SnackbarProvider;
