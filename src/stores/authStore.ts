import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '../api/api.users';
import { create } from 'zustand';

interface AuthState {
  /** The Firebase User object (null when not authenticated). */
  firebaseUser: FirebaseUser | null;
  /** The API user profile fetched from /api/v2/users/current. */
  user: User | null;
  /** Whether auth state is still being determined on initial load. */
  initializing: boolean;
  /** Set when an auth-state transition fails (e.g. fetching the API profile throws). */
  error: string | null;

  /**
   * Atomically set or clear both the Firebase user and API user profile.
   * Called by AuthProvider — the two values are always set together so they
   * can never be out of sync.
   */
  setAuth: (firebaseUser: FirebaseUser | null, user: User | null) => void;
  /** Record (or clear) an auth error for the UI to surface. */
  setAuthError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  user: null,
  initializing: true,
  error: null,

  setAuth: (firebaseUser, user) => set({ firebaseUser, user, initializing: false }),
  setAuthError: (error) => set({ error }),
}));
