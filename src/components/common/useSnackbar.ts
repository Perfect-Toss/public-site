import { createContext, useContext } from 'react';

export type SnackbarKind = 'success' | 'info' | 'error';

export interface SnackbarContextValue {
  showSnackbar: (message: string, kind?: SnackbarKind) => void;
}

export const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return ctx;
}
