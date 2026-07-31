import { createContext, useContext } from 'react';

import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '../api/api.users';

export interface AuthContextType {
  /** The API user profile fetched from /api/v2/users/current (null when not authenticated). */
  currentUser: User | null;
  /** The Firebase User object (null when not authenticated). */
  firebaseUser: FirebaseUser | null;
  /** Whether auth state is still being determined on initial load. */
  initializing: boolean;
  /** Whether the current user has admin-level privileges (derived from `currentUser.roles`). */
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
