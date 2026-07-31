import { ReactNode, useEffect, useRef } from 'react';

import { onAuthStateChange, logout as firebaseLogout } from '../firebase/auth';
import { setAuthToken } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { fetchCurrentUser, isAdminUser } from '../api/api.users';
import { AuthContext, type AuthContextType } from './useAuth';

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

  // Stale-safe ref so the useEffect (empty deps) always calls the latest action.
  const setAuthRef = useRef(setAuth);
  setAuthRef.current = setAuth;
  const setAuthErrorRef = useRef(setAuthError);
  setAuthErrorRef.current = setAuthError;

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
          const token = await fbUser.getIdToken();
          setAuthToken(token);

          // Fetch the API user profile — failure means we sign out entirely.
          const apiUser = await fetchCurrentUser();

          if (apiUser === null) {
            // Firebase user exists but no matching API profile — invalid state.
            console.error('[AuthProvider] No API user found — signing out');
            await firebaseLogout();
            setAuthToken(null);
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
          setAuthToken(null);
          setAuthRef.current(null, null);
          setAuthErrorRef.current('Could not verify your account. Please try again.');
        }
      } else {

        setAuthToken(null);
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
