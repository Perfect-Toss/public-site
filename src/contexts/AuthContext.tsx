import { ReactNode, useEffect, useRef } from 'react';

import { onAuthStateChange, logout as firebaseLogout, getIdToken } from '../firebase/auth';
import { setAuthTokenProvider } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { fetchCurrentUser, isAdminUser } from '../api/api.users';
import { AuthContext, type AuthContextType } from './useAuth';
import { canCreateEvent } from '../utils/roles';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const currentUser = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setAuthError = useAuthStore((s) => s.setAuthError);
  const isAdmin = isAdminUser(currentUser);
  const canCreateEvents = canCreateEvent(currentUser?.roles);

  // Stale-safe ref so the useEffect (empty deps) always calls the latest action.
  const setAuthRef = useRef(setAuth);
  setAuthRef.current = setAuth;
  const setAuthErrorRef = useRef(setAuthError);
  setAuthErrorRef.current = setAuthError;

  // The API client asks for a token per request, so Firebase refreshes an
  // expired token instead of reusing it.
  useEffect(() => {
    setAuthTokenProvider({
      getToken: (forceRefresh) => getIdToken(forceRefresh),
      onUnauthorized: () => {
        console.warn('[AuthProvider] Session rejected by the API — signing out');
        setAuth(null, null);
        setAuthError('Your session has expired. Please sign in again.');
        void firebaseLogout();
      },
    });

    return () => setAuthTokenProvider(null);
  }, [setAuth, setAuthError]);

  useEffect(() => {
    console.log('[AuthProvider] Setting up auth state listener...');

    const unsubscribe = onAuthStateChange(async (fbUser) => {
      console.log('[AuthProvider] Auth state changed:', {
        isLoggedIn: !!fbUser,
        email: fbUser?.email,
        uid: fbUser?.uid,
      });

      if (fbUser) {
        try {
          // Fetch the API user profile — failure means we sign out entirely.
          const apiUser = await fetchCurrentUser();

          if (apiUser === null) {
            // Firebase user exists but no matching API profile — invalid state.
            console.error('[AuthProvider] No API user found — signing out');
            await firebaseLogout();
            setAuthRef.current(null, null);
            setAuthErrorRef.current('No account found for this email. Please contact support.');
          } else {
            // Both Firebase and API auth succeeded — atomically set both.
            setAuthRef.current(fbUser, apiUser);
          }
        } catch (err) {
          // API call failed — keep state consistent by signing out of Firebase.
          console.error('[AuthProvider] Failed to fetch API user — signing out:', err);
          await firebaseLogout();
          setAuthRef.current(null, null);
          setAuthErrorRef.current('Could not verify your account. Please try again.');
        }
      } else {
        setAuthRef.current(null, null);
      }
    });

    return () => {
      console.log('[AuthProvider] Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    firebaseUser,
    initializing,
    isAdmin,
    canCreateEvents,
  };

  return (
    <AuthContext.Provider value={value}>
      {initializing ? (
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
