import { create } from 'zustand';
import type { User } from '../api/api.users';

/**
 * The account a super user is viewing the app as.
 *
 * Resolved during sign-in by AuthProvider from the selection kept in
 * sessionStorage, so it survives the reload that enters and leaves the mode.
 */
interface ViewAsState {
  target: User | null;
  /** Organizations the emulated account belongs to. */
  entityIds: string[];
  setTarget: (target: User, entityIds: string[]) => void;
  clear: () => void;
}

export const useViewAsStore = create<ViewAsState>((set) => ({
  target: null,
  entityIds: [],
  setTarget: (target, entityIds) => set({ target, entityIds }),
  clear: () => set({ target: null, entityIds: [] }),
}));

/** Session key holding the account to view as. */
export const VIEW_AS_STORAGE_KEY = 'perfect-toss.viewAsUserId';

/** The account selected for view-as, if any. */
export function readViewAsUserId(): string | null {
  try {
    return sessionStorage.getItem(VIEW_AS_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Drop the selection. The signed-in account is unaffected. */
export function clearPersistedViewAs(): void {
  try {
    sessionStorage.removeItem(VIEW_AS_STORAGE_KEY);
  } catch {
    // Storage unavailable — the in-memory state is cleared by the caller.
  }
}

/**
 * View the app as another account. Reloading resets every store and page cache,
 * so nothing loaded as the signed-in account leaks into the emulated session.
 */
export function startViewAs(userId: string): void {
  try {
    sessionStorage.setItem(VIEW_AS_STORAGE_KEY, userId);
  } catch {
    // Storage unavailable — the mode would not survive the reload below.
  }
  window.location.assign('/');
}

/** Return to the signed-in account. */
export function stopViewAs(): void {
  clearPersistedViewAs();
  useViewAsStore.getState().clear();
  window.location.assign('/');
}

/** The account being emulated, or null when viewing as yourself. */
export function useViewAsTarget(): User | null {
  return useViewAsStore((state) => state.target);
}
