import type { User } from 'firebase/auth';
import { create } from 'zustand';
import { logout as firebaseLogout } from '../firebase/auth';
import { setAuthToken } from '../api/client';

interface AuthState {
  /** The Firebase User object (null when not authenticated). */
  user: User | null;
  /** Whether auth state is still being determined on initial load. */
  initializing: boolean;
  /** Whether the current user has admin claims. */
  isAdmin: boolean;

  /** Called by AuthProvider when Firebase auth state changes. */
  setFirebaseUser: (user: User | null) => Promise<void>;
  /** Set admin status after checking token claims. */
  setAdmin: (isAdmin: boolean) => void;
  /** Sign out via Firebase and clear the API token. */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initializing: true,
  isAdmin: false,

  setFirebaseUser: async (user) => {
    if (user) {
      const token = await user.getIdToken();
      setAuthToken(token);
    } else {
      setAuthToken(null);
    }
    set({ user, initializing: false });
  },

  setAdmin: (isAdmin) => set({ isAdmin }),

  logout: async () => {
    const { success } = await firebaseLogout();
    if (success) {
      setAuthToken(null);
      set({ user: null, isAdmin: false });
    }
  },
}));
